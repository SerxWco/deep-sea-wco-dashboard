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
    const { address, endpoint, params = {} } = await req.json();
    
    console.log(`Proxying W-Chain API request - address: ${address}, endpoint: ${endpoint}`);

    let url: string;
    
    // Handle different endpoints
    if (!address || endpoint === 'list') {
      // Fetch addresses list
      url = 'https://scan.w-chain.com/api/v2/addresses';
    } else {
      // Fetch specific address or its transactions
      url = `https://scan.w-chain.com/api/v2/addresses/${address}`;
      if (endpoint === 'transactions') {
        url += '/transactions';
      }
    }

    // Add query parameters if provided
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlParams.append(key, String(value));
      }
    });
    
    if (urlParams.toString()) {
      url += `?${urlParams.toString()}`;
    }

    console.log(`Making request to: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WChain-Proxy/1.0',
      },
    });

    if (!response.ok) {
      console.error(`W-Chain API error: ${response.status} ${response.statusText}`);
      throw new Error(`W-Chain API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Successfully proxied W-Chain API request`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in wchain-address-proxy:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});