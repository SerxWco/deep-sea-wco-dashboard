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

  // Refresh data from Supabase periodically (server handles collection)
  useEffect(() => {
    const refreshData = async () => {
      try {
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
        }
      } catch (error) {
        console.warn('Failed to refresh price history from Supabase:', error);
      }
    };

    // Refresh every 5 minutes to get latest server-collected data
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

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
    isCollecting: true // Server-side collection is always active
  };
};