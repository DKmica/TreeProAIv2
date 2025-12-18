const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow, transformToDb } = require('../utils/transformers');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');
const { sanitizeUUID, snakeToCamel } = require('../utils/formatters');
const stripeService = require('../services/stripeService');
const reminderService = require('../services/reminderService');
const { emitBusinessEvent } = require('../services/automation');

const router = express.Router();

const generateInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  
  const query = `
    SELECT invoice_number 
    FROM invoices 
    WHERE invoice_number LIKE $1
    ORDER BY invoice_number DESC 
    LIMIT 1
  `;
  
  const { rows } = await db.query(query, [`${prefix}%`]);
  
  let nextNumber = 1;
  if (rows.length > 0) {
    const lastNumber = rows[0].invoice_number.split('-')[2];
    nextNumber = parseInt(lastNumber, 10) + 1;
  }
  
  const invoiceNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
  return invoiceNumber;
};

const calculateInvoiceTotals = (lineItems, discountAmount = 0, discountPercentage = 0, taxRate = 0) => {
  const subtotal = lineItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    return sum + price;
  }, 0);
  
  let totalDiscount = parseFloat(discountAmount) || 0;
  if (discountPercentage > 0) {
    totalDiscount = subtotal * (parseFloat(discountPercentage) / 100);
  }
  
  const totalAmount = subtotal - totalDiscount;
  const taxAmount = totalAmount * (parseFloat(taxRate) / 100);
  const grandTotal = totalAmount + taxAmount;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(totalDiscount.toFixed(2)),
    discountPercentage: parseFloat(discountPercentage) || 0,
    taxRate: parseFloat(taxRate) || 0,
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2))
  };
};

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

