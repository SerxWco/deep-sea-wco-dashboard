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

// LLM configuration and utilities
const MAX_HISTORY_MESSAGES = 12; // Number of prior messages to include (combined user/assistant)
const MAX_TOOL_ROUNDS = 3;       // Max iterative tool-use rounds
const MAX_TOOL_CONTENT_CHARS = 12000; // Cap tool payloads sent back to the model

function chooseModel(latestUserMessage: string, hasTools: boolean): string {
  const text = (latestUserMessage || '').toLowerCase();
  const lengthScore = latestUserMessage ? latestUserMessage.length : 0;
  const heavyKeywords = /(why|explain|analy(s|z)e|compare|strategy|design|architecture|root cause|derive|prove|optimi[sz]e|trade[- ]?off|most active wallet|distribution|volume|supply)/i;

  const needsReasoning = heavyKeywords.test(text) || lengthScore > 400;
  if (needsReasoning || hasTools) {
    // Prefer stronger reasoning when tools or complexity likely
    return 'google/gemini-2.5-pro';
  }
  return 'google/gemini-2.5-flash';
}

function mapHistoryToMessages(history: Array<{ role: string; content: string }>, limit: number) {
  if (!Array.isArray(history) || history.length === 0) return [] as any[];
  const trimmed = history.slice(Math.max(0, history.length - limit));
  return trimmed
    .filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant' || m.role === 'system'))
    .map((m) => ({ role: m.role, content: m.content }));
}

function truncateContentForModel(content: string, maxChars: number = MAX_TOOL_CONTENT_CHARS): string {
  if (!content) return content;
  if (content.length <= maxChars) return content;
  const head = content.slice(0, Math.max(0, maxChars - 200));
  const omitted = content.length - head.length;
  return `${head}\n...[truncated ${omitted} chars]`;
}

// Special wallet definitions (aligned with Dashboard logic)
const FLAGSHIP_WALLETS: Record<string, string> = {
  // Core/vesting/treasury addresses
  "0xfAc510D5dB8cadfF323D4b979D898dc38F3FB6dF": "Validation Nodes",
  "0x511A6355407Bb78f26172DB35100A87B9bE20Fc3": "Liquidity Provision",
  "0x2ca9472ADd8a02c74D50FC3Ea444548502E35BDb": "Marketing & Community",
  "0xa306799eE31c7f89D3ff82D3397972933d57d679": "Premium Account Features",
  "0x94DbFF05e1C129869772E1Fb291901083CdAdef1": "W Chain Ecosystem",
  "0x58213DD561d12a0Ea7b538B1b26DE34dACe1D0F0": "Developer Incentives",
  "0x13768af351B4627dcE8De6A67e59e4b27B4Cbf5D": "Exchange Listings",
  "0xa237FeAFa2BAc4096867aF6229a2370B7A661A5F": "Incentives",
  "0xFC06231E2e448B778680202BEA8427884c011341": "Institutional Sales",
  "0x80eaBD19b84b4f5f042103e957964297589C657D": "Enterprises & Partnerships",
  "0x57Ab15Ca8Bd528D509DbC81d11E9BecA44f3445f": "Development Fund",
  "0xba9Be06936C806AEfAd981Ae96fa4D599B78aD24": "WTK Conversion / Total Supply",
  "0x67F2696c125D8D1307a5aE17348A440718229D03": "Treasury Wallet",
  "0x81d29c0DcD64fAC05C4A394D455cbD79D210C200": "Buybacks"
};

const EXCHANGE_WALLETS: Record<string, string> = {
  "0x2802e182d5a15df915fd0363d8f1adfd2049f9ee": "MEXC Exchange",
  "0x430d2ada8140378989d20eae6d48ea05bbce2977": "BitMart Exchange",
  "0x6cc8dcbca746a6e4fdefb98e1d0df903b107fd21": "Bitrue Exchange"
};

const WRAPPED_WCO = [
  // Wrapped WCO contract
  "0xedb8008031141024d50ca2839a607b2f82c1c045"
];

// Helper function to categorize wallets (matching Dashboard logic)
function categorizeWallet(balance: number, address: string): {
  category: string;
  emoji: string;
  label?: string;
  isSpecial: boolean;
} {
  const lowerAddress = (address || '').toLowerCase();

  // Check flagship wallets
  const flagshipLabel = Object.entries(FLAGSHIP_WALLETS).find(
    ([addr]) => addr.toLowerCase() === lowerAddress
  )?.[1];
  if (flagshipLabel) {
    return { category: "Flagship", emoji: "🚩", label: flagshipLabel, isSpecial: true };
  }

  // Check exchange wallets
  const exchangeLabel = Object.entries(EXCHANGE_WALLETS).find(
    ([addr]) => addr.toLowerCase() === lowerAddress
  )?.[1];
  if (exchangeLabel) {
    return { category: "Harbor", emoji: "⚓", label: exchangeLabel, isSpecial: true };
  }

  // Check wrapped WCO
  if (WRAPPED_WCO.some(addr => addr.toLowerCase() === lowerAddress)) {
    return { category: "Bridge/Wrapped", emoji: "🌉", label: "Wrapped WCO Contract", isSpecial: true };
  }

  // Balance-based categorization (Ocean Creatures tiers)
  if (balance >= 5_000_000) return { category: "Kraken", emoji: "🦑", isSpecial: false };
  if (balance >= 1_000_001) return { category: "Whale", emoji: "🐋", isSpecial: false };
  if (balance >= 500_001) return { category: "Shark", emoji: "🦈", isSpecial: false };
  if (balance >= 100_001) return { category: "Dolphin", emoji: "🐬", isSpecial: false };
  if (balance >= 50_001) return { category: "Fish", emoji: "🐟", isSpecial: false };
  if (balance >= 10_001) return { category: "Octopus", emoji: "🐙", isSpecial: false };
  if (balance >= 1_001) return { category: "Crab", emoji: "🦀", isSpecial: false };
  if (balance >= 1) return { category: "Shrimp", emoji: "🦐", isSpecial: false };
  return { category: "Plankton", emoji: "🦠", isSpecial: false };
}

