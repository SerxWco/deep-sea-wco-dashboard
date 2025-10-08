import { useState, useEffect } from 'react';
import axios from 'axios';
import { WCHAIN_SCAN_API, WSWAP_LPS, REFRESH_INTERVAL } from '@/config/wswap';
import { LPReserves, WChainReservesResponse } from '@/types/wswap';

export const useWSwapReserves = () => {
  const [reserves, setReserves] = useState<Map<string, LPReserves>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReserves = async () => {
    try {
      const reservePromises = WSWAP_LPS.map(async (lp) => {
        try {
          const response = await axios.get<WChainReservesResponse>(
            `${WCHAIN_SCAN_API}?module=pair&action=getReserves&address=${lp.address}`
          );
          
          if (response.data?.result) {
            return {
              address: lp.address,
              reserve0: Number(response.data.result.reserve0),
              reserve1: Number(response.data.result.reserve1),
              lastUpdate: Date.now()
            };
          }
          return null;
        } catch (err) {
          console.error(`Error fetching reserves for ${lp.address}:`, err);
          return null;
        }
      });

      const results = await Promise.all(reservePromises);
      const newReserves = new Map<string, LPReserves>();
      
      results.forEach((reserve) => {
        if (reserve) {
          newReserves.set(reserve.address, reserve);
        }
      });

      setReserves(newReserves);
      setError(null);
    } catch (err) {
      setError('Failed to fetch LP reserves');
      console.error('Error fetching reserves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReserves();
    const interval = setInterval(fetchReserves, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const getPrice = (lpAddress: string, tokenSymbol: string): number | null => {
    const reserve = reserves.get(lpAddress);
    if (!reserve || reserve.reserve0 === 0 || reserve.reserve1 === 0) {
      return null;
    }

    // Simple price calculation: token1 per token0
    // If selling WCO (tokenSymbol === "WCO"), price = reserve1/reserve0
    // If buying WCO (tokenSymbol !== "WCO"), price = reserve0/reserve1
    return tokenSymbol === "WCO" 
      ? reserve.reserve1 / reserve.reserve0 
      : reserve.reserve0 / reserve.reserve1;
  };

  return {
    reserves,
    loading,
    error,
    getPrice,
    refetch: fetchReserves
  };
};
