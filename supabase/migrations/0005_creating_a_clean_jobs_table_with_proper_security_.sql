-- Drop the old table if it exists
DROP TABLE IF EXISTS public.jobs CASCADE;

-- Create a new, clean jobs table
CREATE TABLE public.jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Unscheduled',
    date DATE,
    assigned_crew UUID[],
    job_price NUMERIC(10, 2),
    job_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can manage their own jobs" ON public.jobs
FOR ALL TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);