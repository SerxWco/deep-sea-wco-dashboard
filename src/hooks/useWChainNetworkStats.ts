import { useQuery } from '@tanstack/react-query';
import { wchainGraphQL } from '@/services/wchainGraphQL';

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
  avgTransactionSize: number;
}

interface UseWChainNetworkStatsReturn {
  data: WChainNetworkStats | null;
  loading: boolean;
  error: string | null;
}

const MIN_HOLDER_BALANCE = 1000000000000000000; // 1 WCO in Wei

export const useWChainNetworkStats = (): UseWChainNetworkStatsReturn => {
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['wchainNetworkStats'],
    queryFn: async (): Promise<WChainNetworkStats | null> => {
      try {
        // Try GraphQL first
        // GraphQL approach - use getNetworkStats with proper parsing
        const isGraphQLAvailable = await wchainGraphQL.testConnection();
        
        if (isGraphQLAvailable) {
          const graphqlData = await wchainGraphQL.getNetworkStats(1000);
          
          if (graphqlData?.transactions?.items) {
            const now = Date.now();
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            
            const recentTxs = graphqlData.transactions.items.filter((tx: any) => 
              tx.timestamp && new Date(tx.timestamp).getTime() > oneDayAgo
            );
            
            const wcoMoved24h = recentTxs.reduce((sum: number, tx: any) => {
              const value = parseFloat(tx.value || '0') / 1e18;
              return sum + (isNaN(value) ? 0 : value);
            }, 0);
            
            const uniqueAddresses = new Set<string>();
            recentTxs.forEach((tx: any) => {
              if (tx.from?.hash) uniqueAddresses.add(tx.from.hash.toLowerCase());
              if (tx.to?.hash) uniqueAddresses.add(tx.to.hash.toLowerCase());
            });
            
            return {
              totalHolders: graphqlData.addresses?.items?.length || 0,
              transactions24h: recentTxs.length,
              wcoMoved24h,
              activeWallets: uniqueAddresses.size,
              avgTransactionSize: recentTxs.length > 0 ? wcoMoved24h / recentTxs.length : 0,
            };
          }
        }
        
        // Fallback to REST API
        const [statsResponse, addressResponse, txResponse] = await Promise.all([
          fetch('https://api.w-chain.com/api/stats'),
          fetch('https://api.w-chain.com/api/addresses?page=1&limit=100'),
          fetch('https://api.w-chain.com/api/transactions?page=1&limit=100')
        ]);

        if (!statsResponse.ok) {
          throw new Error('Failed to fetch network stats');
        }

        const statsData: NetworkStats = await statsResponse.json();
        let addressData: AddressData[] = [];
        let txData: TransactionData[] = [];

        if (addressResponse.ok) {
          const addressJson = await addressResponse.json();
          addressData = addressJson.items || [];
        }
        
        if (txResponse.ok) {
          const txJson = await txResponse.json();
          txData = txJson.items || [];
        }

        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        
        const recentTxs = txData.filter(tx => 
          tx.timestamp && new Date(tx.timestamp).getTime() > oneDayAgo
        );
        
        const sampleTxCount = recentTxs.length;
        const totalTxs = parseInt(statsData.totalTransactionsCount) || 0;
        const scaleFactor = sampleTxCount > 0 ? (totalTxs / 100) : 1;
        const transactions24h = Math.round(sampleTxCount * scaleFactor);
        
        const wcoMovedSample = recentTxs.reduce((sum, tx) => {
          const value = parseFloat(tx.value);
          return sum + (isNaN(value) ? 0 : value);
        }, 0);
        
        const wcoMoved24h = wcoMovedSample * scaleFactor;
        
        const uniqueAddresses = new Set<string>();
        recentTxs.forEach(tx => {
          if (tx.from?.hash) uniqueAddresses.add(tx.from.hash.toLowerCase());
          if (tx.to?.hash) uniqueAddresses.add(tx.to.hash.toLowerCase());
        });
        
        const activeWallets = Math.round(uniqueAddresses.size * scaleFactor);
        const avgTransactionSize = transactions24h > 0 ? wcoMoved24h / transactions24h : 0;

        const totalHolders = addressData.filter(addr => {
          const balance = parseFloat(addr.coin_balance) || 0;
          return balance >= MIN_HOLDER_BALANCE;
        }).length;

        return {
          totalHolders: Math.round(totalHolders * scaleFactor),
          transactions24h,
          wcoMoved24h,
          activeWallets,
          avgTransactionSize,
        };
      } catch (err) {
        console.error('Error fetching network stats:', err);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const error = queryError ? String(queryError) : null;

  return { data: data || null, loading, error };
};
