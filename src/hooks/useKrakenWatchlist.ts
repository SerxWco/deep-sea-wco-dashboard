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
      const response = await fetch(
        `https://scan.w-chain.com/api/v2/addresses/${krakenWallet.address}/transactions?limit=20`
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

      // Fetch transactions for all Kraken wallets
      const allTransactionPromises = krakens.map(kraken => 
        fetchWalletTransactions(kraken)
      );

      const transactionResults = await Promise.all(allTransactionPromises);
      
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