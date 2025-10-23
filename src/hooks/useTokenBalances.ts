import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { WChainToken, TokenBalance } from '@/types/token';
import { useWCOMarketData } from './useWCOMarketData';
import { useWChainPriceAPI } from './useWChainPriceAPI';
import { useOG88Price } from './useOG88Price';

interface UseTokenBalancesReturn {
  balances: TokenBalance[];
  loading: boolean;
  error: string | null;
  refetchBalances: () => void;
}

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

const W_CHAIN_RPC = 'https://rpc.w-chain.com';

// Alternative RPC endpoints to try
const BACKUP_RPCS = [
  'https://mainnet-rpc.w-chain.com',  // Old endpoint as backup
  'https://mainnet.w-chain.com',
  'https://rpc-mainnet.w-chain.com',
  'https://node.w-chain.com',
];

// Cache for working RPC endpoint
let cachedRPC: { url: string; timestamp: number } | null = null;
const RPC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Finds a working W-Chain RPC endpoint with caching.
 * 
 * Strategy:
 * 1. Check cache first (5 min TTL) to avoid repeated connection tests
 * 2. Try primary RPC endpoint with 5s timeout
 * 3. Fallback to backup endpoints if primary fails
 * 4. Cache the working endpoint for 5 minutes
 * 
 * Uses getNetwork() instead of getBlockNumber() because it's faster
 * and sufficient to verify the RPC is responsive.
 * 
 * @returns Working RPC URL or null if all endpoints fail
 */
