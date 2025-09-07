import { useWChainTokens } from '@/hooks/useWChainTokens';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { TokenSearch } from '@/components/TokenSearch';
import { TokenStats } from '@/components/TokenStats';
import { TokenList } from '@/components/TokenList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Coins } from 'lucide-react';

export default function Tokens() {
  const { 
    isConnected, 
    walletInfo, 
    connectWallet, 
    isConnecting, 
    error: walletError 
  } = useWalletConnection();

  const {
    tokens,
    loading: tokensLoading,
    error: tokensError,
    filters,
    setFilters,
    refreshTokens,
    filteredTokens
  } = useWChainTokens();

  const {
    balances,
    loading: balancesLoading,
    error: balancesError,
    refetchBalances
  } = useTokenBalances(tokens, walletInfo?.address || null);

  const handleRefresh = () => {
    refreshTokens();
    if (isConnected) {
      refetchBalances();
    }
  };

  // Filter tokens based on ownership if the filter is enabled
  const displayTokens = filters.showOnlyOwned && isConnected
    ? filteredTokens.filter(token => 
        balances.some(balance => 
          balance.token.address.toLowerCase() === token.address.toLowerCase()
        )
      )
    : filteredTokens;

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
      {(walletError || tokensError || balancesError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {walletError || tokensError || balancesError}
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
        hasWalletConnected={isConnected}
        onRefresh={handleRefresh}
      />

      {/* Token List */}
      <TokenList
        tokens={displayTokens}
        balances={balances}
        loading={tokensLoading || (isConnected && balancesLoading)}
        hasWallet={isConnected}
        showOnlyOwned={filters.showOnlyOwned}
      />
    </div>
  );
}