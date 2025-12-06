-- ============================================================================
-- TreePro AI - Consolidated Database Schema
-- ============================================================================
-- This file contains ALL table definitions needed for production deployment.
-- It consolidates schema from multiple migration files into a single,
-- conflict-free initialization script suitable for fresh database setup.
--
-- Last Updated: 2024-11-20
-- Tables: 37+ tables (complete production schema)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: AUTHENTICATION & SESSION MANAGEMENT
-- ============================================================================

-- Sessions table for optional session-based auth
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Users table for token-authenticated user profile storage
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 2: CRM CORE - CLIENT HIERARCHY
-- ============================================================================

-- Clients Table (Replaces legacy customers table)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    title VARCHAR(10),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(200),
    
    -- Primary Contact
    primary_email VARCHAR(255),
    primary_phone VARCHAR(50),
    
    -- Business Classification
    client_type VARCHAR(50) DEFAULT 'residential',
    industry VARCHAR(100),
    client_category VARCHAR(50) DEFAULT 'potential_client',
    
    -- Status & Lifecycle
    status VARCHAR(50) DEFAULT 'active',
    lead_source VARCHAR(100),
    
    -- Financial Settings
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    credit_limit NUMERIC(12,2),
    tax_exempt BOOLEAN DEFAULT false,
    
    -- Primary Billing Address
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(100),
    billing_city VARCHAR(100),
    billing_state VARCHAR(50),
    billing_zip_code VARCHAR(20),
    billing_country VARCHAR(100) DEFAULT 'USA',
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(255),
    
    -- Metadata
    notes TEXT,
    internal_notes TEXT,
    referral_source VARCHAR(255),
    preferred_contact_method VARCHAR(50),
    lifetime_value NUMERIC(12,2) DEFAULT 0,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for clients
