# W Chain Platform Features

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Core Features](#core-features)
3. [W Chain Blockchain](#w-chain-blockchain)
4. [Token Ecosystem](#token-ecosystem)
5. [DEX Integration](#dex-integration)
6. [Data Sources](#data-sources)

---

## Platform Overview

W Chain Ocean Analytics is a comprehensive blockchain analytics platform designed specifically for the W-Chain ecosystem. It provides real-time insights, portfolio tracking, AI-powered assistance, and decentralized exchange (DEX) analytics for all participants in the W-Chain network.

### Target Users

1. **WCO Holders** - Track portfolio value, market trends, and holder rankings
2. **Traders** - Monitor DEX activity, liquidity pools, and trading opportunities
3. **Developers** - Access blockchain data, smart contract analytics, and API tools
4. **Community Members** - Engage with AI assistant, view network statistics, and track ecosystem growth

---

## Core Features

### 1. 🫧 Bubbles AI Chatbot

**Description:** An intelligent blockchain assistant powered by Google Gemini models with access to 25+ specialized blockchain data tools.

**Key Capabilities:**

**Wallet Analysis:**
```
User: "Show me the top 10 WCO holders"
Bubbles: Uses getTopHolders(limit=10) tool
Result: Ranked list with balances, categories, and labels
```

**Network Statistics:**
```
User: "What's the current network activity?"
Bubbles: Uses getNetworkStats() tool
Result: Block height, transaction count, active wallets, gas price
```

**Token Information:**
```
User: "Tell me about the OG88 token"
Bubbles: Uses getTokenInfo(address='0x...') tool
Result: Holders count, total supply, recent transfers, contract details
```

**Supply Analysis:**
```
User: "How much WCO is in circulation?"
Bubbles: Uses getSupplyInfo() tool
Result: Total supply, circulating supply, locked supply, burned tokens
```

**Price Queries:**
```
User: "What's the current WCO price?"
Bubbles: Uses getTokenPrice(symbol='WCO') tool
Result: Current USD price, 24h change, volume
```

**Transaction Lookup:**
```
User: "Look up transaction 0x123..."
Bubbles: Uses getTransactionDetails(txHash='0x123...') tool
Result: From/to addresses, value, gas, status, token transfers
```

**Technical Features:**
- **Context Awareness:** Maintains conversation history (up to 12 prior messages)
- **Tool Chaining:** Can call multiple tools to answer complex queries
- **Dynamic Model Selection:** Uses Gemini Flash for simple queries, Pro for complex reasoning
- **Feedback System:** Users can rate responses (thumbs up/down)
- **Session Management:** Persistent conversations across page reloads
- **Error Handling:** Graceful fallbacks when tools fail
- **Rate Limiting:** 20 requests per minute per user

**Available Tools (25+):**

| Category | Tools |
|----------|-------|
| Search | searchBlockchain, getBlockInfo, getRecentBlocks |
| Transactions | getTransactionDetails, getRecentTransactions, getTransactionStatus |
| Wallets | getAddressInfo, getTopHolders, getHolderDistribution, getMultipleBalances |
| Tokens | getTokensList, getTokenInfo, getTokenHolders, getTokenTransfers, getTokenPrice |
| Supply | getSupplyInfo, getDailyMetrics |
| Contracts | getSmartContracts, getContractInfo, getContractLogs |
| Network | getNetworkStats, getTransactionCharts, getBlockReward |

### 2. 🐋 Wallet Leaderboard (Ocean Creatures)

**Description:** Real-time ranking of all W-Chain wallets with gamified tier system.

**Tier System:**

| Tier | Emoji | Min Balance | Description |
|------|-------|-------------|-------------|
| **Kraken** | 🦑 | 5,000,000 WCO | Legendary holders |
| **Whale** | 🐋 | 1,000,001 WCO | Major investors |
| **Shark** | 🦈 | 500,001 WCO | Significant holders |
| **Dolphin** | 🐬 | 100,001 WCO | Strong participants |
| **Fish** | 🐟 | 50,001 WCO | Active holders |
| **Octopus** | 🐙 | 10,001 WCO | Medium holders |
| **Crab** | 🦀 | 1,001 WCO | Small holders |
| **Shrimp** | 🦐 | 1 WCO | Micro holders |
| **Plankton** | 🦠 | < 1 WCO | Dust amounts |

**Special Categories:**

**Flagship Wallets (Team)** 🚩
- Validation Nodes
- Liquidity Provision
- Marketing & Community
- Treasury Wallet
- Buybacks
- Development Fund
- Exchange Listings
- (14 total team wallets)

**Harbor (Exchanges)** ⚓
- MEXC Exchange
- BitMart Exchange
- Bitrue Exchange

**Bridge/Wrapped Contracts** 🌉
- Wrapped WCO Contract (0xedb8...)

**Features:**
- **Real-time Updates:** Data refreshed every 15 minutes
- **Category Filtering:** View specific tiers only
- **Search Functionality:** Find wallets by address
- **Transaction Count:** See wallet activity level
- **Labels:** Special markers for team and exchange wallets
- **Export Capability:** Download leaderboard data (coming soon)

**Data Sources:**
1. Supabase cache (fastest, 15-min TTL)
2. W-Chain GraphQL API (bulk fetch 5000 wallets)
3. W-Chain REST API (fallback, paginated)

### 3. 📊 Portfolio Tracker

**Description:** Comprehensive multi-token portfolio management and analytics.

**Key Features:**

**Token Holdings:**
- Automatic balance detection for 20+ top tokens
- Real-time USD valuation
- Balance change tracking
- Historical value charts

**Portfolio Summary:**
```
Total Value: $12,345.67
24h Change: +5.2% ($605.12)
Asset Allocation:
  - WCO: 65% ($8,024.68)
  - WAVE: 25% ($3,086.41)
  - OG88: 10% ($1,234.58)
```

**PnL (Profit & Loss) Widget:**
- Daily, weekly, monthly performance
- Cost basis tracking (manual entry)
- Realized vs unrealized gains
- Tax reporting data preparation

**Historical Charts:**
- Portfolio value over time
- Token allocation changes
- Performance comparison vs WCO

**Supported Tokens:**
- Native WCO
- All ERC-20 tokens on W-Chain
- WAVE (W-Chain gas token)
- OG88 and other ecosystem tokens

### 4. 💱 WSwap DEX Analytics

**Description:** Real-time analytics for the WSwap decentralized exchange.

**Features:**

**Trade Monitoring:**
```typescript
interface Trade {
  timestamp: Date;
  type: 'buy' | 'sell';
  amount: number;      // Token amount
  price: number;       // Price per token
  value: number;       // Total value in WCO
  wallet: string;      // Trader address
  txHash: string;      // Transaction hash
}
```

**Volume Aggregation:**
- 1-hour: 5-minute buckets (12 data points)
- 6-hour: 15-minute buckets (24 data points)
- 24-hour: 1-hour buckets (24 data points)
- 7-day: 6-hour buckets (28 data points)

**Buy/Sell Pressure:**
```
Current Session:
  Buy Volume: 125,000 WCO (55%)
  Sell Volume: 102,000 WCO (45%)
  Net Pressure: +23,000 WCO (Bullish)
```

**Liquidity Pools:**
- Reserve balances (Token A / Token B)
- Total liquidity in USD
- Liquidity provider (LP) token supply
- Pool share calculator

**Price Charts:**
- Candlestick charts (OHLC data)
- Volume bars
- Moving averages (MA 7, 30, 90)
- Support/resistance levels

**TradingView Integration:**
- Advanced charting tools
- Technical indicators
- Drawing tools
- Multi-timeframe analysis

### 5. 📈 Network Statistics Dashboard

**Description:** Comprehensive blockchain metrics and network health monitoring.

**Real-time Metrics:**

**Network Activity:**
```
Block Height: 8,234,567
Latest Block: 3 seconds ago
Average Block Time: 3.2s
Transactions (24h): 45,678
Active Wallets (24h): 12,345
Gas Price: 1.5 Gwei
```

**Holder Statistics:**
```
Total Holders: 45,678
New Holders (24h): +234 (+0.51%)
Active Holders (24h): 12,345
Holder Distribution: [Chart]
```

**Supply Metrics:**
```
Total Supply: 500,000,000 WCO
Circulating Supply: 285,432,109 WCO (57.09%)
Locked Supply: 210,567,891 WCO (42.11%)
  - Validators: 45M WCO
  - Vesting: 165.5M WCO
Burned Supply: 4,000,000 WCO (0.80%)
```

**Market Data:**
```
Current Price: $0.001234
Market Cap: $352,203.45
24h Volume: $45,678.90
24h Change: +5.2%
All-Time High: $0.002345
```

**Daily Comparisons:**
- Holder count change
- Transaction volume change
- Market cap change
- Supply changes
- Activity rate change

**Charts:**
- Transaction volume over time
- Holder growth chart
- Market cap history
- Price chart with volume

### 6. 🔍 Token Explorer

**Description:** Comprehensive token discovery and analysis tool.

**Features:**

**Token List:**
- All ERC-20 tokens on W-Chain
- ERC-721 (NFTs) support
- ERC-1155 (multi-token) support
- Sorting by holders, volume, age

**Token Details:**
```
Token: OG88 Token
Address: 0xd1841fc048b488d92fdf73624a2128d10a847e88
Type: ERC-20
Symbol: OG88
Decimals: 18
Total Supply: 1,000,000,000
Holders: 1,234
Transfers (24h): 567
```

**Holder Analysis:**
- Top holders list
- Holder distribution chart
- Whale concentration metrics
- New vs old holder ratio

**Transfer Activity:**
- Recent transfers table
- Transfer volume charts
- Top senders/receivers
- Transfer patterns

**Custom Token Addition:**
- Add any ERC-20 token by address
- Automatic metadata fetching
- Save to personal watchlist
- Set price alerts (coming soon)

### 7. 🔥 WCO Burn Tracker

**Description:** Track permanently removed WCO tokens from circulation.

**Features:**

**Burn Statistics:**
```
Total Burned: 4,000,000 WCO ($4,936.00)
Burned Today: 12,345 WCO (+0.31%)
Burn Rate: ~5,000 WCO/day
% of Supply: 0.80%
```

**Burn Events:**
| Date | Amount | Transaction | Value |
|------|--------|-------------|-------|
| 2025-10-22 | 5,000 WCO | 0xabc... | $6.17 |
| 2025-10-21 | 4,800 WCO | 0xdef... | $5.93 |
| 2025-10-20 | 5,200 WCO | 0x123... | $6.42 |

**Burn Address:**
- `0x000000000000000000000000000000000000dead`
- All tokens sent here are permanently removed
- Cannot be recovered or accessed

**Charts:**
- Cumulative burn over time
- Daily burn rate
- Burn impact on supply

### 8. 📱 Kraken Watchlist (Premium)

**Description:** Track specific wallets and get notified of their activities.

**Features:**
- Add any wallet to watchlist
- Real-time balance updates
- Transaction notifications
- Whale movement alerts
- Portfolio impact analysis

### 9. 📝 Daily Report Generator

**Description:** Automated daily summary of key metrics and changes.

**Report Contents:**
```markdown
# W Chain Daily Report - Oct 23, 2025

## Market Overview
- WCO Price: $0.001234 (+5.2%)
- Market Cap: $352,203 (+3.8%)
- 24h Volume: $45,678 (+12.3%)

## Network Activity
- Total Holders: 45,678 (+234)
- Transactions: 23,456 (+1,234)
- Active Wallets: 12,345 (+567)

## Top Movers
1. 0xabc... : +50,000 WCO
2. 0xdef... : +35,000 WCO
3. 0x123... : -25,000 WCO

## DeFi Activity
- WSwap Volume: $12,345 (+8.9%)
- New Liquidity: $5,678
```

**Export Options:**
- Markdown format
- PDF export (coming soon)
- Email delivery (coming soon)
- Discord/Telegram integration (coming soon)

---

## W Chain Blockchain

### Network Specifications

**Blockchain Type:** EVM-compatible Layer 1
**Consensus Mechanism:** Proof of Authority (PoA)
**Block Time:** ~3 seconds
**Finality:** Instant (no reorganizations)
**Native Token:** WCO (W Coin)
**Gas Token:** WAVE

### Technical Details

**EVM Compatibility:**
- Supports Solidity smart contracts
- Compatible with Ethereum tooling (Hardhat, Truffle, Remix)
- Supports all ERC standards (ERC-20, ERC-721, ERC-1155)
- ethers.js and web3.js compatible

**RPC Endpoints:**
```
Primary: https://rpc.w-chain.com
Backup: https://mainnet-rpc.w-chain.com
ChainID: [TBD]
Currency Symbol: WCO
```

**Block Explorer:**
- URL: https://scan.w-chain.com
- Features: Transactions, blocks, addresses, tokens, contracts
- APIs: REST v2, GraphQL

### Validator Network

**Validation Nodes:**
- Address: `0xfac510d5db8cadff323d4b979d898dc38f3fb6df`
- Balance: ~45M WCO locked
- Purpose: Network security and block validation
- Rewards: Transaction fees and block rewards

**Validator Requirements:**
- Minimum stake: 1M WCO
- Hardware: 8 CPU, 16GB RAM, 500GB SSD
- Network: 100Mbps connection
- Uptime: 99.9% required

---

## Token Ecosystem

### WCO (W Coin) - Native Token

**Contract:** Native (no contract address)
**Symbol:** WCO
**Decimals:** 18
**Total Supply:** 500,000,000 WCO

**Allocation:**
```
Team Vesting:       210M WCO (42.0%)
Validators:          45M WCO  (9.0%)
Public Sale:        100M WCO (20.0%)
Liquidity:           50M WCO (10.0%)
Marketing:           40M WCO  (8.0%)
Development:         30M WCO  (6.0%)
Partnerships:        15M WCO  (3.0%)
Reserve:             10M WCO  (2.0%)
```

**Vesting Schedule:**
- Team tokens: 4-year vesting, 1-year cliff
- Validator stake: Locked until staking ends
- Public sale: No lockup
- Liquidity: Locked in DEX pools

**Use Cases:**
1. Transaction fees (gas)
2. Validator staking
3. Governance voting (planned)
4. DEX trading pairs
5. Collateral for lending (planned)

### WAVE - Gas Token

**Contract:** ERC-20 standard
**Symbol:** WAVE
**Decimals:** 18
**Total Supply:** Dynamic (minted as needed)

**Purpose:**
- Alternative gas payment option
- Lower transaction costs for frequent users
- Reduces sell pressure on WCO

**Pricing:**
- 1 WAVE = ~0.0001 WCO (dynamic rate)
- Calculated via WSwap pool reserves
- USD value = WAVE/WCO rate × WCO USD price

**Acquisition:**
- Buy on WSwap DEX
- Earn through staking (coming soon)
- Airdrop events

### OG88 Token

**Contract:** `0xd1841fc048b488d92fdf73624a2128d10a847e88`
**Symbol:** OG88
**Decimals:** 18
**Type:** ERC-20

**Features:**
- Community-driven token
- Rewards for early adopters
- Deflationary mechanics (1% burn on transfer)
- Yield farming opportunities

**Supply:**
- Total: 1,000,000,000 OG88
- Circulating: ~850M OG88
- Burned: ~150M OG88

### Wrapped WCO (wWCO)

**Contract:** `0xedb8008031141024d50ca2839a607b2f82c1c045`
**Symbol:** wWCO
**Standard:** ERC-20

**Purpose:**
- Bridge WCO to other chains
- DeFi compatibility
- Cross-chain swaps

**Mechanism:**
1. Deposit native WCO → Receive wWCO (1:1)
2. Burn wWCO → Receive native WCO (1:1)

---

## DEX Integration

### WSwap - Automated Market Maker

**Type:** Uniswap V2 fork
**Liquidity Model:** Constant Product (x × y = k)
**Fee Structure:** 0.3% per swap

**Supported Pairs:**
- WCO/WAVE (main pair)
- WCO/OG88
- WCO/USDT (planned)
- WAVE/OG88

**Liquidity Pools:**
```typescript
interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  reserve0: BigNumber;
  reserve1: BigNumber;
  totalSupply: BigNumber; // LP tokens
  fee: number; // 0.3%
}
```

**Trading Features:**
- Instant swaps (no order book)
- Price impact calculation
- Slippage protection
- Multi-hop routing
- Limit orders (planned)

**Liquidity Provision:**
- Add liquidity: Deposit both tokens
- Receive LP tokens representing pool share
- Earn 0.3% of all swaps proportionally
- Remove liquidity: Burn LP tokens, receive tokens back

**Price Oracle:**
- Time-weighted average price (TWAP)
- 30-minute TWAP for price feeds
- Manipulation-resistant
- Used by other protocols

### Trading Analytics

**Real-time Metrics:**
```
24h Volume: $12,345
24h Trades: 567
Average Trade Size: $21.78
Largest Trade: $1,234
Active Traders: 234
```

**Trader Profiles:**
- Top traders by volume
- Win rate statistics
- Average profit per trade
- Trading patterns

**Arbitrage Opportunities:**
- Price differences across pairs
- Multi-hop profit calculator
- Gas cost consideration
- Flash loan integration (planned)

---

## Data Sources

### 1. W-Chain Scan REST API

**Base URL:** `https://scan.w-chain.com/api/v2`

**Key Endpoints:**

**Addresses:**
```
GET /addresses
- Paginated list of all addresses
- Sorted by balance descending
- Includes balance, tx count

GET /addresses/{address}
- Single address details
- Balance, transactions, tokens
```

**Transactions:**
```
GET /transactions
- Recent transactions
- Filter by time, value, address

GET /transactions/{hash}
- Transaction details
- Token transfers, logs, internal txs
```

**Tokens:**
```
GET /tokens
- All ERC-20/721/1155 tokens
- Filter by type

GET /tokens/{address}
- Token details
- Holders, supply, transfers
```

**Network Stats:**
```
GET /stats
- Block height, tx count
- Average block time, gas price
```

### 2. W-Chain GraphQL API

**Endpoint:** `https://scan.w-chain.com/api/graphql`

**Advantages:**
- Bulk queries (up to 5000 records)
- Reduces API calls by 95%
- Structured data with types
- Faster than paginated REST

**Example Query:**
```graphql
query GetTopHolders($limit: Int!) {
  addresses(first: $limit, orderBy: COIN_BALANCE_DESC) {
    items {
      hash
      coinBalance
      transactionsCount
    }
    totalCount
  }
}
```

**Limitations:**
- Sometimes unreliable (use REST fallback)
- Not all data available
- No real-time subscriptions yet

### 3. Direct RPC (ethers.js)

**Purpose:** Smart contract interaction

**Use Cases:**
- Token balance queries
- Contract function calls
- Event log filtering
- Block data retrieval

**Endpoint Discovery:**
- Tries multiple RPC URLs
- 5-second timeout per endpoint
- Caches working endpoint (5 min)
- Automatic failover

**Performance:**
- Sequential processing (avoid overload)
- 200ms delay between calls
- Exponential backoff on errors
- Connection pooling

### 4. CoinGecko API

**Endpoint:** `https://api.coingecko.com/api/v3`

**Token ID:** `wadzcoin`

**Data Retrieved:**
- 24h trading volume
- All-time high price
- Price changes (24h, 7d, 30d)
- Market rank

**Rate Limits:**
- Free tier: 50 calls/minute
- Caching: 5 minutes client-side

**Why CoinGecko?**
- Aggregates data from multiple exchanges
- Historical price data
- Market sentiment metrics
- API is free and reliable

### 5. OpenRouter AI

**Endpoint:** `https://openrouter.ai/api/v1`

**Models:**
- `google/gemini-2.5-flash` - Fast responses
- `google/gemini-2.5-pro` - Complex reasoning

**Features:**
- Function calling (tool use)
- Conversation history
- Streaming responses (not used)
- Multi-model fallback

**Cost:**
- Pay-per-token usage
- Flash: ~$0.10 per 1M tokens
- Pro: ~$1.00 per 1M tokens
- Typical chat: $0.001-0.01

---

*Last updated: 2025-10-23*
