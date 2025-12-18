-- Migration: Add progress billing support to invoices
-- Allows deposit, milestone, and final invoices linked together

-- Add billing type to track invoice purpose in a billing schedule
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20) DEFAULT 'single';
-- Values: 'single' (default one-time invoice), 'deposit', 'milestone', 'final'

-- Add parent invoice reference for linking related invoices (deposit -> milestone -> final)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Add payment schedule for tracking milestone payments
-- Example: [{"name": "Deposit", "percentage": 25, "dueDate": "2024-01-15", "paid": false}, ...]
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_schedule JSONB DEFAULT '[]'::jsonb;

-- Add billing sequence number (1 = deposit, 2 = first milestone, etc.)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_sequence INTEGER DEFAULT 1;

-- Add total contract value for progress billing (tracks full project value across invoices)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contract_total NUMERIC(12,2) DEFAULT 0;

-- Create index for parent invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoices_parent_id ON invoices(parent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_type ON invoices(billing_type);

-- Comments for documentation
COMMENT ON COLUMN invoices.billing_type IS 'Type of invoice in billing schedule: single, deposit, milestone, final';
COMMENT ON COLUMN invoices.parent_invoice_id IS 'Reference to parent invoice for linked progress billing';
COMMENT ON COLUMN invoices.payment_schedule IS 'JSONB array of payment milestones with name, percentage, due date, and paid status';
COMMENT ON COLUMN invoices.billing_sequence IS 'Order in the billing sequence (1=deposit, 2+=milestones, last=final)';
COMMENT ON COLUMN invoices.contract_total IS 'Total contract value when using progress billing';
