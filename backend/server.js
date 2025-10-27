const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.use(cors());
app.use(express.json());

const apiRouter = express.Router();
app.use('/api', apiRouter);

apiRouter.get('/health', (req, res) => {
  res.status(200).send('TreePro AI Backend is running.');
});

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

// Helper function to transform database row to API format
const transformRow = (row, tableName) => {
  if (!row) return null;
  
  const transformed = { ...row };
  
  // Handle coordinate fields
  if (tableName === 'customers' || tableName === 'employees') {
    if (row.lat !== undefined && row.lon !== undefined) {
      transformed.coordinates = { lat: row.lat, lng: row.lon };
      delete transformed.lat;
      delete transformed.lon;
    }
  }
  
  // Transform employees fields
  if (tableName === 'employees') {
    if (row.job_title !== undefined) {
      transformed.jobTitle = row.job_title;
      delete transformed.job_title;
    }
    if (row.pay_rate !== undefined) {
      transformed.payRate = (row.pay_rate !== null && row.pay_rate !== '') ? parseFloat(row.pay_rate) : row.pay_rate;
      delete transformed.pay_rate;
    }
    if (row.hire_date !== undefined) {
      transformed.hireDate = row.hire_date;
      delete transformed.hire_date;
    }
    if (row.performance_metrics !== undefined) {
      transformed.performanceMetrics = row.performance_metrics;
      delete transformed.performance_metrics;
    }
  }
  
  // Transform equipment fields
  if (tableName === 'equipment') {
    if (row.purchase_date !== undefined) {
      transformed.purchaseDate = row.purchase_date;
      delete transformed.purchase_date;
    }
    if (row.last_service_date !== undefined) {
      transformed.lastServiceDate = row.last_service_date;
      delete transformed.last_service_date;
    }
    if (row.assigned_to !== undefined) {
      transformed.assignedTo = row.assigned_to;
      delete transformed.assigned_to;
    }
    if (row.maintenance_history !== undefined) {
      transformed.maintenanceHistory = row.maintenance_history;
      delete transformed.maintenance_history;
    }
  }
  
  // Transform quotes fields
  if (tableName === 'quotes') {
    if (row.lead_id !== undefined) {
      transformed.leadId = row.lead_id;
      delete transformed.lead_id;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.line_items !== undefined) {
      transformed.lineItems = row.line_items;
      delete transformed.line_items;
    }
    if (row.stump_grinding_price !== undefined) {
      transformed.stumpGrindingPrice = (row.stump_grinding_price !== null && row.stump_grinding_price !== '') ? parseFloat(row.stump_grinding_price) : row.stump_grinding_price;
      delete transformed.stump_grinding_price;
    }
    if (row.accepted_at !== undefined) {
      transformed.acceptedAt = row.accepted_at;
      delete transformed.accepted_at;
    }
    if (row.job_location !== undefined) {
      transformed.jobLocation = row.job_location;
      delete transformed.job_location;
    }
    if (row.special_instructions !== undefined) {
      transformed.specialInstructions = row.special_instructions;
      delete transformed.special_instructions;
    }
    if (row.valid_until !== undefined) {
      transformed.validUntil = row.valid_until;
      delete transformed.valid_until;
    }
    if (row.deposit_amount !== undefined) {
      transformed.depositAmount = (row.deposit_amount !== null && row.deposit_amount !== '') ? parseFloat(row.deposit_amount) : row.deposit_amount;
      delete transformed.deposit_amount;
    }
    if (row.payment_terms !== undefined) {
      transformed.paymentTerms = row.payment_terms;
      delete transformed.payment_terms;
    }
  }
  
  // Transform leads fields
  if (tableName === 'leads') {
    if (row.customer_id !== undefined) {
      transformed.customerId = row.customer_id;
      delete transformed.customer_id;
    }
  }
  
  if (tableName === 'jobs') {
    if (row.clock_in_lat !== undefined && row.clock_in_lon !== undefined) {
      transformed.clockInCoordinates = { lat: row.clock_in_lat, lng: row.clock_in_lon };
      delete transformed.clock_in_lat;
      delete transformed.clock_in_lon;
    }
    if (row.clock_out_lat !== undefined && row.clock_out_lon !== undefined) {
      transformed.clockOutCoordinates = { lat: row.clock_out_lat, lng: row.clock_out_lon };
      delete transformed.clock_out_lat;
      delete transformed.clock_out_lon;
    }
    // Transform snake_case to camelCase for job fields
    if (row.work_started_at !== undefined) {
      transformed.workStartedAt = row.work_started_at;
      delete transformed.work_started_at;
    }
    if (row.work_ended_at !== undefined) {
      transformed.workEndedAt = row.work_ended_at;
      delete transformed.work_ended_at;
    }
    if (row.assigned_crew !== undefined) {
      transformed.assignedCrew = row.assigned_crew;
      delete transformed.assigned_crew;
    }
    if (row.stump_grinding_price !== undefined) {
      transformed.stumpGrindingPrice = (row.stump_grinding_price !== null && row.stump_grinding_price !== '') ? parseFloat(row.stump_grinding_price) : row.stump_grinding_price;
      delete transformed.stump_grinding_price;
    }
    if (row.quote_id !== undefined) {
      transformed.quoteId = row.quote_id;
      delete transformed.quote_id;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.scheduled_date !== undefined) {
      transformed.scheduledDate = row.scheduled_date;
      delete transformed.scheduled_date;
    }
    if (row.job_location !== undefined) {
      transformed.jobLocation = row.job_location;
      delete transformed.job_location;
    }
    if (row.special_instructions !== undefined) {
      transformed.specialInstructions = row.special_instructions;
      delete transformed.special_instructions;
    }
    if (row.equipment_needed !== undefined) {
      transformed.equipmentNeeded = row.equipment_needed;
      delete transformed.equipment_needed;
    }
    if (row.estimated_hours !== undefined) {
      transformed.estimatedHours = (row.estimated_hours !== null && row.estimated_hours !== '') ? parseFloat(row.estimated_hours) : row.estimated_hours;
      delete transformed.estimated_hours;
    }
  }
  
  // Transform pay_periods fields
  if (tableName === 'pay_periods') {
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
  }
  
  // Transform time_entries fields
  if (tableName === 'time_entries') {
    if (row.employee_id !== undefined) {
      transformed.employeeId = row.employee_id;
      delete transformed.employee_id;
    }
    if (row.job_id !== undefined) {
      transformed.jobId = row.job_id;
      delete transformed.job_id;
    }
    if (row.hours_worked !== undefined) {
      transformed.hoursWorked = (row.hours_worked !== null && row.hours_worked !== '') ? parseFloat(row.hours_worked) : row.hours_worked;
      delete transformed.hours_worked;
    }
    if (row.hourly_rate !== undefined) {
      transformed.hourlyRate = (row.hourly_rate !== null && row.hourly_rate !== '') ? parseFloat(row.hourly_rate) : row.hourly_rate;
      delete transformed.hourly_rate;
    }
    if (row.overtime_hours !== undefined) {
      transformed.overtimeHours = (row.overtime_hours !== null && row.overtime_hours !== '') ? parseFloat(row.overtime_hours) : row.overtime_hours;
      delete transformed.overtime_hours;
    }
  }
  
  // Transform payroll_records fields
  if (tableName === 'payroll_records') {
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
  }
  
  // Transform other snake_case fields
  if (row.created_at !== undefined) {
    transformed.createdAt = row.created_at;
    delete transformed.created_at;
  }
  
  return transformed;
};

