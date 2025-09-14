// Formatters that show exact numbers without K/M abbreviations
export const formatExactNumber = (value: number): string => {
  return Math.round(value).toLocaleString('en-US');
};

export const formatExactCurrency = (value: number): string => {
  return `$${Math.round(value).toLocaleString('en-US')}`;
};

export const formatExactWCO = (value: number): string => {
  return `${Math.round(value).toLocaleString('en-US')} WCO`;
};

export const getChangeIndicator = (change: number): string => {
  if (Math.abs(change) < 0.01) return "⚪";
  return change > 0 ? "🟢" : "🔴";
};

export const formatReportChange = (change: number, isPercentage: boolean = false): string => {
  if (Math.abs(change) < 0.01) return "(0)";
  
  const sign = change >= 0 ? "+" : "";
  if (isPercentage) {
    return `(${sign}${change.toFixed(1)}%)`;
  }
  
  if (Math.abs(change) >= 1000000) {
    return `(${sign}${(change / 1000000).toFixed(1)}M)`;
  } else if (Math.abs(change) >= 1000) {
    return `(${sign}${(change / 1000).toFixed(1)}K)`;
  } else {
    return `(${sign}${Math.round(change)})`;
  }
};