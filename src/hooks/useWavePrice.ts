import { useState, useEffect, useCallback } from 'react';

interface WavePriceData {
  price: number;
  volume24h: number;
  change24h: number;
  lastUpdated: string;
}

interface UseWavePriceReturn {
  priceData: WavePriceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useWavePrice = (): UseWavePriceReturn => {
  const [priceData, setPriceData] = useState<WavePriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWavePrice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('https://wave.w-chain.com/api/wave-price');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Wave price: ${response.status}`);
      }
      
      const data = await response.json();
      setPriceData({
        price: data.price || 0,
        volume24h: data.volume24h || 0,
        change24h: data.change24h || 0,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error fetching Wave price:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Wave price');
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchWavePrice();
  }, [fetchWavePrice]);

  useEffect(() => {
    fetchWavePrice();
  }, [fetchWavePrice]);

  return {
    priceData,
    loading,
    error,
    refetch,
  };
};