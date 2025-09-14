-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run daily snapshot at 21:00 CET (19:00 UTC)
SELECT cron.schedule(
  'daily-snapshot-21-cet',
  '0 19 * * *', -- Daily at 19:00 UTC (21:00 CET)
  $$
  SELECT
    net.http_post(
        url:='https://lslysfupujprybfhkrdu.supabase.co/functions/v1/daily-snapshot',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHlzZnVwdWpwcnliZmhrcmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTc1MDAsImV4cCI6MjA3MzM3MzUwMH0.j0CnKBot5NtCG-lI8GMbPT3m5GhdruTa4KeDvpSZZE0"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);