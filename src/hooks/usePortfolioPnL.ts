import { useMemo } from 'react';
import { TokenBalance } from '@/types/token';
import { usePortfolioHistory, PortfolioSnapshot } from './usePortfolioHistory';

export interface PnLMetrics {
  totalValue: number;
  sinceConnectionPnL: number;
  sinceConnectionPnLPercent: number;
  oneDayPnL: number;
  oneDayPnLPercent: number;
  sevenDayPnL: number;
  sevenDayPnLPercent: number;
  thirtyDayPnL: number;
  thirtyDayPnLPercent: number;
  bestPerformingToken: { symbol: string; change: number } | null;
  worstPerformingToken: { symbol: string; change: number } | null;
}

interface UsePortfolioPnLReturn {
  metrics: PnLMetrics;
  loading: boolean;
  error: string | null;
  chartData: Array<{ date: string; value: number }>;
}

const getSnapshotByDaysAgo = (snapshots: PortfolioSnapshot[], daysAgo: number): PortfolioSnapshot | null => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  return snapshots.find(snapshot => snapshot.snapshot_date === targetDateStr) || null;
};

const calculatePnL = (currentValue: number, pastValue: number) => {
  if (pastValue === 0) return { absolute: 0, percent: 0 };
  const absolute = currentValue - pastValue;
  const percent = (absolute / pastValue) * 100;
  return { absolute, percent };
};

export const usePortfolioPnL = (
  balances: TokenBalance[], 
  walletAddress: string | null,
  userId: string | null
): UsePortfolioPnLReturn => {
  const { snapshots, loading, error } = usePortfolioHistory(walletAddress, userId);

  const metrics = useMemo((): PnLMetrics => {
    // Calculate current total value
    const currentValue = balances.reduce((sum, balance) => {
      const priceValue = parseFloat(balance.token.exchange_rate || '0');
      if (priceValue > 0) {
        return sum + (priceValue * balance.balanceInEth);
      }
      return sum + (balance.usdValue || 0);
    }, 0);

    // Get historical snapshots
    const oldestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const oneDaySnapshot = getSnapshotByDaysAgo(snapshots, 1);
    const sevenDaySnapshot = getSnapshotByDaysAgo(snapshots, 7);
    const thirtyDaySnapshot = getSnapshotByDaysAgo(snapshots, 30);

    // Calculate PnL metrics
    const sinceConnection = oldestSnapshot 
      ? calculatePnL(currentValue, oldestSnapshot.total_value_usd)
      : { absolute: 0, percent: 0 };

    const oneDay = oneDaySnapshot 
      ? calculatePnL(currentValue, oneDaySnapshot.total_value_usd)
      : { absolute: 0, percent: 0 };

    const sevenDay = sevenDaySnapshot 
      ? calculatePnL(currentValue, sevenDaySnapshot.total_value_usd)
      : { absolute: 0, percent: 0 };

    const thirtyDay = thirtyDaySnapshot 
      ? calculatePnL(currentValue, thirtyDaySnapshot.total_value_usd)
      : { absolute: 0, percent: 0 };

    // Find best/worst performing tokens (based on 24h change if available)
    const tokensWithPerformance = balances
      .map(balance => ({
        symbol: balance.token.symbol,
        change: 0 // Would need historical token prices to calculate this properly
      }))
      .filter(token => token.change !== 0)
      .sort((a, b) => b.change - a.change);

    const bestPerformingToken = tokensWithPerformance.length > 0 ? tokensWithPerformance[0] : null;
    const worstPerformingToken = tokensWithPerformance.length > 0 
      ? tokensWithPerformance[tokensWithPerformance.length - 1] 
      : null;

    return {
      totalValue: currentValue,
      sinceConnectionPnL: sinceConnection.absolute,
      sinceConnectionPnLPercent: sinceConnection.percent,
      oneDayPnL: oneDay.absolute,
      oneDayPnLPercent: oneDay.percent,
      sevenDayPnL: sevenDay.absolute,
      sevenDayPnLPercent: sevenDay.percent,
      thirtyDayPnL: thirtyDay.absolute,
      thirtyDayPnLPercent: thirtyDay.percent,
      bestPerformingToken,
      worstPerformingToken
    };
  }, [balances, snapshots]);

  const chartData = useMemo(() => {
    return snapshots
      .slice(-30) // Last 30 days
      .reverse()
      .map(snapshot => ({
        date: snapshot.snapshot_date,
        value: snapshot.total_value_usd
      }));
  }, [snapshots]);

  return {
    metrics,
    loading,
    error,
    chartData
  };
};