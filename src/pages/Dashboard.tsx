import { CryptoMetricCard } from "@/components/CryptoMetricCard";
import { PriceChart } from "@/components/PriceChart";
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Activity,
  Users,
  Wallet,
  ArrowUpDown,
  Zap
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-ocean-gradient p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            WCO Ocean Dashboard
          </h1>
          <p className="text-muted-foreground">
            Dive deep into your crypto analytics and ocean creature ecosystem
          </p>
        </div>

        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <CryptoMetricCard
            title="Current WCO Price"
            value="$0.0847"
            change={{ value: "+12.5%", isPositive: true }}
            icon={<DollarSign className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Market Cap"
            value="$2.1M"
            change={{ value: "+8.3%", isPositive: true }}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="24h Volume"
            value="$156K"
            change={{ value: "+45.2%", isPositive: true }}
            icon={<Activity className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="All-Time High"
            value="$0.2134"
            change={{ value: "-60.3%", isPositive: false }}
            icon={<Target className="h-5 w-5" />}
          />
          
          <CryptoMetricCard
            title="Volatility"
            value="18.7%"
            change={{ value: "+2.1%", isPositive: true }}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        {/* Middle Row - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PriceChart />
          </div>
          
          <CryptoMetricCard
            title="All-Time High Tracker"
            value="$0.2134"
            change={{ value: "Reached 127 days ago", isPositive: false }}
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