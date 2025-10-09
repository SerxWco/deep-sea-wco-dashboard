import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { OHLCCandle, TimeInterval } from '@/types/wswap';
import { formatCandleTime } from '@/utils/ohlcAggregator';
import { formatNumber } from '@/utils/formatters';

interface CandlestickChartProps {
  candles: OHLCCandle[];
  interval: TimeInterval;
  onIntervalChange: (interval: TimeInterval) => void;
  loading?: boolean;
  onRefresh?: () => void;
  title?: string;
}

const INTERVALS: TimeInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

// Custom Candlestick Shape Component
const CandleShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  
  if (!payload) return null;

  const { open, high, low, close } = payload;
  const isPositive = close >= open;
  const color = isPositive ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)';
  const fillOpacity = isPositive ? 0.8 : 1;

  // Calculate dimensions
  const wickX = x + width / 2;
  const bodyTop = Math.min(open, close);
  const bodyBottom = Math.max(open, close);
  const bodyHeight = Math.abs(close - open);
  
  // Handle doji (open === close)
  const minBodyHeight = 1;
  const actualBodyHeight = bodyHeight < 0.0001 ? minBodyHeight : bodyHeight;

  return (
    <g>
      {/* Wick (high to low line) */}
      <line
        x1={wickX}
        y1={y}
        x2={wickX}
        y2={y + height}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body (open to close rectangle) */}
      <rect
        x={x + width * 0.25}
        y={isPositive ? y + height - actualBodyHeight : y}
        width={width * 0.5}
        height={actualBodyHeight}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const isPositive = data.close >= data.open;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">
        {data.time.toLocaleString()}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Open:</span>
          <span className="font-mono">{formatNumber(data.open, 8)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">High:</span>
          <span className="font-mono text-green-500">{formatNumber(data.high, 8)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Low:</span>
          <span className="font-mono text-red-500">{formatNumber(data.low, 8)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Close:</span>
          <span className={`font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {formatNumber(data.close, 8)}
          </span>
        </div>
        <div className="border-t border-border my-2 pt-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-mono">{formatNumber(data.volume, 2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-green-500/70">Buy:</span>
            <span className="font-mono text-green-500">{formatNumber(data.buyVolume, 2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-red-500/70">Sell:</span>
            <span className="font-mono text-red-500">{formatNumber(data.sellVolume, 2)}</span>
          </div>
          <div className="flex justify-between gap-4 mt-1">
            <span className="text-muted-foreground">Trades:</span>
            <span className="font-mono">{data.trades}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CandlestickChart = ({
  candles,
  interval,
  onIntervalChange,
  loading = false,
  onRefresh,
  title = 'Price Chart',
}: CandlestickChartProps) => {
  // Prepare chart data
  const chartData = useMemo(() => {
    return candles.map((candle) => ({
      ...candle,
      timeLabel: formatCandleTime(candle.time, interval),
      // Normalize OHLC for recharts (using relative positioning)
      range: [candle.low, candle.high],
      ohlc: [candle.open, candle.close],
    }));
  }, [candles, interval]);

  // Calculate Y-axis domain with padding
  const priceRange = useMemo(() => {
    if (candles.length === 0) return [0, 1];
    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [candles]);

  return (
    <Card className="glass-ocean">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {candles.length} candles • {interval} interval
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Interval Selector */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
              {INTERVALS.map((int) => (
                <Button
                  key={int}
                  variant={interval === int ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onIntervalChange(int)}
                  className="h-7 px-3 text-xs"
                >
                  {int}
                </Button>
              ))}
            </div>
            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : candles.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            No trading data available for this interval
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              
              <XAxis
                dataKey="timeLabel"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              
              <YAxis
                yAxisId="price"
                domain={priceRange}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(value) => formatNumber(value, 8)}
                tickLine={false}
              />
              
              <YAxis
                yAxisId="volume"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(value) => formatNumber(value, 0)}
                tickLine={false}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Volume Bars */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="url(#volumeGradient)"
                opacity={0.6}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.buyVolume > entry.sellVolume 
                      ? 'hsl(142, 76%, 36%)' 
                      : 'hsl(0, 84%, 60%)'
                    }
                    opacity={0.3}
                  />
                ))}
              </Bar>
              
              {/* Candlesticks - using Bar with custom shape */}
              <Bar
                yAxisId="price"
                dataKey="range"
                shape={<CandleShape />}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
