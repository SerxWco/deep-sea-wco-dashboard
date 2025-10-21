-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to refresh wallet leaderboard cache every 6 hours
SELECT cron.schedule(
  'refresh-wallet-leaderboard-cache',
  '0 */6 * * *', -- Every 6 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://lslysfupujprybfhkrdu.supabase.co/functions/v1/refresh-leaderboard-cache',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHlzZnVwdWpwcnliZmhrcmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTc1MDAsImV4cCI6MjA3MzM3MzUwMH0.j0CnKBot5NtCG-lI8GMbPT3m5GhdruTa4KeDvpSZZE0"}'::jsonb,
        body:='{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);