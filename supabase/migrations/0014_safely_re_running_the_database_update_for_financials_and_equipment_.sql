-- Module 7: Financial Analytics
-- Add a dedicated table for job profitability summaries. This improves reporting performance.
CREATE TABLE IF NOT EXISTS public.job_costing_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    total_revenue NUMERIC(10, 2),
    cost_labor NUMERIC(10, 2),
    cost_equipment NUMERIC(10, 2),
    cost_materials NUMERIC(10, 2),
    total_cost NUMERIC(10, 2),
    profit_amount NUMERIC(10, 2),
    profit_margin_percentage NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.job_costing_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own job costing" ON public.job_costing_summary;
CREATE POLICY "Users can manage their own job costing" ON public.job_costing_summary FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Module 5: Equipment Management
-- Enhance the existing equipment table with more details as per the design document.
ALTER TABLE public.equipment
    ADD COLUMN IF NOT EXISTS purchase_date DATE,
    ADD COLUMN IF NOT EXISTS value NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS current_location JSONB; -- For GPS tracking {lat, lng}

-- Create table for detailed maintenance history
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
DROP POLICY IF EXISTS "Users can manage their own maintenance history" ON public.maintenance_history;
CREATE POLICY "Users can manage their own maintenance history" ON public.maintenance_history FOR ALL TO authenticated USING (auth.uid() = user_id);