// Helper function to transform API data to database format
const transformToDb = (data, tableName) => {
  const transformed = { ...data };
  
  // Handle coordinate fields
  if ((tableName === 'customers' || tableName === 'employees') && data.coordinates) {
    transformed.lat = data.coordinates.lat;
    transformed.lon = data.coordinates.lng;
    delete transformed.coordinates;
  }
  
  // Transform employees fields
  if (tableName === 'employees') {
    if (data.jobTitle !== undefined) {
      transformed.job_title = data.jobTitle;
      delete transformed.jobTitle;
    }
    if (data.payRate !== undefined) {
      transformed.pay_rate = data.payRate;
      delete transformed.payRate;
    }
    if (data.hireDate !== undefined) {
      transformed.hire_date = data.hireDate;
      delete transformed.hireDate;
    }
    if (data.performanceMetrics !== undefined) {
      transformed.performance_metrics = data.performanceMetrics;
      delete transformed.performanceMetrics;
    }
  }
  
  // Transform equipment fields
  if (tableName === 'equipment') {
    if (data.purchaseDate !== undefined) {
      transformed.purchase_date = data.purchaseDate;
      delete transformed.purchaseDate;
    }
    if (data.lastServiceDate !== undefined) {
      transformed.last_service_date = data.lastServiceDate;
      delete transformed.lastServiceDate;
    }
    if (data.assignedTo !== undefined) {
      transformed.assigned_to = data.assignedTo;
      delete transformed.assignedTo;
    }
    if (data.maintenanceHistory !== undefined) {
      transformed.maintenance_history = data.maintenanceHistory;
      delete transformed.maintenanceHistory;
    }
  }
  
  // Transform quotes fields
  if (tableName === 'quotes') {
    if (data.leadId !== undefined) {
      transformed.lead_id = data.leadId;
      delete transformed.leadId;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.lineItems !== undefined) {
      transformed.line_items = data.lineItems;
      delete transformed.lineItems;
    }
    if (data.stumpGrindingPrice !== undefined) {
      transformed.stump_grinding_price = data.stumpGrindingPrice;
      delete transformed.stumpGrindingPrice;
    }
    if (data.acceptedAt !== undefined) {
      transformed.accepted_at = data.acceptedAt;
      delete transformed.acceptedAt;
    }
    if (data.jobLocation !== undefined) {
      transformed.job_location = data.jobLocation;
      delete transformed.jobLocation;
    }
    if (data.specialInstructions !== undefined) {
      transformed.special_instructions = data.specialInstructions;
      delete transformed.specialInstructions;
    }
    if (data.validUntil !== undefined) {
      transformed.valid_until = data.validUntil;
      delete transformed.validUntil;
    }
    if (data.depositAmount !== undefined) {
      transformed.deposit_amount = data.depositAmount;
      delete transformed.depositAmount;
    }
    if (data.paymentTerms !== undefined) {
      transformed.payment_terms = data.paymentTerms;
      delete transformed.paymentTerms;
    }
  }
  
  // Transform leads fields
  if (tableName === 'leads') {
    if (data.customerId !== undefined) {
      transformed.customer_id = data.customerId;
      delete transformed.customerId;
    }
  }
  
  if (tableName === 'jobs') {
    if (data.clockInCoordinates) {
      transformed.clock_in_lat = data.clockInCoordinates.lat;
      transformed.clock_in_lon = data.clockInCoordinates.lng;
      delete transformed.clockInCoordinates;
    }
    if (data.clockOutCoordinates) {
      transformed.clock_out_lat = data.clockOutCoordinates.lat;
      transformed.clock_out_lon = data.clockOutCoordinates.lng;
      delete transformed.clockOutCoordinates;
    }
    // Transform camelCase to snake_case
    if (data.workStartedAt !== undefined) {
      transformed.work_started_at = data.workStartedAt;
      delete transformed.workStartedAt;
    }
    if (data.workEndedAt !== undefined) {
      transformed.work_ended_at = data.workEndedAt;
      delete transformed.workEndedAt;
    }
    if (data.assignedCrew !== undefined) {
      transformed.assigned_crew = data.assignedCrew;
      delete transformed.assignedCrew;
    }
    if (data.stumpGrindingPrice !== undefined) {
      transformed.stump_grinding_price = data.stumpGrindingPrice;
      delete transformed.stumpGrindingPrice;
    }
    if (data.quoteId !== undefined) {
      transformed.quote_id = data.quoteId;
      delete transformed.quoteId;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.scheduledDate !== undefined) {
      transformed.scheduled_date = data.scheduledDate;
      delete transformed.scheduledDate;
    }
    if (data.jobLocation !== undefined) {
      transformed.job_location = data.jobLocation;
      delete transformed.jobLocation;
    }
    if (data.specialInstructions !== undefined) {
      transformed.special_instructions = data.specialInstructions;
      delete transformed.specialInstructions;
    }
    if (data.equipmentNeeded !== undefined) {
      transformed.equipment_needed = data.equipmentNeeded;
      delete transformed.equipmentNeeded;
    }
    if (data.estimatedHours !== undefined) {
      transformed.estimated_hours = data.estimatedHours;
      delete transformed.estimatedHours;
    }
  }
  
  // Transform pay_periods fields
  if (tableName === 'pay_periods') {
    if (data.startDate !== undefined) {
      transformed.start_date = data.startDate;
      delete transformed.startDate;
    }
    if (data.endDate !== undefined) {
      transformed.end_date = data.endDate;
      delete transformed.endDate;
    }
    if (data.periodType !== undefined) {
      transformed.period_type = data.periodType;
      delete transformed.periodType;
    }
    if (data.processedAt !== undefined) {
      transformed.processed_at = data.processedAt;
      delete transformed.processedAt;
    }
  }
  
  // Transform time_entries fields
  if (tableName === 'time_entries') {
    if (data.employeeId !== undefined) {
      transformed.employee_id = data.employeeId;
      delete transformed.employeeId;
    }
    if (data.jobId !== undefined) {
      transformed.job_id = data.jobId;
      delete transformed.jobId;
    }
    if (data.hoursWorked !== undefined) {
      transformed.hours_worked = data.hoursWorked;
      delete transformed.hoursWorked;
    }
    if (data.hourlyRate !== undefined) {
      transformed.hourly_rate = data.hourlyRate;
      delete transformed.hourlyRate;
    }
    if (data.overtimeHours !== undefined) {
      transformed.overtime_hours = data.overtimeHours;
      delete transformed.overtimeHours;
    }
  }
  
  // Transform payroll_records fields
  if (tableName === 'payroll_records') {
    if (data.employeeId !== undefined) {
      transformed.employee_id = data.employeeId;
      delete transformed.employeeId;
    }
    if (data.payPeriodId !== undefined) {
      transformed.pay_period_id = data.payPeriodId;
      delete transformed.payPeriodId;
    }
    if (data.regularHours !== undefined) {
      transformed.regular_hours = data.regularHours;
      delete transformed.regularHours;
    }
    if (data.overtimeHours !== undefined) {
      transformed.overtime_hours = data.overtimeHours;
      delete transformed.overtimeHours;
    }
    if (data.hourlyRate !== undefined) {
      transformed.hourly_rate = data.hourlyRate;
      delete transformed.hourlyRate;
    }
    if (data.regularPay !== undefined) {
      transformed.regular_pay = data.regularPay;
      delete transformed.regularPay;
    }
    if (data.overtimePay !== undefined) {
      transformed.overtime_pay = data.overtimePay;
      delete transformed.overtimePay;
    }
    if (data.totalDeductions !== undefined) {
      transformed.total_deductions = data.totalDeductions;
      delete transformed.totalDeductions;
    }
    if (data.grossPay !== undefined) {
      transformed.gross_pay = data.grossPay;
      delete transformed.grossPay;
    }
    if (data.netPay !== undefined) {
      transformed.net_pay = data.netPay;
      delete transformed.netPay;
    }
    if (data.paidAt !== undefined) {
      transformed.paid_at = data.paidAt;
      delete transformed.paidAt;
    }
    if (data.paymentMethod !== undefined) {
      transformed.payment_method = data.paymentMethod;
      delete transformed.paymentMethod;
    }
  }
  
  if (data.createdAt !== undefined) {
    transformed.created_at = data.createdAt;
    delete transformed.createdAt;
  }
  
  return transformed;
};

