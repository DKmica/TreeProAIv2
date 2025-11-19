-- Migration: Add Stripe customer ID to clients table
-- This allows us to store the Stripe customer ID for each client for payment processing

ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer_id ON clients(stripe_customer_id);

-- Add comment for documentation
COMMENT ON COLUMN clients.stripe_customer_id IS 'Stripe customer ID for payment processing';
