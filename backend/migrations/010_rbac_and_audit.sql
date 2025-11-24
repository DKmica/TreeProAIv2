-- ============================================================================
-- RBAC (Role-Based Access Control) & Audit Logging
-- ============================================================================

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'sales', 'crew')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exception Queue (quotes awaiting approval, overdue invoices, etc)
CREATE TABLE IF NOT EXISTS exception_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('quote_pending_approval', 'invoice_overdue', 'job_missing_forms', 'quote_follow_up')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  related_entity_id UUID,
  priority VARCHAR(20) DEFAULT 'medium',
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  metadata JSONB,
  UNIQUE(exception_type, entity_id)
);

-- Automation Tracking (for scheduled actions like quote follow-ups, dunning)
CREATE TABLE IF NOT EXISTS automation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_type VARCHAR(50) NOT NULL CHECK (automation_type IN ('quote_follow_up', 'invoice_dunning', 'job_auto_convert', 'invoice_auto_create')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  execution_status VARCHAR(20) DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Aging Table (for tracking overdue invoices)
CREATE TABLE IF NOT EXISTS invoice_aging (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL,
  bucket VARCHAR(20) NOT NULL CHECK (bucket IN ('current', '30', '60', '90')),
  days_overdue INTEGER,
  total_amount NUMERIC(12,2),
  paid_amount NUMERIC(12,2),
  balance_amount NUMERIC(12,2),
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(invoice_id, bucket)
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_exception_queue_type ON exception_queue(exception_type);
CREATE INDEX idx_exception_queue_resolved ON exception_queue(is_resolved);
CREATE INDEX idx_automation_events_scheduled ON automation_events(scheduled_for);
CREATE INDEX idx_invoice_aging_bucket ON invoice_aging(bucket);
