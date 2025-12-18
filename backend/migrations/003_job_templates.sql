-- ============================================================================
-- TreePro AI - Phase 2 Job Templates Migration
-- Migration: 003_job_templates.sql
-- Description: Job templates system for saving common job configurations
--              as reusable templates for quick job creation
-- Created: 2024-11-09
-- ============================================================================
-- 
-- This migration implements a job templates system that supports:
--   - Reusable job configurations with pricing and requirements
--   - Category-based organization (Removal, Pruning, Emergency, etc.)
--   - Pre-built checklists and safety notes
--   - Usage tracking and analytics
--   - Template creation from existing jobs
-- 
-- IDEMPOTENCY: Safe to run multiple times using IF NOT EXISTS checks
-- ============================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: JOB TEMPLATES TABLE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: job_templates
-- Purpose: Store reusable job configuration templates
-- Use case: Quick job creation from common service patterns
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Job configuration
  default_duration_hours DECIMAL(5,2),
  default_crew_size INTEGER,
  default_equipment_ids JSONB,
  
  -- Pricing
  base_price DECIMAL(10,2),
  price_per_hour DECIMAL(10,2),
  line_items JSONB,
  
  -- Requirements
  permit_required BOOLEAN DEFAULT false,
  deposit_required BOOLEAN DEFAULT false,
  deposit_percentage DECIMAL(5,2),
  jha_required BOOLEAN DEFAULT false,
  
  -- Checklist & Notes
  completion_checklist JSONB,
  safety_notes TEXT,
  special_instructions TEXT,
  
  -- Metadata
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  
  -- Usage stats
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ
);

-- Indexes for job_templates table
CREATE INDEX IF NOT EXISTS idx_job_templates_category ON job_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_templates_usage ON job_templates(usage_count DESC, last_used_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_templates_created_at ON job_templates(created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE job_templates IS 'Reusable job configuration templates for quick job creation';
COMMENT ON COLUMN job_templates.line_items IS 'JSONB array of pricing line items';
COMMENT ON COLUMN job_templates.completion_checklist IS 'JSONB array of checklist items';
COMMENT ON COLUMN job_templates.usage_count IS 'Number of times this template has been used';

-- ============================================================================
-- SECTION 2: SEED DATA - COMMON TREE SERVICE TEMPLATES
-- ============================================================================

-- Insert seed templates (with ON CONFLICT to ensure idempotency)
INSERT INTO job_templates (id, name, description, category, default_duration_hours, default_crew_size, base_price, permit_required, jha_required, safety_notes, line_items, completion_checklist) VALUES
('template_001', 'Tree Removal - Small', 'Standard small tree removal (under 30 ft)', 'Removal', 3.0, 2, 800.00, false, true, 'Check for power lines, mark drop zone, use proper PPE', 
 '[{"description":"Tree removal","quantity":1,"unitPrice":600,"total":600},{"description":"Stump grinding","quantity":1,"unitPrice":150,"total":150},{"description":"Debris removal","quantity":1,"unitPrice":50,"total":50}]'::jsonb,
 '[{"item":"Safety zone established","checked":false},{"item":"PPE worn","checked":false},{"item":"Drop zone clear","checked":false},{"item":"Equipment inspected","checked":false},{"item":"Debris removed","checked":false},{"item":"Site cleaned","checked":false}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_templates (id, name, description, category, default_duration_hours, default_crew_size, base_price, permit_required, jha_required, safety_notes, line_items, completion_checklist) VALUES
('template_002', 'Tree Removal - Large', 'Large tree removal (over 60 ft) with crane', 'Removal', 8.0, 4, 4500.00, true, true, 'Crane required, permit needed, traffic control', 
 '[{"description":"Large tree removal with crane","quantity":1,"unitPrice":3500,"total":3500},{"description":"Stump grinding","quantity":1,"unitPrice":400,"total":400},{"description":"Debris haul-away","quantity":1,"unitPrice":600,"total":600}]'::jsonb,
 '[{"item":"Permit obtained","checked":false},{"item":"Crane setup verified","checked":false},{"item":"Safety zone established","checked":false},{"item":"Traffic control in place","checked":false},{"item":"PPE worn","checked":false},{"item":"Equipment inspected","checked":false},{"item":"Debris removed","checked":false},{"item":"Site restored","checked":false}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_templates (id, name, description, category, default_duration_hours, default_crew_size, base_price, permit_required, jha_required, safety_notes, line_items, completion_checklist) VALUES
('template_003', 'Tree Pruning - Standard', 'Crown thinning and deadwood removal', 'Pruning', 4.0, 2, 650.00, false, false, 'Follow ANSI A300 standards, maintain natural shape', 
 '[{"description":"Crown thinning","quantity":1,"unitPrice":400,"total":400},{"description":"Deadwood removal","quantity":1,"unitPrice":150,"total":150},{"description":"Cleanup","quantity":1,"unitPrice":100,"total":100}]'::jsonb,
 '[{"item":"PPE worn","checked":false},{"item":"Climbing gear inspected","checked":false},{"item":"Proper cuts made","checked":false},{"item":"Natural shape maintained","checked":false},{"item":"Debris chipped","checked":false},{"item":"Site cleaned","checked":false}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_templates (id, name, description, category, default_duration_hours, default_crew_size, base_price, permit_required, jha_required, safety_notes, line_items, completion_checklist) VALUES
('template_004', 'Emergency Storm Damage', 'Emergency tree service for storm damage', 'Emergency', 4.0, 3, 1200.00, false, true, 'Priority response, assess structural damage first', 
 '[{"description":"Emergency response","quantity":1,"unitPrice":300,"total":300},{"description":"Hazard removal","quantity":1,"unitPrice":700,"total":700},{"description":"Cleanup","quantity":1,"unitPrice":200,"total":200}]'::jsonb,
 '[{"item":"Safety assessment complete","checked":false},{"item":"Power lines checked","checked":false},{"item":"Hazards secured","checked":false},{"item":"Debris removed","checked":false},{"item":"Customer notified of follow-up","checked":false}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: get_template_usage_stats
-- Purpose: Get usage statistics for all templates
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_template_usage_stats()
RETURNS TABLE (
    template_id VARCHAR(36),
    template_name VARCHAR(255),
    category VARCHAR(100),
    usage_count INTEGER,
    last_used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jt.id,
        jt.name,
        jt.category,
        jt.usage_count,
        jt.last_used_at
    FROM job_templates jt
    WHERE jt.deleted_at IS NULL
    ORDER BY jt.usage_count DESC, jt.last_used_at DESC;
END;
$$;

COMMENT ON FUNCTION get_template_usage_stats IS 'Returns usage statistics for all job templates';

-- ============================================================================
-- SECTION 4: COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration 003_job_templates completed successfully';
    RAISE NOTICE '📊 Job Templates Features:';
    RAISE NOTICE '   - Reusable job configuration templates';
    RAISE NOTICE '   - Category-based organization';
    RAISE NOTICE '   - Pre-built pricing, checklists, and safety notes';
    RAISE NOTICE '   - Usage tracking and analytics';
    RAISE NOTICE '   - 4 seed templates created (Small/Large Removal, Pruning, Emergency)';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next Steps:';
    RAISE NOTICE '   1. Implement jobTemplateService.js with CRUD operations';
    RAISE NOTICE '   2. Add API endpoints for template management';
    RAISE NOTICE '   3. Build frontend UI for template selection';
END $$;
