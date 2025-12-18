const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

const transformUsageRow = (row) => ({
  id: row.id,
  equipmentId: row.equipment_id,
  jobId: row.job_id,
  usedBy: row.used_by,
  startTime: row.start_time,
  endTime: row.end_time,
  hoursUsed: row.hours_used ? parseFloat(row.hours_used) : null,
  notes: row.notes,
  createdAt: row.created_at,
  equipmentName: row.equipment_name,
  employeeName: row.employee_name,
  jobNumber: row.job_number,
});

const transformMaintenanceRow = (row) => ({
  id: row.id,
  equipmentId: row.equipment_id,
  maintenanceType: row.maintenance_type,
  scheduledDate: row.scheduled_date,
  actualDate: row.actual_date,
  performedBy: row.performed_by,
  cost: row.cost ? parseFloat(row.cost) : null,
  notes: row.notes,
  status: row.status,
  nextDueDate: row.next_due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  equipmentName: row.equipment_name,
  performedByName: row.performed_by_name,
});

router.get('/equipment', 
  requirePermission(RESOURCES.EQUIPMENT, ACTIONS.LIST),
  async (req, res) => {
  try {
    const { search, status } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);

    const filters = [];
    const params = [];

    if (status) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }

    if (search) {
      const likeValue = `%${String(search)}%`;
      params.push(likeValue, likeValue, likeValue);
      const startIndex = params.length - 2;
      filters.push(`(
        name ILIKE $${startIndex}
        OR make ILIKE $${startIndex + 1}
        OR model ILIKE $${startIndex + 2}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const baseQuery = `FROM equipment ${whereClause}`;

    const selectQuery = `
      SELECT *
      ${baseQuery}
      ORDER BY name ASC
      ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
    `;

    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);

    const transformed = rows.map((row) => transformRow(row, 'equipment'));

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

router.get('/equipment/maintenance-due',
  requirePermission(RESOURCES.EQUIPMENT, ACTIONS.LIST),
  async (req, res) => {
    try {
      const { daysAhead = 30 } = req.query;
      const { rows } = await db.query(`
        SELECT 
          em.*,
          e.name as equipment_name,
          emp.name as performed_by_name
        FROM equipment_maintenance em
        JOIN equipment e ON em.equipment_id = e.id
        LEFT JOIN employees emp ON em.performed_by = emp.id
        WHERE em.status IN ('pending', 'overdue')
          AND (
            em.scheduled_date <= CURRENT_DATE + $1::interval
            OR em.status = 'overdue'
          )
        ORDER BY 
          CASE WHEN em.status = 'overdue' THEN 0 ELSE 1 END,
          em.scheduled_date ASC
      `, [`${daysAhead} days`]);

      res.json(rows.map(transformMaintenanceRow));
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/equipment/:id/usage',
  requirePermission(RESOURCES.EQUIPMENT, ACTIONS.READ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);

      const baseQuery = `
        FROM equipment_usage eu
        LEFT JOIN equipment e ON eu.equipment_id = e.id
        LEFT JOIN employees emp ON eu.used_by = emp.id
        LEFT JOIN jobs j ON eu.job_id = j.id
        WHERE eu.equipment_id = $1
      `;

      const selectQuery = `
        SELECT 
          eu.*,
          e.name as equipment_name,
          emp.name as employee_name,
          j.job_number
        ${baseQuery}
        ORDER BY eu.start_time DESC
        ${usePagination ? `LIMIT $2 OFFSET $3` : ''}
      `;

      const queryParams = usePagination ? [id, limit, offset] : [id];
      const { rows } = await db.query(selectQuery, queryParams);

      const transformed = rows.map(transformUsageRow);

      if (!usePagination) {
        return res.json(transformed);
      }

      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
      const { rows: countRows } = await db.query(countQuery, [id]);
      const total = Number.parseInt(countRows[0]?.total, 10) || 0;

      res.json({
        success: true,
        data: transformed,
        pagination: buildPaginationMeta(total, page, pageSize),
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.post('/equipment/:id/usage',
  requirePermission(RESOURCES.EQUIPMENT, ACTIONS.UPDATE),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { jobId, usedBy, startTime, endTime, hoursUsed, notes } = req.body;

      const { rows: equipmentCheck } = await db.query(
        'SELECT id FROM equipment WHERE id = $1',
        [id]
      );

      if (!equipmentCheck.length) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      const usageId = uuidv4();
      const { rows } = await db.query(`
        INSERT INTO equipment_usage (
          id, equipment_id, job_id, used_by, start_time, end_time, hours_used, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        usageId,
        id,
        jobId || null,
        usedBy || null,
        startTime || new Date().toISOString(),
        endTime || null,
        hoursUsed || null,
        notes || null
      ]);

      res.status(201).json(transformUsageRow(rows[0]));
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/equipment/:id/maintenance',
  requirePermission(RESOURCES.EQUIPMENT, ACTIONS.READ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.query;
      const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);

      let baseQuery = `
        FROM equipment_maintenance em
        LEFT JOIN equipment e ON em.equipment_id = e.id
        LEFT JOIN employees emp ON em.performed_by = emp.id
        WHERE em.equipment_id = $1
      `;
      const params = [id];

      if (status) {
        params.push(status);
        baseQuery += ` AND em.status = $${params.length}`;
      }

      const selectQuery = `
        SELECT 
          em.*,
          e.name as equipment_name,
          emp.name as performed_by_name
        ${baseQuery}
        ORDER BY em.scheduled_date DESC, em.created_at DESC
        ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
      `;

      const queryParams = usePagination ? [...params, limit, offset] : params;
      const { rows } = await db.query(selectQuery, queryParams);

      const transformed = rows.map(transformMaintenanceRow);

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
  }
);

