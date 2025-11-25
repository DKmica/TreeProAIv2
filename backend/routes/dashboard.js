const express = require('express');
const db = require('../db');
const { handleError } = require('../utils/errors');

const router = express.Router();

router.get('/dashboard/summary', async (req, res) => {
  try {
    const summaryQuery = `
      SELECT
        -- Entity counts (only clients, leads, quotes have deleted_at)
        (SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL) AS clients_count,
        (SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL) AS leads_count,
        (SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL AND status NOT IN ('Won', 'Lost', 'Closed')) AS active_leads_count,
        (SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL) AS quotes_count,
        (SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL AND status = 'Pending') AS pending_quotes_count,
        (SELECT COUNT(*) FROM jobs) AS jobs_count,
        (SELECT COUNT(*) FROM jobs WHERE status = 'Scheduled') AS scheduled_jobs_count,
        (SELECT COUNT(*) FROM jobs WHERE status = 'Completed') AS completed_jobs_count,
        (SELECT COUNT(*) FROM invoices) AS invoices_count,
        (SELECT COUNT(*) FROM invoices WHERE status != 'Paid') AS unpaid_invoices_count,
        (SELECT COUNT(*) FROM employees) AS employees_count,
        (SELECT COUNT(*) FROM equipment) AS equipment_count,
        
        -- Recent activity (last 7 days)
        (SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days') AS recent_leads_count,
        (SELECT COUNT(*) FROM jobs WHERE created_at >= NOW() - INTERVAL '7 days') AS recent_jobs_count,
        (SELECT COUNT(*) FROM invoices WHERE status NOT IN ('Paid', 'Void', 'Draft') AND due_date IS NOT NULL AND 
          CASE 
            WHEN due_date ~ '^\d+$' THEN to_timestamp(due_date::bigint / 1000) < NOW()
            WHEN due_date ~ '^\d{4}-\d{2}-\d{2}' THEN due_date::timestamp < CURRENT_TIMESTAMP
            ELSE false 
          END
        ) AS overdue_invoices_count,
        
        -- Revenue metrics
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices) AS total_invoiced,
        (SELECT COALESCE(SUM(amount), 0) FROM payment_records) AS total_paid
    `;

    const { rows } = await db.query(summaryQuery);
    const data = rows[0];

    const totalInvoiced = parseFloat(data.total_invoiced) || 0;
    const totalPaid = parseFloat(data.total_paid) || 0;

    const summary = {
      counts: {
        clients: parseInt(data.clients_count, 10) || 0,
        leads: parseInt(data.leads_count, 10) || 0,
        activeLeads: parseInt(data.active_leads_count, 10) || 0,
        quotes: parseInt(data.quotes_count, 10) || 0,
        pendingQuotes: parseInt(data.pending_quotes_count, 10) || 0,
        jobs: parseInt(data.jobs_count, 10) || 0,
        scheduledJobs: parseInt(data.scheduled_jobs_count, 10) || 0,
        completedJobs: parseInt(data.completed_jobs_count, 10) || 0,
        invoices: parseInt(data.invoices_count, 10) || 0,
        unpaidInvoices: parseInt(data.unpaid_invoices_count, 10) || 0,
        employees: parseInt(data.employees_count, 10) || 0,
        equipment: parseInt(data.equipment_count, 10) || 0
      },
      recentActivity: {
        recentLeads: parseInt(data.recent_leads_count, 10) || 0,
        recentJobs: parseInt(data.recent_jobs_count, 10) || 0,
        overdueInvoices: parseInt(data.overdue_invoices_count, 10) || 0
      },
      revenue: {
        totalInvoiced,
        totalPaid,
        outstanding: totalInvoiced - totalPaid
      }
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
