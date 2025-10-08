import { WSwapTrades } from '@/components/WSwapTrades';
import { ArrowLeftRight } from 'lucide-react';

export default function WSwap() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">W-Swap Live Trades</h1>
        </div>
        <p className="text-muted-foreground">
          Real-time trading activity across all W-Swap liquidity pools. Monitor buys, sells, and market trends.
        </p>
      </div>

      {/* Main Component */}
      <WSwapTrades />
    </div>
  );
}
