-- ============================================================================
-- TreePro AI - Phase 1 CRM Enhancement Migration
-- Migration: 001_phase1_crm_tables.sql
-- Description: Comprehensive CRM foundation with client hierarchy, 
--              enhanced quotes, custom fields, and tagging system
-- Created: 2024-11-09
-- ============================================================================
-- 
-- This migration transforms TreePro AI from a basic customer management system
-- into a professional CRM that supports:
--   - Complex client hierarchies (Client → Properties → Contacts)
--   - Advanced quote workflows with versioning and approval processes
--   - Flexible tagging and custom field system
--   - Automated follow-up tracking
-- 
-- IDEMPOTENCY: Safe to run multiple times using IF NOT EXISTS checks
-- ============================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: NEW TABLES - CRM CORE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: clients
-- Purpose: Central client/customer management with comprehensive profile data
-- Replaces/extends: customers table (maintains backward compatibility)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    title VARCHAR(10),  -- Mr, Ms, Mrs, Dr
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(200),
    
    -- Primary Contact
    primary_email VARCHAR(255),
    primary_phone VARCHAR(50),
    
    -- Business Classification
    client_type VARCHAR(50) DEFAULT 'residential',  -- residential, commercial, property_manager
    industry VARCHAR(100),
    
    -- Status & Lifecycle
    status VARCHAR(50) DEFAULT 'active',  -- active, inactive, archived
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
    billing_zip VARCHAR(20),
    billing_country VARCHAR(50) DEFAULT 'USA',
    
    -- Metadata
    notes TEXT,
    internal_notes TEXT,  -- Not visible to client
    referral_source VARCHAR(200),
    lifetime_value NUMERIC(12,2) DEFAULT 0,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    deleted_at TIMESTAMP WITH TIME ZONE  -- Soft delete support
);

