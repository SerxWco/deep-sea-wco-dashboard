import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWChainPriceAPI } from './useWChainPriceAPI';
import { useWCOSupplyInfo } from './useWCOSupplyInfo';

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
  const { wcoPrice, loading: wchainLoading } = useWChainPriceAPI();
  const { data: supplyData, loading: supplyLoading } = useWCOSupplyInfo();

  const fetchCoinGeckoData = async () => {
    try {
      setError(null);
      
      // Only fetch volume data from CoinGecko
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

      const marketData = result[0];
      
      return {
        total_volume: marketData.total_volume || 0,
        price_change_24h: marketData.price_change_24h || 0,
        price_change_percentage_24h: marketData.price_change_percentage_24h || 0,
        ath: marketData.ath || 0,
      };
    } catch (err) {
      console.error('Error fetching CoinGecko data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch CoinGecko data');
      return {
        total_volume: 0,
        price_change_24h: 0,
        price_change_percentage_24h: 0,
        ath: 0,
      };
    }
  };

  // Fetch CoinGecko data once on mount
  useEffect(() => {
    fetchCoinGeckoData().then(coinGeckoData => {
      setData(prev => prev ? { ...prev, ...coinGeckoData } : null);
    });
    
    // Refresh CoinGecko data every 5 minutes
    const interval = setInterval(() => {
      fetchCoinGeckoData().then(coinGeckoData => {
        setData(prev => prev ? { ...prev, ...coinGeckoData } : null);
      });
    }, 300000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate market cap whenever W-Chain data changes
  useEffect(() => {
    if (wchainLoading || supplyLoading) {
      setLoading(true);
      return;
    }

    if (!wcoPrice?.price || !supplyData?.summary?.circulating_supply_wco) {
      setLoading(false);
      return;
    }

    const currentPrice = wcoPrice.price;
    const circulatingSupply = parseFloat(supplyData.summary.circulating_supply_wco);
    const calculatedMarketCap = currentPrice * circulatingSupply;

    console.log('Market cap calculation:', {
      price: currentPrice,
      supply: circulatingSupply,
      marketCap: calculatedMarketCap
    });

    setData(prev => ({
      current_price: currentPrice,
      market_cap: calculatedMarketCap,
      total_volume: prev?.total_volume || 0,
      circulating_supply: circulatingSupply,
      price_change_24h: prev?.price_change_24h || 0,
      price_change_percentage_24h: prev?.price_change_percentage_24h || 0,
      ath: prev?.ath || 0,
    }));

    setLoading(false);
  }, [wcoPrice, supplyData, wchainLoading, supplyLoading]);

  return { data, loading, error };
};