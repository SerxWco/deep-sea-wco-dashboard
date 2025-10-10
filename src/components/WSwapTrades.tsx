import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp, Users, Wallet, Activity, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useWSwapTrades } from '@/hooks/useWSwapTrades';
import { WSWAP_LPS } from '@/config/wswap';
import { formatNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { aggregateTrades, TimeRange, getTimeRangeCutoff } from '@/utils/tradeAggregator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WSwapTradesProps {
  pairFilter?: string;
  title?: string;
}

export const WSwapTrades = ({ pairFilter, title = "W-Swap Live Trades" }: WSwapTradesProps) => {
  const [selectedLP, setSelectedLP] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const { trades, loading, error, stats, refetch } = useWSwapTrades(selectedLP, pairFilter);
  
  // Filter LPs based on pairFilter
  const availableLPs = pairFilter 
    ? WSWAP_LPS.filter(lp => lp.pair.includes(pairFilter))
    : WSWAP_LPS;

  // Aggregate trades for chart visualization
  const chartData = aggregateTrades(trades, timeRange);

  // Calculate stats for selected time range
  const cutoffTime = getTimeRangeCutoff(timeRange);
  const rangeStats = {
    totalVolume: chartData.reduce((sum, d) => sum + d.totalVolume, 0),
    totalTrades: chartData.reduce((sum, d) => sum + d.tradeCount, 0),
    buyVolume: chartData.reduce((sum, d) => sum + d.buyVolume, 0),
    sellVolume: chartData.reduce((sum, d) => sum + d.sellVolume, 0),
  };

  const StatCard = ({ icon: Icon, label, value, trend }: any) => (
    <Card className="glass-ocean hover-lift">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold text-foreground">{value}</p>
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Card className="glass-ocean">
        <CardContent className="p-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              icon={Activity}
              label="24h Volume"
              value={`${formatNumber(stats.totalVolume24h, 2)} ${pairFilter === 'WAVE' ? 'WCO' : 'Tokens'}`}
            />
            <StatCard
              icon={TrendingUp}
              label="24h Trades"
              value={stats.totalTrades24h}
            />
            <StatCard
              icon={Users}
              label="Active Wallets"
              value={stats.uniqueWallets24h}
            />
            <StatCard
              icon={Wallet}
              label="Largest Trade"
              value={stats.largestTrade24h ? `${formatNumber(stats.largestTrade24h.amount, 2)}` : 'N/A'}
            />
          </>
        )}
      </div>

      {/* Chart */}
      <Card className="glass-ocean">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Trade Volume History
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {rangeStats.totalTrades} trades • {formatNumber(rangeStats.totalVolume, 2)} total volume
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <TabsList className="bg-background/50">
                  <TabsTrigger value="1h" className="text-xs">1H</TabsTrigger>
                  <TabsTrigger value="6h" className="text-xs">6H</TabsTrigger>
                  <TabsTrigger value="24h" className="text-xs">24H</TabsTrigger>
                  <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">ALL</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-80 w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No trades in selected time range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  label={{ value: 'Volume', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '8px' }}
                  formatter={(value: number, name: string) => [
                    formatNumber(value, 2),
                    name === 'buyVolume' ? 'Buy Volume' : name === 'sellVolume' ? 'Sell Volume' : 'Total Volume'
                  ]}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-foreground mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-green-500">Buy Volume:</span>
                            <span className="font-medium text-foreground">{formatNumber(data.buyVolume, 2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-red-500">Sell Volume:</span>
                            <span className="font-medium text-foreground">{formatNumber(data.sellVolume, 2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
                            <span className="text-muted-foreground">Total Volume:</span>
                            <span className="font-bold text-foreground">{formatNumber(data.totalVolume, 2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Trades:</span>
                            <span className="font-medium text-foreground">{data.tradeCount}</span>
                          </div>
                          {data.avgPrice > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Avg Price:</span>
                              <span className="font-medium text-foreground">{formatNumber(data.avgPrice, 6)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="square"
                  formatter={(value) => value === 'buyVolume' ? 'Buy Volume' : 'Sell Volume'}
                />
                <Bar 
                  dataKey="buyVolume" 
                  stackId="volume"
                  fill="hsl(142, 76%, 36%)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="sellVolume" 
                  stackId="volume"
                  fill="hsl(0, 84%, 60%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card className="glass-ocean">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>{title}</CardTitle>
            {availableLPs.length > 1 && (
              <Select value={selectedLP} onValueChange={setSelectedLP}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by LP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LPs</SelectItem>
                  {availableLPs.map(lp => (
                    <SelectItem key={lp.address} value={lp.address}>
                      {lp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>LP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No trades found
                      </TableCell>
                    </TableRow>
                  ) : (
                    trades.map((trade) => (
                      <TableRow key={trade.hash}>
                        <TableCell className="text-xs">
                          {trade.time.toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`gap-1 ${
                              trade.type === 'buy' 
                                ? 'bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30' 
                                : 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30'
                            }`}
                          >
                            {trade.type === 'buy' ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {trade.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {trade.tokenSymbol}
                        </TableCell>
                        <TableCell className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                          {formatNumber(trade.amount, 4)}
                        </TableCell>
                        <TableCell>
                          {trade.price ? formatNumber(trade.price, 6) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {trade.from.slice(0, 6)}...{trade.from.slice(-4)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {trade.lpLabel}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
