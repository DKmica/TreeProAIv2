const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { isAuthenticated } = require('../replitAuth');

const router = express.Router();

const ALLOWED_TYPES = new Set(['error', 'metric', 'event']);
const MAX_EVENTS_PER_REQUEST = 100;

function sanitizeEvent(event) {
  const type = ALLOWED_TYPES.has(event.type) ? event.type : 'event';
  const name = typeof event.name === 'string' && event.name.trim() ? event.name.trim() : 'unnamed';

  const coerceString = (value, maxLength) => {
    if (typeof value !== 'string') return null;
    return value.slice(0, maxLength);
  };

  const tags = Array.isArray(event.tags)
    ? event.tags
        .filter((tag) => typeof tag === 'string' && tag.trim())
        .slice(0, 10)
        .map((tag) => tag.slice(0, 64))
    : null;

  return {
    id: event.id || uuidv4(),
    type,
    name,
    message: coerceString(event.message, 5000),
    stack: coerceString(event.stack, 10000),
    value: typeof event.value === 'number' ? event.value : null,
    unit: coerceString(event.unit, 32),
    tags,
    data: event.data && typeof event.data === 'object' ? event.data : null,
    context: coerceString(event.context, 255),
    severity: coerceString(event.severity, 32),
    url: coerceString(event.url, 512),
    userAgent: coerceString(event.userAgent || event.user_agent, 512),
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
  };
}

router.post('/telemetry', async (req, res) => {
  const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, MAX_EVENTS_PER_REQUEST) : [];

  if (events.length === 0) {
    return res.status(400).json({ success: false, error: 'No telemetry events provided' });
  }

  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ Telemetry received but DATABASE_URL is not configured. Skipping persistence.');
    return res.status(202).json({ success: true, ingested: 0, mode: 'noop' });
  }

  const payloads = events.map(sanitizeEvent);

  const placeholders = payloads.map((_, index) => {
    const offset = index * 14;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`;
  });

  const values = payloads.flatMap((event) => [
    event.id,
    event.type,
    event.name,
    event.message,
    event.stack,
    event.value,
    event.unit,
    event.tags,
    event.data,
    event.context,
    event.severity,
    event.url,
    event.userAgent,
    event.timestamp,
  ]);

  try {
    await db.query(
      `INSERT INTO telemetry_events (
        id,
        type,
        name,
        message,
        stack,
        value,
        unit,
        tags,
        data,
        context,
        severity,
        url,
        user_agent,
        created_at
      ) VALUES ${placeholders.join(',')}`,
      values
    );

    return res.json({ success: true, ingested: payloads.length });
  } catch (err) {
    console.error('❌ Failed to persist telemetry batch', err.message);
    return res.status(500).json({ success: false, error: 'Failed to persist telemetry events' });
  }
});

router.get('/telemetry/recent', isAuthenticated, async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ success: false, error: 'Telemetry storage is disabled in this environment.' });
  }

  try {
    const { rows } = await db.query(
      `SELECT id, type, name, message, severity, url, user_agent, created_at
       FROM telemetry_events
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ Failed to fetch telemetry events', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch telemetry events' });
  }
});

module.exports = router;
