import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { formatCurrency } from '@/utils/formatters';
import { Card } from '@/components/ui/card';

export function WavePriceChart() {
  const { getChartData } = usePriceHistory();
  const chartData = getChartData('wave');

  if (chartData.length === 0) {
    return (
      <Card className="glass-ocean p-8 border border-border/30 h-80 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-foreground font-medium">Building Price History</p>
          <p className="text-muted-foreground text-sm">
            Price data is collected every 15 minutes
          </p>
          <p className="text-muted-foreground text-xs">
            Chart will appear once we have multiple data points
          </p>
        </div>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-ocean p-3 rounded-lg border border-border/30 shadow-lg">
          <p className="text-foreground font-medium">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-muted-foreground text-sm">
            {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate price trend for gradient
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const latestPrice = prices[prices.length - 1];
  const isPositiveTrend = prices.length > 1 && latestPrice > prices[0];

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="5%" 
                stopColor={isPositiveTrend ? "hsl(142, 70%, 45%)" : "hsl(0, 75%, 55%)"} 
                stopOpacity={0.8}
              />
              <stop 
                offset="95%" 
                stopColor={isPositiveTrend ? "hsl(142, 70%, 45%)" : "hsl(0, 75%, 55%)"} 
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.3}
          />
          
          <XAxis 
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            interval="preserveStartEnd"
          />
          
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(value)}
            domain={['dataMin * 0.95', 'dataMax * 1.05']}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Line
            type="monotone"
            dataKey="price"
            stroke={isPositiveTrend ? "hsl(142, 70%, 45%)" : "hsl(0, 75%, 55%)"}
            strokeWidth={3}
            dot={false}
            activeDot={{ 
              r: 6, 
              stroke: isPositiveTrend ? "hsl(142, 70%, 45%)" : "hsl(0, 75%, 55%)",
              strokeWidth: 2,
              fill: 'hsl(var(--background))'
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {chartData.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Min: {formatCurrency(minPrice)}</span>
          <span>{chartData.length} data points</span>
          <span>Max: {formatCurrency(maxPrice)}</span>
        </div>
      )}
    </div>
  );
}