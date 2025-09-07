import { useState, useEffect } from 'react';

export interface WalletData {
  address: string;
  balance: number;
  category: string;
  emoji: string;
  txCount: number;
  label?: string;
}

export interface CategoryInfo {
  name: string;
  emoji: string;
  minBalance: number;
  maxBalance?: number;
}

// Define all ocean creature categories in order from largest to smallest
export const ALL_CATEGORIES: CategoryInfo[] = [
  { name: 'Flagship', emoji: '🚩', minBalance: 0 }, // Team wallets
  { name: 'Bridge/Wrapped', emoji: '⚓', minBalance: 0 }, // Wrapped contracts
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
  loadingMore: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
  hasMore: boolean;
  totalFetched: number;
  allCategories: CategoryInfo[];
}

// Define special wallets
const FLAGSHIP_WALLETS: Record<string, string> = {
  "0xfAc510D5dB8cadfF323D4b979D898dc38F3FB6dF": "Validation Nodes",
  "0x511A6355407Bb78f26172DB35100A87B9bE20Fc3": "Liquidity Provision",
  "0x2ca9472ADd8a02c74D50FC3Ea444548502E35BDb": "Marketing & Community",
  "0xa306799eE31c7f89D3ff82D3397972933d57d679": "Premium Account Features",
  "0x94DbFF05e1C129869772E1Fb291901083CdAdef1": "W Chain Ecosystem",
  "0x58213DD561d12a0Ea7b538B1b26DE34dACe1D0F0": "Developer Incentives",
  "0x13768af351B4627dcE8De6A67e59e4b27B4Cbf5D": "Exchange Listings",
  "0xa237FeAFa2BAc4096867aF6229a2370B7A661A5F": "Incentives",
  "0xFC06231E2e448B778680202BEA8427884c011341": "Institutional Sales",
  "0x80eaBD19b84b4f5f042103e957964297589C657D": "Enterprises & Partnerships",
  "0x57Ab15Ca8Bd528D509DbC81d11E9BecA44f3445f": "Development Fund",
  "0xba9Be06936C806AEfAd981Ae96fa4D599B78aD24": "WTK Conversion / Total Supply",
  "0x67F2696c125D8D1307a5aE17348A440718229D03": "Treasury Wallet",
};

const WRAPPED_WCO = [
  "0xEdB8008031141024d50cA2839A607B2f82C1c045"
];

const categorizeWallet = (balance: number, address: string): { category: string; emoji: string; label?: string } => {
  const addr = address.toLowerCase();

  // Check if address is a flagship wallet (team wallet)
  const flagshipLabel = FLAGSHIP_WALLETS[addr];
  if (flagshipLabel) {
    return { category: 'Flagship', emoji: '🚩', label: flagshipLabel };
  }

  // Check if address is wrapped WCO contract
  if (WRAPPED_WCO.includes(addr)) {
    return { category: 'Bridge/Wrapped', emoji: '⚓', label: 'Wrapped WCO Contract' };
  }

  // Ocean Creatures categorization by balance
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchWalletData = async (isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
        setWallets([]);
        setHasMore(true);
      }
      
      let allWallets: WalletData[] = isLoadMore ? wallets : [];
      const baseUrl = "https://scan.w-chain.com/api/v2/addresses";
      let url = `${baseUrl}?items_count=50`;
      let keepFetching = true;

      while (keepFetching) {
        console.log(`Fetching URL:`, url);
        const response = await fetch(url);

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
          const { category, emoji, label } = categorizeWallet(balance, account.hash);
          
          return {
            address: account.hash,
            balance,
            category,
            emoji,
            txCount: parseInt(account.transaction_count || account.tx_count) || 0,
            label,
          };
        });

        // Add new batch of wallets (no duplicate filtering to avoid complexity)
        allWallets = [...allWallets, ...processedWallets];
        
        // Update UI with current batch for progressive loading
        setWallets([...allWallets]);
        
        // Check if more pages exist
        if (result.next_page_params) {
          const params = new URLSearchParams(result.next_page_params).toString();
          url = `${baseUrl}?items_count=50&${params}`;
        } else {
          keepFetching = false;
        }
        
        console.log(`Fetched page, total wallets: ${allWallets.length}, has more: ${keepFetching}`);
        
        // Add small delay between requests to avoid overwhelming the API
        if (keepFetching) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setHasMore(false);
      
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    // No longer needed as all data is fetched automatically
    // Kept for backward compatibility but does nothing
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  return { 
    wallets, 
    loading, 
    loadingMore,
    error, 
    refetch: () => fetchWalletData(false),
    loadMore,
    hasMore,
    totalFetched: wallets.length,
    allCategories: ALL_CATEGORIES,
  };
};