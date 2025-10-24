-- Increase PostgREST max rows from default 1000 to 10000
-- This allows queries to return up to 10,000 rows instead of being limited to 1000
ALTER ROLE authenticator SET pgrst.db_max_rows = 10000;

-- Notify PostgREST to reload its configuration
NOTIFY pgrst, 'reload config';