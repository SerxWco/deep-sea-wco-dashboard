import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Globe } from "lucide-react";

interface GlobalMarketStats {
  total_market_cap_usd: number;
  total_volume_24h_usd: number;
  market_cap_change_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  active_cryptocurrencies: number;
}

interface BubblesMarketOverviewProps {
  data: GlobalMarketStats;
}

const formatCurrency = (value: number): string => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(2)}`;
};

export const BubblesMarketOverview = ({ data }: BubblesMarketOverviewProps) => {
  const isPositive = data.market_cap_change_24h >= 0;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200/50 dark:border-purple-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Globe className="w-5 h-5 text-purple-500" />
          Global Crypto Market
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Market Cap</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(data.total_market_cap_usd)}
            </p>
            <div className={`flex items-center gap-1 text-xs ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span className="font-semibold">
                {isPositive ? '+' : ''}{data.market_cap_change_24h.toFixed(2)}% (24h)
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">24h Volume</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(data.total_volume_24h_usd)}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.active_cryptocurrencies.toLocaleString()} cryptocurrencies
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">BTC Dominance</p>
            <p className="text-lg font-bold text-foreground">
              {data.btc_dominance.toFixed(1)}%
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">ETH Dominance</p>
            <p className="text-lg font-bold text-foreground">
              {data.eth_dominance.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
