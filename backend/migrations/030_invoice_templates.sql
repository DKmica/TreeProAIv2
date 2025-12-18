-- ============================================================================
-- TreePro AI - Phase 7 Invoice Templates Migration
-- Migration: 030_invoice_templates.sql
-- Description: Invoice templates system for customizing invoice appearance
--              and default settings
-- Created: 2024-12-15
-- ============================================================================
-- 
-- This migration implements an invoice templates system that supports:
--   - Customizable headers, footers, and branding
--   - Default payment terms and notes
--   - Tax rate defaults
--   - Multiple template options per company
--   - Usage tracking
-- 
-- IDEMPOTENCY: Safe to run multiple times using IF NOT EXISTS checks
-- ============================================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: INVOICE TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template branding
  logo_url TEXT,
  header_text TEXT,
  footer_text TEXT,
  
  -- Company info for header
  company_name VARCHAR(255),
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  company_website VARCHAR(255),
  
  -- Default values
  default_payment_terms VARCHAR(100) DEFAULT 'Net 30',
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  default_notes TEXT,
  default_customer_notes TEXT,
  
  -- Appearance settings
  primary_color VARCHAR(7) DEFAULT '#1B5E20',
  secondary_color VARCHAR(7) DEFAULT '#4CAF50',
  font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
  
  -- Template metadata
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit
  created_by VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_templates_active ON invoice_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_templates_default ON invoice_templates(is_default) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_templates_usage ON invoice_templates(usage_count DESC, last_used_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE invoice_templates IS 'Invoice templates for customizing invoice appearance and defaults';
COMMENT ON COLUMN invoice_templates.is_default IS 'Whether this is the default template for new invoices';
COMMENT ON COLUMN invoice_templates.usage_count IS 'Number of invoices created with this template';

-- ============================================================================
-- SECTION 2: ADD TEMPLATE REFERENCE TO INVOICES
-- ============================================================================

-- Add template_id column to invoices if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN template_id VARCHAR(36) REFERENCES invoice_templates(id);
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: SEED DATA - DEFAULT INVOICE TEMPLATE
-- ============================================================================

INSERT INTO invoice_templates (
  id, name, description, 
  company_name, default_payment_terms, default_tax_rate,
  header_text, footer_text, default_notes,
  is_default, is_active, is_system
) VALUES (
  'inv_template_default',
  'Standard Invoice',
  'Default invoice template with company branding',
  'TreePro AI',
  'Net 30',
  0,
  'Thank you for choosing TreePro AI for your tree care needs.',
  'Payment is due within 30 days. We accept check, credit card, and ACH payments.',
  'Please remit payment to the address above or pay online at our customer portal.',
  true,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_templates (
  id, name, description,
  company_name, default_payment_terms, default_tax_rate,
  header_text, footer_text, default_notes,
  primary_color, is_default, is_active, is_system
) VALUES (
  'inv_template_professional',
  'Professional Invoice',
  'Clean, professional invoice template for commercial clients',
  'TreePro AI',
  'Net 15',
  0,
  'Professional Tree Care Services',
  'Thank you for your business. For questions about this invoice, please contact our office.',
  'Early payment discounts available - ask about our 2% net 10 option.',
  '#1565C0',
  false,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_templates (
  id, name, description,
  company_name, default_payment_terms, default_tax_rate,
  header_text, footer_text, default_notes,
  primary_color, is_default, is_active, is_system
) VALUES (
  'inv_template_residential',
  'Residential Invoice',
  'Friendly invoice template for residential customers',
  'TreePro AI',
  'Due on Receipt',
  0,
  'We appreciate your trust in our team!',
  'Questions? Give us a call anytime. We love hearing from our customers!',
  'Refer a friend and receive 10% off your next service!',
  '#2E7D32',
  false,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 4: ENSURE ONLY ONE DEFAULT TEMPLATE
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_default_invoice_template()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE invoice_templates 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_invoice_template ON invoice_templates;
CREATE TRIGGER trg_single_default_invoice_template
  BEFORE INSERT OR UPDATE ON invoice_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_invoice_template();

-- ============================================================================
-- SECTION 5: COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration 030_invoice_templates completed successfully';
    RAISE NOTICE '📊 Invoice Templates Features:';
    RAISE NOTICE '   - Customizable branding (logo, colors, fonts)';
    RAISE NOTICE '   - Default payment terms and tax rates';
    RAISE NOTICE '   - Header/footer customization';
    RAISE NOTICE '   - Usage tracking';
    RAISE NOTICE '   - 3 seed templates created (Standard, Professional, Residential)';
END $$;
