const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { sanitizeUUID } = require('../utils/formatters');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { ensureClientAssociation } = require('../services/clientService');
const { reindexDocument, removeFromVectorStore } = require('../utils/vectorStore');

const router = express.Router();

router.get('/leads', async (req, res) => {
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
    `);

    const transformed = rows.map(row => {
      const lead = transformRow(row, 'leads');
      lead.customer = {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
        address: row.customer_address
      };
      delete lead.customer_id;
      delete lead.customer_name;
      delete lead.customer_email;
      delete lead.customer_phone;
      delete lead.customer_address;
      return lead;
    });

    res.json(transformed);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/leads', async (req, res) => {
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

    const insertQuery = `
      INSERT INTO leads (
        id, client_id_new, property_id, source, status, priority,
        lead_score, assigned_to, estimated_value, expected_close_date,
        next_followup_date, description, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *
    `;

    const { rows } = await db.query(insertQuery, [
      leadId,
      associatedClientId,
      leadData.propertyId || null,
      leadData.source || null,
      leadData.status || 'New',
      leadData.priority || 'medium',
      leadData.leadScore || 50,
      leadData.assignedTo || null,
      leadData.estimatedValue || null,
      leadData.expectedCloseDate || null,
      leadData.nextFollowupDate || null,
      leadData.description || null
    ]);

    const lead = transformRow(rows[0], 'leads');
    res.status(201).json(lead);

    reindexDocument('leads', rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/leads/:id', async (req, res) => {
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

router.put('/leads/:id', async (req, res) => {
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
        updated_at = NOW()
      WHERE id = $12
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

router.delete('/leads/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM leads WHERE id = $1', [req.params.id]);

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
