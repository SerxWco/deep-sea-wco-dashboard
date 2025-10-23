import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WCHAIN_API_BASE = 'https://scan.w-chain.com/api/v2';

// Wallet categorization
const FLAGSHIP_WALLETS: Record<string, string> = {
  "0xfac510d5db8cadff323d4b979d898dc38f3fb6df": "Validation Nodes",
  "0x511a6355407bb78f26172db35100a87b9be20fc3": "Liquidity Provision",
  "0x2ca9472add8a02c74d50fc3ea444548502e35bdb": "Marketing & Community",
  "0xa306799ee31c7f89d3ff82d3397972933d57d679": "Premium Account Features",
  "0x94dbff05e1c129869772e1fb291901083cdadef1": "W Chain Ecosystem",
  "0x58213dd561d12a0ea7b538b1b26de34dace1d0f0": "Developer Incentives",
  "0x13768af351b4627dce8de6a67e59e4b27b4cbf5d": "Exchange Listings",
  "0xa237feafa2bac4096867af6229a2370b7a661a5f": "Incentives",
  "0xfc06231e2e448b778680202bea8427884c011341": "Institutional Sales",
  "0x80eabd19b84b4f5f042103e957964297589c657d": "Enterprises & Partnerships",
  "0x57ab15ca8bd528d509dbc81d11e9beca44f3445f": "Development Fund",
  "0xba9be06936c806aefad981ae96fa4d599b78ad24": "WTK Conversion / Total Supply",
  "0x67f2696c125d8d1307a5ae17348a440718229d03": "Treasury Wallet",
  "0x81d29c0DcD64fAC05C4A394D455cbD79D210C200": "Buybacks",
};

const EXCHANGE_WALLETS: Record<string, string> = {
  "0x6cc8dcbca746a6e4fdefb98e1d0df903b107fd21": "Bitrue Exchange",
  "0x2802e182d5a15df915fd0363d8f1adfd2049f9ee": "MEXC Exchange", 
  "0x430d2ada8140378989d20eae6d48ea05bbce2977": "Bitmart Exchange",
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
  const pageSize = 50; // API limit per page
  let nextPageParams = null;
  let pageCount = 0;
  const maxPages = 100; // Safety limit (50 wallets × 100 pages = 5000 max)
  const startTime = Date.now();
  const maxDuration = 4.5 * 60 * 1000; // 4.5 minutes (safety margin before 5min timeout)

  console.log('Starting wallet fetch from W-Chain API...');

  let url = `${WCHAIN_API_BASE}/addresses?items_count=${pageSize}`;

  while (pageCount < maxPages) {
    // Check timeout
    if (Date.now() - startTime > maxDuration) {
      console.warn('Timeout approaching, stopping fetch');
      break;
    }

    try {
      console.log(`Fetching page ${pageCount + 1}: ${url}`);
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        console.error(`API error on page ${pageCount + 1}: ${response.status}`);
        if (response.status === 429) {
          console.log('Rate limited, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        break;
      }

      const data = await response.json();
      const items = data.items || [];
      
      console.log(`Page ${pageCount + 1}: ${items.length} wallets fetched`);

      if (items.length === 0) {
        console.log('No more items, stopping');
        break;
      }

      for (const item of items) {
        const balance = parseFloat(item.coin_balance || '0') / 1e18;
        const txCount = parseInt(item.tx_count || item.transaction_count || '0', 10);
        const address = item.hash;

        if (balance > 0 && address) {
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

      pageCount++;

      // Check for next page using next_page_params
      if (data.next_page_params) {
        const params = new URLSearchParams(data.next_page_params).toString();
        url = `${WCHAIN_API_BASE}/addresses?items_count=${pageSize}&${params}`;
        
        // Rate limiting - 250ms delay between requests
        await new Promise(resolve => setTimeout(resolve, 250));
      } else {
        console.log('No next_page_params, all pages fetched');
        break;
      }
    } catch (error) {
      console.error(`Error fetching page ${pageCount + 1}:`, error);
      // Try one more time after error
      if (pageCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      break;
    }
  }

  console.log(`Total wallets fetched: ${allWallets.length} (${pageCount} pages)`);
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
    const startTime = new Date().toISOString();
    const { error: metaError } = await supabase.from('wallet_cache_metadata')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        total_holders: 0,
        refresh_status: 'in_progress',
        last_refresh: startTime,
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
    
    // Update metadata to show error status
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase.from('wallet_cache_metadata')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        total_holders: 0,
        refresh_status: 'error',
        last_refresh: new Date().toISOString(),
      }, { onConflict: 'id' });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
