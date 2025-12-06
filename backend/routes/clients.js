const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} = require('../controllers/clientsController');

router.post('/clients', createClient);
router.get('/clients', getClients);
router.get('/clients/:id', getClientById);
router.put('/clients/:id', updateClient);
router.delete('/clients/:id', deleteClient);

router.get('/clients/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const activities = [];
    
    const quotesResult = await db.query(`
      SELECT id, quote_number, status, total_amount, created_at, updated_at
      FROM quotes 
      WHERE client_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `, [id]);
    
    for (const quote of quotesResult.rows) {
      activities.push({
        id: uuidv4(),
        clientId: id,
        type: 'quote_created',
        title: `Quote ${quote.quote_number} created`,
        description: `Quote for $${parseFloat(quote.total_amount || 0).toFixed(2)}`,
        occurredAt: quote.created_at,
        channel: 'system',
        relatedQuoteId: quote.id
      });
      
      if (quote.status === 'Accepted' && quote.updated_at !== quote.created_at) {
        activities.push({
          id: uuidv4(),
          clientId: id,
          type: 'quote_accepted',
          title: `Quote ${quote.quote_number} accepted`,
          description: `Customer approved the quote`,
          occurredAt: quote.updated_at,
          channel: 'system',
          relatedQuoteId: quote.id
        });
      }
    }
    
    const jobsResult = await db.query(`
      SELECT id, job_number, customer_name, status, created_at, work_started_at, work_ended_at
      FROM jobs 
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [id]);
    
    for (const job of jobsResult.rows) {
      const jobTitle = job.job_number || 'Job';
      activities.push({
        id: uuidv4(),
        clientId: id,
        type: 'job_created',
        title: `${jobTitle} created`,
        description: `New work order scheduled for ${job.customer_name || 'customer'}`,
        occurredAt: job.created_at,
        channel: 'system',
        relatedJobId: job.id
      });
      
      if (job.work_started_at) {
        activities.push({
          id: uuidv4(),
          clientId: id,
          type: 'job_started',
          title: `${jobTitle} started`,
          description: `Crew began work on site`,
          occurredAt: job.work_started_at,
          channel: 'system',
          relatedJobId: job.id
        });
      }
      
      if (job.work_ended_at) {
        activities.push({
          id: uuidv4(),
          clientId: id,
          type: 'job_completed',
          title: `${jobTitle} completed`,
          description: `Work finished on site`,
          occurredAt: job.work_ended_at,
          channel: 'system',
          relatedJobId: job.id
        });
      }
    }
    
    const invoicesResult = await db.query(`
      SELECT id, invoice_number, status, total_amount, created_at, paid_at
      FROM invoices 
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [id]);
    
    for (const invoice of invoicesResult.rows) {
      activities.push({
        id: uuidv4(),
        clientId: id,
        type: 'invoice_created',
        title: `Invoice ${invoice.invoice_number} sent`,
        description: `Invoice for $${parseFloat(invoice.total_amount || 0).toFixed(2)}`,
        occurredAt: invoice.created_at,
        channel: 'email',
        relatedInvoiceId: invoice.id
      });
      
      if (invoice.paid_at) {
        activities.push({
          id: uuidv4(),
          clientId: id,
          type: 'payment_received',
          title: `Payment received for ${invoice.invoice_number}`,
          description: `$${parseFloat(invoice.total_amount || 0).toFixed(2)} paid`,
          occurredAt: invoice.paid_at,
          channel: 'system',
          relatedInvoiceId: invoice.id
        });
      }
    }
    
    activities.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
    
    res.json({ success: true, data: activities.slice(0, 100) });
  } catch (error) {
    console.error('Error fetching client activity:', error);
    res.status(500).json({ error: 'Failed to fetch client activity' });
  }
});

module.exports = router;
