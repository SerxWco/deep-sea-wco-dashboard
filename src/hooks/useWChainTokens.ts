import { useState, useEffect, useCallback } from 'react';
import { WChainToken, WChainTokensResponse, TokenListFilters } from '@/types/token';
import { supabase } from '@/integrations/supabase/client';

interface UseWChainTokensReturn {
  tokens: WChainToken[];
  loading: boolean;
  error: string | null;
  filters: TokenListFilters;
  setFilters: (filters: Partial<TokenListFilters>) => void;
  refreshTokens: () => void;
  filteredTokens: WChainToken[];
}

// Using Supabase Edge Functions proxy to bypass CORS

export const useWChainTokens = (): UseWChainTokensReturn => {
  const [tokens, setTokens] = useState<WChainToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TokenListFilters>({
    search: '',
    showOnlyOwned: false,
    sortBy: 'holders',
    sortOrder: 'desc'
  });

  const setFilters = useCallback((newFilters: Partial<TokenListFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all pages of tokens
      let allTokens: WChainToken[] = [];
      let nextPageParams = null;
      let page = 1;
      const maxPages = 10; // Limit to prevent infinite loops
      
      do {
        const params: any = {};
        if (nextPageParams) {
          Object.entries(nextPageParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              params[key] = String(value);
            }
          });
        }

        const { data, error } = await supabase.functions.invoke('wchain-tokens-proxy', {
          body: { params }
        });
        
        if (error) {
          throw new Error(`Failed to fetch tokens: ${error.message}`);
        }
      // Deduplicate tokens by address to avoid duplicates across pages
      const newTokens = data.items.filter(
        token => !allTokens.some(existing => 
          existing.address.toLowerCase() === token.address.toLowerCase()
        )
      );
      allTokens = [...allTokens, ...newTokens];
      nextPageParams = data.next_page_params;
        page++;
      } while (nextPageParams && page <= maxPages);

      setTokens(allTokens);
    } catch (err) {
      console.error('Error fetching W Chain tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTokens = useCallback(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Filter and sort tokens based on current filters
  const filteredTokens = tokens.filter(token => {
    const matchesSearch = !filters.search || 
      token.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      token.symbol.toLowerCase().includes(filters.search.toLowerCase()) ||
      token.address.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSearch;
  }).sort((a, b) => {
    let compareValue = 0;
    
    switch (filters.sortBy) {
      case 'name':
        compareValue = a.name.localeCompare(b.name);
        break;
      case 'symbol':
        compareValue = a.symbol.localeCompare(b.symbol);
        break;
      case 'holders':
        compareValue = (b.holders_count || 0) - (a.holders_count || 0);
        break;
      default:
        compareValue = a.name.localeCompare(b.name);
    }
    
    return filters.sortOrder === 'desc' ? compareValue : -compareValue;
  });

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    tokens,
    loading,
    error,
    filters,
    setFilters,
    refreshTokens,
    filteredTokens
  };
};