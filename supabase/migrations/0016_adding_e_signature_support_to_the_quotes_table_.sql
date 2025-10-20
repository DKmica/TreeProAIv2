-- Module 2: AI-Powered Quoting & Estimating
-- Add columns to the quotes table to store e-signature data.
ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS signature_data_url TEXT,
    ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Update RLS policy to allow unauthenticated users to fetch a single quote for signing.
DROP POLICY IF EXISTS "Public quotes are viewable by everyone." ON public.quotes;
CREATE POLICY "Public quotes are viewable for signing." ON public.quotes
FOR SELECT USING (true);

-- Allow unauthenticated users to update a quote with their signature
CREATE POLICY "Allow public update for signatures." ON public.quotes
FOR UPDATE USING (true)
WITH CHECK (true);