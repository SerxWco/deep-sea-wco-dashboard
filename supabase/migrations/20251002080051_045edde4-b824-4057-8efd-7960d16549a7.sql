-- Add UPDATE policy for portfolio_snapshots so daily updates work
CREATE POLICY "Allow portfolio snapshot updates"
ON public.portfolio_snapshots
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add index for faster queries by wallet and date
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_wallet_date 
ON public.portfolio_snapshots(wallet_address, snapshot_date DESC);