CREATE UNIQUE INDEX IF NOT EXISTS unique_client_email ON clients(primary_email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING gin(to_tsvector('english', 
    coalesce(first_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || 
    coalesce(company_name, '') || ' ' || 
    coalesce(primary_email, '')
));

COMMENT ON TABLE clients IS 'Central client/customer repository with CRM capabilities';
COMMENT ON COLUMN clients.deleted_at IS 'Soft delete timestamp - NULL means active';

-- Properties Table (Service locations)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Property Identification
    property_name VARCHAR(255),
    
    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    
    -- Geolocation
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    -- Property Details
    property_type VARCHAR(50) DEFAULT 'residential',
    square_footage INTEGER,
    lot_size NUMERIC(10,2),
    
    -- Access Information
    is_primary BOOLEAN DEFAULT FALSE,
    gate_code VARCHAR(50),
    access_instructions TEXT,
    parking_instructions TEXT,
    
    -- Service-Specific
    trees_on_property INTEGER,
    property_features JSONB DEFAULT '[]',
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for properties
CREATE UNIQUE INDEX IF NOT EXISTS one_primary_property_per_client ON properties(client_id, is_primary) WHERE is_primary = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_client ON properties(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(lat, lon);
CREATE INDEX IF NOT EXISTS idx_properties_deleted ON properties(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE properties IS 'Service locations/sites associated with clients';

-- Contacts Table (People at client/property)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Personal Info
    title VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(100),
    job_title VARCHAR(100),
    
    -- Role & Permissions
    contact_type VARCHAR(50) DEFAULT 'general',
    is_primary BOOLEAN DEFAULT FALSE,
    preferred_contact_method VARCHAR(50) DEFAULT 'email',
    can_approve_quotes BOOLEAN DEFAULT FALSE,
    can_sign_invoices BOOLEAN DEFAULT FALSE,
    can_receive_invoices BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_property ON contacts(property_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);

COMMENT ON TABLE contacts IS 'Additional people associated with clients or properties';

-- Contact Channels Table (Multiple contact methods)
CREATE TABLE IF NOT EXISTS contact_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Channel Details
    channel_type VARCHAR(50) NOT NULL,
    channel_value VARCHAR(255) NOT NULL,
    label VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Validation & Status
    is_verified BOOLEAN DEFAULT FALSE,
    bounced BOOLEAN DEFAULT FALSE,
    do_not_contact BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for contact_channels
CREATE INDEX IF NOT EXISTS idx_contact_channels_contact ON contact_channels(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_channels_value ON contact_channels(channel_value);
CREATE INDEX IF NOT EXISTS idx_contact_channels_type ON contact_channels(channel_type);

COMMENT ON TABLE contact_channels IS 'Multiple communication methods per contact';

-- ============================================================================
-- SECTION 3: TAGGING & CUSTOM FIELDS SYSTEM
-- ============================================================================

-- Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#00c2ff',
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- Entity Tags (Many-to-many for clients, leads, quotes, jobs)
CREATE TABLE IF NOT EXISTS entity_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    tagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tagged_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_entity_tag UNIQUE(entity_type, entity_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON entity_tags(tag_id);

-- Custom Field Definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    options JSONB,
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    display_order INTEGER DEFAULT 0,
    validation_rules JSONB,
    help_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_field_per_entity UNIQUE(entity_type, field_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_entity ON custom_field_definitions(entity_type, is_active);
CREATE INDEX IF NOT EXISTS idx_custom_fields_order ON custom_field_definitions(entity_type, display_order);

-- Custom Field Values
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_value_per_entity UNIQUE(field_definition_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_values_field ON custom_field_values(field_definition_id);

-- ============================================================================
-- SECTION 4: LEGACY CUSTOMERS TABLE
-- ============================================================================
-- DEPRECATED: This table is kept for backward compatibility only.
-- DO NOT USE in new code - use the 'clients' table instead.
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'LEGACY - Use clients table for new code. Kept for backward compatibility only.';

-- ============================================================================
-- SECTION 5: LEADS MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    client_id_new UUID REFERENCES clients(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'New',
    description TEXT,
    lead_score INTEGER DEFAULT 0,
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to VARCHAR(100),
    estimated_value NUMERIC(12,2),
    expected_close_date DATE,
    last_contact_date DATE,
    next_followup_date DATE,
    customer_uploads JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id_new ON leads(client_id_new) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_status_created_at ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_created_at ON leads(assigned_to, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deleted ON leads(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 6: QUOTES & QUOTE TEMPLATES
-- ============================================================================

-- Quote Templates Table
CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    line_items JSONB NOT NULL DEFAULT '[]',
    terms_and_conditions TEXT,
    valid_days INTEGER DEFAULT 30,
    deposit_percentage NUMERIC(5,2) DEFAULT 0,
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    service_category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_category ON quote_templates(service_category, is_active);
CREATE INDEX IF NOT EXISTS idx_quote_templates_active ON quote_templates(is_active);

COMMENT ON TABLE quote_templates IS 'Reusable quote templates for common service packages';

-- Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Legacy field (for backward compatibility)
    customer_name TEXT NOT NULL,
    
    -- Quote Details
    quote_number VARCHAR(50),
    version INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Draft',
    approval_status VARCHAR(50) DEFAULT 'pending',
    
    -- Pricing
    line_items JSONB NOT NULL DEFAULT '[]',
    stump_grinding_price NUMERIC DEFAULT 0,
    total_amount NUMERIC(12,2),
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2),
    
    -- Terms & Conditions
    payment_terms TEXT DEFAULT 'Net 30',
    deposit_amount NUMERIC DEFAULT 0,
    valid_until TEXT,
    terms_and_conditions TEXT,
    
    -- Approval & Signature
    signature TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional Info
    job_location TEXT,
    special_instructions TEXT,
    internal_notes TEXT,
    messages JSONB DEFAULT '[]',
    customer_uploads JSONB DEFAULT '[]',
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Add unique constraint for quote_number
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_quote_number'
    ) THEN
        ALTER TABLE quotes ADD CONSTRAINT unique_quote_number UNIQUE (quote_number);
    END IF;
END $$;

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_property ON quotes(property_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_approval ON quotes(approval_status);
CREATE INDEX IF NOT EXISTS idx_quotes_version ON quotes(version);
CREATE INDEX IF NOT EXISTS idx_quotes_deleted ON quotes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number) WHERE deleted_at IS NULL;

COMMENT ON COLUMN quotes.client_id IS 'Links quote to client (preferred over customer_name)';
COMMENT ON COLUMN quotes.approval_status IS 'Internal approval: pending, approved, rejected';

-- Quote Versions Table
CREATE TABLE IF NOT EXISTS quote_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    line_items JSONB NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    terms TEXT,
    notes TEXT,
    changed_by VARCHAR(100),
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_quote_version UNIQUE(quote_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quote_versions_quote ON quote_versions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_versions_created ON quote_versions(created_at DESC);

COMMENT ON TABLE quote_versions IS 'Complete version history for quotes';

-- Quote Followups Table
CREATE TABLE IF NOT EXISTS quote_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    followup_type VARCHAR(50) NOT NULL,
    scheduled_date DATE NOT NULL,
    subject VARCHAR(200),
    message TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(100),
    client_response TEXT,
    outcome VARCHAR(50),
    is_automated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_followups_quote ON quote_followups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_followups_scheduled ON quote_followups(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_quote_followups_status ON quote_followups(status) WHERE status = 'scheduled';

COMMENT ON TABLE quote_followups IS 'Scheduled follow-up tasks for quotes';

-- ============================================================================
-- SECTION 7: JOB TEMPLATES
-- ============================================================================

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

-- Indexes for job_templates
CREATE INDEX IF NOT EXISTS idx_job_templates_category ON job_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_templates_usage ON job_templates(usage_count DESC, last_used_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_templates_created_at ON job_templates(created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE job_templates IS 'Reusable job configuration templates';

-- ============================================================================
-- SECTION 8: JOBS & JOB STATE MACHINE
-- ============================================================================

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Legacy field (for backward compatibility)
    customer_name TEXT NOT NULL,
    
    -- Job Identification
    job_number VARCHAR(50),
    
    -- State Machine
    status TEXT NOT NULL DEFAULT 'draft',
    last_state_change_at TIMESTAMPTZ,
    
    -- Scheduling
    scheduled_date TEXT,
    assigned_crew JSONB DEFAULT '[]',
    required_crew_size INTEGER,
    job_template_id VARCHAR(36) REFERENCES job_templates(id) ON DELETE SET NULL,

    -- Pricing
    stump_grinding_price NUMERIC DEFAULT 0,
    
    -- Work Tracking
    work_started_at TIMESTAMP WITH TIME ZONE,
    work_ended_at TIMESTAMP WITH TIME ZONE,
    work_start_time TIMESTAMPTZ,
    work_end_time TIMESTAMPTZ,
    
    -- Location Tracking
    clock_in_lat DOUBLE PRECISION,
    clock_in_lon DOUBLE PRECISION,
    clock_out_lat DOUBLE PRECISION,
    clock_out_lon DOUBLE PRECISION,
    
    -- Safety & Hazards
    jha JSONB,
    jha_acknowledged_at TIMESTAMP WITH TIME ZONE,
    jha_acknowledged_by UUID,
    jha_required BOOLEAN DEFAULT false,
    risk_level TEXT DEFAULT 'Low',
    
    -- Hold Management
    active_hold_until TIMESTAMPTZ,
    weather_hold_reason TEXT,
    
    -- Permit Management
    permit_required BOOLEAN DEFAULT false,
    permit_status VARCHAR(50),
    permit_details JSONB,
    
    -- Deposit Management
    deposit_required BOOLEAN DEFAULT false,
    deposit_status VARCHAR(50),
    deposit_amount DECIMAL(10,2),
    
    -- Completion
    completion_checklist JSONB,
    photos JSONB DEFAULT '[]',
    costs JSONB,
    
    -- Invoice Linkage
    invoice_id UUID,
    payment_received_at TIMESTAMPTZ,
    
    -- Additional Info
    messages JSONB DEFAULT '[]',
    job_location TEXT,
    special_instructions TEXT,
    equipment_needed JSONB DEFAULT '[]',
    estimated_hours NUMERIC DEFAULT 0,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint for valid job states
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_job_status'
    ) THEN
        ALTER TABLE jobs DROP CONSTRAINT valid_job_status;
    END IF;
END $$;

ALTER TABLE jobs ADD CONSTRAINT valid_job_status CHECK (
    status IN (
        'draft', 'needs_permit', 'waiting_on_client', 'scheduled',
        'weather_hold', 'in_progress', 'completed', 'invoiced',
        'paid', 'cancelled'
    )
);

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON jobs(quote_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_property_id ON jobs(property_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_last_state_change ON jobs(last_state_change_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_permit_status ON jobs(permit_status) WHERE permit_required = true;
CREATE INDEX IF NOT EXISTS idx_jobs_deposit_status ON jobs(deposit_status) WHERE deposit_required = true;
CREATE INDEX IF NOT EXISTS idx_jobs_invoice_id ON jobs(invoice_id);

COMMENT ON COLUMN jobs.status IS 'Current job state - follows state machine transitions';

-- Job State Transitions Table
CREATE TABLE IF NOT EXISTS job_state_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    from_state VARCHAR(50),
    to_state VARCHAR(50) NOT NULL,
    changed_by UUID,
    changed_by_role VARCHAR(50),
    change_source VARCHAR(20) NOT NULL DEFAULT 'manual',
    reason TEXT,
    notes JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for job_state_transitions
CREATE INDEX IF NOT EXISTS idx_job_state_transitions_job_id ON job_state_transitions(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_state_transitions_to_state ON job_state_transitions(to_state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_state_transitions_created ON job_state_transitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_state_transitions_changed_by ON job_state_transitions(changed_by);

COMMENT ON TABLE job_state_transitions IS 'Audit trail for all job state changes';

-- ============================================================================
-- SECTION 9: CREW MANAGEMENT
-- ============================================================================

-- Employees Table (needed by crew_members)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    ssn TEXT,
    dob TEXT,
    job_title TEXT,
    pay_rate NUMERIC,
    hire_date TEXT,
    certifications TEXT,
    performance_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crews Table
CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    default_start_time TIME,
    default_end_time TIME,
    capacity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_crews_active ON crews(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crews_deleted ON crews(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE crews IS 'Working crews/teams for organizing employees';

-- Crew Members Table
CREATE TABLE IF NOT EXISTS crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(50),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_crew_member ON crew_members(crew_id, employee_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON crew_members(crew_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crew_members_employee ON crew_members(employee_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crew_members_role ON crew_members(role) WHERE left_at IS NULL;

COMMENT ON TABLE crew_members IS 'Employee membership in crews with roles';

-- Crew Assignments Table
CREATE TABLE IF NOT EXISTS crew_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE RESTRICT,
    assigned_date DATE NOT NULL,
    assigned_by VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_assignments_job ON crew_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_crew ON crew_assignments(crew_id, assigned_date DESC);
CREATE INDEX IF NOT EXISTS idx_crew_assignments_date ON crew_assignments(assigned_date DESC);

COMMENT ON TABLE crew_assignments IS 'Assignment of crews to jobs on specific dates';

-- ============================================================================
-- SECTION 10: TIME TRACKING & TIMESHEETS
-- ============================================================================

-- Pay Periods Table
CREATE TABLE IF NOT EXISTS pay_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'bi-weekly',
    status TEXT NOT NULL DEFAULT 'Open',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_periods_status ON pay_periods(status);

-- Time Entries Table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    
    -- Time Tracking
    date DATE NOT NULL,
    hours_worked NUMERIC NOT NULL DEFAULT 0,
    overtime_hours NUMERIC DEFAULT 0,
    hourly_rate NUMERIC NOT NULL,
    
    -- Clock In/Out
    clock_in_time TIMESTAMP WITH TIME ZONE,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    
    -- GPS Location
    clock_in_lat DOUBLE PRECISION,
    clock_in_lon DOUBLE PRECISION,
    clock_out_lat DOUBLE PRECISION,
    clock_out_lon DOUBLE PRECISION,
    
    -- Break Management
    break_duration_minutes INTEGER DEFAULT 0,
    
    -- Approval Workflow
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Indexes for time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status ON time_entries(approval_status);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by ON time_entries(approved_by);

COMMENT ON COLUMN time_entries.approval_status IS 'Approval status: pending, approved, rejected';

-- Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    total_hours NUMERIC(10,2) DEFAULT 0,
    total_overtime_hours NUMERIC(10,2) DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE UNIQUE INDEX IF NOT EXISTS unique_timesheet_period ON timesheets(employee_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets(employee_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_period ON timesheets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_timesheets_reviewed_by ON timesheets(reviewed_by);

COMMENT ON TABLE timesheets IS 'Weekly/bi-weekly timesheet batches for approval';

-- Payroll Records Table
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    pay_period_id UUID REFERENCES pay_periods(id) ON DELETE CASCADE,
    regular_hours NUMERIC NOT NULL DEFAULT 0,
    overtime_hours NUMERIC DEFAULT 0,
    hourly_rate NUMERIC NOT NULL,
    regular_pay NUMERIC NOT NULL DEFAULT 0,
    overtime_pay NUMERIC DEFAULT 0,
    bonuses NUMERIC DEFAULT 0,
    deductions JSONB DEFAULT '[]',
    total_deductions NUMERIC DEFAULT 0,
    gross_pay NUMERIC NOT NULL DEFAULT 0,
    net_pay NUMERIC NOT NULL DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT DEFAULT 'Check',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_pay_period_id ON payroll_records(pay_period_id);

-- ============================================================================
-- SECTION 11: FORMS SYSTEM
-- ============================================================================

-- Form Templates Table
CREATE TABLE IF NOT EXISTS form_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    form_type VARCHAR(50),
    fields JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    require_signature BOOLEAN DEFAULT false,
    require_photos BOOLEAN DEFAULT false,
    min_photos INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_templates_active ON form_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_form_templates_deleted ON form_templates(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE form_templates IS 'Reusable form templates for safety checklists, completion forms';

-- Form Submissions Table
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    submitted_by UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    submission_data JSONB NOT NULL DEFAULT '{}',
    signature_data TEXT,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON form_submissions(form_template_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_job ON form_submissions(job_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_employee ON form_submissions(submitted_by, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_date ON form_submissions(submitted_at DESC);

COMMENT ON TABLE form_submissions IS 'Completed form submissions from field crews';

-- Form Photos Table
CREATE TABLE IF NOT EXISTS form_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_photos_submission ON form_photos(form_submission_id, uploaded_at DESC);

COMMENT ON TABLE form_photos IS 'Photos attached to form submissions';

-- Job Forms Table
CREATE TABLE IF NOT EXISTS job_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
    form_data JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint for valid job form statuses
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

CREATE INDEX IF NOT EXISTS idx_job_forms_job ON job_forms(job_id);
CREATE INDEX IF NOT EXISTS idx_job_forms_template ON job_forms(form_template_id);
CREATE INDEX IF NOT EXISTS idx_job_forms_status ON job_forms(status);

COMMENT ON TABLE job_forms IS 'Job-specific form instances attached from templates';

-- ============================================================================
-- SECTION 12: RECURRING JOBS
-- ============================================================================

-- Job Series Table
CREATE TABLE IF NOT EXISTS job_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    series_name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100),
    recurrence_pattern VARCHAR(50) NOT NULL,
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_day_of_week INTEGER,
    recurrence_day_of_month INTEGER,
    recurrence_month INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    job_template_id VARCHAR(36) REFERENCES job_templates(id) ON DELETE SET NULL,
    default_crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
    estimated_duration_hours NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_job_series_client ON job_series(client_id);
CREATE INDEX IF NOT EXISTS idx_job_series_property ON job_series(property_id);
CREATE INDEX IF NOT EXISTS idx_job_series_active ON job_series(is_active);
CREATE INDEX IF NOT EXISTS idx_job_series_dates ON job_series(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_job_series_pattern ON job_series(recurrence_pattern);

COMMENT ON TABLE job_series IS 'Recurring job series with schedule patterns';

-- Recurring Job Instances Table
CREATE TABLE IF NOT EXISTS recurring_job_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_series_id UUID NOT NULL REFERENCES job_series(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE UNIQUE INDEX IF NOT EXISTS unique_series_instance ON recurring_job_instances(job_series_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_series ON recurring_job_instances(job_series_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_job ON recurring_job_instances(job_id);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_date ON recurring_job_instances(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_status ON recurring_job_instances(status);

COMMENT ON TABLE recurring_job_instances IS 'Generated instances of recurring jobs';

-- ============================================================================
-- SECTION 13: INVOICES & PAYMENTS
-- ============================================================================

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Legacy field (for backward compatibility)
    customer_name TEXT NOT NULL,
    
    -- Invoice Details
    invoice_number VARCHAR(50),
    status TEXT NOT NULL DEFAULT 'Draft',
    
    -- Dates
    issue_date DATE DEFAULT NOW(),
    due_date TEXT NOT NULL,
    sent_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Pricing
    line_items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    amount NUMERIC NOT NULL,
    total_amount NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2) DEFAULT 0,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    amount_due NUMERIC(12,2) DEFAULT 0,
    
    -- Terms & Notes
    payment_terms TEXT DEFAULT 'Net 30',
    notes TEXT,
    customer_notes TEXT,
    
    -- Customer Info (snapshot)
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index to quickly find invoices generated from quotes
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);

-- Add constraints for invoice_number
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoices_invoice_number_key' AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_number' AND is_nullable = 'YES'
    ) THEN
        WITH numbered AS (
            SELECT id, 
                   'INV-' || EXTRACT(YEAR FROM created_at) || '-' || 
                   LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at)::text, 4, '0') as new_invoice_number
            FROM invoices
            WHERE invoice_number IS NULL
        )
        UPDATE invoices i
        SET invoice_number = n.new_invoice_number
        FROM numbered n
        WHERE i.id = n.id;
        
        ALTER TABLE invoices ALTER COLUMN invoice_number SET NOT NULL;
    END IF;
END $$;

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Payment Records Table
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT NOW(),
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    transaction_id TEXT,
    reference_number TEXT,
    notes TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_invoice_id ON payment_records(invoice_id);

-- ============================================================================
-- SECTION 14: EQUIPMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    make TEXT,
    model TEXT,
    purchase_date TEXT,
    last_service_date TEXT,
    status TEXT NOT NULL DEFAULT 'Operational',
    assigned_to TEXT,
    maintenance_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 15: ESTIMATE FEEDBACK (AI LEARNING)
-- ============================================================================

CREATE TABLE IF NOT EXISTS estimate_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    ai_estimate_data JSONB NOT NULL,
    ai_suggested_price_min NUMERIC NOT NULL,
    ai_suggested_price_max NUMERIC NOT NULL,
    actual_price_quoted NUMERIC,
    feedback_rating TEXT NOT NULL,
    correction_reasons JSONB DEFAULT '[]',
    user_notes TEXT,
    tree_species TEXT,
    tree_height NUMERIC,
    trunk_diameter NUMERIC,
    hazards JSONB DEFAULT '[]',
    job_location TEXT,
    customer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_feedback_quote_id ON estimate_feedback(quote_id);
CREATE INDEX IF NOT EXISTS idx_estimate_feedback_rating ON estimate_feedback(feedback_rating);
CREATE INDEX IF NOT EXISTS idx_estimate_feedback_created_at ON estimate_feedback(created_at);

-- ============================================================================
-- SECTION 16: COMPANY PROFILE
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    phone_number TEXT,
    tax_ein TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    logo_url TEXT,
    tagline TEXT,
    business_hours TEXT,
    license_number TEXT,
    insurance_policy_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default company profile only if table is empty
INSERT INTO company_profile (company_name, tagline, business_hours)
SELECT 'TreePro AI', 'Professional Tree Services', 'Mon-Fri: 8AM-5PM, Sat: 9AM-2PM'
WHERE NOT EXISTS (SELECT 1 FROM company_profile LIMIT 1);

-- ============================================================================
-- CONSOLIDATED SCHEMA COMPLETE
-- ============================================================================
-- Total Tables: 37+
-- Ready for production deployment
-- ============================================================================
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
-- SECTION 11: OBSERVABILITY & TELEMETRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry_events (
    id UUID PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('error', 'metric', 'event')),
    name TEXT NOT NULL,
    message TEXT,
    stack TEXT,
    value NUMERIC,
    unit TEXT,
    tags TEXT[],
    data JSONB,
    context TEXT,
    severity TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_at ON telemetry_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_type ON telemetry_events (type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_severity ON telemetry_events (severity);

-- ============================================================================
-- SECTION 12: DOCUMENT SCANNING
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'records_created')),
    
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INTEGER,
    
    raw_text TEXT,
    parsed_data JSONB,
    confidence_scores JSONB,
    warnings TEXT[],
    errors TEXT[],
    
    created_client_id UUID REFERENCES clients(id),
    created_property_id UUID REFERENCES properties(id),
    created_job_id UUID REFERENCES jobs(id),
    created_quote_id UUID,
    created_invoice_id UUID REFERENCES invoices(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_document_scans_status ON document_scans(status);
CREATE INDEX IF NOT EXISTS idx_document_scans_created_at ON document_scans(created_at DESC);

COMMENT ON TABLE document_scans IS 'Stores scanned document data and extraction results for converting handwritten proposals to digital records';

-- ============================================================================
-- SECTION 13: EQUIPMENT USAGE & MAINTENANCE TRACKING (Phase 4)
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL,
  scheduled_date DATE,
  actual_date DATE,
  performed_by UUID REFERENCES employees(id),
  cost DECIMAL(10,2),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  next_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_due ON equipment_maintenance(equipment_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_job ON equipment_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_equipment ON equipment_usage(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_used_by ON equipment_usage(used_by);

COMMENT ON TABLE equipment_usage IS 'Tracks when equipment is used, by whom, and for which jobs';
COMMENT ON TABLE equipment_maintenance IS 'Tracks scheduled and completed maintenance for equipment';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
