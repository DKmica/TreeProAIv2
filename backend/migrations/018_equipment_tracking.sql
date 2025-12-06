-- ============================================================================
-- 018: Equipment Usage & Maintenance Tracking
-- ----------------------------------------------------------------------------
-- Phase 4: Adds equipment usage tracking and maintenance scheduling tables
-- to enable equipment lifecycle management and maintenance tracking.
-- ============================================================================

-- Equipment Usage tracking
CREATE TABLE IF NOT EXISTS equipment_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  used_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  hours_used DECIMAL(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Maintenance tracking  
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL, -- 'scheduled', 'repair', 'inspection'
  scheduled_date DATE,
  actual_date DATE,
  performed_by UUID REFERENCES employees(id),
  cost DECIMAL(10,2),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'overdue'
  next_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding due maintenance
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_due ON equipment_maintenance(equipment_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_job ON equipment_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_equipment ON equipment_usage(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_used_by ON equipment_usage(used_by);

COMMENT ON TABLE equipment_usage IS 'Tracks when equipment is used, by whom, and for which jobs';
COMMENT ON TABLE equipment_maintenance IS 'Tracks scheduled and completed maintenance for equipment';
