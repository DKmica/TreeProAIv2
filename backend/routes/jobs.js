const express = require('express');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const router = express.Router();

router.get('/jobs', async (req, res) => {
  try {
    const { status, search } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);

    const filters = [];
    const params = [];

    if (status) {
      params.push(status);
      filters.push(`j.status = $${params.length}`);
    }

    if (search) {
      const likeValue = `%${String(search)}%`;
      params.push(likeValue, likeValue, likeValue, likeValue);
      const startIndex = params.length - 3;
      filters.push(`(
        j.customer_name ILIKE $${startIndex}
        OR j.job_location ILIKE $${startIndex + 1}
        OR j.special_instructions ILIKE $${startIndex + 2}
        OR j.job_number ILIKE $${startIndex + 3}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const baseQuery = `
      FROM jobs j
      LEFT JOIN quotes q ON q.id = j.quote_id
      ${whereClause}
    `;

    const selectQuery = `
      SELECT
        j.*,
        q.quote_number,
        q.version AS quote_version,
        q.approval_status AS quote_approval_status,
        q.approved_by AS quote_approved_by,
        q.approved_at AS quote_approved_at
      ${baseQuery}
      ORDER BY j.created_at DESC
      ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
    `;

    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);

    const transformed = rows.map((row) => transformRow(row, 'jobs'));

    if (!usePagination) {
      return res.json(transformed);
    }

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = Number.parseInt(countRows[0]?.total, 10) || 0;

    res.json({
      success: true,
      data: transformed,
      pagination: buildPaginationMeta(total, page, pageSize),
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
