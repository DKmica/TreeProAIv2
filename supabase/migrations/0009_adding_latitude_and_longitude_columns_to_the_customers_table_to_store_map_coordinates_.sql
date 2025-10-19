-- Add latitude and longitude columns to the customers table
ALTER TABLE public.customers
ADD COLUMN lat float8,
ADD COLUMN lng float8;