import { useState, useEffect } from 'react';

interface OG88PriceData {
  price: number;
  timestamp?: number;
}

interface UseOG88PriceReturn {
  og88Price: OG88PriceData | null;
  loading: boolean;
  error: string | null;
}

export const useOG88Price = (): UseOG88PriceReturn => {
  const [og88Price, setOG88Price] = useState<OG88PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOG88Price = async () => {
    try {
      setError(null);
      console.log('Fetching OG88 price from Supabase proxy...');
      
      // Use only Supabase Edge Function proxy
      const response = await fetch('https://lslysfupujprybfhkrdu.supabase.co/functions/v1/og88-price-proxy');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('OG88 proxy response:', data);
      
      // Handle different possible response formats
      let price: number;
      if (typeof data === 'number') {
        price = data;
      } else if (data.price_usd && typeof data.price_usd === 'number') {
        // Handle the actual API format: {"price_usd": 0.06533809102754166}
        price = data.price_usd;
      } else if (data.price && typeof data.price === 'number') {
        price = data.price;
      } else if (data.value && typeof data.value === 'number') {
        price = data.value;
      } else {
        console.error('Unexpected OG88 response format:', data);
        throw new Error('Invalid price data format');
      }

      console.log('Parsed OG88 price:', price);
      setOG88Price({
        price,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Failed to fetch OG88 price:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch OG88 price');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOG88Price();
    
    // Refresh price every minute
    const interval = setInterval(fetchOG88Price, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    og88Price,
    loading,
    error
  };
};