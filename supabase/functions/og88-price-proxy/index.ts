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
    console.log('Fetching OG88 price from Railway API...');
    
    const response = await fetch('https://og88-price-api-production.up.railway.app/price', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Railway API responded with status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Railway API response:', data);
    
    // Handle different possible response formats
    let price: number;
    if (typeof data === 'number') {
      price = data;
    } else if (data.price_usd && typeof data.price_usd === 'number') {
      // Handle the actual API format: {"price_usd": 0.06533809102754166}
      price = data.price_usd;
    } else if (data.price && typeof data.price === 'number') {
      price = data.price;
    } else if (data.value && typeof data.value === 'number') {
      price = data.value;
    } else {
      console.error('Invalid price data format:', data);
      throw new Error('Invalid price data format');
    }

    const responseData = {
      price_usd: price,
      timestamp: Date.now()
    };
    
    console.log('Returning OG88 price:', responseData);
    
    return new Response(JSON.stringify(responseData), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  } catch (error) {
    console.error('Error in og88-price-proxy function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: Date.now()
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
});