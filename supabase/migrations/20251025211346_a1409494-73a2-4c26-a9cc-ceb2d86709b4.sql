-- Create cache table for chat responses
CREATE TABLE public.chat_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash text NOT NULL UNIQUE,
  query_text text NOT NULL,
  response text NOT NULL,
  hit_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  last_accessed timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read cache
CREATE POLICY "Cache is readable by everyone"
ON public.chat_cache
FOR SELECT
USING (expires_at > now());

-- Policy: System can manage cache
CREATE POLICY "System can manage cache"
ON public.chat_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_chat_cache_query_hash ON public.chat_cache(query_hash);
CREATE INDEX idx_chat_cache_expires_at ON public.chat_cache(expires_at);

-- Cleanup function for expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_cache WHERE expires_at < now();
END;
$$;