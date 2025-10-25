import { Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatNumber } from '@/utils/formatters';

interface TokenCardData {
  address: string;
  name: string;
  symbol: string;
  price?: number;
  priceChange24h?: number;
  holders?: number;
  marketCap?: number;
  totalSupply?: string;
  iconUrl?: string;
}

interface BubblesTokenCardProps {
  data: TokenCardData;
}

export const BubblesTokenCard = ({ data }: BubblesTokenCardProps) => {
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(data.address);
    toast.success('Address copied to clipboard! 📋');
  };

  const handleViewOnScanner = () => {
    window.open(`https://scan.wco.link/token/${data.address}`, '_blank');
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 max-w-md">
      <CardContent className="p-4 space-y-3">
        {/* Token Header */}
        <div className="flex items-center gap-3">
          {data.iconUrl && (
            <img 
              src={data.iconUrl} 
              alt={data.symbol}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-base">{data.symbol}</h4>
              <Badge variant="outline" className="text-xs">
                {data.name}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{data.address}</p>
          </div>
        </div>

        {/* Price Info */}
        {data.price !== undefined && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">${data.price.toFixed(6)}</span>
            {data.priceChange24h !== undefined && (
              <span className={`text-sm font-medium ${data.priceChange24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                {data.priceChange24h >= 0 ? '↗' : '↘'} {Math.abs(data.priceChange24h).toFixed(2)}%
              </span>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {data.holders !== undefined && (
            <div>
              <p className="text-muted-foreground text-xs">Holders</p>
              <p className="font-semibold">{formatNumber(data.holders)}</p>
            </div>
          )}
          {data.marketCap !== undefined && (
            <div>
              <p className="text-muted-foreground text-xs">Market Cap</p>
              <p className="font-semibold">${formatNumber(data.marketCap)}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAddress}
            className="flex-1 text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy Address
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewOnScanner}
            className="flex-1 text-xs"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View on Scanner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
