import { WSwapTrade, OHLCCandle, TimeInterval } from '@/types/wswap';

const INTERVAL_MS: Record<TimeInterval, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

/**
 * Aggregates individual trades into OHLC candles based on the selected time interval
 */
export const aggregateTradesIntoCandles = (
  trades: WSwapTrade[],
  interval: TimeInterval
): OHLCCandle[] => {
  if (trades.length === 0) return [];

  const intervalMs = INTERVAL_MS[interval];
  const candlesMap = new Map<number, WSwapTrade[]>();

  // Group trades by time bucket
  trades.forEach(trade => {
    const bucketTime = Math.floor((trade.timestamp * 1000) / intervalMs) * intervalMs;
    if (!candlesMap.has(bucketTime)) {
      candlesMap.set(bucketTime, []);
    }
    candlesMap.get(bucketTime)!.push(trade);
  });

  // Convert grouped trades into OHLC candles
  const candles: OHLCCandle[] = [];

  candlesMap.forEach((bucketTrades, bucketTime) => {
    // Sort trades in bucket by timestamp
    bucketTrades.sort((a, b) => a.timestamp - b.timestamp);

    // Get prices (filter out null prices)
    const validPrices = bucketTrades
      .map(t => t.price)
      .filter((p): p is number => p !== null);

    if (validPrices.length === 0) return; // Skip if no valid prices

    const open = validPrices[0];
    const close = validPrices[validPrices.length - 1];
    const high = Math.max(...validPrices);
    const low = Math.min(...validPrices);

    const volume = bucketTrades.reduce((sum, t) => sum + t.amount, 0);
    const buyVolume = bucketTrades
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + t.amount, 0);
    const sellVolume = bucketTrades
      .filter(t => t.type === 'sell')
      .reduce((sum, t) => sum + t.amount, 0);

    candles.push({
      timestamp: bucketTime / 1000,
      time: new Date(bucketTime),
      open,
      high,
      low,
      close,
      volume,
      buyVolume,
      sellVolume,
      trades: bucketTrades.length,
    });
  });

  // Sort candles by time (oldest first for chart display)
  candles.sort((a, b) => a.timestamp - b.timestamp);

  return candles;
};

/**
 * Format time label based on interval
 */
export const formatCandleTime = (date: Date, interval: TimeInterval): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  switch (interval) {
    case '1m':
    case '5m':
    case '15m':
      return `${hours}:${minutes}`;
    case '1h':
    case '4h':
      return `${hours}:00`;
    case '1d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    default:
      return `${hours}:${minutes}`;
  }
};
