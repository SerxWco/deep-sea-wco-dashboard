import { useState, useEffect } from 'react';

interface TransactionDetails {
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: string;
  from: string;
  to: string;
  value: string;
  valueUsd: string;
  gasLimit: string;
  gasUsed: string;
  gasPrice: string;
  status: string;
  method: string;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  internalTransactions: Array<{
    from: string;
    to: string;
    value: string;
    type: string;
  }>;
}

interface UseTransactionDetailsReturn {
  transactionDetails: TransactionDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - transactions don't change
const cache = new Map<string, { data: TransactionDetails; timestamp: number }>();

export function useTransactionDetails(hash: string | null): UseTransactionDetailsReturn {
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactionDetails = async () => {
    if (!hash) return;

    // Check cache first
    const cached = cache.get(hash);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setTransactionDetails(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://scan.w-chain.com/api/v2/transactions/${hash}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }

      const data = await response.json();

      const details: TransactionDetails = {
        hash: data.hash,
        blockNumber: data.block_number || 0,
        blockHash: data.block_hash || '',
        timestamp: data.timestamp,
        from: data.from?.hash || '',
        to: data.to?.hash || '',
        value: data.value || '0',
        valueUsd: data.exchange_rate ? 
          (parseFloat(data.value || '0') * parseFloat(data.exchange_rate)).toFixed(2) : '0',
        gasLimit: data.gas_limit || '0',
        gasUsed: data.gas_used || '0',
        gasPrice: data.gas_price || '0',
        status: data.status || 'unknown',
        method: data.method || 'Transfer',
        logs: (data.logs || []).map((log: any) => ({
          address: log.address?.hash || '',
          topics: log.topics || [],
          data: log.data || ''
        })),
        internalTransactions: (data.internal_transactions || []).map((tx: any) => ({
          from: tx.from?.hash || '',
          to: tx.to?.hash || '',
          value: tx.value || '0',
          type: tx.type || 'call'
        }))
      };

      // Cache the result
      cache.set(hash, { data: details, timestamp: Date.now() });
      setTransactionDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction details');
      setTransactionDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hash) {
      fetchTransactionDetails();
    } else {
      setTransactionDetails(null);
      setError(null);
    }
  }, [hash]);

  return {
    transactionDetails,
    loading,
    error,
    refetch: fetchTransactionDetails
  };
}