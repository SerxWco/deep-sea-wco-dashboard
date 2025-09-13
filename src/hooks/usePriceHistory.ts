import { useState, useEffect, useCallback } from 'react';
import { useWChainPriceAPI } from './useWChainPriceAPI';

interface PriceHistoryEntry {
  timestamp: number;
  wco_price: number;
  wave_price: number;
  source: 'w-chain-api';
}

interface PriceChange {
  absolute: number;
  percentage: number;
}

const STORAGE_KEY = 'wchain_price_history';
const COLLECTION_INTERVAL = 15 * 60 * 1000; // 15 minutes
const MAX_HISTORY_DAYS = 7;
const MAX_ENTRIES = (MAX_HISTORY_DAYS * 24 * 60) / 15; // 7 days of 15-minute intervals

export const usePriceHistory = () => {
  const [wcoHistory, setWcoHistory] = useState<PriceHistoryEntry[]>([]);
  const [waveHistory, setWaveHistory] = useState<PriceHistoryEntry[]>([]);
  const { wcoPrice, wavePrice } = useWChainPriceAPI();

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: PriceHistoryEntry[] = JSON.parse(stored);
        const validData = data.filter(entry => 
          entry.timestamp && 
          typeof entry.wco_price === 'number' && 
          typeof entry.wave_price === 'number'
        );
        setWcoHistory(validData);
        setWaveHistory(validData);
      } catch (error) {
        console.warn('Failed to parse price history from localStorage:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save to localStorage whenever history changes
  const saveToStorage = useCallback((history: PriceHistoryEntry[]) => {
    try {
      // Keep only recent entries to prevent storage bloat
      const cutoffTime = Date.now() - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      const recentHistory = history
        .filter(entry => entry.timestamp > cutoffTime)
        .slice(-MAX_ENTRIES)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentHistory));
      setWcoHistory(recentHistory);
      setWaveHistory(recentHistory);
    } catch (error) {
      console.warn('Failed to save price history to localStorage:', error);
    }
  }, []);

  // Collect price data
  const collectPriceData = useCallback(() => {
    if (!wcoPrice?.price || !wavePrice?.price) return;

    const newEntry: PriceHistoryEntry = {
      timestamp: Date.now(),
      wco_price: wcoPrice.price,
      wave_price: wavePrice.price,
      source: 'w-chain-api'
    };

    setWcoHistory(prev => {
      const updated = [...prev, newEntry];
      saveToStorage(updated);
      return updated.slice(-MAX_ENTRIES);
    });
  }, [wcoPrice?.price, wavePrice?.price, saveToStorage]);

  // Set up collection interval
  useEffect(() => {
    // Collect immediately if we have prices
    if (wcoPrice?.price && wavePrice?.price) {
      collectPriceData();
    }

    // Set up interval for regular collection
    const interval = setInterval(collectPriceData, COLLECTION_INTERVAL);
    
    return () => clearInterval(interval);
  }, [collectPriceData]);

  // Calculate price changes
  const getLatestChange = useCallback((token: 'wco' | 'wave'): PriceChange | null => {
    const history = token === 'wco' ? wcoHistory : waveHistory;
    const currentPrice = token === 'wco' ? wcoPrice?.price : wavePrice?.price;
    
    if (!currentPrice || history.length < 2) return null;

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    if (!latest || !previous) return null;

    const priceKey = token === 'wco' ? 'wco_price' : 'wave_price';
    const oldPrice = previous[priceKey];
    const newPrice = latest[priceKey];
    
    const absolute = newPrice - oldPrice;
    const percentage = (absolute / oldPrice) * 100;

    return { absolute, percentage };
  }, [wcoHistory, waveHistory, wcoPrice?.price, wavePrice?.price]);

  // Get price data for charts
  const getChartData = useCallback((token: 'wco' | 'wave') => {
    const history = token === 'wco' ? wcoHistory : waveHistory;
    const priceKey = token === 'wco' ? 'wco_price' : 'wave_price';
    
    return history.map(entry => ({
      timestamp: entry.timestamp,
      price: entry[priceKey],
      time: new Date(entry.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }));
  }, [wcoHistory, waveHistory]);

  return {
    wcoHistory,
    waveHistory,
    getLatestChange,
    getChartData,
    isCollecting: !!wcoPrice?.price && !!wavePrice?.price
  };
};
