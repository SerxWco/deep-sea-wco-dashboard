import { useState, useEffect } from 'react';
import axios from 'axios';
import { WCHAIN_SCAN_API, WSWAP_LPS, MAIN_TOKEN, REFRESH_INTERVAL } from '@/config/wswap';
import { WSwapTrade, WChainTokenTransaction, TradeStats } from '@/types/wswap';
import { useWSwapReserves } from './useWSwapReserves';

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

  const { getPrice, loading: reservesLoading } = useWSwapReserves();

  const classifyTrade = (tx: WChainTokenTransaction, lpAddress: string): 'buy' | 'sell' => {
    const lp = WSWAP_LPS.find(l => l.address === lpAddress);
    if (!lp) return 'buy';

    // For WAVE token display perspective:
    // WAVE leaving user's wallet (entering LP) = user selling WAVE for WCO = SELL
    // WAVE entering user's wallet (leaving LP) = user buying WAVE with WCO = BUY
    if (pairFilter === 'WAVE' && tx.tokenSymbol === 'WAVE') {
      const isLeavingLP = tx.from.toLowerCase() === lpAddress.toLowerCase();
      return isLeavingLP ? 'buy' : 'sell'; // LP sending WAVE to user = user buying WAVE
    }

    // For WCO/other tokens: WCO leaving LP = user buying WCO (selling other token)
    const isToken0 = tx.tokenSymbol === lp.token0;
    const isLeavingLP = tx.from.toLowerCase() === lpAddress.toLowerCase();
    
    if (isToken0) {
      return isLeavingLP ? 'buy' : 'sell';
    } else {
      return isLeavingLP ? 'sell' : 'buy';
    }
  };

  const fetchTrades = async () => {
    if (reservesLoading) return;

    try {
      // Filter LPs based on pairFilter if provided
      const filteredLPs = pairFilter 
        ? WSWAP_LPS.filter(lp => lp.pair.includes(pairFilter))
        : WSWAP_LPS;

      const tradePromises = filteredLPs.map(async (lp) => {
        try {
          const response = await axios.get(
            `${WCHAIN_SCAN_API}?module=account&action=tokentx&address=${lp.address}`
          );

          if (response.data?.result && Array.isArray(response.data.result)) {
            return response.data.result.map((tx: WChainTokenTransaction) => {
              const type = classifyTrade(tx, lp.address);
              const price = getPrice(lp.address, tx.tokenSymbol);
              const amount = Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal));

              return {
                hash: tx.hash,
                timestamp: Number(tx.timeStamp),
                time: new Date(Number(tx.timeStamp) * 1000),
                from: tx.from,
                to: tx.to,
                tokenSymbol: tx.tokenSymbol,
                amount,
                type,
                price,
                lpAddress: lp.address,
                lpLabel: lp.label
              } as WSwapTrade;
            });
          }
          return [];
        } catch (err) {
          console.error(`Error fetching trades for ${lp.address}:`, err);
          return [];
        }
      });

      const allTradesArrays = await Promise.all(tradePromises);
      let allTrades = allTradesArrays.flat();

      // Deduplicate by hash - prefer WAVE tokens when filtering by WAVE, otherwise prefer non-WAVE
      const tradesByHash = new Map<string, WSwapTrade>();
      allTrades.forEach(trade => {
        const existing = tradesByHash.get(trade.hash);
        if (!existing) {
          tradesByHash.set(trade.hash, trade);
        } else {
          // If filtering by WAVE, prefer WAVE tokens; otherwise prefer non-WAVE
          if (pairFilter === 'WAVE') {
            if (trade.tokenSymbol === 'WAVE' && existing.tokenSymbol !== 'WAVE') {
              tradesByHash.set(trade.hash, trade);
            }
          } else {
            if (trade.tokenSymbol !== 'WAVE' && existing.tokenSymbol === 'WAVE') {
              tradesByHash.set(trade.hash, trade);
            }
          }
        }
      });
      
      allTrades = Array.from(tradesByHash.values());

      // Sort by time (newest first)
      allTrades.sort((a, b) => b.timestamp - a.timestamp);

      // Filter by selected LP if not "all"
      if (selectedLP !== 'all') {
        allTrades = allTrades.filter(trade => trade.lpAddress === selectedLP);
      }

      // Keep more trades for historical analysis (limit to 1000 for performance)
      allTrades = allTrades.slice(0, 1000);

      setTrades(allTrades);

      // Calculate 24h stats
      const now = Date.now();
      const trades24h = allTrades.filter(t => now - t.timestamp * 1000 <= 24 * 60 * 60 * 1000);
      
      // Count unique user wallets (exclude LP contracts)
      const lpAddresses = filteredLPs.map(lp => lp.address.toLowerCase());
      const uniqueWallets = new Set(
        trades24h
          .map(t => {
            // Get the wallet address that's NOT the LP contract
            const fromIsLP = lpAddresses.includes(t.from.toLowerCase());
            const toIsLP = lpAddresses.includes(t.to.toLowerCase());
            
            if (fromIsLP && !toIsLP) return t.to.toLowerCase();
            if (toIsLP && !fromIsLP) return t.from.toLowerCase();
            return null;
          })
          .filter(addr => addr !== null)
      ).size;
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
  }, [selectedLP, pairFilter, reservesLoading]);

  return {
    trades,
    loading: loading || reservesLoading,
    error,
    stats,
    refetch: fetchTrades
  };
};