router.post('/invoices', async (req, res) => {
  try {
    const invoiceData = req.body;
    
    if (!invoiceData.customerName) {
      return res.status(400).json({
        success: false,
        error: 'customerName is required'
      });
    }
    
    if (!invoiceData.lineItems || !Array.isArray(invoiceData.lineItems) || invoiceData.lineItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'lineItems is required and must be a non-empty array'
      });
    }
    
    const invoiceNumber = await generateInvoiceNumber();
    
    const totals = calculateInvoiceTotals(
      invoiceData.lineItems,
      invoiceData.discountAmount || 0,
      invoiceData.discountPercentage || 0,
      invoiceData.taxRate || 0
    );
    
    const id = uuidv4();
    const status = invoiceData.status || 'Draft';
    const issueDate = invoiceData.issueDate || new Date().toISOString().split('T')[0];
    const dueDate = invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const paymentTerms = invoiceData.paymentTerms || 'Net 30';
    
    const amount = totals.grandTotal;
    const amountPaid = 0;
    const amountDue = totals.grandTotal;
    
    const billingType = invoiceData.billingType || 'single';
    const parentInvoiceId = invoiceData.parentInvoiceId || null;
    const paymentSchedule = invoiceData.paymentSchedule || [];
    const billingSequence = invoiceData.billingSequence || 1;
    const contractTotal = invoiceData.contractTotal || totals.grandTotal;

    const query = `
      INSERT INTO invoices (
        id, quote_id, job_id, client_id, property_id, customer_name, status,
        invoice_number, issue_date, due_date,
        line_items, subtotal, discount_amount, discount_percentage,
        tax_rate, tax_amount, total_amount, grand_total,
        amount_paid, amount_due, payment_terms,
        customer_email, customer_phone, customer_address,
        notes, customer_notes, amount,
        billing_type, parent_invoice_id, payment_schedule, billing_sequence, contract_total
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        $28, $29, $30, $31, $32
      )
      RETURNING *
    `;

    const values = [
      id,
      invoiceData.quoteId || null,
      invoiceData.jobId || null,
      invoiceData.clientId || null,
      invoiceData.propertyId || null,
      invoiceData.customerName,
      status,
      invoiceNumber,
      issueDate,
      dueDate,
      JSON.stringify(invoiceData.lineItems),
      totals.subtotal,
      totals.discountAmount,
      totals.discountPercentage,
      totals.taxRate,
      totals.taxAmount,
      totals.totalAmount,
      totals.grandTotal,
      amountPaid,
      amountDue,
      paymentTerms,
      invoiceData.customerEmail || null,
      invoiceData.customerPhone || null,
      invoiceData.customerAddress || null,
      invoiceData.notes || null,
      invoiceData.customerNotes || null,
      amount,
      billingType,
      parentInvoiceId,
      JSON.stringify(paymentSchedule),
      billingSequence,
      contractTotal
    ];
    
    const { rows } = await db.query(query, values);
    const result = transformRow(rows[0], 'invoices');

    reminderService.scheduleInvoiceReminders(rows[0]);

    try {
      await emitBusinessEvent('invoice_created', {
        id: result.id,
        ...result
      });
    } catch (e) {
      console.error('[Automation] Failed to emit invoice_created:', e.message);
    }

    res.status(201).json({
      success: true,
      data: result,
      message: `Invoice ${invoiceNumber} created successfully`
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/invoices/batch/candidates', async (req, res) => {
  try {
    const query = `
      SELECT j.*, 
             c.company_name, c.first_name, c.last_name, c.primary_email, c.primary_phone,
             p.address as property_address, p.city as property_city, p.state as property_state
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      LEFT JOIN properties p ON j.property_id = p.id
      WHERE j.status = 'completed'
        AND j.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM invoices i WHERE i.job_id = j.id
        )
      ORDER BY j.updated_at DESC
    `;
    
    const { rows } = await db.query(query);
    
    const candidates = rows.map(row => {
      const job = transformRow(row, 'jobs');
      job.clientName = row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || job.customerName || 'Unknown';
      job.clientEmail = row.primary_email;
      job.clientPhone = row.primary_phone;
      job.propertyAddress = [row.property_address, row.property_city, row.property_state].filter(Boolean).join(', ');
      return job;
    });
    
    res.json({
      success: true,
      data: candidates,
      count: candidates.length
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/invoices/batch', async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { jobIds, paymentTerms = 'Net 30', taxRate = 0 } = req.body;
    
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'jobIds is required and must be a non-empty array'
      });
    }
    
    await client.query('BEGIN');
    
    const createdInvoices = [];
    const errors = [];
    
    for (const jobId of jobIds) {
      try {
        const sanitizedJobId = sanitizeUUID(jobId);
        if (!sanitizedJobId) {
          errors.push({ jobId, error: 'Invalid job ID format' });
          continue;
        }
        
        const jobQuery = `
          SELECT j.*, 
                 c.company_name, c.first_name, c.last_name, c.primary_email, c.primary_phone,
                 c.id as client_id,
                 p.address, p.city, p.state, p.zip
          FROM jobs j
          LEFT JOIN clients c ON j.client_id = c.id
          LEFT JOIN properties p ON j.property_id = p.id
          WHERE j.id = $1 AND j.status = 'completed' AND j.deleted_at IS NULL
        `;
        
        const { rows: jobRows } = await client.query(jobQuery, [sanitizedJobId]);
        
        if (jobRows.length === 0) {
          errors.push({ jobId, error: 'Job not found or not completed' });
          continue;
        }
        
        const job = jobRows[0];
        
        const existingInvoiceQuery = 'SELECT id FROM invoices WHERE job_id = $1';
        const { rows: existingInvoices } = await client.query(existingInvoiceQuery, [sanitizedJobId]);
        
        if (existingInvoices.length > 0) {
          errors.push({ jobId, error: 'Invoice already exists for this job' });
          continue;
        }
        
        const lineItems = job.line_items || [];
        if (lineItems.length === 0) {
          lineItems.push({
            description: job.description || `Services for Job #${job.job_number || job.id.slice(0, 8)}`,
            quantity: 1,
            unitPrice: parseFloat(job.total_amount) || 0,
            price: parseFloat(job.total_amount) || 0,
            selected: true
          });
        }
        
        const totals = calculateInvoiceTotals(lineItems, 0, 0, taxRate);
        const invoiceNumber = await generateInvoiceNumber();
        
        const customerName = job.company_name || `${job.first_name || ''} ${job.last_name || ''}`.trim() || job.customer_name || 'Unknown';
        const customerAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(', ');
        
        const invoiceId = uuidv4();
        const issueDate = new Date().toISOString().split('T')[0];
        const dueDays = paymentTerms === 'Due on Receipt' ? 0 : parseInt(paymentTerms.replace('Net ', '')) || 30;
        const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const insertQuery = `
          INSERT INTO invoices (
            id, job_id, client_id, property_id, customer_name, status,
            invoice_number, issue_date, due_date,
            line_items, subtotal, discount_amount, discount_percentage,
            tax_rate, tax_amount, total_amount, grand_total,
            amount_paid, amount_due, payment_terms,
            customer_email, customer_phone, customer_address, amount,
            billing_type, billing_sequence, contract_total
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16, $17,
            $18, $19, $20,
            $21, $22, $23, $24,
            $25, $26, $27
          )
          RETURNING *
        `;
        
        const insertValues = [
          invoiceId,
          sanitizedJobId,
          job.client_id || null,
          job.property_id || null,
          customerName,
          'Draft',
          invoiceNumber,
          issueDate,
          dueDate,
          JSON.stringify(lineItems),
          totals.subtotal,
          0,
          0,
          taxRate,
          totals.taxAmount,
          totals.totalAmount,
          totals.grandTotal,
          0,
          totals.grandTotal,
          paymentTerms,
          job.primary_email || null,
          job.primary_phone || null,
          customerAddress || null,
          totals.grandTotal,
          'single',
          1,
          totals.grandTotal
        ];
        
        const { rows: invoiceRows } = await client.query(insertQuery, insertValues);
        const invoice = transformRow(invoiceRows[0], 'invoices');
        createdInvoices.push(invoice);
        
        reminderService.scheduleInvoiceReminders(invoiceRows[0]);
        
      } catch (jobError) {
        errors.push({ jobId, error: jobError.message });
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: {
        created: createdInvoices,
        errors: errors
      },
      message: `Created ${createdInvoices.length} invoice(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    handleError(res, err);
  } finally {
    client.release();
  }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1';
    const { rows: invoiceRows } = await db.query(invoiceQuery, [id]);
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    const invoice = transformRow(invoiceRows[0], 'invoices');
    
    const paymentQuery = 'SELECT * FROM payment_records WHERE invoice_id = $1 ORDER BY payment_date DESC';
    const { rows: payments } = await db.query(paymentQuery, [id]);
    invoice.payments = payments.map(p => transformRow(p, 'payment_records'));
    
    if (invoice.jobId) {
      const jobQuery = 'SELECT * FROM jobs WHERE id = $1';
      const { rows: jobRows } = await db.query(jobQuery, [invoice.jobId]);
      if (jobRows.length > 0) {
        invoice.job = transformRow(jobRows[0], 'jobs');
      }
    }
    
    if (invoice.clientId) {
      const clientQuery = 'SELECT * FROM clients WHERE id = $1';
      const { rows: clientRows } = await db.query(clientQuery, [invoice.clientId]);
      if (clientRows.length > 0) {
        invoice.client = transformRow(clientRows[0], 'clients');
      }
    }
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const currentQuery = 'SELECT * FROM invoices WHERE id = $1';
    const { rows: currentRows } = await db.query(currentQuery, [id]);
    
    if (currentRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    const currentInvoice = currentRows[0];
    
    let totals = {};
    if (updates.lineItems || updates.discountAmount !== undefined || updates.discountPercentage !== undefined || updates.taxRate !== undefined) {
      const lineItems = updates.lineItems || currentInvoice.line_items;
      const discountAmount = updates.discountAmount !== undefined ? updates.discountAmount : currentInvoice.discount_amount;
      const discountPercentage = updates.discountPercentage !== undefined ? updates.discountPercentage : currentInvoice.discount_percentage;
      const taxRate = updates.taxRate !== undefined ? updates.taxRate : currentInvoice.tax_rate;
      
      totals = calculateInvoiceTotals(lineItems, discountAmount, discountPercentage, taxRate);
      totals.amountDue = totals.grandTotal - (currentInvoice.amount_paid || 0);
    }
    
    const newStatus = updates.status || currentInvoice.status;
    let sentDate = currentInvoice.sent_date;
    let paidAt = currentInvoice.paid_at;
    
    if (newStatus === 'Sent' && currentInvoice.status !== 'Sent' && !sentDate) {
      sentDate = new Date().toISOString();
    }
    
    if (newStatus === 'Paid' && currentInvoice.status !== 'Paid' && !paidAt) {
      paidAt = new Date().toISOString();
    }
    
    const updateData = transformToDb(updates, 'invoices');
    
    if (Object.keys(totals).length > 0) {
      updateData.subtotal = totals.subtotal;
      updateData.discount_amount = totals.discountAmount;
      updateData.discount_percentage = totals.discountPercentage;
      updateData.tax_rate = totals.taxRate;
      updateData.tax_amount = totals.taxAmount;
      updateData.total_amount = totals.totalAmount;
      updateData.grand_total = totals.grandTotal;
      updateData.amount_due = totals.amountDue;
      updateData.amount = totals.grandTotal;
    }
    
    if (updates.status) {
      updateData.status = newStatus;
    }
    if (sentDate && sentDate !== currentInvoice.sent_date) {
      updateData.sent_date = sentDate;
    }
    if (paidAt && paidAt !== currentInvoice.paid_at) {
      updateData.paid_at = paidAt;
    }
    
    updateData.updated_at = new Date().toISOString();
    
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.invoice_number;
    
    const columns = Object.keys(updateData).filter(key => updateData[key] !== undefined);
    const values = columns.map(key => updateData[key]);
    const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    
    const query = `UPDATE invoices SET ${setString} WHERE id = $1 RETURNING *`;
    const { rows } = await db.query(query, [id, ...values]);

    const result = transformRow(rows[0], 'invoices');

    if (result.status === 'Paid' || result.status === 'Void') {
      reminderService.cancelInvoiceReminders(id);
    } else {
      reminderService.scheduleInvoiceReminders(rows[0]);
    }

    if (newStatus === 'Sent' && currentInvoice.status !== 'Sent') {
      try {
        await emitBusinessEvent('invoice_sent', { id: currentInvoice.id, ...result });
      } catch (e) {
        console.error('[Automation] Failed to emit invoice_sent:', e.message);
      }
    }

    if (newStatus === 'Paid' && currentInvoice.status !== 'Paid') {
      try {
        await emitBusinessEvent('invoice_paid', { id: currentInvoice.id, ...result });
      } catch (e) {
        console.error('[Automation] Failed to emit invoice_paid:', e.message);
      }
    }

    res.json({
      success: true,
      data: result,
      message: 'Invoice updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkQuery = 'SELECT * FROM invoices WHERE id = $1';
    const { rows: checkRows } = await db.query(checkQuery, [id]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    const query = `
      UPDATE invoices 
      SET status = 'Void', updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [id]);
    const result = transformRow(rows[0], 'invoices');
    
    res.json({
      success: true,
      data: result,
      message: 'Invoice voided successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/invoices/:id/payments', async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { id: invoiceId } = req.params;
    const { amount, paymentDate, paymentMethod, transactionId, referenceNumber, notes, recordedBy } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount is required and must be greater than 0'
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'paymentMethod is required'
      });
    }
    
    await client.query('BEGIN');
    
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1';
    const { rows: invoiceRows } = await client.query(invoiceQuery, [invoiceId]);
    
    if (invoiceRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    const invoice = invoiceRows[0];
    
    const currentAmountDue = parseFloat(invoice.amount_due || invoice.grand_total || invoice.amount || 0);
    const paymentAmount = parseFloat(amount);
    
    if (paymentAmount > currentAmountDue) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Payment amount ($${paymentAmount}) exceeds amount due ($${currentAmountDue})`
      });
    }
    
    const paymentId = uuidv4();
    const paymentInsertQuery = `
      INSERT INTO payment_records (
        id, invoice_id, amount, payment_date, payment_method,
        transaction_id, reference_number, notes, recorded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const paymentValues = [
      paymentId,
      invoiceId,
      paymentAmount,
      paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod,
      transactionId || null,
      referenceNumber || null,
      notes || null,
      recordedBy || null
    ];
    
    const { rows: paymentRows } = await client.query(paymentInsertQuery, paymentValues);
    
    const newAmountPaid = parseFloat(invoice.amount_paid || 0) + paymentAmount;
    const newAmountDue = currentAmountDue - paymentAmount;
    
    let newStatus = invoice.status;
    let paidAt = invoice.paid_at;
    
    if (newAmountDue <= 0.01) {
      newStatus = 'Paid';
      paidAt = paidAt || new Date().toISOString();
    }
    
    const invoiceUpdateQuery = `
      UPDATE invoices 
      SET 
        amount_paid = $1,
        amount_due = $2,
        status = $3,
        paid_at = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;
    
    const { rows: updatedInvoiceRows } = await client.query(invoiceUpdateQuery, [
      newAmountPaid,
      newAmountDue,
      newStatus,
      paidAt,
      invoiceId
    ]);
    
    await client.query('COMMIT');
    
    const payment = transformRow(paymentRows[0], 'payment_records');
    const updatedInvoice = transformRow(updatedInvoiceRows[0], 'invoices');
    
    res.status(201).json({
      success: true,
      data: {
        payment,
        invoice: updatedInvoice
      },
      message: `Payment of $${paymentAmount} recorded successfully`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    handleError(res, err);
  } finally {
    client.release();
  }
});

router.get('/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoiceQuery = 'SELECT id FROM invoices WHERE id = $1';
    const { rows: invoiceRows } = await db.query(invoiceQuery, [id]);
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    const paymentQuery = 'SELECT * FROM payment_records WHERE invoice_id = $1 ORDER BY payment_date DESC, created_at DESC';
    const { rows } = await db.query(paymentQuery, [id]);
    
    const payments = rows.map(row => transformRow(row, 'payment_records'));
    
    res.json({
      success: true,
      data: payments
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/invoices/:id/create-checkout-session', async (req, res) => {
  try {
    const { id: invoiceId } = req.params;
    
    const invoiceQuery = `
      SELECT i.*, c.id as client_id, c.primary_email, c.stripe_customer_id
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = $1
    `;
    const { rows: invoiceRows } = await db.query(invoiceQuery, [invoiceId]);
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    const invoice = invoiceRows[0];
    
    if (invoice.status === 'Paid') {
      return res.status(400).json({
        success: false,
        error: 'Invoice is already paid'
      });
    }
    
    const amountDue = parseFloat(invoice.amount_due || invoice.grand_total || invoice.amount || 0);
    
    if (amountDue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No amount due on this invoice'
      });
    }
    
    let stripeCustomerId = invoice.stripe_customer_id;
    
    if (!stripeCustomerId && invoice.client_id && invoice.primary_email) {
      try {
        const customer = await stripeService.createCustomer(invoice.primary_email, invoice.client_id);
        stripeCustomerId = customer.id;
        console.log(`✅ Created Stripe customer ${stripeCustomerId} for client ${invoice.client_id}`);
      } catch (err) {
        console.error(`❌ Failed to create Stripe customer for client ${invoice.client_id}:`, err.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to create Stripe customer'
        });
      }
    }
    
    const baseUrl = req.protocol + '://' + req.get('host');
    const successUrl = `${baseUrl}/portal/invoices/${invoiceId}?payment=success`;
    const cancelUrl = `${baseUrl}/portal/invoices/${invoiceId}?payment=cancelled`;
    
    const session = await stripeService.createCheckoutSession(
      stripeCustomerId,
      invoiceId,
      amountDue,
      invoice.invoice_number || invoiceId,
      invoice.customer_email || invoice.primary_email,
      successUrl,
      cancelUrl
    );
    
    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/invoices/:id/payment-link', async (req, res) => {
  try {
    const { id: invoiceId } = req.params;

    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.VERCEL_URL || process.env.REPLIT_APP_URL || `${req.protocol}://${req.get('host')}`;
    const successUrl = `${baseUrl}/invoice/${invoiceId}?status=paid`;
    const cancelUrl = `${baseUrl}/invoice/${invoiceId}`;

    const invoiceQuery = `
      SELECT i.*, c.id as client_id, c.primary_email, c.stripe_customer_id
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = $1
    `;

    const { rows: invoiceRows } = await db.query(invoiceQuery, [invoiceId]);

    if (invoiceRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const invoice = invoiceRows[0];

    if (invoice.status === 'Paid') {
      return res.status(400).json({ success: false, error: 'Invoice is already paid' });
    }

    const amountDue = parseFloat(invoice.amount_due || invoice.grand_total || invoice.amount || 0);

    if (amountDue <= 0) {
      return res.status(400).json({ success: false, error: 'No amount due on this invoice' });
    }

    const fallbackLink = `${baseUrl}/invoice/${invoiceId}`;
    
    try {
      const { url: paymentLink } = await stripeService.createCheckoutSession(
        invoice.stripe_customer_id,
        invoiceId,
        amountDue,
        invoice.invoice_number || invoiceId,
        invoice.customer_email || invoice.primary_email,
        successUrl,
        cancelUrl
      );

      res.json({ success: true, paymentLink });
    } catch (stripeErr) {
      console.warn('Stripe checkout creation failed, using fallback:', stripeErr.message);
      return res.json({
        success: true,
        paymentLink: fallbackLink,
        message: 'Stripe not configured; using portal link instead',
      });
    }
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:id/convert-to-invoice', async (req, res) => {
  const { id } = req.params;
  const sanitizedId = sanitizeUUID(id);

  if (!sanitizedId) {
    return res.status(400).json({ success: false, error: 'Invalid quote ID' });
  }

  await db.query('BEGIN');

  try {
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [sanitizedId]
    );

    if (quoteRows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    const { rows: existingInvoices } = await db.query(
      'SELECT id, invoice_number FROM invoices WHERE quote_id = $1 LIMIT 1',
      [sanitizedId]
    );

    if (existingInvoices.length > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Quote already converted to invoice ${existingInvoices[0].invoice_number || existingInvoices[0].id}`
      });
    }

    const quote = quoteRows[0];
    const allowedStatuses = ['Sent', 'Accepted'];

    if (!allowedStatuses.includes(quote.status)) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Cannot convert quote with status '${quote.status}' to invoice. Quote must be 'Sent' or 'Accepted'.`
      });
    }

    const selectedLineItems = Array.isArray(quote.line_items)
      ? quote.line_items.filter(item => item.selected !== false)
      : [];

    if (selectedLineItems.length === 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Quote has no selected line items to invoice'
      });
    }

    const totals = calculateInvoiceTotals(
      selectedLineItems,
      quote.discount_amount || 0,
      quote.discount_percentage || 0,
      quote.tax_rate || 0
    );

    const invoiceId = uuidv4();
    const invoiceNumber = await generateInvoiceNumber();
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const paymentTerms = quote.payment_terms || 'Net 30';

    let clientEmail = null;
    let clientPhone = null;
    let clientAddress = null;

    if (quote.client_id) {
      const { rows: clients } = await db.query(
        `SELECT primary_email, primary_phone, billing_address_line1, billing_address_line2, 
                billing_city, billing_state, billing_zip_code 
         FROM clients WHERE id = $1`,
        [quote.client_id]
      );
      
      if (clients.length > 0) {
        const client = clients[0];
        clientEmail = client.primary_email;
        clientPhone = client.primary_phone;
        
        const addressParts = [
          client.billing_address_line1,
          client.billing_address_line2,
          client.billing_city,
          client.billing_state,
          client.billing_zip_code
        ].filter(Boolean);
        clientAddress = addressParts.join(', ');
      }
    }

    const insertInvoiceQuery = `
      INSERT INTO invoices (
        id, quote_id, job_id, client_id, property_id, customer_name, status,
        invoice_number, issue_date, due_date,
        line_items, subtotal, discount_amount, discount_percentage,
        tax_rate, tax_amount, total_amount, grand_total,
        amount_paid, amount_due, payment_terms,
        customer_email, customer_phone, customer_address,
        notes, customer_notes, amount
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27
      )
      RETURNING *
    `;

    const insertValues = [
      invoiceId,
      sanitizedId,
      quote.job_id || null,
      quote.client_id || null,
      quote.property_id || null,
      quote.customer_name,
      'Draft',
      invoiceNumber,
      issueDate,
      dueDate,
      JSON.stringify(selectedLineItems),
      totals.subtotal,
      totals.discountAmount,
      totals.discountPercentage,
      totals.taxRate,
      totals.taxAmount,
      totals.totalAmount,
      totals.grandTotal,
      0,
      totals.grandTotal,
      paymentTerms,
      clientEmail || quote.customer_email || null,
      clientPhone || quote.customer_phone || null,
      clientAddress || quote.job_location || null,
      quote.terms_and_conditions || null,
      quote.special_instructions || null,
      totals.grandTotal
    ];

    const { rows: invoiceRows } = await db.query(insertInvoiceQuery, insertValues);

    const updateQuoteQuery = `
      UPDATE quotes
      SET status = 'Invoiced', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const { rows: updatedQuoteRows } = await db.query(updateQuoteQuery, [sanitizedId]);

    await db.query('COMMIT');

    const invoice = transformRow(invoiceRows[0], 'invoices');
    const updatedQuote = snakeToCamel(updatedQuoteRows[0]);

    reminderService.scheduleInvoiceReminders(invoiceRows[0]);

    try {
      await emitBusinessEvent('invoice_created', {
        id: invoice.id,
        ...invoice
      });
    } catch (e) {
      console.error('[Automation] Failed to emit invoice_created:', e.message);
    }

    return res.status(201).json({
      success: true,
      data: { invoice, quote: updatedQuote },
      message: `Invoice ${invoiceNumber} created from quote`
    });
  } catch (err) {
    await db.query('ROLLBACK');
    handleError(res, err);
  }
});

module.exports = router;
