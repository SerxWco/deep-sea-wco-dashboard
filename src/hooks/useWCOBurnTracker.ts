import { useState, useEffect } from 'react';

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

      console.log('Fetching burn transactions...');
      
      // Fetch transactions to burn address
      const response = await fetch(
        `https://scan.w-chain.com/api/v2/addresses/${BURN_ADDRESS}/transactions?filter=to`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch burn data: ${response.status}`);
      }

      const result = await response.json();
      const transactions = result.items || [];

      // Calculate total burnt and 24h burnt
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);

      let totalBurnt = 0;
      let burnt24h = 0;
      let burnt24h48h = 0; // Previous 24h for comparison

      transactions.forEach((tx: BurnTransaction) => {
        const value = parseFloat(tx.value) / 1e18; // Convert from Wei to WCO
        const txTime = new Date(tx.timestamp).getTime();
        
        totalBurnt += value;
        
        if (txTime >= twentyFourHoursAgo) {
          burnt24h += value;
        } else if (txTime >= fortyEightHoursAgo) {
          burnt24h48h += value;
        }
      });

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
      console.log(`Burn data updated: ${totalBurnt.toFixed(0)} WCO total, ${burnt24h.toFixed(0)} WCO in 24h`);
      
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