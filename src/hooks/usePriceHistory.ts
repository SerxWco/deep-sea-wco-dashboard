import { useState, useEffect, useCallback } from 'react';
import { useWChainPriceAPI } from './useWChainPriceAPI';
import { useOG88Price } from './useOG88Price';
import { supabase } from '@/integrations/supabase/client';

interface PriceHistoryEntry {
  timestamp: number;
  wco_price: number;
  wave_price: number;
  og88_price?: number;
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
  const [og88History, setOG88History] = useState<PriceHistoryEntry[]>([]);
  const { wcoPrice, wavePrice } = useWChainPriceAPI();
  const { og88Price } = useOG88Price();

  // Load history from Supabase and localStorage on mount
  useEffect(() => {
    const loadHistoryData = async () => {
      try {
        // First try to load from Supabase
        const { data: supabaseData, error } = await supabase
          .from('price_history')
          .select('timestamp, wco_price, wave_price, og88_price, source')
          .order('timestamp', { ascending: true })
          .limit(MAX_ENTRIES);

        if (!error && supabaseData && supabaseData.length > 0) {
          const formattedData: PriceHistoryEntry[] = supabaseData.map(entry => ({
            timestamp: new Date(entry.timestamp).getTime(),
            wco_price: parseFloat(String(entry.wco_price || '0')),
            wave_price: parseFloat(String(entry.wave_price || '0')),
            og88_price: entry.og88_price ? parseFloat(String(entry.og88_price)) : undefined,
            source: entry.source as 'w-chain-api'
          })).filter(entry => entry.wco_price > 0 && entry.wave_price > 0);

          setWcoHistory(formattedData);
          setWaveHistory(formattedData);
          setOG88History(formattedData);
          
          // Cache in localStorage for faster subsequent loads
          localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedData));
          return;
        }
      } catch (error) {
        console.warn('Failed to load price history from Supabase:', error);
      }

      // Fallback to localStorage if Supabase fails
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
          setOG88History(validData);
        } catch (error) {
          console.warn('Failed to parse price history from localStorage:', error);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    loadHistoryData();
  }, []);

  // Save to both Supabase and localStorage
  const saveToStorage = useCallback(async (history: PriceHistoryEntry[]) => {
    try {
      // Keep only recent entries to prevent storage bloat
      const cutoffTime = Date.now() - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      const recentHistory = history
        .filter(entry => entry.timestamp > cutoffTime)
        .slice(-MAX_ENTRIES)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // Save to localStorage for fast access
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentHistory));
      setWcoHistory(recentHistory);
      setWaveHistory(recentHistory);
      setOG88History(recentHistory);
    } catch (error) {
      console.warn('Failed to save price history to localStorage:', error);
    }
  }, []);

  // Save new price entry to Supabase
  const savePriceToSupabase = useCallback(async (entry: PriceHistoryEntry) => {
    try {
      const { error } = await supabase
        .from('price_history')
        .insert({
          timestamp: new Date(entry.timestamp).toISOString(),
          wco_price: entry.wco_price,
          wave_price: entry.wave_price,
          og88_price: entry.og88_price || null,
          source: entry.source
        });

      if (error) {
        console.warn('Failed to save price data to Supabase:', error);
      }
    } catch (error) {
      console.warn('Error saving to Supabase:', error);
    }
  }, []);

  // Collect price data
  const collectPriceData = useCallback(() => {
    if (!wcoPrice?.price || !wavePrice?.price) return;

    const newEntry: PriceHistoryEntry = {
      timestamp: Date.now(),
      wco_price: wcoPrice.price,
      wave_price: wavePrice.price,
      og88_price: og88Price?.price,
      source: 'w-chain-api'
    };

    // Save to Supabase first
    savePriceToSupabase(newEntry);

    setWcoHistory(prev => {
      const updated = [...prev, newEntry];
      saveToStorage(updated);
      return updated.slice(-MAX_ENTRIES);
    });
  }, [wcoPrice?.price, wavePrice?.price, og88Price?.price, saveToStorage, savePriceToSupabase]);

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
  const getLatestChange = useCallback((token: 'wco' | 'wave' | 'og88'): PriceChange | null => {
    const history = token === 'wco' ? wcoHistory : token === 'wave' ? waveHistory : og88History;
    const currentPrice = token === 'wco' ? wcoPrice?.price : token === 'wave' ? wavePrice?.price : og88Price?.price;
    
    if (!currentPrice || history.length < 2) return null;

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    
    if (!latest || !previous) return null;

    const priceKey = token === 'wco' ? 'wco_price' : token === 'wave' ? 'wave_price' : 'og88_price';
    const oldPrice = previous[priceKey];
    const newPrice = latest[priceKey];
    
    if (!oldPrice || !newPrice) return null;
    
    const absolute = newPrice - oldPrice;
    const percentage = (absolute / oldPrice) * 100;

    return { absolute, percentage };
  }, [wcoHistory, waveHistory, og88History, wcoPrice?.price, wavePrice?.price, og88Price?.price]);

  // Get price data for charts
  const getChartData = useCallback((token: 'wco' | 'wave' | 'og88') => {
    const history = token === 'wco' ? wcoHistory : token === 'wave' ? waveHistory : og88History;
    const priceKey = token === 'wco' ? 'wco_price' : token === 'wave' ? 'wave_price' : 'og88_price';
    
    return history
      .filter(entry => entry[priceKey] !== undefined)
      .map(entry => ({
        timestamp: entry.timestamp,
        price: entry[priceKey]!,
        time: new Date(entry.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));
  }, [wcoHistory, waveHistory, og88History]);

  return {
    wcoHistory,
    waveHistory,
    og88History,
    getLatestChange,
    getChartData,
    isCollecting: !!wcoPrice?.price && !!wavePrice?.price
  };
};
