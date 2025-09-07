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

const WCO_CONTRACT_ADDRESS = '0x4CCF0bb7c6c5A80168E8c978016B7CD1F92F1F62';
const WCO_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

export const useWalletConnection = (): UseWalletConnectionReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getWalletBalance = async (address: string, provider: ethers.BrowserProvider): Promise<{ balance: string; wcoBalance: string }> => {
    try {
      // Get ETH balance
      const ethBalance = await provider.getBalance(address);
      const balance = ethers.formatEther(ethBalance);

      // Get WCO balance
      const wcoContract = new ethers.Contract(WCO_CONTRACT_ADDRESS, WCO_ABI, provider);
      const wcoBalanceRaw = await wcoContract.balanceOf(address);
      const decimals = await wcoContract.decimals();
      const wcoBalance = ethers.formatUnits(wcoBalanceRaw, decimals);

      return { balance, wcoBalance };
    } catch (err) {
      console.error('Error fetching balances:', err);
      return { balance: '0', wcoBalance: '0' };
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
        description: `Successfully connected to ${walletType === 'metamask' ? 'MetaMask' : 'Rabby'}`
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
            const provider = new ethers.BrowserProvider(window.ethereum);
            const address = accounts[0];
            const { balance, wcoBalance } = await getWalletBalance(address, provider);
            
            setWalletInfo({ address, balance, wcoBalance });
            setIsConnected(true);
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