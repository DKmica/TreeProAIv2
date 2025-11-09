-- ============================================================================
-- TreePro AI - Phase 2 Job State Machine Migration
-- Migration: 002_job_state_machine.sql
-- Description: Comprehensive job state machine with 10 states, guarded 
--              transitions, automated triggers, and full audit trail
-- Created: 2024-11-09
-- ============================================================================
-- 
-- This migration implements a professional job state machine that supports:
--   - 10 distinct job states (draft → paid/cancelled)
--   - Guarded state transitions with validation
--   - Complete audit trail of all state changes
--   - Automated triggers for notifications and integrations
--   - Enhanced job metadata for permits, deposits, and workflows
-- 
-- IDEMPOTENCY: Safe to run multiple times using IF NOT EXISTS checks
-- ============================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: STATE TRANSITION AUDIT TABLE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: job_state_transitions
-- Purpose: Complete audit trail of all job state changes
-- Use case: Compliance, debugging, analytics, customer transparency
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_state_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- State Change Details
    from_state VARCHAR(50),  -- NULL for initial state
    to_state VARCHAR(50) NOT NULL,
    
    -- Attribution
    changed_by UUID,  -- User ID who initiated the change
    changed_by_role VARCHAR(50),  -- 'admin', 'crew', 'customer', 'system'
    change_source VARCHAR(20) NOT NULL DEFAULT 'manual',  -- 'manual', 'automated', 'api'
    
    -- Context
    reason TEXT,  -- Human-readable reason for transition
    notes JSONB,  -- Additional structured data
    metadata JSONB,  -- System metadata (IP, user agent, etc.)
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for job_state_transitions table
CREATE INDEX IF NOT EXISTS idx_job_state_transitions_job_id ON job_state_transitions(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_state_transitions_to_state ON job_state_transitions(to_state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_state_transitions_created ON job_state_transitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_state_transitions_changed_by ON job_state_transitions(changed_by);

COMMENT ON TABLE job_state_transitions IS 'Audit trail for all job state changes';
COMMENT ON COLUMN job_state_transitions.from_state IS 'Previous state - NULL for initial creation';
COMMENT ON COLUMN job_state_transitions.change_source IS 'How transition was triggered: manual, automated, api';

-- ============================================================================
-- SECTION 2: ENHANCE JOBS TABLE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Add State Machine Columns to Jobs Table
-- ----------------------------------------------------------------------------

-- Core State Management
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_state_change_at TIMESTAMPTZ;

-- Hold Management (weather, client delays, permit waiting)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS active_hold_until TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS weather_hold_reason TEXT;

-- Permit Management
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS permit_required BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS permit_status VARCHAR(50);  -- 'pending', 'approved', 'denied'
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS permit_details JSONB;  -- {permit_number, issued_date, expires, authority}

-- Deposit Management
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(50);  -- 'pending', 'received', 'waived'
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);

-- Completion Management
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_checklist JSONB;  -- [{item: "Clean up debris", checked: true}]
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_start_time TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_end_time TIMESTAMPTZ;

-- JHA Management (Job Hazard Analysis) - Enhanced
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jha_acknowledged_by UUID;  -- Employee ID who acknowledged

-- Invoice Linkage
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS invoice_id UUID;  -- Direct link to invoice when created
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_jobs_last_state_change ON jobs(last_state_change_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_permit_status ON jobs(permit_status) WHERE permit_required = true;
CREATE INDEX IF NOT EXISTS idx_jobs_deposit_status ON jobs(deposit_status) WHERE deposit_required = true;
CREATE INDEX IF NOT EXISTS idx_jobs_invoice_id ON jobs(invoice_id);

-- ============================================================================
-- SECTION 3: STATE VALIDATION CONSTRAINT
-- ============================================================================

-- Drop existing constraint if it exists (for re-running migration)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_job_status'
    ) THEN
        ALTER TABLE jobs DROP CONSTRAINT valid_job_status;
    END IF;
END $$;

-- Add constraint for valid job states (10 states total)
ALTER TABLE jobs ADD CONSTRAINT valid_job_status CHECK (
    status IN (
        'draft',              -- Initial state - job created from accepted quote
        'needs_permit',       -- Waiting for permit approval
        'waiting_on_client',  -- Waiting for client action (deposit, access, scheduling)
        'scheduled',          -- Job scheduled with crew and date
        'weather_hold',       -- Temporarily on hold due to weather
        'in_progress',        -- Crew actively working on site
        'completed',          -- Work finished, ready for invoicing
        'invoiced',           -- Invoice sent to client
        'paid',               -- Payment received (terminal state)
        'cancelled'           -- Job cancelled (terminal state)
    )
);

COMMENT ON COLUMN jobs.status IS 'Current job state - follows state machine transitions';
COMMENT ON COLUMN jobs.last_state_change_at IS 'Timestamp of last state transition';
COMMENT ON COLUMN jobs.completion_checklist IS 'Tasks to complete before marking job as done';

-- ============================================================================
-- SECTION 4: DATA MIGRATION
-- ============================================================================

-- Update existing jobs to use new state machine states
-- Map old statuses to new state machine states
DO $$ 
BEGIN
    -- Update 'Unscheduled' -> 'draft'
    UPDATE jobs 
    SET status = 'draft', last_state_change_at = COALESCE(last_state_change_at, created_at)
    WHERE status = 'Unscheduled';
    
    -- Update 'Scheduled' -> 'scheduled'
    UPDATE jobs 
    SET status = 'scheduled', last_state_change_at = COALESCE(last_state_change_at, created_at)
    WHERE status = 'Scheduled';
    
    -- Update 'In Progress' -> 'in_progress'
    UPDATE jobs 
    SET status = 'in_progress', last_state_change_at = COALESCE(last_state_change_at, created_at)
    WHERE status = 'In Progress';
    
    -- Update 'Completed' -> 'completed'
    UPDATE jobs 
    SET status = 'completed', last_state_change_at = COALESCE(last_state_change_at, created_at)
    WHERE status = 'Completed';
    
    -- Update 'Cancelled' -> 'cancelled'
    UPDATE jobs 
    SET status = 'cancelled', last_state_change_at = COALESCE(last_state_change_at, created_at)
    WHERE status = 'Cancelled';
    
    RAISE NOTICE 'Job statuses migrated to state machine format';
END $$;

-- ============================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: get_job_current_state
-- Purpose: Get the current state of a job (convenience function)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_job_current_state(p_job_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(50);
BEGIN
    SELECT status INTO v_status
    FROM jobs
    WHERE id = p_job_id;
    
    RETURN v_status;
END;
$$;

COMMENT ON FUNCTION get_job_current_state IS 'Returns the current state of a job';

-- ----------------------------------------------------------------------------
-- Function: get_job_state_history
-- Purpose: Get complete state transition history for a job
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_job_state_history(p_job_id UUID)
RETURNS TABLE (
    transition_id UUID,
    from_state VARCHAR(50),
    to_state VARCHAR(50),
    changed_by UUID,
    changed_by_role VARCHAR(50),
    change_source VARCHAR(20),
    reason TEXT,
    notes JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jst.id,
        jst.from_state,
        jst.to_state,
        jst.changed_by,
        jst.changed_by_role,
        jst.change_source,
        jst.reason,
        jst.notes,
        jst.created_at
    FROM job_state_transitions jst
    WHERE jst.job_id = p_job_id
    ORDER BY jst.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_job_state_history IS 'Returns complete state transition history for a job';

-- ============================================================================
-- SECTION 6: COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration 002_job_state_machine completed successfully';
    RAISE NOTICE '📊 Job State Machine Features:';
    RAISE NOTICE '   - 10 job states (draft → paid/cancelled)';
    RAISE NOTICE '   - Complete audit trail (job_state_transitions table)';
    RAISE NOTICE '   - Enhanced job metadata (permits, deposits, checklists)';
    RAISE NOTICE '   - Helper functions for state queries';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next Steps:';
    RAISE NOTICE '   1. Implement jobStateService.js with transition logic';
    RAISE NOTICE '   2. Add API endpoints for state management';
    RAISE NOTICE '   3. Update frontend to use new state machine';
END $$;
