-- Add OG88 price column to price_history table
ALTER TABLE public.price_history 
ADD COLUMN og88_price NUMERIC;