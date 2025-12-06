const express = require('express');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

router.get('/invoices', 
  requirePermission(RESOURCES.INVOICES, ACTIONS.LIST),
  async (req, res) => {
  try {
    const { status, search, clientId, startDate, endDate } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);

    const filters = [];
    const params = [];

    if (status) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }

    if (clientId) {
      params.push(clientId);
      filters.push(`client_id = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      filters.push(`issue_date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      filters.push(`issue_date <= $${params.length}`);
    }

    if (search) {
      const likeValue = `%${String(search)}%`;
      params.push(likeValue, likeValue, likeValue);
      const startIndex = params.length - 2;
      filters.push(`(
        customer_name ILIKE $${startIndex}
        OR invoice_number ILIKE $${startIndex + 1}
        OR notes ILIKE $${startIndex + 2}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const baseQuery = `FROM invoices ${whereClause}`;

    const selectQuery = `
      SELECT *
      ${baseQuery}
      ORDER BY created_at DESC
      ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
    `;

    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);

    const invoicesWithPayments = await Promise.all(rows.map(async (invoice) => {
      const paymentQuery = 'SELECT * FROM payment_records WHERE invoice_id = $1 ORDER BY payment_date DESC';
      const { rows: payments } = await db.query(paymentQuery, [invoice.id]);

      const transformed = transformRow(invoice, 'invoices');
      transformed.payments = payments.map(p => transformRow(p, 'payment_records'));

      return transformed;
    }));

    if (!usePagination) {
      return res.json({
        success: true,
        data: invoicesWithPayments
      });
    }

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = Number.parseInt(countRows[0]?.total, 10) || 0;

    res.json({
      success: true,
      data: invoicesWithPayments,
      pagination: buildPaginationMeta(total, page, pageSize),
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
