import { useWChainTokens } from '@/hooks/useWChainTokens';
import { TokenSearch } from '@/components/TokenSearch';
import { TokenStats } from '@/components/TokenStats';
import { TokenList } from '@/components/TokenList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Coins } from 'lucide-react';

export default function Tokens() {
  const {
    tokens,
    loading: tokensLoading,
    error: tokensError,
    filters,
    setFilters,
    refreshTokens,
    filteredTokens
  } = useWChainTokens();

  const handleRefresh = () => {
    refreshTokens();
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Coins className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">W Chain Tokens</h1>
        </div>
        <p className="text-muted-foreground">
          Discover and explore tokens in the W Chain ecosystem. Search, filter, and find tokens by name, symbol, or address.
        </p>
      </div>


      {/* Error Alerts */}
      {tokensError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {tokensError}
          </AlertDescription>
        </Alert>
      )}

      {/* Token Stats */}
      <TokenStats
        totalTokens={tokens.length}
        loading={tokensLoading}
      />

      {/* Search and Filters */}
      <TokenSearch
        filters={filters}
        onFiltersChange={setFilters}
        hasWalletConnected={false}
        onRefresh={handleRefresh}
      />

      {/* Token List */}
      <TokenList
        tokens={filteredTokens}
        loading={tokensLoading}
        showOnlyOwned={filters.showOnlyOwned}
      />
    </div>
  );
}