# Deployment Guide - W Chain Ocean Analytics

This guide covers the complete deployment process for the W Chain Ocean Analytics platform, from setting up Supabase to deploying the frontend.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Database Migration](#database-migration)
4. [Edge Functions Deployment](#edge-functions-deployment)
5. [Secrets Management](#secrets-management)
6. [Frontend Deployment](#frontend-deployment)
7. [Custom Domain Setup](#custom-domain-setup)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ **Supabase Account** - [Sign up at supabase.com](https://supabase.com)
- ✅ **Supabase CLI** - `npm install -g supabase`
- ✅ **Git** - For version control
- ✅ **Node.js 18+** - For building the frontend
- ✅ **OpenRouter API Key** - For AI chatbot ([get one here](https://openrouter.ai))
- ✅ (Optional) **Telegram Bot Token** - For Telegram integration

---

## Supabase Setup

### 1. Create a New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in project details:
   - **Name:** `ocean-analytics` (or your preferred name)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users
   - **Plan:** Free tier works for development, Pro for production

4. Wait for project initialization (~2 minutes)

### 2. Get Your Project Credentials

Once the project is ready:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (for frontend)
   - **service_role key** (for admin operations - keep secret!)
   - **Project ID** (from URL or settings)

### 3. Link Local Project to Supabase

```bash
# Login to Supabase CLI
supabase login

# Link your local project
supabase link --project-ref <your-project-id>

# Alternatively, use the interactive prompt
supabase link
```

---

## Database Migration

### Method 1: Using Supabase CLI (Recommended)

```bash
# Apply all migrations
supabase db push

# Verify migrations
supabase db diff
```

### Method 2: Manual Migration via Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Open each migration file in `supabase/migrations/` (in chronological order)
3. Copy and paste the SQL
4. Click **Run** for each migration

### Migration Order

Execute in this order:
1. `20250101000000_initial_schema.sql` - Core tables
2. `20250101000001_chat_system.sql` - Chat tables
3. `20250101000002_knowledge_base.sql` - Knowledge base
4. `20250101000003_wallet_cache.sql` - Wallet leaderboard cache
5. `20250101000004_daily_snapshots.sql` - Metrics snapshots
6. `20250101000005_rls_policies.sql` - Row Level Security

### Verify Database Setup

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Expected tables:
- `chat_conversations`
- `chat_messages`
- `knowledge_base`
- `wallet_leaderboard_cache`
- `daily_snapshots`
- `user_roles`

---

## Edge Functions Deployment

### 1. Deploy All Functions

```bash
# Deploy each function individually
supabase functions deploy chat-wchain
supabase functions deploy telegram-bot
supabase functions deploy price-collector
supabase functions deploy daily-snapshot
supabase functions deploy refresh-leaderboard-cache
supabase functions deploy og88-price-proxy
```

### 2. Verify Deployment

```bash
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs chat-wchain --tail
```

### 3. Configure Function Settings

Edit `supabase/config.toml` to set JWT verification:

```toml
[functions.chat-wchain]
verify_jwt = true  # Require authentication

[functions.telegram-bot]
verify_jwt = false  # Public webhook

[functions.og88-price-proxy]
verify_jwt = false  # Public read-only

[functions.refresh-leaderboard-cache]
verify_jwt = false  # TODO: Add auth or convert to cron
```

Apply configuration:
```bash
supabase functions deploy --no-verify-jwt=false
```

### 4. Set Up Cron Jobs

In Supabase Dashboard → **Database** → **Cron Jobs** (or use pg_cron):

```sql
-- Daily snapshot at midnight UTC
SELECT cron.schedule(
  'daily-snapshot-job',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/daily-snapshot',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Price collector every 5 minutes
SELECT cron.schedule(
  'price-collector-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/price-collector',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Leaderboard cache refresh every 15 minutes
SELECT cron.schedule(
  'refresh-cache-job',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/refresh-leaderboard-cache',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

---

## Secrets Management

### 1. Set Required Secrets

```bash
# OpenRouter API Key (required for AI chatbot)
supabase secrets set LOVABLE_API_KEY=sk-or-v1-...

# Supabase credentials (auto-set, but verify)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 2. Set Optional Secrets

```bash
# Telegram bot token (if using Telegram integration)
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
```

### 3. Verify Secrets

```bash
# List all secrets (values are hidden)
supabase secrets list
```

### 4. Alternative: Set via Dashboard

1. Go to **Project Settings** → **Edge Functions**
2. Click **Manage Secrets**
3. Add each secret with its value
4. Click **Save**

---

## Frontend Deployment

### Method 1: Lovable Deployment (Easiest)

1. Open your project in [Lovable](https://lovable.dev)
2. Ensure environment variables are set:
   - Go to **Project Settings** → **Environment Variables**
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_SUPABASE_PROJECT_ID`

3. Click **Share** → **Publish**
4. Your app is live at `https://your-app.lovable.app`

### Method 2: Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# Project Settings > Environment Variables
```

### Method 3: Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build the project
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

### Method 4: Self-Hosting (Nginx)

```bash
# Build the project
npm run build

# Copy dist/ folder to your server
scp -r dist/* user@your-server:/var/www/ocean-analytics/

# Configure Nginx
sudo nano /etc/nginx/sites-available/ocean-analytics
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/ocean-analytics;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## Custom Domain Setup

### Using Lovable (Paid Plan Required)

1. Go to **Project** → **Settings** → **Domains**
2. Click **Connect Domain**
3. Enter your domain (e.g., `ocean.yourdomain.com`)
4. Add the provided DNS records to your domain registrar:

   **CNAME Record:**
   ```
   Type: CNAME
   Name: ocean (or @ for root domain)
   Value: <provided-by-lovable>.lovable.app
   TTL: 3600
   ```

5. Wait for DNS propagation (~5-30 minutes)
6. SSL certificate is automatically provisioned by Lovable

### Using Vercel/Netlify

Both platforms have similar processes:

1. Go to project settings → **Domains**
2. Click **Add Domain**
3. Follow the DNS configuration instructions
4. SSL is automatically provisioned

---

## Post-Deployment Verification

### 1. Test Frontend Access

```bash
# Visit your deployed URL
curl https://your-app.lovable.app

# Should return HTML (status 200)
```

### 2. Test Authentication

1. Visit your app
2. Click **Sign Up**
3. Create a test account
4. Verify email confirmation (if enabled)
5. Log in successfully

### 3. Test Edge Functions

```bash
# Test public function (og88-price-proxy)
curl https://your-project.supabase.co/functions/v1/og88-price-proxy

# Should return JSON with price data
```

```bash
# Test authenticated function (requires JWT)
# First, log in via the app and get your JWT from browser DevTools
# Application > Local Storage > supabase.auth.token

curl https://your-project.supabase.co/functions/v1/chat-wchain \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "test"}],
    "conversationId": null,
    "sessionId": "test-session"
  }'

# Should return AI response
```

### 4. Test Database Connectivity

In Supabase Dashboard → **SQL Editor**:

```sql
-- Check chat system
SELECT COUNT(*) FROM chat_conversations;

-- Check wallet cache
SELECT COUNT(*) FROM wallet_leaderboard_cache;

-- Check daily snapshots
SELECT * FROM daily_snapshots ORDER BY snapshot_date DESC LIMIT 1;
```

### 5. Test Leaderboard Cache

1. Visit the Dashboard page
2. Check that wallet leaderboard loads
3. Try filtering by category
4. Click refresh button

### 6. Test AI Chatbot

1. Go to Dashboard
2. Open Bubbles AI chatbot (sidebar or card)
3. Send a test message: "What is the current WCO price?"
4. Verify response is relevant and accurate

### 7. Test Cron Jobs

```bash
# Check cron job logs (after some time)
supabase functions logs daily-snapshot
supabase functions logs price-collector

# Verify daily_snapshots table has new entries
```

### 8. Check for Errors

```bash
# View all function logs
supabase functions logs --tail

# Check for 500 errors, exceptions, or warnings
```

---

## Troubleshooting

### Issue: "No working RPC endpoints available"

**Symptoms:** Portfolio page shows error, token balances not loading

**Solution:**
- W-Chain RPC may be temporarily down
- The app automatically tries multiple fallback RPCs
- Wait a few minutes and refresh
- Check W-Chain status: https://scan.w-chain.com

### Issue: "Failed to fetch wallet data"

**Symptoms:** Leaderboard shows loading spinner forever

**Solution:**
```bash
# Manually trigger cache refresh
curl -X POST https://your-project.supabase.co/functions/v1/refresh-leaderboard-cache

# Wait 1-2 minutes, then refresh the page
```

### Issue: Bubbles AI not responding

**Symptoms:** Chatbot shows loading spinner, then timeout

**Solution:**
1. Check `LOVABLE_API_KEY` secret is set:
   ```bash
   supabase secrets list | grep LOVABLE
   ```

2. Verify you have OpenRouter credits:
   - Visit https://openrouter.ai/credits
   - Add credits if balance is $0

3. Check edge function logs:
   ```bash
   supabase functions logs chat-wchain --tail
   ```

4. Test the edge function directly:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/chat-wchain \
     -H "Authorization: Bearer $(supabase auth token)" \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role":"user","content":"test"}], "sessionId":"test"}'
   ```

### Issue: "Rate limit exceeded" (429)

**Symptoms:** Chatbot returns error after multiple messages

**Solution:**
- Current rate limit: 20 requests/minute per user
- Wait 1 minute before sending more messages
- To increase limit, edit `supabase/functions/chat-wchain/index.ts`:
  ```typescript
  const RATE_LIMIT = 50; // Increase from 20
  ```
- Redeploy: `supabase functions deploy chat-wchain`

### Issue: Database connection errors

**Symptoms:** "Connection refused" or "SSL error"

**Solution:**
1. Verify database is running:
   ```bash
   supabase db status
   ```

2. Check connection string in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   ```

3. Restart Supabase services:
   ```bash
   supabase stop
   supabase start
   ```

### Issue: Build errors

**Symptoms:** `npm run build` fails with TypeScript errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json dist
npm install

# Rebuild
npm run build
```

### Issue: Environment variables not loading

**Symptoms:** App shows "undefined" for API keys

**Solution:**
1. Ensure `.env` file exists in project root
2. Variables must start with `VITE_` for Vite:
   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```

### Issue: 404 on routes after deployment

**Symptoms:** Refreshing on `/portfolio` gives 404

**Solution:**
- Configure your hosting platform for SPA routing

**Vercel:**
Create `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify:**
Create `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Nginx:**
Add to config:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Issue: CORS errors in browser console

**Symptoms:** `Access-Control-Allow-Origin` error when calling edge functions

**Solution:**
- Edge functions already include CORS headers
- If using custom domain, ensure headers are preserved
- Check browser's Network tab for the actual error
- Verify edge function returns CORS headers:
  ```typescript
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  ```

---

## Monitoring & Maintenance

### Daily Tasks

- [ ] Check Supabase dashboard for errors
- [ ] Monitor edge function logs
- [ ] Verify cron jobs are running

### Weekly Tasks

- [ ] Review database size (Supabase dashboard)
- [ ] Check API credit usage (OpenRouter)
- [ ] Test core features (auth, chatbot, leaderboard)

### Monthly Tasks

- [ ] Update dependencies: `npm update`
- [ ] Review security scan results (Supabase linter)
- [ ] Backup database (Supabase auto-backups, but verify)

---

## Rollback Procedure

If a deployment goes wrong:

### 1. Rollback Frontend (Lovable)

1. Go to project history (click version number)
2. Click **Revert** on the last working version

### 2. Rollback Edge Functions

```bash
# Deploy previous version from git
git checkout <previous-commit>
supabase functions deploy chat-wchain

# Or redeploy from main branch
git checkout main
supabase functions deploy --all
```

### 3. Rollback Database

```bash
# Reset database to previous migration
supabase db reset

# Re-apply migrations up to specific point
supabase db push --version <migration-version>
```

---

## Production Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] Edge functions deployed and working
- [ ] Database migrations applied
- [ ] RLS policies enabled and tested
- [ ] Secrets configured (API keys)
- [ ] Cron jobs scheduled
- [ ] Custom domain connected (if applicable)
- [ ] SSL certificate active
- [ ] Authentication working (sign up, log in, log out)
- [ ] AI chatbot responding correctly
- [ ] Wallet leaderboard loading
- [ ] Price data updating
- [ ] Error monitoring set up (Supabase logs)
- [ ] Backup strategy in place

---

*Last updated: 2025-10-23*
