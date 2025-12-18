-- Migration: Add exception_queue table for tracking system exceptions
-- Date: 2024-11-24
-- Purpose: Store system exceptions for later review and resolution

CREATE TABLE IF NOT EXISTS exception_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_type VARCHAR(255) NOT NULL,
  entity_id UUID,
  entity_type VARCHAR(100),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exception_queue_entity ON exception_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_exception_queue_resolved ON exception_queue(is_resolved);
CREATE INDEX IF NOT EXISTS idx_exception_queue_priority ON exception_queue(priority);
CREATE INDEX IF NOT EXISTS idx_exception_queue_created_at ON exception_queue(created_at DESC);

COMMENT ON TABLE exception_queue IS 'Queue for tracking system exceptions that require manual review or resolution';
COMMENT ON COLUMN exception_queue.exception_type IS 'Type of exception (e.g., validation_error, data_integrity_issue)';
COMMENT ON COLUMN exception_queue.entity_id IS 'ID of the entity that triggered the exception';
COMMENT ON COLUMN exception_queue.entity_type IS 'Type of entity (e.g., quote, job, client)';
COMMENT ON COLUMN exception_queue.priority IS 'Priority level for resolving the exception';
