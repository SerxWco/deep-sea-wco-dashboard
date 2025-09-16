import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PriceData {
  wco_price: number;
  wave_price: number;
  og88_price?: number;
}

async function collectPrices(): Promise<PriceData> {
  console.log('Starting price collection...');
  
  const prices: Partial<PriceData> = {};
  
  try {
    // Fetch WCO price
    console.log('Fetching WCO price...');
    const wcoResponse = await fetch('https://oracle-w-chain.com/api/wco/price');
    if (wcoResponse.ok) {
      const wcoData = await wcoResponse.json();
      console.log('WCO price data:', wcoData);
      prices.wco_price = parseFloat(wcoData.price) || 0;
    } else {
      console.error('Failed to fetch WCO price:', wcoResponse.status, wcoResponse.statusText);
    }
  } catch (error) {
    console.error('Error fetching WCO price:', error);
  }

  try {
    // Fetch WAVE price
    console.log('Fetching WAVE price...');
    const waveResponse = await fetch('https://oracle-w-chain.com/api/wave/price');
    if (waveResponse.ok) {
      const waveData = await waveResponse.json();
      console.log('WAVE price data:', waveData);
      prices.wave_price = parseFloat(waveData.price) || 0;
    } else {
      console.error('Failed to fetch WAVE price:', waveResponse.status, waveResponse.statusText);
    }
  } catch (error) {
    console.error('Error fetching WAVE price:', error);
  }

  try {
    // Fetch OG88 price (optional)
    console.log('Fetching OG88 price...');
    const og88Response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=og88&vs_currencies=usd');
    if (og88Response.ok) {
      const og88Data = await og88Response.json();
      console.log('OG88 price data:', og88Data);
      prices.og88_price = og88Data?.og88?.usd || undefined;
    } else {
      console.log('OG88 price not available or failed to fetch');
    }
  } catch (error) {
    console.log('OG88 price not available:', error);
  }

  const result: PriceData = {
    wco_price: prices.wco_price || 0,
    wave_price: prices.wave_price || 0,
    og88_price: prices.og88_price
  };

  console.log('Collected prices:', result);
  return result;
}

async function storePrices(supabase: any, prices: PriceData) {
  console.log('Storing prices in database...');
  
  const now = new Date();
  const insertData = {
    timestamp: now.toISOString(),
    wco_price: prices.wco_price,
    wave_price: prices.wave_price,
    og88_price: prices.og88_price || null,
    source: 'w-chain-api'
  };
  
  console.log('Data to insert:', insertData);
  
  const { data, error } = await supabase
    .from('price_history')
    .insert(insertData);
  
  if (error) {
    console.error('Database error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }
  
  console.log('Prices stored successfully');
  return data;
}

async function cleanupOldPrices(supabase: any) {
  console.log('Cleaning up old price data...');
  
  // Keep only last 7 days of data
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  
  const { error } = await supabase
    .from('price_history')
    .delete()
    .lt('timestamp', cutoffDate.toISOString());
  
  if (error) {
    console.error('Error cleaning up old prices:', error);
  } else {
    console.log('Old price data cleaned up successfully');
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('Price collector function triggered');
    
    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Using Supabase URL:', SUPABASE_URL);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Collect current prices
    const prices = await collectPrices();
    
    // Only store if we have valid price data
    if (prices.wco_price > 0 && prices.wave_price > 0) {
      // Store prices in database
      await storePrices(supabase, prices);
      
      // Clean up old data (run occasionally)
      if (Math.random() < 0.1) { // 10% chance to run cleanup
        await cleanupOldPrices(supabase);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Price collection completed successfully',
          data: prices,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      throw new Error('Failed to collect valid price data');
    }
    
  } catch (error: any) {
    console.error('Price collector error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
