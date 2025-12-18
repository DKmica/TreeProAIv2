const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { notFoundError, badRequestError } = require('../../utils/errors');

const getTemplates = async () => {
  const { rows } = await db.query(`
    SELECT 
      id, name, description, is_default,
      cover_page_enabled, cover_page_title, cover_page_subtitle,
      cover_page_image_url, company_logo_url,
      header_html, footer_html,
      terms_and_conditions, custom_disclaimers,
      sections_config, styling,
      created_by, created_at, updated_at
    FROM proposal_templates
    ORDER BY is_default DESC, name ASC
  `);
  return rows;
};

const getTemplateById = async (id) => {
  const { rows } = await db.query(`
    SELECT 
      id, name, description, is_default,
      cover_page_enabled, cover_page_title, cover_page_subtitle,
      cover_page_image_url, company_logo_url,
      header_html, footer_html,
      terms_and_conditions, custom_disclaimers,
      sections_config, styling,
      created_by, created_at, updated_at
    FROM proposal_templates
    WHERE id = $1
  `, [id]);

  if (rows.length === 0) {
    throw notFoundError('Proposal template');
  }

  return rows[0];
};

const createTemplate = async (data) => {
  const id = uuidv4();
  const {
    name,
    description,
    is_default = false,
    cover_page_enabled = true,
    cover_page_title,
    cover_page_subtitle,
    cover_page_image_url,
    company_logo_url,
    header_html,
    footer_html,
    terms_and_conditions,
    custom_disclaimers = [],
    sections_config = [],
    styling = {},
    created_by
  } = data;

  if (!name) {
    throw badRequestError('Template name is required');
  }

  if (is_default) {
    await db.query(`UPDATE proposal_templates SET is_default = false WHERE is_default = true`);
  }

  const { rows } = await db.query(`
    INSERT INTO proposal_templates (
      id, name, description, is_default,
      cover_page_enabled, cover_page_title, cover_page_subtitle,
      cover_page_image_url, company_logo_url,
      header_html, footer_html,
      terms_and_conditions, custom_disclaimers,
      sections_config, styling, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `, [
    id, name, description, is_default,
    cover_page_enabled, cover_page_title, cover_page_subtitle,
    cover_page_image_url, company_logo_url,
    header_html, footer_html,
    terms_and_conditions, JSON.stringify(custom_disclaimers),
    JSON.stringify(sections_config), JSON.stringify(styling), created_by
  ]);

  return rows[0];
};