router.post('/equipment/:id/maintenance',
  requirePermission(RESOURCES.EQUIPMENT, ACTIONS.UPDATE),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        maintenanceType, 
        scheduledDate, 
        actualDate, 
        performedBy, 
        cost, 
        notes, 
        status = 'pending',
        nextDueDate 
      } = req.body;

      if (!maintenanceType) {
        return res.status(400).json({ error: 'maintenanceType is required' });
      }

      if (!['scheduled', 'repair', 'inspection'].includes(maintenanceType)) {
        return res.status(400).json({ 
          error: 'maintenanceType must be one of: scheduled, repair, inspection' 
        });
      }

      const { rows: equipmentCheck } = await db.query(
        'SELECT id FROM equipment WHERE id = $1',
        [id]
      );

      if (!equipmentCheck.length) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      const maintenanceId = uuidv4();
      const { rows } = await db.query(`
        INSERT INTO equipment_maintenance (
          id, equipment_id, maintenance_type, scheduled_date, actual_date,
          performed_by, cost, notes, status, next_due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        maintenanceId,
        id,
        maintenanceType,
        scheduledDate || null,
        actualDate || null,
        performedBy || null,
        cost || null,
        notes || null,
        status,
        nextDueDate || null
      ]);

      res.status(201).json(transformMaintenanceRow(rows[0]));
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.put('/equipment/:id/maintenance/:maintId',
  requirePermission(RESOURCES.EQUIPMENT, ACTIONS.UPDATE),
  async (req, res) => {
    try {
      const { id, maintId } = req.params;
      const { 
        maintenanceType, 
        scheduledDate, 
        actualDate, 
        performedBy, 
        cost, 
        notes, 
        status,
        nextDueDate 
      } = req.body;

      const { rows: existing } = await db.query(
        'SELECT * FROM equipment_maintenance WHERE id = $1 AND equipment_id = $2',
        [maintId, id]
      );

      if (!existing.length) {
        return res.status(404).json({ error: 'Maintenance record not found' });
      }

      if (maintenanceType && !['scheduled', 'repair', 'inspection'].includes(maintenanceType)) {
        return res.status(400).json({ 
          error: 'maintenanceType must be one of: scheduled, repair, inspection' 
        });
      }

      if (status && !['pending', 'completed', 'overdue'].includes(status)) {
        return res.status(400).json({ 
          error: 'status must be one of: pending, completed, overdue' 
        });
      }

      const { rows } = await db.query(`
        UPDATE equipment_maintenance SET
          maintenance_type = COALESCE($1, maintenance_type),
          scheduled_date = COALESCE($2, scheduled_date),
          actual_date = COALESCE($3, actual_date),
          performed_by = COALESCE($4, performed_by),
          cost = COALESCE($5, cost),
          notes = COALESCE($6, notes),
          status = COALESCE($7, status),
          next_due_date = COALESCE($8, next_due_date),
          updated_at = NOW()
        WHERE id = $9 AND equipment_id = $10
        RETURNING *
      `, [
        maintenanceType,
        scheduledDate,
        actualDate,
        performedBy,
        cost,
        notes,
        status,
        nextDueDate,
        maintId,
        id
      ]);

      if (status === 'completed' && actualDate) {
        await db.query(
          'UPDATE equipment SET last_service_date = $1 WHERE id = $2',
          [actualDate, id]
        );
      }

      res.json(transformMaintenanceRow(rows[0]));
    } catch (err) {
      handleError(res, err);
    }
  }
);

module.exports = router;
