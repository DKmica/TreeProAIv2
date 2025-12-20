const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const transformPayrollRow = (row) => {
  if (!row) return null;
  
  const transformed = { ...row };
  
  if (row.employee_id !== undefined) {
    transformed.employeeId = row.employee_id;
    delete transformed.employee_id;
  }
  if (row.pay_period_id !== undefined) {
    transformed.payPeriodId = row.pay_period_id;
    delete transformed.pay_period_id;
  }
  if (row.regular_hours !== undefined) {
    transformed.regularHours = (row.regular_hours !== null && row.regular_hours !== '') ? parseFloat(row.regular_hours) : row.regular_hours;
    delete transformed.regular_hours;
  }
  if (row.overtime_hours !== undefined) {
    transformed.overtimeHours = (row.overtime_hours !== null && row.overtime_hours !== '') ? parseFloat(row.overtime_hours) : row.overtime_hours;
    delete transformed.overtime_hours;
  }
  if (row.hourly_rate !== undefined) {
    transformed.hourlyRate = (row.hourly_rate !== null && row.hourly_rate !== '') ? parseFloat(row.hourly_rate) : row.hourly_rate;
    delete transformed.hourly_rate;
  }
  if (row.regular_pay !== undefined) {
    transformed.regularPay = (row.regular_pay !== null && row.regular_pay !== '') ? parseFloat(row.regular_pay) : row.regular_pay;
    delete transformed.regular_pay;
  }
  if (row.overtime_pay !== undefined) {
    transformed.overtimePay = (row.overtime_pay !== null && row.overtime_pay !== '') ? parseFloat(row.overtime_pay) : row.overtime_pay;
    delete transformed.overtime_pay;
  }
  if (row.total_deductions !== undefined) {
    transformed.totalDeductions = (row.total_deductions !== null && row.total_deductions !== '') ? parseFloat(row.total_deductions) : row.total_deductions;
    delete transformed.total_deductions;
  }
  if (row.gross_pay !== undefined) {
    transformed.grossPay = (row.gross_pay !== null && row.gross_pay !== '') ? parseFloat(row.gross_pay) : row.gross_pay;
    delete transformed.gross_pay;
  }
  if (row.net_pay !== undefined) {
    transformed.netPay = (row.net_pay !== null && row.net_pay !== '') ? parseFloat(row.net_pay) : row.net_pay;
    delete transformed.net_pay;
  }
  if (row.paid_at !== undefined) {
    transformed.paidAt = row.paid_at;
    delete transformed.paid_at;
  }
  if (row.payment_method !== undefined) {
    transformed.paymentMethod = row.payment_method;
    delete transformed.payment_method;
  }
  
  return transformed;
};

const transformPayPeriodRow = (row) => {
  if (!row) return null;
  
  const transformed = { ...row };
  
  if (row.start_date !== undefined) {
    transformed.startDate = row.start_date;
    delete transformed.start_date;
  }
  if (row.end_date !== undefined) {
    transformed.endDate = row.end_date;
    delete transformed.end_date;
  }
  if (row.period_type !== undefined) {
    transformed.periodType = row.period_type;
    delete transformed.period_type;
  }
  if (row.processed_at !== undefined) {
    transformed.processedAt = row.processed_at;
    delete transformed.processed_at;
  }
  
  return transformed;
};

