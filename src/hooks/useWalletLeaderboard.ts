import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { wchainGraphQL } from '@/services/wchainGraphQL';
import { useState, useEffect } from 'react';

/**
 * Represents a wallet's data in the leaderboard
 */
export interface WalletData {
  address: string;   // Wallet address (0x...)
  balance: number;   // WCO balance
  category: string;  // Ocean creature category
  emoji: string;     // Category emoji
  txCount: number;   // Transaction count
  label?: string;    // Special label (e.g., "Treasury Wallet")
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
  error: string | null;
  refetch: () => void;
  totalFetched: number;
  allCategories: CategoryInfo[];
  cacheAge: string | null;
  refreshCache: () => Promise<void>;
  isRefreshing: boolean;
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

export { EXCHANGE_WALLETS };

const WRAPPED_WCO = [
  "0xedb8008031141024d50ca2839a607b2f82c1c045"
];

const categorizeWallet = (balance: number, address: string): { category: string; emoji: string; label?: string } => {
  // Safety check: return default if address is undefined or invalid
  if (!address || typeof address !== 'string') {
    console.warn('Invalid address passed to categorizeWallet:', address);
    return { category: 'Plankton', emoji: '🦠' };
  }
  
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

/**
 * Fetches wallet leaderboard data from Supabase cache using pagination.
 * Cache is refreshed automatically every 6 hours via cron job.
 */
const fetchAllWallets = async (): Promise<WalletData[]> => {
  console.log('Fetching wallets from Supabase cache...');
  
  const pageSize = 1000;
  let allWallets: WalletData[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data: cachedWallets, error: cacheError } = await supabase
      .from('wallet_leaderboard_cache')
      .select('*')
      .order('balance', { ascending: false })
      .range(start, end);

    if (cacheError) {
      console.error('Error fetching from cache:', cacheError);
      throw new Error(`Failed to load wallet data: ${cacheError.message}`);
    }

    if (!cachedWallets || cachedWallets.length === 0) {
      hasMore = false;
    } else {
      allWallets.push(...cachedWallets.map(wallet => ({
        address: wallet.address,
        balance: Number(wallet.balance),
        category: wallet.category,
        emoji: wallet.emoji,
        txCount: wallet.transaction_count,
        label: wallet.label || undefined,
      })));

      // If we got less than pageSize, we've reached the end
      if (cachedWallets.length < pageSize) {
        hasMore = false;
      }
      page++;
    }
  }

  console.log(`✅ Loaded ${allWallets.length} wallets from cache`);
  return allWallets;
};

/**
 * Custom hook for fetching and managing wallet leaderboard data.
 * 
 * Loads from Supabase cache which is automatically refreshed every 6 hours.
 * Provides manual refresh capability via refreshCache().
 * 
 * @returns Wallet data, loading states, cache age, and refresh function
 * 
 * @example
 * const { wallets, loading, cacheAge, refreshCache, isRefreshing } = useWalletLeaderboard();
 */
export const useWalletLeaderboard = (): UseWalletLeaderboardReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheAge, setCacheAge] = useState<string | null>(null);

  // Fetch wallet data from cache
  const { data: wallets = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['walletLeaderboard'],
    queryFn: fetchAllWallets,
    staleTime: 5 * 60 * 1000, // 5 minutes - check cache freshness frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  // Fetch cache metadata to show age
  const { data: metadata } = useQuery({
    queryKey: ['cacheMetadata'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_cache_metadata')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      if (error) {
        console.error('Error fetching metadata:', error);
        return null;
      }
      
      return data;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Calculate cache age
  useEffect(() => {
    if (metadata?.last_refresh) {
      const lastRefresh = new Date(metadata.last_refresh);
      const now = new Date();
      const diffMs = now.getTime() - lastRefresh.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      
      if (diffHours > 0) {
        setCacheAge(`${diffHours}h ago`);
      } else if (diffMins > 0) {
        setCacheAge(`${diffMins}m ago`);
      } else {
        setCacheAge('just now');
      }
    }
  }, [metadata]);

  // Manual cache refresh function
  const refreshCache = async () => {
    setIsRefreshing(true);
    try {
      console.log('Triggering cache refresh...');
      const { error } = await supabase.functions.invoke('refresh-leaderboard-cache');
      
      if (error) {
        console.error('Error refreshing cache:', error);
        throw error;
      }
      
      // Wait a bit for the refresh to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Poll for completion (max 5 minutes)
      const startTime = Date.now();
      const maxWait = 5 * 60 * 1000;
      
      while (Date.now() - startTime < maxWait) {
        const { data: meta } = await supabase
          .from('wallet_cache_metadata')
          .select('refresh_status')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();
        
        if (meta?.refresh_status === 'completed') {
          console.log('Cache refresh completed!');
          await refetch(); // Reload wallet data
          break;
        }
        
        if (meta?.refresh_status === 'error') {
          throw new Error('Cache refresh failed');
        }
        
        // Wait 3 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return { 
    wallets, 
    loading: isLoading, 
    error: queryError ? (queryError as Error).message : null, 
    refetch: () => { refetch(); },
    totalFetched: wallets.length,
    allCategories: ALL_CATEGORIES,
    cacheAge,
    refreshCache,
    isRefreshing,
  };
};