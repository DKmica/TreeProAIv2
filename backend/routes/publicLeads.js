const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { ensureClientAssociation } = require('../services/clientService');
const { reindexDocument } = require('../utils/vectorStore');

const router = express.Router();

router.post('/leads', async (req, res) => {
  try {
    const { customerDetails, source, description, estimateData } = req.body;

    if (!customerDetails || !customerDetails.firstName || !customerDetails.lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    if (!customerDetails.email && !customerDetails.phone) {
      return res.status(400).json({ error: 'Either email or phone is required' });
    }

    const leadId = uuidv4();
    let associatedClientId = null;

    try {
      const ensured = await ensureClientAssociation({
        clientId: null,
        customerDetails: customerDetails
      });
      associatedClientId = ensured.clientId;
    } catch (clientErr) {
      return res.status(400).json({ error: clientErr.message });
    }

    const estimatedValue = estimateData?.suggested_services?.reduce(
      (sum, s) => sum + ((s.price_range.min + s.price_range.max) / 2),
      0
    ) || null;

    const fullDescription = [
      description || 'Lead from AI Free Estimate landing page',
      estimateData ? `\n\n--- AI Estimate Details ---\nTree: ${estimateData.tree_identification}\nHeight: ${estimateData.measurements?.height_feet}ft\nCanopy: ${estimateData.measurements?.canopy_width_feet}ft\nTrunk Diameter: ${estimateData.measurements?.trunk_diameter_inches}in\n\nServices:\n${estimateData.suggested_services?.map(s => `- ${s.service_name}: $${s.price_range.min}-$${s.price_range.max}`).join('\n')}` : ''
    ].filter(Boolean).join('');

    await db.query('BEGIN');

    try {
      const workOrderId = uuidv4();
      await db.query(`
        INSERT INTO work_orders (
          id, client_id, property_id, stage, source, description, priority,
          estimated_value, created_at, updated_at
        ) VALUES ($1, $2, $3, 'lead', $4, $5, 'medium', $6, NOW(), NOW())
      `, [
        workOrderId,
        associatedClientId,
        null,
        source || 'AI Free Estimate',
        fullDescription,
        estimatedValue
      ]);

      const insertQuery = `
        INSERT INTO leads (
          id, client_id_new, property_id, work_order_id, source, status, priority,
          lead_score, estimated_value, description, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'New', 'medium', 70, $6, $7, NOW(), NOW()
        ) RETURNING *
      `;

      const { rows } = await db.query(insertQuery, [
        leadId,
        associatedClientId,
        null,
        workOrderId,
        source || 'AI Free Estimate',
        estimatedValue,
        fullDescription
      ]);

      await db.query(`
        UPDATE work_orders SET source_lead_id = $1 WHERE id = $2
      `, [leadId, workOrderId]);

      await db.query(`
        INSERT INTO work_order_events (id, work_order_id, event_type, payload, actor_type, occurred_at)
        VALUES ($1, $2, 'work_order.created', $3, 'system', NOW())
      `, [
        uuidv4(),
        workOrderId,
        JSON.stringify({
          stage: 'lead',
          source: source || 'AI Free Estimate',
          via: 'public_landing_page',
          hasEstimateData: !!estimateData
        })
      ]);

      await db.query('COMMIT');

      const lead = transformRow(rows[0], 'leads');
      lead.workOrderId = workOrderId;

      res.status(201).json({
        success: true,
        message: 'Your request has been submitted successfully',
        leadId: lead.id
      });

      reindexDocument('leads', rows[0]);
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
