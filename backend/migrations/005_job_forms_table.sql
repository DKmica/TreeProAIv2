-- ============================================================================
-- TreePro AI - Job Forms Table Migration
-- Migration: 005_job_forms_table.sql
-- Description: Create job_forms table for attaching form templates to jobs
-- Created: 2024-11-09
-- ============================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Table: job_forms
-- Purpose: Link form templates to specific jobs with filled data
-- Use case: Attach "Pre-Job Safety Checklist" to Job X, track completion
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
    
    -- Form Data (filled field values)
    form_data JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed'
    
    -- Completion Tracking
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(255),
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for job_forms table
CREATE INDEX IF NOT EXISTS idx_job_forms_job ON job_forms(job_id);
CREATE INDEX IF NOT EXISTS idx_job_forms_template ON job_forms(form_template_id);
CREATE INDEX IF NOT EXISTS idx_job_forms_status ON job_forms(status);

-- Add constraint for valid statuses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_job_form_status'
    ) THEN
        ALTER TABLE job_forms ADD CONSTRAINT valid_job_form_status CHECK (
            status IN ('pending', 'in_progress', 'completed')
        );
    END IF;
END $$;

COMMENT ON TABLE job_forms IS 'Job-specific form instances attached from templates';
COMMENT ON COLUMN job_forms.form_data IS 'JSONB object with filled field values: {field_id: value}';
COMMENT ON COLUMN job_forms.status IS 'Form status: pending, in_progress, completed';
COMMENT ON COLUMN job_forms.completed_by IS 'Employee name or ID who completed the form';
