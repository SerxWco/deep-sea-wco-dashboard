import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetricsData {
  totalHolders: number;
  transactions24h: number;
  wcoMoved24h: number;
  marketCap: number;
  totalVolume: number;
  circulatingSupply: number;
  wcoBurntTotal: number;
  wcoBurnt24h: number;
  activeWallets: number;
  averageTransactionSize: number;
  networkActivityRate: number;
}

async function collectMetrics(supabase: any): Promise<MetricsData> {
  console.log('Starting metrics collection...');
  
  const metrics: Partial<MetricsData> = {};
  
  try {
    // Fetch holder count from our cache using direct query
    console.log('Fetching holder count from cache...');
    const { data: holders, error: holderError } = await supabase
      .from('wallet_leaderboard_cache')
      .select('address')
      .limit(5000);
    
    if (!holderError && holders) {
      metrics.totalHolders = holders.length;
      console.log('Holder count from cache:', metrics.totalHolders);
    }
  } catch (error) {
    console.error('Error fetching holder count:', error);
  }
  
  try {
    // Fetch 24h network stats from W-Chain REST API
    console.log('Fetching 24h network stats...');
    const statsResponse = await fetch('https://scan.w-chain.com/api/v2/stats');
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('Network stats:', statsData);
      
      metrics.transactions24h = parseInt(statsData.transactions_today || '0') || 0;
    }
  } catch (error) {
    console.error('Error fetching network stats:', error);
  }
  
  try {
    // Fetch recent transactions to calculate 24h volume and active wallets
    console.log('Fetching recent transactions...');
    const txResponse = await fetch('https://scan.w-chain.com/api/v2/transactions?limit=1000');
    if (txResponse.ok) {
      const txData = await txResponse.json();
      const transactions = txData.items || [];
      
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
      
      let wcoMoved = 0;
      let txCount = 0;
      const activeWallets = new Set<string>();
      
      transactions.forEach((tx: any) => {
        const txTime = new Date(tx.timestamp).getTime();
        if (txTime >= twentyFourHoursAgo) {
          const value = parseFloat(tx.value) / 1e18;
          wcoMoved += value;
          txCount++;
          activeWallets.add(tx.from.hash.toLowerCase());
          activeWallets.add(tx.to.hash.toLowerCase());
        }
      });
      
      metrics.wcoMoved24h = wcoMoved;
      metrics.activeWallets = activeWallets.size;
      metrics.averageTransactionSize = txCount > 0 ? wcoMoved / txCount : 0;
      metrics.networkActivityRate = metrics.totalHolders ? (activeWallets.size / metrics.totalHolders) * 100 : 0;
      
      console.log('Transaction metrics:', {
        wcoMoved24h: metrics.wcoMoved24h,
        activeWallets: metrics.activeWallets,
        avgTxSize: metrics.averageTransactionSize
      });
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
  }
  
  try {
    // Fetch W-Chain price data
    console.log('Fetching W-Chain price data...');
    const priceResponse = await fetch('https://oracle.w-chain.com/api/price/wco');
    let wcoPrice = 0;
    if (priceResponse.ok) {
      const priceData = await priceResponse.json();
      console.log('W-Chain price data:', priceData);
      wcoPrice = priceData.price || 0;
    } else {
      console.error('Failed to fetch W-Chain price data:', priceResponse.status, priceResponse.statusText);
    }
    
    // Fetch W-Chain supply data
    console.log('Fetching W-Chain supply data...');
    const supplyResponse = await fetch('https://oracle.w-chain.com/api/wco/supply-info');
    let circulatingSupply = 0;
    if (supplyResponse.ok) {
      const supplyData = await supplyResponse.json();
      console.log('W-Chain supply data:', supplyData);
      circulatingSupply = parseFloat(supplyData.summary?.circulating_supply_wco) || 0;
    } else {
      console.error('Failed to fetch W-Chain supply data:', supplyResponse.status, supplyResponse.statusText);
    }
    
    // Calculate market cap using W-Chain data only
    const calculatedMarketCap = wcoPrice * circulatingSupply;
    console.log('Market cap calculation:', {
      price: wcoPrice,
      supply: circulatingSupply,
      marketCap: calculatedMarketCap
    });
    
    metrics.marketCap = calculatedMarketCap;
    metrics.circulatingSupply = circulatingSupply;
    
    // Fetch CoinGecko for volume data only
    console.log('Fetching CoinGecko volume data...');
    try {
      const coinGeckoResponse = await fetch('https://api.coingecko.com/api/v3/coins/wadzchain-token');
      if (coinGeckoResponse.ok) {
        const coinGeckoData = await coinGeckoResponse.json();
        console.log('CoinGecko volume data:', coinGeckoData.market_data?.total_volume?.usd);
        metrics.totalVolume = coinGeckoData.market_data?.total_volume?.usd || 0;
      } else {
        console.error('Failed to fetch CoinGecko data:', coinGeckoResponse.status, coinGeckoResponse.statusText);
        metrics.totalVolume = 0;
      }
    } catch (coinGeckoError) {
      console.error('CoinGecko API error:', coinGeckoError);
      metrics.totalVolume = 0;
    }
  } catch (error) {
    console.error('Error fetching market data:', error);
    metrics.marketCap = 0;
    metrics.circulatingSupply = 0;
    metrics.totalVolume = 0;
  }
  
  try {
    // Fetch burn data
    console.log('Fetching burn data...');
    const BURN_ADDRESS = '0x0000000000000000000000000000000000000000';
    const burnResponse = await fetch(`https://scan.w-chain.com/api/v2/addresses/${BURN_ADDRESS}`);
    if (burnResponse.ok) {
      const burnData = await burnResponse.json();
      console.log('Burn data:', burnData);
      
      const totalBurnt = parseFloat(burnData.coin_balance || '0') / 1e18;
      metrics.wcoBurntTotal = totalBurnt;
      
      // Fetch recent transactions to calculate 24h burn
      const txResponse = await fetch(`https://scan.w-chain.com/api/v2/addresses/${BURN_ADDRESS}/transactions?filter=to`);
      if (txResponse.ok) {
        const txData = await txResponse.json();
        const transactions = txData.items || [];
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        
        let burnt24h = 0;
        transactions.forEach((tx: any) => {
          const txTime = new Date(tx.timestamp).getTime();
          if (txTime >= oneDayAgo) {
            burnt24h += parseFloat(tx.value) / 1e18;
          }
        });
        
        metrics.wcoBurnt24h = burnt24h;
        console.log('24h burn:', burnt24h);
      }
    }
  } catch (error) {
    console.error('Error fetching burn data:', error);
  }
  
  // Fill in any missing values with defaults
  const completeMetrics: MetricsData = {
    totalHolders: metrics.totalHolders || 0,
    transactions24h: metrics.transactions24h || 0,
    wcoMoved24h: metrics.wcoMoved24h || 0,
    marketCap: metrics.marketCap || 0,
    totalVolume: metrics.totalVolume || 0,
    circulatingSupply: metrics.circulatingSupply || 0,
    wcoBurntTotal: metrics.wcoBurntTotal || 0,
    wcoBurnt24h: metrics.wcoBurnt24h || 0,
    activeWallets: metrics.activeWallets || 0,
    averageTransactionSize: metrics.averageTransactionSize || 0,
    networkActivityRate: metrics.networkActivityRate || 0,
  };
  
  console.log('Complete metrics:', completeMetrics);
  return completeMetrics;
}

