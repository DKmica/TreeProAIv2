const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateJobNumber } = require('./numberService');

const normalizeText = (value) => {
  if (!value) return '';
  return value.toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
};

const calculateTemplateScore = (template, lineItems) => {
  const normalizedTemplateName = normalizeText(template.name);
  const normalizedCategory = normalizeText(template.category);
  const templateLines = Array.isArray(template.line_items) ? template.line_items : [];

  let score = 0;

  if (normalizedTemplateName && lineItems.some(item => item.includes(normalizedTemplateName))) {
    score += 3;
  }

  if (normalizedCategory && lineItems.some(item => item.includes(normalizedCategory))) {
    score += 1;
  }

  templateLines.forEach(item => {
    const description = normalizeText(item.description || item.item || '');
    if (!description) return;
    const match = lineItems.some(line => line.includes(description) || description.includes(line));
    if (match) {
      score += 2;
    }
  });

  return score;
};

const matchTemplateForQuote = async (quote, client = db) => {
  let rawLineItems = quote.line_items || [];

  if (typeof rawLineItems === 'string') {
    try {
      rawLineItems = JSON.parse(rawLineItems);
    } catch (error) {
      rawLineItems = [];
    }
  }

  const selectedLines = (rawLineItems || [])
    .filter(item => item && item.selected !== false)
    .map(item => normalizeText(item.description || item.tree || ''))
    .filter(Boolean);

  if (selectedLines.length === 0) {
    return null;
  }

  const { rows: templates } = await client.query(
    `SELECT id, name, category, default_duration_hours, default_crew_size, default_equipment_ids,
            completion_checklist, jha_required, line_items
     FROM job_templates
     WHERE deleted_at IS NULL`
  );

  let bestMatch = null;
  let bestScore = 0;

  templates.forEach(template => {
    const score = calculateTemplateScore(template, selectedLines);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  });

  if (!bestMatch || bestScore === 0) {
    return null;
  }

  return { template: bestMatch, score: bestScore };
};

const sanitizeUUID = (value) => {
  if (!value || typeof value !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
};

const fetchQuote = async (quoteId, client = db) => {
  const { rows } = await client.query(
    'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
    [quoteId]
  );
  return rows[0] || null;
};

const createJobFromApprovedQuote = async (quoteId) => {
  const sanitizedId = sanitizeUUID(quoteId);
  if (!sanitizedId) {
    throw new Error('Invalid quote ID');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const quote = await fetchQuote(sanitizedId, client);
    if (!quote) {
      throw new Error('Quote not found');
    }

    const approvalOk = quote.approval_status === 'approved';
    const statusOk = ['Accepted', 'Sent'].includes(quote.status);

    if (!approvalOk && !statusOk) {
      throw new Error('Quote is not approved or ready for conversion');
    }

    const { rows: existingJobs } = await client.query(
      'SELECT id FROM jobs WHERE quote_id = $1 LIMIT 1',
      [sanitizedId]
    );

    if (existingJobs.length) {
      await client.query('COMMIT');
      return {
        status: 'exists',
        job: existingJobs[0]
      };
    }

    const templateMatch = await matchTemplateForQuote(quote, client);
    const matchedTemplate = templateMatch?.template;

    const equipmentNeeded = matchedTemplate?.default_equipment_ids
      ? JSON.stringify(matchedTemplate.default_equipment_ids)
      : null;
    const completionChecklist = matchedTemplate?.completion_checklist
      ? JSON.stringify(matchedTemplate.completion_checklist)
      : null;

    const jobId = uuidv4();
    const jobNumber = await generateJobNumber();

    const insertJobQuery = `
      INSERT INTO jobs (
        id, client_id, property_id, quote_id, job_number, status,
        customer_name, job_location, special_instructions,
        line_items, created_at,
        equipment_needed, estimated_hours, required_crew_size, job_template_id,
        completion_checklist, jha_required
      ) VALUES (
        $1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, NOW(),
        $10, $11, $12, $13, $14, $15
      ) RETURNING *
    `;

    const { rows: jobRows } = await client.query(insertJobQuery, [
      jobId,
      quote.client_id,
      quote.property_id,
      sanitizedId,
      jobNumber,
      quote.customer_name || 'Unknown',
      quote.job_location || null,
      quote.special_instructions || null,
      quote.line_items || '[]',
      equipmentNeeded,
      matchedTemplate?.default_duration_hours || null,
      matchedTemplate?.default_crew_size || null,
      matchedTemplate?.id || null,
      completionChecklist,
      matchedTemplate?.jha_required || false
    ]);

    await client.query(
      `UPDATE quotes
       SET status = 'Converted', updated_at = NOW()
       WHERE id = $1`,
      [sanitizedId]
    );

    await client.query('COMMIT');

    return {
      status: 'created',
      job: jobRows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createJobFromApprovedQuote,
  matchTemplateForQuote
};
