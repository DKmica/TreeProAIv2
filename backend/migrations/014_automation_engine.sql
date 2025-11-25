-- ============================================================================
-- Migration 014: Automation Engine Schema
-- ============================================================================
-- Phase 2: Automation Engine + Workflows
-- Creates tables for workflow automation system with triggers, actions, and logs
-- ============================================================================

-- ============================================================================
-- SECTION 1: AUTOMATION WORKFLOWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    template_category VARCHAR(100),
    
    -- Execution Settings
    max_executions_per_day INTEGER DEFAULT 100,
    cooldown_minutes INTEGER DEFAULT 0,
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_workflows_active ON automation_workflows(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_template ON automation_workflows(is_template) WHERE deleted_at IS NULL;

COMMENT ON TABLE automation_workflows IS 'Stores workflow automation definitions';

-- ============================================================================
-- SECTION 2: AUTOMATION TRIGGERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    
    -- Trigger Type
    trigger_type VARCHAR(100) NOT NULL,
    -- Supported types:
    -- 'quote_sent', 'quote_not_responded', 'quote_approved', 'quote_rejected'
    -- 'job_created', 'job_scheduled', 'job_started', 'job_completed', 'job_cancelled'
    -- 'invoice_created', 'invoice_sent', 'invoice_overdue', 'invoice_paid'
    -- 'lead_created', 'lead_stage_changed', 'lead_inactive'
    -- 'crew_clock_in', 'crew_clock_out', 'crew_clock_irregularity'
    -- 'schedule' (CRON-based)
    
    -- Trigger Configuration (JSON)
    config JSONB DEFAULT '{}',
    -- Examples:
    -- For 'quote_not_responded': {"days_threshold": 3}
    -- For 'invoice_overdue': {"days_past_due": 7}
    -- For 'schedule': {"cron_expression": "0 9 * * 1", "timezone": "America/New_York"}
    
    -- Conditions (JSON array of conditions that must ALL be met)
    conditions JSONB DEFAULT '[]',
    -- Example: [{"field": "amount", "operator": ">=", "value": 1000}]
    
    -- Order (for multiple triggers)
    trigger_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggers_workflow ON automation_triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_triggers_type ON automation_triggers(trigger_type);

COMMENT ON TABLE automation_triggers IS 'Defines when a workflow should be triggered';

-- ============================================================================
-- SECTION 3: AUTOMATION ACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    
    -- Action Type
    action_type VARCHAR(100) NOT NULL,
    -- Supported types:
    -- 'send_email', 'send_sms'
    -- 'create_task', 'create_reminder', 'create_followup'
    -- 'update_lead_stage', 'update_job_status', 'update_invoice_status'
    -- 'create_invoice', 'send_satisfaction_survey'
    -- 'assign_to_user', 'add_tag', 'remove_tag'
    -- 'webhook', 'ai_suggestion'
    
    -- Action Configuration (JSON)
    config JSONB DEFAULT '{}',
    -- Examples:
    -- For 'send_email': {"template_id": "...", "subject": "...", "body": "..."}
    -- For 'send_sms': {"template_id": "...", "message": "..."}
    -- For 'update_lead_stage': {"new_stage": "contacted"}
    -- For 'create_task': {"title": "...", "due_in_days": 3, "assign_to": "..."}
    
    -- Delay before execution
    delay_minutes INTEGER DEFAULT 0,
    
    -- Execution order
    action_order INTEGER DEFAULT 0,
    
    -- Continue on failure?
    continue_on_error BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_workflow ON automation_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_actions_type ON automation_actions(action_type);

COMMENT ON TABLE automation_actions IS 'Defines what actions to take when a workflow is triggered';

-- ============================================================================
-- SECTION 4: AUTOMATION EXECUTION LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES automation_workflows(id) ON DELETE SET NULL,
    trigger_id UUID REFERENCES automation_triggers(id) ON DELETE SET NULL,
    action_id UUID REFERENCES automation_actions(id) ON DELETE SET NULL,
    
    -- Execution Context
    execution_id UUID NOT NULL,
    
    -- What triggered this
    trigger_type VARCHAR(100),
    triggered_by_entity_type VARCHAR(100),
    triggered_by_entity_id UUID,
    
    -- Action executed
    action_type VARCHAR(100),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending', 'running', 'completed', 'failed', 'skipped'
    
    -- Details
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_workflow ON automation_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_logs_execution ON automation_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_logs_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_logs_created ON automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON automation_logs(triggered_by_entity_type, triggered_by_entity_id);

COMMENT ON TABLE automation_logs IS 'Execution history and debugging logs for automation workflows';

-- ============================================================================
-- SECTION 5: SCHEDULED AUTOMATION JOBS
-- ============================================================================

CREATE TABLE IF NOT EXISTS automation_scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
    trigger_id UUID NOT NULL REFERENCES automation_triggers(id) ON DELETE CASCADE,
    
    -- Scheduling
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_run_at TIMESTAMP WITH TIME ZONE,
    
    -- CRON expression for recurring jobs
    cron_expression VARCHAR(100),
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_next_run ON automation_scheduled_jobs(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_workflow ON automation_scheduled_jobs(workflow_id);

COMMENT ON TABLE automation_scheduled_jobs IS 'Tracks scheduled and recurring automation jobs';

-- ============================================================================
-- SECTION 6: EMAIL TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Content
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Variables available (for UI reference)
    available_variables JSONB DEFAULT '[]',
    -- Example: ["{{customer_name}}", "{{quote_amount}}", "{{company_name}}"]
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE email_templates IS 'Reusable email templates for automation';

-- ============================================================================
-- SECTION 7: SMS TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Content (160 char limit for SMS)
    message TEXT NOT NULL,
    
    -- Variables available
    available_variables JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    
    -- Metadata
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category) WHERE deleted_at IS NULL;

COMMENT ON TABLE sms_templates IS 'Reusable SMS templates for automation';

-- ============================================================================
-- SECTION 8: SEED DEFAULT EMAIL TEMPLATES
-- ============================================================================

INSERT INTO email_templates (name, description, category, subject, body_html, body_text, available_variables, is_system)
SELECT 'Quote Follow-up (3 Days)', 'Sent 3 days after quote with no response', 'quote_followup',
    'Following up on your tree service quote',
    '<p>Hi {{customer_name}},</p><p>I wanted to follow up on the quote we sent you for tree services at {{property_address}}.</p><p>The total for the proposed work is {{quote_amount}}.</p><p>If you have any questions or would like to proceed, please don''t hesitate to reach out.</p><p>Best regards,<br>{{company_name}}</p>',
    'Hi {{customer_name}}, I wanted to follow up on the quote we sent you for tree services at {{property_address}}. The total for the proposed work is {{quote_amount}}. If you have any questions or would like to proceed, please don''t hesitate to reach out. Best regards, {{company_name}}',
    '["{{customer_name}}", "{{property_address}}", "{{quote_amount}}", "{{company_name}}", "{{quote_link}}"]',
    true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'Quote Follow-up (3 Days)');

