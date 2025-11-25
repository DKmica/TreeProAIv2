const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { notFoundError, badRequestError } = require('../../utils/errors');

const requestSignature = async (quoteId, signerInfo) => {
  const { rows: quoteRows } = await db.query(`
    SELECT id, quote_number, customer_name, status
    FROM quotes WHERE id = $1
  `, [quoteId]);

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const quote = quoteRows[0];

  const { rows: existingSignature } = await db.query(
    `SELECT id FROM quote_signatures WHERE quote_id = $1`,
    [quoteId]
  );

  if (existingSignature.length > 0) {
    throw badRequestError('Quote already has a signature');
  }

  const {
    signer_name = quote.customer_name,
    signer_email,
    signer_phone
  } = signerInfo || {};

  if (!signer_name) {
    throw badRequestError('Signer name is required');
  }

  await db.query(`
    UPDATE quotes SET signature_required = true, updated_at = NOW()
    WHERE id = $1
  `, [quoteId]);

  return {
    quote_id: quoteId,
    quote_number: quote.quote_number,
    signer_name,
    signer_email,
    signer_phone,
    signature_requested: true,
    request_created_at: new Date().toISOString()
  };
};

const captureSignature = async (quoteId, signatureData, metadata = {}) => {
  const { rows: quoteRows } = await db.query(`
    SELECT id, quote_number, status FROM quotes WHERE id = $1
  `, [quoteId]);

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const {
    signer_name,
    signer_email,
    signer_phone,
    signature_data,
    signature_type = 'drawn',
    terms_accepted = true,
    terms_version = '1.0',
    ip_address,
    user_agent
  } = signatureData;

  if (!signer_name) {
    throw badRequestError('Signer name is required');
  }

  if (!signature_data) {
    throw badRequestError('Signature data is required');
  }

  const validTypes = ['drawn', 'typed', 'uploaded'];
  if (!validTypes.includes(signature_type)) {
    throw badRequestError(`Signature type must be one of: ${validTypes.join(', ')}`);
  }

  const { rows: existingSignature } = await db.query(
    `SELECT id FROM quote_signatures WHERE quote_id = $1`,
    [quoteId]
  );

  if (existingSignature.length > 0) {
    throw badRequestError('Quote already has a signature. Cannot sign again.');
  }

  const id = uuidv4();
  const { rows } = await db.query(`
    INSERT INTO quote_signatures (
      id, quote_id, signer_name, signer_email, signer_phone,
      signature_data, signature_type, ip_address, user_agent,
      terms_accepted, terms_version, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    id, quoteId, signer_name, signer_email, signer_phone,
    signature_data, signature_type, ip_address || metadata.ip_address, user_agent || metadata.user_agent,
    terms_accepted, terms_version, JSON.stringify(metadata)
  ]);

  await db.query(`
    UPDATE quotes SET
      status = 'Approved',
      signed_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [quoteId]);

  return rows[0];
};

const getSignature = async (quoteId) => {
  const { rows: quoteRows } = await db.query(
    `SELECT id FROM quotes WHERE id = $1`,
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const { rows } = await db.query(`
    SELECT 
      id, quote_id, signer_name, signer_email, signer_phone,
      signature_data, signature_type, ip_address, user_agent,
      signed_at, terms_accepted, terms_version, metadata
    FROM quote_signatures
    WHERE quote_id = $1
  `, [quoteId]);

  return rows[0] || null;
};

const validateSignature = async (signatureId) => {
  const { rows } = await db.query(`
    SELECT 
      s.id, s.quote_id, s.signer_name, s.signer_email,
      s.signature_type, s.signed_at, s.terms_accepted,
      s.terms_version, s.ip_address, s.user_agent,
      q.quote_number, q.status as quote_status
    FROM quote_signatures s
    JOIN quotes q ON q.id = s.quote_id
    WHERE s.id = $1
  `, [signatureId]);

  if (rows.length === 0) {
    throw notFoundError('Signature');
  }

  const signature = rows[0];

  const validation = {
    signature_id: signature.id,
    is_valid: true,
    validation_checks: [],
    validated_at: new Date().toISOString()
  };

  if (signature.signer_name && signature.signer_name.trim().length > 0) {
    validation.validation_checks.push({
      check: 'signer_name_present',
      passed: true,
      details: 'Signer name is present'
    });
  } else {
    validation.is_valid = false;
    validation.validation_checks.push({
      check: 'signer_name_present',
      passed: false,
      details: 'Signer name is missing'
    });
  }

  if (signature.signed_at) {
    validation.validation_checks.push({
      check: 'timestamp_present',
      passed: true,
      details: `Signed at ${signature.signed_at}`
    });
  } else {
    validation.is_valid = false;
    validation.validation_checks.push({
      check: 'timestamp_present',
      passed: false,
      details: 'Signature timestamp is missing'
    });
  }

  if (signature.terms_accepted) {
    validation.validation_checks.push({
      check: 'terms_accepted',
      passed: true,
      details: `Terms version ${signature.terms_version} accepted`
    });
  } else {
    validation.is_valid = false;
    validation.validation_checks.push({
      check: 'terms_accepted',
      passed: false,
      details: 'Terms were not accepted'
    });
  }

  if (signature.ip_address) {
    validation.validation_checks.push({
      check: 'ip_recorded',
      passed: true,
      details: `IP address: ${signature.ip_address}`
    });
  } else {
    validation.validation_checks.push({
      check: 'ip_recorded',
      passed: false,
      details: 'IP address not recorded (optional)'
    });
  }

  validation.quote_number = signature.quote_number;
  validation.quote_status = signature.quote_status;
  validation.signer = {
    name: signature.signer_name,
    email: signature.signer_email
  };

  return validation;
};

module.exports = {
  requestSignature,
  captureSignature,
  getSignature,
  validateSignature
};
