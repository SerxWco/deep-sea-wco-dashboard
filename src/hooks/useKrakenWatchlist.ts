import { useState, useEffect } from 'react';
import { useWalletLeaderboard, EXCHANGE_WALLETS } from './useWalletLeaderboard';
import { 
  KrakenTransaction, 
  KrakenWallet, 
  UseKrakenWatchlistReturn, 
  TRANSACTION_CLASSIFICATIONS,
  TransactionClassification 
} from '@/types/kraken';

const KRAKEN_MIN_BALANCE = 5000000; // 5M WCO
const LARGE_TRANSACTION_THRESHOLD = 1000000; // 1M WCO

export const useKrakenWatchlist = (): UseKrakenWatchlistReturn => {
  const [transactions, setTransactions] = useState<KrakenTransaction[]>([]);
  const [krakenWallets, setKrakenWallets] = useState<KrakenWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { wallets: allWallets, loading: walletsLoading } = useWalletLeaderboard();

  // Get Kraken wallets from leaderboard data
  const getKrakenWallets = (): KrakenWallet[] => {
    return allWallets
      .filter(wallet => wallet.balance >= KRAKEN_MIN_BALANCE)
      .map(wallet => ({
        address: wallet.address,
        balance: wallet.balance,
        label: wallet.label,
      }));
  };

  // Classify transaction based on from/to addresses
  const classifyTransaction = (
    from: string, 
    to: string, 
    krakenWallets: KrakenWallet[]
  ): TransactionClassification => {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    
    const exchangeAddresses = Object.keys(EXCHANGE_WALLETS).map(addr => addr.toLowerCase());
    const krakenAddresses = krakenWallets.map(k => k.address.toLowerCase());

    const fromIsExchange = exchangeAddresses.includes(fromLower);
    const toIsExchange = exchangeAddresses.includes(toLower);
    const fromIsKraken = krakenAddresses.includes(fromLower);
    const toIsKraken = krakenAddresses.includes(toLower);

    // Sell pressure: Kraken → Exchange
    if (fromIsKraken && toIsExchange) {
      return TRANSACTION_CLASSIFICATIONS.sell_pressure;
    }

    // Buy pressure: Exchange → Kraken
    if (fromIsExchange && toIsKraken) {
      return TRANSACTION_CLASSIFICATIONS.buy_pressure;
    }

    // Internal move: Kraken ↔ Kraken
    if (fromIsKraken && toIsKraken) {
      return TRANSACTION_CLASSIFICATIONS.internal_move;
    }

    // Outflow: Kraken → Other
    if (fromIsKraken) {
      return TRANSACTION_CLASSIFICATIONS.outflow;
    }

    // Inflow: Other → Kraken
    if (toIsKraken) {
      return TRANSACTION_CLASSIFICATIONS.inflow;
    }

    // Fallback (shouldn't happen in our filtered data)
    return TRANSACTION_CLASSIFICATIONS.outflow;
  };

  // Fetch transactions for a specific Kraken wallet
  const fetchWalletTransactions = async (krakenWallet: KrakenWallet): Promise<KrakenTransaction[]> => {
    try {
      // Short-lived per-wallet cache to avoid duplicate fetches across refetches
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyGlobal = globalThis as any;
      if (!anyGlobal.__KRAKEN_TX_CACHE__) {
        anyGlobal.__KRAKEN_TX_CACHE__ = new Map<string, { ts: number; data: KrakenTransaction[] }>();
      }
      const CACHE_TTL_MS = 60_000; // 60 seconds
      const cache: Map<string, { ts: number; data: KrakenTransaction[] }> = anyGlobal.__KRAKEN_TX_CACHE__;
      const key = krakenWallet.address.toLowerCase();
      const cached = cache.get(key);
      const now = Date.now();
      if (cached && (now - cached.ts) < CACHE_TTL_MS) {
        return cached.data;
      }

      const response = await fetch(
        `https://scan.w-chain.com/api/v2/addresses/${krakenWallet.address}/transactions?filter=to_from&limit=50`
      );
      
      if (!response.ok) {
        console.warn(`Failed to fetch transactions for ${krakenWallet.address}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }

      const krakenTransactions: KrakenTransaction[] = [];
      
      // Process each transaction
      for (const tx of data.items) {
        if (!tx.value || !tx.from?.hash || !tx.to?.hash) continue;
        
        const valueWei = parseFloat(tx.value);
        const amountWCO = valueWei / 1e18;
        
        // Only include large transactions (≥1M WCO)
        if (amountWCO >= LARGE_TRANSACTION_THRESHOLD) {
          const classification = classifyTransaction(
            tx.from.hash,
            tx.to.hash,
            [krakenWallet] // Pass current kraken for classification
          );

          krakenTransactions.push({
            hash: tx.hash,
            timestamp: tx.timestamp || new Date().toISOString(),
            from: tx.from.hash,
            to: tx.to.hash,
            value: tx.value,
            amount: amountWCO,
            classification,
            krakenAddress: krakenWallet.address,
          });
        }
      }

      // Save to cache
      cache.set(key, { ts: Date.now(), data: krakenTransactions });
      return krakenTransactions;
    } catch (error) {
      console.error(`Error fetching transactions for ${krakenWallet.address}:`, error);
      return [];
    }
  };

  // Fetch all Kraken transactions
  const fetchKrakenTransactions = async () => {
    if (walletsLoading) return;
    
    setLoading(true);
    setError(null);

    try {
      const krakens = getKrakenWallets();
      setKrakenWallets(krakens);

      if (krakens.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      console.log(`Fetching transactions for ${krakens.length} Kraken wallets...`);

      // Concurrency-limited fetching with progressive updates
      const MAX_CONCURRENCY = 8;
      const queue = [...krakens];
      const workers: Promise<void>[] = [];

      async function worker() {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) break;
          try {
            const txs = await fetchWalletTransactions(next);
            if (txs.length > 0) {
              setTransactions(prev => {
                const merged = [...prev, ...txs];
                const seen = new Set<string>();
                const unique = merged.filter(tx => {
                  if (seen.has(tx.hash)) return false;
                  seen.add(tx.hash);
                  return true;
                });
                unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                return unique;
              });
            }
          } catch (e) {
            console.warn('Wallet tx fetch failed:', e);
          }
          // Reduced delay for faster fetching
          await new Promise(r => setTimeout(r, 50));
        }
      }

      for (let i = 0; i < Math.min(MAX_CONCURRENCY, krakens.length); i++) {
        workers.push(worker());
      }
      await Promise.all(workers);

      console.log(`Found ${transactions.length} large Kraken transactions`);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching Kraken watchlist data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Kraken data');
    } finally {
      setLoading(false);
    }
  };

  // Refetch function
  const refetch = () => {
    fetchKrakenTransactions();
  };

  // Initial fetch when wallet data is ready
  useEffect(() => {
    if (!walletsLoading) {
      fetchKrakenTransactions();
    }
  }, [walletsLoading]);

  return {
    transactions,
    krakenWallets,
    loading: loading || walletsLoading,
    error,
    refetch,
    lastUpdated,
  };
};