// GraphQL query helper for fetching network stats (matching Dashboard logic)
async function queryGraphQL(limit: number = 5000) {
  try {
    const query = `
      query NetworkStats($limit: Int!) {
        addresses(first: $limit, orderBy: COIN_BALANCE_DESC) {
          items {
            hash
            coinBalance
            transactionsCount
          }
          totalCount
        }
      }
    `;

    const response = await fetch('https://scan.w-chain.com/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { limit } })
    });
    
    if (!response.ok) throw new Error(`GraphQL query failed: ${response.status}`);
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    const items = data.data?.addresses?.items || [];
    return items;
  } catch (error) {
    console.error('GraphQL query failed:', error);
    return null; // Return null to trigger fallback to REST API
  }
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
      description: "Get recent transactions with optional time and value filters",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 20 },
          minValue: { type: "number", description: "Minimum transaction value in WCO" },
          hours: { type: "number", description: "Filter transactions from the last X hours" }
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
          category: { type: "string", enum: ["Kraken", "Whale", "Shark", "Dolphin", "Fish", "Octopus", "Crab", "Shrimp", "Plankton"], description: "Filter by category" }
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
  },
  {
    type: "function",
    function: {
      name: "getSupplyInfo",
      description: "Get detailed WCO token supply information including circulating supply, locked supply (validators, vesting contracts), burned tokens, and tokenomics breakdown",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "getTokenPrice",
      description: "Get real-time USD price for W-Chain tokens (WCO, WAVE). Prices are cached for 1 minute. WAVE price is calculated using WAVE/WCO trading pair rate multiplied by WCO USD price.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", enum: ["WCO", "WAVE"], description: "Token symbol to fetch price for" }
        },
        required: ["symbol"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTokenTransfers",
      description: "Get ERC-20/ERC-721/ERC-1155 token transfers for an address",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Wallet address" },
          tokenType: { 
            type: "string", 
            enum: ["ERC-20", "ERC-721", "ERC-1155"],
            description: "Token standard type (default: ERC-20)"
          },
          startBlock: { type: "number", description: "Starting block number" },
          endBlock: { type: "number", description: "Ending block number" },
          page: { type: "number", description: "Page number (default: 1)" },
          offset: { type: "number", description: "Number of results per page (default: 100)" }
        },
        required: ["address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getContractInfo",
      description: "Get verified contract source code, ABI, and compiler information",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Contract address" }
        },
        required: ["address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getContractLogs",
      description: "Query contract event logs with optional filters for block range and event topics",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Contract address" },
          fromBlock: { type: "number", description: "Starting block number (optional)" },
          toBlock: { type: "number", description: "Ending block number (optional, defaults to 'latest')" },
          topic0: { type: "string", description: "Event signature hash (optional)" },
          page: { type: "number", description: "Page number (default: 1)" },
          offset: { type: "number", description: "Number of logs per page (default: 100, max: 1000)" }
        },
        required: ["address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getMultipleBalances",
      description: "Get WCO balances for multiple wallet addresses in a single call (max 20 addresses)",
      parameters: {
        type: "object",
        properties: {
          addresses: { 
            type: "array", 
            items: { type: "string" },
            description: "Array of wallet addresses (maximum 20)" 
          }
        },
        required: ["addresses"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getBlockReward",
      description: "Get block mining reward and uncle inclusion information",
      parameters: {
        type: "object",
        properties: {
          blockNumber: { type: "number", description: "Block number to query" }
        },
        required: ["blockNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTransactionStatus",
      description: "Get detailed transaction execution status and receipt information",
      parameters: {
        type: "object",
        properties: {
          txHash: { type: "string", description: "Transaction hash" }
        },
        required: ["txHash"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getBlockCountdown",
      description: "Estimate time remaining until a specific block number is mined",
      parameters: {
        type: "object",
        properties: {
          blockNumber: { type: "number", description: "Target block number" }
        },
        required: ["blockNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTotalHoldersFromCache",
      description: "Get the total number of WCO holders from the cached leaderboard data (same source as Daily Report and Ocean Creatures page)",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "getCategoryStats",
      description: "Get detailed Ocean Creature category statistics showing holder count, total WCO held, and percentage breakdown for each tier (Kraken, Whale, Shark, Dolphin, Fish, Octopus, Crab, Shrimp, Plankton)",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "getWalletsByCategory",
      description: "Get all wallets that belong to a specific Ocean Creature category (Kraken, Whale, Shark, Dolphin, Fish, Octopus, Crab, Shrimp, Plankton, Flagship, Exchange)",
      parameters: {
        type: "object",
        properties: {
          category: { 
            type: "string", 
            description: "The wallet category to filter by (e.g., 'Whale', 'Flagship', 'Harbor')" 
          },
          limit: { type: "number", default: 50, description: "Maximum number of wallets to return" }
        },
        required: ["category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getWalletTier",
      description: "Check which Ocean Creature tier/category a specific wallet belongs to, including balance and ranking information",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Wallet address to check" }
        },
        required: ["address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compareWallets",
      description: "Compare balances and details between multiple wallets (useful for comparing team wallets, flagship wallets, or any group of addresses)",
      parameters: {
        type: "object",
        properties: {
          addresses: { 
            type: "array", 
            items: { type: "string" },
            description: "Array of wallet addresses to compare (2-10 addresses)" 
          }
        },
        required: ["addresses"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "searchWalletByLabel",
      description: "Find wallets by their label/name (e.g., 'Marketing', 'Team', 'Treasury', 'MEXC'). Searches through flagship and exchange wallet labels.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: { type: "string", description: "Label or name to search for" }
        },
        required: ["searchTerm"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getInactiveWallets",
      description: "Find wallets that haven't had recent transaction activity. Note: This requires transaction_count data from the cache.",
      parameters: {
        type: "object",
        properties: {
          minBalance: { type: "number", default: 1000, description: "Minimum WCO balance to include" },
          limit: { type: "number", default: 20, description: "Maximum number of results" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getWcoVolume",
      description: "Calculate total WCO transaction volume for a specific time period. Data is sourced from daily_metrics table when available (fast, accurate) with fallback to live API aggregation.",
      parameters: {
        type: "object",
        properties: {
          period: { 
            type: "string", 
            enum: ["24h", "7d"], 
            description: "Time period to analyze (default: 24h)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getMostActiveWallet",
      description: "Find the wallet with the most transaction activity (both sent and received) in a time period. Can optionally exclude flagship wallets and exchanges.",
      parameters: {
        type: "object",
        properties: {
          period: { 
            type: "string", 
            enum: ["today", "24h", "7d"],
            description: "Time period to analyze (default: today)"
          },
          excludeSpecial: {
            type: "boolean",
            description: "Exclude flagship wallets and exchanges from results (default: true)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getWSwapPools",
      description: "Get all liquidity pools from W-Swap DEX including pool addresses, token pairs, reserves, and liquidity information",
      parameters: { type: "object", properties: {} }
    }
  }
];

// Tool executors
async function executeSearchBlockchain(args: any) {
  try {
    const data = await fetchAPI(`/search?q=${encodeURIComponent(args.query)}`);
    return { results: data.items || [], query: args.query };
  } catch (error) {
    return { error: `Search failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function executeGetNetworkStats() {
  try {
    const data = await fetchAPI('/stats', 300000); // 5 min cache
    
    // Fetch WCO holder count from Supabase cache
    let totalHolders = null;
    try {
      const { data: metadata } = await supabase
        .from('wallet_cache_metadata')
        .select('total_holders')
        .order('last_refresh', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (metadata?.total_holders) {
        totalHolders = metadata.total_holders;
      }
    } catch (err) {
      console.log('Could not fetch holder count from cache:', err);
    }
    
    return {
      totalAddresses: data.total_addresses,
      totalTransactions: data.total_transactions,
      totalBlocks: data.total_blocks,
      averageBlockTime: data.average_block_time,
      gasUsed24h: data.gas_used_today,
      totalHolders: totalHolders,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: `Failed to fetch stats: ${error instanceof Error ? error.message : String(error)}` };
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
    return { error: `Block not found: ${error instanceof Error ? error.message : String(error)}` };
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
    return { error: `Failed to fetch blocks: ${error instanceof Error ? error.message : String(error)}` };
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
    return { error: `Transaction not found: ${error instanceof Error ? error.message : String(error)}` };
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

    // Filter by time if hours parameter is provided
    if (args.hours) {
      const cutoffTime = new Date(Date.now() - args.hours * 60 * 60 * 1000);
      txs = txs.filter((tx: any) => {
        const txTime = new Date(tx.timestamp);
        return txTime >= cutoffTime;
      });
    }

    // Filter by minimum value
    if (args.minValue) {
      txs = txs.filter((tx: any) => tx.value >= args.minValue);
    }

    return { 
      transactions: txs.slice(0, args.limit || 20),
      filtered: args.hours ? `Last ${args.hours} hours` : 'All recent'
    };
  } catch (error) {
    return { error: `Failed to fetch transactions: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function executeGetAddressInfo(args: any) {
  try {
    const addrData = await fetchAPI(`/addresses/${args.address}`);
    const balance = parseFloat(addrData.coin_balance || '0') / 1e18;
    
    const result: any = {
      address: addrData.hash,
      balance: balance,
      category: categorizeWallet(balance, args.address),
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
    return { error: `Address not found: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function executeGetTopHolders(args: any) {
  try {
    const requestedLimit = args.limit || 50;
    const categoryFilter = args.category?.toLowerCase();
    
    console.log(`🔍 Fetching top holders (limit: ${requestedLimit}, category: ${categoryFilter || 'all'})`);
    
    // STEP 1: Try Supabase cache first (fast path)
    let query = supabase
      .from('wallet_leaderboard_cache')
      .select('address, balance, category, emoji, transaction_count')
      .order('balance', { ascending: false });
    
    if (categoryFilter) {
      query = query.ilike('category', `%${categoryFilter}%`);
    }
    
    const { data: cachedHolders, error: cacheError } = await query.limit(requestedLimit);
    
    if (!cacheError && cachedHolders && cachedHolders.length > 0) {
      console.log(`✅ Cache hit: ${cachedHolders.length} holders from Supabase cache`);
      
      // Compute total count for the requested category (or overall if no filter)
      let totalForScope: number | null = null;
      try {
        if (categoryFilter) {
          const { count } = await supabase
            .from('wallet_leaderboard_cache')
            .select('address', { count: 'exact', head: true })
            .ilike('category', `%${categoryFilter}%`);
          totalForScope = typeof count === 'number' ? count : null;
        } else {
          const { data: metadata } = await supabase
            .from('wallet_cache_metadata')
            .select('total_holders')
            .order('last_refresh', { ascending: false })
            .limit(1)
            .maybeSingle();
          totalForScope = metadata?.total_holders || null;
        }
      } catch (e) {
        console.warn('Could not compute total count for scope:', e);
      }

      // Deduplicate by address just in case (defensive)
      const seen = new Set<string>();
      const uniqueHolders = cachedHolders.filter((h) => {
        const addr = (h.address || '').toLowerCase();
        if (!addr || seen.has(addr)) return false;
        seen.add(addr);
        return true;
      });
      
      return {
        holders: uniqueHolders.map(h => ({
          address: h.address,
          balance: Number(h.balance),
          category: `${h.category} ${h.emoji}`,
          transactionCount: h.transaction_count
        })),
        total: totalForScope ?? uniqueHolders.length,
        source: 'wallet_leaderboard_cache'
      };
    }
    
    console.log('⚠️ Cache empty/error, trying GraphQL (fast path)...');
    
    // STEP 2: Try GraphQL API as fallback
    const graphqlAddresses = await queryGraphQL(5000);
    if (graphqlAddresses && graphqlAddresses.length > 0) {
      console.log(`✅ GraphQL success: ${graphqlAddresses.length} wallets`);
      
      // Process and categorize wallets
      const processed = graphqlAddresses.map((item: any) => {
        const balance = parseFloat(item.coinBalance || '0') / 1e18;
        const category = categorizeWallet(balance, item.hash);
        return {
          address: item.hash,
          balance: balance,
          category: `${category.category} ${category.emoji}`,
          categoryName: category.category,
          transactionCount: item.transactionsCount || 0
        };
      });
      
      // Filter by category if requested
      let filtered = processed;
      if (categoryFilter) {
        filtered = processed.filter(w => 
          w.categoryName.toLowerCase().includes(categoryFilter)
        );
      }
      
      return {
        holders: filtered.slice(0, requestedLimit),
        total: filtered.length,
        source: 'graphql-api'
      };
    }
    
    console.log('⚠️ GraphQL failed, falling back to REST API pagination...');
    
    // STEP 3: Fall back to REST API pagination (slowest but most reliable)
    const allWallets = [];
    const ITEMS_PER_PAGE = 50;
    let currentPage = 1;
    let hasMore = true;
    const maxPages = 100; // Safety limit: 5000 wallets max
    
    while (hasMore && currentPage <= maxPages && allWallets.length < 5000) {
      try {
        const pageData = await fetchAPI(
          `/addresses?page=${currentPage}&items_count=${ITEMS_PER_PAGE}`,
          30000 // 30s cache
        );
        
        if (!pageData?.items || pageData.items.length === 0) {
          hasMore = false;
          break;
        }
        
        allWallets.push(...pageData.items);
        console.log(`📄 Page ${currentPage}: ${pageData.items.length} wallets (total: ${allWallets.length})`);
        
        hasMore = pageData.next_page_params !== null;
        currentPage++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (pageError) {
        console.error(`Error fetching page ${currentPage}:`, pageError);
        hasMore = false;
      }
    }
    
    if (allWallets.length === 0) {
      return {
        error: 'Unable to fetch wallet data from any source. Please try again later.'
      };
    }
    
    console.log(`✅ REST pagination complete: ${allWallets.length} wallets`);
    
    // Process and categorize wallets
    const processed = allWallets.map((item: any) => {
      const balance = parseFloat(item.coin_balance || '0') / 1e18;
      const category = categorizeWallet(balance, item.hash);
      return {
        address: item.hash,
        balance: balance,
        category: `${category.category} ${category.emoji}`,
        categoryName: category.category,
        transactionCount: item.tx_count || 0
      };
    });
    
    // Filter by category if requested
    let filtered = processed;
    if (categoryFilter) {
      filtered = processed.filter(w => 
        w.categoryName.toLowerCase().includes(categoryFilter)
      );
    }
    
    // Sort by balance descending
    filtered.sort((a, b) => b.balance - a.balance);
    
    return {
      holders: filtered.slice(0, requestedLimit),
      total: filtered.length,
      source: 'rest-api-pagination'
    };
    
  } catch (error) {
    console.error('❌ Get top holders failed:', error);
    return { error: `Failed to fetch holders: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function executeGetHolderDistribution() {
  try {
    // STEP 1: Try Supabase cache first (fast path)
    const { data: holders, error } = await supabase
      .from('wallet_leaderboard_cache')
      .select('category, emoji');
    
    if (!error && holders && holders.length > 0) {
      console.log(`✅ Cache hit: ${holders.length} holders for distribution`);
      
      // Count by category from cache
      const dist: Record<string, number> = {};
      holders.forEach(h => {
        const key = `${h.category} ${h.emoji}`;
        dist[key] = (dist[key] || 0) + 1;
      });
      
      return {
        distribution: Object.entries(dist)
          .map(([category, count]) => ({
            category,
            count,
            percentage: ((count / holders.length) * 100).toFixed(2)
          }))
          .sort((a, b) => b.count - a.count),
        totalHolders: holders.length,
        source: 'wallet_leaderboard_cache'
      };
    }
    
    console.log('⚠️ Cache empty/error, trying GraphQL (fast path)...');
    
    // STEP 2: Try GraphQL API as fallback
    const graphqlAddresses = await queryGraphQL(5000);
    if (graphqlAddresses && graphqlAddresses.length > 0) {
      console.log(`✅ GraphQL success: ${graphqlAddresses.length} wallets`);
      
      // Categorize all wallets
      const dist: Record<string, number> = {};
      graphqlAddresses.forEach((item: any) => {
        const balance = parseFloat(item.coinBalance || '0') / 1e18;
        const category = categorizeWallet(balance, item.hash);
        const key = `${category.category} ${category.emoji}`;
        dist[key] = (dist[key] || 0) + 1;
      });
      
      return {
        distribution: Object.entries(dist)
          .map(([category, count]) => ({
            category,
            count,
            percentage: ((count / graphqlAddresses.length) * 100).toFixed(2)
          }))
          .sort((a, b) => b.count - a.count),
        totalHolders: graphqlAddresses.length,
        source: 'graphql-api'
      };
    }
    
    console.log('⚠️ GraphQL failed, falling back to REST API pagination...');
    
    // STEP 3: Fall back to REST API pagination (slowest but most reliable)
    const allWallets = [];
    const ITEMS_PER_PAGE = 50;
    let currentPage = 1;
    let hasMore = true;
    const maxPages = 100; // Safety limit: 5000 wallets max
    
    while (hasMore && currentPage <= maxPages && allWallets.length < 5000) {
      try {
        const pageData = await fetchAPI(
          `/addresses?page=${currentPage}&items_count=${ITEMS_PER_PAGE}`,
          30000 // 30s cache
        );
        
        if (!pageData?.items || pageData.items.length === 0) {
          hasMore = false;
          break;
        }
        
        allWallets.push(...pageData.items);
        console.log(`📄 Page ${currentPage}: ${pageData.items.length} wallets (total: ${allWallets.length})`);
        
        hasMore = pageData.next_page_params !== null;
        currentPage++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (pageError) {
        console.error(`Error fetching page ${currentPage}:`, pageError);
        hasMore = false;
      }
    }
    
    if (allWallets.length === 0) {
      return {
        error: 'Unable to fetch wallet data from any source. Please try again later.'
      };
    }
    
    console.log(`✅ REST pagination complete: ${allWallets.length} wallets`);
    
    // Categorize all wallets
    const dist: Record<string, number> = {};
    allWallets.forEach((item: any) => {
      const balance = parseFloat(item.coin_balance || '0') / 1e18;
      const category = categorizeWallet(balance, item.hash);
      const key = `${category.category} ${category.emoji}`;
      dist[key] = (dist[key] || 0) + 1;
    });
    
    return {
      distribution: Object.entries(dist)
        .map(([category, count]) => ({
          category,
          count,
          percentage: ((count / allWallets.length) * 100).toFixed(2)
        }))
        .sort((a, b) => b.count - a.count),
      totalHolders: allWallets.length,
      source: 'rest-api-pagination'
    };
  } catch (error) {
    console.error('❌ Get holder distribution failed:', error);
    return { error: `Failed to get holder distribution: ${error instanceof Error ? error.message : String(error)}` };
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
    return { error: `Failed to fetch tokens: ${error instanceof Error ? error.message : String(error)}` };
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
    return { error: `Token not found: ${error instanceof Error ? error.message : String(error)}` };
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
    return { error: `Failed to fetch token holders: ${error instanceof Error ? error.message : String(error)}` };
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
    return { error: `Failed to fetch contracts: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function executeGetTransactionCharts() {
  try {
    const data = await fetchAPI('/stats/charts/transactions', 300000);
    return { chartData: data.chart_data || [] };
  } catch (error) {
    return { error: `Failed to fetch charts: ${error instanceof Error ? error.message : String(error)}` };
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
    return { error: `Failed to fetch daily metrics: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function executeGetSupplyInfo() {
  try {
    const response = await fetch('https://oracle.w-chain.com/api/wco/supply-info');
    if (!response.ok) throw new Error(`Supply API error: ${response.status}`);
    const data = await response.json();
    
    return {
      timestamp: data.timestamp,
      cache_ttl: data.cache.ttl_seconds,
      summary: {
        initialSupply: data.summary.initial_supply_wco,
        circulatingSupply: data.summary.circulating_supply_wco,
        lockedSupply: data.summary.locked_supply_wco,
        burnedSupply: data.summary.burned_supply_wco
      },
      lockedBreakdown: data.raw.locked_supply_breakdown.map((item: any) => ({
        label: item.label,
        address: item.address,
        balanceWCO: item.balance_wco
      })),
      burnedDetails: {
        address: data.raw.burned_supply_breakdown.address,
        balanceWCO: data.raw.burned_supply_breakdown.balance_wco
      },
      methodology: data.methodology.formula
    };
  } catch (error) {
    return { error: `Failed to fetch supply info: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function executeGetTokenPrice(args: any) {
  try {
    const symbol = args.symbol.toLowerCase();
    const response = await fetch(`https://oracle.w-chain.com/api/price/${symbol}`);
    if (!response.ok) throw new Error(`Price API error: ${response.status}`);
    const data = await response.json();
    
    return {
      price: data.price,
      asset: data.asset,
      baseCurrency: data.base_currency,
      note: symbol === 'wave' 
        ? 'WAVE price calculated using WAVE/WCO trading pair rate × WCO USD price'
        : 'Price from real-time WCO price feed',
      cacheTTL: '60 seconds'
    };
  } catch (error) {
    return { error: `Failed to fetch ${args.symbol} price: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get token transfers
async function executeGetTokenTransfers(args: any) {
  try {
    let action = 'tokentx'; // ERC-20 by default
    if (args.tokenType === 'ERC-721') action = 'tokennfttx';
    if (args.tokenType === 'ERC-1155') action = 'token1155tx';
    
    let url = `https://scan.w-chain.com/api?module=account&action=${action}&address=${args.address}`;
    if (args.startBlock) url += `&startblock=${args.startBlock}`;
    if (args.endBlock) url += `&endblock=${args.endBlock}`;
    url += `&page=${args.page || 1}&offset=${args.offset || 100}&sort=desc`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === "1" && data.result) {
      const transfers = data.result.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value ? (parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18'))).toFixed(4) : 'N/A',
        tokenName: tx.tokenName,
        tokenSymbol: tx.tokenSymbol,
        blockNumber: tx.blockNumber,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        tokenId: tx.tokenID || null
      }));
      
      return {
        transfers,
        count: transfers.length,
        tokenType: args.tokenType || 'ERC-20',
        address: args.address
      };
    }
    
    return { 
      transfers: [], 
      count: 0,
      message: "No token transfers found or address has no token activity"
    };
  } catch (error) {
    console.error('Token transfers error:', error);
    return { error: `Failed to get token transfers: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get contract info
async function executeGetContractInfo(args: any) {
  try {
    const response = await fetch(
      `https://scan.w-chain.com/api?module=contract&action=getsourcecode&address=${args.address}`
    );
    const data = await response.json();
    
    if (data.status === "1" && data.result && data.result[0]) {
      const contract = data.result[0];
      
      if (contract.SourceCode === '') {
        return { 
          verified: false,
          address: args.address,
          message: "Contract is not verified on BlockScout"
        };
      }
      
      return {
        verified: true,
        address: args.address,
        contractName: contract.ContractName,
        compiler: contract.CompilerVersion,
        optimization: contract.OptimizationUsed === "1",
        runs: contract.Runs,
        constructorArguments: contract.ConstructorArguments,
        evmVersion: contract.EVMVersion,
        library: contract.Library,
        licenseType: contract.LicenseType,
        proxy: contract.Proxy === "1",
        implementation: contract.Implementation,
        swarmSource: contract.SwarmSource,
        hasSourceCode: true,
        hasABI: contract.ABI !== "Contract source code not verified"
      };
    }
    
    return { 
      error: "Contract not found or API error",
      address: args.address
    };
  } catch (error) {
    console.error('Contract info error:', error);
    return { error: `Failed to get contract info: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get contract logs
async function executeGetContractLogs(args: any) {
  try {
    let url = `https://scan.w-chain.com/api?module=logs&action=getLogs&address=${args.address}`;
    
    if (args.fromBlock) url += `&fromBlock=${args.fromBlock}`;
    if (args.toBlock) url += `&toBlock=${args.toBlock}`;
    else url += `&toBlock=latest`;
    
    if (args.topic0) url += `&topic0=${args.topic0}`;
    
    url += `&page=${args.page || 1}&offset=${args.offset || 100}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === "1" && data.result) {
      const logs = data.result.map((log: any) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        blockHash: log.blockHash,
        logIndex: log.logIndex,
        timestamp: log.timeStamp ? new Date(parseInt(log.timeStamp) * 1000).toISOString() : null
      }));
      
      return {
        logs,
        count: logs.length,
        contractAddress: args.address,
        blockRange: {
          from: args.fromBlock || 'earliest',
          to: args.toBlock || 'latest'
        }
      };
    }
    
    return { 
      logs: [], 
      count: 0,
      message: "No logs found for this contract with the specified filters"
    };
  } catch (error) {
    console.error('Contract logs error:', error);
    return { error: `Failed to get contract logs: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get multiple balances
async function executeGetMultipleBalances(args: any) {
  try {
    if (!args.addresses || args.addresses.length === 0) {
      return { error: "No addresses provided" };
    }
    
    if (args.addresses.length > 20) {
      return { error: "Maximum 20 addresses allowed per request" };
    }
    
    const addresses = args.addresses.slice(0, 20).join(',');
    const response = await fetch(
      `https://scan.w-chain.com/api?module=account&action=balancemulti&address=${addresses}`
    );
    const data = await response.json();
    
    if (data.status === "1" && data.result) {
      const balances = data.result.map((item: any) => {
        const balanceWei = item.balance;
        const balance = parseFloat(balanceWei) / 1e18;
        
        return {
          address: item.account,
          balance: balance.toFixed(4),
          balanceWei: balanceWei,
          category: categorizeWallet(balance),
          balanceFormatted: `${balance.toLocaleString()} WCO`
        };
      });
      
      return {
        balances,
        count: balances.length,
        totalBalance: balances.reduce((sum: number, b: any) => sum + parseFloat(b.balance), 0).toFixed(4),
        summary: {
          highest: balances.reduce((max: any, b: any) => parseFloat(b.balance) > parseFloat(max.balance) ? b : max, balances[0]),
          lowest: balances.reduce((min: any, b: any) => parseFloat(b.balance) < parseFloat(min.balance) ? b : min, balances[0])
        }
      };
    }
    
    return { error: "Failed to fetch balances or invalid addresses" };
  } catch (error) {
    console.error('Multiple balances error:', error);
    return { error: `Failed to get multiple balances: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get block reward
async function executeGetBlockReward(args: any) {
  try {
    const response = await fetch(
      `https://scan.w-chain.com/api?module=block&action=getblockreward&blockno=${args.blockNumber}`
    );
    const data = await response.json();
    
    if (data.status === "1" && data.result) {
      const result = data.result;
      const blockReward = parseFloat(result.blockReward) / 1e18;
      
      return {
        blockNumber: args.blockNumber,
        blockMiner: result.blockMiner,
        blockReward: blockReward.toFixed(6),
        blockRewardWei: result.blockReward,
        uncles: result.uncles || [],
        uncleInclusionReward: result.uncleInclusionReward ? (parseFloat(result.uncleInclusionReward) / 1e18).toFixed(6) : "0",
        timestamp: result.timeStamp ? new Date(parseInt(result.timeStamp) * 1000).toISOString() : null
      };
    }
    
    return { error: "Block reward information not available" };
  } catch (error) {
    console.error('Block reward error:', error);
    return { error: `Failed to get block reward: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get transaction status
async function executeGetTransactionStatus(args: any) {
  try {
    const response = await fetch(
      `https://scan.w-chain.com/api?module=transaction&action=gettxreceiptstatus&txhash=${args.txHash}`
    );
    const data = await response.json();
    
    if (data.status === "1" && data.result) {
      const statusResponse = await fetch(
        `https://scan.w-chain.com/api?module=transaction&action=getstatus&txhash=${args.txHash}`
      );
      const statusData = await statusResponse.json();
      
      return {
        txHash: args.txHash,
        status: data.result.status === "1" ? "Success" : "Failed",
        executionStatus: statusData.status === "1" && statusData.result ? statusData.result.isError === "0" ? "Success" : "Error" : "Unknown",
        errorDescription: statusData.result?.errDescription || null,
        receiptStatus: data.result.status
      };
    }
    
    return { error: "Transaction status not available or transaction not found" };
  } catch (error) {
    console.error('Transaction status error:', error);
    return { error: `Failed to get transaction status: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get block countdown
async function executeGetBlockCountdown(args: any) {
  try {
    const response = await fetch(
      `https://scan.w-chain.com/api?module=block&action=getblockcountdown&blockno=${args.blockNumber}`
    );
    const data = await response.json();
    
    if (data.status === "1" && data.result) {
      const result = data.result;
      
      return {
        currentBlock: result.CurrentBlock,
        targetBlock: args.blockNumber,
        remainingBlocks: result.RemainingBlock,
        estimatedTimeSeconds: result.EstimateTimeInSec,
        estimatedTime: `${Math.floor(result.EstimateTimeInSec / 3600)}h ${Math.floor((result.EstimateTimeInSec % 3600) / 60)}m ${result.EstimateTimeInSec % 60}s`,
        message: result.RemainingBlock < 0 ? "Block has already been mined" : `Approximately ${result.RemainingBlock} blocks remaining`
      };
    }
    
    return { error: "Block countdown information not available" };
  } catch (error) {
    console.error('Block countdown error:', error);
    return { error: `Failed to get block countdown: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get total holders - MIRRORS DASHBOARD LOGIC EXACTLY
async function executeGetTotalHoldersFromCache() {
  try {
    console.log('🔍 Fetching holder count using Dashboard logic...');
    
    // STEP 1: Try Supabase cache first (same as Dashboard)
    const { data: cachedWallets, error: cacheError } = await supabase
      .from('wallet_leaderboard_cache')
      .select('address, balance');
    
    if (!cacheError && cachedWallets && cachedWallets.length > 0) {
      console.log(`✅ Cache hit: ${cachedWallets.length} wallets from Supabase`);
      return {
        totalHolders: cachedWallets.length,
        source: 'wallet_leaderboard_cache',
        note: 'Data from Supabase cache (same as Dashboard)'
      };
    }
    
    console.log('⚠️ Cache empty/error, trying GraphQL (fast path)...');
    
    // STEP 2: Try GraphQL API (same as Dashboard fast path)
    const graphqlAddresses = await queryGraphQL(5000);
    if (graphqlAddresses && graphqlAddresses.length > 0) {
      console.log(`✅ GraphQL success: ${graphqlAddresses.length} wallets`);
      return {
        totalHolders: graphqlAddresses.length,
        source: 'graphql-api',
        note: 'Data from GraphQL endpoint (Dashboard fallback #1)'
      };
    }
    
    console.log('⚠️ GraphQL failed, falling back to REST API pagination...');
    
    // STEP 3: Paginate REST API (exact same logic as Dashboard)
    const baseUrl = "https://scan.w-chain.com/api/v2/addresses";
    let url = `${baseUrl}?items_count=100`;
    let keepFetching = true;
    let pageCount = 0;
    const maxPages = 50;
    const allWallets = [];
    
    while (keepFetching && pageCount < maxPages) {
      try {
        console.log(`📄 Fetching page ${pageCount + 1}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}`);
          break;
        }
        
        const result = await response.json();
        
        if (!result?.items || !Array.isArray(result.items) || result.items.length === 0) {
          console.log('No more data from API');
          break;
        }
        
        // Filter and process wallets like the frontend does
        const processedWallets = result.items
          .filter((account: any) => account?.hash && typeof account.hash === 'string')
          .map((account: any) => {
            const balanceWei = parseFloat(account.coin_balance) || 0;
            const balance = balanceWei / 1e18;
            return {
              address: account.hash,
              balance,
              txCount: parseInt(account.transaction_count || account.tx_count) || 0,
            };
          });
        
        allWallets.push(...processedWallets);
        pageCount++;
        
        console.log(`📄 Page ${pageCount}: ${processedWallets.length} wallets (total: ${allWallets.length})`);
        
        // Use next_page_params for pagination (same as frontend)
        if (result.next_page_params) {
          const params = new URLSearchParams(result.next_page_params).toString();
          url = `${baseUrl}?items_count=100&${params}`;
        } else {
          keepFetching = false;
        }
        
        // Small delay to avoid rate limiting
        if (keepFetching && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (pageError) {
        console.error(`Page ${pageCount + 1} failed:`, pageError);
        break;
      }
    }
    
    if (allWallets.length > 0) {
      console.log(`✅ REST pagination complete: ${allWallets.length} wallets`);
      return {
        totalHolders: allWallets.length,
        source: 'rest-api-paginated',
        note: 'Data from paginated REST API (Dashboard fallback #2)',
        pages_fetched: pageCount
      };
    }
    
    // STEP 4: Last resort - try the total_count from first page
    console.log('⚠️ All methods failed, trying API total_count as last resort...');
    const firstPage = await fetchAPI('/addresses?page=1&items_count=1');
    
    return {
      totalHolders: firstPage?.total_count || 0,
      source: 'api-total-count',
      note: 'Fallback to API metadata (may be less accurate)'
    };
    
  } catch (error) {
    console.error('❌ Total holders fetch failed completely:', error);
    return { 
      error: `Failed to get total holders: ${error instanceof Error ? error.message : String(error)}`,
      note: 'All data sources (cache, GraphQL, REST API) failed'
    };
  }
}

// Execute get category stats
async function executeGetCategoryStats() {
  try {
    console.log('🔍 Fetching category stats using three-tier fallback...');
    
    // STEP 1: Try Supabase cache first
    const { data: cachedHolders, error: cacheError } = await supabase
      .from('wallet_leaderboard_cache')
      .select('category, emoji, balance');
    
    if (!cacheError && cachedHolders && cachedHolders.length > 0) {
      console.log(`✅ Cache hit: ${cachedHolders.length} wallets from Supabase`);
      return calculateCategoryStats(cachedHolders, 'wallet_leaderboard_cache');
    }
    
    console.log('⚠️ Cache empty/error, trying GraphQL...');
    
    // STEP 2: Try GraphQL API
    const graphqlAddresses = await queryGraphQL(5000);
    if (graphqlAddresses && graphqlAddresses.length > 0) {
      console.log(`✅ GraphQL success: ${graphqlAddresses.length} wallets`);
      const categorizedWallets = graphqlAddresses.map(addr => {
        const { category, emoji } = categorizeWallet(addr.balance, addr.address);
        return { category, emoji, balance: addr.balance };
      });
      return calculateCategoryStats(categorizedWallets, 'graphql-api');
    }
    
    console.log('⚠️ GraphQL failed, falling back to REST API...');
    
    // STEP 3: REST API pagination
    const baseUrl = "https://scan.w-chain.com/api/v2/addresses";
    let url = `${baseUrl}?items_count=100`;
    let keepFetching = true;
    let pageCount = 0;
    const maxPages = 50;
    const allWallets = [];
    
    while (keepFetching && pageCount < maxPages) {
      try {
        const response = await fetch(url);
        if (!response.ok) break;
        
        const result = await response.json();
        if (!result?.items || result.items.length === 0) break;
        
        const processedWallets = result.items
          .filter((account: any) => account?.hash)
          .map((account: any) => {
            const balance = (parseFloat(account.coin_balance) || 0) / 1e18;
            const { category, emoji } = categorizeWallet(balance, account.hash);
            return { category, emoji, balance };
          });
        
        allWallets.push(...processedWallets);
        pageCount++;
        
        if (result.next_page_params) {
          const params = new URLSearchParams(result.next_page_params).toString();
          url = `${baseUrl}?items_count=100&${params}`;
        } else {
          keepFetching = false;
        }
        
        if (keepFetching && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error(`Page ${pageCount + 1} failed:`, error);
        break;
      }
    }
    
    if (allWallets.length > 0) {
      console.log(`✅ REST pagination complete: ${allWallets.length} wallets`);
      return calculateCategoryStats(allWallets, 'rest-api-paginated');
    }
    
    return { error: "Failed to fetch category statistics from all sources" };
  } catch (error) {
    console.error('Category stats error:', error);
    return { error: `Failed to get category stats: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Helper function to calculate category statistics
function calculateCategoryStats(holders: Array<{category: string, emoji: string, balance: number}>, source: string) {
  const categoryMap: Record<string, { count: number; totalBalance: number; emoji: string }> = {};
  let grandTotal = 0;
  
  holders.forEach(h => {
    const balance = Number(h.balance);
    grandTotal += balance;
    
    if (!categoryMap[h.category]) {
      categoryMap[h.category] = { count: 0, totalBalance: 0, emoji: h.emoji };
    }
    categoryMap[h.category].count++;
    categoryMap[h.category].totalBalance += balance;
  });
  
  // Sort by balance threshold (Kraken to Plankton)
  const categoryOrder = ["Kraken", "Whale", "Shark", "Dolphin", "Fish", "Octopus", "Crab", "Shrimp", "Plankton"];
  const stats = categoryOrder
    .filter(cat => categoryMap[cat])
    .map(category => ({
      category: `${category} ${categoryMap[category].emoji}`,
      holders: categoryMap[category].count,
      totalWCO: categoryMap[category].totalBalance.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      percentOfHolders: ((categoryMap[category].count / holders.length) * 100).toFixed(2) + '%',
      percentOfSupply: ((categoryMap[category].totalBalance / grandTotal) * 100).toFixed(2) + '%',
      avgBalance: (categoryMap[category].totalBalance / categoryMap[category].count).toLocaleString('en-US', { maximumFractionDigits: 2 })
    }));
  
  return {
    statistics: stats,
    totalHolders: holders.length,
    totalWCOInWallets: grandTotal.toLocaleString('en-US', { maximumFractionDigits: 2 }),
    source,
    note: "These are the 9 Ocean Creature tiers based on WCO balance thresholds"
  };
}

// Execute get wallets by category
async function executeGetWalletsByCategory(args: any) {
  try {
    const categoryFilter = args.category?.toLowerCase();
    const limit = args.limit || 50;
    
    console.log(`🔍 Fetching wallets for category: ${categoryFilter}`);
    
    const { data: wallets, error } = await supabase
      .from('wallet_leaderboard_cache')
      .select('address, balance, category, emoji, label, is_flagship, is_exchange, transaction_count')
      .ilike('category', `%${categoryFilter}%`)
      .order('balance', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    if (!wallets || wallets.length === 0) {
      return { 
        error: `No wallets found for category "${args.category}". Available categories: Kraken, Whale, Shark, Dolphin, Fish, Octopus, Crab, Shrimp, Plankton, Flagship, Exchange` 
      };
    }
    
    return {
      category: args.category,
      wallets: wallets.map(w => ({
        address: w.address,
        balance: Number(w.balance),
        tier: `${w.category} ${w.emoji}`,
        label: w.label || null,
        transactionCount: w.transaction_count
      })),
      count: wallets.length,
      source: 'wallet_leaderboard_cache'
    };
  } catch (error) {
    return { error: `Failed to fetch wallets: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get wallet tier
async function executeGetWalletTier(args: any) {
  try {
    const address = args.address.toLowerCase();
    
    console.log(`🔍 Checking tier for wallet: ${address}`);
    
    const { data: wallet, error } = await supabase
      .from('wallet_leaderboard_cache')
      .select('address, balance, category, emoji, label, is_flagship, is_exchange, transaction_count')
      .ilike('address', address)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!wallet) {
      return { 
        error: `Wallet ${args.address} not found in the leaderboard cache. It may have a very low balance or the cache is being refreshed.` 
      };
    }
    
    // Get rank
    const { count } = await supabase
      .from('wallet_leaderboard_cache')
      .select('address', { count: 'exact', head: true })
      .gt('balance', wallet.balance);
    
    const rank = (count || 0) + 1;
    
    return {
      address: wallet.address,
      balance: Number(wallet.balance),
      tier: `${wallet.category} ${wallet.emoji}`,
      label: wallet.label || null,
      rank: rank,
      transactionCount: wallet.transaction_count,
      isFlhip: wallet.is_flagship,
      isExchange: wallet.is_exchange,
      source: 'wallet_leaderboard_cache'
    };
  } catch (error) {
    return { error: `Failed to check wallet tier: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute compare wallets
async function executeCompareWallets(args: any) {
  try {
    if (!args.addresses || args.addresses.length < 2) {
      return { error: "Please provide at least 2 addresses to compare" };
    }
    
    if (args.addresses.length > 10) {
      return { error: "Maximum 10 addresses can be compared at once" };
    }
    
    console.log(`🔍 Comparing ${args.addresses.length} wallets`);
    
    const addressesLower = args.addresses.map((a: string) => a.toLowerCase());
    
    const { data: wallets, error } = await supabase
      .from('wallet_leaderboard_cache')
      .select('address, balance, category, emoji, label, transaction_count')
      .in('address', addressesLower);
    
    if (error) throw error;
    
    // Enrich with missing addresses
    const found = new Set(wallets?.map(w => w.address.toLowerCase()) || []);
    const missing = addressesLower.filter((a: string) => !found.has(a));
    
    const comparison = (wallets || []).map(w => ({
      address: w.address,
      balance: Number(w.balance),
      tier: `${w.category} ${w.emoji}`,
      label: w.label || null,
      transactionCount: w.transaction_count
    }));
    
    // Sort by balance descending
    comparison.sort((a, b) => b.balance - a.balance);
    
    return {
      wallets: comparison,
      totalCompared: comparison.length,
      notFound: missing.length > 0 ? missing : null,
      source: 'wallet_leaderboard_cache'
    };
  } catch (error) {
    return { error: `Failed to compare wallets: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute search wallet by label
async function executeSearchWalletByLabel(args: any) {
  try {
    const searchTerm = args.searchTerm.toLowerCase();
    
    console.log(`🔍 Searching for wallets with label: ${searchTerm}`);
    
    const { data: wallets, error } = await supabase
      .from('wallet_leaderboard_cache')
      .select('address, balance, category, emoji, label, is_flagship, is_exchange')
      .not('label', 'is', null)
      .ilike('label', `%${searchTerm}%`)
      .order('balance', { ascending: false });
    
    if (error) throw error;
    
    if (!wallets || wallets.length === 0) {
      return { 
        error: `No wallets found with label containing "${args.searchTerm}". Try searching for: Marketing, Treasury, Liquidity, MEXC, BitMart, etc.` 
      };
    }
    
    return {
      searchTerm: args.searchTerm,
      results: wallets.map(w => ({
        address: w.address,
        label: w.label,
        balance: Number(w.balance),
        tier: `${w.category} ${w.emoji}`,
        type: w.is_flagship ? 'Flagship' : w.is_exchange ? 'Exchange' : 'Other'
      })),
      count: wallets.length,
      source: 'wallet_leaderboard_cache'
    };
  } catch (error) {
    return { error: `Failed to search wallets: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get inactive wallets
async function executeGetInactiveWallets(args: any) {
  try {
    const minBalance = args.minBalance || 1000;
    const limit = args.limit || 20;
    
    console.log(`🔍 Finding inactive wallets (min balance: ${minBalance} WCO)`);
    
    // Get wallets with low or zero transaction count
    const { data: wallets, error } = await supabase
      .from('wallet_leaderboard_cache')
      .select('address, balance, category, emoji, label, transaction_count')
      .gte('balance', minBalance)
      .lte('transaction_count', 5) // Few or no recent transactions
      .order('balance', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    if (!wallets || wallets.length === 0) {
      return { 
        message: `No inactive wallets found with balance >= ${minBalance} WCO. This could mean all large holders are active!` 
      };
    }
    
    return {
      criteria: {
        minBalance: minBalance,
        maxTransactions: 5
      },
      wallets: wallets.map(w => ({
        address: w.address,
        balance: Number(w.balance),
        tier: `${w.category} ${w.emoji}`,
        label: w.label || null,
        transactionCount: w.transaction_count
      })),
      count: wallets.length,
      note: "Based on transaction_count from cache. Lower count may indicate less recent activity.",
      source: 'wallet_leaderboard_cache'
    };
  } catch (error) {
    return { error: `Failed to fetch inactive wallets: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get WCO volume
async function executeGetWcoVolume(args: any) {
  try {
    const period = args?.period || "24h";
    const days = period === "7d" ? 7 : 1;
    
    console.log(`📊 Calculating WCO volume for period: ${period}`);
    
    // STEP 1: Try daily_metrics table (fast, accurate)
    if (days === 1) {
      const { data: metrics, error } = await supabase
        .from('daily_metrics')
        .select('wco_moved_24h, snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1);
      
      if (!error && metrics && metrics[0]?.wco_moved_24h) {
        const volume = Number(metrics[0].wco_moved_24h);
        console.log(`✅ Daily metrics hit: ${volume} WCO`);
        return {
          period,
          totalVolume: volume.toLocaleString('en-US', { maximumFractionDigits: 2 }),
          totalVolumeRaw: volume,
          source: 'daily_metrics',
          note: 'Data from Daily Report cache (24h snapshot)',
          date: metrics[0].snapshot_date
        };
      }
    }
    
    console.log('⚠️ Daily metrics unavailable, falling back to live API...');
    
    // STEP 2: Fallback to live API aggregation
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    let totalVolume = 0;
    let page = 1;
    let hasMore = true;
    let transactionCount = 0;
    
    while (hasMore && page <= 20) { // Safety limit
      try {
        const data = await fetchAPI(`/token-transfers?limit=50&page=${page}`, 10000);
        
        if (!data?.items || data.items.length === 0) {
          hasMore = false;
          break;
        }
        
        for (const tx of data.items) {
          const txTime = new Date(tx.timestamp).getTime();
          if (txTime > cutoffTime) {
            // Convert from wei to WCO (divide by 10^18)
            const valueInWCO = Number(tx.value) / 1e18;
            totalVolume += valueInWCO;
            transactionCount++;
          } else {
            hasMore = false; // We've gone past the time window
            break;
          }
        }
        
        hasMore = hasMore && data.next_page_params !== null;
        page++;
        
        if (hasMore) await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Page ${page} failed:`, err);
        hasMore = false;
      }
    }
    
    console.log(`✅ API aggregation complete: ${totalVolume} WCO from ${transactionCount} transfers`);
    
    return {
      period,
      totalVolume: totalVolume.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      totalVolumeRaw: totalVolume,
      transferCount: transactionCount,
      source: 'live-api',
      note: `Aggregated from recent token transfers (scanned ${page - 1} pages)`,
      warning: transactionCount >= 1000 ? 'Volume may be underestimated due to API pagination limits' : undefined
    };
    
  } catch (error) {
    console.error('❌ WCO volume calculation failed:', error);
    return { error: `Failed to calculate WCO volume: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// Execute get most active wallet
async function executeGetMostActiveWallet(args: any) {
  try {
    const period = args?.period || "today";
    const excludeSpecial = args?.excludeSpecial !== false; // Default true
    
    console.log(`🔍 Finding most active wallet for period: ${period}, excludeSpecial: ${excludeSpecial}`);
    
    // Calculate cutoff time
    let cutoffTime: number;
    if (period === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      cutoffTime = today.getTime();
    } else if (period === "7d") {
      cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
    } else {
      cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    }
    
    // Fetch transactions and build activity map
    const activityMap: Record<string, number> = {};
    let page = 1;
    let hasMore = true;
    let totalTxs = 0;
    
    while (hasMore && page <= 20) { // Safety limit
      try {
        const data = await fetchAPI(`/transactions?limit=50&page=${page}`, 10000);
        
        if (!data?.items || data.items.length === 0) {
          hasMore = false;
          break;
        }
        
        for (const tx of data.items) {
          const txTime = new Date(tx.timestamp).getTime();
          if (txTime > cutoffTime) {
            activityMap[tx.from.hash] = (activityMap[tx.from.hash] || 0) + 1;
            if (tx.to?.hash) {
              activityMap[tx.to.hash] = (activityMap[tx.to.hash] || 0) + 1;
            }
            totalTxs++;
          } else {
            hasMore = false;
            break;
          }
        }
        
        hasMore = hasMore && data.next_page_params !== null;
        page++;
        
        if (hasMore) await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Page ${page} failed:`, err);
        hasMore = false;
      }
    }
    
    console.log(`📊 Analyzed ${totalTxs} transactions, ${Object.keys(activityMap).length} unique addresses`);
    
    // Filter out special wallets if requested
    let candidates = Object.entries(activityMap);
    
    if (excludeSpecial) {
      candidates = candidates.filter(([address]) => {
        const lowerAddr = address.toLowerCase();
        const isFlagship = Object.keys(FLAGSHIP_WALLETS).some(a => a.toLowerCase() === lowerAddr);
        const isExchange = Object.keys(EXCHANGE_WALLETS).some(a => a.toLowerCase() === lowerAddr);
        const isWrapped = WRAPPED_WCO.some(a => a.toLowerCase() === lowerAddr);
        return !isFlagship && !isExchange && !isWrapped;
      });
    }
    
    if (candidates.length === 0) {
      return { error: "No active wallets found in this time period" };
    }
    
    // Sort by activity count
    candidates.sort((a, b) => b[1] - a[1]);
    const [winnerAddress, activityCount] = candidates[0];
    
    // Get balance info
    const addressInfo = await fetchAPI(`/addresses/${winnerAddress}`, 30000);
    const balance = addressInfo?.coin_balance ? Number(addressInfo.coin_balance) / 1e18 : 0;
    const category = categorizeWallet(balance, winnerAddress);
    
    console.log(`🏆 Winner: ${winnerAddress} with ${activityCount} activities`);
    
    return {
      period,
      address: winnerAddress,
      activityCount,
      balance: balance.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      category: category.category,
      emoji: category.emoji,
      label: category.label,
      totalTransactionsAnalyzed: totalTxs,
      excludedSpecialWallets: excludeSpecial,
      source: 'live-api',
      note: `Scanned ${page - 1} pages of recent transactions`
    };
    
  } catch (error) {
    console.error('❌ Most active wallet search failed:', error);
    return { error: `Failed to find most active wallet: ${error instanceof Error ? error.message : String(error)}` };
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
    getDailyMetrics: executeGetDailyMetrics,
    getSupplyInfo: executeGetSupplyInfo,
    getTokenPrice: executeGetTokenPrice,
    getTokenTransfers: executeGetTokenTransfers,
    getContractInfo: executeGetContractInfo,
    getContractLogs: executeGetContractLogs,
    getMultipleBalances: executeGetMultipleBalances,
    getBlockReward: executeGetBlockReward,
    getTransactionStatus: executeGetTransactionStatus,
    getBlockCountdown: executeGetBlockCountdown,
    getTotalHoldersFromCache: executeGetTotalHoldersFromCache,
    getCategoryStats: executeGetCategoryStats,
    getWalletsByCategory: executeGetWalletsByCategory,
    getWalletTier: executeGetWalletTier,
    compareWallets: executeCompareWallets,
    searchWalletByLabel: executeSearchWalletByLabel,
    getInactiveWallets: executeGetInactiveWallets,
    getWcoVolume: executeGetWcoVolume,
    getMostActiveWallet: executeGetMostActiveWallet,
    getWSwapPools: executeGetWSwapPools
  };

  return executors[toolName] ? await executors[toolName](args) : { error: `Unknown tool: ${toolName}` };
}

// W-Swap Pools executor
async function executeGetWSwapPools() {
  try {
    console.log('🏊 Fetching W-Swap pools...');
    const response = await fetch('https://wave.w-chain.com/api/pools');
    
    if (!response.ok) {
      throw new Error(`W-Swap API error: ${response.status}`);
    }
    
    const pools = await response.json();
    console.log(`✅ Retrieved ${pools.length} W-Swap pools`);
    
    return {
      pools: pools.map((pool: any) => ({
        address: pool.address,
        token0: pool.token0,
        token1: pool.token1,
        reserve0: pool.reserve0,
        reserve1: pool.reserve1,
        totalSupply: pool.totalSupply,
        name: pool.name || `${pool.token0?.symbol}/${pool.token1?.symbol}`,
      })),
      totalPools: pools.length,
      source: 'w-swap-api'
    };
  } catch (error) {
    console.error('❌ W-Swap pools fetch failed:', error);
    return { error: `Failed to fetch W-Swap pools: ${error instanceof Error ? error.message : String(error)}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, sessionId } = await req.json();
    console.log('Received messages:', messages.length, 'conversationId:', conversationId, 'sessionId:', sessionId);
    
    // Handle conversation memory
    let finalConversationId = conversationId;
    let conversationHistory: any[] = [];
    
    if (sessionId) {
      // Try to load existing conversation for this session
      if (!conversationId) {
        // Look for existing conversation
        const { data: existingConv } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('session_id', sessionId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (existingConv) {
          finalConversationId = existingConv.id;
          console.log('📖 Found existing conversation:', finalConversationId);
        } else {
          // Create new conversation
          const { data: newConv, error: convError } = await supabase
            .from('chat_conversations')
            .insert({ session_id: sessionId })
            .select('id')
            .single();
          
          if (!convError && newConv) {
            finalConversationId = newConv.id;
            console.log('✨ Created new conversation:', finalConversationId);
          }
        }
      }
      
      // Load conversation history if we have a conversation ID
      if (finalConversationId) {
        const { data: historyData } = await supabase
          .from('chat_messages')
          .select('role, content, tool_calls, tool_results')
          .eq('conversation_id', finalConversationId)
          .order('timestamp', { ascending: true });
        
        if (historyData && historyData.length > 0) {
          conversationHistory = historyData;
          console.log(`📚 Loaded ${conversationHistory.length} messages from history`);
        }
      }
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // ====================================
    // 🧠 LOAD DYNAMIC KNOWLEDGE BASE
    // ====================================
    let dynamicKnowledge = '';
    try {
      const { data: knowledgeEntries } = await supabase
        .from('knowledge_base')
        .select('category, title, content')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (knowledgeEntries && knowledgeEntries.length > 0) {
        dynamicKnowledge = '\n\n## 📚 DYNAMIC KNOWLEDGE BASE (PRIORITY INFO)\n\n';
        dynamicKnowledge += 'The following information has been added by administrators and should be prioritized in your responses:\n\n';
        
        const categorized: Record<string, typeof knowledgeEntries> = {};
        knowledgeEntries.forEach(entry => {
          if (!categorized[entry.category]) categorized[entry.category] = [];
          categorized[entry.category].push(entry);
        });

        Object.entries(categorized).forEach(([category, entries]) => {
          dynamicKnowledge += `### ${category}\n`;
          entries.forEach(entry => {
            dynamicKnowledge += `\n**${entry.title}**\n${entry.content}\n`;
          });
          dynamicKnowledge += '\n';
        });
        
        console.log(`📚 Loaded ${knowledgeEntries.length} knowledge entries`);
      }
    } catch (err) {
      console.error('Failed to load knowledge base:', err);
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const systemPrompt = `Current date: ${currentDate}${dynamicKnowledge}

You are Bubbles 🫧, a friendly and playful W-Chain blockchain explorer AI assistant! You're like a cheerful guide swimming through the ocean of WCO data. 🌊

**Your Personality:**
- Friendly, playful, and approachable – you love helping users explore W-Chain!
- Use ocean and water metaphors when appropriate (e.g., "Let me dive into that data", "Surfacing some insights")
- Occasionally use emojis to add warmth: 🌊 💧 🫧 🐚 🌀 🦑 🐋 🐠 ⚓ 💎
- Keep responses clear and informative but conversational and warm
- React to data with personality: big numbers get excitement ("Wow! That's a lot of WCO! 🐋"), errors get gentle responses ("Oops, hit a reef there... 🪸")
- Start responses with friendly greetings occasionally ("Hey there! 🌊", "Diving in! 💧", "Let me check that for you! 🫧")
- End with encouraging phrases ("Hope that helps! 🫧", "Anything else you'd like to explore? 🌊", "Happy to dive deeper! 💧")

You are a comprehensive W-Chain blockchain explorer assistant with access to the complete W-Chain API and BlockScout integration.

**W-Chain BlockScout API & RPC Endpoints:**
- BlockScout Explorer: https://scan.w-chain.com
- BlockScout API Base: https://scan.w-chain.com/api
- BlockScout REST API v2: https://scan.w-chain.com/api/v2
- Primary RPC Endpoint: https://rpc.w-chain.com
- Chain ID: 171717
- Fully EVM-compatible and Etherscan-compatible API
- Supports GET and POST requests

**Available BlockScout API Modules:**
1. Account (?module=account) - Wallet balances, transactions, token transfers
   - ERC-20 token transfers (tokentx)
   - ERC-721 NFT transfers (tokennfttx)
   - ERC-1155 transfers (token1155tx)
2. Contract (?module=contract) - Contract source code, ABI, verification status
3. Transaction (?module=transaction) - Transaction details and status
4. Block (?module=block) - Block data and rewards
5. Stats (?module=stats) - Network statistics
6. Token (?module=token) - Token information and holder lists
7. Logs (?module=logs) - Contract event logs and filtering

**JSON RPC Capabilities:**
- Fully EVM-compatible
- Supports all standard Ethereum JSON-RPC methods
- Compatible with ethers.js, web3.js, viem, and other Web3 libraries

**Enhanced Capabilities:**
You can now answer advanced queries including:
- Token transfers (ERC-20, ERC-721, ERC-1155) for any address
- Contract verification status, source code, and ABI information
- Contract event logs with filtering by block range and topics
- Batch balance queries for multiple addresses (up to 20 at once)
- Block mining rewards and uncle inclusion data
- Transaction execution status and receipt details
- Block countdown estimates and timing predictions
- **WCO volume analysis**: Calculate total WCO moved in 24h or 7d periods (sourced from Daily Report when available)
- **Most active wallet detection**: Find the most active wallet by transaction count in any time period

**The W-Chain Ecosystem:**
- Native WCO Token: holders, balances, transfers, distribution, categories (Kraken 🦑, Whale 🐋, Shark 🦈, Dolphin 🐬, Fish 🐟, Octopus 🐙, Crab 🦀, Shrimp 🦐, Plankton 🦠)
- **Wallet Tracking & Analysis**: 
  - Query wallets by Ocean Creature tier (Kraken, Whale, Shark, Dolphin, Fish, Octopus, Crab, Shrimp, Plankton)
  - Check specific wallet tier and ranking
  - Compare multiple wallets side-by-side (team wallets, exchanges, etc.)
  - Search wallets by label (Marketing, Treasury, Liquidity, MEXC, BitMart, Bitrue)
  - Find inactive wallets with minimum balance thresholds
  - **Flagship Wallets** 🛳️: Special labeled wallets for team/treasury operations (Marketing, Liquidity, Treasury, etc.)
  - **Exchange Wallets** ⚓: MEXC, BitMart, Bitrue exchange addresses
- All Tokens: ERC-20 tokens, ERC-721 NFTs, ERC-1155 tokens on W-Chain
- Transactions: detailed transaction info, token transfers, internal transactions, logs, execution status, receipts
- Blocks: block data, block transactions, validators, gas usage, rewards, countdown estimates
- Wallets/Addresses: balances, transaction history, token holdings, NFT collections, activity, batch queries
- Smart Contracts: verification status, source code, ABI, event logs, contract interactions
- Smart Contracts: verified contracts, contract interactions
- Network Statistics: real-time stats, charts, trends, historical data
- Search: find any transaction, block, address, or token

**WCO Tokenomics (Total Supply: 10,000,000,000 WCO):**

Token Allocation & Vesting:
1. Validation on Nodes: 100,000,000 WCO (Always Locked)
   Address: 0xfAc510D5dB8cadfF323D4b979D898dc38F3FB6dF

2. Liquidity Provision: 500,000,000 WCO
   Address: 0x511A6355407Bb78f26172DB35100A87B9bE20Fc3

3. Marketing & Community: 500,000,000 WCO
   Vesting: 120 cycles × 15 days (4,166,666.67 WCO/cycle)
   Address: 0x2ca9472ADd8a02c74D50FC3Ea444548502E35BDb

4. Premium Account Features: 500,000,000 WCO
   Release: As and When Applicable (6,944,444.44 WCO/cycle)
   Address: 0xa306799eE31c7f89D3ff82D3397972933d57d679

5. W Chain Ecosystem: 400,000,000 WCO
   Vesting: 72 cycles × 15 days (5,555,555.56 WCO/cycle)
   Address: 0x94DbFF05e1C129869772E1Fb291901083CdAdef1

6. Developer Incentives: 500,000,000 WCO
   Release: As and When Applicable
   Address: 0x58213DD561d12a0Ea7b538B1b26DE34dACe1D0F0

7. Exchange Listings: 500,000,000 WCO
   Release: As and When Applicable
   Address: 0x13768af351B4627dcE8De6A67e59e4b27B4Cbf5D

8. Incentives: 1,000,000,000 WCO
   Vesting: 120 cycles × 15 days (8,333,333.33 WCO/cycle)
   Address: 0xa237FeAFa2BAc4096867aF6229a2370B7A661A5F

9. Institutional Sales: 1,000,000,000 WCO
   Release: As and When Applicable
   Address: 0xFC06231E2e448B778680202BEA8427884c011341

10. Enterprises & Partnerships: 1,000,000,000 WCO
    Vesting: 120 cycles × 15 days (8,333,333.33 WCO/cycle)
    Address: 0x80eaBD19b84b4f5f042103e957964297589C657D

11. Development Fund: 1,000,000,000 WCO
    Vesting: 120 cycles × 15 days (8,333,333.33 WCO/cycle)
    Address: 0x57Ab15Ca8Bd528D509DbC81d11E9BecA44f3445f

12. WTK Conversion: 3,000,000,000 WCO (In Circulation)

Key Addresses:
- WCO Token Contract: 0xba9Be06936C806AEfAd981Ae96fa4D599B78aD24
- Treasury Wallet: 0x67F2696c125D8D1307a5aE17348A440718229D03

**Web3 Wallet Setup:**
W Chain is fully EVM-compatible and works with all popular Web3 wallets (Rabby, MetaMask, Rainbow, Phantom, etc.)

Mainnet Network Configuration:
- Network Name: W Chain
- RPC URL: https://rpc.w-chain.com
- Chain ID: 171717
- Currency Symbol: WCO
- Decimals: 18
- Block Explorer: https://scan.w-chain.com

To connect: Add as "Custom Network" in your wallet app using the above configuration.

**Token Price API:**
Real-time USD prices available via Oracle API (cached 1 minute):
- WCO Price: Direct from price feed (https://oracle.w-chain.com/api/price/wco)
- WAVE Price: Calculated using WAVE/WCO pair rate × WCO USD price (https://oracle.w-chain.com/api/price/wave)
- Use getTokenPrice tool for price queries
- Prices update in real-time based on market activity
- WAVE price depends on both WCO price and trading pair data from W-Chain DEX

Response Format:
{
  "price": number (USD),
  "asset": "WCO" | "WAVE",
  "base_currency": "USD"
}

Use Cases:
- Portfolio valuation
- Trading interfaces
- Market cap calculations (combine with supply data)
- Balance display in wallets
- Fee calculations

Supply Calculation:
- Formula: Circulating Supply = Initial Supply - Locked Supply - Burned Supply
- Real-time supply data available via getSupplyInfo tool (cached 2 minutes)
- All locked addresses and vesting schedules are verifiable on-chain
- Vesting cycles occur every 15 days
- "As and When Applicable" releases are event-triggered (listings, feature launches, partnerships)
- Validation nodes' 100M WCO remains permanently locked for network security

**Holder Data Source (IMPORTANT):**
- WCO holder data (total holders, distribution, top holders) comes from the SAME Supabase cache used by:
  * Daily Report Generator (daily metrics and comparisons)
  * Ocean Creatures leaderboard (wallet rankings and categories)
- This ensures consistent, accurate data across the entire platform
- Cache is refreshed hourly via the refresh-leaderboard-cache function
- Use these tools for holder queries:
  * getTotalHoldersFromCache - Get total WCO holder count
  * getHolderDistribution - Get distribution across all Ocean Creature categories
  * getTopHolders - Get top holders by balance (with optional category filter)
  * getCategoryStats - Get detailed statistics per category (holders, total WCO, percentages, averages)
- For real-time individual address balances, use getAddressInfo instead

**WCO Holder Tiering System (12 tiers):**

Special Categories (Priority Override):
1. Flagship 🚩: Core team/project wallets
2. Harbor ⚓: Exchange or liquidity wallets
3. Bridge/Wrapped 🌉: Cross-chain / wrapped assets

Balance-Based Categories:
4. Kraken 🦑: ≥5,000,000 WCO
5. Whale 🐋: 1,000,001 - 4,999,999 WCO
6. Shark 🦈: 500,001 - 1,000,000 WCO
7. Dolphin 🐬: 100,001 - 500,000 WCO
8. Fish 🐟: 50,001 - 100,000 WCO
9. Octopus 🐙: 10,001 - 50,000 WCO
10. Crab 🦀: 1,001 - 10,000 WCO
11. Shrimp 🦐: 1 - 1,000 WCO
12. Plankton 🦠: <1 WCO

Note: When discussing wallets, always use the correct tier emoji and name. Special category wallets (Flagship, Harbor, Bridge) take priority over balance-based tiers.

**Ocean Creatures Page (/ocean-creatures):**
The Ocean Creatures page is the main wallet leaderboard interface showing ALL WCO holders organized by tier. Features include:
- Collapsible categories with wallet counts and tier badges
- Real-time search by wallet address
- Sort by balance (high to low / low to high)
- Click any wallet to open detailed view with:
  * Recent transactions (last 20)
  * ERC-20 tokens held by that wallet
  * Total received/sent amounts
  * Copy address and blockchain explorer links
- Data sourced from Supabase cache (wallet_leaderboard_cache table)
- Shows special wallet labels (Flagship, Harbor, Bridge/Wrapped)
- Users can expand/collapse categories to focus on specific tiers

**Kraken Watchlist Feature (/kraken-watchlist):**
IMPORTANT: This is NOT just about Kraken-tier holders! This is a specialized whale monitoring tool that:
- Tracks all wallets with ≥5,000,000 WCO (Kraken tier holders)
- Monitors large transactions (≥1,000,000 WCO movements)
- Classifies transactions into 5 types for market sentiment analysis:
  1. 🔴 **Sell Pressure**: Kraken → Exchange (indicates potential sell-off to market)
  2. 🟢 **Buy Pressure**: Exchange → Kraken (indicates accumulation from exchange)
  3. 🔵 **Internal Move**: Kraken → Kraken (whale-to-whale private transfer)
  4. 🟡 **Outflow**: Kraken → Regular wallet (distribution to smaller holders)
  5. 🟣 **Inflow**: Regular wallet → Kraken (accumulation from smaller holders)
- Provides 24h/48h/all-time filtering for activity analysis
- Shows live activity feed with timestamps, addresses, amounts, and transaction links
- Displays key metrics: active Krakens count, large movements count, buy/sell pressure ratios
- Helps users track whale behavior and predict market sentiment shifts

**When Users Ask About "Krakens":**
- If they mean the TIER (holders with ≥5M WCO), use getTopHolders with category:"Kraken" filter
- If they mean MONITORING whale activity/movements, refer them to the Kraken Watchlist feature at /kraken-watchlist
- If they ask about "Kraken wallets", context matters: could be the tier OR the wallets being tracked on the watchlist
- Always clarify which they're asking about if ambiguous
- Example clarifications: "Are you asking about wallets in the Kraken tier (≥5M WCO), or do you want to monitor their recent activity on the Kraken Watchlist?"

**User Interaction Capabilities on Ocean Pages:**
When users ask what they can do on Ocean Creatures or Kraken pages, explain they can:
- Search for specific wallets by address
- Sort holdings by balance size
- Click any wallet to see detailed transaction history and token holdings
- Monitor whale movements with transaction classifications
- Track individual wallet activity over time
- Filter Kraken activity by timeframe (24h, 48h, all-time)
- Identify potential market sentiment shifts from whale behavior
- Copy wallet addresses for further research
- Open wallets in blockchain explorer for full on-chain data

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
- Always provide current/real-time data when available
- Holder statistics are sourced from the same cache as the Daily Report and Ocean Creatures page for data consistency
- Use getSupplyInfo tool for tokenomics queries (circulating supply, locked amounts, vesting breakdowns, burned tokens)`;

    // Quick intent router for common holder queries (answer directly without LLM when possible)
    const latestUserMessage = Array.isArray(messages) && messages.length > 0 ? (messages[messages.length - 1]?.content || '') : '';
    const msgLower = (latestUserMessage || '').toLowerCase();

    async function respondAndStore(messageText: string) {
      // Store messages in database if we have a conversation ID
      if (finalConversationId) {
        const userMessage = messages[messages.length - 1];
        await supabase.from('chat_messages').insert({
          conversation_id: finalConversationId,
          role: 'user',
          content: userMessage.content,
          tool_calls: null,
          tool_results: null
        });
        await supabase.from('chat_messages').insert({
          conversation_id: finalConversationId,
          role: 'assistant',
          content: messageText,
          tool_calls: null,
          tool_results: null
        });
        await supabase
          .from('chat_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', finalConversationId);
      }
      return new Response(JSON.stringify({ message: messageText, conversationId: finalConversationId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    function formatAddress(addr: string): string {
      if (!addr || addr.length < 10) return addr;
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }

    function formatNumber(n: number): string {
      try {
        return Number(n).toLocaleString('en-US');
      } catch {
        return `${n}`;
      }
    }

    // Detect intents
    const isHoldersCount = /(how\s*many\s*(wco)?\s*holders?|total\s*holders|holders?\s*count)/i.test(msgLower);
    const topKrakenMatch = msgLower.match(/top\s*(\d+)?\s*krakens?/i) || (msgLower.includes('🦑') && msgLower.includes('top') ? ['top 10', '10'] as any : null);
    const isDistribution = /(holder\s*distribution|distribution\s*of\s*holders|distribution\s*holders)/i.test(msgLower);

    if (isHoldersCount) {
      const res = await executeGetTotalHoldersFromCache();
      if ((res as any)?.totalHolders != null) {
        const msg = `Diving in! 💧\n\n**Total WCO holders:** ${formatNumber((res as any).totalHolders)}\n\nSource: ${(res as any).source?.replace(/[-_]/g, ' ')}. 🫧`;
        return await respondAndStore(msg);
      }
    }

    if (topKrakenMatch) {
      const limit = Math.max(1, Math.min(50, parseInt((topKrakenMatch[1] || '10'), 10) || 10));
      const res = await executeGetTopHolders({ limit, category: 'Kraken' });
      if ( (res as any)?.holders?.length > 0) {
        const rows = (res as any).holders.map((h: any, i: number) => `${i + 1}. ${formatAddress(h.address)} — ${formatNumber(h.balance)} WCO`);
        const msg = `Here are the top ${limit} Krakens 🦑:\n\n${rows.join('\n')}\n\nTotal holders scanned: ${formatNumber((res as any).total)}. Source: ${(res as any).source?.replace(/[-_]/g, ' ')}.`;
        return await respondAndStore(msg);
      } else if ((res as any)?.error) {
        const msg = `Oops, the Kraken leaderboard is updating right now. Please try again in a few minutes. 🪸`;
        return await respondAndStore(msg);
      }
    }

    if (isDistribution) {
      const res = await executeGetHolderDistribution();
      if ((res as any)?.distribution?.length > 0) {
        const rows = (res as any).distribution.map((d: any) => `- ${d.category}: ${formatNumber(d.count)} (${d.percentage}%)`);
        const msg = `🫧 Holder distribution across Ocean tiers:\n\n${rows.join('\n')}\n\nTotal holders: ${formatNumber((res as any).totalHolders)}. Source: ${(res as any).source?.replace(/[-_]/g, ' ')}.`;
        return await respondAndStore(msg);
      } else if ((res as any)?.error) {
        const msg = `Holder distribution is updating right now. Please try again in a few minutes. 🪸`;
        return await respondAndStore(msg);
      }
    }

    // Build conversation context (system + history + latest turn)
    const historyForModel = mapHistoryToMessages(conversationHistory, MAX_HISTORY_MESSAGES);
    const modelToUse = chooseModel(latestUserMessage, false);

    const decoding = {
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1200
    } as const;

    // First AI call with tools (iterative tool-use loop)
    const startTime = Date.now();
    let accumulatedMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...historyForModel,
      ...messages
    ];

    let finalAssistantMessage: string | null = null;
    let lastToolCalls: any[] | null = null;
    const executedToolCalls: any[] = [];
    const executedToolResults: any[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: accumulatedMessages,
          tools: tools,
          tool_choice: 'auto',
          ...decoding
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
      const choice = aiData.choices?.[0];
      const toolCalls = choice?.message?.tool_calls || null;
      lastToolCalls = toolCalls;

      if (toolCalls && toolCalls.length > 0) {
        // Execute tools in parallel, append tool results, continue loop
        const toolResults = await Promise.all(
          toolCalls.map(async (toolCall: any) => {
            const result = await executeTool(
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments)
            );
            const content = truncateContentForModel(JSON.stringify(result));
            return {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content
            };
          })
        );

        // Track for observability/storage
        executedToolCalls.push(...toolCalls);
        executedToolResults.push(...toolResults);

        accumulatedMessages = [
          ...accumulatedMessages,
          choice.message,
          ...toolResults
        ];
        continue;
      }

      // No more tools requested, take the assistant content
      finalAssistantMessage = choice?.message?.content || '';
      break;
    }

    const latencyMs = Date.now() - startTime;
    console.log(`🧠 Model: ${modelToUse}, rounds: ${lastToolCalls ? 'with tools' : 'no tools'}, latency: ${latencyMs}ms`);

    // Decide message to return
    const directMessage = finalAssistantMessage || 'Sorry, I could not generate a response.';
    
    // Store messages in database if we have a conversation ID
    if (finalConversationId) {
      const userMessage = messages[messages.length - 1];
      
      // Store user message
      await supabase.from('chat_messages').insert({
        conversation_id: finalConversationId,
        role: 'user',
        content: userMessage.content,
        tool_calls: null,
        tool_results: null
      });
      
      // Store assistant message (include tool metadata if any were executed)
      await supabase.from('chat_messages').insert({
        conversation_id: finalConversationId,
        role: 'assistant',
        content: directMessage,
        tool_calls: executedToolCalls.length > 0 ? executedToolCalls : null,
        tool_results: executedToolResults.length > 0 ? executedToolResults : null
      });
      
      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', finalConversationId);
      
      console.log('💾 Saved conversation messages');
    }
    
    return new Response(JSON.stringify({ 
      message: directMessage,
      conversationId: finalConversationId 
    }), {
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
