import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, Wallet, Users } from 'lucide-react';
import { TokenBalance } from '@/types/token';
import { formatNumber } from '@/utils/formatters';

interface TokenStatsProps {
  totalTokens: number;
  ownedTokens: TokenBalance[];
  loading: boolean;
  hasWallet: boolean;
}

export const TokenStats = ({ totalTokens, ownedTokens, loading, hasWallet }: TokenStatsProps) => {
  const totalPortfolioValue = ownedTokens.reduce(
    (sum, balance) => sum + (balance.usdValue || 0), 
    0
  );

  const stats = [
    {
      title: "Total W Chain Tokens",
      value: loading ? "..." : formatNumber(totalTokens),
      icon: Coins,
      description: "Available on W Chain"
    },
    ...(hasWallet ? [
      {
        title: "Tokens Owned",
        value: loading ? "..." : ownedTokens.length.toString(),
        icon: Wallet,
        description: "In your wallet"
      },
      {
        title: "Portfolio Value",
        value: loading ? "..." : totalPortfolioValue > 0 ? `$${formatNumber(totalPortfolioValue)}` : "N/A",
        icon: TrendingUp,
        description: "USD value estimate"
      }
    ] : [])
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="glass-ocean hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}

      {hasWallet && ownedTokens.length > 0 && (
        <Card className="glass-ocean">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Top Holdings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ownedTokens.slice(0, 3).map((balance, index) => (
                <div key={balance.token.address} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{balance.token.symbol}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(balance.balanceInEth)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};