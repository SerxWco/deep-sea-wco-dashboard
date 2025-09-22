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
    const { query, variables = {} } = await req.json();
    
    if (!query) {
      throw new Error('GraphQL query is required');
    }

    console.log('Proxying W-Chain GraphQL request');

    const response = await fetch('https://scan.w-chain.com/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WChain-Proxy/1.0',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      console.error(`W-Chain GraphQL API error: ${response.status} ${response.statusText}`);
      throw new Error(`W-Chain GraphQL API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully proxied W-Chain GraphQL request');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in wchain-graphql-proxy:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});