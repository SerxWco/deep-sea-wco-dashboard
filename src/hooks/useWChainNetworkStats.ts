import { useState, useEffect } from 'react';

interface NetworkStats {
  totalTransactionsCount: string;
  totalBlocksCount: string;
  averageBlockTime: string;
  totalAddresses: string;
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
  activeWallets: number;
  dormantWallets: number;
  largeTransactions: number;
  activityRate: number;
  totalWallets: number;
  totalTransactions: number;
  previousStats?: {
    activeWallets: number;
    dormantWallets: number;
    largeTransactions: number;
    activityRate: number;
  };
}

interface UseWChainNetworkStatsReturn {
  data: WChainNetworkStats | null;
  loading: boolean;
  error: string | null;
}

const W_CHAIN_API_BASE = 'https://scan.w-chain.com/api/v2';

// Consider a wallet active if it has transacted in the last 7 days
const ACTIVE_WALLET_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Consider a transaction "large" if it's over 1000 WCO
const LARGE_TRANSACTION_THRESHOLD = 1000;

export const useWChainNetworkStats = (): UseWChainNetworkStatsReturn => {
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

      // Fetch recent addresses (limit to reduce load)
      const addressesResponse = await fetch(`${W_CHAIN_API_BASE}/addresses?limit=100`);
      if (!addressesResponse.ok) {
        throw new Error(`Addresses API error: ${addressesResponse.status}`);
      }
      const addressesData = await addressesResponse.json();
      const addresses: AddressData[] = addressesData.items || [];

      // Fetch recent transactions to analyze patterns
      const transactionsResponse = await fetch(`${W_CHAIN_API_BASE}/transactions?limit=100`);
      if (!transactionsResponse.ok) {
        throw new Error(`Transactions API error: ${transactionsResponse.status}`);
      }
      const transactionsData = await transactionsResponse.json();
      const transactions: TransactionData[] = transactionsData.items || [];

      // Calculate stats
      const totalWallets = parseInt(networkStats.totalAddresses) || 0;
      const totalTransactions = parseInt(networkStats.totalTransactionsCount) || 0;

      // Analyze wallet activity
      const now = Date.now();
      let activeWallets = 0;
      
      addresses.forEach(address => {
        if (address.last_seen) {
          const lastSeenTime = new Date(address.last_seen).getTime();
          if (now - lastSeenTime < ACTIVE_WALLET_THRESHOLD) {
            activeWallets++;
          }
        }
      });

      // Scale active wallets based on sample size vs total
      const sampleSize = addresses.length;
      const scalingFactor = sampleSize > 0 ? totalWallets / sampleSize : 1;
      const estimatedActiveWallets = Math.round(activeWallets * scalingFactor);
      const estimatedDormantWallets = totalWallets - estimatedActiveWallets;

      // Count large transactions in recent sample
      const largeTransactions = transactions.filter(tx => {
        const value = parseFloat(tx.value) / 1e18; // Convert from Wei to WCO
        return value >= LARGE_TRANSACTION_THRESHOLD;
      }).length;

      // Calculate activity rate
      const activityRate = totalWallets > 0 
        ? Math.min(100, (estimatedActiveWallets / totalWallets) * 100)
        : 0;

      // Store previous stats for change calculation (simple mock for now)
      const previousStats = data ? {
        activeWallets: data.activeWallets,
        dormantWallets: data.dormantWallets,
        largeTransactions: data.largeTransactions,
        activityRate: data.activityRate,
      } : undefined;

      setData({
        activeWallets: estimatedActiveWallets,
        dormantWallets: estimatedDormantWallets,
        largeTransactions,
        activityRate: Math.round(activityRate * 10) / 10, // Round to 1 decimal
        totalWallets,
        totalTransactions,
        previousStats,
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