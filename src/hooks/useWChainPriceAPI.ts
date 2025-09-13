import { useState, useEffect } from 'react';

interface WChainPriceData {
  price: number | null;
  asset: string;
  base_currency: string;
}

interface UseWChainPriceAPIReturn {
  wcoPrice: WChainPriceData | null;
  wavePrice: WChainPriceData | null;
  loading: boolean;
  error: string | null;
}

export const useWChainPriceAPI = (): UseWChainPriceAPIReturn => {
  const [wcoPrice, setWcoPrice] = useState<WChainPriceData | null>(null);
  const [wavePrice, setWavePrice] = useState<WChainPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      setError(null);
      
      // Fetch both WCO and WAVE prices in parallel
      const [wcoResponse, waveResponse] = await Promise.allSettled([
        fetch('https://oracle.w-chain.com/api/price/wco'),
        fetch('https://oracle.w-chain.com/api/price/wave')
      ]);

      // Handle WCO price
      if (wcoResponse.status === 'fulfilled' && wcoResponse.value.ok) {
        const wcoData = await wcoResponse.value.json();
        setWcoPrice(wcoData);
      } else {
        console.warn('Failed to fetch WCO price from W-Chain API');
        setWcoPrice(null);
      }

      // Handle WAVE price
      if (waveResponse.status === 'fulfilled' && waveResponse.value.ok) {
        const waveData = await waveResponse.value.json();
        setWavePrice(waveData);
      } else {
        console.warn('Failed to fetch WAVE price from W-Chain API');
        setWavePrice(null);
      }

    } catch (err) {
      console.error('Error fetching W-Chain prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    
    // Set up interval to refresh every 1 minute (60 seconds) as per API cache
    const interval = setInterval(fetchPrices, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return { wcoPrice, wavePrice, loading, error };
};