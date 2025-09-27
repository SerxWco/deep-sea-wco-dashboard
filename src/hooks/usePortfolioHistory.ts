import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PortfolioSnapshot {
  id: string;
  wallet_address: string;
  snapshot_date: string;
  snapshot_time: string;
  total_value_usd: number;
  token_holdings: any;
  created_at: string;
}

interface UsePortfolioHistoryReturn {
  snapshots: PortfolioSnapshot[];
  loading: boolean;
  error: string | null;
  latestSnapshot: PortfolioSnapshot | null;
  createSnapshot: (walletAddress: string, totalValue: number, tokenHoldings: any[]) => Promise<void>;
}

export const usePortfolioHistory = (walletAddress: string | null): UsePortfolioHistoryReturn => {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('snapshot_date', { ascending: false })
        .limit(90); // Last 90 days

      if (fetchError) throw fetchError;

      const formattedData = (data || []).map(snapshot => ({
        ...snapshot,
        token_holdings: Array.isArray(snapshot.token_holdings) 
          ? snapshot.token_holdings 
          : snapshot.token_holdings ? [snapshot.token_holdings] : []
      }));
      setSnapshots(formattedData);
    } catch (err) {
      console.error('Error fetching portfolio history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio history');
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async (walletAddress: string, totalValue: number, tokenHoldings: any[]) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if snapshot already exists for today
      const { data: existing } = await supabase
        .from('portfolio_snapshots')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('snapshot_date', today)
        .maybeSingle();

      if (existing) {
        // Update existing snapshot
        const { error: updateError } = await supabase
          .from('portfolio_snapshots')
          .update({
            total_value_usd: totalValue,
            token_holdings: tokenHoldings,
            snapshot_time: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new snapshot
        const { error: insertError } = await supabase
          .from('portfolio_snapshots')
          .insert({
            wallet_address: walletAddress,
            snapshot_date: today,
            total_value_usd: totalValue,
            token_holdings: tokenHoldings
          });

        if (insertError) throw insertError;
      }

      // Refresh snapshots
      fetchSnapshots();
    } catch (err) {
      console.error('Error creating portfolio snapshot:', err);
      setError(err instanceof Error ? err.message : 'Failed to create portfolio snapshot');
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [walletAddress]);

  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  return {
    snapshots,
    loading,
    error,
    latestSnapshot,
    createSnapshot
  };
};