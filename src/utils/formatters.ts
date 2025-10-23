/**
 * Formats a number as currency with intelligent abbreviations.
 * 
 * Rules:
 * - Billions: $1.23B
 * - Millions: $1.23M
 * - Thousands: $1.2K
 * - Small values (<$0.01): 6 decimals (e.g., $0.000123)
 * - Normal values: 4 decimals (e.g., $1.2345)
 * 
 * @param value - Number to format as currency
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234567890) // "$1.23B"
 * formatCurrency(0.000123)   // "$0.000123"
 */
export const formatCurrency = (value: number): string => {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(1)}K`;
  }
  if (value < 0.01) {
    return `$${value.toFixed(6)}`;
  }
  return `$${value.toFixed(4)}`;
};

/**
 * Formats a percentage with a sign indicator.
 * 
 * @param value - Percentage value (e.g., 5.23 for 5.23%)
 * @returns Formatted percentage with sign (e.g., "+5.23%" or "-2.45%")
 * 
 * @example
 * formatPercentage(5.23)  // "+5.23%"
 * formatPercentage(-2.45) // "-2.45%"
 */
export const formatPercentage = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

/**
 * Formats a number with intelligent abbreviations.
 * 
 * @param value - Number to format
 * @param decimals - Optional: fixed decimal places (overrides abbreviation)
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567890)     // "1.23B"
 * formatNumber(1234.5678, 2)   // "1234.57"
 */
export const formatNumber = (value: number, decimals?: number): string => {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  if (decimals !== undefined) {
    return value.toFixed(decimals);
  }
  return value.toLocaleString();
};