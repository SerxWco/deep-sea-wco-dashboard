import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';

export interface WalletInfo {
  address: string;
  balance: string;
  wcoBalance: string;
}

export interface UseWalletConnectionReturn {
  isConnected: boolean;
  walletInfo: WalletInfo | null;
  isConnecting: boolean;
  connectWallet: (walletType: 'metamask' | 'rabby') => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
}

// W Chain network configuration
const W_CHAIN_CONFIG = {
  chainId: '0x29F05', // 171717 in hex
  chainName: 'W Chain',
  nativeCurrency: {
    name: 'WCO',
    symbol: 'WCO',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.w-chain.com'],
  blockExplorerUrls: ['https://scan.w-chain.com/'],
};

export const useWalletConnection = (): UseWalletConnectionReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getWalletBalance = async (address: string, provider: ethers.BrowserProvider): Promise<{ balance: string; wcoBalance: string }> => {
    try {
      // Get WCO balance (native token on W Chain)
      const wcoBalance = await provider.getBalance(address);
      const balance = ethers.formatEther(wcoBalance);

      return { balance, wcoBalance: balance };
    } catch (err) {
      console.error('Error fetching WCO balance:', err);
      return { balance: '0', wcoBalance: '0' };
    }
  };

  const switchToWChain = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: W_CHAIN_CONFIG.chainId }],
      });
    } catch (switchError: any) {
      // Chain not added to wallet, try to add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [W_CHAIN_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  };

  const connectWallet = useCallback(async (walletType: 'metamask' | 'rabby') => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask or Rabby wallet.');
      }

      // Check for specific wallet
      if (walletType === 'rabby' && !window.ethereum.isRabby) {
        if (window.ethereum.isMetaMask) {
          throw new Error('Rabby wallet not detected. Please install Rabby or select MetaMask.');
        }
      }
      
      if (walletType === 'metamask' && !window.ethereum.isMetaMask && window.ethereum.isRabby) {
        throw new Error('MetaMask not detected. Please install MetaMask or select Rabby.');
      }

      // Switch to W Chain first
      await switchToWChain();
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      const { balance, wcoBalance } = await getWalletBalance(address, provider);

      setWalletInfo({
        address,
        balance,
        wcoBalance
      });
      
      setIsConnected(true);
      toast({
        title: 'Wallet Connected',
        description: `Successfully connected to ${walletType === 'metamask' ? 'MetaMask' : 'Rabby'} on W Chain`
      });

    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Connection Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setWalletInfo(null);
    setError(null);
    toast({
      title: 'Wallet Disconnected',
      description: 'Successfully disconnected from wallet'
    });
  }, [toast]);

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts.length > 0) {
            // Check if we're on W Chain
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId === W_CHAIN_CONFIG.chainId) {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const address = accounts[0];
              const { balance, wcoBalance } = await getWalletBalance(address, provider);
              
              setWalletInfo({ address, balance, wcoBalance });
              setIsConnected(true);
            }
          }
        } catch (err) {
          console.error('Error checking wallet connection:', err);
        }
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (isConnected && accounts[0] !== walletInfo?.address) {
          // Account changed, reconnect
          window.location.reload();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, [isConnected, walletInfo?.address, disconnectWallet]);

  return {
    isConnected,
    walletInfo,
    isConnecting,
    connectWallet,
    disconnectWallet,
    error
  };
};

declare global {
  interface Window {
    ethereum: any;
  }
}