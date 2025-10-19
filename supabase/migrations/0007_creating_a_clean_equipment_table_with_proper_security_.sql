-- Drop the old table if it exists
DROP TABLE IF EXISTS public.equipment CASCADE;

-- Create a new, clean equipment table
CREATE TABLE public.equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Operational',
    last_maintenance DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can manage their own equipment" ON public.equipment
FOR ALL TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);