import { useQuery } from '@tanstack/react-query';

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
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['wchainPrices'],
    queryFn: async () => {
      try {
        const [wcoResponse, waveResponse] = await Promise.allSettled([
          fetch('https://oracle.w-chain.com/api/price/wco'),
          fetch('https://oracle.w-chain.com/api/price/wave')
        ]);

        let wcoPrice: WChainPriceData | null = null;
        let wavePrice: WChainPriceData | null = null;

        if (wcoResponse.status === 'fulfilled' && wcoResponse.value.ok) {
          wcoPrice = await wcoResponse.value.json();
        }

        if (waveResponse.status === 'fulfilled' && waveResponse.value.ok) {
          wavePrice = await waveResponse.value.json();
        }

        return { wcoPrice, wavePrice };
      } catch (err) {
        console.error('Error fetching W-Chain prices:', err);
        throw err;
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60000, // Refetch every minute
  });

  const error = queryError ? String(queryError) : null;

  return { 
    wcoPrice: data?.wcoPrice || null, 
    wavePrice: data?.wavePrice || null, 
    loading, 
    error 
  };
};