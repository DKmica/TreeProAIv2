const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateJobNumber } = require('./numberService');

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

    const jobId = uuidv4();
    const jobNumber = await generateJobNumber();

    const insertJobQuery = `
      INSERT INTO jobs (
        id, client_id, property_id, quote_id, job_number, status,
        customer_name, job_location, special_instructions,
        price, line_items, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, NOW()
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
      quote.grand_total || quote.price || 0,
      quote.line_items || '[]'
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
  createJobFromApprovedQuote
};
