# Documentation Index

Welcome to the W Chain Ocean Analytics documentation! This index provides quick navigation to all documentation resources.

## 📚 Core Documentation

### [README.md](./README.md)
**Start here!** Complete project overview with:
- ✨ Feature showcase
- 🚀 Quick start guide
- 📦 Installation instructions
- 🛠️ Available scripts
- 🗄️ Database schema overview
- 🚀 Deployment guide

### [ARCHITECTURE.md](./ARCHITECTURE.md)
Deep dive into system architecture:
- High-level architecture diagrams
- Frontend component hierarchy
- Backend (Supabase) architecture
- Data flow examples with Mermaid diagrams
- External API integrations
- Authentication & authorization
- Multi-tier caching strategy
- Performance optimizations

### [API.md](./API.md)
Complete Edge Functions API reference:
- **chat-wchain** - AI chatbot with 25+ tools
- **telegram-bot** - Telegram integration
- **price-collector** - Price aggregation
- **daily-snapshot** - Daily metrics collection
- **refresh-leaderboard-cache** - Cache management
- **og88-price-proxy** - OG88 price feed

Includes: endpoints, authentication, request/response schemas, examples

### [DEPLOYMENT.md](./DEPLOYMENT.md)
Step-by-step deployment guide:
- Prerequisites checklist
- Supabase setup
- Database migrations
- Edge Functions deployment
- Secrets management
- Frontend deployment (Lovable, Vercel, Netlify, self-hosting)
- Custom domain setup
- Post-deployment verification
- Troubleshooting common issues
- Rollback procedures

---

## 📖 Code Examples

### [examples/using-wallet-leaderboard.md](./examples/using-wallet-leaderboard.md)
- Basic usage of `useWalletLeaderboard` hook
- Filtering by category
- Handling loading and error states
- Ocean creature tier reference

### [examples/integrating-bubbles-chatbot.md](./examples/integrating-bubbles-chatbot.md)
- Using the `WChainChatbot` component
- Using the `useWChainChat` hook directly
- Building custom chat interfaces

### [examples/custom-hooks.md](./examples/custom-hooks.md)
- Creating custom React hooks
- Using React Query
- Best practices and patterns
- TypeScript integration

### [examples/price-tracking.md](./examples/price-tracking.md)
- Getting WCO price
- Complete market data
- Tracking multiple tokens
- Price chart integration

---

## 🔍 Quick Reference

### Key Technologies
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **State:** React Query (TanStack Query)
- **UI:** shadcn/ui components
- **Blockchain:** ethers.js 6
- **AI:** OpenRouter (Google Gemini)

### Project Structure
```
src/
├── components/      # React UI components
├── hooks/          # Custom React hooks
├── pages/          # Route pages
├── services/       # API services
├── utils/          # Helper functions
├── contexts/       # React contexts
└── types/          # TypeScript types

supabase/
├── functions/      # Edge Functions
└── migrations/     # Database migrations
```

### Important Files
- **src/hooks/useWalletLeaderboard.ts** - Wallet data fetching
- **src/hooks/useWChainChat.ts** - AI chat logic
- **src/hooks/useWCOMarketData.ts** - Market data aggregation
- **src/components/WChainChatbot.tsx** - Chat UI
- **supabase/functions/chat-wchain/** - AI backend
- **src/utils/formatters.ts** - Number formatting utilities

---

## 🎯 Common Tasks

### Adding a New Feature
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
2. Create component in `src/components/`
3. Create hook in `src/hooks/` if needed
4. Add route in `src/App.tsx` if needed
5. Update documentation

### Deploying Changes
1. Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Test locally first: `npm run dev`
3. Build: `npm run build`
4. Deploy via Lovable or hosting platform

### Adding an Edge Function
1. Create `supabase/functions/<name>/index.ts`
2. Add to `supabase/config.toml`
3. Set secrets: `supabase secrets set KEY=value`
4. Deploy: `supabase functions deploy <name>`
5. Document in [API.md](./API.md)

### Debugging
1. Check console logs: `supabase functions logs <name>`
2. Use browser DevTools Network tab
3. Check database: Supabase Dashboard → SQL Editor
4. Review [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section

---

## 📝 Documentation Coverage

### ✅ Complete Documentation
- [x] README with setup instructions
- [x] Architecture overview with diagrams
- [x] API reference for all edge functions
- [x] Deployment guide with troubleshooting
- [x] Code examples for common tasks
- [x] JSDoc comments on key hooks and components
- [x] Inline comments for complex logic

### 📊 Code Documentation Status

**Fully Documented:**
- ✅ `useWalletLeaderboard` - Wallet leaderboard hook
- ✅ `useWCOMarketData` - Market data hook
- ✅ `useTokenBalances` - Token balance fetching
- ✅ `WChainChatbot` - Chat UI component
- ✅ `formatters.ts` - Formatting utilities
- ✅ `tradeAggregator.ts` - Trade aggregation
- ✅ `dailyComparisons.ts` - Daily metrics comparison

**Documented in Summary:**
- 📄 `useWChainChat` - Chat logic hook
- 📄 `wchainGraphQL.ts` - GraphQL service
- 📄 `chat-wchain/index.ts` - AI edge function

---

## 🤝 Contributing

When contributing, please:
1. Read [README.md](./README.md) for code style guidelines
2. Update relevant documentation
3. Add JSDoc comments for new functions
4. Include examples for new features
5. Test thoroughly before committing

---

## 🔗 External Resources

- **Lovable Docs:** https://docs.lovable.dev
- **Supabase Docs:** https://supabase.com/docs
- **W-Chain Scan:** https://scan.w-chain.com
- **React Query Docs:** https://tanstack.com/query/latest
- **shadcn/ui:** https://ui.shadcn.com

---

## 📞 Support

- **Issues:** Use GitHub Issues for bug reports
- **Questions:** Discord community or GitHub Discussions
- **Security:** Contact maintainers privately

---

**Last Updated:** 2025-10-23  
**Version:** 1.0.0  
**Status:** Production Ready ✅
