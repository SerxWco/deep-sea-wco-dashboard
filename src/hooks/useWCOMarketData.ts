import { useState, useEffect } from 'react';

interface WCOMarketData {
  current_price: number;
  market_cap: number;
  total_volume: number;
  circulating_supply: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  ath: number;
}

interface UseWCOMarketDataReturn {
  data: WCOMarketData | null;
  loading: boolean;
  error: string | null;
}

export const useWCOMarketData = (): UseWCOMarketDataReturn => {
  const [data, setData] = useState<WCOMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWCOData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // CoinGecko API endpoint for WadzCoin (WCO)
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=wadzcoin&order=market_cap_desc&per_page=1&page=1&sparkline=false'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.length === 0) {
        throw new Error('WCO data not found');
      }

      const wcoData = result[0];
      
      setData({
        current_price: wcoData.current_price || 0,
        market_cap: wcoData.market_cap || 0,
        total_volume: wcoData.total_volume || 0,
        circulating_supply: wcoData.circulating_supply || 0,
        price_change_24h: wcoData.price_change_24h || 0,
        price_change_percentage_24h: wcoData.price_change_percentage_24h || 0,
        ath: wcoData.ath || 0,
      });
    } catch (err) {
      console.error('Error fetching WCO data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch WCO data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWCOData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchWCOData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
};