-- ============================================================================
-- Migration: Sales Tracking & Commission System
-- Description: Add sold_by tracking to jobs, commission rates to employees,
--              and a sales_commissions table for tracking salesman earnings
-- ============================================================================

-- Add sold_by_employee_id to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sold_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sale_amount NUMERIC(12,2);

CREATE INDEX IF NOT EXISTS idx_jobs_sold_by ON jobs(sold_by_employee_id) WHERE sold_by_employee_id IS NOT NULL;

COMMENT ON COLUMN jobs.sold_by_employee_id IS 'Employee who sold/originated this job';
COMMENT ON COLUMN jobs.sale_amount IS 'Total sale amount for commission calculation';

-- Add commission rate to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS default_commission_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_salesman BOOLEAN DEFAULT false;

COMMENT ON COLUMN employees.default_commission_rate IS 'Default commission percentage (e.g., 10.00 = 10%)';
COMMENT ON COLUMN employees.is_salesman IS 'Whether this employee can be assigned as a salesperson';

-- Create sales_commissions table
CREATE TABLE IF NOT EXISTS sales_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    
    -- Sale Details
    sale_amount NUMERIC(12,2) NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(12,2) NOT NULL,
    
    -- Status Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    job_completed_at TIMESTAMPTZ,
    
    -- Payroll Linkage
    payroll_record_id UUID REFERENCES payroll_records(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add constraint for valid commission status
ALTER TABLE sales_commissions ADD CONSTRAINT valid_commission_status CHECK (
    status IN ('pending', 'earned', 'paid', 'cancelled')
);

-- Indexes for sales_commissions
CREATE INDEX IF NOT EXISTS idx_sales_commissions_employee ON sales_commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_job ON sales_commissions(job_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_status ON sales_commissions(status);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_payroll ON sales_commissions(payroll_record_id) WHERE payroll_record_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_job_commission ON sales_commissions(job_id, employee_id);

COMMENT ON TABLE sales_commissions IS 'Tracks sales commissions for salespeople based on completed jobs';

-- Add payment_type to payroll_records to distinguish hourly vs commission
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'hourly';

COMMENT ON COLUMN payroll_records.payment_type IS 'Type of payment: hourly or commission';
