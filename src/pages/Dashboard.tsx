import { CryptoMetricCard } from "@/components/CryptoMetricCard";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { useWCOMarketData } from "@/hooks/useWCOMarketData";
import { useWChainNetworkStats } from "@/hooks/useWChainNetworkStats";
import { useWalletLeaderboard } from "@/hooks/useWalletLeaderboard";
import { useWCOBurnTracker } from "@/hooks/useWCOBurnTracker";
import { useWCOSupplyInfo } from "@/hooks/useWCOSupplyInfo";
import { useWChainPriceAPI } from "@/hooks/useWChainPriceAPI";
import { formatCurrency, formatPercentage, formatNumber } from "@/utils/formatters";
import { formatExactNumber } from "@/utils/exactFormatters";
import { WChainChatbot } from "@/components/WChainChatbot";
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Activity,
  Users,
  ArrowUpRight,
  Coins,
  RefreshCw,
  Flame
} from "lucide-react";

export default function Dashboard() {
  const { data, loading, error } = useWCOMarketData();
  const { totalFetched: totalHolders, loading: holdersLoading } = useWalletLeaderboard();
  const { data: networkStats, loading: networkLoading, error: networkError } = useWChainNetworkStats(totalHolders);
  const { data: burnData, loading: burnLoading, error: burnError } = useWCOBurnTracker();
  const { data: supplyData, loading: supplyLoading, error: supplyError } = useWCOSupplyInfo();
  const { wcoPrice, wavePrice, loading: priceLoading, error: priceError } = useWChainPriceAPI();

  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              W Coin Dashboard
            </h1>
            {(loading || networkLoading || burnLoading || supplyLoading || priceLoading) && (
              <RefreshCw className="h-5 w-5 text-accent animate-spin" />
            )}
          </div>
          <p className="text-muted-foreground">
            {(error || networkError || burnError || supplyError || priceError) ? "Unable to fetch live data - showing cached values" : "Live crypto analytics and ocean creature ecosystem"}
          </p>
        </div>

        {/* Hero Section - Bubbles + Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Bubbles Chatbot - Takes 3 columns on large screens */}
          <div className="lg:col-span-3">
            <WChainChatbot />
          </div>
          
          {/* Top 3 Key Metrics - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 grid grid-cols-1 gap-6">
            <CryptoMetricCard
              title="WCO Price"
              value={wcoPrice?.price ? formatCurrency(wcoPrice.price) : (data ? formatCurrency(data.current_price) : (loading || priceLoading) ? "Loading..." : "$0.0000")}
              change={(data && data.price_change_percentage_24h !== undefined) ? { 
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
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CryptoMetricCard
            title="24h Volume"
            value={data ? formatCurrency(data.total_volume) : loading ? "Loading..." : "$0.00K"}
            icon={<Activity className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Total WCO Holders"
            value={holdersLoading ? "..." : formatNumber(totalHolders)}
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Charts */}
        <div className="w-full">
          <TradingViewWidget height="500px" />
        </div>

        {/* Network Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <CryptoMetricCard
            title="Circulating Supply"
            value={supplyData ? `${parseFloat(supplyData.summary.circulating_supply_wco).toLocaleString()} WCO` : supplyLoading ? "..." : "N/A"}
            change={supplyData ? {
              value: `of ${parseFloat(supplyData.summary.initial_supply_wco).toLocaleString()} total`,
              isPositive: true
            } : undefined}
            icon={<Coins className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="24h Transactions"
            value={networkStats ? formatExactNumber(networkStats.transactions24h) : networkLoading ? "..." : "N/A"}
            icon={<ArrowUpRight className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="WCO Burnt"
            value={burnData ? `${formatExactNumber(burnData.totalBurnt)} WCO` : burnLoading ? "..." : "N/A"}
            change={burnData && burnData.change24h !== 0 ? {
              value: `${formatExactNumber(burnData.burnt24h)} WCO in 24h`,
              isPositive: burnData.change24h > 0
            } : undefined}
            icon={<Flame className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="24h WCO Moved"
            value={networkStats ? `${formatNumber(networkStats.wcoMoved24h)} WCO` : networkLoading ? "..." : "N/A"}
            icon={<Coins className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Avg Transaction Size"
            value={networkStats ? `${networkStats.averageTransactionSize} WCO` : networkLoading ? "..." : "N/A"}
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
}