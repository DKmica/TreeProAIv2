-- Phase 2 performance tuning for leads lookups
-- Adds composite indexes to accelerate status filtering and recency pagination
-- as well as lookup by assigned user when present.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_leads_status_created_at' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_leads_status_created_at ON leads(status, created_at DESC)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_leads_assigned_to_created_at' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE INDEX idx_leads_assigned_to_created_at ON leads(assigned_to, created_at DESC)';
  END IF;
END $$;
