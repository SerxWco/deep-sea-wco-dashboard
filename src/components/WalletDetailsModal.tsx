import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Copy, RefreshCw, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useWalletDetails } from '@/hooks/useWalletDetails';
import { formatCurrency } from '@/utils/formatters';
import { formatExactWCO } from '@/utils/exactFormatters';
import { toast } from 'sonner';

interface WalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string | null;
}

export function WalletDetailsModal({ isOpen, onClose, address }: WalletDetailsModalProps) {
  const { walletDetails, loading, error, refetch } = useWalletDetails(address);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const openInExplorer = () => {
    if (address) {
      window.open(`https://scan.w-chain.com/address/${address}`, '_blank');
    }
  };

  if (!address) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Wallet Details
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading wallet details...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {walletDetails && (
          <div className="space-y-6">
            {/* Address Section */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-mono text-sm break-all">{address}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(address)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openInExplorer}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">WCO Balance</span>
                </div>
                <p className="text-2xl font-bold">{formatExactWCO(parseFloat(walletDetails.balance) / 1e18)}</p>
                <p className="text-sm text-muted-foreground">
                  ~${parseFloat(walletDetails.balanceUsd).toFixed(2)}
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Total Received</span>
                </div>
                <p className="text-xl font-semibold text-green-600">
                  {formatExactWCO(parseFloat(walletDetails.totalReceived) / 1e18)}
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Total Sent</span>
                </div>
                <p className="text-xl font-semibold text-red-600">
                  {formatExactWCO(parseFloat(walletDetails.totalSent) / 1e18)}
                </p>
              </div>
            </div>

            {/* Transaction Count */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Transactions</span>
              <Badge variant="secondary">{walletDetails.transactionCount.toLocaleString()}</Badge>
            </div>

            <Separator />

            {/* Tokens Section */}
            {walletDetails.tokens.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">ERC-20 Tokens</h3>
                <div className="space-y-2">
                  {walletDetails.tokens.map((token, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{token.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {token.contractAddress.slice(0, 6)}...{token.contractAddress.slice(-4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {parseFloat(token.balance) / Math.pow(10, token.decimals)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
              </div>
            )}

            {/* Recent Transactions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
              <div className="space-y-2">
                {walletDetails.recentTransactions.map((tx) => (
                  <div key={tx.hash} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={tx.status === 'ok' ? 'default' : 'destructive'}>
                          {tx.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Block #{tx.blockNumber}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">From: </span>
                        <span className="font-mono">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To: </span>
                        <span className="font-mono">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Value: </span>
                        <span className="font-semibold">{formatExactWCO(parseFloat(tx.value) / 1e18)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <button
                        onClick={() => copyToClipboard(tx.hash)}
                        className="text-xs text-primary hover:text-primary/80 font-mono"
                      >
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4">
              <Button onClick={openInExplorer} variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Explorer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}