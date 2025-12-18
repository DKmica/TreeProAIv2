-- ============================================================================
-- TreePro AI - Client Category Classification
-- Migration: 007_client_category.sql
-- Description: Adds client_category column and backfills ACTIVE/POTENTIAL values
-- Created: 2025-02-15
-- ============================================================================

BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_category VARCHAR(50) DEFAULT 'potential_client';

CREATE INDEX IF NOT EXISTS idx_clients_category ON clients(client_category);

UPDATE clients c
SET client_category = CASE
  WHEN EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.client_id = c.id AND LOWER(j.status) = 'completed'
  ) THEN 'active_customer'
  ELSE 'potential_client'
END,
updated_at = NOW()
WHERE c.client_category IS NULL
   OR c.client_category NOT IN ('potential_client', 'active_customer');

COMMIT;
