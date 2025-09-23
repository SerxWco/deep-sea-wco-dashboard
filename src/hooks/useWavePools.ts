import { useState, useEffect, useCallback } from 'react';

interface WavePool {
  id: string;
  token0: {
    address: string;
    symbol: string;
    name: string;
  };
  token1: {
    address: string;
    symbol: string;
    name: string;
  };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  price: string;
}

interface UseWavePoolsReturn {
  pools: WavePool[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getTokenPrice: (tokenAddress: string) => number | null;
}

export const useWavePools = (): UseWavePoolsReturn => {
  const [pools, setPools] = useState<WavePool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('https://wave.w-chain.com/api/pools');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Wave pools: ${response.status}`);
      }
      
      const data = await response.json();
      setPools(data.pools || []);
    } catch (err) {
      console.error('Error fetching Wave pools:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTokenPrice = useCallback((tokenAddress: string): number | null => {
    const pool = pools.find(p => 
      p.token0.address.toLowerCase() === tokenAddress.toLowerCase() ||
      p.token1.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    
    if (!pool) return null;
    
    try {
      return parseFloat(pool.price) || null;
    } catch {
      return null;
    }
  }, [pools]);

  const refetch = useCallback(() => {
    fetchPools();
  }, [fetchPools]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return {
    pools,
    loading,
    error,
    refetch,
    getTokenPrice,
  };
};