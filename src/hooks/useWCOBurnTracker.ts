import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BurnTransaction {
  hash: string;
  value: string;
  timestamp: string;
  from: string;
}

interface BurnData {
  totalBurnt: number;
  burnt24h: number;
  change24h: number;
  lastUpdated: string;
}

export const useWCOBurnTracker = () => {
  const [data, setData] = useState<BurnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BURN_ADDRESS = '0x0000000000000000000000000000000000000000';
  const CACHE_KEY = 'wco_burn_data';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchBurnData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      console.log('Fetching burn address balance...');
      
      // Fetch burn address balance directly
      const { data: balanceResult, error: balanceError } = await supabase.functions.invoke('wchain-address-proxy', {
        body: {
          address: BURN_ADDRESS
        }
      });

      if (balanceError) {
        throw new Error(`Failed to fetch burn address balance: ${balanceError.message}`);
      }
      const totalBurnt = parseFloat(balanceResult.coin_balance || '0') / 1e18; // Convert from Wei to WCO

      // Fetch recent transactions to burn address for 24h tracking
      console.log('Fetching recent burn transactions...');
      const { data: txResult, error: txError } = await supabase.functions.invoke('wchain-address-proxy', {
        body: {
          address: BURN_ADDRESS,
          endpoint: 'transactions',
          params: { filter: 'to' }
        }
      });

      let burnt24h = 0;
      let burnt24h48h = 0; // Previous 24h for comparison

      if (!txError && txResult) {
        const transactions = txResult.items || [];

        // Calculate 24h burnt and previous 24h for comparison
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);

        transactions.forEach((tx: BurnTransaction) => {
          const value = parseFloat(tx.value) / 1e18; // Convert from Wei to WCO
          const txTime = new Date(tx.timestamp).getTime();
          
          if (txTime >= twentyFourHoursAgo) {
            burnt24h += value;
          } else if (txTime >= fortyEightHoursAgo) {
            burnt24h48h += value;
          }
        });
      }

      // Calculate 24h change percentage
      const change24h = burnt24h48h > 0 
        ? ((burnt24h - burnt24h48h) / burnt24h48h) * 100 
        : 0;

      const burnData: BurnData = {
        totalBurnt,
        burnt24h,
        change24h,
        lastUpdated: new Date().toISOString()
      };

      // Cache the data
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: burnData,
        timestamp: Date.now()
      }));

      setData(burnData);
      console.log(`Burn data updated: ${totalBurnt.toFixed(4)} WCO total, ${burnt24h.toFixed(4)} WCO in 24h`);
      
    } catch (err) {
      console.error('Error fetching burn data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch burn data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBurnData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchBurnData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchBurnData };
};