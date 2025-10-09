import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp, Users, Wallet, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWSwapTrades } from '@/hooks/useWSwapTrades';
import { WSWAP_LPS } from '@/config/wswap';
import { formatNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';

interface WSwapTradesProps {
  pairFilter?: string;
  title?: string;
}

export const WSwapTrades = ({ pairFilter, title = "W-Swap Live Trades" }: WSwapTradesProps) => {
  const [selectedLP, setSelectedLP] = useState<string>('all');
  const { trades, loading, error, stats, refetch } = useWSwapTrades(selectedLP, pairFilter);
  
  // Filter LPs based on pairFilter
  const availableLPs = pairFilter 
    ? WSWAP_LPS.filter(lp => lp.pair.includes(pairFilter))
    : WSWAP_LPS;

  // Prepare chart data (last 20 trades for visualization)
  const chartData = trades
    .slice(0, 20)
    .reverse()
    .map(trade => ({
      time: trade.time.toLocaleTimeString(),
      amount: trade.amount,
      type: trade.type
    }));

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
          <CardTitle className="flex items-center justify-between">
            <span>Trade Volume (Last 20)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={(props) => {
                    const trade = trades[19 - props.index];
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={4}
                        fill={trade?.type === 'buy' ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'}
                        stroke="none"
                      />
                    );
                  }}
                />
              </LineChart>
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
