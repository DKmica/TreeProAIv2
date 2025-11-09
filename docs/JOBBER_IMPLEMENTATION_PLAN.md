# TreePro AI - Jobber FSM Features Implementation Plan
## Comprehensive Technical Specification

---

## 🎯 Executive Summary

This document outlines the complete technical plan to transform TreePro AI from a basic tree service management tool into a comprehensive field service management platform that **matches and exceeds** Jobber's capabilities.

**Total Implementation Effort:** ~40-60 hours across 4 phases  
**Competitive Advantage:** Native inventory, advanced automation, AI integration, better pricing model  
**Target Market:** Tree service companies with 1-30 employees looking to scale

---

# PHASE 1: Win Jobs Foundation (CRM & Sales Enhancement)
**Priority:** HIGHEST | **Effort:** Large (12-16 hours) | **Value:** Foundation for all other features

## Overview
Transform the basic customer/lead system into a professional CRM that handles:
- Complex client hierarchies (Client → Properties → Contacts)
- Advanced quote workflows with approval processes
- Client segmentation and custom data tracking
- Automated follow-up systems

---

## 1.1 Database Schema Changes

### New Tables

#### `clients` (replaces/extends `customers`)
```sql
CREATE TABLE clients (
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
    
    -- Financial
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    credit_limit NUMERIC(12,2),
    tax_exempt BOOLEAN DEFAULT false,
    
    -- Address (Primary Billing)
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
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete
    
    CONSTRAINT unique_email UNIQUE (primary_email) WHERE deleted_at IS NULL
);

CREATE INDEX idx_clients_status ON clients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_search ON clients USING gin(to_tsvector('english', 
    coalesce(first_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || 
    coalesce(company_name, '') || ' ' || 
    coalesce(primary_email, '')
));
```

#### `properties` (service locations)
```sql
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Address
    property_name VARCHAR(200),  -- e.g., "Main Office", "North Branch"
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'USA',
    
    -- Geolocation
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    -- Property Details
    property_type VARCHAR(50),  -- residential, commercial, industrial
    square_footage INTEGER,
    lot_size NUMERIC(10,2),
    
    -- Access Information
    gate_code VARCHAR(50),
    access_instructions TEXT,
    parking_instructions TEXT,
    
    -- Service Details
    trees_on_property INTEGER,
    property_features JSONB DEFAULT '[]',  -- pools, power lines, structures
    
    -- Status
    is_primary BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT one_primary_property_per_client UNIQUE (client_id, is_primary) 
        WHERE is_primary = true AND deleted_at IS NULL
);

CREATE INDEX idx_properties_client ON properties(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_location ON properties(lat, lon);
```

