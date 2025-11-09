-- ============================================================================
-- TreePro AI - Phase 2B Operations Core Migration
-- Migration: 004_phase2b_operations.sql
-- Description: Comprehensive operations enhancement with crew management,
--              enhanced time tracking, job forms/checklists, and recurring jobs
-- Created: 2024-11-09
-- ============================================================================
-- 
-- This migration implements advanced operational capabilities that support:
--   - Crew Management: Organize employees into crews with roles and assignments
--   - Enhanced Time Tracking: Clock in/out with GPS, approval workflows, timesheets
--   - Job Forms & Checklists: Custom safety forms, completion checklists, photo capture
--   - Recurring Jobs: Scheduled job series with automated instance generation
-- 
-- IDEMPOTENCY: Safe to run multiple times using IF NOT EXISTS checks
-- ============================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: CREW MANAGEMENT TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: crews
-- Purpose: Organize employees into working crews/teams
-- Use case: "Crew Alpha", "Emergency Response Team", "Pruning Specialists"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Default Schedule
    default_start_time TIME,  -- e.g., '08:00:00'
    default_end_time TIME,    -- e.g., '17:00:00'
    
    -- Capacity Planning
    capacity INTEGER,  -- Max jobs per day
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE  -- Soft delete support
);

-- Indexes for crews table
CREATE INDEX IF NOT EXISTS idx_crews_active ON crews(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crews_deleted ON crews(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE crews IS 'Working crews/teams for organizing employees';
COMMENT ON COLUMN crews.capacity IS 'Maximum number of jobs this crew can handle per day';
COMMENT ON COLUMN crews.default_start_time IS 'Standard crew start time (e.g., 08:00)';

-- ----------------------------------------------------------------------------
-- Table: crew_members
-- Purpose: Many-to-many relationship between crews and employees with roles
-- Use case: Track who is on which crew and their role (leader, climber, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Role in Crew
    role VARCHAR(50),  -- 'leader', 'climber', 'groundsman', 'driver'
    
    -- Membership Period
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE  -- NULL for active members
);

-- Unique partial index: One employee can only be in a crew once (active members only)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_crew_member ON crew_members(crew_id, employee_id) WHERE left_at IS NULL;

-- Indexes for crew_members table
CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON crew_members(crew_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crew_members_employee ON crew_members(employee_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crew_members_role ON crew_members(role) WHERE left_at IS NULL;

COMMENT ON TABLE crew_members IS 'Employee membership in crews with roles and time periods';
COMMENT ON COLUMN crew_members.left_at IS 'NULL for active members, timestamp when they left the crew';
COMMENT ON COLUMN crew_members.role IS 'Role in crew: leader, climber, groundsman, driver';

-- ----------------------------------------------------------------------------
-- Table: crew_assignments
-- Purpose: Assign crews to specific jobs with dates
-- Use case: Schedule "Crew Alpha" to work on job X on 2024-11-15
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crew_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE RESTRICT,
    
    -- Assignment Details
    assigned_date DATE NOT NULL,
    assigned_by VARCHAR(200),  -- User who made the assignment
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for crew_assignments table
CREATE INDEX IF NOT EXISTS idx_crew_assignments_job ON crew_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_crew ON crew_assignments(crew_id, assigned_date DESC);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_date ON crew_assignments(assigned_date DESC);

COMMENT ON TABLE crew_assignments IS 'Assignment of crews to jobs on specific dates';
COMMENT ON COLUMN crew_assignments.assigned_date IS 'Date this crew is assigned to work this job';

-- ============================================================================
-- SECTION 2: ENHANCED TIME TRACKING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enhance time_entries table with clock in/out and approval workflow
-- ----------------------------------------------------------------------------

-- Clock In/Out Timestamps
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_time TIMESTAMP WITH TIME ZONE;

-- GPS Location Tracking
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_lat DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_lon DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_lat DOUBLE PRECISION;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_lon DOUBLE PRECISION;

-- Break Management
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 0;

-- Approval Workflow
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_by UUID;  -- References users table
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add indexes for new time_entries columns
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status ON time_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by ON time_entries(approved_by);

-- Add constraint for valid approval statuses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_time_entry_approval_status'
    ) THEN
        ALTER TABLE time_entries ADD CONSTRAINT valid_time_entry_approval_status CHECK (
            approval_status IN ('pending', 'approved', 'rejected')
        );
    END IF;
END $$;

COMMENT ON COLUMN time_entries.clock_in_time IS 'Actual clock-in timestamp (may differ from scheduled time)';
COMMENT ON COLUMN time_entries.clock_out_time IS 'Actual clock-out timestamp';
COMMENT ON COLUMN time_entries.clock_in_lat IS 'GPS latitude at clock-in for location verification';
COMMENT ON COLUMN time_entries.approval_status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN time_entries.break_duration_minutes IS 'Unpaid break time in minutes';

-- ----------------------------------------------------------------------------
-- Table: timesheets
-- Purpose: Weekly/bi-weekly timesheet batches for approval workflow
-- Use case: Employees submit timesheets, managers approve/reject for payroll
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Time Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'submitted', 'approved', 'rejected'
    
    -- Summary Totals (calculated from time_entries)
    total_hours NUMERIC(10,2) DEFAULT 0,
    total_overtime_hours NUMERIC(10,2) DEFAULT 0,
    
    -- Submission
    submitted_at TIMESTAMP WITH TIME ZONE,
    
    -- Review
    reviewed_by UUID,  -- References users table (manager/admin)
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: One timesheet per employee per period
CREATE UNIQUE INDEX IF NOT EXISTS unique_timesheet_period ON timesheets(employee_id, period_start, period_end);

-- Indexes for timesheets table
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets(employee_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_period ON timesheets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_timesheets_reviewed_by ON timesheets(reviewed_by);

-- Add constraint for valid timesheet statuses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_timesheet_status'
    ) THEN
        ALTER TABLE timesheets ADD CONSTRAINT valid_timesheet_status CHECK (
            status IN ('draft', 'submitted', 'approved', 'rejected')
        );
    END IF;
END $$;

COMMENT ON TABLE timesheets IS 'Weekly/bi-weekly timesheet batches for approval workflow';
COMMENT ON COLUMN timesheets.period_start IS 'Start date of pay period';
COMMENT ON COLUMN timesheets.period_end IS 'End date of pay period';
COMMENT ON COLUMN timesheets.status IS 'Timesheet status: draft, submitted, approved, rejected';
COMMENT ON COLUMN timesheets.total_hours IS 'Total regular hours for this timesheet period';

-- ============================================================================
-- SECTION 3: JOB FORMS & CHECKLISTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: form_templates
-- Purpose: Define reusable form templates (safety checklists, completion forms)
-- Use case: "Daily Safety Checklist", "Tree Removal Completion Form"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    form_type VARCHAR(50),  -- 'safety', 'completion', 'inspection', 'custom'
    
    -- Form Structure (JSONB array of field definitions)
    -- Example: [{"id": "f1", "type": "checkbox", "label": "PPE worn", "required": true, "options": []}]
    fields JSONB NOT NULL DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Requirements
    require_signature BOOLEAN DEFAULT false,
    require_photos BOOLEAN DEFAULT false,
    min_photos INTEGER,  -- Minimum number of photos required
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,  -- References users table
    deleted_at TIMESTAMP WITH TIME ZONE  -- Soft delete support
);

-- Indexes for form_templates table
CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_templates_active ON form_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_templates_deleted ON form_templates(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE form_templates IS 'Reusable form templates for safety checklists, completion forms, etc.';
COMMENT ON COLUMN form_templates.fields IS 'JSONB array of field definitions: [{id, type, label, required, options}]';
COMMENT ON COLUMN form_templates.form_type IS 'Type of form: safety, completion, inspection, custom';
COMMENT ON COLUMN form_templates.require_signature IS 'Whether form requires digital signature';

-- ----------------------------------------------------------------------------
-- Table: form_submissions
-- Purpose: Store completed form submissions from field crews
-- Use case: Safety checklist filled out before job, completion form after job
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    submitted_by UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    
    -- Form Data
    submission_data JSONB NOT NULL DEFAULT '{}',  -- Field responses
    signature_data TEXT,  -- Base64 encoded signature image
    
    -- Location (GPS where form was submitted)
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    
    -- Timestamp
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for form_submissions table
CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON form_submissions(form_template_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_job ON form_submissions(job_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_employee ON form_submissions(submitted_by, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_date ON form_submissions(submitted_at DESC);

COMMENT ON TABLE form_submissions IS 'Completed form submissions from field crews';
COMMENT ON COLUMN form_submissions.submission_data IS 'JSONB object with field responses mapped by field id';
COMMENT ON COLUMN form_submissions.signature_data IS 'Base64 encoded signature image (if required)';
COMMENT ON COLUMN form_submissions.location_lat IS 'GPS latitude where form was submitted';

-- ----------------------------------------------------------------------------
-- Table: form_photos
-- Purpose: Photos attached to form submissions
-- Use case: Before/after photos, safety hazard documentation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    
    -- Photo Details
    photo_url TEXT NOT NULL,
    caption TEXT,
    
    -- Timestamp
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for form_photos table
CREATE INDEX IF NOT EXISTS idx_form_photos_submission ON form_photos(form_submission_id, uploaded_at DESC);

COMMENT ON TABLE form_photos IS 'Photos attached to form submissions';
COMMENT ON COLUMN form_photos.photo_url IS 'URL or path to photo storage';

-- ============================================================================
-- SECTION 4: RECURRING JOBS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: job_series
-- Purpose: Define recurring job series with schedule patterns
-- Use case: "Monthly Oak Pruning", "Quarterly Property Maintenance"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Series Info
    series_name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100),  -- 'pruning', 'removal', 'fertilization', etc.
    
    -- Recurrence Pattern
    recurrence_pattern VARCHAR(50) NOT NULL,  -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'
    recurrence_interval INTEGER DEFAULT 1,    -- Every N days/weeks/months (e.g., every 2 weeks = interval 2)
    
    -- Schedule Details (nullable depending on pattern)
    recurrence_day_of_week INTEGER,   -- 0-6 for Sunday-Saturday (for weekly)
    recurrence_day_of_month INTEGER,  -- 1-31 (for monthly)
    recurrence_month INTEGER,         -- 1-12 (for yearly)
    
    -- Time Period
    start_date DATE NOT NULL,
    end_date DATE,  -- NULL for ongoing series
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Job Configuration
    job_template_id VARCHAR(36) REFERENCES job_templates(id) ON DELETE SET NULL,
    default_crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
    estimated_duration_hours NUMERIC(5,2),
    
    -- Notes
    notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for job_series table
CREATE INDEX IF NOT EXISTS idx_job_series_client ON job_series(client_id);
CREATE INDEX IF NOT EXISTS idx_job_series_property ON job_series(property_id);
CREATE INDEX IF NOT EXISTS idx_job_series_active ON job_series(is_active);
CREATE INDEX IF NOT EXISTS idx_job_series_dates ON job_series(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_job_series_pattern ON job_series(recurrence_pattern);

-- Add constraint for valid recurrence patterns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_recurrence_pattern'
    ) THEN
        ALTER TABLE job_series ADD CONSTRAINT valid_recurrence_pattern CHECK (
            recurrence_pattern IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')
        );
    END IF;
END $$;

COMMENT ON TABLE job_series IS 'Recurring job series with schedule patterns';
COMMENT ON COLUMN job_series.recurrence_pattern IS 'Pattern: daily, weekly, monthly, quarterly, yearly, custom';
COMMENT ON COLUMN job_series.recurrence_interval IS 'Interval multiplier (e.g., every 2 weeks = interval 2)';
COMMENT ON COLUMN job_series.recurrence_day_of_week IS '0=Sunday, 1=Monday, ... 6=Saturday (for weekly)';
COMMENT ON COLUMN job_series.recurrence_day_of_month IS 'Day of month 1-31 (for monthly recurring)';

-- ----------------------------------------------------------------------------
-- Table: recurring_job_instances
-- Purpose: Track generated instances of recurring jobs
-- Use case: Store scheduled dates and track whether jobs were created/skipped
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_job_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_series_id UUID NOT NULL REFERENCES job_series(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,  -- NULL until job is created
    
    -- Schedule
    scheduled_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled',  -- 'scheduled', 'skipped', 'created', 'cancelled'
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: One instance per series per date
CREATE UNIQUE INDEX IF NOT EXISTS unique_series_instance ON recurring_job_instances(job_series_id, scheduled_date);

-- Indexes for recurring_job_instances table
CREATE INDEX IF NOT EXISTS idx_recurring_instances_series ON recurring_job_instances(job_series_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_job ON recurring_job_instances(job_id);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_date ON recurring_job_instances(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_status ON recurring_job_instances(status);

-- Add constraint for valid instance statuses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_instance_status'
    ) THEN
        ALTER TABLE recurring_job_instances ADD CONSTRAINT valid_instance_status CHECK (
            status IN ('scheduled', 'skipped', 'created', 'cancelled')
        );
    END IF;
END $$;

COMMENT ON TABLE recurring_job_instances IS 'Generated instances of recurring jobs';
COMMENT ON COLUMN recurring_job_instances.scheduled_date IS 'Date this instance is scheduled to occur';
COMMENT ON COLUMN recurring_job_instances.status IS 'Status: scheduled, skipped, created, cancelled';
COMMENT ON COLUMN recurring_job_instances.job_id IS 'FK to actual job (NULL until job is created from this instance)';

-- ============================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: get_active_crew_members
-- Purpose: Get all active members of a crew
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_active_crew_members(p_crew_id UUID)
RETURNS TABLE (
    crew_member_id UUID,
    employee_id UUID,
    employee_name TEXT,
    role VARCHAR(50),
    joined_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.employee_id,
        e.name,
        cm.role,
        cm.joined_at
    FROM crew_members cm
    JOIN employees e ON cm.employee_id = e.id
    WHERE cm.crew_id = p_crew_id
      AND cm.left_at IS NULL
    ORDER BY cm.role, e.name;
END;
$$;

COMMENT ON FUNCTION get_active_crew_members IS 'Get all active members of a specific crew';

-- ----------------------------------------------------------------------------
-- Function: get_crew_schedule
-- Purpose: Get crew assignments for a date range
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_crew_schedule(
    p_crew_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    assignment_id UUID,
    job_id UUID,
    job_customer TEXT,
    assigned_date DATE,
    job_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id,
        ca.job_id,
        j.customer_name,
        ca.assigned_date,
        j.status
    FROM crew_assignments ca
    JOIN jobs j ON ca.job_id = j.id
    WHERE ca.crew_id = p_crew_id
      AND ca.assigned_date BETWEEN p_start_date AND p_end_date
    ORDER BY ca.assigned_date, j.customer_name;
END;
$$;

COMMENT ON FUNCTION get_crew_schedule IS 'Get crew assignments for a specific date range';

-- ----------------------------------------------------------------------------
-- Function: get_pending_timesheets
-- Purpose: Get all timesheets awaiting approval
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pending_timesheets()
RETURNS TABLE (
    timesheet_id UUID,
    employee_id UUID,
    employee_name TEXT,
    period_start DATE,
    period_end DATE,
    total_hours NUMERIC,
    submitted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.employee_id,
        e.name,
        t.period_start,
        t.period_end,
        t.total_hours,
        t.submitted_at
    FROM timesheets t
    JOIN employees e ON t.employee_id = e.id
    WHERE t.status = 'submitted'
    ORDER BY t.submitted_at ASC;
END;
$$;

COMMENT ON FUNCTION get_pending_timesheets IS 'Get all timesheets in submitted status awaiting approval';

-- ----------------------------------------------------------------------------
-- Function: generate_recurring_instances
-- Purpose: Generate upcoming instances for a job series
-- Note: This is a helper function. Actual generation should be done via scheduled job
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_recurring_instances(
    p_series_id UUID,
    p_generate_until DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_series RECORD;
    v_current_date DATE;
    v_interval_days INTEGER;
BEGIN
    -- Get series details
    SELECT * INTO v_series
    FROM job_series
    WHERE id = p_series_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate interval in days based on pattern
    CASE v_series.recurrence_pattern
        WHEN 'daily' THEN
            v_interval_days := v_series.recurrence_interval;
        WHEN 'weekly' THEN
            v_interval_days := v_series.recurrence_interval * 7;
        WHEN 'monthly' THEN
            v_interval_days := v_series.recurrence_interval * 30;  -- Approximation
        WHEN 'quarterly' THEN
            v_interval_days := v_series.recurrence_interval * 90;
        WHEN 'yearly' THEN
            v_interval_days := v_series.recurrence_interval * 365;
        ELSE
            v_interval_days := 30;  -- Default to monthly
    END CASE;
    
    -- Generate instances
    v_current_date := v_series.start_date;
    
    WHILE v_current_date <= p_generate_until LOOP
        -- Check if end_date is set and we've passed it
        IF v_series.end_date IS NOT NULL AND v_current_date > v_series.end_date THEN
            EXIT;
        END IF;
        
        -- Insert instance if it doesn't exist
        INSERT INTO recurring_job_instances (job_series_id, scheduled_date, status)
        VALUES (p_series_id, v_current_date, 'scheduled')
        ON CONFLICT (job_series_id, scheduled_date) DO NOTHING;
        
        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
        
        -- Increment date
        v_current_date := v_current_date + v_interval_days;
    END LOOP;
    
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION generate_recurring_instances IS 'Generate scheduled instances for a recurring job series';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 004_phase2b_operations.sql completed successfully';
    RAISE NOTICE 'Created tables: crews, crew_members, crew_assignments, timesheets, form_templates, form_submissions, form_photos, job_series, recurring_job_instances';
    RAISE NOTICE 'Enhanced tables: time_entries (added clock in/out, GPS, approval workflow)';
    RAISE NOTICE 'Created helper functions: get_active_crew_members, get_crew_schedule, get_pending_timesheets, generate_recurring_instances';
END $$;
