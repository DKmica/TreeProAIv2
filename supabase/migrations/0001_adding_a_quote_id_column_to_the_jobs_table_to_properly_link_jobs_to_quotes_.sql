-- Add a column to store the ID of the quote that a job originated from.
-- This creates a foreign key relationship to the 'quotes' table.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id);