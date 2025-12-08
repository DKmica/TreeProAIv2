const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { notFoundError, badRequestError } = require('../../utils/errors');
const { transformRow } = require('../../utils/transformers');
const automationService = require('../automationService');

const generateJobNumber = async () => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { rows } = await db.query(
    `SELECT job_number FROM jobs WHERE job_number LIKE $1 ORDER BY job_number DESC LIMIT 1`,
    [`J-${yearMonth}-%`]
  );
  let sequence = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].job_number;
    const parts = lastNum.split('-');
    if (parts.length === 3) {
      sequence = parseInt(parts[2], 10) + 1;
    }
  }
  return `J-${yearMonth}-${String(sequence).padStart(4, '0')}`;
};

const convertQuoteToJob = async (quoteId) => {
  const { rows: quoteRows } = await db.query(
    'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const quote = quoteRows[0];

  const allowedStatuses = ['Sent', 'Accepted'];
  if (!allowedStatuses.includes(quote.status)) {
    throw badRequestError(`Cannot convert quote with status '${quote.status}' to job. Quote must be 'Sent' or 'Accepted'.`);
  }

  if (quote.approval_status === 'rejected') {
    throw badRequestError('Cannot convert rejected quote to job');
  }

  let customerPhone = null;
  let customerEmail = null;
  let customerAddress = null;

  if (quote.client_id) {
    const { rows: clientRows } = await db.query(
      `SELECT primary_phone, primary_email, 
              billing_address_line1, billing_city, billing_state, billing_zip_code
       FROM clients WHERE id = $1`,
      [quote.client_id]
    );
    if (clientRows.length > 0) {
      const client = clientRows[0];
      customerPhone = client.primary_phone || null;
      customerEmail = client.primary_email || null;
      const addressParts = [
        client.billing_address_line1,
        client.billing_city,
        client.billing_state,
        client.billing_zip_code
      ].filter(Boolean);
      customerAddress = addressParts.length > 0 ? addressParts.join(', ') : null;
    }
  }

  let jobLocation = quote.job_location;
  if (quote.property_id) {
    const { rows: propRows } = await db.query(
      `SELECT address_line1, city, state, zip_code FROM properties WHERE id = $1`,
      [quote.property_id]
    );
    if (propRows.length > 0) {
      const prop = propRows[0];
      const propAddressParts = [prop.address_line1, prop.city, prop.state, prop.zip_code].filter(Boolean);
      if (propAddressParts.length > 0) {
        jobLocation = propAddressParts.join(', ');
      }
    }
  }

  const templateMatch = await automationService.matchTemplateForQuote(quote, db);
  const matchedTemplate = templateMatch?.template;

  const equipmentNeeded = matchedTemplate?.default_equipment_ids
    ? JSON.stringify(matchedTemplate.default_equipment_ids)
    : null;
  const completionChecklist = matchedTemplate?.completion_checklist
    ? JSON.stringify(matchedTemplate.completion_checklist)
    : null;

  const jobId = uuidv4();
  const jobNumber = await generateJobNumber();

  await db.query('BEGIN');

  try {
    const insertJobQuery = `
      INSERT INTO jobs (
        id, client_id, property_id, quote_id, job_number, status,
        customer_name, customer_phone, customer_email, customer_address,
        job_location, special_instructions,
        price, line_items, created_at,
        equipment_needed, estimated_hours, required_crew_size, job_template_id,
        completion_checklist, jha_required
      ) VALUES (
        $1, $2, $3, $4, $5, 'Scheduled', $6, $7, $8, $9, $10, $11, $12, $13, NOW(),
        $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;

    const { rows: jobRows } = await db.query(insertJobQuery, [
      jobId,
      quote.client_id,
      quote.property_id,
      quoteId,
      jobNumber,
      quote.customer_name || 'Unknown',
      customerPhone,
      customerEmail,
      customerAddress,
      jobLocation || null,
      quote.special_instructions || null,
      quote.grand_total || quote.price || 0,
      quote.line_items || '[]',
      equipmentNeeded,
      matchedTemplate?.default_duration_hours || null,
      matchedTemplate?.default_crew_size || null,
      matchedTemplate?.id || null,
      completionChecklist,
      matchedTemplate?.jha_required || false
    ]);

    await db.query(
      `UPDATE quotes SET status = 'Converted', updated_at = NOW() WHERE id = $1`,
      [quoteId]
    );

    await db.query('COMMIT');

    return transformRow(jobRows[0], 'jobs');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

module.exports = {
  convertQuoteToJob,
  generateJobNumber
};
