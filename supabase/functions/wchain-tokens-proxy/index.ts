import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { params = {} } = await req.json();
    
    console.log('Proxying W-Chain tokens API request');

    const url = new URL('https://scan.w-chain.com/api/v2/tokens');
    
    // Add query parameters if provided
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    console.log(`Making request to: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WChain-Proxy/1.0',
      },
    });

    if (!response.ok) {
      console.error(`W-Chain tokens API error: ${response.status} ${response.statusText}`);
      throw new Error(`W-Chain tokens API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully proxied W-Chain tokens API request');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in wchain-tokens-proxy:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});