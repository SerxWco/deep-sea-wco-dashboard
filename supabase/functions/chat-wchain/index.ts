import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Tool definitions
const tools = [
  {
    type: "function",
    function: {
      name: "getNetworkStats",
      description: "Get current W-Chain network statistics including holders, transactions, volume for a specified time period",
      parameters: {
        type: "object",
        properties: {
          period: { 
            type: "string", 
            enum: ["24h", "7d", "30d"], 
            description: "Time period for stats",
            default: "24h"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getWalletLeaderboard",
      description: "Get wallet leaderboard filtered by balance threshold or category (Kraken, Whale, Shark, Dolphin, etc.)",
      parameters: {
        type: "object",
        properties: {
          minBalance: { type: "number", description: "Minimum balance threshold" },
          category: { type: "string", enum: ["Kraken", "Whale", "Shark", "Dolphin", "Fish", "Shrimp"], description: "Wallet category" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getWalletDetails",
      description: "Get detailed information about a specific wallet address",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Wallet address to query" }
        },
        required: ["address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTransactionHistory",
      description: "Get recent transaction history with optional filters",
      parameters: {
        type: "object",
        properties: {
          timeRange: { type: "string", enum: ["1h", "24h", "7d", "30d"], description: "Time range", default: "24h" },
          minValue: { type: "number", description: "Minimum transaction value in WCO" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getDailyMetrics",
      description: "Get historical daily metrics data for trend analysis",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days to retrieve", default: 7 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getHolderAnalysis",
      description: "Analyze holder distribution by category (count of Krakens, Whales, etc.)",
      parameters: {
        type: "object",
        properties: {
          includePercentages: { type: "boolean", description: "Include percentage breakdown", default: true }
        }
      }
    }
  }
];

// Tool execution functions
async function executeGetNetworkStats(args: any) {
  try {
    const response = await fetch('https://scan.w-chain.com/api/v2/stats');
    const stats = await response.json();
    
    return {
      totalHolders: stats.total_addresses || 0,
      totalTransactions: stats.total_transactions || 0,
      averageBlockTime: stats.average_block_time || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching network stats:', error);
    return { error: 'Failed to fetch network stats' };
  }
}

async function executeGetWalletLeaderboard(args: any) {
  try {
    const response = await fetch('https://scan.w-chain.com/api/v2/addresses?type=JSON');
    const data = await response.json();
    
    let wallets = data.items || [];
    
    // Filter by minBalance if provided
    if (args.minBalance) {
      wallets = wallets.filter((w: any) => {
        const balance = parseFloat(w.coin_balance || '0') / 1e18;
        return balance >= args.minBalance;
      });
    }
    
    // Categorize wallets
    const categorizeBalance = (balance: number) => {
      if (balance >= 10000000) return "Kraken";
      if (balance >= 1000000) return "Whale";
      if (balance >= 100000) return "Shark";
      if (balance >= 10000) return "Dolphin";
      if (balance >= 1000) return "Fish";
      return "Shrimp";
    };
    
    wallets = wallets.map((w: any) => {
      const balance = parseFloat(w.coin_balance || '0') / 1e18;
      return {
        address: w.hash,
        balance: balance,
        category: categorizeBalance(balance),
        transactionCount: w.tx_count || 0
      };
    });
    
    // Filter by category if provided
    if (args.category) {
      wallets = wallets.filter((w: any) => w.category === args.category);
    }
    
    return {
      wallets: wallets.slice(0, 50), // Return top 50
      total: wallets.length
    };
  } catch (error) {
    console.error('Error fetching wallet leaderboard:', error);
    return { error: 'Failed to fetch wallet leaderboard' };
  }
}

async function executeGetWalletDetails(args: any) {
  try {
    const response = await fetch(`https://scan.w-chain.com/api/v2/addresses/${args.address}`);
    const data = await response.json();
    
    const balance = parseFloat(data.coin_balance || '0') / 1e18;
    
    return {
      address: data.hash,
      balance: balance,
      transactionCount: data.tx_count || 0,
      createdAt: data.inserted_at,
      isContract: data.is_contract || false
    };
  } catch (error) {
    console.error('Error fetching wallet details:', error);
    return { error: 'Failed to fetch wallet details' };
  }
}

async function executeGetTransactionHistory(args: any) {
  try {
    const response = await fetch('https://scan.w-chain.com/api/v2/transactions');
    const data = await response.json();
    
    let transactions = data.items || [];
    
    // Filter by minValue if provided
    if (args.minValue) {
      transactions = transactions.filter((tx: any) => {
        const value = parseFloat(tx.value || '0') / 1e18;
        return value >= args.minValue;
      });
    }
    
    transactions = transactions.map((tx: any) => ({
      hash: tx.hash,
      value: parseFloat(tx.value || '0') / 1e18,
      from: tx.from?.hash,
      to: tx.to?.hash,
      timestamp: tx.timestamp,
      status: tx.status
    }));
    
    return {
      transactions: transactions.slice(0, 20),
      total: transactions.length
    };
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return { error: 'Failed to fetch transaction history' };
  }
}

async function executeGetDailyMetrics(args: any) {
  try {
    const days = args.days || 7;
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(days);
    
    if (error) throw error;
    
    return {
      metrics: data || [],
      period: `${days} days`
    };
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    return { error: 'Failed to fetch daily metrics' };
  }
}

async function executeGetHolderAnalysis(args: any) {
  try {
    const response = await fetch('https://scan.w-chain.com/api/v2/addresses?type=JSON');
    const data = await response.json();
    
    let wallets = data.items || [];
    
    const categorizeBalance = (balance: number) => {
      if (balance >= 10000000) return "Kraken";
      if (balance >= 1000000) return "Whale";
      if (balance >= 100000) return "Shark";
      if (balance >= 10000) return "Dolphin";
      if (balance >= 1000) return "Fish";
      return "Shrimp";
    };
    
    const categories: Record<string, number> = {
      "Kraken": 0,
      "Whale": 0,
      "Shark": 0,
      "Dolphin": 0,
      "Fish": 0,
      "Shrimp": 0
    };
    
    wallets.forEach((w: any) => {
      const balance = parseFloat(w.coin_balance || '0') / 1e18;
      const category = categorizeBalance(balance);
      categories[category]++;
    });
    
    const total = wallets.length;
    
    if (args.includePercentages) {
      return {
        categories: Object.entries(categories).map(([name, count]) => ({
          name,
          count,
          percentage: ((count / total) * 100).toFixed(2)
        })),
        total
      };
    }
    
    return { categories, total };
  } catch (error) {
    console.error('Error fetching holder analysis:', error);
    return { error: 'Failed to fetch holder analysis' };
  }
}

async function executeTool(toolName: string, args: any) {
  console.log(`Executing tool: ${toolName}`, args);
  
  switch(toolName) {
    case "getNetworkStats":
      return await executeGetNetworkStats(args);
    case "getWalletLeaderboard":
      return await executeGetWalletLeaderboard(args);
    case "getWalletDetails":
      return await executeGetWalletDetails(args);
    case "getTransactionHistory":
      return await executeGetTransactionHistory(args);
    case "getDailyMetrics":
      return await executeGetDailyMetrics(args);
    case "getHolderAnalysis":
      return await executeGetHolderAnalysis(args);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    console.log('Received messages:', messages.length);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // First AI call with tools
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful W-Chain blockchain assistant. You can answer questions about WCO token holders, transactions, wallets, and network statistics. Use the available tools to fetch real-time data from the W-Chain blockchain explorer. Format your responses clearly with numbers, statistics, and relevant details. When showing wallet addresses, truncate them for readability (e.g., 0xfac5...2ca9).'
          },
          ...messages
        ],
        tools: tools,
        tool_choice: 'auto'
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices[0];
    
    // Check if AI wants to use tools
    if (choice.message.tool_calls) {
      console.log('AI requested tool calls:', choice.message.tool_calls.length);
      
      // Execute all requested tools
      const toolResults = await Promise.all(
        choice.message.tool_calls.map(async (toolCall: any) => {
          const result = await executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );
          
          return {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(result)
          };
        })
      );
      
      // Second AI call with tool results
      const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful W-Chain blockchain assistant. Format your responses clearly with numbers, statistics, and relevant details.'
            },
            ...messages,
            choice.message,
            ...toolResults
          ]
        }),
      });

      const finalData = await finalResponse.json();
      const finalMessage = finalData.choices[0].message.content;
      
      return new Response(JSON.stringify({ message: finalMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // No tools needed, return direct response
    return new Response(JSON.stringify({ message: choice.message.content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-wchain function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
