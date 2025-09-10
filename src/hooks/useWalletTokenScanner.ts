import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { WChainToken, TokenBalance } from '@/types/token';

interface UseWalletTokenScannerReturn {
  allBalances: TokenBalance[];
  loading: boolean;
  error: string | null;
  scanWallet: () => void;
  addCustomToken: (contractAddress: string) => Promise<void>;
}

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

const W_CHAIN_RPC = 'https://mainnet-rpc.w-chain.com';

// Common token addresses to check (including known tokens like OG88)
const COMMON_TOKENS = [
  '0x81d29c0DcD64fAC05C4A394D455cbD79D210C200', // Example - add more known token addresses
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

export const useWalletTokenScanner = (
  walletAddress: string | null,
  knownTokens: WChainToken[] = []
): UseWalletTokenScannerReturn => {
  const [allBalances, setAllBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTokens, setCustomTokens] = useState<string[]>([]);

  const scanTokenContract = async (
    provider: ethers.JsonRpcProvider,
    contractAddress: string,
    walletAddress: string
  ): Promise<TokenBalance | null> => {
    try {
      const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
      
      // Check if it's a valid ERC-20 contract
      const [balance, decimals, symbol, name] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals().catch(() => 18), // Default to 18 if not available
        contract.symbol().catch(() => 'UNKNOWN'),
        contract.name().catch(() => 'Unknown Token')
      ]);

      if (balance > 0) {
        const formattedBalance = ethers.formatUnits(balance, decimals);
        const balanceInEth = parseFloat(formattedBalance);

        // Create a token object for unknown tokens
        const token: WChainToken = {
          address: contractAddress.toLowerCase(),
          name: name || 'Unknown Token',
          symbol: symbol || 'UNKNOWN',
          decimals: decimals.toString(),
          type: 'ERC-20',
          holders_count: undefined,
          icon_url: undefined
        };

        return {
          token,
          balance: balance.toString(),
          formattedBalance,
          balanceInEth,
          usdValue: undefined
        };
      }
    } catch (error) {
      console.warn(`Failed to scan token ${contractAddress}:`, error);
    }
    return null;
  };

  const scanWallet = useCallback(async () => {
    if (!walletAddress) {
      setAllBalances([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.JsonRpcProvider(W_CHAIN_RPC);
      const tokenBalances: TokenBalance[] = [];

      // 1. Check known W-Chain tokens first
      const topKnownTokens = knownTokens
        .filter(token => token.type === 'ERC-20')
        .sort((a, b) => (b.holders_count || 0) - (a.holders_count || 0))
        .slice(0, 50); // Check top 50 known tokens

      for (let i = 0; i < topKnownTokens.length; i++) {
        const token = topKnownTokens[i];
        
        if (i > 0 && i % 10 === 0) {
          await delay(1000);
        } else if (i > 0) {
          await delay(100);
        }

        const result = await retryWithBackoff(async () => {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const balance = await contract.balanceOf(walletAddress);
          
          if (balance > 0) {
            const decimals = parseInt(token.decimals) || 18;
            const formattedBalance = ethers.formatUnits(balance, decimals);
            const balanceInEth = parseFloat(formattedBalance);

            return {
              token,
              balance: balance.toString(),
              formattedBalance,
              balanceInEth,
              usdValue: undefined
            };
          }
          return null;
        });

        if (result) {
          tokenBalances.push(result);
        }
      }

      // 2. Check common tokens that might not be in W-Chain API
      const unknownTokenAddresses = [...COMMON_TOKENS, ...customTokens];
      
      for (let i = 0; i < unknownTokenAddresses.length; i++) {
        const address = unknownTokenAddresses[i];
        
        // Skip if we already checked this address
        if (tokenBalances.some(balance => 
          balance.token.address.toLowerCase() === address.toLowerCase()
        )) {
          continue;
        }

        await delay(200);

        const result = await retryWithBackoff(() => 
          scanTokenContract(provider, address, walletAddress)
        );

        if (result) {
          tokenBalances.push(result);
        }
      }

      // 3. Get WCO native balance
      try {
        const wcoBalance = await provider.getBalance(walletAddress);
        if (wcoBalance > 0) {
          const wcoToken: WChainToken = {
            address: '0x0000000000000000000000000000000000000000',
            name: 'W Chain Coin',
            symbol: 'WCO',
            decimals: '18',
            type: 'Native',
            holders_count: undefined,
            icon_url: undefined
          };

          tokenBalances.unshift({
            token: wcoToken,
            balance: wcoBalance.toString(),
            formattedBalance: ethers.formatEther(wcoBalance),
            balanceInEth: parseFloat(ethers.formatEther(wcoBalance)),
            usdValue: undefined
          });
        }
      } catch (error) {
        console.warn('Failed to get WCO balance:', error);
      }

      // Sort by balance value (highest first)
      tokenBalances.sort((a, b) => b.balanceInEth - a.balanceInEth);
      
      setAllBalances(tokenBalances);
    } catch (err) {
      console.error('Error scanning wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan wallet');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, knownTokens, customTokens]);

  const addCustomToken = useCallback(async (contractAddress: string) => {
    if (!walletAddress) return;

    try {
      // Validate the contract address
      if (!ethers.isAddress(contractAddress)) {
        throw new Error('Invalid contract address');
      }

      const normalizedAddress = contractAddress.toLowerCase();
      
      // Check if already added
      if (customTokens.includes(normalizedAddress) || 
          allBalances.some(balance => balance.token.address === normalizedAddress)) {
        throw new Error('Token already added');
      }

      // Test if it's a valid ERC-20 contract
      const provider = new ethers.JsonRpcProvider(W_CHAIN_RPC);
      const result = await scanTokenContract(provider, contractAddress, walletAddress);
      
      if (result) {
        setCustomTokens(prev => [...prev, normalizedAddress]);
        setAllBalances(prev => [...prev, result].sort((a, b) => b.balanceInEth - a.balanceInEth));
      } else {
        throw new Error('No balance found for this token');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add custom token');
    }
  }, [walletAddress, customTokens, allBalances]);

  useEffect(() => {
    scanWallet();
  }, [scanWallet]);

  return {
    allBalances,
    loading,
    error,
    scanWallet,
    addCustomToken
  };
};