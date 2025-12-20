const express = require('express');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

router.get('/sales/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id as employee_id,
        e.name as employee_name,
        e.job_title,
        e.default_commission_rate,
        e.is_salesman,
        COUNT(DISTINCT j.id) as total_jobs_sold,
        COUNT(DISTINCT CASE WHEN j.status IN ('completed', 'invoiced', 'paid') THEN j.id END) as completed_jobs,
        COUNT(DISTINCT CASE WHEN j.status NOT IN ('completed', 'invoiced', 'paid', 'cancelled') THEN j.id END) as pending_jobs,
        COALESCE(SUM(CASE WHEN j.status IN ('completed', 'invoiced', 'paid') THEN j.sale_amount ELSE 0 END), 0) as total_sales_completed,
        COALESCE(SUM(j.sale_amount), 0) as total_sales_all,
        COALESCE(SUM(sc.commission_amount) FILTER (WHERE sc.status = 'earned'), 0) as earned_commissions,
        COALESCE(SUM(sc.commission_amount) FILTER (WHERE sc.status = 'paid'), 0) as paid_commissions,
        COALESCE(SUM(sc.commission_amount) FILTER (WHERE sc.status = 'pending'), 0) as pending_commissions
      FROM employees e
      LEFT JOIN jobs j ON j.sold_by_employee_id = e.id
      LEFT JOIN sales_commissions sc ON sc.employee_id = e.id
      WHERE e.is_salesman = true OR j.sold_by_employee_id IS NOT NULL
      GROUP BY e.id, e.name, e.job_title, e.default_commission_rate, e.is_salesman
      ORDER BY total_sales_completed DESC
    `;
    
    const { rows } = await db.query(query);
    
    const summary = rows.map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      jobTitle: row.job_title,
      defaultCommissionRate: parseFloat(row.default_commission_rate) || 0,
      isSalesman: row.is_salesman,
      totalJobsSold: parseInt(row.total_jobs_sold) || 0,
      completedJobs: parseInt(row.completed_jobs) || 0,
      pendingJobs: parseInt(row.pending_jobs) || 0,
      totalSalesCompleted: parseFloat(row.total_sales_completed) || 0,
      totalSalesAll: parseFloat(row.total_sales_all) || 0,
      earnedCommissions: parseFloat(row.earned_commissions) || 0,
      paidCommissions: parseFloat(row.paid_commissions) || 0,
      pendingCommissions: parseFloat(row.pending_commissions) || 0
    }));
    
    res.json(summary);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/sales/commissions', async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        sc.*,
        e.name as employee_name,
        j.job_number,
        j.customer_name,
        j.status as job_status,
        j.scheduled_date
      FROM sales_commissions sc
      JOIN employees e ON e.id = sc.employee_id
      JOIN jobs j ON j.id = sc.job_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (employeeId) {
      params.push(employeeId);
      query += ` AND sc.employee_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND sc.status = $${params.length}`;
    }
    
    if (startDate) {
      params.push(startDate);
      query += ` AND sc.created_at >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND sc.created_at <= $${params.length}`;
    }
    
    query += ' ORDER BY sc.created_at DESC';
    
    const { rows } = await db.query(query, params);
    
    const commissions = rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      jobId: row.job_id,
      jobNumber: row.job_number,
      customerName: row.customer_name,
      jobStatus: row.job_status,
      scheduledDate: row.scheduled_date,
      quoteId: row.quote_id,
      saleAmount: parseFloat(row.sale_amount) || 0,
      commissionRate: parseFloat(row.commission_rate) || 0,
      commissionAmount: parseFloat(row.commission_amount) || 0,
      status: row.status,
      jobCompletedAt: row.job_completed_at,
      payrollRecordId: row.payroll_record_id,
      paidAt: row.paid_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(commissions);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/sales/salesman/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employeeQuery = `
      SELECT id, name, job_title, default_commission_rate, is_salesman
      FROM employees
      WHERE id = $1
    `;
    const { rows: empRows } = await db.query(employeeQuery, [employeeId]);
    
    if (empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employee = empRows[0];
    
    const jobsQuery = `
      SELECT 
        j.id, j.job_number, j.customer_name, j.status, j.scheduled_date, 
        j.sale_amount, j.created_at,
        sc.commission_rate, sc.commission_amount, sc.status as commission_status
      FROM jobs j
      LEFT JOIN sales_commissions sc ON sc.job_id = j.id AND sc.employee_id = $1
      WHERE j.sold_by_employee_id = $1
      ORDER BY j.created_at DESC
    `;
    const { rows: jobRows } = await db.query(jobsQuery, [employeeId]);
    
    const salesmanData = {
      id: employee.id,
      name: employee.name,
      jobTitle: employee.job_title,
      defaultCommissionRate: parseFloat(employee.default_commission_rate) || 0,
      isSalesman: employee.is_salesman,
      jobs: jobRows.map(row => ({
        id: row.id,
        jobNumber: row.job_number,
        customerName: row.customer_name,
        status: row.status,
        scheduledDate: row.scheduled_date,
        saleAmount: parseFloat(row.sale_amount) || 0,
        createdAt: row.created_at,
        commissionRate: parseFloat(row.commission_rate) || 0,
        commissionAmount: parseFloat(row.commission_amount) || 0,
        commissionStatus: row.commission_status
      }))
    };
    
    res.json(salesmanData);
  } catch (err) {
    handleError(res, err);
  }
});

router.patch('/employees/:id/commission-rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { defaultCommissionRate, isSalesman } = req.body;
    
    const updates = [];
    const params = [];
    
    if (defaultCommissionRate !== undefined) {
      params.push(defaultCommissionRate);
      updates.push(`default_commission_rate = $${params.length}`);
    }
    
    if (isSalesman !== undefined) {
      params.push(isSalesman);
      updates.push(`is_salesman = $${params.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    params.push(id);
    const query = `
      UPDATE employees 
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING *
    `;
    
    const { rows } = await db.query(query, params);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(transformRow(rows[0], 'employees'));
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/sales/commissions/calculate', async (req, res) => {
  try {
    const { jobId, employeeId, saleAmount, commissionRate } = req.body;
    
    if (!jobId || !employeeId || !saleAmount) {
      return res.status(400).json({ error: 'jobId, employeeId, and saleAmount are required' });
    }
    
    let rate = commissionRate;
    
    if (rate === undefined) {
      const empQuery = 'SELECT default_commission_rate FROM employees WHERE id = $1';
      const { rows } = await db.query(empQuery, [employeeId]);
      rate = rows[0]?.default_commission_rate || 0;
    }
    
    const commissionAmount = (parseFloat(saleAmount) * parseFloat(rate)) / 100;
    
    const insertQuery = `
      INSERT INTO sales_commissions (employee_id, job_id, sale_amount, commission_rate, commission_amount, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      ON CONFLICT (job_id, employee_id) 
      DO UPDATE SET 
        sale_amount = EXCLUDED.sale_amount,
        commission_rate = EXCLUDED.commission_rate,
        commission_amount = EXCLUDED.commission_amount,
        updated_at = NOW()
      RETURNING *
    `;
    
    const { rows } = await db.query(insertQuery, [employeeId, jobId, saleAmount, rate, commissionAmount]);
    
    await db.query(
      'UPDATE jobs SET sold_by_employee_id = $1, sale_amount = $2 WHERE id = $3',
      [employeeId, saleAmount, jobId]
    );
    
    res.json({
      id: rows[0].id,
      employeeId: rows[0].employee_id,
      jobId: rows[0].job_id,
      saleAmount: parseFloat(rows[0].sale_amount),
      commissionRate: parseFloat(rows[0].commission_rate),
      commissionAmount: parseFloat(rows[0].commission_amount),
      status: rows[0].status
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/sales/commissions/:id/mark-earned', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      UPDATE sales_commissions 
      SET status = 'earned', job_completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Commission record not found' });
    }
    
    res.json({ success: true, commission: rows[0] });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/sales/commissions/process-payroll', async (req, res) => {
  try {
    const { employeeId, payPeriodId, commissionIds } = req.body;
    
    if (!employeeId || !commissionIds || commissionIds.length === 0) {
      return res.status(400).json({ error: 'employeeId and commissionIds are required' });
    }
    
    const totalQuery = `
      SELECT SUM(commission_amount) as total
      FROM sales_commissions
      WHERE id = ANY($1) AND status = 'earned'
    `;
    const { rows: totalRows } = await db.query(totalQuery, [commissionIds]);
    const totalCommission = parseFloat(totalRows[0]?.total) || 0;
    
    if (totalCommission === 0) {
      return res.status(400).json({ error: 'No earned commissions found to process' });
    }
    
    const payrollQuery = `
      INSERT INTO payroll_records (employee_id, pay_period_id, gross_pay, net_pay, deductions, status, payment_type)
      VALUES ($1, $2, $3, $3, 0, 'Pending', 'commission')
      RETURNING *
    `;
    const { rows: payrollRows } = await db.query(payrollQuery, [employeeId, payPeriodId, totalCommission]);
    const payrollRecordId = payrollRows[0].id;
    
    await db.query(
      `UPDATE sales_commissions 
       SET status = 'paid', payroll_record_id = $1, paid_at = NOW(), updated_at = NOW()
       WHERE id = ANY($2)`,
      [payrollRecordId, commissionIds]
    );
    
    res.json({
      success: true,
      payrollRecordId,
      totalCommission,
      commissionsProcessed: commissionIds.length
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/salesmen', async (req, res) => {
  try {
    const query = `
      SELECT id, name, job_title, default_commission_rate, is_salesman
      FROM employees
      WHERE is_salesman = true OR job_title ILIKE '%sales%' OR job_title ILIKE '%salesman%'
      ORDER BY name ASC
    `;
    
    const { rows } = await db.query(query);
    
    const salesmen = rows.map(row => ({
      id: row.id,
      name: row.name,
      jobTitle: row.job_title,
      defaultCommissionRate: parseFloat(row.default_commission_rate) || 0,
      isSalesman: row.is_salesman
    }));
    
    res.json(salesmen);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
