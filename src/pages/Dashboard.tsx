import { CryptoMetricCard } from "@/components/CryptoMetricCard";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { useWCOMarketData } from "@/hooks/useWCOMarketData";
import { useWChainNetworkStats } from "@/hooks/useWChainNetworkStats";
import { useWalletLeaderboard } from "@/hooks/useWalletLeaderboard";
import { formatCurrency, formatPercentage, formatNumber } from "@/utils/formatters";
import { formatDailyChange } from "@/utils/dailyComparisons";
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Activity,
  Users,
  UserCheck,
  ArrowUpRight,
  Coins,
  RefreshCw
} from "lucide-react";

export default function Dashboard() {
  const { data, loading, error } = useWCOMarketData();
  const { totalFetched: totalHolders, loading: holdersLoading } = useWalletLeaderboard();
  const { data: networkStats, loading: networkLoading, error: networkError } = useWChainNetworkStats(totalHolders);

  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              WCO Ocean Dashboard
            </h1>
            {(loading || networkLoading) && (
              <RefreshCw className="h-5 w-5 text-accent animate-spin" />
            )}
          </div>
          <p className="text-muted-foreground">
            {(error || networkError) ? "Unable to fetch live data - showing cached values" : "Live crypto analytics and ocean creature ecosystem"}
          </p>
        </div>

        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CryptoMetricCard
            title="Current WCO Price"
            value={data ? formatCurrency(data.current_price) : loading ? "Loading..." : "$0.0000"}
            change={data ? { 
              value: formatPercentage(data.price_change_percentage_24h), 
              isPositive: data.price_change_percentage_24h >= 0 
            } : undefined}
            icon={<DollarSign className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="24h Change"
            value={data ? formatPercentage(data.price_change_percentage_24h) : loading ? "Loading..." : "+0.00%"}
            change={data ? { 
              value: formatCurrency(Math.abs(data.price_change_24h)), 
              isPositive: data.price_change_24h >= 0 
            } : undefined}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Market Cap"
            value={data ? formatCurrency(data.market_cap) : loading ? "Loading..." : "$0.00M"}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="24h Volume"
            value={data ? formatCurrency(data.total_volume) : loading ? "Loading..." : "$0.00K"}
            icon={<Activity className="h-5 w-5" />}
          />
        </div>

        {/* Middle Row - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TradingViewWidget height="500px" />
          </div>
          
          <CryptoMetricCard
            title="All-Time High"
            value={data ? formatCurrency(data.ath) : loading ? "Loading..." : "$0.0000"}
            change={data ? { 
              value: `${((data.current_price / data.ath - 1) * 100).toFixed(1)}% from ATH`, 
              isPositive: false 
            } : undefined}
            icon={<Target className="h-6 w-6" />}
            className="h-full flex flex-col justify-center"
          />
        </div>

        {/* Network Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CryptoMetricCard
            title="Total WCO Holders"
            value={holdersLoading ? "..." : formatNumber(totalHolders)}
            icon={<Users className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="24h Transactions"
            value={networkStats ? formatNumber(networkStats.transactions24h) : networkLoading ? "..." : "N/A"}
            change={networkStats?.dailyComparison ? 
              formatDailyChange(networkStats.dailyComparison.transactions24h.change) : undefined}
            icon={<ArrowUpRight className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="24h WCO Moved"
            value={networkStats ? `${formatNumber(networkStats.wcoMoved24h)} WCO` : networkLoading ? "..." : "N/A"}
            change={networkStats?.dailyComparison ? 
              formatDailyChange(networkStats.dailyComparison.wcoMoved24h.change) : undefined}
            icon={<Coins className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Avg Transaction Size"
            value={networkStats ? `${networkStats.averageTransactionSize} WCO` : networkLoading ? "..." : "N/A"}
            change={networkStats?.dailyComparison ? 
              formatDailyChange(networkStats.dailyComparison.averageTransactionSize.change) : undefined}
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
}