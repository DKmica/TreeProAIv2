const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { sanitizeUUID } = require('../utils/formatters');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { ensureClientAssociation } = require('../services/clientService');
const { reindexDocument, removeFromVectorStore } = require('../utils/vectorStore');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { getJson, setJson } = require('../services/cacheService');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');
const workOrderService = require('../services/workOrderService');

const { LEADS_CACHE_TTL_SECONDS } = process.env;
const LEADS_CACHE_TTL = Number.isFinite(Number(LEADS_CACHE_TTL_SECONDS))
  ? Number(LEADS_CACHE_TTL_SECONDS)
  : 60;

const router = express.Router();

router.get('/leads', 
  requirePermission(RESOURCES.LEADS, ACTIONS.LIST),
  async (req, res) => {
  try {
    const { status, search } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);

    const shouldBypassCache =
      String(req.query.cache || '').toLowerCase() === 'false' ||
      String(req.query.cache || '').toLowerCase() === '0' ||
      String(req.headers['cache-control'] || '').toLowerCase().includes('no-cache');

    const filters = ['l.deleted_at IS NULL'];
    const params = [];

    if (status) {
      params.push(status);
      filters.push(`l.status = $${params.length}`);
    } else {
      filters.push("l.status != 'Lost'");
    }

    if (search) {
      const likeValue = `%${String(search)}%`;
      params.push(likeValue, likeValue, likeValue, likeValue);
      const startIndex = params.length - 3;
      filters.push(`(
        l.description ILIKE $${startIndex}
        OR l.source ILIKE $${startIndex + 1}
        OR CONCAT_WS(' ', c.first_name, c.last_name) ILIKE $${startIndex + 2}
        OR c.primary_email ILIKE $${startIndex + 3}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const baseQuery = `
      FROM leads l
      LEFT JOIN clients c ON l.client_id_new = c.id
      ${whereClause}
    `;

    const cacheKey = usePagination
      ? `leads:list:v1:page:${page}:size:${pageSize}:status:${status || 'all'}:q:${search || ''}`
      : `leads:list:v1:all:status:${status || 'all'}:q:${search || ''}`;

    if (usePagination && page === 1 && !shouldBypassCache) {
      const cached = await getJson(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const selectQuery = `
      SELECT l.*, 
             c.id as customer_id,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             c.primary_email as customer_email,
             c.primary_phone as customer_phone,
             c.billing_address_line1 as customer_address
      ${baseQuery}
      ${usePagination ? 'ORDER BY l.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2) : ''}
    `;

    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);

    const transformed = rows.map((row) => {
      const lead = transformRow(row, 'leads');
      lead.customer = {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
        address: row.customer_address,
      };
      delete lead.customer_id;
      delete lead.customer_name;
      delete lead.customer_email;
      delete lead.customer_phone;
      delete lead.customer_address;
      return lead;
    });

    if (!usePagination) {
      return res.json(transformed);
    }

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = Number.parseInt(countRows[0]?.total, 10) || 0;
    const payload = {
      data: transformed,
      pagination: buildPaginationMeta(total, page, pageSize),
    };

    if (page === 1 && !shouldBypassCache) {
      await setJson(cacheKey, payload, LEADS_CACHE_TTL);
    }

    res.json(payload);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/leads', 
  requirePermission(RESOURCES.LEADS, ACTIONS.CREATE),
  async (req, res) => {
  try {
    const leadData = req.body;
    const leadId = uuidv4();

    const sanitizedClientId = sanitizeUUID(leadData.clientId);
    let associatedClientId = sanitizedClientId;

    if (leadData.customerDetails) {
      try {
        const ensured = await ensureClientAssociation({
          clientId: sanitizedClientId,
          customerDetails: leadData.customerDetails
        });
        associatedClientId = ensured.clientId;
      } catch (clientErr) {
        return res.status(400).json({ error: clientErr.message });
      }
    } else if (!associatedClientId) {
      return res.status(400).json({ error: 'Client information is required to create a lead' });
    }

    delete leadData.customerDetails;

    await db.query('BEGIN');
    
    try {
      const workOrderId = uuidv4();
      await db.query(`
        INSERT INTO work_orders (
          id, client_id, property_id, stage, source, description, priority,
          assigned_employee_id, sold_by_employee_id, estimated_value, created_at, updated_at
        ) VALUES ($1, $2, $3, 'lead', $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        workOrderId,
        associatedClientId,
        leadData.propertyId || null,
        leadData.source || null,
        leadData.description || null,
        leadData.priority || 'medium',
        leadData.assignedTo || null,
        leadData.soldByEmployeeId || null,
        leadData.estimatedValue || null
      ]);

      const insertQuery = `
        INSERT INTO leads (
          id, client_id_new, property_id, work_order_id, source, status, priority,
          lead_score, assigned_to, estimated_value, expected_close_date,
          next_followup_date, description, sold_by_employee_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
        ) RETURNING *
      `;

      const { rows } = await db.query(insertQuery, [
        leadId,
        associatedClientId,
        leadData.propertyId || null,
        workOrderId,
        leadData.source || null,
        leadData.status || 'New',
        leadData.priority || 'medium',
        leadData.leadScore || 50,
        leadData.assignedTo || null,
        leadData.estimatedValue || null,
        leadData.expectedCloseDate || null,
        leadData.nextFollowupDate || null,
        leadData.description || null,
        leadData.soldByEmployeeId || null
      ]);

      await db.query(`
        UPDATE work_orders SET source_lead_id = $1 WHERE id = $2
      `, [leadId, workOrderId]);

      await db.query(`
        INSERT INTO work_order_events (id, work_order_id, event_type, payload, actor_type, occurred_at)
        VALUES ($1, $2, 'work_order.created', $3, 'system', NOW())
      `, [uuidv4(), workOrderId, JSON.stringify({ stage: 'lead', source: leadData.source, via: 'lead_endpoint' })]);

      await db.query('COMMIT');

      const lead = transformRow(rows[0], 'leads');
      lead.workOrderId = workOrderId;
      res.status(201).json(lead);

      reindexDocument('leads', rows[0]);
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/leads/:id', 
  requirePermission(RESOURCES.LEADS, ACTIONS.READ),
  async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, 
             c.id as customer_id,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             c.primary_email as customer_email,
             c.primary_phone as customer_phone,
             c.billing_address_line1 as customer_address
      FROM leads l
      LEFT JOIN clients c ON l.client_id_new = c.id
      WHERE l.id = $1
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = transformRow(rows[0], 'leads');
    lead.customer = {
      id: rows[0].customer_id,
      name: rows[0].customer_name,
      email: rows[0].customer_email,
      phone: rows[0].customer_phone,
      address: rows[0].customer_address
    };

    res.json(lead);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/leads/:id', 
  requirePermission(RESOURCES.LEADS, ACTIONS.UPDATE),
  async (req, res) => {
  try {
    const leadData = req.body;
    const { id } = req.params;

    const sanitizedClientId = sanitizeUUID(leadData.clientId);
    let associatedClientId = sanitizedClientId;

    if (leadData.customerDetails) {
      try {
        const ensured = await ensureClientAssociation({
          clientId: sanitizedClientId,
          customerDetails: leadData.customerDetails
        });
        associatedClientId = ensured.clientId;
      } catch (clientErr) {
        return res.status(400).json({ error: clientErr.message });
      }
    }

    delete leadData.customerDetails;

    const updateQuery = `
      UPDATE leads SET
        client_id_new = COALESCE($1, client_id_new),
        property_id = COALESCE($2, property_id),
        source = COALESCE($3, source),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        lead_score = COALESCE($6, lead_score),
        assigned_to = COALESCE($7, assigned_to),
        estimated_value = COALESCE($8, estimated_value),
        expected_close_date = COALESCE($9, expected_close_date),
        next_followup_date = COALESCE($10, next_followup_date),
        description = COALESCE($11, description),
        sold_by_employee_id = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;

    const { rows } = await db.query(updateQuery, [
      associatedClientId,
      leadData.propertyId,
      leadData.source,
      leadData.status,
      leadData.priority,
      leadData.leadScore,
      leadData.assignedTo,
      leadData.estimatedValue,
      leadData.expectedCloseDate,
      leadData.nextFollowupDate,
      leadData.description,
      leadData.soldByEmployeeId !== undefined ? leadData.soldByEmployeeId : null,
      id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = transformRow(rows[0], 'leads');
    res.json(lead);

    reindexDocument('leads', rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/leads/:id', 
  requirePermission(RESOURCES.LEADS, ACTIONS.DELETE),
  async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE leads SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.status(204).send();

    removeFromVectorStore('leads', req.params.id);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
