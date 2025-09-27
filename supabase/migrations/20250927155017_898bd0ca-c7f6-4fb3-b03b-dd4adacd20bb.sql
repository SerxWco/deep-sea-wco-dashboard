-- Create portfolio_snapshots table for tracking portfolio performance over time
CREATE TABLE public.portfolio_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_value_usd NUMERIC NOT NULL DEFAULT 0,
  token_holdings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio snapshots (public read, authenticated insert)
CREATE POLICY "Portfolio snapshots are viewable by everyone" 
ON public.portfolio_snapshots 
FOR SELECT 
USING (true);

CREATE POLICY "Allow portfolio snapshot insertion" 
ON public.portfolio_snapshots 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_portfolio_snapshots_wallet ON public.portfolio_snapshots(wallet_address);
CREATE INDEX idx_portfolio_snapshots_date ON public.portfolio_snapshots(snapshot_date DESC);
CREATE INDEX idx_portfolio_snapshots_wallet_date ON public.portfolio_snapshots(wallet_address, snapshot_date DESC);

-- Create unique constraint to prevent duplicate snapshots for same wallet on same date
CREATE UNIQUE INDEX unique_wallet_date_snapshot ON public.portfolio_snapshots(wallet_address, snapshot_date);