import { useState, useEffect } from 'react';

export interface WalletData {
  address: string;
  balance: number;
  category: string;
  emoji: string;
}

interface UseWalletLeaderboardReturn {
  wallets: WalletData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
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
        'https://scan.w-chain.com/api/addresses?limit=100&sort=balance'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result || !Array.isArray(result)) {
        throw new Error('Invalid data format from W-Chain API');
      }

      const processedWallets: WalletData[] = result.map((account: any) => {
        // Convert balance from wei to WCO (divide by 1e18)
        const balanceWei = parseFloat(account.balance) || 0;
        const balance = balanceWei / 1e18;
        const { category, emoji } = categorizeWallet(balance, account.address);
        
        return {
          address: account.address,
          balance,
          category,
          emoji,
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
    refetch: fetchWalletData 
  };
};