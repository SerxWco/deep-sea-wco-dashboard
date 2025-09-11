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
  { name: 'Harbor', emoji: '⚓', minBalance: 0 }, // Exchange wallets
  { name: 'Bridge/Wrapped', emoji: '🌉', minBalance: 0 }, // Wrapped contracts
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
  "0xfac510d5db8cadff323d4b979d898dc38f3fb6df": "Validation Nodes",
  "0x511a6355407bb78f26172db35100a87b9be20fc3": "Liquidity Provision",
  "0x2ca9472add8a02c74d50fc3ea444548502e35bdb": "Marketing & Community",
  "0xa306799ee31c7f89d3ff82d3397972933d57d679": "Premium Account Features",
  "0x94dbff05e1c129869772e1fb291901083cdadef1": "W Chain Ecosystem",
  "0x58213dd561d12a0ea7b538b1b26de34dace1d0f0": "Developer Incentives",
  "0x13768af351b4627dce8de6a67e59e4b27b4cbf5d": "Exchange Listings",
  "0xa237feafa2bac4096867af6229a2370b7a661a5f": "Incentives",
  "0xfc06231e2e448b778680202bea8427884c011341": "Institutional Sales",
  "0x80eabd19b84b4f5f042103e957964297589c657d": "Enterprises & Partnerships",
  "0x57ab15ca8bd528d509dbc81d11e9beca44f3445f": "Development Fund",
  "0xba9be06936c806aefad981ae96fa4d599b78ad24": "WTK Conversion / Total Supply",
  "0x67f2696c125d8d1307a5ae17348a440718229d03": "Treasury Wallet",
  "0x81d29c0DcD64fAC05C4A394D455cbD79D210C200": "Buybacks",
};

const EXCHANGE_WALLETS: Record<string, string> = {
  "0x6cc8dcbca746a6e4fdefb98e1d0df903b107fd21": "Bitrue Exchange",
  "0x2802e182d5a15df915fd0363d8f1adfd2049f9ee": "MEXC Exchange", 
  "0x430d2ada8140378989d20eae6d48ea05bbce2977": "Bitmart Exchange",
};

const WRAPPED_WCO = [
  "0xedb8008031141024d50ca2839a607b2f82c1c045"
];

const categorizeWallet = (balance: number, address: string): { category: string; emoji: string; label?: string } => {
  const addr = address.toLowerCase();

  // Check if address is a flagship wallet (team wallet)
  const flagshipLabel = FLAGSHIP_WALLETS[addr];
  if (flagshipLabel) {
    return { category: 'Flagship', emoji: '🚩', label: flagshipLabel };
  }

  // Check if address is an exchange wallet
  const exchangeLabel = EXCHANGE_WALLETS[addr];
  if (exchangeLabel) {
    return { category: 'Harbor', emoji: '⚓', label: exchangeLabel };
  }

  // Check if address is wrapped WCO contract
  if (WRAPPED_WCO.includes(addr)) {
    return { category: 'Bridge/Wrapped', emoji: '🌉', label: 'Wrapped WCO Contract' };
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

  // Function to fetch a specific wallet by address
  const fetchSpecificWallet = async (address: string): Promise<WalletData | null> => {
    try {
      const response = await fetch(`https://scan.w-chain.com/api/v2/addresses/${address}`);
      if (!response.ok) {
        console.warn(`Failed to fetch wallet ${address}: ${response.status}`);
        return null;
      }

      const account = await response.json();
      if (!account) return null;

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
    } catch (error) {
      console.warn(`Error fetching specific wallet ${address}:`, error);
      return null;
    }
  };

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

      // Verify all flagship wallets are present
      console.log('Verifying flagship wallets...');
      const flagshipAddresses = Object.keys(FLAGSHIP_WALLETS);
      const foundFlagships = allWallets.filter(w => flagshipAddresses.includes(w.address.toLowerCase()));
      const missingFlagships = flagshipAddresses.filter(addr => 
        !foundFlagships.some(w => w.address.toLowerCase() === addr.toLowerCase())
      );

      console.log(`Found ${foundFlagships.length}/${flagshipAddresses.length} flagship wallets`);
      
      if (missingFlagships.length > 0) {
        console.log('Fetching missing flagship wallets:', missingFlagships);
        
        for (const address of missingFlagships) {
          const wallet = await fetchSpecificWallet(address);
          if (wallet) {
            allWallets.push(wallet);
            console.log(`✅ Added missing flagship wallet: ${wallet.label || address}`);
          }
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Update UI with flagship wallets added
        setWallets([...allWallets]);
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