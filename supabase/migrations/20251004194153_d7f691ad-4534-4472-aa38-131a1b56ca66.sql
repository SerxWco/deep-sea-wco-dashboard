-- Reset wallet cache metadata to allow refresh
UPDATE wallet_cache_metadata 
SET refresh_status = 'pending', 
    last_refresh = now()
WHERE id = (SELECT id FROM wallet_cache_metadata ORDER BY created_at DESC LIMIT 1);

-- If no metadata exists, create it
INSERT INTO wallet_cache_metadata (refresh_status, total_holders, last_refresh)
SELECT 'pending', 0, now()
WHERE NOT EXISTS (SELECT 1 FROM wallet_cache_metadata);