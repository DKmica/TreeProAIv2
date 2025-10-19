-- This migration adds tables and columns to support all modules from the design document.

-- Module 1: Lead Generation & CRM
-- Create a table to log all communications (emails, calls, texts)
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'Email', 'Call', 'SMS'
    direction TEXT NOT NULL, -- 'Incoming', 'Outgoing'
    content TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own communications" ON public.communications FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add pipeline stage to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'New';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;


-- Module 4: Field Operations
-- Add table for safety checklists
CREATE TABLE IF NOT EXISTS public.safety_checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    checklist_name TEXT NOT NULL, -- e.g., 'JSA', 'Aerial Lift Inspection'
    completed_by UUID REFERENCES public.employees(id),
    completed_at TIMESTAMPTZ,
    form_data JSONB -- Stores the checklist answers
);
ALTER TABLE public.safety_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own checklists" ON public.safety_checklists FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add time tracking table
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    duration_minutes INT -- Calculated on clock_out
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own time entries" ON public.time_entries FOR ALL TO authenticated USING (auth.uid() = user_id);


-- Module 5: Equipment & Inventory
-- Add GPS tracking and more details to equipment
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS current_location JSONB; -- {lat, lng}
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS value NUMERIC(10, 2);

-- Create table for maintenance history
CREATE TABLE IF NOT EXISTS public.maintenance_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE NOT NULL,
    service_date DATE NOT NULL,
    description TEXT NOT NULL,
    cost NUMERIC(10, 2),
    parts_used TEXT[]
);
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own maintenance history" ON public.maintenance_history FOR ALL TO authenticated USING (auth.uid() = user_id);


-- Module 7: Accounting
-- Add detailed costing columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS calculated_cost_labor NUMERIC(10, 2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS calculated_cost_equipment NUMERIC(10, 2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS calculated_cost_materials NUMERIC(10, 2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS calculated_profit NUMERIC(10, 2);


-- Module 8: Marketing Automation
-- Create table for marketing campaigns and reviews
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Email', 'Social Media'
    status TEXT NOT NULL, -- 'Draft', 'Active', 'Completed'
    target_audience JSONB,
    roi NUMERIC(10, 2)
);
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own campaigns" ON public.marketing_campaigns FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    job_id UUID REFERENCES public.jobs(id),
    source TEXT NOT NULL, -- 'Google', 'Yelp', 'Direct'
    rating SMALLINT NOT NULL, -- 1-5
    content TEXT,
    review_date DATE
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reviews" ON public.reviews FOR ALL TO authenticated USING (auth.uid() = user_id);


-- Module 9: Human Resources
-- Create table for certifications
CREATE TABLE IF NOT EXISTS public.certifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    issuing_authority TEXT,
    expiry_date DATE,
    document_url TEXT
);
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own certifications" ON public.certifications FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Add time off table
CREATE TABLE IF NOT EXISTS public.time_off_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' -- 'Pending', 'Approved', 'Denied'
);
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own time off requests" ON public.time_off_requests FOR ALL TO authenticated USING (auth.uid() = user_id);