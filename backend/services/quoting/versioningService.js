const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { notFoundError, badRequestError } = require('../../utils/errors');

const getQuoteSnapshot = async (quoteId) => {
  const { rows: quoteRows } = await db.query(`
    SELECT 
      q.*,
      c.first_name as client_first_name,
      c.last_name as client_last_name,
      c.company_name as client_company,
      p.address_line1 as property_address,
      p.city as property_city,
      p.state as property_state
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    LEFT JOIN properties p ON p.id = q.property_id
    WHERE q.id = $1
  `, [quoteId]);

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const { rows: pricingOptions } = await db.query(`
    SELECT * FROM quote_pricing_options WHERE quote_id = $1
  `, [quoteId]);

  return {
    quote: quoteRows[0],
    pricing_options: pricingOptions,
    snapshot_at: new Date().toISOString()
  };
};

const createVersion = async (quoteId, changesSummary = null, createdBy = null) => {
  const snapshot = await getQuoteSnapshot(quoteId);

  const { rows: versionRows } = await db.query(`
    SELECT COALESCE(MAX(version_number), 0) as max_version
    FROM quote_versions
    WHERE quote_id = $1
  `, [quoteId]);

  const nextVersion = (versionRows[0]?.max_version || 0) + 1;

  const id = uuidv4();
  const { rows } = await db.query(`
    INSERT INTO quote_versions (
      id, quote_id, version_number, version_name,
      changes_summary, snapshot_data, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    id, quoteId, nextVersion, `Version ${nextVersion}`,
    changesSummary, JSON.stringify(snapshot), createdBy
  ]);

  await db.query(`
    UPDATE quotes SET version_number = $2, updated_at = NOW()
    WHERE id = $1
  `, [quoteId, nextVersion]);

  return rows[0];
};

const getVersionHistory = async (quoteId) => {
  const { rows: quoteRows } = await db.query(
    `SELECT id FROM quotes WHERE id = $1`,
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const { rows } = await db.query(`
    SELECT 
      id, quote_id, version_number, version_name,
      changes_summary, created_by, created_at
    FROM quote_versions
    WHERE quote_id = $1
    ORDER BY version_number DESC
  `, [quoteId]);

  return rows;
};

const getVersion = async (versionId) => {
  const { rows } = await db.query(`
    SELECT 
      id, quote_id, version_number, version_name,
      changes_summary, snapshot_data, created_by, created_at
    FROM quote_versions
    WHERE id = $1
  `, [versionId]);

  if (rows.length === 0) {
    throw notFoundError('Quote version');
  }

  return rows[0];
};

const restoreVersion = async (quoteId, versionId) => {
  const version = await getVersion(versionId);

  if (version.quote_id !== quoteId) {
    throw badRequestError('Version does not belong to this quote');
  }

  const snapshot = typeof version.snapshot_data === 'string'
    ? JSON.parse(version.snapshot_data)
    : version.snapshot_data;

  const quoteData = snapshot.quote;

  await createVersion(quoteId, `Auto-save before restore to version ${version.version_number}`, 'system');

  await db.query(`
    UPDATE quotes SET
      customer_name = $2,
      line_items = $3,
      total_price = $4,
      notes = $5,
      valid_until = $6,
      cover_letter = $7,
      custom_terms = $8,
      updated_at = NOW()
    WHERE id = $1
  `, [
    quoteId,
    quoteData.customer_name,
    JSON.stringify(quoteData.line_items),
    quoteData.total_price,
    quoteData.notes,
    quoteData.valid_until,
    quoteData.cover_letter,
    quoteData.custom_terms
  ]);

  if (snapshot.pricing_options && snapshot.pricing_options.length > 0) {
    await db.query(`DELETE FROM quote_pricing_options WHERE quote_id = $1`, [quoteId]);

    for (const option of snapshot.pricing_options) {
      await db.query(`
        INSERT INTO quote_pricing_options (
          id, quote_id, option_tier, option_name, description,
          line_items, subtotal, discount_amount, discount_percentage,
          tax_amount, total, is_recommended, is_selected,
          display_order, features, exclusions, warranty_info, estimated_duration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        uuidv4(), quoteId, option.option_tier, option.option_name, option.description,
        JSON.stringify(option.line_items), option.subtotal, option.discount_amount, option.discount_percentage,
        option.tax_amount, option.total, option.is_recommended, option.is_selected,
        option.display_order, JSON.stringify(option.features), JSON.stringify(option.exclusions),
        option.warranty_info, option.estimated_duration
      ]);
    }
  }

  const { rows } = await db.query(`SELECT * FROM quotes WHERE id = $1`, [quoteId]);
  return {
    quote: rows[0],
    restored_from_version: version.version_number,
    restored_at: new Date().toISOString()
  };
};

const compareVersions = async (v1Id, v2Id) => {
  const [version1, version2] = await Promise.all([
    getVersion(v1Id),
    getVersion(v2Id)
  ]);

  const snapshot1 = typeof version1.snapshot_data === 'string'
    ? JSON.parse(version1.snapshot_data)
    : version1.snapshot_data;
  const snapshot2 = typeof version2.snapshot_data === 'string'
    ? JSON.parse(version2.snapshot_data)
    : version2.snapshot_data;

  const quote1 = snapshot1.quote;
  const quote2 = snapshot2.quote;

  const differences = {
    version1: {
      id: version1.id,
      version_number: version1.version_number,
      created_at: version1.created_at
    },
    version2: {
      id: version2.id,
      version_number: version2.version_number,
      created_at: version2.created_at
    },
    changes: []
  };

  const fieldsToCompare = [
    { key: 'customer_name', label: 'Customer Name' },
    { key: 'total_price', label: 'Total Price' },
    { key: 'notes', label: 'Notes' },
    { key: 'valid_until', label: 'Valid Until' },
    { key: 'cover_letter', label: 'Cover Letter' },
    { key: 'custom_terms', label: 'Custom Terms' },
    { key: 'status', label: 'Status' }
  ];

  for (const field of fieldsToCompare) {
    const val1 = quote1[field.key];
    const val2 = quote2[field.key];

    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      differences.changes.push({
        field: field.label,
        key: field.key,
        version1_value: val1,
        version2_value: val2
      });
    }
  }

  const lineItems1 = quote1.line_items || [];
  const lineItems2 = quote2.line_items || [];

  if (JSON.stringify(lineItems1) !== JSON.stringify(lineItems2)) {
    differences.changes.push({
      field: 'Line Items',
      key: 'line_items',
      version1_count: lineItems1.length,
      version2_count: lineItems2.length,
      version1_total: lineItems1.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0),
      version2_total: lineItems2.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
    });
  }

  const options1 = snapshot1.pricing_options || [];
  const options2 = snapshot2.pricing_options || [];

  if (options1.length !== options2.length) {
    differences.changes.push({
      field: 'Pricing Options',
      key: 'pricing_options',
      version1_count: options1.length,
      version2_count: options2.length
    });
  }

  return differences;
};

module.exports = {
  createVersion,
  getVersionHistory,
  getVersion,
  restoreVersion,
  compareVersions
};
