import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  createSnapshot: (walletAddress: string, totalValue: number, tokenHoldings: any[]) => void;
}

// Fetch snapshots with React Query
const fetchPortfolioSnapshots = async (walletAddress: string): Promise<PortfolioSnapshot[]> => {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('snapshot_date', { ascending: false })
    .limit(90); // Last 90 days

  if (error) throw error;

  return (data || []).map(snapshot => ({
    ...snapshot,
    token_holdings: Array.isArray(snapshot.token_holdings) 
      ? snapshot.token_holdings 
      : snapshot.token_holdings ? [snapshot.token_holdings] : []
  }));
};

export const usePortfolioHistory = (walletAddress: string | null): UsePortfolioHistoryReturn => {
  const queryClient = useQueryClient();

  // Use React Query for fetching snapshots with 5-minute cache
  const { data: snapshots = [], isLoading, error: queryError } = useQuery({
    queryKey: ['portfolioSnapshots', walletAddress],
    queryFn: () => fetchPortfolioSnapshots(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for creating/updating snapshots
  const snapshotMutation = useMutation({
    mutationFn: async ({ 
      walletAddress, 
      totalValue, 
      tokenHoldings 
    }: { 
      walletAddress: string; 
      totalValue: number; 
      tokenHoldings: any[] 
    }) => {
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
    },
    onSuccess: () => {
      // Invalidate and refetch snapshots
      queryClient.invalidateQueries({ queryKey: ['portfolioSnapshots', walletAddress] });
    },
  });

  const createSnapshot = useCallback(
    (walletAddress: string, totalValue: number, tokenHoldings: any[]) => {
      snapshotMutation.mutate({ walletAddress, totalValue, tokenHoldings });
    },
    [snapshotMutation]
  );

  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  return {
    snapshots,
    loading: isLoading,
    error: queryError ? (queryError as Error).message : null,
    latestSnapshot,
    createSnapshot
  };
};