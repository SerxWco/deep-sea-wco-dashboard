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

-- Set up cron job for daily snapshots at 21:00 CET
-- Note: Supabase uses UTC, so 21:00 CET = 20:00 UTC (winter) or 19:00 UTC (summer)
-- Using 19:00 UTC to cover both cases safely
SELECT cron.schedule(
  'daily-metrics-snapshot',
  '0 19 * * *', -- 19:00 UTC = 21:00 CET (summer time)
  $$
  SELECT
    net.http_post(
        url:='https://lslysfupujprybfhkrdu.supabase.co/functions/v1/daily-snapshot',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHlzZnVwdWpwcnliZmhrcmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTc1MDAsImV4cCI6MjA3MzM3MzUwMH0.j0CnKBot5NtCG-lI8GMbPT3m5GhdruTa4KeDvpSZZE0"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);