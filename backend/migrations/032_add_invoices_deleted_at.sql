-- Migration: Add deleted_at column to invoices table for soft delete support
-- This aligns invoices with other tables that support soft deletion

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at) WHERE deleted_at IS NULL;
