-- Fix security warning: Move extensions from public schema to dedicated schema

-- Create extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_cron extension to extensions schema
ALTER EXTENSION pg_cron SET SCHEMA extensions;

-- Move pg_net extension to extensions schema  
ALTER EXTENSION pg_net SET SCHEMA extensions;

-- Update the cron job to use the qualified function names
SELECT cron.unschedule('daily-snapshot-21-cet');

-- Recreate the cron job with qualified schema references
SELECT extensions.cron.schedule(
  'daily-snapshot-21-cet',
  '0 19 * * *', -- Daily at 19:00 UTC (21:00 CET)
  $$
  SELECT
    extensions.net.http_post(
        url:='https://lslysfupujprybfhkrdu.supabase.co/functions/v1/daily-snapshot',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHlzZnVwdWpwcnliZmhrcmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTc1MDAsImV4cCI6MjA3MzM3MzUwMH0.j0CnKBot5NtCG-lI8GMbPT3m5GhdruTa4KeDvpSZZE0"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);