import { useState, useEffect } from 'react';

interface WCOSupplyData {
  timestamp: string;
  cache: {
    ttl_seconds: number;
    note: string;
  };
  summary: {
    initial_supply_wco: string;
    locked_supply_wco: string;
    burned_supply_wco: string;
    circulating_supply_wco: string;
  };
  raw: {
    units: {
      native: string;
      base: string;
      wei_per_wco: string;
    };
    initial_supply_wei: string;
    locked_supply_wei: string;
    burned_supply_wei: string;
    circulating_supply_wei: string;
    locked_supply_breakdown: Array<{
      address: string;
      label: string;
      balance_wei: string;
      balance_wco: string;
    }>;
    burned_supply_breakdown: {
      address: string;
      label: string;
      balance_wei: string;
      balance_wco: string;
    };
  };
  methodology: {
    formula: string;
    data_sources: {
      rpc_provider: string;
      multicall3_contract: string;
    };
    address_labels: {
      validators_staking: string;
      vesting_contracts: {
        team: string;
        advisors: string;
      };
      burn_address: string;
    };
    verification: {
      how_to_verify: string;
    };
  };
}

interface UseWCOSupplyInfoReturn {
  data: WCOSupplyData | null;
  loading: boolean;
  error: string | null;
}

export const useWCOSupplyInfo = (): UseWCOSupplyInfoReturn => {
  const [data, setData] = useState<WCOSupplyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplyData = async () => {
    try {
      setError(null);
      const response = await fetch('https://oracle.w-chain.com/api/wco/supply-info');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const supplyData = await response.json();
      setData(supplyData);
    } catch (err) {
      console.error('Error fetching WCO supply data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch supply data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplyData();
    
    // Set up interval to refresh every 2 minutes (120 seconds) as per API cache TTL
    const interval = setInterval(fetchSupplyData, 120000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
};