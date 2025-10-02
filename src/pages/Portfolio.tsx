import { useEffect } from 'react';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useWChainTokens } from '@/hooks/useWChainTokens';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { useWalletTokenScanner } from '@/hooks/useWalletTokenScanner';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { WalletInfo } from '@/components/WalletInfo';
import { TokenHoldings } from '@/components/TokenHoldings';
import { AddCustomTokenForm } from '@/components/AddCustomTokenForm';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { PnLWidget } from '@/components/PnLWidget';
import { PortfolioPerformanceChart } from '@/components/PortfolioPerformanceChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';

const Portfolio = () => {
  const { 
    isConnected, 
    walletInfo, 
    isConnecting, 
    connectWallet, 
    disconnectWallet, 
    error 
  } = useWalletConnection();

  const {
    tokens,
    loading: tokensLoading,
    error: tokensError,
    refreshTokens
  } = useWChainTokens();

  const {
    balances,
    loading: balancesLoading,
    error: balancesError,
    refetchBalances
  } = useTokenBalances(tokens, walletInfo?.address || null);

  // New comprehensive wallet scanner
  const {
    allBalances,
    loading: scannerLoading,
    error: scannerError,
    scanWallet,
    addCustomToken
  } = useWalletTokenScanner(walletInfo?.address || null, tokens);

  // Portfolio performance tracking
  const { createSnapshot } = usePortfolioHistory(walletInfo?.address || null);
  const { metrics, chartData } = usePortfolioPnL(allBalances, walletInfo?.address || null);

  // Auto-create snapshot when wallet connects and balances are loaded
  useEffect(() => {
    if (walletInfo?.address && allBalances.length > 0 && !scannerLoading) {
      const totalValue = allBalances.reduce((sum, balance) => {
        const priceValue = parseFloat(balance.token.exchange_rate || '0');
        if (priceValue > 0) {
          return sum + (priceValue * balance.balanceInEth);
        }
        return sum + (balance.usdValue || 0);
      }, 0);
      
      // Only create snapshot if total value is > 0
      if (totalValue > 0) {
        console.log('Auto-creating portfolio snapshot:', { totalValue, tokens: allBalances.length });
        createSnapshot(walletInfo.address, totalValue, allBalances);
      }
    }
  }, [walletInfo?.address, allBalances, scannerLoading, createSnapshot]);

  const handleRefreshPortfolio = () => {
    refreshTokens();
    refetchBalances();
    scanWallet();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Portfolio
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect your wallet to view your WCO holdings and portfolio performance
          </p>
        </div>

        {/* Error Display */}
        {(error || tokensError || balancesError || scannerError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || tokensError || balancesError || scannerError}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="flex justify-center">
          {!isConnected ? (
            /* Wallet Connection */
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🐋</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Connect Your Wallet</h2>
                <p className="text-muted-foreground max-w-md">
                  Connect your MetaMask or Rabby wallet to view your WCO token holdings 
                  and track your portfolio performance in the ocean ecosystem.
                </p>
              </div>
              
              <WalletConnectButton 
                onConnect={connectWallet}
                isConnecting={isConnecting}
              />
              
              <div className="text-xs text-muted-foreground">
                Make sure you're connected to the Ethereum mainnet
              </div>
            </div>
          ) : (
            /* Connected Portfolio */
            walletInfo && (
              <div className="w-full space-y-6">
                {/* Portfolio Summary */}
                <PortfolioSummary
                  balances={allBalances}
                  walletAddress={walletInfo.address}
                  onRefresh={handleRefreshPortfolio}
                  loading={tokensLoading || balancesLoading || scannerLoading}
                />

                {/* Wallet Info */}
                <WalletInfo 
                  walletInfo={walletInfo}
                  onDisconnect={disconnectWallet}
                />

                {/* Performance Widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PnLWidget
                    metrics={metrics}
                    loading={tokensLoading || balancesLoading || scannerLoading}
                  />
                  <PortfolioPerformanceChart
                    data={chartData}
                    loading={tokensLoading || balancesLoading || scannerLoading}
                  />
                </div>

                {/* Token Holdings with Tabs */}
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">All Tokens</TabsTrigger>
                    <TabsTrigger value="verified">W-Chain Tokens</TabsTrigger>
                    <TabsTrigger value="add">Add Token</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-6">
                    <TokenHoldings
                      balances={allBalances}
                      loading={scannerLoading}
                    />
                  </TabsContent>
                  
                  <TabsContent value="verified" className="mt-6">
                    <TokenHoldings
                      balances={balances}
                      loading={balancesLoading}
                    />
                  </TabsContent>
                  
                  <TabsContent value="add" className="mt-6">
                    <AddCustomTokenForm
                      onAddToken={addCustomToken}
                      loading={scannerLoading}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )
          )}
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground border-t pt-6">
          <div className="space-y-2">
            <div>🔒 Your wallet connection is secure and handled locally</div>
            <div>⚡ Real-time portfolio tracking and WCO token integration</div>
            <div>🌊 Part of the WCO Ocean Hub ecosystem</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;