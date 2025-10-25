import { useQuery } from '@tanstack/react-query';

export interface TrendingCoin {
  name: string;
  symbol: string;
  rank: number;
  price_btc: number;
  thumb: string;
}

export interface TrendingCoinsData {
  trending: TrendingCoin[];
}

export const useTrendingCoins = () => {
  return useQuery({
    queryKey: ['trending-coins'],
    queryFn: async () => {
      const response = await fetch('https://api.coingecko.com/api/v3/search/trending');

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        trending: data.coins.slice(0, 7).map((item: any) => ({
          name: item.item.name,
          symbol: item.item.symbol,
          rank: item.item.market_cap_rank,
          price_btc: item.item.price_btc,
          thumb: item.item.thumb
        }))
      } as TrendingCoinsData;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};
