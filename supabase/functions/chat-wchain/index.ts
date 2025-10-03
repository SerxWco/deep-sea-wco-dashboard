import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const W_CHAIN_API = "https://scan.w-chain.com/api/v2";
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Simple cache
const cache = new Map<string, { data: any; timestamp: number }>();
const getCached = (key: string, ttl: number) => {
  const c = cache.get(key);
  return c && Date.now() - c.timestamp < ttl ? c.data : null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, timestamp: Date.now() });

// Helper to fetch with cache
async function fetchAPI(endpoint: string, cacheTTL = 0) {
  const cacheKey = `api:${endpoint}`;
  if (cacheTTL > 0) {
    const cached = getCached(cacheKey, cacheTTL);
    if (cached) return cached;
  }
  
  const response = await fetch(`${W_CHAIN_API}${endpoint}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  
  if (cacheTTL > 0) setCache(cacheKey, data);
  return data;
}

// Categorize wallet by balance
function categorizeWallet(balance: number): string {
  if (balance >= 10000000) return "Kraken 🦑";
  if (balance >= 1000000) return "Whale 🐋";
  if (balance >= 100000) return "Shark 🦈";
  if (balance >= 10000) return "Dolphin 🐬";
  if (balance >= 1000) return "Fish 🐟";
  return "Shrimp 🦐";
}

// Tool definitions
const tools = [
  {
    type: "function",
    function: {
      name: "searchBlockchain",
      description: "Search for transactions, blocks, addresses, or tokens by hash/address/query",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (transaction hash, block number, address, or token)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getNetworkStats",
      description: "Get current network statistics and counters",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "getBlockInfo",
      description: "Get detailed information about a specific block",
      parameters: {
        type: "object",
        properties: {
          blockNumberOrHash: { type: "string", description: "Block number or hash" }
        },
        required: ["blockNumberOrHash"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getRecentBlocks",
      description: "Get list of recent blocks",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of blocks to return", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTransactionDetails",
      description: "Get comprehensive transaction details including token transfers, internal transactions, and logs",
      parameters: {
        type: "object",
        properties: {
          txHash: { type: "string", description: "Transaction hash" },
          includeTokenTransfers: { type: "boolean", default: true },
          includeInternalTxs: { type: "boolean", default: false },
          includeLogs: { type: "boolean", default: false }
        },
        required: ["txHash"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getRecentTransactions",
      description: "Get recent transactions with optional filters",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 20 },
          minValue: { type: "number", description: "Minimum transaction value in WCO" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getAddressInfo",
      description: "Get comprehensive address/wallet information including balance, transactions, tokens, and NFTs",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Wallet address" },
          includeTransactions: { type: "boolean", default: false },
          includeTokens: { type: "boolean", default: true },
          includeNFTs: { type: "boolean", default: false }
        },
        required: ["address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTopHolders",
      description: "Get top WCO holders with balance categorization",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 50 },
          category: { type: "string", enum: ["Kraken", "Whale", "Shark", "Dolphin", "Fish", "Shrimp"], description: "Filter by category" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getHolderDistribution",
      description: "Analyze holder distribution by category with counts and percentages",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "getTokensList",
      description: "Get list of all tokens on W-Chain (ERC-20, ERC-721, ERC-1155)",
      parameters: {
        type: "object",
        properties: {
          tokenType: { type: "string", enum: ["ERC-20", "ERC-721", "ERC-1155"], description: "Filter by token type" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTokenInfo",
      description: "Get detailed token information including holders, transfers, and supply",
      parameters: {
        type: "object",
        properties: {
          tokenAddress: { type: "string", description: "Token contract address" }
        },
        required: ["tokenAddress"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTokenHolders",
      description: "Get list of holders for a specific token",
      parameters: {
        type: "object",
        properties: {
          tokenAddress: { type: "string", description: "Token contract address" },
          limit: { type: "number", default: 50 }
        },
        required: ["tokenAddress"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getSmartContracts",
      description: "Get list of verified smart contracts",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 20 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTransactionCharts",
      description: "Get transaction volume charts over time",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "getDailyMetrics",
      description: "Get historical daily metrics for trend analysis",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", default: 7 }
        }
      }
    }
  }
];

// Tool executors
async function executeSearchBlockchain(args: any) {
  try {
    const data = await fetchAPI(`/search?q=${encodeURIComponent(args.query)}`);
    return { results: data.items || [], query: args.query };
  } catch (error) {
    return { error: `Search failed: ${error.message}` };
  }
}

async function executeGetNetworkStats() {
  try {
    const data = await fetchAPI('/stats', 300000); // 5 min cache
    return {
      totalAddresses: data.total_addresses,
      totalTransactions: data.total_transactions,
      totalBlocks: data.total_blocks,
      averageBlockTime: data.average_block_time,
      gasUsed24h: data.gas_used_today,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: `Failed to fetch stats: ${error.message}` };
  }
}

async function executeGetBlockInfo(args: any) {
  try {
    const data = await fetchAPI(`/blocks/${args.blockNumberOrHash}`, 1800000); // 30 min cache
    return {
      number: data.height,
      hash: data.hash,
      timestamp: data.timestamp,
      transactions: data.tx_count,
      gasUsed: data.gas_used,
      validator: data.miner?.hash,
      size: data.size
    };
  } catch (error) {
    return { error: `Block not found: ${error.message}` };
  }
}

async function executeGetRecentBlocks(args: any) {
  try {
    const data = await fetchAPI('/blocks');
    const blocks = (data.items || []).slice(0, args.limit || 10);
    return {
      blocks: blocks.map((b: any) => ({
        number: b.height,
        hash: b.hash,
        timestamp: b.timestamp,
        transactions: b.tx_count,
        validator: b.miner?.hash
      }))
    };
  } catch (error) {
    return { error: `Failed to fetch blocks: ${error.message}` };
  }
}

async function executeGetTransactionDetails(args: any) {
  try {
    const txData = await fetchAPI(`/transactions/${args.txHash}`, 1800000);
    const result: any = {
      hash: txData.hash,
      status: txData.status,
      block: txData.block,
      timestamp: txData.timestamp,
      from: txData.from?.hash,
      to: txData.to?.hash,
      value: parseFloat(txData.value || '0') / 1e18,
      gasUsed: txData.gas_used,
      fee: parseFloat(txData.fee?.value || '0') / 1e18
    };

    if (args.includeTokenTransfers) {
      const transfers = await fetchAPI(`/transactions/${args.txHash}/token-transfers`);
      result.tokenTransfers = (transfers.items || []).map((t: any) => ({
        token: t.token?.name || 'Unknown',
        from: t.from?.hash,
        to: t.to?.hash,
        amount: t.total?.value
      }));
    }

    if (args.includeInternalTxs) {
      const internal = await fetchAPI(`/transactions/${args.txHash}/internal-transactions`);
      result.internalTransactions = internal.items || [];
    }

    return result;
  } catch (error) {
    return { error: `Transaction not found: ${error.message}` };
  }
}

async function executeGetRecentTransactions(args: any) {
  try {
    const data = await fetchAPI('/transactions');
    let txs = (data.items || []).map((tx: any) => ({
      hash: tx.hash,
      from: tx.from?.hash,
      to: tx.to?.hash,
      value: parseFloat(tx.value || '0') / 1e18,
      timestamp: tx.timestamp,
      status: tx.status
    }));

    if (args.minValue) {
      txs = txs.filter((tx: any) => tx.value >= args.minValue);
    }

    return { transactions: txs.slice(0, args.limit || 20) };
  } catch (error) {
    return { error: `Failed to fetch transactions: ${error.message}` };
  }
}

async function executeGetAddressInfo(args: any) {
  try {
    const addrData = await fetchAPI(`/addresses/${args.address}`);
    const balance = parseFloat(addrData.coin_balance || '0') / 1e18;
    
    const result: any = {
      address: addrData.hash,
      balance: balance,
      category: categorizeWallet(balance),
      transactionCount: addrData.tx_count,
      isContract: addrData.is_contract
    };

    if (args.includeTokens) {
      const tokens = await fetchAPI(`/addresses/${args.address}/tokens`);
      result.tokens = (tokens.items || []).slice(0, 10).map((t: any) => ({
        name: t.token?.name,
        symbol: t.token?.symbol,
        balance: t.value
      }));
    }

    if (args.includeNFTs) {
      const nfts = await fetchAPI(`/addresses/${args.address}/nft`);
      result.nfts = (nfts.items || []).slice(0, 10);
    }

    if (args.includeTransactions) {
      const txs = await fetchAPI(`/addresses/${args.address}/transactions`);
      result.recentTransactions = (txs.items || []).slice(0, 5);
    }

    return result;
  } catch (error) {
    return { error: `Address not found: ${error.message}` };
  }
}

async function executeGetTopHolders(args: any) {
  try {
    const data = await fetchAPI('/addresses?type=JSON', 300000);
    let holders = (data.items || []).map((w: any) => {
      const balance = parseFloat(w.coin_balance || '0') / 1e18;
      return {
        address: w.hash,
        balance: balance,
        category: categorizeWallet(balance),
        transactionCount: w.tx_count
      };
    });

    if (args.category) {
      holders = holders.filter((h: any) => h.category.includes(args.category));
    }

    return { holders: holders.slice(0, args.limit || 50), total: holders.length };
  } catch (error) {
    return { error: `Failed to fetch holders: ${error.message}` };
  }
}

async function executeGetHolderDistribution() {
  try {
    const data = await fetchAPI('/addresses?type=JSON', 300000);
    const holders = data.items || [];
    
    const dist: Record<string, number> = {
      "Kraken 🦑": 0,
      "Whale 🐋": 0,
      "Shark 🦈": 0,
      "Dolphin 🐬": 0,
      "Fish 🐟": 0,
      "Shrimp 🦐": 0
    };

    holders.forEach((h: any) => {
      const balance = parseFloat(h.coin_balance || '0') / 1e18;
      const cat = categorizeWallet(balance);
      dist[cat]++;
    });

    const total = holders.length;
    return {
      distribution: Object.entries(dist).map(([name, count]) => ({
        category: name,
        count,
        percentage: ((count / total) * 100).toFixed(2)
      })),
      totalHolders: total
    };
  } catch (error) {
    return { error: `Failed to analyze holders: ${error.message}` };
  }
}

async function executeGetTokensList(args: any) {
  try {
    const data = await fetchAPI('/tokens', 900000); // 15 min cache
    let tokens = data.items || [];
    
    if (args.tokenType) {
      tokens = tokens.filter((t: any) => t.type === args.tokenType);
    }

    return {
      tokens: tokens.slice(0, 50).map((t: any) => ({
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        type: t.type,
        holders: t.holders
      }))
    };
  } catch (error) {
    return { error: `Failed to fetch tokens: ${error.message}` };
  }
}

async function executeGetTokenInfo(args: any) {
  try {
    const tokenData = await fetchAPI(`/tokens/${args.tokenAddress}`);
    const counters = await fetchAPI(`/tokens/${args.tokenAddress}/counters`);
    
    return {
      address: tokenData.address,
      name: tokenData.name,
      symbol: tokenData.symbol,
      type: tokenData.type,
      totalSupply: tokenData.total_supply,
      holders: counters.token_holders_count,
      transfers: counters.transfers_count
    };
  } catch (error) {
    return { error: `Token not found: ${error.message}` };
  }
}

async function executeGetTokenHolders(args: any) {
  try {
    const data = await fetchAPI(`/tokens/${args.tokenAddress}/holders`);
    return {
      holders: (data.items || []).slice(0, args.limit || 50).map((h: any) => ({
        address: h.address?.hash,
        balance: h.value
      }))
    };
  } catch (error) {
    return { error: `Failed to fetch token holders: ${error.message}` };
  }
}

async function executeGetSmartContracts(args: any) {
  try {
    const data = await fetchAPI('/smart-contracts');
    return {
      contracts: (data.items || []).slice(0, args.limit || 20).map((c: any) => ({
        address: c.address?.hash,
        name: c.name,
        compiler: c.compiler_version,
        verified: true
      }))
    };
  } catch (error) {
    return { error: `Failed to fetch contracts: ${error.message}` };
  }
}

async function executeGetTransactionCharts() {
  try {
    const data = await fetchAPI('/stats/charts/transactions', 300000);
    return { chartData: data.chart_data || [] };
  } catch (error) {
    return { error: `Failed to fetch charts: ${error.message}` };
  }
}

async function executeGetDailyMetrics(args: any) {
  try {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(args.days || 7);
    
    if (error) throw error;
    return { metrics: data || [], period: `${args.days || 7} days` };
  } catch (error) {
    return { error: `Failed to fetch daily metrics: ${error.message}` };
  }
}

// Tool router
async function executeTool(toolName: string, args: any) {
  console.log(`Executing: ${toolName}`, args);
  
  const executors: Record<string, Function> = {
    searchBlockchain: executeSearchBlockchain,
    getNetworkStats: executeGetNetworkStats,
    getBlockInfo: executeGetBlockInfo,
    getRecentBlocks: executeGetRecentBlocks,
    getTransactionDetails: executeGetTransactionDetails,
    getRecentTransactions: executeGetRecentTransactions,
    getAddressInfo: executeGetAddressInfo,
    getTopHolders: executeGetTopHolders,
    getHolderDistribution: executeGetHolderDistribution,
    getTokensList: executeGetTokensList,
    getTokenInfo: executeGetTokenInfo,
    getTokenHolders: executeGetTokenHolders,
    getSmartContracts: executeGetSmartContracts,
    getTransactionCharts: executeGetTransactionCharts,
    getDailyMetrics: executeGetDailyMetrics
  };

  return executors[toolName] ? await executors[toolName](args) : { error: `Unknown tool: ${toolName}` };
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

    const systemPrompt = `You are a comprehensive W-Chain blockchain explorer assistant with access to the complete W-Chain API. You can answer questions about:

**The W-Chain Ecosystem:**
- Native WCO Token: holders, balances, transfers, distribution, categories (Kraken 🦑, Whale 🐋, Shark 🦈, Dolphin 🐬, Fish 🐟, Shrimp 🦐)
- All Tokens: ERC-20 tokens, ERC-721 NFTs, ERC-1155 tokens on W-Chain
- Transactions: detailed transaction info, token transfers, internal transactions, logs, summaries
- Blocks: block data, block transactions, validators, gas usage
- Wallets/Addresses: balances, transaction history, token holdings, NFT collections, activity
- Smart Contracts: verified contracts, contract interactions
- Network Statistics: real-time stats, charts, trends, historical data
- Search: find any transaction, block, address, or token

**Response Formatting Guidelines:**
- Use clear headings, bullet points, and tables
- Format large numbers with commas (e.g., 1,234,567)
- Truncate addresses for readability (e.g., 0xfac5...2ca9)
- Include relevant emojis for categories
- Provide concise but informative answers
- When showing multiple results, limit to top 10-20 unless specifically asked for more

**Important Notes:**
- WCO is the native coin/token of W-Chain
- When users ask about "tokens", clarify if they mean WCO, specific ERC-20 tokens, or NFTs
- All balances are in WCO unless otherwise specified
- Always provide current/real-time data when available`;

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
          { role: 'system', content: systemPrompt },
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
            { role: 'system', content: systemPrompt },
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
