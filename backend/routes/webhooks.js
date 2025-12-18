const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

router.post('/webhooks/angi', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.ANGI_ADS_WEBHOOK_SECRET;

    if (!apiKey || apiKey !== expectedApiKey) {
      console.log('Angi Ads webhook: Invalid or missing API key');
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    }

    const { name, phone, email, comments, description, address, location, timestamp, leadId } = req.body;

    if (!name || !phone || !email) {
      console.log('Angi Ads webhook: Missing required fields');
      return res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: name, phone, email' });
    }

    console.log(`Angi Ads webhook: Received lead from Angi Ads - ${name} (${email})`);

    const customerAddress = address || location || '';
    const leadDescription = comments || description || '';
    let clientId;
    let customerName = name;

    const { rows: existingClients } = await db.query(
      `SELECT * FROM clients WHERE primary_email = $1 OR primary_phone = $2 LIMIT 1`,
      [email, phone]
    );

    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
      customerName = existingClients[0].first_name && existingClients[0].last_name 
        ? `${existingClients[0].first_name} ${existingClients[0].last_name}`.trim()
        : existingClients[0].first_name || existingClients[0].last_name || existingClients[0].company_name || name;
      console.log(`Angi Ads webhook: Found existing client ${clientId}`);
    } else {
      clientId = uuidv4();
      const nameParts = name.trim().split(' ');
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : null;
      const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : null;
      
      const { rows: newClientRows } = await db.query(
        `INSERT INTO clients (id, first_name, last_name, primary_email, primary_phone, billing_address_line1, status, client_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [clientId, firstName, lastName, email, phone, customerAddress, 'active', 'residential']
      );
      console.log(`Angi Ads webhook: Created new client ${clientId}`);
    }

    const newLeadId = uuidv4();
    const leadDescriptionWithAngiId = leadDescription 
      ? `${leadDescription}\n\nAngi Lead ID: ${leadId || 'N/A'}` 
      : `Angi Lead ID: ${leadId || 'N/A'}`;

    const { rows: newLeadRows } = await db.query(
      `INSERT INTO leads (id, client_id, source, status, description, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [newLeadId, clientId, 'Angi Ads', 'New', leadDescriptionWithAngiId, new Date().toISOString()]
    );

    console.log(`Angi Ads webhook: Created new lead ${newLeadId} for client ${clientId}`);

    res.status(200).json({
      success: true,
      leadId: newLeadId,
      clientId: clientId
    });

  } catch (err) {
    console.error('Angi Ads webhook error:', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message 
    });
  }
});

module.exports = router;
