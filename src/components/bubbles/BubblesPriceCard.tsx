import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PriceData {
  symbol: string;
  name: string;
  price: number;
  change24h?: number;
  iconUrl?: string;
}

interface BubblesPriceCardProps {
  data: PriceData[];
}

export const BubblesPriceCard = ({ data }: BubblesPriceCardProps) => {
  return (
    <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 max-w-md">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💰</span>
          <h4 className="font-semibold">Price Comparison</h4>
        </div>

        <div className="space-y-3">
          {data.map((token, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
              {token.iconUrl && (
                <img 
                  src={token.iconUrl} 
                  alt={token.symbol}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{token.symbol}</span>
                  <Badge variant="outline" className="text-xs">
                    {token.name}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold">${token.price.toFixed(6)}</span>
                  {token.change24h !== undefined && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${token.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {token.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(token.change24h).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
