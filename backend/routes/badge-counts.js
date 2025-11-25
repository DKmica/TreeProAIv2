const express = require('express');
const db = require('../db.js');

const router = express.Router();

router.get('/badge-counts', async (req, res) => {
  try {
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const [
      pendingLeadsResult,
      unpaidInvoicesResult,
      todayJobsResult,
      exceptionsResult
    ] = await Promise.all([
      db.query(`
        SELECT COUNT(*) as count 
        FROM leads 
        WHERE status = 'new' OR status = 'contacted'
      `),
      db.query(`
        SELECT COUNT(*) as count 
        FROM invoices 
        WHERE status IN ('draft', 'sent', 'overdue')
      `),
      db.query(`
        SELECT COUNT(*) as count 
        FROM jobs 
        WHERE scheduled_date::date = $1::date 
        AND status NOT IN ('completed', 'cancelled')
      `, [todayStr]),
      db.query(`
        SELECT COUNT(*) as count 
        FROM exception_queue 
        WHERE status = 'pending'
      `).catch(() => ({ rows: [{ count: 0 }] }))
    ]);

    res.json({
      pendingLeads: parseInt(pendingLeadsResult.rows[0]?.count || 0, 10),
      pendingQuotes: 0,
      unpaidInvoices: parseInt(unpaidInvoicesResult.rows[0]?.count || 0, 10),
      todayJobs: parseInt(todayJobsResult.rows[0]?.count || 0, 10),
      exceptions: parseInt(exceptionsResult.rows[0]?.count || 0, 10),
      unreadMessages: 0,
    });
  } catch (error) {
    console.error('Error fetching badge counts:', error);
    res.status(500).json({
      error: 'Failed to fetch badge counts',
      pendingLeads: 0,
      pendingQuotes: 0,
      unpaidInvoices: 0,
      todayJobs: 0,
      exceptions: 0,
      unreadMessages: 0,
    });
  }
});

module.exports = router;