-- Unique partial index for email (ensures uniqueness only for non-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS unique_client_email ON clients(primary_email) WHERE deleted_at IS NULL;

-- Indexes for clients table
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search index on clients (name, company, email)
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING gin(to_tsvector('english', 
    coalesce(first_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || 
    coalesce(company_name, '') || ' ' || 
    coalesce(primary_email, '')
));

COMMENT ON TABLE clients IS 'Central client/customer repository with CRM capabilities';
COMMENT ON COLUMN clients.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN clients.lifetime_value IS 'Total revenue generated from this client';

-- ----------------------------------------------------------------------------
-- Table: properties
-- Purpose: Service locations associated with clients (one client = many properties)
-- Use case: Property managers with multiple sites, commercial clients with branches
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Property Identification
    property_name VARCHAR(200),  -- e.g., "Main Office", "North Branch", "Rental Unit A"
    
    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'USA',
    
    -- Geolocation for mapping and routing
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    -- Property Details
    property_type VARCHAR(50),  -- residential, commercial, industrial, municipal
    square_footage INTEGER,
    lot_size NUMERIC(10,2),
    
    -- Access Information (crew instructions)
    gate_code VARCHAR(50),
    access_instructions TEXT,
    parking_instructions TEXT,
    
    -- Service-Specific Details
    trees_on_property INTEGER,
    property_features JSONB DEFAULT '[]',  -- ["pool", "power_lines", "fence", "structures"]
    
    -- Status
    is_primary BOOLEAN DEFAULT false,  -- Primary service location for client
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Unique partial index: Only one primary property per client (non-deleted records only)
CREATE UNIQUE INDEX IF NOT EXISTS one_primary_property_per_client ON properties(client_id, is_primary) WHERE is_primary = true AND deleted_at IS NULL;

-- Indexes for properties table
CREATE INDEX IF NOT EXISTS idx_properties_client ON properties(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(lat, lon);
CREATE INDEX IF NOT EXISTS idx_properties_deleted ON properties(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE properties IS 'Service locations/sites associated with clients';
COMMENT ON COLUMN properties.is_primary IS 'Primary service location - used as default for quotes/jobs';

-- ----------------------------------------------------------------------------
-- Table: contacts
-- Purpose: Additional people associated with client or specific property
-- Use case: Office managers, site supervisors, billing contacts, property tenants
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,  -- Optional: property-specific contact
    
    -- Personal Info
    title VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    job_title VARCHAR(100),
    
    -- Role & Permissions
    contact_type VARCHAR(50) DEFAULT 'general',  -- general, billing, site_manager, tenant, owner
    is_primary BOOLEAN DEFAULT false,
    
    -- Communication Preferences
    preferred_contact_method VARCHAR(50) DEFAULT 'email',  -- email, phone, sms
    can_approve_quotes BOOLEAN DEFAULT false,
    can_receive_invoices BOOLEAN DEFAULT false,
    
    -- Notes
    notes TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for contacts table
CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_property ON contacts(property_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);

COMMENT ON TABLE contacts IS 'Additional people associated with clients or properties';
COMMENT ON COLUMN contacts.can_approve_quotes IS 'Whether this contact has authority to approve quotes';

-- ----------------------------------------------------------------------------
-- Table: contact_channels
-- Purpose: Multiple communication channels (emails, phones) per contact
-- Use case: Work email + personal email, office phone + mobile + fax
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Channel Details
    channel_type VARCHAR(50) NOT NULL,  -- email, phone, mobile, fax, whatsapp
    channel_value VARCHAR(255) NOT NULL,
    label VARCHAR(100),  -- e.g., "Work", "Home", "Mobile", "After Hours"
    is_primary BOOLEAN DEFAULT false,
    
    -- Validation & Status
    is_verified BOOLEAN DEFAULT false,
    bounced BOOLEAN DEFAULT false,  -- For email bounce tracking
    do_not_contact BOOLEAN DEFAULT false,  -- Opt-out flag
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for contact_channels table
CREATE INDEX IF NOT EXISTS idx_contact_channels_contact ON contact_channels(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_channels_value ON contact_channels(channel_value);
CREATE INDEX IF NOT EXISTS idx_contact_channels_type ON contact_channels(channel_type);

COMMENT ON TABLE contact_channels IS 'Multiple communication methods per contact (emails, phones, etc.)';
COMMENT ON COLUMN contact_channels.bounced IS 'Email bounce tracking for email channels';

-- ============================================================================
-- SECTION 2: TAGGING & CUSTOM FIELDS SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: tags
-- Purpose: Flexible categorization system for clients, jobs, quotes, etc.
-- Use case: "VIP Client", "High Value", "Emergency Service", "Seasonal"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#00c2ff',  -- Hex color for UI display
    description TEXT,
    category VARCHAR(50),  -- client, job, quote, custom
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tags table
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

COMMENT ON TABLE tags IS 'Reusable tags for categorizing clients, jobs, quotes, and other entities';
COMMENT ON COLUMN tags.color IS 'Hex color code for visual distinction in UI';

-- ----------------------------------------------------------------------------
-- Table: entity_tags
-- Purpose: Polymorphic many-to-many relationship between tags and any entity
-- Pattern: Allows tagging clients, properties, quotes, jobs, leads, etc.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,  -- 'client', 'property', 'quote', 'job', 'lead'
    entity_id UUID NOT NULL,  -- UUID of the tagged entity
    
    -- Audit
    tagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tagged_by VARCHAR(100),
    
    -- Prevent duplicate tags on same entity
    CONSTRAINT unique_entity_tag UNIQUE (tag_id, entity_type, entity_id)
);

-- Indexes for entity_tags table
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON entity_tags(tag_id);

COMMENT ON TABLE entity_tags IS 'Polymorphic tagging - associates tags with any entity type';
COMMENT ON COLUMN entity_tags.entity_type IS 'Type of entity being tagged (client, job, quote, etc.)';

-- ----------------------------------------------------------------------------
-- Table: custom_field_definitions
-- Purpose: Define custom fields for different entity types
-- Use case: Custom client fields, job-specific data, quote metadata
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Field Configuration
    entity_type VARCHAR(50) NOT NULL,  -- client, property, quote, job, lead
    field_name VARCHAR(100) NOT NULL,  -- Internal identifier (e.g., "preferred_contact_time")
    field_label VARCHAR(200) NOT NULL,  -- Display name (e.g., "Preferred Contact Time")
    field_type VARCHAR(50) NOT NULL,  -- text, number, date, dropdown, checkbox, textarea
    
    -- Validation & Options
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    options JSONB,  -- For dropdown: ["Option 1", "Option 2", "Option 3"]
    validation_rules JSONB,  -- {"min": 0, "max": 100, "pattern": "^[A-Z]"}
    
    -- Display Configuration
    display_order INTEGER DEFAULT 0,
    help_text TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate field names per entity type
    CONSTRAINT unique_field_per_entity UNIQUE (entity_type, field_name)
);

-- Indexes for custom_field_definitions table
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity ON custom_field_definitions(entity_type, is_active);
CREATE INDEX IF NOT EXISTS idx_custom_fields_order ON custom_field_definitions(entity_type, display_order);

COMMENT ON TABLE custom_field_definitions IS 'Schema for custom fields - defines field types and validation';
COMMENT ON COLUMN custom_field_definitions.options IS 'JSON array of options for dropdown fields';

-- ----------------------------------------------------------------------------
-- Table: custom_field_values
-- Purpose: Store actual custom field data for entities
-- Pattern: EAV (Entity-Attribute-Value) for maximum flexibility
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    field_value TEXT,  -- Stored as text, type-converted based on field_definition.field_type
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One value per field per entity
    CONSTRAINT unique_value_per_entity UNIQUE (field_definition_id, entity_type, entity_id)
);

-- Indexes for custom_field_values table
CREATE INDEX IF NOT EXISTS idx_custom_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_values_field ON custom_field_values(field_definition_id);

COMMENT ON TABLE custom_field_values IS 'Actual custom field data - stores values for defined fields';
COMMENT ON COLUMN custom_field_values.field_value IS 'Stored as text, convert based on field_type';

-- ============================================================================
-- SECTION 3: ENHANCED QUOTE SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: quote_templates
-- Purpose: Reusable quote templates with pre-configured line items
-- Use case: "Standard Tree Removal", "Emergency Service Package", "Seasonal Maintenance"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Template Content
    line_items JSONB NOT NULL DEFAULT '[]',  -- Pre-configured line items with pricing
    terms_and_conditions TEXT,
    
    -- Default Settings
    valid_days INTEGER DEFAULT 30,  -- Quote validity period
    deposit_percentage NUMERIC(5,2) DEFAULT 0,
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    
    -- Categorization
    service_category VARCHAR(100),  -- tree_removal, pruning, emergency, stump_grinding
    
    -- Usage Tracking
    is_active BOOLEAN DEFAULT true,
    use_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Indexes for quote_templates table
CREATE INDEX IF NOT EXISTS idx_quote_templates_category ON quote_templates(service_category, is_active);
CREATE INDEX IF NOT EXISTS idx_quote_templates_active ON quote_templates(is_active);

COMMENT ON TABLE quote_templates IS 'Reusable quote templates for common service packages';
COMMENT ON COLUMN quote_templates.use_count IS 'Track template popularity for optimization';

-- ----------------------------------------------------------------------------
-- Table: quote_versions
-- Purpose: Complete version history for quotes (price changes, revisions)
-- Use case: Track quote modifications, maintain audit trail for compliance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    version_number INTEGER NOT NULL,
    
    -- Snapshot of quote data at this version
    line_items JSONB NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    terms TEXT,
    notes TEXT,
    
    -- Change Tracking
    changed_by VARCHAR(100),
    change_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique version numbers per quote
    CONSTRAINT unique_quote_version UNIQUE (quote_id, version_number)
);

-- Indexes for quote_versions table
CREATE INDEX IF NOT EXISTS idx_quote_versions_quote ON quote_versions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_versions_created ON quote_versions(created_at DESC);

COMMENT ON TABLE quote_versions IS 'Complete version history for quotes - tracks all changes';
COMMENT ON COLUMN quote_versions.change_reason IS 'Why this version was created (e.g., "Client requested lower price")';

-- ----------------------------------------------------------------------------
-- Table: quote_followups
-- Purpose: Scheduled follow-ups for quotes (calls, emails, meetings)
-- Use case: Automated reminder system, sales pipeline management
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Follow-up Details
    followup_type VARCHAR(50) NOT NULL,  -- email, call, sms, in_person
    scheduled_date DATE NOT NULL,
    
    -- Content
    subject VARCHAR(200),
    message TEXT,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, completed, cancelled, skipped
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(100),
    
    -- Response & Outcome
    client_response TEXT,
    outcome VARCHAR(50),  -- interested, not_interested, needs_time, converted
    
    -- Automation
    is_automated BOOLEAN DEFAULT false,  -- Was this follow-up auto-generated?
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for quote_followups table
CREATE INDEX IF NOT EXISTS idx_quote_followups_quote ON quote_followups(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_followups_scheduled ON quote_followups(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_quote_followups_status ON quote_followups(status) WHERE status = 'scheduled';

COMMENT ON TABLE quote_followups IS 'Scheduled follow-up tasks for quotes - sales automation';
COMMENT ON COLUMN quote_followups.is_automated IS 'Distinguishes manual vs automated follow-ups';

-- ============================================================================
-- SECTION 4: TABLE MODIFICATIONS - EXISTING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Modify: quotes table
-- Add client/property relationships and enhanced quote features
-- ----------------------------------------------------------------------------

-- Add new columns to quotes table
ALTER TABLE quotes 
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS approved_by UUID,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
    ADD COLUMN IF NOT EXISTS internal_notes TEXT,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add unique constraint for quote_number (only if column exists and not already constrained)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_quote_number'
    ) THEN
        ALTER TABLE quotes ADD CONSTRAINT unique_quote_number UNIQUE (quote_number);
    END IF;
END $$;

-- Indexes for enhanced quotes table
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_property ON quotes(property_id);
CREATE INDEX IF NOT EXISTS idx_quotes_approval ON quotes(approval_status);
CREATE INDEX IF NOT EXISTS idx_quotes_version ON quotes(version);
CREATE INDEX IF NOT EXISTS idx_quotes_deleted ON quotes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number) WHERE deleted_at IS NULL;

COMMENT ON COLUMN quotes.client_id IS 'Links quote to client (replaces customer_name)';
COMMENT ON COLUMN quotes.approval_status IS 'Internal approval workflow: pending, approved, rejected';
COMMENT ON COLUMN quotes.version IS 'Current version number - increments with each revision';

-- ----------------------------------------------------------------------------
-- Modify: leads table
-- Add client/property relationships and lead scoring
-- ----------------------------------------------------------------------------

-- Add new columns to leads table
ALTER TABLE leads 
    ADD COLUMN IF NOT EXISTS client_id_new UUID REFERENCES clients(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100),
    ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS expected_close_date DATE,
    ADD COLUMN IF NOT EXISTS last_contact_date DATE,
    ADD COLUMN IF NOT EXISTS next_followup_date DATE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for lead_score range
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_lead_score_range'
    ) THEN
        ALTER TABLE leads ADD CONSTRAINT check_lead_score_range 
            CHECK (lead_score >= 0 AND lead_score <= 100);
    END IF;
