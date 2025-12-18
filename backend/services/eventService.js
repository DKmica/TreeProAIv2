const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const EVENT_TYPES = {
  QUOTE_ACCEPTED: 'quote.accepted',
  QUOTE_APPROVED: 'quote.approved',
  JOB_COMPLETED: 'job.completed',
  JOB_CREATED: 'job.created',
  INVOICE_CREATED: 'invoice.created'
};

const EVENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

const publishEvent = async (eventType, entityType, entityId, payload = {}, client = db) => {
  const eventId = uuidv4();
  
  await client.query(
    `INSERT INTO domain_events (id, event_type, entity_type, entity_id, payload, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [eventId, eventType, entityType, entityId, JSON.stringify(payload), EVENT_STATUS.PENDING]
  );
  
  console.log(`[EventService] Published event: ${eventType} for ${entityType}:${entityId}`);
  return eventId;
};

const getPendingEvents = async (limit = 10) => {
  const { rows } = await db.query(
    `SELECT * FROM domain_events 
     WHERE status = $1 AND retry_count < max_retries
     ORDER BY created_at ASC
     LIMIT $2`,
    [EVENT_STATUS.PENDING, limit]
  );
  return rows;
};

const getFailedEvents = async (limit = 50) => {
  const { rows } = await db.query(
    `SELECT * FROM domain_events 
     WHERE status = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [EVENT_STATUS.FAILED, limit]
  );
  return rows;
};

const markEventProcessing = async (eventId) => {
  await db.query(
    `UPDATE domain_events SET status = $1, updated_at = NOW() WHERE id = $2`,
    [EVENT_STATUS.PROCESSING, eventId]
  );
};

const markEventCompleted = async (eventId) => {
  await db.query(
    `UPDATE domain_events SET status = $1, processed_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [EVENT_STATUS.COMPLETED, eventId]
  );
};

const markEventFailed = async (eventId, errorMessage) => {
  await db.query(
    `UPDATE domain_events 
     SET status = CASE WHEN retry_count + 1 >= max_retries THEN $1 ELSE 'pending' END,
         retry_count = retry_count + 1,
         error_message = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [EVENT_STATUS.FAILED, errorMessage, eventId]
  );
};

const markEventSkipped = async (eventId, reason) => {
  await db.query(
    `UPDATE domain_events SET status = $1, error_message = $2, processed_at = NOW(), updated_at = NOW() WHERE id = $3`,
    [EVENT_STATUS.SKIPPED, reason, eventId]
  );
};

const retryEvent = async (eventId) => {
  await db.query(
    `UPDATE domain_events SET status = $1, retry_count = 0, error_message = NULL, updated_at = NOW() WHERE id = $2`,
    [EVENT_STATUS.PENDING, eventId]
  );
};

const dismissEvent = async (eventId) => {
  await db.query(
    `UPDATE domain_events SET status = $1, error_message = 'Manually dismissed', updated_at = NOW() WHERE id = $2`,
    [EVENT_STATUS.SKIPPED, eventId]
  );
};

const getEventStats = async () => {
  const { rows } = await db.query(
    `SELECT status, COUNT(*) as count FROM domain_events GROUP BY status`
  );
  return rows.reduce((acc, row) => {
    acc[row.status] = parseInt(row.count, 10);
    return acc;
  }, {});
};

module.exports = {
  EVENT_TYPES,
  EVENT_STATUS,
  publishEvent,
  getPendingEvents,
  getFailedEvents,
  markEventProcessing,
  markEventCompleted,
  markEventFailed,
  markEventSkipped,
  retryEvent,
  dismissEvent,
  getEventStats
};