const findWorkingRPC = async (): Promise<string | null> => {
  // Check cache first to avoid unnecessary connection attempts
  if (cachedRPC && Date.now() - cachedRPC.timestamp < RPC_CACHE_DURATION) {
    console.log(`Using cached RPC: ${cachedRPC.url}`);
    return cachedRPC.url;
  }

  const allEndpoints = [W_CHAIN_RPC, ...BACKUP_RPCS];
  
  // Try each endpoint sequentially until one works
  for (const rpcUrl of allEndpoints) {
    try {
      console.log(`Testing RPC endpoint: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Add 5 second timeout to prevent hanging on dead endpoints
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      // Use getNetwork() - it's faster than getBlockNumber()
      await Promise.race([
        provider.getNetwork(),
        timeoutPromise
      ]);
      
      console.log(`✅ Working RPC found: ${rpcUrl}`);
      
      // Cache the working RPC to avoid retesting for 5 minutes
      cachedRPC = { url: rpcUrl, timestamp: Date.now() };
      
      return rpcUrl;
    } catch (error) {
      console.log(`❌ RPC failed: ${rpcUrl}`, error);
      continue; // Try next endpoint
    }
  }
  
  console.error('No working RPC endpoints found');
  return null;
};

// Add delay function to avoid overwhelming RPC
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff strategy.
 * 
 * Retry delays:
 * - 1st retry: 1s delay
 * - 2nd retry: 2s delay (1000 * 2^1)
 * - 3rd retry: 4s delay (1000 * 2^2)
 * 
 * This prevents overwhelming the RPC with rapid retries when it's under load.
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Function result or null if all retries fail
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T | null> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        console.warn('Max retries reached:', error);
        return null;
      }
      // Exponential backoff: 1s, 2s, 4s
      await delay(baseDelay * Math.pow(2, i));
    }
  }
  return null;
};

/**
 * Custom hook for fetching ERC-20 token balances from W-Chain RPC.
 * 
 * Features:
 * - Automatic RPC endpoint discovery with fallback URLs
 * - RPC endpoint caching (5 min) to avoid connection overhead
 * - Sequential processing with delays to prevent RPC overload
 * - Exponential backoff retry strategy
 * - USD valuation using multiple price feeds (WCO, WAVE, OG88)
 * 
 * Performance optimizations:
 * - Only checks top 20 tokens by holder count
 * - Skips tokens with zero balance
 * - 200ms delay between requests
 * - 2s delay every 5 requests
 * 
 * @param tokens - Array of ERC-20 tokens to check
 * @param walletAddress - Wallet address to query balances for
 * @returns Token balances with USD values, loading state, and refetch function
 * 
 * @example
 * const { balances, loading, refetchBalances } = useTokenBalances(tokens, address);
 */
export const useTokenBalances = (
  tokens: WChainToken[],
  walletAddress: string | null
): UseTokenBalancesReturn => {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get price data
  const { data: wcoMarketData } = useWCOMarketData();
  const { wcoPrice, wavePrice } = useWChainPriceAPI();
  const { og88Price } = useOG88Price();

  const fetchBalances = useCallback(async () => {
    if (!walletAddress || tokens.length === 0) {
      setBalances([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Find a working RPC endpoint
      const workingRPC = await findWorkingRPC();
      if (!workingRPC) {
        throw new Error('No working W-Chain RPC endpoints available. Please try again later.');
      }

      const provider = new ethers.JsonRpcProvider(workingRPC);
      const tokenBalances: TokenBalance[] = [];

      // Limit to top tokens by holders to avoid overwhelming RPC
      const topTokens = tokens
        .filter(token => token.type === 'ERC-20' && token.holders_count && token.holders_count > 5)
        .sort((a, b) => (b.holders_count || 0) - (a.holders_count || 0))
        .slice(0, 20); // Only check top 20 tokens

      console.log(`Checking balances for ${topTokens.length} tokens using RPC: ${workingRPC}`);

      // Process tokens sequentially with delays to avoid overwhelming RPC
      for (let i = 0; i < topTokens.length; i++) {
        const token = topTokens[i];
        
        if (i > 0 && i % 5 === 0) {
          // Add longer delay every 5 requests
          await delay(2000);
        } else if (i > 0) {
          // Small delay between requests
          await delay(200);
        }

        const result = await retryWithBackoff(async () => {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const balance = await contract.balanceOf(walletAddress);
          
          // Only include tokens with non-zero balances
          if (balance > 0) {
            const decimals = parseInt(token.decimals) || 18;
            const formattedBalance = ethers.formatUnits(balance, decimals);
            const balanceInEth = parseFloat(formattedBalance);

            console.log(`✅ Found balance for ${token.symbol}: ${formattedBalance}`);

            // Calculate USD value using appropriate price feed
            let usdValue: number | undefined;
            
            // Check token type for specific price feeds
            const isWCO = token.symbol?.toUpperCase() === 'WCO' || 
                         token.name?.toLowerCase().includes('w coin') ||
                         token.name?.toLowerCase().includes('wadzcoin');
            const isWAVE = token.symbol?.toUpperCase() === 'WAVE' ||
                          token.name?.toLowerCase().includes('wave');
            const isOG88 = token.address.toLowerCase() === '0xd1841fc048b488d92fdf73624a2128d10a847e88';

            if (isOG88 && og88Price?.price) {
              usdValue = balanceInEth * og88Price.price;
            } else if (isWCO && wcoPrice?.price) {
              usdValue = balanceInEth * wcoPrice.price;
            } else if (isWCO && wcoMarketData?.current_price) {
              usdValue = balanceInEth * wcoMarketData.current_price;
            } else if (isWAVE && wavePrice?.price) {
              usdValue = balanceInEth * wavePrice.price;
            } else if (token.exchange_rate) {
              usdValue = balanceInEth * parseFloat(token.exchange_rate);
            }

            return {
              token,
              balance: balance.toString(),
              formattedBalance,
              balanceInEth,
              usdValue
            };
          }
          return null;
        });

        if (result) {
          tokenBalances.push(result);
        }
      }
      
      console.log(`Total tokens with balances found: ${tokenBalances.length}`);
      setBalances(tokenBalances);
    } catch (err) {
      console.error('Error fetching token balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  }, [tokens, walletAddress]);

  const refetchBalances = useCallback(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    balances,
    loading,
    error,
    refetchBalances
  };
};