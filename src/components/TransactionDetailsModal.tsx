import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Copy, RefreshCw, Hash, Clock, User, ArrowRight } from 'lucide-react';
import { useTransactionDetails } from '@/hooks/useTransactionDetails';
import { formatCurrency } from '@/utils/formatters';
import { formatExactWCO } from '@/utils/exactFormatters';
import { toast } from 'sonner';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hash: string | null;
}

export function TransactionDetailsModal({ isOpen, onClose, hash }: TransactionDetailsModalProps) {
  const { transactionDetails, loading, error, refetch } = useTransactionDetails(hash);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const openInExplorer = () => {
    if (hash) {
      window.open(`https://scan.w-chain.com/tx/${hash}`, '_blank');
    }
  };

  if (!hash) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Transaction Details
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading transaction details...</span>
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

        {transactionDetails && (
          <div className="space-y-6">
            {/* Hash Section */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm text-muted-foreground">Transaction Hash</p>
                <p className="font-mono text-sm break-all">{hash}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(hash)}
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

            {/* Status and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={transactionDetails.status === 'ok' ? 'default' : 'destructive'}>
                    {transactionDetails.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Block</span>
                </div>
                <p className="text-lg font-semibold">#{transactionDetails.blockNumber}</p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <p className="text-sm text-muted-foreground mb-1">Timestamp</p>
                <p className="text-sm font-medium">
                  {new Date(transactionDetails.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <p className="text-sm text-muted-foreground mb-1">Method</p>
                <p className="text-sm font-medium">{transactionDetails.method}</p>
              </div>
            </div>

            {/* Value Transfer */}
            <div className="p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-medium">Value Transfer</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">From</span>
                  </div>
                  <p className="font-mono text-sm">{transactionDetails.from.slice(0, 6)}...{transactionDetails.from.slice(-4)}</p>
                </div>

                <div className="text-center">
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold text-primary">
                      {formatExactWCO(parseFloat(transactionDetails.value) / 1e18)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ~${parseFloat(transactionDetails.valueUsd).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">To</span>
                  </div>
                  <p className="font-mono text-sm">{transactionDetails.to.slice(0, 6)}...{transactionDetails.to.slice(-4)}</p>
                </div>
              </div>
            </div>

            {/* Gas Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-background">
                <p className="text-sm text-muted-foreground mb-1">Gas Limit</p>
                <p className="font-semibold">{parseInt(transactionDetails.gasLimit).toLocaleString()}</p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <p className="text-sm text-muted-foreground mb-1">Gas Used</p>
                <p className="font-semibold">{parseInt(transactionDetails.gasUsed).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  ({((parseInt(transactionDetails.gasUsed) / parseInt(transactionDetails.gasLimit)) * 100).toFixed(1)}%)
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-background">
                <p className="text-sm text-muted-foreground mb-1">Gas Price</p>
                <p className="font-semibold">{formatExactWCO(parseFloat(transactionDetails.gasPrice) / 1e18)}</p>
              </div>
            </div>

            <Separator />

            {/* Internal Transactions */}
            {transactionDetails.internalTransactions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Internal Transactions</h3>
                <div className="space-y-2">
                  {transactionDetails.internalTransactions.map((tx, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type: </span>
                          <Badge variant="outline">{tx.type}</Badge>
                        </div>
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
                    </div>
                  ))}
                </div>
                <Separator className="my-6" />
              </div>
            )}

            {/* Block Hash */}
            <div className="p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Block Hash</p>
                  <p className="font-mono text-sm break-all">{transactionDetails.blockHash}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(transactionDetails.blockHash)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
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