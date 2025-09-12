import { useState, useEffect } from 'react';

interface MetricHistory {
  holders: number[];
  transactions: number[];
  burnt: number[];
}

// Generate mock trend data for demonstration
const generateTrendData = (baseValue: number, points: number = 20): number[] => {
  const data: number[] = [];
  let current = baseValue * 0.85; // Start slightly lower
  
  for (let i = 0; i < points; i++) {
    // Add some realistic variation (±5% change)
    const variation = (Math.random() - 0.5) * 0.1;
    current = current * (1 + variation);
    
    // Ensure we trend towards the current value
    const targetInfluence = i / points;
    current = current * (1 - targetInfluence) + baseValue * targetInfluence;
    
    data.push(Math.max(0, current));
  }
  
  return data;
};

export const useMetricHistory = (
  currentHolders?: number,
  currentTransactions?: number,
  currentBurnt?: number
) => {
  const [history, setHistory] = useState<MetricHistory>({
    holders: [],
    transactions: [],
    burnt: []
  });

  useEffect(() => {
    if (currentHolders !== undefined || currentTransactions !== undefined || currentBurnt !== undefined) {
      setHistory({
        holders: currentHolders ? generateTrendData(currentHolders) : [],
        transactions: currentTransactions ? generateTrendData(currentTransactions) : [],
        burnt: currentBurnt ? generateTrendData(currentBurnt) : []
      });
    }
  }, [currentHolders, currentTransactions, currentBurnt]);

  return history;
};