async function storeSnapshot(supabase: any, metrics: MetricsData) {
  console.log('Storing snapshot in database...');
  console.log('Metrics to store:', metrics);
  
  // Get current date in CET timezone for snapshot_date
  const now = new Date();
  const cetDate = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Europe/Berlin', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(now);
  
  console.log('Snapshot date (CET):', cetDate);
  console.log('Snapshot time (UTC):', now.toISOString());
  
  const insertData = {
    snapshot_date: cetDate,
    snapshot_time: now.toISOString(),
    total_holders: metrics.totalHolders,
    transactions_24h: metrics.transactions24h,
    wco_moved_24h: metrics.wcoMoved24h,
    market_cap: metrics.marketCap,
    total_volume: metrics.totalVolume,
    circulating_supply: metrics.circulatingSupply,
    wco_burnt_total: metrics.wcoBurntTotal,
    wco_burnt_24h: metrics.wcoBurnt24h,
    active_wallets: metrics.activeWallets,
    average_transaction_size: metrics.averageTransactionSize,
    network_activity_rate: metrics.networkActivityRate,
  };
  
  console.log('Data to insert:', insertData);
  
  const { data, error } = await supabase
    .from('daily_metrics')
    .upsert(insertData, {
      onConflict: 'snapshot_date'
    });
  
  if (error) {
    console.error('Database error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }
  
  console.log('Snapshot stored successfully. Rows affected:', data);
  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('Daily snapshot function triggered');
    
    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Using Supabase URL:', SUPABASE_URL);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Collect all metrics
    const metrics = await collectMetrics(supabase);
    
    // Store snapshot in database
    const result = await storeSnapshot(supabase, metrics);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily snapshot completed successfully',
        data: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error: any) {
    console.error('Daily snapshot error:', error);
    
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