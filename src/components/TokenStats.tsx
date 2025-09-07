import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins } from 'lucide-react';
import { formatNumber } from '@/utils/formatters';

interface TokenStatsProps {
  totalTokens: number;
  loading: boolean;
}

export const TokenStats = ({ totalTokens, loading }: TokenStatsProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 mb-6">
      <Card className="glass-ocean hover-lift">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total W Chain Tokens
          </CardTitle>
          <Coins className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {loading ? "..." : formatNumber(totalTokens)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Available on W Chain ecosystem
          </p>
        </CardContent>
      </Card>
    </div>
  );
};