INSERT INTO email_templates (name, description, category, subject, body_html, body_text, available_variables, is_system)
SELECT 'Job Completed - Satisfaction Survey', 'Sent after job completion to collect feedback', 'satisfaction',
    'How did we do? Your feedback matters',
    '<p>Hi {{customer_name}},</p><p>Thank you for choosing {{company_name}} for your recent tree service!</p><p>We''d love to hear about your experience. Your feedback helps us improve and serve you better.</p><p><a href="{{survey_link}}">Click here to share your feedback</a></p><p>Thank you for your business!</p>',
    'Hi {{customer_name}}, Thank you for choosing {{company_name}} for your recent tree service! We''d love to hear about your experience. Please visit {{survey_link}} to share your feedback. Thank you for your business!',
    '["{{customer_name}}", "{{company_name}}", "{{survey_link}}", "{{job_description}}"]',
    true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'Job Completed - Satisfaction Survey');

INSERT INTO email_templates (name, description, category, subject, body_html, body_text, available_variables, is_system)
SELECT 'Invoice Overdue Reminder', 'Sent when invoice becomes overdue', 'invoice_reminder',
    'Payment Reminder: Invoice {{invoice_number}} is overdue',
    '<p>Hi {{customer_name}},</p><p>This is a friendly reminder that Invoice #{{invoice_number}} for {{invoice_amount}} was due on {{due_date}}.</p><p>Please arrange payment at your earliest convenience. You can pay online by clicking the link below:</p><p><a href="{{payment_link}}">Pay Invoice Now</a></p><p>If you''ve already made this payment, please disregard this message.</p><p>Thank you,<br>{{company_name}}</p>',
    'Hi {{customer_name}}, This is a friendly reminder that Invoice #{{invoice_number}} for {{invoice_amount}} was due on {{due_date}}. Please arrange payment at your earliest convenience. Pay online: {{payment_link}}. If you''ve already made this payment, please disregard this message. Thank you, {{company_name}}',
    '["{{customer_name}}", "{{invoice_number}}", "{{invoice_amount}}", "{{due_date}}", "{{payment_link}}", "{{company_name}}"]',
    true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'Invoice Overdue Reminder');

