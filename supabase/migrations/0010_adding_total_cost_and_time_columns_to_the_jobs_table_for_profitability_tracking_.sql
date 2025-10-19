-- Add columns to jobs table to store calculated totals
ALTER TABLE public.jobs
ADD COLUMN total_cost NUMERIC DEFAULT 0,
ADD COLUMN total_time_minutes INT DEFAULT 0;