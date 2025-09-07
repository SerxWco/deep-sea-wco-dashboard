import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { WChainToken, TokenBalance } from '@/types/token';

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

export const useTokenBalances = (
  tokens: WChainToken[],
  walletAddress: string | null
): UseTokenBalancesReturn => {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress || tokens.length === 0) {
      setBalances([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.JsonRpcProvider(W_CHAIN_RPC);
      const tokenBalances: TokenBalance[] = [];

      // Batch balance calls for efficiency
      const balancePromises = tokens.map(async (token) => {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const balance = await contract.balanceOf(walletAddress);
          
          // Only include tokens with non-zero balances
          if (balance > 0) {
            const decimals = parseInt(token.decimals) || 18;
            const formattedBalance = ethers.formatUnits(balance, decimals);
            const balanceInEth = parseFloat(formattedBalance);

            return {
              token,
              balance: balance.toString(),
              formattedBalance,
              balanceInEth,
              usdValue: undefined // TODO: Add price data integration
            };
          }
          return null;
        } catch (error) {
          console.warn(`Failed to fetch balance for ${token.symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(balancePromises);
      const validBalances = results.filter(balance => balance !== null) as TokenBalance[];
      
      setBalances(validBalances);
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