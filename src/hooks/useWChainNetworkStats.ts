import { useState, useEffect } from 'react';
import { saveDailyMetrics, getDailyComparison } from '@/utils/dailyComparisons';

interface NetworkStats {
  totalTransactionsCount: string;
  totalBlocksCount: string;
  averageBlockTime: string;
  totalAddresses: string;
  transactionsToday?: string;
}

interface TransactionData {
  hash: string;
  value: string;
  from: {
    hash: string;
  };
  to: {
    hash: string;
  };
  timestamp: string;
}

interface AddressData {
  hash: string;
  coin_balance: string;
  transactions_count: number;
  last_seen: string;
}

interface WChainNetworkStats {
  totalHolders: number;
  transactions24h: number;
  wcoMoved24h: number;
  activeWallets: number;
  averageTransactionSize: number;
  networkActivityRate: number;
  dailyComparison?: {
    totalHolders: { change: number; percentage: number };
    transactions24h: { change: number; percentage: number };
    wcoMoved24h: { change: number; percentage: number };
    activeWallets: { change: number; percentage: number };
    averageTransactionSize: { change: number; percentage: number };
    networkActivityRate: { change: number; percentage: number };
  } | null;
}

interface UseWChainNetworkStatsReturn {
  data: WChainNetworkStats | null;
  loading: boolean;
  error: string | null;
}

const W_CHAIN_API_BASE = 'https://scan.w-chain.com/api/v2';

// Consider a wallet active if it has transacted in the last 7 days
const ACTIVE_WALLET_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Minimum balance to be considered a holder (in Wei)
const MIN_HOLDER_BALANCE = 1000000000000000000; // 1 WCO in Wei

export const useWChainNetworkStats = (totalTrackedWallets: number = 0): UseWChainNetworkStatsReturn => {
  const [data, setData] = useState<WChainNetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworkStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch general network stats
      const statsResponse = await fetch(`${W_CHAIN_API_BASE}/stats`);
      if (!statsResponse.ok) {
        throw new Error(`Stats API error: ${statsResponse.status}`);
      }
      const networkStats: NetworkStats = await statsResponse.json();

      // Fetch addresses to count holders (increase limit for better accuracy)
      const addressesResponse = await fetch(`${W_CHAIN_API_BASE}/addresses?limit=1000`);
      if (!addressesResponse.ok) {
        throw new Error(`Addresses API error: ${addressesResponse.status}`);
      }
      const addressesData = await addressesResponse.json();
      const addresses: AddressData[] = addressesData.items || [];
      
      console.log('Address data sample:', addresses.slice(0, 3));
      console.log('Total addresses fetched:', addresses.length);

      // Fetch recent transactions for 24h analysis (increased limit for better accuracy)
      const transactionsResponse = await fetch(`${W_CHAIN_API_BASE}/transactions?limit=1000`);
      if (!transactionsResponse.ok) {
        throw new Error(`Transactions API error: ${transactionsResponse.status}`);
      }
      const transactionsData = await transactionsResponse.json();
      const transactions: TransactionData[] = transactionsData.items || [];

      // Calculate total holders (addresses with WCO balance > 1)
      const totalHolders = addresses.filter(address => {
        const balance = parseFloat(address.coin_balance) || 0;
        return balance >= MIN_HOLDER_BALANCE;
      }).length;

      // Scale holders based on sample size
      const totalAddresses = parseInt(networkStats.totalAddresses) || 0;
      const sampleSize = addresses.length;
      const scalingFactor = sampleSize > 0 ? totalAddresses / sampleSize : 1;
      const estimatedTotalHolders = Math.round(totalHolders * scalingFactor);

      // Get 24h transactions from stats
      const transactions24h = parseInt((networkStats as any).transactions_today || '0') || 0;

      // Calculate 24h WCO moved and average transaction size
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
      
      let wcoMoved24h = 0;
      let transactionCount24h = 0;
      
      transactions.forEach(tx => {
        const txTime = new Date(tx.timestamp).getTime();
        if (txTime >= twentyFourHoursAgo) {
          const value = parseFloat(tx.value) / 1e18; // Convert from Wei to WCO
          wcoMoved24h += value;
          transactionCount24h++;
        }
      });

      // Scale 24h volume based on sample vs actual transactions
      const actualTransactions24h = transactions24h > 0 ? transactions24h : transactionCount24h;
      const volumeScalingFactor = transactionCount24h > 0 ? actualTransactions24h / transactionCount24h : 1;
      const estimatedWcoMoved24h = wcoMoved24h * volumeScalingFactor;

      // Calculate average transaction size
      const averageTransactionSize = actualTransactions24h > 0 
        ? estimatedWcoMoved24h / actualTransactions24h 
        : 0;

      // Calculate active wallets using transaction-based approach (like old project)
      const activeWalletsSet = new Set<string>();
      
      transactions.forEach(tx => {
        const txTime = new Date(tx.timestamp).getTime();
        if (txTime >= twentyFourHoursAgo) {
          // Add both sender and receiver as active wallets
          activeWalletsSet.add(tx.from.hash.toLowerCase());
          activeWalletsSet.add(tx.to.hash.toLowerCase());
        }
      });

      const activeWallets = activeWalletsSet.size;
      console.log('Active wallets (24h transactions):', activeWallets);

      // Calculate network activity rate against tracked wallets (like old project)
      const networkActivityRate = totalTrackedWallets > 0 
        ? Math.min(100, (activeWallets / totalTrackedWallets) * 100)
        : 0;

      const newStats = {
        totalHolders: estimatedTotalHolders,
        transactions24h: actualTransactions24h,
        wcoMoved24h: Math.round(estimatedWcoMoved24h),
        activeWallets: activeWallets,
        averageTransactionSize: Math.round(averageTransactionSize * 100) / 100,
        networkActivityRate: Math.round(networkActivityRate * 10) / 10,
      };

      // Save daily metrics for comparison
      saveDailyMetrics(newStats);
      
      // Get daily comparison
      const dailyComparison = getDailyComparison(newStats);

      console.log('Final stats:', newStats);
      console.log('Daily comparison:', dailyComparison);

      setData({
        ...newStats,
        dailyComparison,
      });

    } catch (err) {
      console.error('Error fetching W Chain network stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch network stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkStats();
    
    // Refresh data every 5 minutes (less frequent to avoid overwhelming the API)
    const interval = setInterval(fetchNetworkStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
};