const setupCrudEndpoints = (router, tableName) => {
  // GET all
  router.get(`/${tableName}`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${tableName}`);
      const transformed = rows.map(row => transformRow(row, tableName));
      res.json(transformed);
    } catch (err) {
      handleError(res, err);
    }
  });

  // GET by ID
  router.get(`/${tableName}/:id`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(transformRow(rows[0], tableName));
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST new
  router.post(`/${tableName}`, async (req, res) => {
    try {
      const data = transformToDb(req.body, tableName);
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
      const newId = uuidv4();

      const queryText = `INSERT INTO ${tableName} (id, ${columns.join(', ')}) VALUES ($1, ${placeholders}) RETURNING *`;
      const { rows } = await db.query(queryText, [newId, ...values]);
      res.status(201).json(transformRow(rows[0], tableName));
    } catch (err) {
      handleError(res, err);
    }
  });

  // PUT update by ID
  router.put(`/${tableName}/:id`, async (req, res) => {
    try {
      const data = transformToDb(req.body, tableName);
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

      const queryText = `UPDATE ${tableName} SET ${setString} WHERE id = $1 RETURNING *`;
      const { rows } = await db.query(queryText, [req.params.id, ...values]);

      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(transformRow(rows[0], tableName));
    } catch (err) {
      handleError(res, err);
    }
  });

  // DELETE by ID
  router.delete(`/${tableName}/:id`, async (req, res) => {
    try {
      const result = await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  });
};

apiRouter.get('/leads', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, 
             c.id as customer_id, c.name as customer_name, c.email as customer_email, 
             c.phone as customer_phone, c.address as customer_address
      FROM leads l
      LEFT JOIN customers c ON l.customer_id = c.id
    `);
    
    const transformed = rows.map(row => {
      const lead = transformRow(row, 'leads');
      lead.customer = {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
        address: row.customer_address
      };
      delete lead.customer_id;
      delete lead.customer_name;
      delete lead.customer_email;
      delete lead.customer_phone;
      delete lead.customer_address;
      return lead;
    });
    
    res.json(transformed);
  } catch (err) {
    handleError(res, err);
  }
});

apiRouter.post('/pay_periods/:id/process', async (req, res) => {
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
      
      payrollRecords.push(transformRow(payrollRows[0], 'payroll_records'));
      totalGrossPay += grossPay;
      totalNetPay += netPay;
    }
    
    const now = new Date().toISOString();
    const { rows: updatedPayPeriodRows } = await db.query(
      `UPDATE pay_periods SET status = $1, processed_at = $2 WHERE id = $3 RETURNING *`,
      ['Closed', now, req.params.id]
    );
    
    res.json({
      payPeriod: transformRow(updatedPayPeriodRows[0], 'pay_periods'),
      payrollRecords: payrollRecords,
      summary: {
        totalEmployees: payrollRecords.length,
        totalGrossPay: totalGrossPay,
        totalNetPay: totalNetPay
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});


const resources = ['customers', 'leads', 'quotes', 'jobs', 'invoices', 'employees', 'equipment', 'pay_periods', 'time_entries', 'payroll_records'];
resources.forEach(resource => {
  setupCrudEndpoints(apiRouter, resource);
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Backend server running on http://${HOST}:${PORT}`);
});