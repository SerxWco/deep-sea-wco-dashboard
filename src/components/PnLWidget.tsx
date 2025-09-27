import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { PnLMetrics } from '@/hooks/usePortfolioPnL';

interface PnLWidgetProps {
  metrics: PnLMetrics;
  loading: boolean;
}

export const PnLWidget = ({ metrics, loading }: PnLWidgetProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPnLColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getPnLIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const PnLCard = ({ 
    title, 
    absolute, 
    percent, 
    subtitle 
  }: { 
    title: string; 
    absolute: number; 
    percent: number; 
    subtitle?: string;
  }) => (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={`flex items-center gap-2 ${getPnLColor(absolute)}`}>
        {getPnLIcon(absolute)}
        <div>
          <div className="font-semibold">
            {absolute >= 0 ? '+' : ''}{formatCurrency(absolute)}
          </div>
          <div className="text-sm">
            {percent >= 0 ? '+' : ''}{formatPercentage(percent)}
          </div>
        </div>
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Portfolio Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">
                {formatCurrency(metrics.totalValue)}
              </div>
              <div className="text-muted-foreground">Total Portfolio Value</div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <PnLCard
                title="24h Performance"
                absolute={metrics.oneDayPnL}
                percent={metrics.oneDayPnLPercent}
              />
              
              <PnLCard
                title="7d Performance"
                absolute={metrics.sevenDayPnL}
                percent={metrics.sevenDayPnLPercent}
              />
            </div>

            {metrics.sinceConnectionPnL !== 0 && (
              <div className="border-t pt-4">
                <PnLCard
                  title="Since Connection"
                  absolute={metrics.sinceConnectionPnL}
                  percent={metrics.sinceConnectionPnLPercent}
                  subtitle="Total gain/loss since first wallet connection"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="detailed" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 gap-4">
              <PnLCard
                title="1 Day"
                absolute={metrics.oneDayPnL}
                percent={metrics.oneDayPnLPercent}
              />
              
              <PnLCard
                title="7 Days"
                absolute={metrics.sevenDayPnL}
                percent={metrics.sevenDayPnLPercent}
              />
              
              <PnLCard
                title="30 Days"
                absolute={metrics.thirtyDayPnL}
                percent={metrics.thirtyDayPnLPercent}
              />

              {metrics.sinceConnectionPnL !== 0 && (
                <PnLCard
                  title="All Time"
                  absolute={metrics.sinceConnectionPnL}
                  percent={metrics.sinceConnectionPnLPercent}
                />
              )}
            </div>

            {(metrics.bestPerformingToken || metrics.worstPerformingToken) && (
              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-medium">Token Performance</div>
                
                {metrics.bestPerformingToken && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Best Performer</span>
                    <Badge variant="secondary" className="text-green-600">
                      {metrics.bestPerformingToken.symbol} +{metrics.bestPerformingToken.change.toFixed(2)}%
                    </Badge>
                  </div>
                )}
                
                {metrics.worstPerformingToken && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Worst Performer</span>
                    <Badge variant="secondary" className="text-red-600">
                      {metrics.worstPerformingToken.symbol} {metrics.worstPerformingToken.change.toFixed(2)}%
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};