const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');

const router = express.Router();

// POST /api/time-entries/clock-in - Clock in for a job
router.post('/time-entries/clock-in', async (req, res) => {
  try {
    const { employeeId, jobId, location, notes } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'employeeId is required'
      });
    }
    
    const activeCheck = await db.query(
      'SELECT id FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL AND status != $2',
      [employeeId, 'rejected']
    );
    
    if (activeCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Employee already has an active clock-in. Please clock out first.'
      });
    }
    
    const id = uuidv4();
    const clockIn = new Date();
    
    const empQuery = await db.query('SELECT hourly_rate FROM employees WHERE id = $1', [employeeId]);
    const hourlyRate = empQuery.rows[0]?.hourly_rate || 0;
    
    const query = `
      INSERT INTO time_entries (
        id, employee_id, job_id, clock_in, clock_in_location, 
        notes, status, hourly_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      id,
      employeeId,
      jobId || null,
      clockIn,
      location ? JSON.stringify(location) : null,
      notes || null,
      'draft',
      hourlyRate
    ]);
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'time_entries'),
      message: 'Clocked in successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/time-entries/:id/clock-out - Clock out from a time entry
router.post('/time-entries/:id/clock-out', async (req, res) => {
  try {
    const { id } = req.params;
    const { location, notes, breakMinutes } = req.body;
    
    const checkQuery = 'SELECT * FROM time_entries WHERE id = $1';
    const { rows: existingRows } = await db.query(checkQuery, [id]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Time entry not found'
      });
    }
    
    const entry = existingRows[0];
    
    if (entry.clock_out) {
      return res.status(400).json({
        success: false,
        error: 'Already clocked out'
      });
    }
    
    const clockOut = new Date();
    const clockIn = new Date(entry.clock_in);
    
    const totalMinutes = (clockOut - clockIn) / (1000 * 60);
    const workMinutes = totalMinutes - (breakMinutes || 0);
    const hoursWorked = Math.max(0, workMinutes / 60);
    const totalAmount = hoursWorked * (entry.hourly_rate || 0);
    
    const query = `
      UPDATE time_entries 
      SET 
        clock_out = $1,
        clock_out_location = $2,
        notes = COALESCE($3, notes),
        break_minutes = $4,
        hours_worked = $5,
        total_amount = $6,
        status = 'submitted'
      WHERE id = $7
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      clockOut,
      location ? JSON.stringify(location) : null,
      notes,
      breakMinutes || 0,
      hoursWorked,
      totalAmount,
      id
    ]);
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'time_entries'),
      message: 'Clocked out successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/time-entries - Get time entries with filters
router.get('/time-entries', async (req, res) => {
  try {
    const { employeeId, jobId, status, startDate, endDate, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        te.*,
        e.name as employee_name,
        j.customer_name as job_title,
        j.customer_name as job_client_name
      FROM time_entries te
      LEFT JOIN employees e ON te.employee_id = e.id
      LEFT JOIN jobs j ON te.job_id = j.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (employeeId) {
      query += ` AND te.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }
    
    if (jobId) {
      query += ` AND te.job_id = $${paramCount}`;
      params.push(jobId);
      paramCount++;
    }
    
    if (status) {
      query += ` AND te.approval_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (startDate) {
      query += ` AND te.clock_in_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND te.clock_in_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    query += ` ORDER BY te.clock_in_time DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    const { rows } = await db.query(query, params);
    
    const entries = rows.map(row => {
      const entry = transformRow(row, 'time_entries');
      entry.employeeName = row.employee_name;
      entry.jobTitle = row.job_title;
      entry.jobClientName = row.job_client_name;
      return entry;
    });
    
    res.json({
      success: true,
      data: entries
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/time-entries/:id/approve - Approve a time entry
router.put('/time-entries/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: 'approvedBy is required'
      });
    }
    
    const query = `
      UPDATE time_entries 
      SET 
        status = 'approved',
        approved_by = $1,
        approved_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [approvedBy, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Time entry not found'
      });
    }
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'time_entries'),
      message: 'Time entry approved'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/time-entries/:id/reject - Reject a time entry
router.put('/time-entries/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, rejectionReason } = req.body;
    
    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: 'approvedBy is required'
      });
    }
    
    const query = `
      UPDATE time_entries 
      SET 
        status = 'rejected',
        approved_by = $1,
        approved_at = NOW(),
        rejection_reason = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [approvedBy, rejectionReason || null, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Time entry not found'
      });
    }
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'time_entries'),
      message: 'Time entry rejected'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/timesheets - Get timesheets with filters
router.get('/timesheets', async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        ts.*,
        e.name as employee_name,
        approver.name as approver_name
      FROM timesheets ts
      LEFT JOIN employees e ON ts.employee_id = e.id
      LEFT JOIN employees approver ON ts.approved_by = approver.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (employeeId) {
      query += ` AND ts.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }
    
    if (status) {
      query += ` AND ts.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (startDate) {
      query += ` AND ts.period_start >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND ts.period_end <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    query += ' ORDER BY ts.period_start DESC';
    
    const { rows } = await db.query(query, params);
    
    const timesheets = rows.map(row => {
      const sheet = transformRow(row, 'timesheets');
      sheet.employeeName = row.employee_name;
      sheet.approverName = row.approver_name;
      return sheet;
    });
    
    res.json({
      success: true,
      data: timesheets
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/timesheets/generate - Generate timesheet for employee and period
router.post('/timesheets/generate', async (req, res) => {
  try {
    const { employeeId, periodStart, periodEnd } = req.body;
    
    if (!employeeId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'employeeId, periodStart, and periodEnd are required'
      });
    }
    
    const entriesQuery = `
      SELECT * FROM time_entries
      WHERE employee_id = $1
        AND clock_in >= $2
        AND clock_in < $3
        AND status = 'approved'
      ORDER BY clock_in
    `;
    
    const { rows: entries } = await db.query(entriesQuery, [employeeId, periodStart, periodEnd]);
    
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    
    entries.forEach(entry => {
      const hours = entry.hours_worked || 0;
      totalHours += hours;
      
      if (regularHours < 40) {
        const addRegular = Math.min(hours, 40 - regularHours);
        regularHours += addRegular;
        overtimeHours += Math.max(0, hours - addRegular);
      } else {
        overtimeHours += hours;
      }
    });
    
    const id = uuidv4();
    
    const query = `
      INSERT INTO timesheets (
        id, employee_id, period_start, period_end,
        total_hours, total_regular_hours, total_overtime_hours,
        status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      id,
      employeeId,
      periodStart,
      periodEnd,
      totalHours,
      regularHours,
      overtimeHours,
      'submitted'
    ]);
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'timesheets'),
      message: `Timesheet generated with ${entries.length} entries`,
      entriesCount: entries.length
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/timesheets/:id/approve - Approve a timesheet
router.put('/timesheets/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;
    
    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: 'approvedBy is required'
      });
    }
    
    const query = `
      UPDATE timesheets 
      SET 
        status = 'approved',
        approved_by = $1,
        approved_at = NOW(),
        notes = COALESCE($2, notes)
      WHERE id = $3
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [approvedBy, notes, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'timesheets'),
      message: 'Timesheet approved'
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
