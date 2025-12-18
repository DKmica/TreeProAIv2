const express = require('express');
const router = express.Router();
const db = require('../db');

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

router.get('/exception-queue', async (req, res) => {
  try {
    const [pendingQuotes, overdueInvoices, missingForms, followUps] = await Promise.all([
      db.query(`SELECT eq.id, 'quote_pending_approval' as exception_type, q.id as entity_id, q.quote_number, q.customer_name, q.approval_status, q.created_at, 'high' as priority FROM exception_queue eq JOIN quotes q ON q.id = eq.entity_id WHERE eq.exception_type = 'quote_pending_approval' AND eq.is_resolved = false ORDER BY eq.created_at ASC`),
      db.query(`SELECT eq.id, 'invoice_overdue' as exception_type, i.id as entity_id, i.invoice_number, i.customer_name, i.status, i.due_date, CAST(EXTRACT(DAY FROM NOW() - i.due_date) AS INTEGER) as days_overdue, i.balance_amount as amount_due, CASE WHEN EXTRACT(DAY FROM NOW() - i.due_date) > 90 THEN 'critical' WHEN EXTRACT(DAY FROM NOW() - i.due_date) > 60 THEN 'high' ELSE 'medium' END as priority FROM exception_queue eq JOIN invoices i ON i.id = eq.entity_id WHERE eq.exception_type = 'invoice_overdue' AND eq.is_resolved = false ORDER BY i.due_date ASC`),
      db.query(`SELECT eq.id, 'job_missing_forms' as exception_type, j.id as entity_id, j.job_number, j.customer_name, j.status, 'medium' as priority FROM exception_queue eq JOIN jobs j ON j.id = eq.entity_id WHERE eq.exception_type = 'job_missing_forms' AND eq.is_resolved = false ORDER BY j.created_at ASC`),
      db.query(`SELECT eq.id, 'quote_follow_up' as exception_type, q.id as entity_id, q.quote_number, q.customer_name, q.status, 'low' as priority FROM exception_queue eq JOIN quotes q ON q.id = eq.entity_id WHERE eq.exception_type = 'quote_follow_up' AND eq.is_resolved = false ORDER BY eq.created_at ASC`)
    ]);

    const summary = {
      totalExceptions: pendingQuotes.rows.length + overdueInvoices.rows.length + missingForms.rows.length + followUps.rows.length,
      criticalCount: overdueInvoices.rows.filter(i => i.priority === 'critical').length,
      highCount: overdueInvoices.rows.filter(i => i.priority === 'high').length + pendingQuotes.rows.length
    };

    res.json({
      pendingQuotes: pendingQuotes.rows,
      overdueInvoices: overdueInvoices.rows,
      missingForms: missingForms.rows,
      followUps: followUps.rows,
      summary
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/exception-queue/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE exception_queue SET is_resolved = true, resolved_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Exception resolved' });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
