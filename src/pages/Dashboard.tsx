import { CryptoMetricCard } from "@/components/CryptoMetricCard";
import { PriceChart } from "@/components/PriceChart";
import { useWCOMarketData } from "@/hooks/useWCOMarketData";
import { formatCurrency, formatPercentage, formatNumber } from "@/utils/formatters";
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Activity,
  Users,
  Wallet,
  ArrowUpDown,
  Zap,
  RefreshCw
} from "lucide-react";

export default function Dashboard() {
  const { data, loading, error } = useWCOMarketData();

  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              WCO Ocean Dashboard
            </h1>
            {loading && (
              <RefreshCw className="h-5 w-5 text-accent animate-spin" />
            )}
          </div>
          <p className="text-muted-foreground">
            {error ? "Unable to fetch live data - showing cached values" : "Live crypto analytics and ocean creature ecosystem"}
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
            <PriceChart />
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

        {/* Bottom Row - Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CryptoMetricCard
            title="Active Wallets"
            value="2,847"
            change={{ value: "+156", isPositive: true }}
            icon={<Users className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Dormant Wallets"
            value="1,203"
            change={{ value: "-23", isPositive: true }}
            icon={<Wallet className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Large Transactions"
            value="47"
            change={{ value: "+12", isPositive: true }}
            icon={<ArrowUpDown className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Activity Rate"
            value="73.2%"
            change={{ value: "+5.8%", isPositive: true }}
            icon={<Zap className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
}