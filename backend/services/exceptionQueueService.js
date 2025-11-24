/**
 * Exception Queue Service
 * Manages pending quotes, overdue invoices, missing forms, etc
 */

const db = require('../db');
const { v4: uuidv4 } = require('uuid');

async function getExceptionQueues() {
  try {
    // Quotes awaiting approval
    const pendingQuotes = await db.query(`
      SELECT 
        eq.id, 
        'quote_pending_approval' as exception_type,
        q.id as entity_id,
        q.quote_number,
        q.customer_name,
        q.approval_status,
        q.created_at,
        'high' as priority
      FROM exception_queue eq
      JOIN quotes q ON q.id = eq.entity_id
      WHERE eq.exception_type = 'quote_pending_approval'
      AND eq.is_resolved = false
      ORDER BY eq.created_at ASC
    `);

    // Overdue invoices (60+ days)
    const overdueInvoices = await db.query(`
      SELECT
        eq.id,
        'invoice_overdue' as exception_type,
        i.id as entity_id,
        i.invoice_number,
        i.customer_name,
        i.status,
        i.due_date,
        CAST(EXTRACT(DAY FROM NOW() - i.due_date) AS INTEGER) as days_overdue,
        i.balance_amount as amount_due,
        CASE 
          WHEN EXTRACT(DAY FROM NOW() - i.due_date) > 90 THEN 'critical'
          WHEN EXTRACT(DAY FROM NOW() - i.due_date) > 60 THEN 'high'
          ELSE 'medium'
        END as priority
      FROM exception_queue eq
      JOIN invoices i ON i.id = eq.entity_id
      WHERE eq.exception_type = 'invoice_overdue'
      AND eq.is_resolved = false
      ORDER BY i.due_date ASC
    `);

    // Jobs missing required forms
    const missingForms = await db.query(`
      SELECT
        eq.id,
        'job_missing_forms' as exception_type,
        j.id as entity_id,
        j.job_number,
        j.customer_name,
        j.status,
        'medium' as priority
      FROM exception_queue eq
      JOIN jobs j ON j.id = eq.entity_id
      WHERE eq.exception_type = 'job_missing_forms'
      AND eq.is_resolved = false
      ORDER BY j.created_at ASC
    `);

    // Quote follow-ups
    const followUps = await db.query(`
      SELECT
        eq.id,
        'quote_follow_up' as exception_type,
        q.id as entity_id,
        q.quote_number,
        q.customer_name,
        q.status,
        qf.follow_up_date,
        'low' as priority
      FROM exception_queue eq
      JOIN quotes q ON q.id = eq.entity_id
      LEFT JOIN quote_followups qf ON qf.quote_id = q.id
      WHERE eq.exception_type = 'quote_follow_up'
      AND eq.is_resolved = false
      ORDER BY qf.follow_up_date ASC
    `);

    return {
      pendingQuotes: pendingQuotes.rows,
      overdueInvoices: overdueInvoices.rows,
      missingForms: missingForms.rows,
      followUps: followUps.rows,
      summary: {
        totalExceptions: pendingQuotes.rows.length + overdueInvoices.rows.length + missingForms.rows.length + followUps.rows.length,
        criticalCount: overdueInvoices.rows.filter(i => i.priority === 'critical').length,
        highCount: (overdueInvoices.rows.filter(i => i.priority === 'high').length + pendingQuotes.rows.length)
      }
    };
  } catch (error) {
    console.error('Exception queue fetch error:', error);
    throw error;
  }
}

async function resolveException(exceptionId) {
  try {
    await db.query(`
      UPDATE exception_queue
      SET is_resolved = true, resolved_at = NOW()
      WHERE id = $1
    `, [exceptionId]);
    
    return { success: true };
  } catch (error) {
    console.error('Exception resolve error:', error);
    throw error;
  }
}

async function createExceptionForQuote(quoteId, exceptionType) {
  try {
    await db.query(`
      INSERT INTO exception_queue (id, exception_type, entity_type, entity_id, priority)
      VALUES ($1, $2, 'quote', $3, 'high')
      ON CONFLICT (exception_type, entity_id) DO NOTHING
    `, [uuidv4(), exceptionType, quoteId]);
  } catch (error) {
    console.error('Create exception error:', error);
    throw error;
  }
}

module.exports = { getExceptionQueues, resolveException, createExceptionForQuote };
