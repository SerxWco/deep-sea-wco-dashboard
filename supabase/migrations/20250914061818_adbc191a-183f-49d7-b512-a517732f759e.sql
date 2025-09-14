-- Create daily_metrics table for 21:00 CET snapshots
CREATE TABLE public.daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_holders INTEGER,
  transactions_24h INTEGER,
  wco_moved_24h DECIMAL,
  market_cap DECIMAL,
  total_volume DECIMAL,
  circulating_supply DECIMAL,
  wco_burnt_total DECIMAL,
  wco_burnt_24h DECIMAL,
  active_wallets INTEGER,
  average_transaction_size DECIMAL,
  network_activity_rate DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Daily metrics are viewable by everyone" 
ON public.daily_metrics 
FOR SELECT 
USING (true);

-- Create index for efficient queries by date
CREATE INDEX idx_daily_metrics_snapshot_date ON public.daily_metrics(snapshot_date DESC);