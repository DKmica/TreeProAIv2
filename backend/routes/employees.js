const express = require('express');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

router.get('/employees', 
  requirePermission(RESOURCES.EMPLOYEES, ACTIONS.LIST),
  async (req, res) => {
  try {
    const { search } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);

    const filters = [];
    const params = [];

    if (search) {
      const likeValue = `%${String(search)}%`;
      params.push(likeValue, likeValue, likeValue);
      const startIndex = params.length - 2;
      filters.push(`(
        name ILIKE $${startIndex}
        OR phone ILIKE $${startIndex + 1}
        OR job_title ILIKE $${startIndex + 2}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const baseQuery = `FROM employees ${whereClause}`;

    const selectQuery = `
      SELECT *
      ${baseQuery}
      ORDER BY name ASC
      ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
    `;

    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);

    const transformed = rows.map((row) => transformRow(row, 'employees'));

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
