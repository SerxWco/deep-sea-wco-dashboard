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

const W_CHAIN_RPC = 'https://mainnet-rpc.w-chain.com';

// Alternative RPC endpoints to try
const BACKUP_RPCS = [
  'https://rpc.w-chain.com',
  'https://mainnet.w-chain.com',
  'https://rpc-mainnet.w-chain.com',
  'https://node.w-chain.com',
];

// Function to find working RPC
const findWorkingRPC = async (): Promise<string | null> => {
  const allEndpoints = [W_CHAIN_RPC, ...BACKUP_RPCS];
  
  for (const rpcUrl of allEndpoints) {
    try {
      console.log(`Testing RPC endpoint: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      await provider.getBlockNumber();
      console.log(`✅ Working RPC found: ${rpcUrl}`);
      return rpcUrl;
    } catch (error) {
      console.log(`❌ RPC failed: ${rpcUrl}`, error);
      continue;
    }
  }
  
  console.error('No working RPC endpoints found');
  return null;
};

// Add delay function to avoid overwhelming RPC
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
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
      await delay(baseDelay * Math.pow(2, i));
    }
  }
  return null;
};

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