const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { notFoundError, badRequestError } = require('../../utils/errors');

const calculateTotals = (lineItems, discountAmount = 0, discountPercentage = 0, taxRate = 0) => {
  const subtotal = (lineItems || []).reduce((sum, item) => {
    return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
  }, 0);

  let discount = parseFloat(discountAmount) || 0;
  if (discountPercentage > 0) {
    discount = subtotal * (parseFloat(discountPercentage) / 100);
  }

  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (parseFloat(taxRate) / 100);
  const total = afterDiscount + tax;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount_amount: parseFloat(discount.toFixed(2)),
    tax_amount: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

const getOptionsForQuote = async (quoteId) => {
  const { rows: quoteRows } = await db.query(
    `SELECT id FROM quotes WHERE id = $1`,
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const { rows } = await db.query(`
    SELECT 
      id, quote_id, option_tier, option_name, description,
      line_items, subtotal, discount_amount, discount_percentage,
      tax_amount, total, is_recommended, is_selected,
      display_order, features, exclusions, warranty_info,
      estimated_duration, created_at, updated_at
    FROM quote_pricing_options
    WHERE quote_id = $1
    ORDER BY display_order ASC
  `, [quoteId]);

  return rows;
};

const createOption = async (quoteId, data) => {
  const { rows: quoteRows } = await db.query(
    `SELECT id FROM quotes WHERE id = $1`,
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const {
    option_tier,
    option_name,
    description,
    line_items = [],
    discount_amount = 0,
    discount_percentage = 0,
    tax_rate = 0,
    is_recommended = false,
    display_order,
    features = [],
    exclusions = [],
    warranty_info,
    estimated_duration
  } = data;

  if (!option_tier || !option_name) {
    throw badRequestError('option_tier and option_name are required');
  }

  const totals = calculateTotals(line_items, discount_amount, discount_percentage, tax_rate);

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) as count FROM quote_pricing_options WHERE quote_id = $1`,
    [quoteId]
  );
  const order = display_order !== undefined ? display_order : parseInt(countRows[0].count);

  if (is_recommended) {
    await db.query(
      `UPDATE quote_pricing_options SET is_recommended = false WHERE quote_id = $1`,
      [quoteId]
    );
  }

  const id = uuidv4();
  const { rows } = await db.query(`
    INSERT INTO quote_pricing_options (
      id, quote_id, option_tier, option_name, description,
      line_items, subtotal, discount_amount, discount_percentage,
      tax_amount, total, is_recommended, is_selected,
      display_order, features, exclusions, warranty_info, estimated_duration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *
  `, [
    id, quoteId, option_tier, option_name, description,
    JSON.stringify(line_items), totals.subtotal, totals.discount_amount, discount_percentage,
    totals.tax_amount, totals.total, is_recommended, false,
    order, JSON.stringify(features), JSON.stringify(exclusions), warranty_info, estimated_duration
  ]);

  if (parseInt(countRows[0].count) === 0) {
    await db.query(
      `UPDATE quotes SET has_multiple_options = true, updated_at = NOW() WHERE id = $1`,
      [quoteId]
    );
  }

  return rows[0];
};

const updateOption = async (optionId, data) => {
  const { rows: existingRows } = await db.query(
    `SELECT * FROM quote_pricing_options WHERE id = $1`,
    [optionId]
  );

  if (existingRows.length === 0) {
    throw notFoundError('Pricing option');
  }

  const existing = existingRows[0];

  const {
    option_tier = existing.option_tier,
    option_name = existing.option_name,
    description = existing.description,
    line_items = existing.line_items,
    discount_amount = existing.discount_amount,
    discount_percentage = existing.discount_percentage,
    tax_rate = 0,
    is_recommended = existing.is_recommended,
    display_order = existing.display_order,
    features = existing.features,
    exclusions = existing.exclusions,
    warranty_info = existing.warranty_info,
    estimated_duration = existing.estimated_duration
  } = data;

  const totals = calculateTotals(line_items, discount_amount, discount_percentage, tax_rate);

  if (is_recommended && !existing.is_recommended) {
    await db.query(
      `UPDATE quote_pricing_options SET is_recommended = false WHERE quote_id = $1`,
      [existing.quote_id]
    );
  }

  const { rows } = await db.query(`
    UPDATE quote_pricing_options SET
      option_tier = $2,
      option_name = $3,
      description = $4,
      line_items = $5,
      subtotal = $6,
      discount_amount = $7,
      discount_percentage = $8,
      tax_amount = $9,
      total = $10,
      is_recommended = $11,
      display_order = $12,
      features = $13,
      exclusions = $14,
      warranty_info = $15,
      estimated_duration = $16,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [
    optionId, option_tier, option_name, description,
    JSON.stringify(line_items), totals.subtotal, totals.discount_amount, discount_percentage,
    totals.tax_amount, totals.total, is_recommended,
    display_order, JSON.stringify(features), JSON.stringify(exclusions),
    warranty_info, estimated_duration
  ]);

  return rows[0];
};

const deleteOption = async (optionId) => {
  const { rows: existingRows } = await db.query(
    `SELECT quote_id FROM quote_pricing_options WHERE id = $1`,
    [optionId]
  );

  if (existingRows.length === 0) {
    throw notFoundError('Pricing option');
  }

  const quoteId = existingRows[0].quote_id;

  await db.query(`DELETE FROM quote_pricing_options WHERE id = $1`, [optionId]);

  const { rows: remainingRows } = await db.query(
    `SELECT COUNT(*) as count FROM quote_pricing_options WHERE quote_id = $1`,
    [quoteId]
  );

  if (parseInt(remainingRows[0].count) === 0) {
    await db.query(
      `UPDATE quotes SET has_multiple_options = false, selected_option_id = NULL, updated_at = NOW() WHERE id = $1`,
      [quoteId]
    );
  }

  return { success: true, deleted: optionId };
};

const setRecommended = async (optionId) => {
  const { rows: existingRows } = await db.query(
    `SELECT quote_id FROM quote_pricing_options WHERE id = $1`,
    [optionId]
  );

  if (existingRows.length === 0) {
    throw notFoundError('Pricing option');
  }

  const quoteId = existingRows[0].quote_id;

  await db.query(
    `UPDATE quote_pricing_options SET is_recommended = false WHERE quote_id = $1`,
    [quoteId]
  );

  const { rows } = await db.query(`
    UPDATE quote_pricing_options SET is_recommended = true, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [optionId]);

  return rows[0];
};

const selectOption = async (quoteId, optionId) => {
  const { rows: quoteRows } = await db.query(
    `SELECT id FROM quotes WHERE id = $1`,
    [quoteId]
  );

  if (quoteRows.length === 0) {
    throw notFoundError('Quote');
  }

  const { rows: optionRows } = await db.query(
    `SELECT * FROM quote_pricing_options WHERE id = $1 AND quote_id = $2`,
    [optionId, quoteId]
  );

  if (optionRows.length === 0) {
    throw notFoundError('Pricing option for this quote');
  }

  await db.query(
    `UPDATE quote_pricing_options SET is_selected = false WHERE quote_id = $1`,
    [quoteId]
  );

  await db.query(
    `UPDATE quote_pricing_options SET is_selected = true, updated_at = NOW() WHERE id = $1`,
    [optionId]
  );

  const selectedOption = optionRows[0];
  await db.query(`
    UPDATE quotes SET
      selected_option_id = $2,
      total_price = $3,
      updated_at = NOW()
    WHERE id = $1
  `, [quoteId, optionId, selectedOption.total]);

  return {
    quote_id: quoteId,
    selected_option_id: optionId,
    total: selectedOption.total
  };
};

module.exports = {
  getOptionsForQuote,
  createOption,
  updateOption,
  deleteOption,
  setRecommended,
  selectOption,
  calculateTotals
};