// GET all pay periods
router.get('/pay_periods', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM pay_periods ORDER BY start_date DESC'
    );
    res.json(rows.map(transformPayPeriodRow));
  } catch (err) {
    console.error('Error fetching pay periods:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// GET single pay period
router.get('/pay_periods/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM pay_periods WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pay period not found' });
    }
    res.json(transformPayPeriodRow(rows[0]));
  } catch (err) {
    console.error('Error fetching pay period:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// POST create pay period
router.post('/pay_periods', async (req, res) => {
  try {
    const { startDate, endDate, periodType, status } = req.body;
    const id = uuidv4();
    
    const { rows } = await db.query(
      `INSERT INTO pay_periods (id, start_date, end_date, period_type, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, startDate, endDate, periodType || 'bi-weekly', status || 'Open']
    );
    
    res.status(201).json(transformPayPeriodRow(rows[0]));
  } catch (err) {
    console.error('Error creating pay period:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// PUT update pay period
router.put('/pay_periods/:id', async (req, res) => {
  try {
    const { startDate, endDate, periodType, status } = req.body;
    
    const { rows } = await db.query(
      `UPDATE pay_periods 
       SET start_date = COALESCE($1, start_date),
           end_date = COALESCE($2, end_date),
           period_type = COALESCE($3, period_type),
           status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
      [startDate, endDate, periodType, status, req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pay period not found' });
    }
    
    res.json(transformPayPeriodRow(rows[0]));
  } catch (err) {
    console.error('Error updating pay period:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// DELETE pay period
router.delete('/pay_periods/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM pay_periods WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Pay period not found' });
    }
    
    res.json({ success: true, message: 'Pay period deleted' });
  } catch (err) {
    console.error('Error deleting pay period:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

router.post('/pay_periods/:id/process', async (req, res) => {
  try {
    const { rows: payPeriodRows } = await db.query(
      'SELECT * FROM pay_periods WHERE id = $1',
      [req.params.id]
    );
    
    if (payPeriodRows.length === 0) {
      return res.status(404).json({ error: 'Pay period not found' });
    }
    
    const payPeriod = payPeriodRows[0];
    
    if (payPeriod.status === 'Closed') {
      return res.status(400).json({ error: 'Pay period already processed' });
    }
    
    const { rows: timeEntries } = await db.query(
      `SELECT * FROM time_entries 
       WHERE date >= $1 AND date <= $2`,
      [payPeriod.start_date, payPeriod.end_date]
    );
    
    const employeeEntries = {};
    for (const entry of timeEntries) {
      if (!employeeEntries[entry.employee_id]) {
        employeeEntries[entry.employee_id] = [];
      }
      employeeEntries[entry.employee_id].push(entry);
    }
    
    const payrollRecords = [];
    let totalGrossPay = 0;
    let totalNetPay = 0;
    
    for (const employeeId in employeeEntries) {
      const entries = employeeEntries[employeeId];
      
      const { rows: employeeRows } = await db.query(
        'SELECT * FROM employees WHERE id = $1',
        [employeeId]
      );
      
      if (employeeRows.length === 0) {
        continue;
      }
      
      const employee = employeeRows[0];
      const hourlyRate = parseFloat(employee.pay_rate || 0);
      
      let totalHoursWorked = 0;
      let totalOvertimeHours = 0;
      
      for (const entry of entries) {
        totalHoursWorked += parseFloat(entry.hours_worked || 0);
        totalOvertimeHours += parseFloat(entry.overtime_hours || 0);
      }
      
      const regularHours = Math.max(totalHoursWorked - totalOvertimeHours, 0);
      const overtimeHours = totalOvertimeHours;
      
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * (hourlyRate * 1.5);
      const bonuses = 0;
      const grossPay = regularPay + overtimePay + bonuses;
      
      const federalTax = grossPay * 0.15;
      const stateTax = grossPay * 0.05;
      const socialSecurity = grossPay * 0.062;
      const medicare = grossPay * 0.0145;
      
      const deductions = [
        { type: 'Federal Tax', amount: federalTax, percentage: 15 },
        { type: 'State Tax', amount: stateTax, percentage: 5 },
        { type: 'Social Security', amount: socialSecurity, percentage: 6.2 },
        { type: 'Medicare', amount: medicare, percentage: 1.45 }
      ];
      
      const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
      const netPay = grossPay - totalDeductions;
      
      const payrollId = uuidv4();
      const { rows: payrollRows } = await db.query(
        `INSERT INTO payroll_records (
          id, employee_id, pay_period_id, regular_hours, overtime_hours,
          hourly_rate, regular_pay, overtime_pay, bonuses, deductions,
          total_deductions, gross_pay, net_pay, payment_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          payrollId, employeeId, req.params.id, regularHours, overtimeHours,
          hourlyRate, regularPay, overtimePay, bonuses, JSON.stringify(deductions),
          totalDeductions, grossPay, netPay, 'Direct Deposit'
        ]
      );
      
      payrollRecords.push(transformPayrollRow(payrollRows[0]));
      totalGrossPay += grossPay;
      totalNetPay += netPay;
    }
    
    const now = new Date().toISOString();
    const { rows: updatedPayPeriodRows } = await db.query(
      `UPDATE pay_periods SET status = $1, processed_at = $2 WHERE id = $3 RETURNING *`,
      ['Closed', now, req.params.id]
    );
    
    res.json({
      payPeriod: transformPayPeriodRow(updatedPayPeriodRows[0]),
      payrollRecords: payrollRecords,
      summary: {
        totalEmployees: payrollRecords.length,
        totalGrossPay: totalGrossPay,
        totalNetPay: totalNetPay
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

module.exports = router;
