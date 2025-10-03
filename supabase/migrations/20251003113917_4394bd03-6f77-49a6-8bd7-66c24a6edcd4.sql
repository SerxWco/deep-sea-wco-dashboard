-- Create wallet leaderboard cache table
CREATE TABLE IF NOT EXISTS public.wallet_leaderboard_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address text NOT NULL UNIQUE,
  balance numeric NOT NULL,
  transaction_count integer NOT NULL DEFAULT 0,
  category text NOT NULL,
  emoji text NOT NULL,
  label text,
  is_flagship boolean NOT NULL DEFAULT false,
  is_exchange boolean NOT NULL DEFAULT false,
  is_wrapped boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_cache_balance ON public.wallet_leaderboard_cache(balance DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_cache_category ON public.wallet_leaderboard_cache(category);
CREATE INDEX IF NOT EXISTS idx_wallet_cache_updated ON public.wallet_leaderboard_cache(updated_at DESC);

-- Enable RLS
ALTER TABLE public.wallet_leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Wallet cache is viewable by everyone"
ON public.wallet_leaderboard_cache
FOR SELECT
USING (true);

CREATE POLICY "Allow cache updates"
ON public.wallet_leaderboard_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Create metadata table for cache status
CREATE TABLE IF NOT EXISTS public.wallet_cache_metadata (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_holders integer NOT NULL DEFAULT 0,
  last_refresh timestamp with time zone NOT NULL DEFAULT now(),
  refresh_status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_cache_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Cache metadata is viewable by everyone"
ON public.wallet_cache_metadata
FOR SELECT
USING (true);

CREATE POLICY "Allow metadata updates"
ON public.wallet_cache_metadata
FOR ALL
USING (true)
WITH CHECK (true);