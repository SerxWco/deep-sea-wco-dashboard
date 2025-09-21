import { useWChainPriceAPI } from "@/hooks/useWChainPriceAPI";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { CryptoMetricCard } from "@/components/CryptoMetricCard";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { Waves, TrendingUp } from "lucide-react";

export default function Wave() {
  const { wavePrice, loading: priceLoading } = useWChainPriceAPI();
  const { waveHistory, getLatestChange } = usePriceHistory();

  const waveChange = getLatestChange('wave');
  const currentPrice = wavePrice?.price || 0;

  return (
    <div className="min-h-screen bg-ocean-gradient p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/20 rounded-xl">
          <Waves className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">WAVE Analytics</h1>
          <p className="text-muted-foreground">Real-time WAVE token metrics and price analysis</p>
        </div>
      </div>

      {/* Price Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CryptoMetricCard
          title="WAVE Price"
          value={priceLoading ? "Loading..." : formatCurrency(currentPrice)}
          change={waveChange ? {
            value: formatPercentage(waveChange.percentage),
            isPositive: waveChange.percentage >= 0
          } : undefined}
          icon={<Waves className="h-5 w-5" />}
        />
        
        <CryptoMetricCard
          title="24h Change"
          value={waveChange ? formatCurrency(Math.abs(waveChange.absolute)) : "N/A"}
          change={waveChange ? {
            value: formatPercentage(waveChange.percentage),
            isPositive: waveChange.percentage >= 0
          } : undefined}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>


      {/* Additional Info */}
      <div className="glass-ocean rounded-2xl p-6 border border-border/30">
        <h3 className="text-lg font-semibold text-foreground mb-4">About WAVE Token</h3>
        <div className="space-y-2 text-muted-foreground">
          <p>• WAVE is a native token on the W-Chain ecosystem</p>
          <p>• Price data is collected from W-Chain Oracle API every 15 minutes</p>
          <p>• Historical data builds up over time to provide meaningful chart analysis</p>
          <p>• Data is stored locally in your browser for fast access</p>
        </div>
      </div>
    </div>
  );
}