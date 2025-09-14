import { TokenBalance } from '@/types/token';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

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
  const totalUsdValue = balances.reduce((sum, balance) => sum + (balance.usdValue || 0), 0);

  // Calculate 24h performance (placeholder for now - would need historical data)
  const performance24h = 0; // This would come from comparing with yesterday's snapshot
  const performancePercentage = 0; // This would be calculated from the change

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
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
          <div className="text-3xl font-bold text-foreground">
            {totalUsdValue > 0 ? formatCurrency(totalUsdValue) : '$0.00'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalUsdValue > 0 ? 'Total USD Value' : 'Connect wallet to see balance'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">24h Performance</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {totalUsdValue > 0 ? formatCurrency(performance24h) : '$0.00'}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-muted-foreground">
              {totalUsdValue > 0 ? `${performancePercentage >= 0 ? '+' : ''}${performancePercentage.toFixed(2)}%` : '0.00%'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};