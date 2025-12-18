const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { sanitizeUUID } = require('../utils/formatters');
const { normalizeText, normalizeEmail, normalizePhone } = require('../utils/helpers');
const { CLIENT_CATEGORIES } = require('../utils/constants');

const setClientCategory = async (clientId, category) => {
  if (!clientId || !category) {
    return;
  }

  await db.query(
    `UPDATE clients
       SET client_category = $1,
           updated_at = NOW()
     WHERE id = $2
       AND (client_category IS DISTINCT FROM $1 OR client_category IS NULL)`,
    [category, clientId]
  );
};

const updateClientCategoryFromJobs = async (clientId) => {
  if (!clientId) return;

  const { rows } = await db.query(
    `SELECT COUNT(*) AS completed_jobs
       FROM jobs
      WHERE client_id = $1
        AND LOWER(status) = 'completed'`,
    [clientId]
  );

  const completedJobs = parseInt(rows[0]?.completed_jobs || 0, 10);
  const nextCategory = completedJobs > 0 ? CLIENT_CATEGORIES.ACTIVE : CLIENT_CATEGORIES.POTENTIAL;
  await setClientCategory(clientId, nextCategory);
};

const markClientAsPotential = async (clientId) => {
  if (!clientId) return;

  const { rows } = await db.query(
    `SELECT COUNT(*) AS completed_jobs
       FROM jobs
      WHERE client_id = $1
        AND LOWER(status) = 'completed'`,
    [clientId]
  );

  const completedJobs = parseInt(rows[0]?.completed_jobs || 0, 10);
  if (completedJobs === 0) {
    await setClientCategory(clientId, CLIENT_CATEGORIES.POTENTIAL);
  }
};

const ensureClientAssociation = async ({ clientId, customerDetails = {}, defaultClientType = 'residential' }) => {
  const sanitizedClientId = sanitizeUUID(clientId);
  const normalizedDetails = {
    first_name: normalizeText(customerDetails.firstName),
    last_name: normalizeText(customerDetails.lastName),
    company_name: normalizeText(customerDetails.companyName),
    primary_email: normalizeEmail(customerDetails.email),
    primary_phone: normalizePhone(customerDetails.phone),
    billing_address_line1: normalizeText(customerDetails.addressLine1),
    billing_address_line2: normalizeText(customerDetails.addressLine2),
    billing_city: normalizeText(customerDetails.city),
    billing_state: normalizeText(customerDetails.state),
    billing_zip_code: normalizeText(customerDetails.zipCode),
    billing_country: normalizeText(customerDetails.country) || 'USA'
  };

  let clientRow = null;

  if (sanitizedClientId) {
    const { rows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [sanitizedClientId]
    );
    clientRow = rows[0] || null;
  }

  if (!clientRow) {
    const conditions = [];
    const params = [];
    if (normalizedDetails.primary_email) {
      conditions.push(`LOWER(primary_email) = $${params.length + 1}`);
      params.push(normalizedDetails.primary_email);
    }
    if (normalizedDetails.primary_phone) {
      conditions.push(`REGEXP_REPLACE(COALESCE(primary_phone, ''), '[^0-9]', '', 'g') = $${params.length + 1}`);
      params.push(normalizedDetails.primary_phone);
    }

    if (conditions.length > 0) {
      const { rows } = await db.query(
        `SELECT * FROM clients WHERE deleted_at IS NULL AND (${conditions.join(' OR ')}) LIMIT 1`,
        params
      );
      clientRow = rows[0] || null;
    }
  }

  if (clientRow) {
    const updates = {};
    Object.entries(normalizedDetails).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        updates[key] = value;
      }
    });

    if (Object.keys(updates).length > 0) {
      const columns = Object.keys(updates);
      const values = Object.values(updates);
      const setString = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
      await db.query(
        `UPDATE clients SET ${setString}, updated_at = NOW() WHERE id = $1`,
        [clientRow.id, ...values]
      );

      const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [clientRow.id]);
      clientRow = rows[0];
    }

    await markClientAsPotential(clientRow.id);
    return { clientId: clientRow.id, client: clientRow, created: false };
  }

  if (!normalizedDetails.first_name && !normalizedDetails.last_name && !normalizedDetails.company_name) {
    throw new Error('Client name or company is required to create a record');
  }

  const newClientId = sanitizedClientId || uuidv4();
  const insertData = {
    id: newClientId,
    first_name: normalizedDetails.first_name,
    last_name: normalizedDetails.last_name,
    company_name: normalizedDetails.company_name,
    primary_email: normalizedDetails.primary_email,
    primary_phone: normalizedDetails.primary_phone,
    billing_address_line1: normalizedDetails.billing_address_line1,
    billing_address_line2: normalizedDetails.billing_address_line2,
    billing_city: normalizedDetails.billing_city,
    billing_state: normalizedDetails.billing_state,
    billing_zip_code: normalizedDetails.billing_zip_code,
    billing_country: normalizedDetails.billing_country,
    status: 'active',
    client_type: defaultClientType,
    client_category: CLIENT_CATEGORIES.POTENTIAL,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const columns = Object.keys(insertData).filter((key) => insertData[key] !== undefined);
  const values = columns.map((key) => insertData[key]);
  const placeholders = columns.map((_, index) => `$${index + 1}`);

  const { rows } = await db.query(
    `INSERT INTO clients (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );

  clientRow = rows[0];
  await markClientAsPotential(clientRow.id);
  return { clientId: clientRow.id, client: clientRow, created: true };
};

module.exports = {
  CLIENT_CATEGORIES,
  ensureClientAssociation,
  markClientAsPotential,
  setClientCategory,
  updateClientCategoryFromJobs,
};
