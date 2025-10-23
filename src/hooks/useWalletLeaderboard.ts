import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { wchainGraphQL } from '@/services/wchainGraphQL';

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
 * Fetches wallet leaderboard data using three-tier strategy:
 * 1. Supabase cache (fastest, 15-min TTL)
 * 2. GraphQL API (fast, bulk fetch 5000 wallets)
 * 3. REST API (fallback, paginated)
 */
const fetchAllWallets = async (): Promise<WalletData[]> => {
  // Function to fetch a specific wallet by address
  const fetchSpecificWallet = async (address: string): Promise<WalletData | null> => {
    try {
      const response = await fetch(`https://scan.w-chain.com/api/v2/addresses/${address}`);
      if (!response.ok) {
        console.warn(`Failed to fetch wallet ${address}: ${response.status}`);
        return null;
      }

      const account = await response.json();
      if (!account?.hash || typeof account.hash !== 'string') return null;

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

  // 1) Try Supabase cache first (fastest)
  console.log('Attempting to fetch from Supabase cache...');
  try {
    const { data: cachedWallets, error: cacheError } = await supabase
      .from('wallet_leaderboard_cache')
      .select('*')
      .order('balance', { ascending: false });

    if (!cacheError && cachedWallets && cachedWallets.length > 0) {
      console.log(`✅ Loaded ${cachedWallets.length} wallets from Supabase cache`);
      
      return cachedWallets.map(wallet => ({
        address: wallet.address,
        balance: Number(wallet.balance),
        category: wallet.category,
        emoji: wallet.emoji,
        txCount: wallet.transaction_count,
        label: wallet.label || undefined,
      }));
    }
    
    console.log('Cache empty or error, falling back to API...');
  } catch (cacheErr) {
    console.warn('Supabase cache fetch failed:', cacheErr);
  }

  // 2) Fast path: GraphQL (fetch top addresses in one request)
  let allWallets: WalletData[] = [];
  try {
    const graphOK = await wchainGraphQL.testConnection();
    if (graphOK) {
      console.log('Using GraphQL fast-path for leaderboard');
      const result = await wchainGraphQL.getNetworkStats(5000);
      const processedWallets: WalletData[] = result.addresses.items
        .filter((account: any) => account?.hash && typeof account.hash === 'string')
        .map((account: any) => {
          const balanceWei = parseFloat(account.coinBalance) || 0;
          const balance = balanceWei / 1e18;
          const { category, emoji, label } = categorizeWallet(balance, account.hash);
          return {
            address: account.hash,
            balance,
            category,
            emoji,
            txCount: parseInt(account.transactionsCount) || 0,
            label,
          };
        });

      allWallets = processedWallets;

      // Verify flagship wallets
      const flagshipAddresses = Object.keys(FLAGSHIP_WALLETS);
      const foundFlagships = allWallets.filter(w => flagshipAddresses.includes(w.address.toLowerCase()));
      const missingFlagships = flagshipAddresses.filter(addr => 
        !foundFlagships.some(w => w.address.toLowerCase() === addr.toLowerCase())
      );

      if (missingFlagships.length > 0) {
        console.log('Fetching missing flagship wallets:', missingFlagships);
        for (const address of missingFlagships) {
          const wallet = await fetchSpecificWallet(address);
          if (wallet) {
            allWallets.push(wallet);
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return allWallets;
    }
  } catch (e) {
    console.warn('GraphQL fast-path failed, falling back to REST:', e);
  }

  // 3) Fallback: REST paginated crawl
  const baseUrl = "https://scan.w-chain.com/api/v2/addresses";
  let url = `${baseUrl}?items_count=100`;
  let keepFetching = true;
  let pageCount = 0;
  const maxInitialPages = 50;
  
  while (keepFetching && pageCount < maxInitialPages) {
    console.log(`Fetching page ${pageCount + 1}:`, url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result || !result.items || !Array.isArray(result.items)) {
      console.warn('No more data from API, stopping fetch');
      break;
    }

    if (result.items.length === 0) {
      console.log('API returned empty results, stopping fetch');
      break;
    }

    const processedWallets: WalletData[] = result.items
      .filter((account: any) => account?.hash && typeof account.hash === 'string')
      .map((account: any) => {
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

    allWallets = [...allWallets, ...processedWallets];
    pageCount++;
    
    if (result.next_page_params) {
      const params = new URLSearchParams(result.next_page_params).toString();
      url = `${baseUrl}?items_count=100&${params}`;
    } else {
      keepFetching = false;
    }
    
    console.log(`Fetched page ${pageCount}, total wallets: ${allWallets.length}`);
    
    if (keepFetching && pageCount < maxInitialPages) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Verify flagship wallets
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
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return allWallets;
};

/**
 * Custom hook for fetching and managing wallet leaderboard data.
 * 
 * Implements three-tier caching:
 * - Supabase cache (fastest, refreshed every 15 min)
 * - GraphQL API (fast bulk fetch)
 * - REST API fallback (paginated)
 * 
 * Categorizes wallets into ocean creature tiers (Kraken, Whale, Shark, etc.)
 * and applies special labels for team wallets, exchanges, and wrapped tokens.
 * 
 * @returns Wallet data, loading states, and refetch function
 * 
 * @example
 * const { wallets, loading, refetch } = useWalletLeaderboard();
 */
export const useWalletLeaderboard = (): UseWalletLeaderboardReturn => {
  // Use React Query for data fetching with 15-minute cache
  const { data: wallets = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['walletLeaderboard'],
    queryFn: fetchAllWallets,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  return { 
    wallets, 
    loading: isLoading, 
    loadingMore: false, // No pagination with this approach
    error: queryError ? (queryError as Error).message : null, 
    refetch: () => { refetch(); },
    loadMore: () => {}, // No-op since we fetch all data at once
    hasMore: false, // All data loaded at once
    totalFetched: wallets.length,
    allCategories: ALL_CATEGORIES,
  };
};