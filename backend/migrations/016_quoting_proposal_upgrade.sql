-- Phase 4: Quoting & Proposal System Upgrade
-- Migration 016: Professional proposals, versioning, e-signatures, and analytics

-- ============================================================================
-- QUOTE VERSIONING
-- ============================================================================

-- Quote version history
CREATE TABLE IF NOT EXISTS quote_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_name VARCHAR(100),
    changes_summary TEXT,
    snapshot_data JSONB NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quote_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quote_versions_quote ON quote_versions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_versions_created ON quote_versions(created_at DESC);

-- ============================================================================
-- CUSTOMER E-SIGNATURES
-- ============================================================================

-- Customer signatures for quote approval
CREATE TABLE IF NOT EXISTS quote_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    signer_name VARCHAR(200) NOT NULL,
    signer_email VARCHAR(255),
    signer_phone VARCHAR(50),
    signature_data TEXT,
    signature_type VARCHAR(50) DEFAULT 'drawn',
    ip_address VARCHAR(45),
    user_agent TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    terms_accepted BOOLEAN DEFAULT true,
    terms_version VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    UNIQUE(quote_id)
);

CREATE INDEX IF NOT EXISTS idx_quote_signatures_quote ON quote_signatures(quote_id);

-- ============================================================================
-- PROPOSAL TEMPLATES
-- ============================================================================

-- Proposal template definitions
CREATE TABLE IF NOT EXISTS proposal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    cover_page_enabled BOOLEAN DEFAULT true,
    cover_page_title VARCHAR(255),
    cover_page_subtitle VARCHAR(255),
    cover_page_image_url TEXT,
    company_logo_url TEXT,
    header_html TEXT,
    footer_html TEXT,
    terms_and_conditions TEXT,
    custom_disclaimers JSONB DEFAULT '[]',
    sections_config JSONB DEFAULT '[]',
    styling JSONB DEFAULT '{}',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proposal sections (reusable content blocks)
CREATE TABLE IF NOT EXISTS proposal_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    is_system BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GOOD/BETTER/BEST PRICING OPTIONS
-- ============================================================================

-- Quote pricing options (multiple tiers per quote)
CREATE TABLE IF NOT EXISTS quote_pricing_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    option_tier VARCHAR(50) NOT NULL,
    option_name VARCHAR(200) NOT NULL,
    description TEXT,
    line_items JSONB DEFAULT '[]',
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_percentage NUMERIC(5,2),
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    is_recommended BOOLEAN DEFAULT false,
    is_selected BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]',
    exclusions JSONB DEFAULT '[]',
    warranty_info TEXT,
    estimated_duration VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_pricing_options_quote ON quote_pricing_options(quote_id);

-- ============================================================================
-- QUOTE-TO-JOB CONVERSION ANALYTICS
-- ============================================================================

-- Quote conversion tracking
CREATE TABLE IF NOT EXISTS quote_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    selected_option_id UUID REFERENCES quote_pricing_options(id) ON DELETE SET NULL,
    conversion_status VARCHAR(50) NOT NULL,
    quote_amount NUMERIC(12,2),
    job_amount NUMERIC(12,2),
    variance_amount NUMERIC(12,2),
    variance_percentage NUMERIC(6,2),
    days_to_conversion INTEGER,
    follow_ups_count INTEGER DEFAULT 0,
    conversion_source VARCHAR(100),
    lost_reason VARCHAR(255),
    competitor_name VARCHAR(200),
    competitor_price NUMERIC(12,2),
    notes TEXT,
    converted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote follow-up activities
CREATE TABLE IF NOT EXISTS quote_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    follow_up_type VARCHAR(50) NOT NULL,
    channel VARCHAR(50),
    notes TEXT,
    response_received BOOLEAN DEFAULT false,
    response_summary TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_conversions_quote ON quote_conversions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_conversions_status ON quote_conversions(conversion_status);
CREATE INDEX IF NOT EXISTS idx_quote_follow_ups_quote ON quote_follow_ups(quote_id);

-- ============================================================================
-- AI ESTIMATE ACCURACY TRACKING (Enhanced)
-- ============================================================================

-- Enhance existing estimate_feedback table if it exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_feedback' AND column_name = 'variance_analysis') THEN
        ALTER TABLE estimate_feedback ADD COLUMN variance_analysis JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_feedback' AND column_name = 'ai_suggestions_followed') THEN
        ALTER TABLE estimate_feedback ADD COLUMN ai_suggestions_followed BOOLEAN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_feedback' AND column_name = 'final_price_used') THEN
        ALTER TABLE estimate_feedback ADD COLUMN final_price_used NUMERIC(12,2);
    END IF;
END $$;

-- AI estimate accuracy stats (aggregated)
CREATE TABLE IF NOT EXISTS ai_estimate_accuracy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_period VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_estimates INTEGER DEFAULT 0,
    estimates_with_feedback INTEGER DEFAULT 0,
    avg_accuracy_score NUMERIC(5,2),
    avg_price_variance_percentage NUMERIC(6,2),
    underestimate_count INTEGER DEFAULT 0,
    overestimate_count INTEGER DEFAULT 0,
    accurate_count INTEGER DEFAULT 0,
    most_common_corrections JSONB DEFAULT '[]',
    service_type_accuracy JSONB DEFAULT '{}',
    tree_size_accuracy JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(time_period, period_start)
);

