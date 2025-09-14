-- Create price_history table for persistent storage of WCO and WAVE prices
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  wco_price NUMERIC,
  wave_price NUMERIC,
  source TEXT NOT NULL DEFAULT 'w-chain-api',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (price data should be visible to everyone)
CREATE POLICY "Price history is viewable by everyone" 
ON public.price_history 
FOR SELECT 
USING (true);

-- Create policy for inserting price data (this would be used by edge functions or admin)
CREATE POLICY "Allow price data insertion" 
ON public.price_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster timestamp queries
CREATE INDEX idx_price_history_timestamp ON public.price_history (timestamp DESC);

-- Create index for source queries
CREATE INDEX idx_price_history_source ON public.price_history (source);