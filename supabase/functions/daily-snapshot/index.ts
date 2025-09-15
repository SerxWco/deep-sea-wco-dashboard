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

async function collectMetrics(): Promise<MetricsData> {
  console.log('Starting metrics collection...');
  
  const metrics: Partial<MetricsData> = {};
  
  try {
    // Fetch W-Chain network stats
    console.log('Fetching W-Chain network stats...');
    const wchainResponse = await fetch('https://oracle-w-chain.com/api/wchain/network-stats');
    if (wchainResponse.ok) {
      const wchainData = await wchainResponse.json();
      console.log('W-Chain data:', wchainData);
      
      metrics.totalHolders = wchainData.totalHolders || 0;
      metrics.transactions24h = wchainData.transactions24h || 0;
      metrics.wcoMoved24h = parseFloat(wchainData.wcoMoved24h) || 0;
      metrics.activeWallets = wchainData.activeWallets || 0;
      metrics.averageTransactionSize = parseFloat(wchainData.averageTransactionSize) || 0;
      metrics.networkActivityRate = parseFloat(wchainData.networkActivityRate) || 0;
    }
  } catch (error) {
    console.error('Error fetching W-Chain stats:', error);
  }
  
  try {
    // Fetch W-Chain price data
    console.log('Fetching W-Chain price data...');
    const priceResponse = await fetch('https://oracle.w-chain.com/api/wco/price');
    let wcoPrice = 0;
    if (priceResponse.ok) {
      const priceData = await priceResponse.json();
      console.log('W-Chain price data:', priceData);
      wcoPrice = priceData.price || 0;
    }
    
    // Fetch W-Chain supply data
    console.log('Fetching W-Chain supply data...');
    const supplyResponse = await fetch('https://oracle.w-chain.com/api/wco/supply-info');
    let circulatingSupply = 0;
    if (supplyResponse.ok) {
      const supplyData = await supplyResponse.json();
      console.log('W-Chain supply data:', supplyData);
      circulatingSupply = parseFloat(supplyData.summary?.circulating_supply_wco) || 0;
    }
    
    // Calculate market cap using W-Chain data
    metrics.marketCap = wcoPrice * circulatingSupply;
    metrics.circulatingSupply = circulatingSupply;
    
    // Fetch CoinGecko for volume data only
    console.log('Fetching CoinGecko volume data...');
    const coinGeckoResponse = await fetch('https://api.coingecko.com/api/v3/coins/wadzchain-token');
    if (coinGeckoResponse.ok) {
      const coinGeckoData = await coinGeckoResponse.json();
      console.log('CoinGecko data:', coinGeckoData.market_data);
      
      metrics.totalVolume = coinGeckoData.market_data?.total_volume?.usd || 0;
    }
  } catch (error) {
    console.error('Error fetching market data:', error);
  }
  
  try {
    // Fetch burn data
    console.log('Fetching burn data...');
    const burnResponse = await fetch('https://wco-scan.com/api/address/0x000000000000000000000000000000000000dead/balance');
    if (burnResponse.ok) {
      const burnData = await burnResponse.json();
      console.log('Burn data:', burnData);
      
      const totalBurnt = parseFloat(burnData.balance) / 1e18;
      metrics.wcoBurntTotal = totalBurnt;
      
      // Fetch recent transactions to calculate 24h burn
      const txResponse = await fetch('https://wco-scan.com/api/address/0x000000000000000000000000000000000000dead/transactions?limit=100');
      if (txResponse.ok) {
        const txData = await txResponse.json();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recent24hTxs = txData.transactions?.filter((tx: any) => 
          new Date(tx.timestamp).getTime() > oneDayAgo
        ) || [];
        
        const burnt24h = recent24hTxs.reduce((sum: number, tx: any) => 
          sum + (parseFloat(tx.value) / 1e18), 0
        );
        metrics.wcoBurnt24h = burnt24h;
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
  
  // Get current date in CET timezone for snapshot_date
  const now = new Date();
  const cetDate = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Europe/Berlin', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(now);
  
  const { data, error } = await supabase
    .from('daily_metrics')
    .upsert({
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
    }, {
      onConflict: 'snapshot_date'
    });
  
  if (error) {
    console.error('Error storing snapshot:', error);
    throw error;
  }
  
  console.log('Snapshot stored successfully:', data);
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
    const supabase = createClient(
      'https://lslysfupujprybfhkrdu.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHlzZnVwdWpwcnliZmhrcmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTc1MDAsImV4cCI6MjA3MzM3MzUwMH0.j0CnKBot5NtCG-lI8GMbPT3m5GhdruTa4KeDvpSZZE0'
    );
    
    // Collect all metrics
    const metrics = await collectMetrics();
    
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