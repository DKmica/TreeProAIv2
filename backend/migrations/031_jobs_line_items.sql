-- ============================================================================
-- TreePro AI - Migration 031: Jobs Line Items Backfill
-- Purpose: Align jobs table with automation service by adding line_items JSONB
--          payload sourced from quotes so job creation from approved quotes
--          does not fail.
-- Created: 2025-01-15
-- ============================================================================

BEGIN;

-- Add line_items column for operational visibility of scoped work
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]';

COMMENT ON COLUMN jobs.line_items IS 'Line items inherited from quotes for execution context';

-- Backfill line items for existing jobs from their originating quotes when available
UPDATE jobs j
SET line_items = COALESCE(q.line_items, '[]'::jsonb)
FROM quotes q
WHERE j.quote_id = q.id
  AND (j.line_items IS NULL OR j.line_items = '[]'::jsonb);

COMMIT;
