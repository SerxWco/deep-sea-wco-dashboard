import { Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/formatters';

interface WalletCardData {
  address: string;
  balance: string;
  balanceUsd?: number;
  transactionCount?: number;
  category?: string;
  emoji?: string;
  label?: string;
  topTokens?: Array<{
    symbol: string;
    balance: string;
    usdValue?: number;
  }>;
}

interface BubblesWalletCardProps {
  data: WalletCardData;
}

export const BubblesWalletCard = ({ data }: BubblesWalletCardProps) => {
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(data.address);
    toast.success('Address copied to clipboard! 📋');
  };

  const handleViewOnScanner = () => {
    window.open(`https://scan.wco.link/address/${data.address}`, '_blank');
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 max-w-md">
      <CardContent className="p-4 space-y-3">
        {/* Wallet Header */}
        <div className="flex items-center gap-2">
          {data.emoji && <span className="text-2xl">{data.emoji}</span>}
          <div className="flex-1 min-w-0">
            {data.label && (
              <Badge variant="outline" className="mb-1 text-xs">
                {data.label}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground truncate font-mono">
              {data.address}
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">WCO Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatNumber(parseFloat(data.balance), 2)}</span>
            <span className="text-sm text-muted-foreground">WCO</span>
          </div>
          {data.balanceUsd !== undefined && (
            <p className="text-sm text-muted-foreground">
              ≈ ${formatNumber(data.balanceUsd)}
            </p>
          )}
        </div>

        {/* Stats */}
        {data.transactionCount !== undefined && (
          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Transactions</p>
              <p className="font-semibold">{formatNumber(data.transactionCount)}</p>
            </div>
            {data.category && (
              <div>
                <p className="text-muted-foreground text-xs">Category</p>
                <p className="font-semibold">{data.category}</p>
              </div>
            )}
          </div>
        )}

        {/* Top Tokens Preview */}
        {data.topTokens && data.topTokens.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Top Token Holdings</p>
            <div className="space-y-1">
              {data.topTokens.slice(0, 3).map((token, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-muted-foreground">
                    {formatNumber(parseFloat(token.balance), 2)}
                    {token.usdValue !== undefined && ` ($${formatNumber(token.usdValue)})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAddress}
            className="flex-1 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewOnScanner}
            className="flex-1 text-xs"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View Scanner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
