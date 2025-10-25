import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface TrendingCoin {
  name: string;
  symbol: string;
  rank: number;
  price_btc: number;
  thumb: string;
}

interface BubblesTrendingCardProps {
  data: TrendingCoin[];
}

export const BubblesTrendingCard = ({ data }: BubblesTrendingCardProps) => {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200/50 dark:border-orange-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-primary">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Trending Cryptocurrencies
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((coin, index) => (
            <div
              key={`${coin.symbol}-${index}`}
              className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
            >
              <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center rounded-full">
                #{index + 1}
              </Badge>
              <img 
                src={coin.thumb} 
                alt={coin.name} 
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-foreground">
                  {coin.name}
                </p>
                <p className="text-xs text-muted-foreground uppercase">
                  {coin.symbol}
                </p>
              </div>
              {coin.rank && (
                <Badge variant="outline" className="text-xs">
                  Rank #{coin.rank}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
