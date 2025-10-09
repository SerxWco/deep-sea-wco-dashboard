import { useState, useEffect } from 'react';
import axios from 'axios';
import { WCHAIN_SCAN_API, WSWAP_LPS, MAIN_TOKEN, REFRESH_INTERVAL } from '@/config/wswap';
import { WSwapTrade, WChainTokenTransaction, TradeStats } from '@/types/wswap';

export const useWSwapTrades = (selectedLP: string = 'all', pairFilter?: string) => {
  const [trades, setTrades] = useState<WSwapTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TradeStats>({
    totalVolume24h: 0,
    totalTrades24h: 0,
    uniqueWallets24h: 0,
    largestTrade24h: null,
    buyVolume24h: 0,
    sellVolume24h: 0
  });

  const classifyTrade = (tx: WChainTokenTransaction, lpAddress: string): 'buy' | 'sell' => {
    const lp = WSWAP_LPS.find(l => l.address === lpAddress);
    if (!lp) return 'buy';

    // For WCO/WAVE pairs: WCO leaving LP = user buying WCO (selling WAVE)
    // For WCO/WAVE pairs: WCO entering LP = user selling WCO (buying WAVE)
    const isToken0 = tx.tokenSymbol === lp.token0;
    const isLeavingLP = tx.from.toLowerCase() === lpAddress.toLowerCase();
    
    if (isToken0) {
      return isLeavingLP ? 'buy' : 'sell';
    } else {
      return isLeavingLP ? 'sell' : 'buy';
    }
  };

  const fetchTrades = async () => {
    try {
      console.log('[useWSwapTrades] Starting fetchTrades...');
      // Filter LPs based on pairFilter if provided
      const filteredLPs = pairFilter 
        ? WSWAP_LPS.filter(lp => lp.pair.includes(pairFilter))
        : WSWAP_LPS;
      
      console.log('[useWSwapTrades] Filtered LPs:', filteredLPs.length, filteredLPs.map(lp => lp.label));

      const tradePromises = filteredLPs.map(async (lp) => {
        try {
          const url = `${WCHAIN_SCAN_API}?module=account&action=tokentx&address=${lp.address}`;
          console.log('[useWSwapTrades] Fetching from:', url);
          const response = await axios.get(url);
          console.log('[useWSwapTrades] Response for', lp.label, ':', response.data?.result?.length || 0, 'transactions');

          if (response.data?.result && Array.isArray(response.data.result)) {
            return response.data.result.map((tx: WChainTokenTransaction) => ({
              tx,
              lpAddress: lp.address,
              lpLabel: lp.label
            }));
          }
          return [];
        } catch (err) {
          console.error(`Error fetching trades for ${lp.address}:`, err);
          return [];
        }
      });

      const allTxArrays = await Promise.all(tradePromises);
      const allTxData = allTxArrays.flat();
      console.log('[useWSwapTrades] Total transactions:', allTxData.length);

      // Group transactions by hash to pair WCO and WAVE transactions
      const txByHash = new Map<string, Array<{ tx: WChainTokenTransaction, lpAddress: string, lpLabel: string }>>();
      allTxData.forEach(data => {
        const existing = txByHash.get(data.tx.hash) || [];
        existing.push(data);
        txByHash.set(data.tx.hash, existing);
      });
      
      console.log('[useWSwapTrades] Unique hashes:', txByHash.size);

      // Calculate prices from paired WCO + WAVE transactions
      let allTrades: WSwapTrade[] = [];
      txByHash.forEach((txGroup) => {
        const wcoTx = txGroup.find(t => t.tx.tokenSymbol === 'WCO');
        const waveTx = txGroup.find(t => t.tx.tokenSymbol === 'WAVE');
        
        if (!wcoTx || !waveTx) {
          console.log('[useWSwapTrades] Skipping incomplete swap - tokens:', txGroup.map(t => t.tx.tokenSymbol));
          return; // Skip incomplete swaps
        }
        
        const wcoAmount = Number(wcoTx.tx.value) / Math.pow(10, Number(wcoTx.tx.tokenDecimal));
        const waveAmount = Number(waveTx.tx.value) / Math.pow(10, Number(waveTx.tx.tokenDecimal));
        
        // Price = WAVE per WCO
        const price = waveAmount / wcoAmount;
        
        // Use WCO transaction for display and classification
        const type = classifyTrade(wcoTx.tx, wcoTx.lpAddress);
        
        allTrades.push({
          hash: wcoTx.tx.hash,
          timestamp: Number(wcoTx.tx.timeStamp),
          time: new Date(Number(wcoTx.tx.timeStamp) * 1000),
          from: wcoTx.tx.from,
          to: wcoTx.tx.to,
          tokenSymbol: 'WCO',
          amount: wcoAmount,
          waveAmount: waveAmount,
          type,
          price,
          lpAddress: wcoTx.lpAddress,
          lpLabel: wcoTx.lpLabel
        });
      });
      
      console.log('[useWSwapTrades] Total trades after pairing:', allTrades.length);

      // Sort by time (newest first)
      allTrades.sort((a, b) => b.timestamp - a.timestamp);

      // Filter by selected LP if not "all"
      if (selectedLP !== 'all') {
        allTrades = allTrades.filter(trade => trade.lpAddress === selectedLP);
      }

      // Take only the last 100 trades
      allTrades = allTrades.slice(0, 100);

      setTrades(allTrades);

      // Calculate 24h stats
      const now = Date.now();
      const trades24h = allTrades.filter(t => now - t.timestamp * 1000 <= 24 * 60 * 60 * 1000);
      
      const uniqueWallets = new Set(trades24h.map(t => t.from)).size;
      const buyTrades = trades24h.filter(t => t.type === 'buy');
      const sellTrades = trades24h.filter(t => t.type === 'sell');
      
      const totalVolume = trades24h.reduce((sum, t) => sum + t.amount, 0);
      const buyVolume = buyTrades.reduce((sum, t) => sum + t.amount, 0);
      const sellVolume = sellTrades.reduce((sum, t) => sum + t.amount, 0);
      
      const largestTrade = trades24h.reduce((max, t) => 
        !max || t.amount > max.amount ? t : max, 
        null as WSwapTrade | null
      );

      setStats({
        totalVolume24h: totalVolume,
        totalTrades24h: trades24h.length,
        uniqueWallets24h: uniqueWallets,
        largestTrade24h: largestTrade,
        buyVolume24h: buyVolume,
        sellVolume24h: sellVolume
      });

      setError(null);
    } catch (err) {
      setError('Failed to fetch trades');
      console.error('Error fetching trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedLP, pairFilter]);

  return {
    trades,
    loading,
    error,
    stats,
    refetch: fetchTrades
  };
};