#### `contacts` (additional people at client/property)
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Personal Info
    title VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    job_title VARCHAR(100),
    
    -- Role
    contact_type VARCHAR(50) DEFAULT 'general',  -- general, billing, site_manager, tenant, owner
    is_primary BOOLEAN DEFAULT false,
    
    -- Communication Preferences
    preferred_contact_method VARCHAR(50) DEFAULT 'email',  -- email, phone, sms
    can_approve_quotes BOOLEAN DEFAULT false,
    can_receive_invoices BOOLEAN DEFAULT false,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_contacts_client ON contacts(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_property ON contacts(property_id) WHERE deleted_at IS NULL;
```

#### `contact_channels` (multiple emails/phones per contact)
```sql
CREATE TABLE contact_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    channel_type VARCHAR(50) NOT NULL,  -- email, phone, mobile, fax
    channel_value VARCHAR(255) NOT NULL,
    label VARCHAR(100),  -- e.g., "Work", "Home", "Mobile"
    is_primary BOOLEAN DEFAULT false,
    
    -- Validation
    is_verified BOOLEAN DEFAULT false,
    bounced BOOLEAN DEFAULT false,  -- For email
    do_not_contact BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contact_channels_contact ON contact_channels(contact_id);
CREATE INDEX idx_contact_channels_value ON contact_channels(channel_value);
```

#### `tags`
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#00c2ff',  -- Hex color
    description TEXT,
    category VARCHAR(50),  -- client, job, quote, custom
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tags_category ON tags(category);
```

#### `entity_tags` (polymorphic tagging)
```sql
CREATE TABLE entity_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,  -- client, property, quote, job, lead
    entity_id UUID NOT NULL,
    
    tagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tagged_by VARCHAR(100),
    
    CONSTRAINT unique_entity_tag UNIQUE (tag_id, entity_type, entity_id)
);

CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_tag ON entity_tags(tag_id);
```

#### `custom_field_definitions`
```sql
CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    entity_type VARCHAR(50) NOT NULL,  -- client, property, quote, job
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL,  -- text, number, date, dropdown, checkbox, textarea
    
    -- Configuration
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    options JSONB,  -- For dropdown: ["Option 1", "Option 2"]
    validation_rules JSONB,  -- {"min": 0, "max": 100, "pattern": "regex"}
    
    -- Display
    display_order INTEGER DEFAULT 0,
    help_text TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_field_per_entity UNIQUE (entity_type, field_name)
);

CREATE INDEX idx_custom_fields_entity ON custom_field_definitions(entity_type, is_active);
```

#### `custom_field_values`
```sql
CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    field_value TEXT,  -- Stored as text, converted based on field_type
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_value_per_entity UNIQUE (field_definition_id, entity_type, entity_id)
);

CREATE INDEX idx_custom_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_values_field ON custom_field_values(field_definition_id);
```

#### `quote_templates`
```sql
CREATE TABLE quote_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Template Content
    line_items JSONB NOT NULL DEFAULT '[]',  -- Pre-configured line items
    terms_and_conditions TEXT,
    
    -- Settings
    valid_days INTEGER DEFAULT 30,
    deposit_percentage NUMERIC(5,2) DEFAULT 0,
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    
    -- Category
    service_category VARCHAR(100),  -- tree_removal, pruning, emergency, etc.
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    use_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

CREATE INDEX idx_quote_templates_category ON quote_templates(service_category, is_active);
```

#### `quote_versions` (version history)
```sql
CREATE TABLE quote_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    version_number INTEGER NOT NULL,
    
    -- Snapshot of quote data at this version
    line_items JSONB NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    terms TEXT,
    notes TEXT,
    
    -- Change tracking
    changed_by VARCHAR(100),
    change_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_quote_version UNIQUE (quote_id, version_number)
);

CREATE INDEX idx_quote_versions_quote ON quote_versions(quote_id);
```

#### `quote_followups`
```sql
CREATE TABLE quote_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    followup_type VARCHAR(50) NOT NULL,  -- email, call, sms, in_person
    scheduled_date DATE NOT NULL,
    
    -- Content
    subject VARCHAR(200),
    message TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled',  -- scheduled, completed, cancelled, skipped
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(100),
    
    -- Response
    client_response TEXT,
    outcome VARCHAR(50),  -- interested, not_interested, needs_time, converted
    
    -- Auto-generated
    is_automated BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quote_followups_quote ON quote_followups(quote_id);
CREATE INDEX idx_quote_followups_scheduled ON quote_followups(scheduled_date, status);
```

### Modified Tables

#### Update `quotes` table
```sql
-- Add new columns to existing quotes table
ALTER TABLE quotes 
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_property ON quotes(property_id);
CREATE INDEX IF NOT EXISTS idx_quotes_approval ON quotes(approval_status);
```

#### Update `leads` table
```sql
ALTER TABLE leads 
    ADD COLUMN IF NOT EXISTS client_id_new UUID REFERENCES clients(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,  -- 0-100 AI-generated score
    ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium',  -- low, medium, high, urgent
    ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100),
    ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS expected_close_date DATE,
    ADD COLUMN IF NOT EXISTS last_contact_date DATE,
    ADD COLUMN IF NOT EXISTS next_followup_date DATE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_leads_client_new ON leads(client_id_new) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);
```

#### Update `jobs` table
```sql
ALTER TABLE jobs 
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_number VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_property ON jobs(property_id);
```

---

## 1.2 Backend API Endpoints

### Client Management

#### `POST /api/clients`
Create a new client
```typescript
Request:
{
  "firstName": "John",
  "lastName": "Smith",
  "companyName": "Smith Properties LLC",
  "primaryEmail": "john@smithproperties.com",
  "primaryPhone": "555-0123",
  "clientType": "commercial",
  "billingAddress": {
    "line1": "123 Main St",
    "city": "Portland",
    "state": "OR",
    "zip": "97201"
  },
  "properties": [  // Optional: create properties at same time
    {
      "propertyName": "Downtown Office",
      "addressLine1": "456 Market St",
      "city": "Portland",
      "state": "OR",
      "zip": "97202",
      "isPrimary": true
    }
  ],
  "contacts": [  // Optional: create contacts at same time
    {
      "firstName": "Sarah",
      "lastName": "Johnson",
      "jobTitle": "Office Manager",
      "contactType": "billing",
      "canApproveQuotes": true,
      "channels": [
        {"type": "email", "value": "sarah@smithproperties.com", "isPrimary": true},
        {"type": "mobile", "value": "555-0124"}
      ]
    }
  ],
  "tags": ["commercial", "high-value"]
}

Response: 201 Created
{
  "id": "uuid",
  "firstName": "John",
  ...full client object with nested properties and contacts
}
```

#### `GET /api/clients`
List all clients with filtering
```typescript
Query params:
- ?status=active
- ?clientType=commercial
- ?search=smith
- ?tags=high-value,commercial
- ?page=1&limit=50
- ?sortBy=lifetimeValue&sortOrder=desc

Response: 200 OK
{
  "clients": [...],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

#### `GET /api/clients/:id`
Get client with full details
```typescript
Response: 200 OK
{
  "id": "uuid",
  "firstName": "John",
  "properties": [...all properties],
  "contacts": [...all contacts with channels],
  "tags": [...],
  "customFields": {...},
  "stats": {
    "totalQuotes": 15,
    "totalJobs": 12,
    "lifetimeValue": 45000,
    "lastJobDate": "2024-10-15"
  }
}
```

#### `PUT /api/clients/:id`
Update client

#### `DELETE /api/clients/:id`
Soft delete client (sets deleted_at)

### Property Management

#### `POST /api/clients/:clientId/properties`
Add property to client

#### `PUT /api/properties/:id`
Update property

#### `DELETE /api/properties/:id`
Delete property (only if no jobs associated)

### Contact Management

#### `POST /api/clients/:clientId/contacts`
Add contact to client

#### `PUT /api/contacts/:id`
Update contact

### Tag Management

#### `GET /api/tags`
List all tags

#### `POST /api/tags`
Create tag
```typescript
Request:
{
  "name": "VIP Client",
  "color": "#ff0000",
  "category": "client"
}
```

#### `POST /api/entities/:entityType/:entityId/tags`
Add tags to entity
```typescript
Request:
{
  "tagIds": ["uuid1", "uuid2"]
}
```

### Custom Fields

#### `GET /api/custom-fields/:entityType`
Get custom field definitions for entity type

#### `POST /api/custom-fields`
Create custom field definition

#### `PUT /api/entities/:entityType/:entityId/custom-fields`
Set custom field values for entity

### Enhanced Quote Endpoints

#### `POST /api/quotes` (enhanced)
```typescript
Request:
{
  "clientId": "uuid",
  "propertyId": "uuid",
  "lineItems": [
    {
      "type": "service",  // service, material, labor
      "description": "Large oak tree removal",
      "quantity": 1,
      "unitPrice": 3500,
      "category": "tree_removal",
      "isOptional": false,
      "tier": "standard"  // good, better, best
    },
    {
      "description": "Stump grinding (optional)",
      "quantity": 1,
      "unitPrice": 250,
      "isOptional": true
    }
  ],
  "discountPercentage": 10,
  "taxRate": 8.5,
  "depositAmount": 500,
  "paymentTerms": "Net 30",
  "validUntil": "2024-12-31",
  "termsAndConditions": "Standard tree service terms...",
  "internalNotes": "Client mentioned budget constraints"
}

Response: 201 Created with full quote including calculated totals
```

#### `POST /api/quotes/:id/versions`
Create new version of quote (price changes, line item updates)

#### `GET /api/quotes/:id/versions`
Get version history

#### `POST /api/quotes/:id/send`
Send quote to client (email + portal access)

#### `POST /api/quotes/:id/approve`
Internal approval workflow

#### `POST /api/quotes/:id/convert-to-job`
Convert approved quote to job

#### `POST /api/quotes/:id/followups`
Schedule follow-up
```typescript
Request:
{
  "followupType": "email",
  "scheduledDate": "2024-11-20",
  "subject": "Following up on your tree removal quote",
  "message": "Hi John, just wanted to check in..."
}
```

#### `GET /api/quotes/pending-followups`
Get all quotes needing follow-up

---

## 1.3 Frontend Components & Routes

### New Pages

#### `/crm` - CRM Dashboard
- Client list with advanced filtering
- Search by name, email, company, tags
- Quick stats (total clients, lifetime value, active jobs)
- Recently added clients
- High-value client highlights

#### `/crm/clients/:id` - Client Detail
Components:
- `ClientHeader` - Name, company, status, tags
- `ClientPropertiesPanel` - List of service locations
- `ClientContactsPanel` - All contacts with communication channels
- `ClientHistoryTimeline` - All quotes, jobs, invoices chronologically
- `ClientNotesPanel` - Internal and client-facing notes
- `ClientStatsWidget` - Lifetime value, job count, average ticket
- `ClientCustomFieldsPanel` - Display custom field values

#### `/crm/clients/:id/edit` - Client Editor
- Multi-step form or tabbed interface
- Section 1: Basic Info
- Section 2: Properties Management (add/edit/remove)
- Section 3: Contacts Management
- Section 4: Tags & Custom Fields
- Section 5: Billing Settings

#### `/quotes/builder` - Enhanced Quote Builder
Components:
- `QuoteClientSelector` - Search and select client/property
- `QuoteLineItemEditor` - Drag-and-drop line items with tier selection
- `QuoteTierMatrix` - Good/Better/Best pricing visualization
- `QuoteOptionalItemsToggle` - Show/hide optional services
- `QuoteTotalsCalculator` - Real-time total with discounts/taxes
- `QuoteTermsEditor` - Rich text editor for T&C
- `QuoteTemplateSelector` - Load from saved templates
- `QuotePreview` - Client-facing preview

#### `/quotes/:id/approval` - Quote Approval Drawer
- Quote details review
- Approve/Reject buttons
- Approval notes field
- Version comparison (if multiple versions)

### Updated Components

#### `pages/Leads.tsx`
- Add client hierarchy support
- Show property information
- Display lead score and priority
- Quick-convert to client action

#### `pages/Calendar.tsx`
- Filter by client, property, or tags
- Show property address on job cards
- Click job → navigate to client detail

#### `components/TagManager.tsx`
- Visual tag selector with color indicators
- Create new tags inline
- Tag filtering and search

#### `components/CustomFieldManager.tsx`
- Dynamic form generation based on field definitions
- Validation based on field rules
- Display custom fields throughout app

---

## 1.4 AI Integration Points

### ProBot Function Calls (add to aiCore.ts)

#### `suggest_client_tags`
```typescript
{
  name: "suggest_client_tags",
  description: "Suggest relevant tags for a client based on their information and history",
  parameters: {
    clientId: "uuid"
  }
}
// Returns: ["high-value", "commercial", "recurring"]
```

#### `draft_quote_followup`
```typescript
{
  name: "draft_quote_followup",
  description: "Generate a personalized follow-up message for a quote",
  parameters: {
    quoteId: "uuid",
    tone: "friendly" | "professional" | "urgent"
  }
}
// Returns: Drafted email with personalized content
```

#### `summarize_client_history`
```typescript
{
  name: "summarize_client_history",
  description: "Generate an executive summary of client relationship",
  parameters: {
    clientId: "uuid"
  }
}
// Returns: "John Smith has been a client since 2022. 12 jobs completed totaling $45K..."
```

#### `score_lead`
```typescript
{
  name: "score_lead",
  description: "Calculate lead quality score (0-100) based on available data",
  parameters: {
    leadId: "uuid"
  }
}
// Returns: score + reasoning
```

#### `suggest_quote_upsells`
```typescript
{
  name: "suggest_quote_upsells",
  description: "Suggest additional services for a quote based on context",
  parameters: {
    quoteId: "uuid",
    clientHistory: boolean
  }
}
// Returns: ["stump grinding", "debris removal", "tree health inspection"]
```

### RAG Context Updates

Update `backend/services/ragService.js` to include:
- Client hierarchy (clients + properties + contacts)
- Tags and their associations
- Quote versions and approval history
- Follow-up history

### Automation Triggers (Foundation for Phase 2)

Create trigger framework in `services/automations/`:
- Quote aging trigger (>7 days no response)
- Lead inactivity trigger (>14 days no contact)
- High-value client activity trigger (new quote > $10K)
- Follow-up due trigger (scheduled date reached)

---

## 1.5 Migration Strategy

### Data Migration Plan

#### Step 1: Create new tables
Run migration script to create all new tables

#### Step 2: Migrate existing customers → clients
```sql
-- Insert existing customers as clients
INSERT INTO clients (
    id, first_name, last_name, primary_email, primary_phone,
    billing_address_line1, created_at
)
SELECT 
    id,
    split_part(name, ' ', 1) as first_name,
    split_part(name, ' ', 2) as last_name,
    email,
    phone,
    address,
    created_at
FROM customers;

-- Create primary properties for each client from their address
INSERT INTO properties (
    client_id, property_name, address_line1, 
    lat, lon, is_primary, created_at
)
SELECT 
    id as client_id,
    'Primary Location' as property_name,
    address as address_line1,
    lat, lon,
    true as is_primary,
    created_at
FROM customers
WHERE address IS NOT NULL;
```

#### Step 3: Update foreign keys
```sql
-- Update leads to reference new client_id
UPDATE leads SET client_id_new = customer_id;

-- Update quotes (for those linked to leads)
UPDATE quotes q
SET client_id = l.client_id_new
FROM leads l
WHERE q.lead_id = l.id;
```

#### Step 4: Backfill quote numbers
```sql
UPDATE quotes 
SET quote_number = 'Q-' || to_char(created_at, 'YYYYMM') || '-' || 
    lpad(row_number() OVER (ORDER BY created_at)::text, 4, '0')
WHERE quote_number IS NULL;
```

#### Step 5: Deprecate old customers table (after verification)
```sql
-- Rename for safety, don't drop immediately
ALTER TABLE customers RENAME TO customers_deprecated;
```

---

## 1.6 Implementation Checklist

### Backend Tasks
- [ ] Create migration script with all new tables
- [ ] Create migration script for data backfill
- [ ] Implement Client CRUD endpoints
- [ ] Implement Property CRUD endpoints
- [ ] Implement Contact CRUD endpoints
- [ ] Implement Tag management endpoints
- [ ] Implement Custom Fields endpoints
- [ ] Enhance Quote endpoints (versions, approval, followups)
- [ ] Add quote number generation logic
- [ ] Update RAG service to index new data
- [ ] Create ProBot function calls for AI features
- [ ] Add validation middleware for hierarchy integrity

### Frontend Tasks
- [ ] Create CRM dashboard page
- [ ] Create Client detail page
- [ ] Create Client editor form
- [ ] Build Property management components
- [ ] Build Contact management components
- [ ] Build Tag selector component
- [ ] Build Custom Fields form generator
- [ ] Enhance Quote builder with new features
- [ ] Create Quote approval UI
- [ ] Create Quote followup scheduler
- [ ] Update Leads page for client hierarchy
- [ ] Add client/property filters to Calendar
- [ ] Create TypeScript interfaces for all new types

### Testing Tasks
- [ ] Test client creation with nested properties/contacts
- [ ] Test hierarchy deletion (cascade rules)
- [ ] Test quote versioning workflow
- [ ] Test quote → job conversion with client/property links
- [ ] Test tag filtering across multiple entity types
- [ ] Test custom field validation rules
- [ ] Test AI integration (lead scoring, quote suggestions)
- [ ] Performance test with 1000+ clients

---

# PHASE 2: Work Smarter (Operations Excellence)
**Priority:** HIGH | **Effort:** Large (14-18 hours) | **Value:** Competitive differentiation

## Overview
This phase adds features that Jobber lacks or charges extra for:
- Native inventory management
- Service plans & recurring billing
- Advanced workflow automation
- Enhanced job execution tools

## 2.1 Database Schema (Overview)

### New Tables
- `service_plans` - Recurring service contracts (monthly lawn care, quarterly inspections)
- `service_plan_schedules` - Auto-generated job schedule from plans
- `inventory_items` - Parts, materials, supplies
- `inventory_categories` - Organization (equipment, chemicals, supplies)
- `inventory_transactions` - Stock movements (purchase, use, adjustment)
- `purchase_orders` - Ordering from vendors
- `vendors` - Supplier information
- `job_templates` - Pre-configured job checklists
- `job_tasks` - Individual tasks within jobs (Phase 1 has job-level, this adds task-level)
- `job_forms` - Digital forms filled during job execution
- `automation_workflows` - Visual automation builder
- `automation_triggers` - Event definitions
- `automation_actions` - Action definitions
- `automation_runs` - Execution history

## 2.2 Key Features

### Service Plans (Recurring Services)
- Create monthly/quarterly/annual service contracts
- Auto-generate jobs on schedule
- Track contract renewals and cancellations
- Automated billing for recurring services
- Client portal shows upcoming scheduled services

### Inventory Management
- Track parts, materials, equipment
- Low stock alerts
- Purchase order workflow
- Vendor management
- Allocate inventory to jobs
- Track actual vs. estimated material costs
- Integration with quote builder (suggest materials)

### Workflow Automation
- Visual automation builder (like Zapier)
- Triggers: Job status change, quote sent, invoice overdue, inventory low, date-based
- Actions: Send email/SMS, create task, update record, send to AI, create follow-up
- Conditional logic (if/then branches)
- Examples:
  - "When job status = Completed → Send review request email"
  - "When quote status = Sent for 7 days → Create follow-up task"
  - "When inventory item quantity < 10 → Create purchase order"

### Enhanced Job Execution
- Job templates with pre-defined checklists
- Task-level time tracking
- Photo attachments per task
- Digital form builder (custom inspections, safety checks)
- Voice-to-text notes during job
- Offline mobile support (sync when online)

## 2.3 API Endpoints (Examples)

- `POST /api/service-plans` - Create recurring service plan
- `GET /api/service-plans/:id/upcoming-jobs` - See auto-generated schedule
- `POST /api/inventory/items` - Create inventory item
- `POST /api/inventory/transactions` - Record stock movement
- `GET /api/inventory/low-stock` - Get items needing reorder
- `POST /api/purchase-orders` - Create PO
- `POST /api/automations` - Create automation workflow
- `POST /api/automations/:id/test` - Test automation with sample data

## 2.4 AI Integration

- **Smart Scheduling**: AI suggests optimal service plan intervals based on tree health data
- **Predictive Maintenance**: AI predicts equipment maintenance needs from usage patterns
- **Inventory Forecasting**: AI predicts material needs for upcoming jobs
- **Automation Suggestions**: AI suggests automation workflows based on business patterns

## 2.5 Implementation Effort
- Database: ~3 hours (15+ tables, complex relationships)
- Backend: ~6 hours (CRUD + business logic for plans, inventory, automations)
- Frontend: ~6 hours (Plan manager, inventory dashboard, automation builder, job templates)
- Testing: ~2 hours

---

# PHASE 3: Boost Profits (Financial Strength)
**Priority:** MEDIUM | **Effort:** Medium-Large (10-14 hours) | **Value:** Revenue optimization

## Overview
Advanced financial features for better cash flow and profitability insights.

## 3.1 Database Schema (Overview)

### New Tables
- `payment_schedules` - Payment plans for large jobs
- `payment_transactions` - Individual payment records
- `invoice_reminders` - Auto-reminder tracking
- `job_cost_tracking` - Detailed cost breakdown per job
- `expense_categories` - Overhead categorization
- `profit_snapshots` - Daily/weekly profitability rollups

### Modified Tables
- `invoices` - Add partial payment support, payment plan links, auto-reminder settings
- `jobs` - Add profitability fields (estimated cost, actual cost, profit margin)

## 3.2 Key Features

### Payment Plans
- Split large invoices into installments
- Auto-send payment reminders
- Track payment schedule adherence
- Late fee calculations
- Client portal shows payment plan status

### Advanced Job Costing
- Track labor costs (actual hours × employee rate)
- Track material costs from inventory
- Track equipment costs (depreciation allocation)
- Track overhead (insurance, fuel, admin time)
- Compare estimated vs. actual costs per job
- Profit margin calculation per job

### Financial Reporting
- Profitability dashboard (daily/weekly/monthly)
- Revenue forecasting based on scheduled jobs
- Customer lifetime value ranking
- Cost analysis (labor vs. materials vs. overhead)
- Cash flow projections
- Outstanding AR aging report

### AI-Powered Insights
- "Your labor costs on tree removals are trending 15% over estimates"
- "Top 10 most profitable clients this quarter"
- "Recommended pricing adjustment for oak tree removals: +8%"
- "Cash flow warning: Large invoices due in 30 days may cause shortage"

## 3.3 API Endpoints (Examples)

- `POST /api/invoices/:id/payment-plans` - Create payment plan
- `POST /api/payments` - Record payment
- `GET /api/reports/profitability` - Get profit/loss report
- `GET /api/reports/cash-flow` - Get cash flow forecast
- `POST /api/jobs/:id/costs` - Record actual job costs
- `GET /api/analytics/top-clients` - Get highest value clients

## 3.4 Implementation Effort
- Database: ~2 hours
- Backend: ~4 hours (payment logic, cost tracking, reporting queries)
- Frontend: ~5 hours (payment plan UI, profitability dashboards, reports)
- Testing: ~2 hours

---

# PHASE 4: Get Noticed (Marketing & Growth)
**Priority:** MEDIUM | **Effort:** Medium (8-12 hours) | **Value:** Customer acquisition

## Overview
Marketing automation and customer acquisition tools.

## 4.1 Database Schema (Overview)

### New Tables
- `reviews` - Customer review tracking
- `review_requests` - Auto-request tracking
- `review_responses` - Company responses to reviews
- `referral_sources` - Track referral origins
- `referral_rewards` - Reward tracking for referrers
- `marketing_campaigns` - Email/SMS campaigns
- `campaign_sends` - Individual message tracking
- `email_templates` - Reusable email templates
- `customer_segments` - Dynamic customer grouping

## 4.2 Key Features

### Review Management
- Auto-request reviews after job completion
- Monitor Google, Yelp, Facebook reviews (via APIs)
- Respond to reviews from dashboard
- Review analytics (average rating, sentiment)
- Showcase top reviews on website

### Referral Program
- Track referral sources
- Auto-credit referrers
- Referral reward tiers ($ or % discount)
- Referral leaderboard

### Marketing Automation
- Email campaign builder
- Customer segmentation (tags, lifetime value, last service date)
- Automated sequences:
  - Welcome sequence for new clients
  - Re-engagement for inactive clients (>6 months)
  - Seasonal promotions (spring cleanup, fall pruning)
  - Birthday/anniversary emails
- A/B testing for email subject lines

### Customer Portal Enhancements
- Online booking form (public-facing)
- Client login to view history
- Approve quotes online
- Pay invoices online
- Schedule service requests
- Upload photos for estimates

## 4.3 AI Integration

- **Review Response Generator**: AI drafts professional responses to reviews
- **Campaign Content Writer**: AI writes email campaigns based on objectives
- **Optimal Send Time**: AI predicts best time to send marketing emails per customer
- **Segment Suggestions**: AI suggests customer segments ("Clients who got tree removal but not stump grinding")

## 4.4 Implementation Effort
- Database: ~2 hours
- Backend: ~3 hours (campaigns, reviews, referrals)
- Frontend: ~4 hours (campaign builder, review dashboard, portal)
- Integrations: ~2 hours (email service, review platforms)
- Testing: ~2 hours

---

# IMPLEMENTATION PRIORITY MATRIX

## Must Have (Phase 1)
| Feature | Business Value | Complexity | Priority |
|---------|---------------|------------|----------|
| Client hierarchy (Client→Property→Contact) | Critical | High | 1 |
| Enhanced quote workflow | Critical | Medium | 2 |
| Tags & custom fields | High | Low | 3 |
| Quote followup automation | High | Medium | 4 |

## Should Have (Phase 2)
| Feature | Business Value | Complexity | Priority |
|---------|---------------|------------|----------|
| Service plans | High | High | 5 |
| Inventory management | High | High | 6 |
| Workflow automation | Very High | Very High | 7 |
| Job templates | Medium | Low | 8 |

## Nice to Have (Phase 3)
| Feature | Business Value | Complexity | Priority |
|---------|---------------|------------|----------|
| Payment plans | Medium | Medium | 9 |
| Job costing | High | Medium | 10 |
| Profitability reports | High | Low | 11 |

## Future (Phase 4)
| Feature | Business Value | Complexity | Priority |
|---------|---------------|------------|----------|
| Review management | Medium | Low | 12 |
| Referral program | Low | Low | 13 |
| Marketing campaigns | Medium | Medium | 14 |
| Customer portal | High | High | 15 |

---

# COMPETITIVE ANALYSIS

## Features TreePro AI Will Have vs. Jobber

| Feature | Jobber | TreePro AI | Advantage |
|---------|--------|------------|-----------|
| Basic FSM (Quote/Schedule/Invoice) | ✅ | ✅ | Parity |
| AI-Powered Estimating | ❌ | ✅ | **TreePro Wins** |
| Native Inventory | ❌ (3rd party) | ✅ | **TreePro Wins** |
| Service Plans | ✅ | ✅ (Phase 2) | Parity |
| Workflow Automation | ⚠️ (Limited) | ✅ (Advanced) | **TreePro Wins** |
| Client Hierarchy | ✅ | ✅ | Parity |
| Custom Fields | ⚠️ (Limited) | ✅ (Unlimited) | **TreePro Wins** |
| VOIP Phone | ❌ (3rd party) | 🔮 (Future) | Potential |
| Template Customization | ❌ | ✅ (HTML/CSS) | **TreePro Wins** |
| Pricing Model | Per-user | Flat/Unlimited | **TreePro Wins** |
| Industry Specialization | General FSM | Tree Service | **TreePro Wins** |

---

# TECHNICAL RISKS & MITIGATIONS

## Risk 1: Data Migration Complexity
**Impact:** High | **Probability:** Medium

**Mitigation:**
- Phase 1 includes extensive migration scripts with rollback capability
- Test migrations on copy of production data first
- Implement blue-green deployment for zero downtime
- Provide data validation scripts post-migration

## Risk 2: Performance with Large Datasets
**Impact:** Medium | **Probability:** Medium

**Mitigation:**
- Comprehensive indexing strategy (defined in schema)
- Implement pagination on all list endpoints
- Use database query optimization (EXPLAIN ANALYZE)
- Consider materialized views for complex reports
- RAG re-indexing done in background jobs

## Risk 3: RAG Context Window Limits
**Impact:** Medium | **Probability:** High

**Mitigation:**
- Implement smart context pruning (recent data prioritized)
- Use hierarchical summarization for old data
- Cache frequently accessed embeddings
- Optimize embedding generation (batch processing)

## Risk 4: Automation Infinite Loops
**Impact:** High | **Probability:** Low

**Mitigation:**
- Maximum execution limit per automation (e.g., 10 runs/hour)
- Circuit breaker pattern
- Detailed logging and monitoring
- Manual override/disable capability
- Testing sandbox for automation workflows

## Risk 5: Mobile Offline Sync Conflicts
**Impact:** Medium | **Probability:** Medium

**Mitigation:**
- Last-write-wins with conflict detection
- Show conflict resolution UI when detected
- Immutable job history (append-only)
- Optimistic locking with version numbers

---

# TIMELINE ESTIMATES

## Phase 1: Win Jobs Foundation
- **Week 1-2:** Database migration + Backend APIs (40 hours)
- **Week 3-4:** Frontend components + Integration (30 hours)
- **Week 5:** Testing + Bug fixes (10 hours)
- **Total:** 5 weeks, 80 hours

## Phase 2: Work Smarter
- **Week 6-7:** Service Plans + Inventory (35 hours)
- **Week 8-9:** Workflow Automation (40 hours)
- **Week 10:** Testing + Polish (15 hours)
- **Total:** 5 weeks, 90 hours

## Phase 3: Boost Profits
- **Week 11-12:** Payment Plans + Job Costing (30 hours)
- **Week 13:** Reporting Dashboards (20 hours)
- **Week 14:** Testing (10 hours)
- **Total:** 4 weeks, 60 hours

## Phase 4: Get Noticed
- **Week 15-16:** Review + Referral System (20 hours)
- **Week 17-18:** Marketing Automation (30 hours)
- **Week 19:** Customer Portal (20 hours)
- **Week 20:** Final Testing + Launch (10 hours)
- **Total:** 6 weeks, 80 hours

**Grand Total:** 20 weeks, 310 hours of development time

---

# SUCCESS METRICS

## Phase 1 Success Criteria
- [ ] Migrate 100% of existing customers to new client hierarchy with zero data loss
- [ ] Quote approval workflow reduces quote-to-job time by 30%
- [ ] Custom fields used by 80% of clients for specialized data tracking
- [ ] AI lead scoring accuracy >70% (validated against actual conversions)

## Phase 2 Success Criteria
- [ ] 50% of clients on recurring service plans within 6 months
- [ ] Inventory tracking reduces material costs by 15% (better purchasing)
- [ ] Automation workflows save 10+ hours/week of manual work
- [ ] Job template usage on 90% of jobs

## Phase 3 Success Criteria
- [ ] Payment plans increase large job closing rate by 25%
- [ ] Job costing identifies profit margin opportunities (+10% average margin)
- [ ] AR collection time reduced by 20% (auto-reminders)
- [ ] CFO-level reporting generated in <5 seconds

## Phase 4 Success Criteria
- [ ] Review request automation achieves 40% response rate
- [ ] Referral program generates 20% of new leads
- [ ] Marketing campaigns achieve 25% open rate, 5% conversion
- [ ] Customer portal reduces phone calls by 30%

---

# NEXT STEPS

## Immediate Actions (for Phase 1 start)
1. **Stakeholder Review:** Present this plan to stakeholders for approval
2. **Design Review:** Create UI mockups for CRM dashboard and client detail page
3. **Database Planning:** Review migration scripts with database admin
4. **API Contracts:** Finalize API endpoint specifications
5. **Setup Dev Environment:** Create feature branch `feature/phase-1-crm-enhancement`

## Decision Points
- **Go/No-Go on Phase 1:** Requires approval of data migration strategy
- **Pricing Model Change:** If implementing unlimited users, impacts revenue model
- **Third-party Integrations:** Decide on email service (SendGrid, Mailgun) for Phase 4

---

# CONCLUSION

This implementation plan transforms TreePro AI from a basic tree service tool into a **best-in-class field service management platform** that:

✅ **Matches Jobber** on core FSM features  
✅ **Surpasses Jobber** with native inventory, advanced automation, AI integration  
✅ **Maintains Simplicity** with intuitive UI and progressive disclosure  
✅ **Enables Growth** with scalable architecture and unlimited user pricing  
✅ **Leverages AI** throughout the platform for competitive advantage  

**Recommended Approach:** Start with Phase 1 (12-16 hours) to establish the foundation, then reassess based on user feedback and business priorities.
