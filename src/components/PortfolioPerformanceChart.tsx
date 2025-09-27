import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface PortfolioPerformanceChartProps {
  data: ChartDataPoint[];
  loading: boolean;
}

export const PortfolioPerformanceChart = ({ data, loading }: PortfolioPerformanceChartProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Portfolio History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Portfolio History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
            <div className="text-center">
              <div className="font-medium mb-2">No Historical Data Yet</div>
              <div className="text-sm">
                Portfolio snapshots will start appearing once you connect your wallet.<br />
                Check back tomorrow to see your first performance chart!
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatValue = (value: number) => formatCurrency(value);

  // Calculate trend
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const trend = lastValue - firstValue;
  const trendPercent = firstValue > 0 ? (trend / firstValue) * 100 : 0;

  const lineColor = trend >= 0 ? '#22c55e' : '#ef4444';
  const trendColor = trend >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Portfolio History
          </div>
          {data.length > 1 && (
            <div className={`text-sm ${trendColor} flex items-center gap-1`}>
              <TrendingUp className="h-4 w-4" />
              {trend >= 0 ? '+' : ''}{formatCurrency(trend)} ({trend >= 0 ? '+' : ''}{trendPercent.toFixed(2)}%)
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs fill-muted-foreground"
              />
              <YAxis 
                tickFormatter={formatValue}
                className="text-xs fill-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => [formatValue(value), 'Portfolio Value']}
                labelFormatter={(label: string) => `Date: ${formatDate(label)}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 3, fill: lineColor }}
                activeDot={{ r: 5, fill: lineColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Showing {data.length} day{data.length !== 1 ? 's' : ''} of portfolio history
        </div>
      </CardContent>
    </Card>
  );
};