END $$;

-- Indexes for enhanced leads table
CREATE INDEX IF NOT EXISTS idx_leads_client_new ON leads(client_id_new) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deleted ON leads(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN leads.client_id_new IS 'New client relationship (named _new to avoid conflict with existing customer_id)';
COMMENT ON COLUMN leads.lead_score IS 'AI-generated lead score 0-100, higher = more likely to convert';
COMMENT ON COLUMN leads.priority IS 'Manual priority override: low, medium, high, urgent';

-- ----------------------------------------------------------------------------
-- Modify: jobs table
-- Add client/property relationships and job numbering
-- ----------------------------------------------------------------------------

-- Add new columns to jobs table
ALTER TABLE jobs 
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add unique constraint for job_number
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_job_number'
    ) THEN
        ALTER TABLE jobs ADD CONSTRAINT unique_job_number UNIQUE (job_number);
    END IF;
END $$;

-- Indexes for enhanced jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_property ON jobs(property_id);
CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_deleted ON jobs(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN jobs.client_id IS 'Links job to client record';
COMMENT ON COLUMN jobs.property_id IS 'Specific service location for this job';
COMMENT ON COLUMN jobs.job_number IS 'Human-readable job identifier (e.g., JOB-2024-001)';

-- ============================================================================
-- SECTION 5: HELPER FUNCTIONS (Optional but recommended)
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables with updated_at column
DO $$ 
BEGIN
    -- Clients
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
        CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Properties
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_properties_updated_at') THEN
        CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Contacts
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at') THEN
        CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Custom field definitions
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_field_definitions_updated_at') THEN
        CREATE TRIGGER update_custom_field_definitions_updated_at BEFORE UPDATE ON custom_field_definitions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Custom field values
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_field_values_updated_at') THEN
        CREATE TRIGGER update_custom_field_values_updated_at BEFORE UPDATE ON custom_field_values
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Quote templates
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_templates_updated_at') THEN
        CREATE TRIGGER update_quote_templates_updated_at BEFORE UPDATE ON quote_templates
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Quote followups
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_followups_updated_at') THEN
        CREATE TRIGGER update_quote_followups_updated_at BEFORE UPDATE ON quote_followups
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Quotes
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotes_updated_at') THEN
        CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Leads
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leads_updated_at') THEN
        CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Jobs
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_jobs_updated_at') THEN
        CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of what was created:
-- 
-- NEW TABLES (11):
--   1. clients - Central CRM client repository
--   2. properties - Service locations per client
--   3. contacts - Additional people at client/property
--   4. contact_channels - Multiple communication methods per contact
--   5. tags - Flexible categorization system
--   6. entity_tags - Polymorphic tagging relationships
--   7. custom_field_definitions - Custom field schema
--   8. custom_field_values - Custom field data storage
--   9. quote_templates - Reusable quote configurations
--  10. quote_versions - Quote revision history
--  11. quote_followups - Scheduled follow-up tasks
--
-- MODIFIED TABLES (3):
--   1. quotes - Added client/property links, versioning, approval workflow
--   2. leads - Added client/property links, scoring, priority
--   3. jobs - Added client/property links, job numbering
--
-- INDEXES: 50+ indexes for optimal query performance
-- CONSTRAINTS: Foreign keys, unique constraints, check constraints
-- TRIGGERS: Auto-update updated_at timestamps
-- COMMENTS: Inline documentation for all tables and key columns
--
-- Next steps:
--   1. Run this migration on development database
--   2. Verify all tables created successfully
--   3. Implement backend API endpoints (see implementation plan)
--   4. Build frontend components for CRM features
--   5. Migrate existing customer data to new clients table
