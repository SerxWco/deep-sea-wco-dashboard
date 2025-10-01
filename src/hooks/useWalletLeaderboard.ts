import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { wchainGraphQL } from '@/services/wchainGraphQL';

export interface WalletData {
  address: string;
  balance: number;
  transactionCount?: number;
  txCount?: number;
  category: string;
  emoji: string;
  label?: string;
}

export interface CategoryInfo {
  name: string;
  emoji: string;
  minBalance: number;
}

interface UseWalletLeaderboardReturn {
  wallets: WalletData[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
  hasMore: boolean;
  totalFetched: number;
  allCategories: CategoryInfo[];
}

export const ALL_CATEGORIES: CategoryInfo[] = [
  { name: 'Flagship', emoji: '🏆', minBalance: Infinity },
  { name: 'Harbor', emoji: '⚓', minBalance: Infinity },
  { name: 'Kraken', emoji: '🦑', minBalance: 5000000 },
  { name: 'Whale', emoji: '🐋', minBalance: 1000001 },
  { name: 'Shark', emoji: '🦈', minBalance: 500001 },
  { name: 'Dolphin', emoji: '🐬', minBalance: 100001 },
  { name: 'Fish', emoji: '🐟', minBalance: 50001 },
  { name: 'Octopus', emoji: '🐙', minBalance: 10001 },
  { name: 'Crab', emoji: '🦀', minBalance: 1001 },
  { name: 'Shrimp', emoji: '🦐', minBalance: 1 },
  { name: 'Plankton', emoji: '🦠', minBalance: 0 },
];

export const FLAGSHIP_WALLETS: Record<string, string> = {
  '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe': 'Binance Hot Wallet',
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance Hot Wallet 2',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance Hot Wallet 3',
  '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': 'Binance Hot Wallet 4',
  '0x9696f59e4d72e237be84ffd425dcad154bf96976': 'Binance Hot Wallet 5',
  '0x4976a4a02f38326660d17bf34b431dc6e2eb2327': 'Binance Wallet 6',
  '0xd551234ae421e3bcba99a0da6d736074f22192ff': 'Binance Wallet 7',
  '0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67': 'Binance Wallet 8',
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance Wallet 9',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance Wallet 10',
  '0x001866ae5b3de6caa5a51543fd9fb64f524f5478': 'Binance Wallet 11',
  '0x85b931a32a0725be14285b66f1a22178c672d69b': 'Binance Wallet 12',
  '0x708396f17127c42383e3b9014072679b2f60b82f': 'Binance Wallet 13',
  '0xe0f0cfde7ee664943906f17f7f14342e76a5cec7': 'Binance Wallet 14',
  '0x8f22f2063d253846b53609231ed80fa571bc0c8f': 'Binance Wallet 15',
  '0x0681d8db095565fe8a346fa0277bffde9c0edbbf': 'Binance Wallet 16',
};

export const EXCHANGE_WALLETS: Record<string, string> = {
  '0x46340b20830761efd32832a74d7169b29feb9758': 'Bitrue Hot Wallet',
  '0x5c985e89dde482efe97ea9f1950ad149eb73829b': 'MEXC Hot Wallet',
  '0x0211f3cedbef3143223d3acf0e589747933e8527': 'BitMart Hot Wallet',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap Router V3',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap Router V2',
};

const categorizeWallet = (balance: number, address: string): { category: string; emoji: string; label?: string } => {
  const lowerAddress = address.toLowerCase();
  
  if (FLAGSHIP_WALLETS[lowerAddress]) {
    return { 
      category: 'Flagship', 
      emoji: '🏆',
      label: FLAGSHIP_WALLETS[lowerAddress]
    };
  }
  
  if (EXCHANGE_WALLETS[lowerAddress]) {
    return { 
      category: 'Harbor', 
      emoji: '⚓',
      label: EXCHANGE_WALLETS[lowerAddress]
    };
  }
  
  if (balance >= 5000000) return { category: 'Kraken', emoji: '🦑' };
  if (balance >= 1000001) return { category: 'Whale', emoji: '🐋' };
  if (balance >= 500001) return { category: 'Shark', emoji: '🦈' };
  if (balance >= 100001) return { category: 'Dolphin', emoji: '🐬' };
  if (balance >= 50001) return { category: 'Fish', emoji: '🐟' };
  if (balance >= 10001) return { category: 'Octopus', emoji: '🐙' };
  if (balance >= 1001) return { category: 'Crab', emoji: '🦀' };
  if (balance >= 1) return { category: 'Shrimp', emoji: '🦐' };
  return { category: 'Plankton', emoji: '🦠' };
};

export const useWalletLeaderboard = (): UseWalletLeaderboardReturn => {
  const queryClient = useQueryClient();
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { data: wallets = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['walletLeaderboard'],
    queryFn: async (): Promise<WalletData[]> => {
      const allWallets: WalletData[] = [];
      
      try {
        // Fetch from REST API since GraphQL getLeaderboard doesn't exist
        const response = await fetch('https://scan.w-chain.com/api/v2/addresses?items_count=1000');
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        
        const graphqlData = await response.json();
        
        if (graphqlData?.items) {
          const graphqlWallets = graphqlData.items
            .filter((holder: any) => holder.coin_balance && parseFloat(holder.coin_balance) > 0)
            .map((holder: any) => {
              const balanceWei = parseFloat(holder.coin_balance) || 0;
              const balance = balanceWei / 1e18;
              const { category, emoji, label } = categorizeWallet(balance, holder.address);
              
              return {
                address: holder.hash,
                balance,
                transactionCount: parseInt(holder.transactions_count || holder.tx_count) || 0,
                category,
                emoji,
                label,
              };
            });
          
          allWallets.push(...graphqlWallets);
        }
        
        // Ensure flagship wallets are included
        const flagshipAddresses = Object.keys(FLAGSHIP_WALLETS);
        for (const address of flagshipAddresses) {
          if (!allWallets.find(w => w.address.toLowerCase() === address.toLowerCase())) {
            try {
              const response = await fetch(`https://api.w-chain.com/api/holders/${address}`);
              if (response.ok) {
                const data = await response.json();
                if (data.balance) {
                  const balance = parseFloat(data.balance);
                  allWallets.push({
                    address: data.address,
                    balance,
                    transactionCount: data.transactionCount || 0,
                    category: 'Flagship',
                    emoji: '🏆',
                    label: FLAGSHIP_WALLETS[address as keyof typeof FLAGSHIP_WALLETS],
                  });
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch flagship wallet ${address}:`, err);
            }
          }
        }
        
        return allWallets.sort((a, b) => b.balance - a.balance);
      } catch (err) {
        console.error('Error fetching wallet leaderboard:', err);
        throw err;
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
  });

  const error = queryError ? String(queryError) : null;

  const loadMore = () => {
    setLoadingMore(false);
    setHasMore(false);
  };

  return { 
    wallets, 
    loading, 
    loadingMore,
    error, 
    refetch: () => { refetch(); },
    loadMore,
    hasMore,
    totalFetched: wallets.length,
    allCategories: ALL_CATEGORIES,
  };
};
