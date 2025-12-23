const express = require('express');
const { v4: uuidv4 } = require('uuid');
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

router.get('/employees/:id',
  requirePermission(RESOURCES.EMPLOYEES, ACTIONS.VIEW),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    res.json(transformRow(rows[0], 'employees'));
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/employees',
  requirePermission(RESOURCES.EMPLOYEES, ACTIONS.CREATE),
  async (req, res) => {
  try {
    const {
      name, phone, address, streetAddress, city, state, zipCode,
      ssn, dob, jobTitle, payRate, commissionRate, hireDate, certifications,
      coordinates, defaultCommissionRate, isSalesman
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    
    const id = uuidv4();
    const lat = coordinates?.lat || null;
    const lon = coordinates?.lng || null;
    
    const { rows } = await db.query(`
      INSERT INTO employees (
        id, name, phone, address, street_address, city, state, zip_code,
        ssn, dob, job_title, pay_rate, commission_rate, hire_date, certifications,
        lat, lon, default_commission_rate, is_salesman
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `, [
      id, name, phone || null, address || null, streetAddress || null,
      city || null, state || null, zipCode || null, ssn || null, dob || null,
      jobTitle || null, payRate || null, commissionRate || null, hireDate || null,
      certifications || null, lat, lon, defaultCommissionRate || 0,
      isSalesman || (jobTitle === 'Salesman')
    ]);
    
    res.status(201).json(transformRow(rows[0], 'employees'));
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/employees/:id',
  requirePermission(RESOURCES.EMPLOYEES, ACTIONS.UPDATE),
  async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, address, streetAddress, city, state, zipCode,
      ssn, dob, jobTitle, payRate, commissionRate, hireDate, certifications,
      coordinates, defaultCommissionRate, isSalesman
    } = req.body;
    
    const existingResult = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    const existing = existingResult.rows[0];
    const lat = coordinates?.lat ?? existing.lat;
    const lon = coordinates?.lng ?? existing.lon;
    
    const { rows } = await db.query(`
      UPDATE employees SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        street_address = COALESCE($4, street_address),
        city = COALESCE($5, city),
        state = COALESCE($6, state),
        zip_code = COALESCE($7, zip_code),
        ssn = COALESCE($8, ssn),
        dob = COALESCE($9, dob),
        job_title = COALESCE($10, job_title),
        pay_rate = COALESCE($11, pay_rate),
        commission_rate = $12,
        hire_date = COALESCE($13, hire_date),
        certifications = COALESCE($14, certifications),
        lat = $15,
        lon = $16,
        default_commission_rate = COALESCE($17, default_commission_rate),
        is_salesman = COALESCE($18, is_salesman)
      WHERE id = $19
      RETURNING *
    `, [
      name, phone, address, streetAddress, city, state, zipCode,
      ssn, dob, jobTitle, payRate, commissionRate ?? null, hireDate, certifications,
      lat, lon, defaultCommissionRate, isSalesman ?? (jobTitle === 'Salesman'), id
    ]);
    
    res.json(transformRow(rows[0], 'employees'));
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/employees/:id',
  requirePermission(RESOURCES.EMPLOYEES, ACTIONS.DELETE),
  async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rowCount } = await db.query('DELETE FROM employees WHERE id = $1', [id]);
    
    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
