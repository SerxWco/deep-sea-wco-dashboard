import { useState, useEffect } from 'react';

export interface WalletData {
  address: string;
  balance: number;
  category: string;
  emoji: string;
  txCount: number;
}

export interface CategoryInfo {
  name: string;
  emoji: string;
  minBalance: number;
  maxBalance?: number;
}

// Define all ocean creature categories in order from largest to smallest
export const ALL_CATEGORIES: CategoryInfo[] = [
  { name: 'Flagship', emoji: '🛳️', minBalance: 0 }, // Team wallets
  { name: 'Harbor', emoji: '⚓', minBalance: 0 }, // Exchange wallets
  { name: 'Kraken', emoji: '🦑', minBalance: 5000000 },
  { name: 'Whale', emoji: '🐋', minBalance: 1000001, maxBalance: 4999999 },
  { name: 'Shark', emoji: '🦈', minBalance: 500001, maxBalance: 1000000 },
  { name: 'Dolphin', emoji: '🐬', minBalance: 100001, maxBalance: 500000 },
  { name: 'Fish', emoji: '🐟', minBalance: 50001, maxBalance: 100000 },
  { name: 'Octopus', emoji: '🐙', minBalance: 10001, maxBalance: 50000 },
  { name: 'Crab', emoji: '🦀', minBalance: 1001, maxBalance: 10000 },
  { name: 'Shrimp', emoji: '🦐', minBalance: 1, maxBalance: 1000 },
  { name: 'Plankton', emoji: '🦠', minBalance: 0, maxBalance: 0.999 },
];

interface UseWalletLeaderboardReturn {
  wallets: WalletData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  allCategories: CategoryInfo[];
}

// Known exchange addresses (add actual addresses here)
const EXCHANGE_ADDRESSES = new Set([
  // Add known exchange addresses
]);

// Known team addresses (add actual addresses here)  
const TEAM_ADDRESSES = new Set([
  // Add known team addresses
]);

const categorizeWallet = (balance: number, address: string): { category: string; emoji: string } => {
  // Check if address is in known lists first
  if (EXCHANGE_ADDRESSES.has(address)) {
    return { category: 'Harbor', emoji: '⚓' };
  }
  
  if (TEAM_ADDRESSES.has(address)) {
    return { category: 'Flagship', emoji: '🛳️' };
  }
  
  // Categorize by balance
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
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        'https://scan.w-chain.com/api/v2/addresses?items_count=50'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result || !result.items || !Array.isArray(result.items)) {
        throw new Error('Invalid data format from W-Chain API');
      }

      const processedWallets: WalletData[] = result.items.map((account: any) => {
        // Convert coin_balance from wei to WCO (divide by 1e18)
        const balanceWei = parseFloat(account.coin_balance) || 0;
        const balance = balanceWei / 1e18;
        const { category, emoji } = categorizeWallet(balance, account.hash);
        
        return {
          address: account.hash,
          balance,
          category,
          emoji,
          txCount: parseInt(account.tx_count) || 0,
        };
      });

      setWallets(processedWallets);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  return { 
    wallets, 
    loading, 
    error, 
    refetch: fetchWalletData,
    allCategories: ALL_CATEGORIES,
  };
};