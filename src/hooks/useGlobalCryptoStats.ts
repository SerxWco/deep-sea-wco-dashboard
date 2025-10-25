import { useQuery } from '@tanstack/react-query';

export interface GlobalCryptoStats {
  total_market_cap_usd: number;
  total_volume_24h_usd: number;
  market_cap_change_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  active_cryptocurrencies: number;
}

export const useGlobalCryptoStats = () => {
  return useQuery({
    queryKey: ['global-crypto-stats'],
    queryFn: async () => {
      const response = await fetch('https://api.coingecko.com/api/v3/global');

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        total_market_cap_usd: data.data.total_market_cap.usd,
        total_volume_24h_usd: data.data.total_volume.usd,
        market_cap_change_24h: data.data.market_cap_change_percentage_24h_usd,
        btc_dominance: data.data.market_cap_percentage.btc,
        eth_dominance: data.data.market_cap_percentage.eth,
        active_cryptocurrencies: data.data.active_cryptocurrencies
      } as GlobalCryptoStats;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
