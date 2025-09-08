import { TokenBalance } from '@/types/token';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wallet, TrendingUp, DollarSign } from 'lucide-react';

interface PortfolioSummaryProps {
  balances: TokenBalance[];
  walletAddress: string;
  onRefresh: () => void;
  loading: boolean;
}

export const PortfolioSummary = ({ 
  balances, 
  walletAddress, 
  onRefresh, 
  loading 
}: PortfolioSummaryProps) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const totalTokens = balances.length;
  const totalHoldings = balances.reduce((sum, balance) => sum + balance.balanceInEth, 0);

  // Find top holding by balance
  const topHolding = balances.reduce((max, balance) => 
    balance.balanceInEth > max.balanceInEth ? balance : max, 
    { balanceInEth: 0, token: { symbol: 'N/A' } } as any
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Wallet Address</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">
            {formatAddress(walletAddress)}
          </div>
          <p className="text-xs text-muted-foreground">
            Connected to W Chain
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTokens}</div>
          <p className="text-xs text-muted-foreground">
            Different tokens held
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Holding</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {topHolding.token?.symbol || 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {topHolding.balanceInEth > 0 
              ? `${topHolding.balanceInEth.toFixed(4)} tokens`
              : 'No holdings'
            }
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">Active</div>
          <p className="text-xs text-muted-foreground">
            Live on W Chain
          </p>
        </CardContent>
      </Card>
    </div>
  );
};