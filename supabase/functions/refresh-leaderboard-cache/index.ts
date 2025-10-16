import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WCHAIN_API_BASE = 'https://wchain-explorer-production.up.railway.app/api/v2';

// Wallet categorization
const FLAGSHIP_WALLETS: Record<string, string> = {
  '0x6B7F0B0e3DD1E3c7f3d0e2B3b0B0B0B0B0B0B0B0': 'Team Wallet',
  '0xF3b5b3b0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0': 'Development Fund',
  '0xA3b5b3b0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0': 'Marketing Wallet',
  '0x0000000000000000000000000000000000000000': 'Burn Address',
};

const EXCHANGE_WALLETS: Record<string, string> = {
  '0xE1b5b3b0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0': 'Bitmart',
  '0xE2b5b3b0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0': 'MEXC',
  '0xE3b5b3b0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0': 'Bitrue',
};

const ALL_CATEGORIES = [
  { name: 'Kraken', emoji: '🦑', minBalance: 5000000 },
  { name: 'Whale', emoji: '🐋', minBalance: 1000001 },
  { name: 'Shark', emoji: '🦈', minBalance: 500001 },
  { name: 'Dolphin', emoji: '🐬', minBalance: 100001 },
  { name: 'Fish', emoji: '🐟', minBalance: 50001 },
  { name: 'Octopus', emoji: '🐙', minBalance: 10001 },
  { name: 'Crab', emoji: '🦀', minBalance: 1001 },
  { name: 'Shrimp', emoji: '🦐', minBalance: 1 },
  { name: 'Plankton', emoji: '🦠', minBalance: 0 },
];

function categorizeWallet(balance: number, address: string) {
  const isWrapped = address.toLowerCase().includes('wrapped') || 
                   address.toLowerCase().includes('0x0000000000000000000000000000000000000001');
  const isFlagship = FLAGSHIP_WALLETS[address];
  const isExchange = EXCHANGE_WALLETS[address];

  if (isWrapped) {
    return { category: 'Wrapped', emoji: '📦', label: 'Wrapped Token', isFlagship: false, isExchange: false, isWrapped: true };
  }
  if (isFlagship) {
    return { category: 'Flagship', emoji: '⭐', label: isFlagship, isFlagship: true, isExchange: false, isWrapped: false };
  }
  if (isExchange) {
    return { category: 'Exchange', emoji: '🏦', label: isExchange, isFlagship: false, isExchange: true, isWrapped: false };
  }

  for (const cat of ALL_CATEGORIES) {
    if (balance >= cat.minBalance) {
      return { category: cat.name, emoji: cat.emoji, label: null, isFlagship: false, isExchange: false, isWrapped: false };
    }
  }

  return { category: 'Shrimp', emoji: '🦐', label: null, isFlagship: false, isExchange: false, isWrapped: false };
}

async function fetchAllWallets() {
  const allWallets: any[] = [];
  let page = 1;
  const pageSize = 50;
  let hasMore = true;

  console.log('Starting wallet fetch from W-Chain API...');

  while (hasMore) {
    try {
      const url = `${WCHAIN_API_BASE}/addresses?page=${page}&items_count=${pageSize}`;
      console.log(`Fetching page ${page}: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`API error on page ${page}: ${response.status}`);
        break;
      }

      const data = await response.json();
      const items = data.items || [];
      
      console.log(`Page ${page}: ${items.length} wallets fetched`);

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of items) {
        const balance = parseFloat(item.coin_balance || '0') / 1e18;
        const txCount = parseInt(item.tx_count || '0', 10);
        const address = item.hash;

        if (balance > 0) {
          const { category, emoji, label, isFlagship, isExchange, isWrapped } = categorizeWallet(balance, address);
          
          allWallets.push({
            address,
            balance,
            transaction_count: txCount,
            category,
            emoji,
            label,
            is_flagship: isFlagship,
            is_exchange: isExchange,
            is_wrapped: isWrapped,
          });
        }
      }

      if (items.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      hasMore = false;
    }
  }

  console.log(`Total wallets fetched: ${allWallets.length}`);
  return allWallets;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting leaderboard cache refresh...');

    // Update metadata to indicate refresh in progress
    const { error: metaError } = await supabase.from('wallet_cache_metadata')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        total_holders: 0,
        refresh_status: 'in_progress',
        last_refresh: new Date().toISOString(),
      }, { onConflict: 'id' });
    
    if (metaError) {
      console.error('Error updating metadata:', metaError);
    }

    // Fetch all wallets from W-Chain API
    const wallets = await fetchAllWallets();

    if (wallets.length === 0) {
      console.error('No wallets fetched');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch wallets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clear existing cache
    console.log('Clearing old cache...');
    await supabase.from('wallet_leaderboard_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new cache data in batches
    console.log('Inserting new cache data...');
    const batchSize = 100;
    for (let i = 0; i < wallets.length; i += batchSize) {
      const batch = wallets.slice(i, i + batchSize);
      const { error } = await supabase.from('wallet_leaderboard_cache').insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} wallets)`);
      }
    }

    // Update metadata with final count
    const { error: finalMetaError } = await supabase.from('wallet_cache_metadata')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        total_holders: wallets.length,
        refresh_status: 'completed',
        last_refresh: new Date().toISOString(),
      }, { onConflict: 'id' });
    
    if (finalMetaError) {
      console.error('Error updating final metadata:', finalMetaError);
    }

    console.log(`Cache refresh completed: ${wallets.length} wallets cached`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_holders: wallets.length,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error refreshing cache:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
