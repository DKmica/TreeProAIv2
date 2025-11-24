-- Migration: 009_job_template_enrichment.sql
-- Description: Track template linkage and crew sizing on jobs for better automation

-- Add job_template_id reference and required_crew_size if missing
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_template_id VARCHAR(36) REFERENCES job_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS required_crew_size INTEGER;

-- Index to quickly find jobs created from templates
CREATE INDEX IF NOT EXISTS idx_jobs_job_template ON jobs(job_template_id);
