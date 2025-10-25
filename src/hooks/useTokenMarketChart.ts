import { useQuery } from '@tanstack/react-query';

interface MarketChartDataPoint {
  timestamp: number;
  date: string;
  price: number;
}

interface MarketChartData {
  token: string;
  days: number;
  prices: MarketChartDataPoint[];
}

const COINGECKO_COIN_IDS: Record<string, string> = {
  WCO: 'wadzcoin',
  WAVE: 'w-chain',
  OG88: 'og88-token'
};

export const useTokenMarketChart = (tokenSymbol: string, days: number = 30) => {
  return useQuery({
    queryKey: ['token-market-chart', tokenSymbol, days],
    queryFn: async () => {
      const coinId = COINGECKO_COIN_IDS[tokenSymbol.toUpperCase()];
      if (!coinId) {
        throw new Error(`Unknown token: ${tokenSymbol}`);
      }

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        token: tokenSymbol.toUpperCase(),
        days,
        prices: data.prices.map(([timestamp, price]: [number, number]) => ({
          timestamp,
          date: new Date(timestamp).toISOString().split('T')[0],
          price
        }))
      } as MarketChartData;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    enabled: !!tokenSymbol
  });
};