-- ============================================================================
-- ADD PROPOSAL FIELDS TO QUOTES TABLE
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'proposal_template_id') THEN
        ALTER TABLE quotes ADD COLUMN proposal_template_id UUID REFERENCES proposal_templates(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'has_multiple_options') THEN
        ALTER TABLE quotes ADD COLUMN has_multiple_options BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'selected_option_id') THEN
        ALTER TABLE quotes ADD COLUMN selected_option_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'version_number') THEN
        ALTER TABLE quotes ADD COLUMN version_number INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'signature_required') THEN
        ALTER TABLE quotes ADD COLUMN signature_required BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'signed_at') THEN
        ALTER TABLE quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'cover_letter') THEN
        ALTER TABLE quotes ADD COLUMN cover_letter TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'custom_terms') THEN
        ALTER TABLE quotes ADD COLUMN custom_terms TEXT;
    END IF;
END $$;

-- ============================================================================
-- SEED DEFAULT PROPOSAL TEMPLATE
-- ============================================================================

INSERT INTO proposal_templates (
    name,
    description,
    is_default,
    cover_page_enabled,
    cover_page_title,
    cover_page_subtitle,
    terms_and_conditions,
    custom_disclaimers,
    sections_config,
    styling
) VALUES (
    'Professional Tree Service Proposal',
    'Default professional proposal template with cover page and standard sections',
    true,
    true,
    'Tree Service Proposal',
    'Professional Arborist Services',
    E'1. All work will be performed by trained and certified professionals.\n2. Customer agrees to provide access to the work area.\n3. Payment is due upon completion unless otherwise arranged.\n4. This quote is valid for 30 days from the date issued.\n5. Any changes to the scope of work may result in price adjustments.\n6. We are fully licensed and insured for your protection.',
    '[
        {"title": "Weather Conditions", "text": "Work may be rescheduled due to inclement weather for safety reasons."},
        {"title": "Underground Utilities", "text": "Customer is responsible for marking any underground utilities or irrigation systems."},
        {"title": "Stump Removal", "text": "Stump grinding is to a depth of 6-8 inches below grade unless otherwise specified."}
    ]'::jsonb,
    '[
        {"type": "cover", "enabled": true},
        {"type": "summary", "enabled": true, "title": "Project Summary"},
        {"type": "scope", "enabled": true, "title": "Scope of Work"},
        {"type": "pricing", "enabled": true, "title": "Investment Options"},
        {"type": "timeline", "enabled": true, "title": "Project Timeline"},
        {"type": "terms", "enabled": true, "title": "Terms & Conditions"},
        {"type": "signature", "enabled": true, "title": "Authorization"}
    ]'::jsonb,
    '{
        "primaryColor": "#00c2ff",
        "accentColor": "#0a1628",
        "fontFamily": "Inter, system-ui, sans-serif",
        "headerStyle": "modern",
        "showCompanyLogo": true,
        "showPageNumbers": true
    }'::jsonb
) ON CONFLICT DO NOTHING;

-- Seed standard proposal sections
INSERT INTO proposal_sections (name, section_type, title, content, is_system, display_order) VALUES
    ('About Us', 'about', 'About Our Company', 'We are a professional tree service company with years of experience providing quality arborist services. Our team of certified arborists and skilled technicians are dedicated to the health and beauty of your trees.', true, 1),
    ('Why Choose Us', 'benefits', 'Why Choose Us', '• Fully licensed and insured\n• Certified arborists on staff\n• State-of-the-art equipment\n• Commitment to safety\n• Competitive pricing\n• Satisfaction guaranteed', true, 2),
    ('Safety Commitment', 'safety', 'Our Safety Commitment', 'Safety is our top priority. All our crew members are trained in the latest safety protocols and use proper personal protective equipment. We carry comprehensive liability insurance and workers compensation coverage for your peace of mind.', true, 3),
    ('Warranty Info', 'warranty', 'Service Warranty', 'We stand behind our work. All tree care services come with a satisfaction guarantee. If you are not completely satisfied with our work, we will make it right at no additional cost.', true, 4)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE VIEW FOR QUOTE ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW quote_conversion_analytics AS
SELECT 
    DATE_TRUNC('month', q.created_at) as month,
    COUNT(DISTINCT q.id) as total_quotes,
    COUNT(DISTINCT CASE WHEN q.status = 'Approved' THEN q.id END) as approved_quotes,
    COUNT(DISTINCT CASE WHEN q.status = 'Declined' THEN q.id END) as declined_quotes,
    COUNT(DISTINCT CASE WHEN q.status = 'Expired' THEN q.id END) as expired_quotes,
    COUNT(DISTINCT CASE WHEN qc.job_id IS NOT NULL THEN q.id END) as converted_to_jobs,
    ROUND(
        COUNT(DISTINCT CASE WHEN qc.job_id IS NOT NULL THEN q.id END)::numeric / 
        NULLIF(COUNT(DISTINCT q.id), 0) * 100, 2
    ) as conversion_rate,
    COALESCE(SUM(q.total_price), 0) as total_quoted_value,
    COALESCE(SUM(CASE WHEN qc.job_id IS NOT NULL THEN q.total_price END), 0) as converted_value,
    COALESCE(AVG(qc.days_to_conversion), 0) as avg_days_to_conversion
FROM quotes q
LEFT JOIN quote_conversions qc ON q.id = qc.quote_id
WHERE q.created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', q.created_at)
ORDER BY month DESC;