const updateTemplate = async (id, data) => {
  const existing = await getTemplateById(id);

  const {
    name = existing.name,
    description = existing.description,
    is_default = existing.is_default,
    cover_page_enabled = existing.cover_page_enabled,
    cover_page_title = existing.cover_page_title,
    cover_page_subtitle = existing.cover_page_subtitle,
    cover_page_image_url = existing.cover_page_image_url,
    company_logo_url = existing.company_logo_url,
    header_html = existing.header_html,
    footer_html = existing.footer_html,
    terms_and_conditions = existing.terms_and_conditions,
    custom_disclaimers = existing.custom_disclaimers,
    sections_config = existing.sections_config,
    styling = existing.styling
  } = data;

  if (is_default && !existing.is_default) {
    await db.query(`UPDATE proposal_templates SET is_default = false WHERE is_default = true`);
  }

  const { rows } = await db.query(`
    UPDATE proposal_templates SET
      name = $2,
      description = $3,
      is_default = $4,
      cover_page_enabled = $5,
      cover_page_title = $6,
      cover_page_subtitle = $7,
      cover_page_image_url = $8,
      company_logo_url = $9,
      header_html = $10,
      footer_html = $11,
      terms_and_conditions = $12,
      custom_disclaimers = $13,
      sections_config = $14,
      styling = $15,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [
    id, name, description, is_default,
    cover_page_enabled, cover_page_title, cover_page_subtitle,
    cover_page_image_url, company_logo_url,
    header_html, footer_html,
    terms_and_conditions, JSON.stringify(custom_disclaimers),
    JSON.stringify(sections_config), JSON.stringify(styling)
  ]);

  return rows[0];
};

const getSections = async () => {
  const { rows } = await db.query(`
    SELECT 
      id, name, section_type, title, content,
      is_system, display_order, created_at, updated_at
    FROM proposal_sections
    ORDER BY display_order ASC, name ASC
  `);
  return rows;
};

const applyTemplateToQuote = async (quoteId, templateId) => {
  const template = await getTemplateById(templateId);

  const { rows: quoteRows } = await db.query(
    `SELECT id FROM quotes WHERE id = $1`,
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  await db.query(`
    UPDATE quotes SET
      proposal_template_id = $2,
      custom_terms = COALESCE(custom_terms, $3),
      updated_at = NOW()
    WHERE id = $1
  `, [quoteId, templateId, template.terms_and_conditions]);

  const { rows } = await db.query(`
    SELECT q.*, pt.name as template_name, pt.sections_config, pt.styling
    FROM quotes q
    LEFT JOIN proposal_templates pt ON pt.id = q.proposal_template_id
    WHERE q.id = $1
  `, [quoteId]);

  return rows[0];
};

const generateProposalData = async (quoteId) => {
  const { rows: quoteRows } = await db.query(`
    SELECT 
      q.*,
      c.first_name as client_first_name,
      c.last_name as client_last_name,
      c.company_name as client_company,
      c.primary_email as client_email,
      c.primary_phone as client_phone,
      p.address_line1 as property_address,
      p.city as property_city,
      p.state as property_state,
      p.zip_code as property_zip,
      pt.name as template_name,
      pt.cover_page_enabled,
      pt.cover_page_title,
      pt.cover_page_subtitle,
      pt.cover_page_image_url,
      pt.company_logo_url,
      pt.header_html,
      pt.footer_html,
      pt.terms_and_conditions as template_terms,
      pt.custom_disclaimers,
      pt.sections_config,
      pt.styling
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    LEFT JOIN properties p ON p.id = q.property_id
    LEFT JOIN proposal_templates pt ON pt.id = q.proposal_template_id
    WHERE q.id = $1
  `, [quoteId]);

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const quote = quoteRows[0];

  const { rows: pricingOptions } = await db.query(`
    SELECT * FROM quote_pricing_options
    WHERE quote_id = $1
    ORDER BY display_order ASC
  `, [quoteId]);

  const { rows: signature } = await db.query(`
    SELECT * FROM quote_signatures WHERE quote_id = $1
  `, [quoteId]);

  const { rows: sections } = await db.query(`
    SELECT * FROM proposal_sections
    WHERE is_system = true
    ORDER BY display_order ASC
  `);

  return {
    quote: {
      id: quote.id,
      quote_number: quote.quote_number,
      status: quote.status,
      total_price: quote.total_price,
      line_items: quote.line_items,
      valid_until: quote.valid_until,
      notes: quote.notes,
      cover_letter: quote.cover_letter,
      custom_terms: quote.custom_terms || quote.template_terms,
      created_at: quote.created_at,
      version_number: quote.version_number
    },
    client: {
      name: quote.customer_name || `${quote.client_first_name || ''} ${quote.client_last_name || ''}`.trim(),
      company: quote.client_company,
      email: quote.client_email,
      phone: quote.client_phone
    },
    property: {
      address: quote.property_address,
      city: quote.property_city,
      state: quote.property_state,
      zip: quote.property_zip,
      full_address: [
        quote.property_address,
        quote.property_city,
        quote.property_state,
        quote.property_zip
      ].filter(Boolean).join(', ')
    },
    template: {
      name: quote.template_name,
      cover_page_enabled: quote.cover_page_enabled,
      cover_page_title: quote.cover_page_title,
      cover_page_subtitle: quote.cover_page_subtitle,
      cover_page_image_url: quote.cover_page_image_url,
      company_logo_url: quote.company_logo_url,
      header_html: quote.header_html,
      footer_html: quote.footer_html,
      custom_disclaimers: quote.custom_disclaimers,
      sections_config: quote.sections_config,
      styling: quote.styling
    },
    pricingOptions,
    signature: signature[0] || null,
    sections,
    generated_at: new Date().toISOString()
  };
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  getSections,
  applyTemplateToQuote,
  generateProposalData
};
