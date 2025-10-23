# W Chain Ocean Analytics 🌊

> Your comprehensive blockchain analytics platform for W-Chain ecosystem

A powerful, real-time analytics dashboard for the W-Chain blockchain network. Track wallets, tokens, trades, and network statistics with beautiful ocean-themed visualizations. Features Bubbles AI, an intelligent chatbot assistant powered by advanced language models with access to 25+ blockchain data tools.

[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff69b4)](https://lovable.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E)](https://supabase.com/)

## ✨ Key Features

### 🫧 **Bubbles AI Chatbot**
- Intelligent blockchain assistant with natural language interface
- Real-time access to network statistics, wallet data, and token information
- 25+ blockchain data tools including holder analysis, transaction tracking, and supply calculations
- Persistent conversation history with session management
- Feedback system for continuous improvement

### 🐋 **Wallet Leaderboard (Ocean Creatures)**
- Tiered wallet categorization: Kraken 🦑, Whale 🐋, Shark 🦈, Dolphin 🐬, Fish 🐟, and more
- Special labels for team wallets (Flagship 🚩), exchanges (Harbor ⚓), and wrapped tokens (Bridge 🌉)
- Real-time balance tracking with transaction counts
- Three-tier data fetching: Supabase cache → GraphQL → REST API
- Filter by category with detailed wallet analytics

### 📊 **Portfolio & Token Explorer**
- Real-time WCO, WAVE, and OG88 price tracking
- Multi-token balance viewer with USD valuations
- Historical price charts with customizable timeframes
- Token holder analysis and distribution statistics
- Custom token addition and watchlist management

### 💹 **WSwap DEX Analytics**
- Real-time trade monitoring for WSwap decentralized exchange
- Volume aggregation by timeframe (1h, 6h, 24h, 7d)
- Buy/sell pressure analysis
- Liquidity pool reserves tracking
- Trading pair analytics

### 📈 **Network Statistics**
- Live blockchain metrics: block height, transaction volume, active wallets
- Supply breakdown: total, circulating, locked, burned tokens
- Daily snapshot comparison with change indicators
- Historical trend analysis
- Market cap and volume tracking

### 🎨 **Beautiful Design**
- Ocean-themed gradient UI with semantic color tokens
- Responsive layout for mobile, tablet, and desktop
- Dark/light mode support
- Smooth animations and transitions
- Accessible design with ARIA labels

## 🚀 Technology Stack

### Frontend
- **React 18.3** - Modern UI library with hooks
- **TypeScript 5.5** - Type-safe development
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Beautifully designed component library
- **React Query** - Powerful async state management
- **Recharts** - Composable charting library
- **ethers.js 6** - Ethereum library for blockchain interactions

### Backend (Lovable Cloud / Supabase)
- **PostgreSQL** - Robust relational database
- **Edge Functions** - Serverless TypeScript functions
- **Authentication** - User management and role-based access
- **Real-time subscriptions** - Live data updates
- **Cron jobs** - Scheduled data collection

### External APIs
- **W-Chain Scan API** - Blockchain explorer REST API
- **W-Chain GraphQL** - Fast bulk data queries
- **OpenRouter AI** - LLM gateway (Gemini 2.5 Pro/Flash)
- **CoinGecko API** - Market data and price feeds

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and **npm** - [Install with nvm](https://github.com/nvm-sh/nvm)
- **Git** - For version control
- **Supabase CLI** (optional) - For local development: `npm install -g supabase`
- **Supabase Account** (for production) - [Sign up at supabase.com](https://supabase.com)

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id

# Edge Function Secrets (set via Supabase Dashboard or CLI)
# LOVABLE_API_KEY - Required for AI chatbot (OpenRouter API key)
# TELEGRAM_BOT_TOKEN - Optional, for Telegram bot integration
```

### Setting Edge Function Secrets

```bash
# Using Supabase CLI
supabase secrets set LOVABLE_API_KEY=your-openrouter-api-key
supabase secrets set TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Or via Supabase Dashboard: Project Settings > Edge Functions > Secrets
```

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ocean-analytics.git
cd ocean-analytics
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env
```

### 4. Database Setup

If using a new Supabase project, run the migrations:

```bash
# Using Supabase CLI (local)
supabase db push

# Or manually via Supabase Dashboard > SQL Editor
# Copy and execute migrations from supabase/migrations/ in order
```

### 5. Deploy Edge Functions (Production)

```bash
# Deploy all functions
supabase functions deploy chat-wchain
supabase functions deploy telegram-bot
supabase functions deploy price-collector
supabase functions deploy daily-snapshot
supabase functions deploy refresh-leaderboard-cache
supabase functions deploy og88-price-proxy
```

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see your app! 🎉

## 📁 Project Structure

```
ocean-analytics/
├── src/
│   ├── components/          # React UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── WChainChatbot.tsx
│   │   ├── WalletLeaderboard.tsx
│   │   ├── TokenList.tsx
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useWChainChat.ts
│   │   ├── useWalletLeaderboard.ts
│   │   ├── useWCOMarketData.ts
│   │   └── ...
│   ├── pages/              # Page components (routes)
│   │   ├── Dashboard.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Tokens.tsx
│   │   └── ...
│   ├── services/           # API services
│   │   └── wchainGraphQL.ts
│   ├── utils/              # Helper functions
│   │   ├── formatters.ts
│   │   ├── tradeAggregator.ts
│   │   └── dailyComparisons.ts
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── integrations/       # Third-party integrations
│   │   └── supabase/
│   └── types/              # TypeScript type definitions
│       ├── token.ts
│       ├── wswap.ts
│       └── kraken.ts
├── supabase/
│   ├── functions/          # Edge Functions (serverless)
│   │   ├── chat-wchain/   # AI chatbot with 25+ tools
│   │   ├── telegram-bot/  # Telegram integration
│   │   ├── price-collector/ # Price aggregation
│   │   ├── daily-snapshot/ # Metrics collection
│   │   └── refresh-leaderboard-cache/ # Cache refresh
│   └── migrations/         # Database schema migrations
├── public/                 # Static assets
├── .env                    # Environment variables (create this)
├── package.json            # Dependencies and scripts
├── tailwind.config.ts      # Tailwind configuration
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production
npm run preview          # Preview production build locally
npm run lint             # Run ESLint

# Supabase (requires Supabase CLI)
supabase start           # Start local Supabase stack
supabase stop            # Stop local Supabase stack
supabase db push         # Apply migrations
supabase db reset        # Reset database
supabase functions serve # Run edge functions locally
```

## 🗄️ Database Schema Overview

### Core Tables

- **`chat_conversations`** - Stores AI chat conversations
  - Links to `chat_messages` (one-to-many)
  - Tracks user sessions and timestamps

- **`chat_messages`** - Individual chat messages
  - Stores role (user/assistant), content, feedback
  - Linked to conversations via `conversation_id`

- **`knowledge_base`** - Admin-managed Q&A knowledge base
  - Category-based organization
  - Used by AI for enhanced responses

- **`wallet_leaderboard_cache`** - Cached wallet rankings
  - Refreshed periodically by edge function
  - Includes balance, category, emoji, label, tx count

- **`daily_snapshots`** - Historical network metrics
  - Daily aggregation of holders, supply, market cap, etc.
  - Used for trend analysis and comparisons

- **`user_roles`** - User role assignments
  - Links users to roles (e.g., "admin")
  - Used for access control with RLS

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:
- Public read access for leaderboard and snapshots
- User-specific access for chat data
- Admin-only access for knowledge base management

## 🔌 Edge Functions

### `chat-wchain`
**Purpose:** AI chatbot with blockchain data tools  
**Authentication:** ✅ JWT required  
**Rate Limit:** 20 requests/minute per user  
**Model:** Google Gemini 2.5 Pro/Flash (dynamic selection)

**Available Tools (25+):**
- `searchBlockchain` - Search tx/blocks/addresses
- `getNetworkStats` - Network statistics
- `getTopHolders` - Wallet leaderboard
- `getTokenInfo` - Token details
- `getSupplyInfo` - Supply breakdown
- `getTokenPrice` - Real-time prices
- And 19 more...

### `telegram-bot`
**Purpose:** Telegram bot integration  
**Authentication:** ⚠️ No JWT (public webhook)  
**Note:** Should implement signature verification

### `price-collector`
**Purpose:** Aggregate price data from multiple sources  
**Schedule:** Every 5 minutes (cron)

### `daily-snapshot`
**Purpose:** Capture daily network metrics  
**Schedule:** Daily at midnight UTC (cron)

### `refresh-leaderboard-cache`
**Purpose:** Refresh wallet leaderboard cache  
**Authentication:** ⚠️ Public access  
**Note:** Should add authentication or run as cron

### `og88-price-proxy`
**Purpose:** Fetch OG88 token price from DEX  
**Authentication:** Public (read-only)

## 🚀 Deployment

### Lovable Deployment (Recommended)

1. Open your project in [Lovable](https://lovable.dev)
2. Click **Share** → **Publish**
3. Your app is live! 🎉

### Custom Domain Setup

1. Navigate to **Project > Settings > Domains**
2. Click **Connect Domain**
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

*Note: Custom domains require a paid Lovable plan*

### Self-Hosting

The codebase is standard React/Vite and can be deployed anywhere:

```bash
# Build the project
npm run build

# Deploy the dist/ folder to:
# - Vercel, Netlify, Cloudflare Pages
# - AWS S3 + CloudFront
# - Your own server with nginx/Apache
```

**Important:** You'll need to manage environment variables in your hosting provider's dashboard.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Code Style
- Use TypeScript for all new files
- Follow existing naming conventions
- Use functional components with hooks
- Add JSDoc comments for complex logic
- Format with Prettier (included in ESLint config)

### Commit Messages
```
feat: Add holder distribution chart
fix: Resolve RPC timeout issues
docs: Update API documentation
refactor: Simplify wallet categorization
test: Add tests for formatters
```

### Pull Request Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📚 Additional Documentation

- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - System architecture and data flow
- [**API.md**](./API.md) - Edge Functions API reference
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Detailed deployment guide
- [**examples/**](./examples/) - Code examples and integration guides

## 🐛 Troubleshooting

### Common Issues

**Q: "No working RPC endpoints available"**  
A: W-Chain RPC may be temporarily down. The app automatically tries multiple endpoints. Wait a few minutes and try again.

**Q: "Failed to fetch wallet data"**  
A: The leaderboard cache may need refreshing. Try clicking the refresh button or wait for the automatic cache update (every 15 minutes).

**Q: Bubbles AI not responding**  
A: Check that `LOVABLE_API_KEY` is set correctly in Supabase Edge Function secrets. Verify you have credits in your OpenRouter account.

**Q: Build errors with "Cannot find module"**  
A: Try clearing node_modules and reinstalling:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits & Acknowledgments

- **W-Chain Team** - For the blockchain infrastructure and APIs
- **Lovable** - For the amazing full-stack development platform
- **Supabase** - For the backend infrastructure
- **shadcn/ui** - For the beautiful component library
- **OpenRouter** - For the AI model gateway
- **Contributors** - Thank you to everyone who has contributed! 🎉

## 🔗 Links

- **Live Demo:** [https://ocean-analytics.lovable.app](https://ocean-analytics.lovable.app)
- **W-Chain Scan:** [https://scan.w-chain.com](https://scan.w-chain.com)
- **Documentation:** [https://docs.lovable.dev](https://docs.lovable.dev)
- **Discord Community:** [Join us](https://discord.com/channels/1119885301872070706/1280461670979993613)

---

**Made with 💙 by the Ocean Analytics Team**  
*Dive deep into W-Chain data 🌊*
