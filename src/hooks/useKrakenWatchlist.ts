import { useState, useEffect, useCallback } from 'react';
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
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const CONCURRENT_REQUESTS = 3; // Limit concurrent API calls
const TRANSACTION_LIMIT = 10; // Reduced from 20 for faster responses

export const useKrakenWatchlist = (): UseKrakenWatchlistReturn => {
  const [transactions, setTransactions] = useState<KrakenTransaction[]>([]);
  const [krakenWallets, setKrakenWallets] = useState<KrakenWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { wallets: allWallets, loading: walletsLoading } = useWalletLeaderboard();

  // Cache functions
  const getCacheKey = (address: string) => `kraken_transactions_${address}`;
  
  const getCachedTransactions = (address: string): KrakenTransaction[] | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(address));
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(getCacheKey(address));
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  };
  
  const setCachedTransactions = (address: string, transactions: KrakenTransaction[]) => {
    try {
      localStorage.setItem(getCacheKey(address), JSON.stringify({
        data: transactions,
        timestamp: Date.now()
      }));
    } catch {
      // Ignore cache errors
    }
  };

  // Progressive Kraken wallet detection - don't wait for complete leaderboard
  const getProgressiveKrakenWallets = useCallback((): KrakenWallet[] => {
    return allWallets
      .filter(wallet => wallet.balance >= KRAKEN_MIN_BALANCE)
      .map(wallet => ({
        address: wallet.address,
        balance: wallet.balance,
        label: wallet.label,
      }));
  }, [allWallets]);

  // Batch API requests to avoid overwhelming the server
  const batchRequests = async <T>(
    items: T[],
    batchSize: number,
    processor: (item: T) => Promise<any>
  ): Promise<any[]> => {
    const results: any[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(processor)
      );
      
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : []
      ));
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
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

  // Optimized fetch transactions for a specific Kraken wallet with caching
  const fetchWalletTransactions = async (krakenWallet: KrakenWallet): Promise<KrakenTransaction[]> => {
    // Check cache first
    const cached = getCachedTransactions(krakenWallet.address);
    if (cached) {
      return cached;
    }

    try {
      const url = new URL(`https://scan.w-chain.com/api/listaccounts`);
      url.searchParams.append('address', krakenWallet.address);
      url.searchParams.append('transactions', 'true');
      url.searchParams.append('limit', TRANSACTION_LIMIT.toString());

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.warn(`Failed to fetch transactions for ${krakenWallet.address}: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.transactions || !Array.isArray(data.transactions)) {
        return [];
      }

      const krakenTransactions: KrakenTransaction[] = [];
      
      // Process each transaction
      for (const tx of data.transactions) {
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

      // Cache the results
      setCachedTransactions(krakenWallet.address, krakenTransactions);
      return krakenTransactions;
    } catch (error) {
      console.error(`Error fetching transactions for ${krakenWallet.address}:`, error);
      return [];
    }
  };

  // Optimized fetch all Kraken transactions with progressive loading and batching
  const fetchKrakenTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Progressive loading: get current available Kraken wallets
      const krakens = getProgressiveKrakenWallets();
      setKrakenWallets(krakens);

      if (krakens.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      console.log(`Fetching transactions for ${krakens.length} Kraken wallets...`);

      // Use batched parallel processing instead of sequential
      const transactionResults = await batchRequests(
        krakens,
        CONCURRENT_REQUESTS,
        fetchWalletTransactions
      );
      
      // Flatten and sort by timestamp (newest first)
      const allTransactions = transactionResults
        .flat()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log(`Found ${allTransactions.length} large Kraken transactions`);
      
      setTransactions(allTransactions);
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

  // Progressive loading: start fetching as soon as wallet data is available
  useEffect(() => {
    // Don't wait for complete loading - start with available wallets
    if (allWallets.length > 0) {
      fetchKrakenTransactions();
    }
  }, [allWallets.length]); // Trigger when wallet count changes

  // Also trigger when loading completes for any remaining wallets
  useEffect(() => {
    if (!walletsLoading && allWallets.length > 0) {
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