-- ============================================================================
-- SECTION 9: SEED DEFAULT SMS TEMPLATES  
-- ============================================================================

INSERT INTO sms_templates (name, description, category, message, available_variables, is_system)
SELECT 'Quote Sent Notification', 'Notify customer that quote was sent', 'quote',
    'Hi {{customer_name}}! Your tree service quote from {{company_name}} is ready. View it here: {{quote_link}}',
    '["{{customer_name}}", "{{company_name}}", "{{quote_link}}"]',
    true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE name = 'Quote Sent Notification');

INSERT INTO sms_templates (name, description, category, message, available_variables, is_system)
SELECT 'Job Reminder', 'Remind customer about upcoming job', 'job',
    'Reminder: {{company_name}} is scheduled to arrive {{job_date}} for your tree service. Questions? Call {{company_phone}}',
    '["{{company_name}}", "{{job_date}}", "{{company_phone}}"]',
    true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE name = 'Job Reminder');

INSERT INTO sms_templates (name, description, category, message, available_variables, is_system)
SELECT 'Crew On The Way', 'Notify customer crew is en route', 'job',
    'Great news! Our crew is on the way to {{property_address}}. ETA: {{eta}}. See you soon! - {{company_name}}',
    '["{{property_address}}", "{{eta}}", "{{company_name}}"]',
    true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE name = 'Crew On The Way');

INSERT INTO sms_templates (name, description, category, message, available_variables, is_system)
SELECT 'Payment Reminder', 'Remind about overdue payment', 'invoice',
    'Hi {{customer_name}}, your invoice #{{invoice_number}} for {{invoice_amount}} is overdue. Pay now: {{payment_link}}',
    '["{{customer_name}}", "{{invoice_number}}", "{{invoice_amount}}", "{{payment_link}}"]',
    true
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE name = 'Payment Reminder');

-- ============================================================================
-- SECTION 10: SEED DEFAULT WORKFLOW TEMPLATES
-- ============================================================================

-- Template 1: Quote Follow-up Sequence
INSERT INTO automation_workflows (id, name, description, is_active, is_template, template_category)
SELECT 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 
    'Quote Follow-up Sequence',
    'Automatically follow up on quotes that haven''t received a response after 3, 5, and 7 days',
    false, true, 'sales'
WHERE NOT EXISTS (SELECT 1 FROM automation_workflows WHERE name = 'Quote Follow-up Sequence' AND is_template = true);

-- Template 2: Job Completion Workflow  
INSERT INTO automation_workflows (id, name, description, is_active, is_template, template_category)
SELECT 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    'Job Completion Workflow',
    'When a job is marked complete: send satisfaction survey, create invoice, update client category',
    false, true, 'operations'
WHERE NOT EXISTS (SELECT 1 FROM automation_workflows WHERE name = 'Job Completion Workflow' AND is_template = true);

-- Template 3: Invoice Overdue Reminders
INSERT INTO automation_workflows (id, name, description, is_active, is_template, template_category)
SELECT 'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
    'Invoice Overdue Reminders',
    'Send reminders when invoices become overdue at 7, 14, and 30 days',
    false, true, 'billing'
WHERE NOT EXISTS (SELECT 1 FROM automation_workflows WHERE name = 'Invoice Overdue Reminders' AND is_template = true);

-- Template 4: New Lead Welcome Sequence
INSERT INTO automation_workflows (id, name, description, is_active, is_template, template_category)
SELECT 'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
    'New Lead Welcome Sequence',
    'When a new lead is created: send welcome email, create follow-up task, assign to sales',
    false, true, 'sales'
WHERE NOT EXISTS (SELECT 1 FROM automation_workflows WHERE name = 'New Lead Welcome Sequence' AND is_template = true);

-- Template 5: Crew Clock Irregularity Alert
INSERT INTO automation_workflows (id, name, description, is_active, is_template, template_category)
SELECT 'e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b',
    'Crew Clock Irregularity Alert',
    'Alert managers when crew clock-in/out times are irregular (early/late by threshold)',
    false, true, 'operations'
WHERE NOT EXISTS (SELECT 1 FROM automation_workflows WHERE name = 'Crew Clock Irregularity Alert' AND is_template = true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
