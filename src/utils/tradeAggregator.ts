import { WSwapTrade } from '@/types/wswap';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | 'all';

export interface AggregatedTrade {
  time: string;
  timestamp: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  tradeCount: number;
  avgPrice: number;
}

/**
 * Calculates the time interval for aggregation buckets.
 * 
 * Bucket sizes:
 * - 1h: 5-minute buckets (12 buckets)
 * - 6h: 15-minute buckets (24 buckets)
 * - 24h: 1-hour buckets (24 buckets)
 * - 7d: 6-hour buckets (28 buckets)
 * - all: 1-day buckets
 * 
 * @param range - Time range for aggregation
 * @returns Interval in milliseconds
 */
const getIntervalMs = (range: TimeRange): number => {
  switch (range) {
    case '1h':
      return 5 * 60 * 1000; // 5 minutes
    case '6h':
      return 15 * 60 * 1000; // 15 minutes
    case '24h':
      return 60 * 60 * 1000; // 1 hour
    case '7d':
      return 6 * 60 * 60 * 1000; // 6 hours
    case 'all':
      return 24 * 60 * 60 * 1000; // 1 day
    default:
      return 60 * 60 * 1000;
  }
};

// Get cutoff timestamp for time range
export const getTimeRangeCutoff = (range: TimeRange): number => {
  const now = Date.now();
  switch (range) {
    case '1h':
      return now - 60 * 60 * 1000;
    case '6h':
      return now - 6 * 60 * 60 * 1000;
    case '24h':
      return now - 24 * 60 * 60 * 1000;
    case '7d':
      return now - 7 * 24 * 60 * 60 * 1000;
    case 'all':
      return 0;
    default:
      return now - 24 * 60 * 60 * 1000;
  }
};

// Format time label based on range
const formatTimeLabel = (timestamp: number, range: TimeRange): string => {
  const date = new Date(timestamp);
  
  switch (range) {
    case '1h':
    case '6h':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case '24h':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case '7d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
    case 'all':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    default:
      return date.toLocaleTimeString();
  }
};

/**
 * Aggregates WSwap trades into time buckets for chart visualization.
 * 
 * Process:
 * 1. Filter trades by time range cutoff
 * 2. Group trades into time buckets (e.g., 5-min intervals for 1h view)
 * 3. Calculate metrics for each bucket:
 *    - Total volume (buy + sell)
 *    - Buy vs sell volume
 *    - Trade count
 *    - Average price (only from trades with valid price data)
 * 4. Sort by timestamp ascending
 * 
 * @param trades - Array of WSwap trades
 * @param timeRange - Time range for aggregation
 * @returns Array of aggregated trade data for charting
 * 
 * @example
 * const aggregated = aggregateTrades(trades, '24h');
 * // Returns hourly buckets for the last 24 hours
 */
export const aggregateTrades = (trades: WSwapTrade[], timeRange: TimeRange): AggregatedTrade[] => {
  if (trades.length === 0) return [];

  const cutoffTime = getTimeRangeCutoff(timeRange);
  const intervalMs = getIntervalMs(timeRange);

  // Filter trades by time range
  const filteredTrades = trades.filter(trade => trade.timestamp * 1000 >= cutoffTime);

  if (filteredTrades.length === 0) return [];

  // Group trades into time buckets
  const buckets = new Map<number, WSwapTrade[]>();
  
  // Each bucket represents one interval (e.g., 5 minutes, 1 hour)
  filteredTrades.forEach(trade => {
    const tradeTime = trade.timestamp * 1000;
    // Calculate bucket start time (floor to nearest interval)
    const bucketTime = Math.floor(tradeTime / intervalMs) * intervalMs;
    
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, []);
    }
    buckets.get(bucketTime)!.push(trade);
  });

  // Aggregate data for each bucket
  const aggregated: AggregatedTrade[] = [];

  buckets.forEach((bucketTrades, bucketTime) => {
    const buyTrades = bucketTrades.filter(t => t.type === 'buy');
    const sellTrades = bucketTrades.filter(t => t.type === 'sell');
    
    const buyVolume = buyTrades.reduce((sum, t) => sum + t.amount, 0);
    const sellVolume = sellTrades.reduce((sum, t) => sum + t.amount, 0);
    const totalVolume = buyVolume + sellVolume;
    
    // Calculate average price (only from trades that have price)
    const tradesWithPrice = bucketTrades.filter(t => t.price !== null && t.price > 0);
    const avgPrice = tradesWithPrice.length > 0
      ? tradesWithPrice.reduce((sum, t) => sum + t.price!, 0) / tradesWithPrice.length
      : 0;

    aggregated.push({
      time: formatTimeLabel(bucketTime, timeRange),
      timestamp: bucketTime,
      totalVolume,
      buyVolume,
      sellVolume,
      tradeCount: bucketTrades.length,
      avgPrice
    });
  });

  // Sort by timestamp
  return aggregated.sort((a, b) => a.timestamp - b.timestamp);
};
