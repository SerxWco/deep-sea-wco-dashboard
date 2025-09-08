import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useWChainTokens } from '@/hooks/useWChainTokens';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { WalletInfo } from '@/components/WalletInfo';
import { TokenHoldings } from '@/components/TokenHoldings';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

  const handleRefreshPortfolio = () => {
    refreshTokens();
    refetchBalances();
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
        {(error || tokensError || balancesError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || tokensError || balancesError}
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
                  balances={balances}
                  walletAddress={walletInfo.address}
                  onRefresh={handleRefreshPortfolio}
                  loading={tokensLoading || balancesLoading}
                />

                {/* Wallet Info */}
                <WalletInfo 
                  walletInfo={walletInfo}
                  onDisconnect={disconnectWallet}
                />

                {/* Token Holdings */}
                <TokenHoldings
                  balances={balances}
                  loading={balancesLoading}
                />
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