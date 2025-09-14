interface DailyMetric {
  date: string;
  totalHolders: number;
  transactions24h: number;
  wcoMoved24h: number;
  activeWallets: number;
  averageTransactionSize: number;
  networkActivityRate: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  wcoBurnt: number;
}

const STORAGE_KEY = 'wco_daily_metrics';
const MAX_DAYS = 30;

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

export const getDailyComparison = (currentMetrics: Omit<DailyMetric, 'date'>) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dailyData: DailyMetric[] = stored ? JSON.parse(stored) : [];
    
    if (dailyData.length < 2) return null;
    
    // Get yesterday's data (most recent after today)
    const sorted = dailyData.sort((a, b) => b.date.localeCompare(a.date));
    const yesterday = sorted[1]; // Index 0 would be today, 1 is yesterday
    
    if (!yesterday) return null;
    
    return {
      totalHolders: {
        change: currentMetrics.totalHolders - yesterday.totalHolders,
        percentage: yesterday.totalHolders > 0 ? ((currentMetrics.totalHolders - yesterday.totalHolders) / yesterday.totalHolders) * 100 : 0
      },
      transactions24h: {
        change: currentMetrics.transactions24h - yesterday.transactions24h,
        percentage: yesterday.transactions24h > 0 ? ((currentMetrics.transactions24h - yesterday.transactions24h) / yesterday.transactions24h) * 100 : 0
      },
      wcoMoved24h: {
        change: currentMetrics.wcoMoved24h - yesterday.wcoMoved24h,
        percentage: yesterday.wcoMoved24h > 0 ? ((currentMetrics.wcoMoved24h - yesterday.wcoMoved24h) / yesterday.wcoMoved24h) * 100 : 0
      },
      activeWallets: {
        change: currentMetrics.activeWallets - yesterday.activeWallets,
        percentage: yesterday.activeWallets > 0 ? ((currentMetrics.activeWallets - yesterday.activeWallets) / yesterday.activeWallets) * 100 : 0
      },
      averageTransactionSize: {
        change: currentMetrics.averageTransactionSize - yesterday.averageTransactionSize,
        percentage: yesterday.averageTransactionSize > 0 ? ((currentMetrics.averageTransactionSize - yesterday.averageTransactionSize) / yesterday.averageTransactionSize) * 100 : 0
      },
      networkActivityRate: {
        change: currentMetrics.networkActivityRate - yesterday.networkActivityRate,
        percentage: yesterday.networkActivityRate > 0 ? ((currentMetrics.networkActivityRate - yesterday.networkActivityRate) / yesterday.networkActivityRate) * 100 : 0
      },
      marketCap: {
        change: currentMetrics.marketCap - yesterday.marketCap,
        percentage: yesterday.marketCap > 0 ? ((currentMetrics.marketCap - yesterday.marketCap) / yesterday.marketCap) * 100 : 0
      },
      volume24h: {
        change: currentMetrics.volume24h - yesterday.volume24h,
        percentage: yesterday.volume24h > 0 ? ((currentMetrics.volume24h - yesterday.volume24h) / yesterday.volume24h) * 100 : 0
      },
      circulatingSupply: {
        change: currentMetrics.circulatingSupply - yesterday.circulatingSupply,
        percentage: yesterday.circulatingSupply > 0 ? ((currentMetrics.circulatingSupply - yesterday.circulatingSupply) / yesterday.circulatingSupply) * 100 : 0
      },
      wcoBurnt: {
        change: currentMetrics.wcoBurnt - yesterday.wcoBurnt,
        percentage: yesterday.wcoBurnt > 0 ? ((currentMetrics.wcoBurnt - yesterday.wcoBurnt) / yesterday.wcoBurnt) * 100 : 0
      }
    };
  } catch (error) {
    console.warn('Failed to get daily comparison:', error);
    return null;
  }
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
