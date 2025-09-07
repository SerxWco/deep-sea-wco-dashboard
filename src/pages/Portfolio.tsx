import { useWalletConnection } from '@/hooks/useWalletConnection';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { WalletInfo } from '@/components/WalletInfo';
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
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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
            /* Connected Wallet Info */
            walletInfo && (
              <div className="w-full max-w-2xl">
                <WalletInfo 
                  walletInfo={walletInfo}
                  onDisconnect={disconnectWallet}
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