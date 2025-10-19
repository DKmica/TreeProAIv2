-- Drop the old single-employee column
ALTER TABLE public.jobs DROP COLUMN IF EXISTS employee_id;

-- Add a new column that can hold an array of employee IDs for the crew
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS assigned_crew UUID[];

-- Make the 'service' column optional to prevent errors when creating jobs from quotes
ALTER TABLE public.jobs ALTER COLUMN service DROP NOT NULL;