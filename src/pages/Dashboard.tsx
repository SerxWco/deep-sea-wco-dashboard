import { useState, useEffect } from "react";
import { CryptoMetricCard } from "@/components/CryptoMetricCard";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { DailyReportGenerator } from "@/components/DailyReportGenerator";
import { useWCOMarketData } from "@/hooks/useWCOMarketData";
import { useWChainNetworkStats } from "@/hooks/useWChainNetworkStats";
import { useWalletLeaderboard } from "@/hooks/useWalletLeaderboard";
import { useWCOBurnTracker } from "@/hooks/useWCOBurnTracker";
import { useWCOSupplyInfo } from "@/hooks/useWCOSupplyInfo";
import { useWChainPriceAPI } from "@/hooks/useWChainPriceAPI";
import { formatCurrency, formatPercentage, formatNumber } from "@/utils/formatters";
import { formatDailyChange, saveDailyMetrics, getDailyComparison } from "@/utils/dailyComparisons";
import { formatExactNumber } from "@/utils/exactFormatters";
import { Button } from "@/components/ui/button";
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
  RefreshCw,
  Flame,
  FileText
} from "lucide-react";

export default function Dashboard() {
  const { data, loading, error } = useWCOMarketData();
  const { totalFetched: totalHolders, loading: holdersLoading } = useWalletLeaderboard();
  const { data: networkStats, loading: networkLoading, error: networkError } = useWChainNetworkStats(totalHolders);
  const { data: burnData, loading: burnLoading, error: burnError } = useWCOBurnTracker();
  const { data: supplyData, loading: supplyLoading, error: supplyError } = useWCOSupplyInfo();
  const { wcoPrice, wavePrice, loading: priceLoading, error: priceError } = useWChainPriceAPI();
  
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [dailyComparison, setDailyComparison] = useState<any>(null);

  // Calculate daily comparison data asynchronously
  useEffect(() => {
    const fetchComparison = async () => {
      if (data && networkStats && burnData && supplyData) {
        const comparison = await getDailyComparison({
          totalHolders,
          transactions24h: networkStats.transactions24h,
          wcoMoved24h: networkStats.wcoMoved24h,
          activeWallets: networkStats.activeWallets,
          averageTransactionSize: networkStats.averageTransactionSize,
          networkActivityRate: networkStats.networkActivityRate,
          marketCap: data.market_cap,
          totalVolume: data.total_volume,
          circulatingSupply: parseFloat(supplyData.summary.circulating_supply_wco),
          wcoBurntTotal: burnData.totalBurnt,
          wcoBurnt24h: burnData.burnt24h || 0
        });
        setDailyComparison(comparison);
      }
    };

    fetchComparison();
  }, [data, networkStats, burnData, supplyData, totalHolders]);

  // Save daily metrics when data is available
  useEffect(() => {
    if (data && networkStats && burnData && supplyData && !loading && !networkLoading && !burnLoading && !supplyLoading) {
      saveDailyMetrics({
        totalHolders,
        transactions24h: networkStats.transactions24h,
        wcoMoved24h: networkStats.wcoMoved24h,
        activeWallets: networkStats.activeWallets,
        averageTransactionSize: networkStats.averageTransactionSize,
        networkActivityRate: networkStats.networkActivityRate,
        marketCap: data.market_cap,
        totalVolume: data.total_volume,
        circulatingSupply: parseFloat(supplyData.summary.circulating_supply_wco),
        wcoBurntTotal: burnData.totalBurnt,
        wcoBurnt24h: burnData.burnt24h || 0
      });
    }
  }, [data, networkStats, burnData, supplyData, totalHolders, loading, networkLoading, burnLoading, supplyLoading]);

  // Generate report data
  const getReportData = () => {
    if (!data || !networkStats || !burnData || !supplyData) return null;
    
    return {
      totalHolders,
      holdersChange: dailyComparison?.totalHolders?.change || 0,
      transactions24h: networkStats.transactions24h,
      transactionsChange: dailyComparison?.transactions24h?.change || 0,
      wcoMoved24h: networkStats.wcoMoved24h,
      wcoMovedChange: dailyComparison?.wcoMoved24h?.change || 0,
      circulatingSupply: parseFloat(supplyData.summary.circulating_supply_wco),
      circulatingSupplyChange: dailyComparison?.circulatingSupply?.change || 0,
      marketCap: data.market_cap,
      marketCapChange: dailyComparison?.marketCap?.change || 0,
      volume24h: data.total_volume,
      volumeChange: dailyComparison?.totalVolume?.change || 0,
      wcoBurnt: burnData.totalBurnt,
      wcoBurntChange: dailyComparison?.wcoBurntTotal?.change || 0
    };
  };

  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                W Coin Dashboard
              </h1>
              {(loading || networkLoading || burnLoading || supplyLoading || priceLoading) && (
                <RefreshCw className="h-5 w-5 text-accent animate-spin" />
              )}
            </div>
            
            <Button 
              onClick={() => setShowReportGenerator(true)}
              className="flex items-center gap-2"
              variant="outline"
              disabled={!data || !networkStats || !burnData || !supplyData}
            >
              <FileText className="h-4 w-4" />
              Generate Daily Report
            </Button>
          </div>
          <p className="text-muted-foreground">
            {(error || networkError || burnError || supplyError || priceError) ? "Unable to fetch live data - showing cached values" : "Live crypto analytics and ocean creature ecosystem"}
          </p>
        </div>

        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <CryptoMetricCard
            title="WCO Price"
            value={wcoPrice?.price ? formatCurrency(wcoPrice.price) : (data ? formatCurrency(data.current_price) : (loading || priceLoading) ? "Loading..." : "$0.0000")}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <CryptoMetricCard
            title="Total WCO Holders"
            value={holdersLoading ? "..." : formatNumber(totalHolders)}
            icon={<Users className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Circulating Supply"
            value={supplyData ? `${parseFloat(supplyData.summary.circulating_supply_wco).toLocaleString()} WCO` : supplyLoading ? "..." : "N/A"}
            change={supplyData ? {
              value: `of ${formatNumber(parseFloat(supplyData.summary.initial_supply_wco))} total`,
              isPositive: true
            } : undefined}
            icon={<Coins className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="24h Transactions"
            value={networkStats ? formatExactNumber(networkStats.transactions24h) : networkLoading ? "..." : "N/A"}
            change={dailyComparison ? 
              formatDailyChange(dailyComparison.transactions24h.change) : undefined}
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
            change={dailyComparison ? 
              formatDailyChange(dailyComparison.wcoMoved24h.change) : undefined}
            icon={<Coins className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Avg Transaction Size"
            value={networkStats ? `${networkStats.averageTransactionSize} WCO` : networkLoading ? "..." : "N/A"}
            change={dailyComparison ? 
              formatDailyChange(dailyComparison.averageTransactionSize.change) : undefined}
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
        
        <DailyReportGenerator 
          isOpen={showReportGenerator}
          onOpenChange={setShowReportGenerator}
          reportData={getReportData()}
        />
      </div>
    </div>
  );
}