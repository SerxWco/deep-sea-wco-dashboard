import { supabase } from '@/integrations/supabase/client';

export interface DailyMetric {
  date: string;
  totalHolders: number;
  transactions24h: number;
  wcoMoved24h: number;
  marketCap: number;
  circulatingSupply: number;
  wcoBurntTotal: number;
  wcoBurnt24h: number;
  activeWallets: number;
  averageTransactionSize: number;
  networkActivityRate: number;
}

const STORAGE_KEY = 'wco_daily_metrics';
const MAX_DAYS = 30;

// Legacy localStorage functions (kept as fallback)
export const saveDailyMetrics = (metrics: Omit<DailyMetric, 'date'>) => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dailyData: DailyMetric[] = stored ? JSON.parse(stored) : [];
    
    // Remove today's entry if it exists
    const filtered = dailyData.filter(item => item.date !== today);
    
    // Add today's metrics
    filtered.push({ ...metrics, date: today });
    
    // Keep only the last MAX_DAYS
    const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_DAYS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch (error) {
    console.warn('Failed to save daily metrics:', error);
  }
};

// New Supabase-based functions
export const getLatestSnapshot = async (): Promise<DailyMetric | null> => {
  try {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('No snapshot data available:', error);
      return null;
    }

    return {
      date: data.snapshot_date,
      totalHolders: data.total_holders || 0,
      transactions24h: data.transactions_24h || 0,
      wcoMoved24h: Number(data.wco_moved_24h) || 0,
      marketCap: Number(data.market_cap) || 0,
      circulatingSupply: Number(data.circulating_supply) || 0,
      wcoBurntTotal: Number(data.wco_burnt_total) || 0,
      wcoBurnt24h: Number(data.wco_burnt_24h) || 0,
      activeWallets: data.active_wallets || 0,
      averageTransactionSize: Number(data.average_transaction_size) || 0,
      networkActivityRate: Number(data.network_activity_rate) || 0,
    };
  } catch (error) {
    console.warn('Failed to get latest snapshot:', error);
    return null;
  }
};

export const getPreviousSnapshot = async (): Promise<DailyMetric | null> => {
  try {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(2);

    if (error || !data || data.length < 2) {
      console.warn('Not enough snapshot data for comparison:', error);
      return null;
    }

    const previousData = data[1];
    return {
      date: previousData.snapshot_date,
      totalHolders: previousData.total_holders || 0,
      transactions24h: previousData.transactions_24h || 0,
      wcoMoved24h: Number(previousData.wco_moved_24h) || 0,
      marketCap: Number(previousData.market_cap) || 0,
      circulatingSupply: Number(previousData.circulating_supply) || 0,
      wcoBurntTotal: Number(previousData.wco_burnt_total) || 0,
      wcoBurnt24h: Number(previousData.wco_burnt_24h) || 0,
      activeWallets: previousData.active_wallets || 0,
      averageTransactionSize: Number(previousData.average_transaction_size) || 0,
      networkActivityRate: Number(previousData.network_activity_rate) || 0,
    };
  } catch (error) {
    console.warn('Failed to get previous snapshot:', error);
    return null;
  }
};

/**
 * Compares current metrics with the previous day's snapshot.
 * 
 * Data sources (in priority order):
 * 1. Supabase daily_metrics table (primary)
 * 2. localStorage (fallback for backward compatibility)
 * 
 * Calculates both absolute and percentage changes for:
 * - Total holders
 * - Market cap
 * - Transaction count
 * - Supply metrics
 * - Network activity
 * 
 * @param currentMetrics - Today's metrics (without date field)
 * @returns Object with change values and percentages for all metrics
 * 
 * @example
 * const comparison = await getDailyComparison({
 *   totalHolders: 15000,
 *   marketCap: 1234567,
 *   // ...
 * });
 * if (comparison) {
 *   console.log(`Holders change: ${comparison.totalHolders.change}`);
 * }
 */
export const getDailyComparison = async (currentMetrics: Omit<DailyMetric, 'date'>) => {
  try {
    // Try to get comparison from Supabase first
    const previousSnapshot = await getPreviousSnapshot();
    
    if (previousSnapshot) {
      return calculateChanges(currentMetrics, previousSnapshot);
    }

    // Fallback to localStorage for backward compatibility
    const stored = localStorage.getItem(STORAGE_KEY);
    const dailyData: DailyMetric[] = stored ? JSON.parse(stored) : [];
    
    if (dailyData.length < 2) return null;
    
    // Get yesterday's data (most recent after today)
    const sorted = dailyData.sort((a, b) => b.date.localeCompare(a.date));
    const yesterday = sorted[1]; // Index 0 would be today, 1 is yesterday
    
    if (!yesterday) return null;
    
    return calculateChanges(currentMetrics, yesterday);
  } catch (error) {
    console.warn('Failed to get daily comparison:', error);
    return null;
  }
};

