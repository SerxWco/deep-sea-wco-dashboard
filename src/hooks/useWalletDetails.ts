import { useState, useEffect } from 'react';

interface WalletDetails {
  address: string;
  balance: string;
  balanceUsd: string;
  transactionCount: number;
  totalSent: string;
  totalReceived: string;
  tokens: Array<{
    name: string;
    symbol: string;
    balance: string;
    contractAddress: string;
    decimals: number;
  }>;
  recentTransactions: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    timestamp: string;
    blockNumber: number;
    status: string;
  }>;
}

interface UseWalletDetailsReturn {
  walletDetails: WalletDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const CACHE_DURATION = 60 * 1000; // 60 seconds
const cache = new Map<string, { data: WalletDetails; timestamp: number }>();

export function useWalletDetails(address: string | null): UseWalletDetailsReturn {
  const [walletDetails, setWalletDetails] = useState<WalletDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletDetails = async () => {
    if (!address) return;

    // Check cache first
    const cached = cache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setWalletDetails(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch basic wallet info
      const [balanceResponse, transactionsResponse, tokensResponse] = await Promise.all([
        fetch(`https://scan.w-chain.com/api/v2/addresses/${address}`),
        fetch(`https://scan.w-chain.com/api/v2/addresses/${address}/transactions?limit=20`),
        fetch(`https://scan.w-chain.com/api/v2/addresses/${address}/tokens?type=ERC-20`)
      ]);

      if (!balanceResponse.ok) {
        throw new Error('Failed to fetch wallet details');
      }

      const [balanceData, transactionsData, tokensData] = await Promise.all([
        balanceResponse.json(),
        transactionsResponse.ok ? transactionsResponse.json() : { items: [] },
        tokensResponse.ok ? tokensResponse.json() : { items: [] }
      ]);

      const details: WalletDetails = {
        address,
        balance: balanceData.coin_balance || '0',
        balanceUsd: balanceData.exchange_rate ? 
          (parseFloat(balanceData.coin_balance || '0') * parseFloat(balanceData.exchange_rate)).toFixed(2) : '0',
        transactionCount: balanceData.transactions_count || 0,
        totalSent: balanceData.sent_amount || '0',
        totalReceived: balanceData.received_amount || '0',
        tokens: (tokensData.items || []).map((token: any) => ({
          name: token.token?.name || 'Unknown',
          symbol: token.token?.symbol || 'UNK',
          balance: token.value || '0',
          contractAddress: token.token?.address || '',
          decimals: token.token?.decimals || 18
        })),
        recentTransactions: (transactionsData.items || []).map((tx: any) => ({
          hash: tx.hash,
          from: tx.from?.hash || '',
          to: tx.to?.hash || '',
          value: tx.value || '0',
          timestamp: tx.timestamp,
          blockNumber: tx.block_number || 0,
          status: tx.status || 'unknown'
        }))
      };

      // Cache the result
      cache.set(address, { data: details, timestamp: Date.now() });
      setWalletDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet details');
      setWalletDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchWalletDetails();
    } else {
      setWalletDetails(null);
      setError(null);
    }
  }, [address]);

  return {
    walletDetails,
    loading,
    error,
    refetch: fetchWalletDetails
  };
}