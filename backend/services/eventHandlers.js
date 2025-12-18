const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { EVENT_TYPES } = require('./eventService');
const { generateJobNumber, generateInvoiceNumber } = require('./numberService');

const handleQuoteAccepted = async (event) => {
  const quoteId = event.entity_id;
  
  const { rows: existingJobs } = await db.query(
    'SELECT id FROM jobs WHERE quote_id = $1 LIMIT 1',
    [quoteId]
  );
  
  if (existingJobs.length > 0) {
    return { skipped: true, reason: 'Job already exists for this quote', jobId: existingJobs[0].id };
  }
  
  const { rows: quotes } = await db.query(
    'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
    [quoteId]
  );
  
  const quote = quotes[0];
  if (!quote) {
    throw new Error('Quote not found');
  }
  
  let rawLineItems = quote.line_items || [];
  if (typeof rawLineItems === 'string') {
    try {
      rawLineItems = JSON.parse(rawLineItems);
    } catch (e) {
      rawLineItems = [];
    }
  }
  
  const selectedItems = (rawLineItems || []).filter(item => item && item.selected !== false);
  const totalAmount = selectedItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 1;
    const price = parseFloat(item.price) || 0;
    return sum + (qty * price);
  }, 0);
  
  const jobNumber = await generateJobNumber();
  const jobId = uuidv4();
  
  let propertyAddress = null;
  if (quote.property_id) {
    const { rows: props } = await db.query(
      'SELECT address, city, state, zip_code FROM properties WHERE id = $1',
      [quote.property_id]
    );
    if (props[0]) {
      const p = props[0];
      propertyAddress = [p.address, p.city, p.state, p.zip_code].filter(Boolean).join(', ');
    }
  }
  
  await db.query(
    `INSERT INTO jobs (
      id, job_number, quote_id, client_id, property_id,
      customer_name, customer_phone, customer_email, customer_address,
      job_location, service_type, line_items, estimated_price,
      status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Pending', NOW(), NOW()
    )`,
    [
      jobId,
      jobNumber,
      quoteId,
      quote.client_id,
      quote.property_id,
      quote.customer_name,
      quote.customer_phone,
      quote.customer_email,
      quote.customer_address,
      propertyAddress || quote.job_location || quote.customer_address,
      quote.service_type || 'Tree Service',
      JSON.stringify(selectedItems),
      totalAmount
    ]
  );
  
  console.log(`[EventHandler] Created job ${jobNumber} from quote ${quote.quote_number}`);
  return { success: true, jobId, jobNumber };
};

const handleJobCompleted = async (event) => {
  const jobId = event.entity_id;
  
  const { rows: existingInvoices } = await db.query(
    'SELECT id FROM invoices WHERE job_id = $1 LIMIT 1',
    [jobId]
  );
  
  if (existingInvoices.length > 0) {
    return { skipped: true, reason: 'Invoice already exists for this job', invoiceId: existingInvoices[0].id };
  }
  
  const { rows: jobs } = await db.query(
    'SELECT * FROM jobs WHERE id = $1',
    [jobId]
  );
  
  const job = jobs[0];
  if (!job) {
    throw new Error('Job not found');
  }
  
  let lineItems = job.line_items || [];
  if (typeof lineItems === 'string') {
    try {
      lineItems = JSON.parse(lineItems);
    } catch (e) {
      lineItems = [];
    }
  }
  
  const totalAmount = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 1;
    const price = parseFloat(item.price) || 0;
    return sum + (qty * price);
  }, 0);
  
  const invoiceNumber = await generateInvoiceNumber();
  const invoiceId = uuidv4();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  
  await db.query(
    `INSERT INTO invoices (
      id, invoice_number, job_id, client_id, 
      customer_name, customer_email, customer_phone, customer_address,
      line_items, subtotal, total_amount, amount_paid, status,
      issue_date, due_date, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, 'Draft',
      NOW(), $12, NOW(), NOW()
    )`,
    [
      invoiceId,
      invoiceNumber,
      jobId,
      job.client_id,
      job.customer_name,
      job.customer_email,
      job.customer_phone,
      job.customer_address,
      JSON.stringify(lineItems),
      totalAmount,
      totalAmount,
      dueDate
    ]
  );
  
  console.log(`[EventHandler] Created invoice ${invoiceNumber} from job ${job.job_number}`);
  return { success: true, invoiceId, invoiceNumber };
};

const eventHandlers = {
  [EVENT_TYPES.QUOTE_ACCEPTED]: handleQuoteAccepted,
  [EVENT_TYPES.QUOTE_APPROVED]: handleQuoteAccepted,
  [EVENT_TYPES.JOB_COMPLETED]: handleJobCompleted
};

const processEvent = async (event) => {
  const handler = eventHandlers[event.event_type];
  if (!handler) {
    return { skipped: true, reason: `No handler for event type: ${event.event_type}` };
  }
  return await handler(event);
};

module.exports = {
  handleQuoteAccepted,
  handleJobCompleted,
  processEvent
};