/**
 * Calculates the difference between current and previous metrics.
 * 
 * For each metric, returns:
 * - change: Absolute difference (current - previous)
 * - percentage: Percentage change ((current - previous) / previous * 100)
 * 
 * Zero division is handled by returning 0% for metrics with no previous value.
 * 
 * @param current - Current metrics
 * @param previous - Previous day's metrics
 * @returns Object with change and percentage for each metric
 */
const calculateChanges = (current: Omit<DailyMetric, 'date'>, previous: DailyMetric) => {
  return {
    totalHolders: {
      change: current.totalHolders - previous.totalHolders,
      percentage: previous.totalHolders > 0 ? ((current.totalHolders - previous.totalHolders) / previous.totalHolders) * 100 : 0
    },
    transactions24h: {
      change: current.transactions24h - previous.transactions24h,
      percentage: previous.transactions24h > 0 ? ((current.transactions24h - previous.transactions24h) / previous.transactions24h) * 100 : 0
    },
    wcoMoved24h: {
      change: current.wcoMoved24h - previous.wcoMoved24h,
      percentage: previous.wcoMoved24h > 0 ? ((current.wcoMoved24h - previous.wcoMoved24h) / previous.wcoMoved24h) * 100 : 0
    },
    activeWallets: {
      change: current.activeWallets - previous.activeWallets,
      percentage: previous.activeWallets > 0 ? ((current.activeWallets - previous.activeWallets) / previous.activeWallets) * 100 : 0
    },
    averageTransactionSize: {
      change: current.averageTransactionSize - previous.averageTransactionSize,
      percentage: previous.averageTransactionSize > 0 ? ((current.averageTransactionSize - previous.averageTransactionSize) / previous.averageTransactionSize) * 100 : 0
    },
    networkActivityRate: {
      change: current.networkActivityRate - previous.networkActivityRate,
      percentage: previous.networkActivityRate > 0 ? ((current.networkActivityRate - previous.networkActivityRate) / previous.networkActivityRate) * 100 : 0
    },
    marketCap: {
      change: current.marketCap - previous.marketCap,
      percentage: previous.marketCap > 0 ? ((current.marketCap - previous.marketCap) / previous.marketCap) * 100 : 0
    },
    circulatingSupply: {
      change: current.circulatingSupply - previous.circulatingSupply,
      percentage: previous.circulatingSupply > 0 ? ((current.circulatingSupply - previous.circulatingSupply) / previous.circulatingSupply) * 100 : 0
    },
    wcoBurntTotal: {
      change: current.wcoBurntTotal - previous.wcoBurntTotal,
      percentage: previous.wcoBurntTotal > 0 ? ((current.wcoBurntTotal - previous.wcoBurntTotal) / previous.wcoBurntTotal) * 100 : 0
    },
    wcoBurnt24h: {
      change: current.wcoBurnt24h - previous.wcoBurnt24h,
      percentage: previous.wcoBurnt24h > 0 ? ((current.wcoBurnt24h - previous.wcoBurnt24h) / previous.wcoBurnt24h) * 100 : 0
    }
  };
};

export const formatDailyChange = (change: number, showPercentage = false): { value: string; isPositive: boolean } => {
  if (Math.abs(change) < 0.01) {
    return { value: "0", isPositive: true };
  }
  
  const isPositive = change >= 0;
  const sign = isPositive ? "+" : "-";
  const absValue = Math.abs(change);
  
  let formatted: string;
  if (showPercentage) {
    formatted = `${sign}${absValue.toFixed(1)}%`;
  } else if (absValue >= 1000000) {
    formatted = `${sign}${(absValue / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    formatted = `${sign}${(absValue / 1000).toFixed(1)}K`;
  } else if (absValue >= 100) {
    formatted = `${sign}${Math.round(absValue)}`;
  } else {
    formatted = `${sign}${absValue.toFixed(1)}`;
  }
  
  return { value: formatted, isPositive };
};
