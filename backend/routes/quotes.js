const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { snakeToCamel, sanitizeUUID } = require('../utils/formatters');
const { normalizeText, normalizeEmail, normalizePhone } = require('../utils/helpers');
const { isAuthenticated } = require('../auth');
const automationService = require('../services/automationService');
const { emitBusinessEvent } = require('../services/automation');
const ragService = require('../services/ragService');
const vectorStore = require('../services/vectorStore');
const { generateJobNumber } = require('../services/numberService');

const router = express.Router();

const CLIENT_CATEGORIES = {
  POTENTIAL: 'potential',
  ACTIVE: 'active',
  VIP: 'vip',
  INACTIVE: 'inactive'
};

const setClientCategory = async (clientId, category) => {
  if (!clientId || !Object.values(CLIENT_CATEGORIES).includes(category)) return;
  await db.query(
    'UPDATE clients SET client_category = $1, updated_at = NOW() WHERE id = $2',
    [category, clientId]
  );
};

const markClientAsPotential = async (clientId) => {
  if (!clientId) return;
  const { rows } = await db.query(
    `SELECT COUNT(*) AS completed_jobs FROM jobs WHERE client_id = $1 AND LOWER(status) = 'completed'`,
    [clientId]
  );
  const completedJobs = parseInt(rows[0]?.completed_jobs || 0, 10);
  if (completedJobs === 0) {
    await setClientCategory(clientId, CLIENT_CATEGORIES.POTENTIAL);
  }
};

const ensureClientAssociation = async ({ clientId, customerDetails = {}, defaultClientType = 'residential' }) => {
  const sanitizedClientId = sanitizeUUID(clientId);
  const normalizedDetails = {
    first_name: normalizeText(customerDetails.firstName),
    last_name: normalizeText(customerDetails.lastName),
    company_name: normalizeText(customerDetails.companyName),
    primary_email: normalizeEmail(customerDetails.email),
    primary_phone: normalizePhone(customerDetails.phone),
    billing_address_line1: normalizeText(customerDetails.addressLine1),
    billing_address_line2: normalizeText(customerDetails.addressLine2),
    billing_city: normalizeText(customerDetails.city),
    billing_state: normalizeText(customerDetails.state),
    billing_zip_code_code: normalizeText(customerDetails.zipCode),
    billing_country: normalizeText(customerDetails.country) || 'USA'
  };

  let clientRow = null;

  if (sanitizedClientId) {
    const { rows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [sanitizedClientId]
    );
    clientRow = rows[0] || null;
  }

  if (!clientRow) {
    const conditions = [];
    const params = [];
    if (normalizedDetails.primary_email) {
      conditions.push(`LOWER(primary_email) = $${params.length + 1}`);
      params.push(normalizedDetails.primary_email);
    }
    if (normalizedDetails.primary_phone) {
      conditions.push(`REGEXP_REPLACE(COALESCE(primary_phone, ''), '[^0-9]', '', 'g') = $${params.length + 1}`);
      params.push(normalizedDetails.primary_phone);
    }

    if (conditions.length > 0) {
      const { rows } = await db.query(
        `SELECT * FROM clients WHERE deleted_at IS NULL AND (${conditions.join(' OR ')}) LIMIT 1`,
        params
      );
      clientRow = rows[0] || null;
    }
  }

  if (clientRow) {
    const updates = {};
    Object.entries(normalizedDetails).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        updates[key] = value;
      }
    });

    if (Object.keys(updates).length > 0) {
      const columns = Object.keys(updates);
      const values = Object.values(updates);
      const setString = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
      await db.query(
        `UPDATE clients SET ${setString}, updated_at = NOW() WHERE id = $1`,
        [clientRow.id, ...values]
      );

      const { rows } = await db.query('SELECT * FROM clients WHERE id = $1', [clientRow.id]);
      clientRow = rows[0];
    }

    await markClientAsPotential(clientRow.id);
    return { clientId: clientRow.id, client: clientRow, created: false };
  }

  if (!normalizedDetails.first_name && !normalizedDetails.last_name && !normalizedDetails.company_name) {
    throw new Error('Client name or company is required to create a record');
  }

  const newClientId = sanitizedClientId || uuidv4();
  const insertData = {
    id: newClientId,
    first_name: normalizedDetails.first_name,
    last_name: normalizedDetails.last_name,
    company_name: normalizedDetails.company_name,
    primary_email: normalizedDetails.primary_email,
    primary_phone: normalizedDetails.primary_phone,
    billing_address_line1: normalizedDetails.billing_address_line1,
    billing_address_line2: normalizedDetails.billing_address_line2,
    billing_city: normalizedDetails.billing_city,
    billing_state: normalizedDetails.billing_state,
    billing_zip_code_code: normalizedDetails.billing_zip_code_code,
    billing_country: normalizedDetails.billing_country,
    status: 'active',
    client_type: defaultClientType,
    client_category: CLIENT_CATEGORIES.POTENTIAL,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const columns = Object.keys(insertData).filter((key) => insertData[key] !== undefined);
  const values = columns.map((key) => insertData[key]);
  const placeholders = columns.map((_, index) => `$${index + 1}`);

  const { rows } = await db.query(
    `INSERT INTO clients (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );

  clientRow = rows[0];
  await markClientAsPotential(clientRow.id);
  return { clientId: clientRow.id, client: clientRow, created: true };
};

const calculateQuoteTotals = (lineItems, discountPercentage = 0, discountAmount = 0, taxRate = 0) => {
  const subtotal = lineItems.reduce((sum, item) => {
    const itemTotal = item.price !== undefined 
      ? (item.price || 0) 
      : ((item.quantity || 0) * (item.unitPrice || 0));
    return sum + itemTotal;
  }, 0);
  
  let finalDiscountAmount = discountAmount;
  if (discountPercentage > 0) {
    finalDiscountAmount = (subtotal * discountPercentage) / 100;
  }
  
  const afterDiscount = subtotal - finalDiscountAmount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const grandTotal = afterDiscount + taxAmount;
  
  return {
    totalAmount: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(finalDiscountAmount.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2))
  };
};

const generateQuoteNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `Q-${year}${month}`;
  
  const { rows } = await db.query(
    `SELECT quote_number FROM quotes 
     WHERE quote_number LIKE $1 
     ORDER BY quote_number DESC LIMIT 1`,
    [`${prefix}-%`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0 && rows[0].quote_number) {
    const lastNumber = parseInt(rows[0].quote_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
};

const transformRow = (row, tableName) => {
  if (!row) return null;
  
  const transformed = { ...row };
  
  if (tableName === 'jobs') {
    if (row.lat !== undefined && row.lon !== undefined) {
      transformed.coordinates = { lat: row.lat, lng: row.lon };
      delete transformed.lat;
      delete transformed.lon;
    }
  }
  
  return transformed;
};

const reindexDocument = async (tableName, row) => {
  if (!row) return;

  try {
    console.log(`[RAG] Re-indexing document for ${tableName} ID: ${row.id}`);
    switch (tableName) {
      case 'quotes':
        await ragService.indexQuotes([row]);
        break;
      case 'jobs':
        await ragService.indexJobs([row]);
        break;
      default:
        break;
    }
    console.log('[RAG] Re-indexing complete.');
  } catch (err) {
    console.error('[RAG] Failed to re-index document:', err);
  }
};

const removeFromVectorStore = async (tableName, id) => {
  const prefixes = { quotes: 'quote' };
  const prefix = prefixes[tableName];
  if (!prefix) return;

  try {
    await vectorStore.removeDocument(tableName, `${prefix}_${id}`);
  } catch (err) {
    console.error('[RAG] Error removing document from vector store:', err);
  }
};

router.post('/quotes', isAuthenticated, async (req, res) => {
  try {
    const quoteData = req.body;
    
    await db.query('BEGIN');
    
    try {
      const quoteId = uuidv4();
      const quoteNumber = await generateQuoteNumber();

      const sanitizedClientId = sanitizeUUID(quoteData.clientId);
      const sanitizedPropertyId = sanitizeUUID(quoteData.propertyId);
      const sanitizedLeadId = sanitizeUUID(quoteData.leadId);

      let associatedClientId = sanitizedClientId;
      let ensuredClient;

      if (quoteData.customerDetails) {
        try {
          const ensured = await ensureClientAssociation({
            clientId: sanitizedClientId,
            customerDetails: quoteData.customerDetails
          });
          associatedClientId = ensured.clientId;
          ensuredClient = ensured.client;
        } catch (clientErr) {
          await db.query('ROLLBACK');
          return res.status(400).json({ success: false, error: clientErr.message });
        }
      } else if (!associatedClientId) {
        await db.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Client information is required to create a quote' });
      }

      delete quoteData.customerDetails;

      const lineItems = quoteData.lineItems || [];
      const discountPercentage = quoteData.discountPercentage || 0;
      const discountAmount = quoteData.discountAmount || 0;
      const taxRate = quoteData.taxRate || 0;
      
      const totals = calculateQuoteTotals(lineItems, discountPercentage, discountAmount, taxRate);
      
      let customerName = quoteData.customerName || 'Unknown';
      let clientRecord = ensuredClient;
      if (!clientRecord && associatedClientId) {
        const { rows: fallbackRows } = await db.query(
          'SELECT company_name, first_name, last_name FROM clients WHERE id = $1',
          [associatedClientId]
        );
        clientRecord = fallbackRows[0];
      }

      if (clientRecord) {
        customerName = clientRecord.company_name || `${clientRecord.first_name || ''} ${clientRecord.last_name || ''}`.trim() || 'Unknown';
      }
      
      const insertQuery = `
        INSERT INTO quotes (
          id, client_id, property_id, lead_id, customer_name, quote_number, version,
          approval_status, line_items, total_amount, discount_amount,
          discount_percentage, tax_rate, tax_amount, grand_total,
          terms_and_conditions, internal_notes, status, valid_until,
          deposit_amount, payment_terms, special_instructions, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 1, 'pending', $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, NOW()
        ) RETURNING *
      `;
      
      const { rows: quoteRows } = await db.query(insertQuery, [
        quoteId,
        associatedClientId,
        sanitizedPropertyId,
        sanitizedLeadId,
        customerName,
        quoteNumber,
        JSON.stringify(lineItems),
        totals.totalAmount,
        totals.discountAmount,
        discountPercentage,
        taxRate,
        totals.taxAmount,
        totals.grandTotal,
        quoteData.termsAndConditions || null,
        quoteData.internalNotes || null,
        quoteData.status || 'Draft',
        quoteData.validUntil || null,
        quoteData.depositAmount || null,
        quoteData.paymentTerms || 'Net 30',
        quoteData.specialInstructions || null
      ]);
      
      const versionId = uuidv4();
      await db.query(
        `INSERT INTO quote_versions (
          id, quote_id, version_number, line_items, total_amount,
          terms, notes, changed_by, change_reason, created_at
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          versionId,
          quoteId,
          JSON.stringify(lineItems),
          totals.grandTotal,
          quoteData.termsAndConditions || null,
          'Initial version',
          quoteData.createdBy || 'system',
          'Quote created'
        ]
      );
      
      await db.query('COMMIT');
      
      const quote = snakeToCamel(quoteRows[0]);
      res.status(201).json({ success: true, data: quote });
      
      reindexDocument('quotes', quoteRows[0]);
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes', isAuthenticated, async (req, res) => {
  try {
    const { clientId, propertyId, approvalStatus, status, page = 1, limit = 50 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let queryText = `
      SELECT 
        q.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.company_name as client_company_name,
        c.primary_email as client_email,
        c.primary_phone as client_phone,
        p.property_name,
        p.address_line1 as property_address,
        p.city as property_city,
        p.state as property_state
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN properties p ON q.property_id = p.id
      WHERE q.deleted_at IS NULL
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (clientId) {
      queryText += ` AND q.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }
    
    if (propertyId) {
      queryText += ` AND q.property_id = $${paramIndex}`;
      params.push(propertyId);
      paramIndex++;
    }
    
    if (approvalStatus) {
      queryText += ` AND q.approval_status = $${paramIndex}`;
      params.push(approvalStatus);
      paramIndex++;
    }
    
    if (status) {
      queryText += ` AND q.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    queryText += ` ORDER BY q.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);
    
    const { rows } = await db.query(queryText, params);
    
    const quotes = rows.map(row => {
      const quote = snakeToCamel(row);
      
      if (row.client_first_name || row.client_last_name || row.client_company_name) {
        quote.client = {
          firstName: row.client_first_name,
          lastName: row.client_last_name,
          companyName: row.client_company_name,
          email: row.client_email,
          phone: row.client_phone
        };
      }
      
      if (row.property_name || row.property_address) {
        quote.property = {
          propertyName: row.property_name,
          address: row.property_address,
          city: row.property_city,
          state: row.property_state
        };
      }
      
      delete quote.clientFirstName;
      delete quote.clientLastName;
      delete quote.clientCompanyName;
      delete quote.clientEmail;
      delete quote.clientPhone;
      delete quote.propertyName;
      delete quote.propertyAddress;
      delete quote.propertyCity;
      delete quote.propertyState;
      
      return quote;
    });
    
    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) FROM quotes WHERE deleted_at IS NULL'
    );
    const total = parseInt(countRows[0].count);
    
    res.json({
      success: true,
      data: quotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/pending-followups', isAuthenticated, async (req, res) => {
  try {
    const queryText = `
      SELECT 
        qf.*,
        q.quote_number,
        q.status as quote_status,
        q.grand_total,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.company_name as client_company_name,
        c.primary_email as client_email,
        c.primary_phone as client_phone
      FROM quote_followups qf
      INNER JOIN quotes q ON qf.quote_id = q.id
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE qf.status = 'scheduled'
        AND qf.scheduled_date <= CURRENT_DATE
        AND q.deleted_at IS NULL
      ORDER BY qf.scheduled_date ASC
    `;
    
    const { rows } = await db.query(queryText);
    
    const followups = rows.map(row => {
      const followup = snakeToCamel(row);
      
      followup.quote = {
        quoteNumber: row.quote_number,
        status: row.quote_status,
        grandTotal: row.grand_total
      };
      
      if (row.client_first_name || row.client_company_name) {
        followup.client = {
          firstName: row.client_first_name,
          lastName: row.client_last_name,
          companyName: row.client_company_name,
          email: row.client_email,
          phone: row.client_phone
        };
      }
      
      delete followup.quoteNumber;
      delete followup.quoteStatus;
      delete followup.grandTotal;
      delete followup.clientFirstName;
      delete followup.clientLastName;
      delete followup.clientCompanyName;
      delete followup.clientEmail;
      delete followup.clientPhone;
      
      return followup;
    });
    
    res.json({ success: true, data: followups });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeUUID(id);
    
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quote ID'
      });
    }
    
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [sanitizedId]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const quote = snakeToCamel(quoteRows[0]);
    
    const sanitizedClientId = sanitizeUUID(quote.clientId);
    const sanitizedPropertyId = sanitizeUUID(quote.propertyId);
    
    if (sanitizedClientId) {
      const { rows: clientRows } = await db.query(
        'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
        [sanitizedClientId]
      );
      if (clientRows.length > 0) {
        quote.client = snakeToCamel(clientRows[0]);
      }
    }
    
    if (sanitizedPropertyId) {
      const { rows: propertyRows } = await db.query(
        'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
        [sanitizedPropertyId]
      );
      if (propertyRows.length > 0) {
        quote.property = snakeToCamel(propertyRows[0]);
      }
    }
    
    const { rows: versionRows } = await db.query(
      'SELECT * FROM quote_versions WHERE quote_id = $1 ORDER BY version_number DESC',
      [sanitizedId]
    );
    quote.versions = versionRows.map(snakeToCamel);
    
    const { rows: followupRows } = await db.query(
      'SELECT * FROM quote_followups WHERE quote_id = $1 ORDER BY scheduled_date ASC',
      [sanitizedId]
    );
    quote.followups = followupRows.map(snakeToCamel);
    
    const { rows: tagRows} = await db.query(
      `SELECT t.* FROM tags t
       INNER JOIN entity_tags et ON et.tag_id = t.id
       WHERE et.entity_type = 'quote' AND et.entity_id = $1`,
      [sanitizedId]
    );
    quote.tags = tagRows.map(snakeToCamel);
    
    res.json({ success: true, data: quote });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/quotes/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeUUID(id);
    
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quote ID'
      });
    }
    
    const quoteData = req.body;

    const { rows: existingRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [sanitizedId]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const existingQuote = existingRows[0];
    const updates = [];
    const values = [sanitizedId];
    let paramIndex = 2;

    const sanitizedClientId = sanitizeUUID(quoteData.clientId) || existingQuote.client_id;
    const sanitizedPropertyId = sanitizeUUID(quoteData.propertyId) || existingQuote.property_id;
    const sanitizedLeadId = sanitizeUUID(quoteData.leadId) || existingQuote.lead_id;
    let associatedClientId = sanitizedClientId;
    let clientRecord = null;

    if (quoteData.customerDetails) {
      try {
        const ensured = await ensureClientAssociation({
          clientId: sanitizedClientId,
          customerDetails: quoteData.customerDetails
        });
        associatedClientId = ensured.clientId;
        clientRecord = ensured.client;
      } catch (clientErr) {
        return res.status(400).json({ success: false, error: clientErr.message });
      }
    }

    delete quoteData.customerDetails;

    if (associatedClientId && associatedClientId !== existingQuote.client_id) {
      updates.push(`client_id = $${paramIndex}`);
      values.push(associatedClientId);
      paramIndex++;
    }

    if (sanitizedPropertyId && sanitizedPropertyId !== existingQuote.property_id) {
      updates.push(`property_id = $${paramIndex}`);
      values.push(sanitizedPropertyId);
      paramIndex++;
    }

    if (sanitizedLeadId && sanitizedLeadId !== existingQuote.lead_id) {
      updates.push(`lead_id = $${paramIndex}`);
      values.push(sanitizedLeadId);
      paramIndex++;
    }

    if (clientRecord) {
      const computedName = clientRecord.company_name || `${clientRecord.first_name || ''} ${clientRecord.last_name || ''}`.trim() || 'Unknown';
      updates.push(`customer_name = $${paramIndex}`);
      values.push(computedName);
      paramIndex++;
    } else if (quoteData.customerName !== undefined) {
      updates.push(`customer_name = $${paramIndex}`);
      values.push(quoteData.customerName);
      paramIndex++;
    }

    if (quoteData.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(quoteData.status);
      paramIndex++;
    }

    const parsedLineItems = quoteData.lineItems !== undefined
      ? quoteData.lineItems
      : existingQuote.line_items || [];
    const normalizedLineItems = Array.isArray(parsedLineItems)
      ? parsedLineItems
      : JSON.parse(parsedLineItems || '[]');

    const discountPercentage = quoteData.discountPercentage !== undefined
      ? quoteData.discountPercentage
      : existingQuote.discount_percentage || 0;
    const discountAmount = quoteData.discountAmount !== undefined
      ? quoteData.discountAmount
      : existingQuote.discount_amount || 0;
    const taxRate = quoteData.taxRate !== undefined ? quoteData.taxRate : existingQuote.tax_rate || 0;

    const totals = calculateQuoteTotals(normalizedLineItems, discountPercentage, discountAmount, taxRate);

    if (quoteData.lineItems !== undefined) {
      updates.push(`line_items = $${paramIndex}`);
      values.push(JSON.stringify(normalizedLineItems));
      paramIndex++;
    }

    if (quoteData.lineItems !== undefined || quoteData.discountPercentage !== undefined || quoteData.discountAmount !== undefined || quoteData.taxRate !== undefined) {
      updates.push(`total_amount = $${paramIndex}`);
      values.push(totals.totalAmount);
      paramIndex++;

      updates.push(`discount_amount = $${paramIndex}`);
      values.push(totals.discountAmount);
      paramIndex++;

      updates.push(`discount_percentage = $${paramIndex}`);
      values.push(discountPercentage);
      paramIndex++;

      updates.push(`tax_rate = $${paramIndex}`);
      values.push(taxRate);
      paramIndex++;

      updates.push(`tax_amount = $${paramIndex}`);
      values.push(totals.taxAmount);
      paramIndex++;

      updates.push(`grand_total = $${paramIndex}`);
      values.push(totals.grandTotal);
      paramIndex++;
    }

    if (quoteData.termsAndConditions !== undefined) {
      updates.push(`terms_and_conditions = $${paramIndex}`);
      values.push(quoteData.termsAndConditions);
      paramIndex++;
    }

    if (quoteData.internalNotes !== undefined) {
      updates.push(`internal_notes = $${paramIndex}`);
      values.push(quoteData.internalNotes);
      paramIndex++;
    }

    if (quoteData.validUntil !== undefined) {
      updates.push(`valid_until = $${paramIndex}`);
      values.push(quoteData.validUntil);
      paramIndex++;
    }

    if (quoteData.paymentTerms !== undefined) {
      updates.push(`payment_terms = $${paramIndex}`);
      values.push(quoteData.paymentTerms);
      paramIndex++;
    }

    if (quoteData.specialInstructions !== undefined) {
      updates.push(`special_instructions = $${paramIndex}`);
      values.push(quoteData.specialInstructions);
      paramIndex++;
    }

    if (quoteData.depositAmount !== undefined) {
      updates.push(`deposit_amount = $${paramIndex}`);
      values.push(quoteData.depositAmount);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const updateQuery = `
      UPDATE quotes
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows: updatedRows } = await db.query(updateQuery, values);
    const quote = snakeToCamel(updatedRows[0]);

    let automation = null;
    try {
      automation = await automationService.createJobFromApprovedQuote(sanitizedId);

      if (automation?.job) {
        reindexDocument('jobs', automation.job);
        automation.job = transformRow(automation.job, 'jobs');
      }
    } catch (automationError) {
      console.error('⚠️ Failed to auto-create job from approved quote:', automationError.message);
      automation = { status: 'error', error: automationError.message };
    }

    res.json({ success: true, data: quote, automation });
    
    reindexDocument('quotes', updatedRows[0]);
    
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/quotes/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeUUID(id);
    
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quote ID'
      });
    }
    
    const { rows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [sanitizedId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    await db.query(
      'UPDATE quotes SET deleted_at = NOW() WHERE id = $1',
      [sanitizedId]
    );
    
    res.status(204).send();
    
    removeFromVectorStore('quotes', sanitizedId);
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:id/versions', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { lineItems, changeReason, changedBy } = req.body;
    
    if (!lineItems) {
      return res.status(400).json({
        success: false,
        error: 'lineItems is required'
      });
    }
    
    await db.query('BEGIN');
    
    try {
      const { rows: quoteRows } = await db.query(
        'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      
      if (quoteRows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Quote not found'
        });
      }
      
      const quote = quoteRows[0];
      const newVersion = quote.version + 1;
      
      const discountPercentage = quote.discount_percentage || 0;
      const discountAmount = quote.discount_amount || 0;
      const taxRate = quote.tax_rate || 0;
      
      const totals = calculateQuoteTotals(lineItems, discountPercentage, discountAmount, taxRate);
      
      await db.query(
        `UPDATE quotes
         SET version = $1, line_items = $2, total_amount = $3,
             tax_amount = $4, grand_total = $5, updated_at = NOW()
         WHERE id = $6`,
        [newVersion, JSON.stringify(lineItems), totals.totalAmount,
         totals.taxAmount, totals.grandTotal, id]
      );
      
      const versionId = uuidv4();
      await db.query(
        `INSERT INTO quote_versions (
          id, quote_id, version_number, line_items, total_amount,
          terms, notes, changed_by, change_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          versionId,
          id,
          newVersion,
          JSON.stringify(lineItems),
          totals.grandTotal,
          quote.terms_and_conditions || null,
          null,
          changedBy || 'system',
          changeReason || 'Quote updated'
        ]
      );
      
      await db.query('COMMIT');
      
      const { rows: updatedQuoteRows } = await db.query(
        'SELECT * FROM quotes WHERE id = $1',
        [id]
      );
      
      const updatedQuote = snakeToCamel(updatedQuoteRows[0]);
      
      const { rows: versionRows } = await db.query(
        'SELECT * FROM quote_versions WHERE quote_id = $1 ORDER BY version_number DESC',
        [id]
      );
      updatedQuote.versions = versionRows.map(snakeToCamel);
      
      res.json({ success: true, data: updatedQuote });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/:id/versions', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: quoteRows } = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const { rows: versionRows } = await db.query(
      'SELECT * FROM quote_versions WHERE quote_id = $1 ORDER BY version_number DESC',
      [id]
    );
    
    const versions = versionRows.map(snakeToCamel);
    
    res.json({ success: true, data: versions });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:id/approve', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeUUID(id);
    
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quote ID'
      });
    }
    
    let { approvedBy, notes } = req.body;
    
    approvedBy = sanitizeUUID(approvedBy);
    
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [sanitizedId]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const updateQuery = `
      UPDATE quotes
      SET approval_status = 'approved',
          approved_at = NOW(),
          approved_by = $1,
          internal_notes = COALESCE(internal_notes, '') || $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const approvalNote = notes ? `\n[Approved: ${notes}]` : '\n[Approved]';
    
    const { rows: updatedRows } = await db.query(updateQuery, [
      approvedBy || 'system',
      approvalNote,
      sanitizedId
    ]);
    
    const quote = snakeToCamel(updatedRows[0]);
    
    res.json({ success: true, data: quote });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:id/reject', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'rejectionReason is required'
      });
    }
    
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const updateQuery = `
      UPDATE quotes
      SET approval_status = 'rejected',
          internal_notes = COALESCE(internal_notes, '') || $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const rejectionNote = `\n[Rejected: ${rejectionReason}]`;
    
    const { rows: updatedRows } = await db.query(updateQuery, [
      rejectionNote,
      id
    ]);
    
    const quote = snakeToCamel(updatedRows[0]);
    
    res.json({ success: true, data: quote });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:id/send', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: quoteRows } = await db.query(
      'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const updateQuery = `
      UPDATE quotes
      SET status = CASE WHEN status = 'Draft' THEN 'Sent' ELSE status END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows: updatedRows } = await db.query(updateQuery, [id]);
    
    const updatedQuote = snakeToCamel(updatedRows[0]);
    
    try {
      await emitBusinessEvent('quote_sent', {
        id: updatedQuote.id,
        ...updatedQuote
      });
    } catch (e) {
      console.error('[Automation] Failed to emit quote_sent:', e.message);
    }
    
    res.json({
      success: true,
      data: updatedQuote,
      message: 'Quote status updated. Email notification would be sent here.'
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:id/convert-to-job', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedId = sanitizeUUID(id);
    
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quote ID'
      });
    }
    
    await db.query('BEGIN');
    
    try {
      const { rows: quoteRows } = await db.query(
        'SELECT * FROM quotes WHERE id = $1 AND deleted_at IS NULL',
        [sanitizedId]
      );
      
      if (quoteRows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Quote not found'
        });
      }
      
      const quote = quoteRows[0];
      
      const allowedStatuses = ['Sent', 'Accepted'];
      
      if (!allowedStatuses.includes(quote.status)) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Cannot convert quote with status '${quote.status}' to job. Quote must be 'Sent' or 'Accepted'.`
        });
      }
      
      if (quote.approval_status === 'rejected') {
        await db.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Cannot convert rejected quote to job'
        });
      }

      let customerPhone = null;
      let customerEmail = null;
      let customerAddress = null;
      
      if (quote.client_id) {
        const { rows: clientRows } = await db.query(
          `SELECT primary_phone, primary_email, 
                  billing_address_line1, billing_city, billing_state, billing_zip_code
           FROM clients WHERE id = $1`,
          [quote.client_id]
        );
        if (clientRows.length > 0) {
          const client = clientRows[0];
          customerPhone = client.primary_phone || null;
          customerEmail = client.primary_email || null;
          const addressParts = [
            client.billing_address_line1,
            client.billing_city,
            client.billing_state,
            client.billing_zip_code
          ].filter(Boolean);
          customerAddress = addressParts.length > 0 ? addressParts.join(', ') : null;
        }
      }
      
      let jobLocation = quote.job_location;
      if (quote.property_id) {
        const { rows: propRows } = await db.query(
          `SELECT address_line1, city, state, zip_code FROM properties WHERE id = $1`,
          [quote.property_id]
        );
        if (propRows.length > 0) {
          const prop = propRows[0];
          const propAddressParts = [prop.address_line1, prop.city, prop.state, prop.zip_code].filter(Boolean);
          if (propAddressParts.length > 0) {
            jobLocation = propAddressParts.join(', ');
          }
        }
      }

      const templateMatch = await automationService.matchTemplateForQuote(quote, db);
      const matchedTemplate = templateMatch?.template;

      const equipmentNeeded = matchedTemplate?.default_equipment_ids
        ? JSON.stringify(matchedTemplate.default_equipment_ids)
        : null;
      const completionChecklist = matchedTemplate?.completion_checklist
        ? JSON.stringify(matchedTemplate.completion_checklist)
        : null;

      const jobId = uuidv4();
      const jobNumber = await generateJobNumber();

      const insertJobQuery = `
        INSERT INTO jobs (
          id, client_id, property_id, quote_id, job_number, status,
          customer_name, customer_phone, customer_email, customer_address,
          job_location, special_instructions,
          equipment_needed, estimated_hours,
          completion_checklist, jha_required, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'scheduled', $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, NOW()
        ) RETURNING *
      `;

      const { rows: jobRows } = await db.query(insertJobQuery, [
        jobId,
        quote.client_id,
        quote.property_id,
        sanitizedId,
        jobNumber,
        quote.customer_name || 'Unknown',
        customerPhone,
        customerEmail,
        customerAddress,
        jobLocation || null,
        quote.special_instructions || null,
        equipmentNeeded,
        matchedTemplate?.default_duration_hours || null,
        completionChecklist,
        matchedTemplate?.jha_required || false
      ]);
      
      await db.query(
        `UPDATE quotes SET status = 'Converted', updated_at = NOW() WHERE id = $1`,
        [sanitizedId]
      );
      
      await db.query('COMMIT');
      
      const job = transformRow(jobRows[0], 'jobs');
      
      res.status(201).json({
        success: true,
        data: job,
        message: 'Quote successfully converted to job'
      });
      
      reindexDocument('jobs', jobRows[0]);
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:id/followups', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { followupType, scheduledDate, subject, message } = req.body;
    
    if (!followupType || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'followupType and scheduledDate are required'
      });
    }
    
    const { rows: quoteRows } = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const followupId = uuidv4();
    
    const insertQuery = `
      INSERT INTO quote_followups (
        id, quote_id, followup_type, scheduled_date, subject,
        message, status, is_automated, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'scheduled', false, NOW()
      ) RETURNING *
    `;
    
    const { rows: followupRows } = await db.query(insertQuery, [
      followupId,
      id,
      followupType,
      scheduledDate,
      subject || null,
      message || null
    ]);
    
    const followup = snakeToCamel(followupRows[0]);
    
    res.status(201).json({ success: true, data: followup });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/:id/followups', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: quoteRows } = await db.query(
      'SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found'
      });
    }
    
    const { rows: followupRows } = await db.query(
      'SELECT * FROM quote_followups WHERE quote_id = $1 ORDER BY scheduled_date ASC',
      [id]
    );
    
    const followups = followupRows.map(snakeToCamel);
    
    res.json({ success: true, data: followups });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/quote-followups/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedBy, clientResponse, outcome } = req.body;
    
    const { rows: existingRows } = await db.query(
      'SELECT * FROM quote_followups WHERE id = $1',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found'
      });
    }
    
    const updates = [];
    const values = [id];
    let paramIndex = 2;
    
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
      
      if (status === 'completed') {
        updates.push(`completed_at = NOW()`);
      }
    }
    
    if (completedBy !== undefined) {
      updates.push(`completed_by = $${paramIndex}`);
      values.push(completedBy);
      paramIndex++;
    }
    
    if (clientResponse !== undefined) {
      updates.push(`client_response = $${paramIndex}`);
      values.push(clientResponse);
      paramIndex++;
    }
    
    if (outcome !== undefined) {
      updates.push(`outcome = $${paramIndex}`);
      values.push(outcome);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const updateQuery = `
      UPDATE quote_followups
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows: updatedRows } = await db.query(updateQuery, values);
    const followup = snakeToCamel(updatedRows[0]);
    
    res.json({ success: true, data: followup });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quote-templates', isAuthenticated, async (req, res) => {
  try {
    const { serviceCategory } = req.query;
    
    let queryText = 'SELECT * FROM quote_templates WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (serviceCategory) {
      queryText += ` AND service_category = $${paramIndex}`;
      params.push(serviceCategory);
      paramIndex++;
    }
    
    queryText += ' ORDER BY use_count DESC, name ASC';
    
    const { rows } = await db.query(queryText, params);
    const templates = rows.map(snakeToCamel);
    
    res.json({ success: true, data: templates });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quote-templates', isAuthenticated, async (req, res) => {
  try {
    const {
      name,
      description,
      lineItems,
      termsAndConditions,
      serviceCategory,
      validDays,
      depositPercentage,
      paymentTerms,
      createdBy
    } = req.body;
    
    if (!name || !lineItems) {
      return res.status(400).json({
        success: false,
        error: 'name and lineItems are required'
      });
    }
    
    const templateId = uuidv4();
    
    const insertQuery = `
      INSERT INTO quote_templates (
        id, name, description, line_items, terms_and_conditions,
        valid_days, deposit_percentage, payment_terms, service_category,
        is_active, use_count, created_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, true, 0, $10, NOW()
      ) RETURNING *
    `;
    
    const { rows } = await db.query(insertQuery, [
      templateId,
      name,
      description || null,
      JSON.stringify(lineItems),
      termsAndConditions || null,
      validDays || 30,
      depositPercentage || 0,
      paymentTerms || 'Net 30',
      serviceCategory || null,
      createdBy || 'system'
    ]);
    
    const template = snakeToCamel(rows[0]);
    
    res.status(201).json({ success: true, data: template });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quote-templates/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'SELECT * FROM quote_templates WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    const template = snakeToCamel(rows[0]);
    
    res.json({ success: true, data: template });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/from-template/:templateId', isAuthenticated, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { clientId, propertyId, leadId } = req.body;
    
    await db.query('BEGIN');
    
    try {
      const { rows: templateRows } = await db.query(
        'SELECT * FROM quote_templates WHERE id = $1 AND is_active = true',
        [templateId]
      );
      
      if (templateRows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Template not found or inactive'
        });
      }
      
      const template = templateRows[0];
      
      const quoteId = uuidv4();
      const quoteNumber = await generateQuoteNumber();
      
      const lineItems = typeof template.line_items === 'string' 
        ? JSON.parse(template.line_items) 
        : template.line_items;
      
      const totals = calculateQuoteTotals(lineItems, 0, 0, 0);
      
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (template.valid_days || 30));
      
      const insertQuoteQuery = `
        INSERT INTO quotes (
          id, client_id, property_id, lead_id, quote_number, version,
          approval_status, line_items, total_amount, discount_amount,
          discount_percentage, tax_rate, tax_amount, grand_total,
          terms_and_conditions, status, valid_until, deposit_amount,
          payment_terms, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, 1, 'pending', $6, $7, 0, 0, 0, 0, $8,
          $9, 'Draft', $10, $11, $12, NOW()
        ) RETURNING *
      `;
      
      const { rows: quoteRows } = await db.query(insertQuoteQuery, [
        quoteId,
        clientId || null,
        propertyId || null,
        leadId || null,
        quoteNumber,
        JSON.stringify(lineItems),
        totals.totalAmount,
        totals.grandTotal,
        template.terms_and_conditions || null,
        validUntil.toISOString().split('T')[0],
        (totals.grandTotal * (template.deposit_percentage || 0)) / 100,
        template.payment_terms || 'Net 30'
      ]);
      
      const versionId = uuidv4();
      await db.query(
        `INSERT INTO quote_versions (
          id, quote_id, version_number, line_items, total_amount,
          terms, notes, changed_by, change_reason, created_at
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          versionId,
          quoteId,
          JSON.stringify(lineItems),
          totals.grandTotal,
          template.terms_and_conditions || null,
          `Created from template: ${template.name}`,
          'system',
          'Quote created from template'
        ]
      );
      
      await db.query(
        'UPDATE quote_templates SET use_count = use_count + 1, updated_at = NOW() WHERE id = $1',
        [templateId]
      );
      
      await db.query('COMMIT');
      
      const quote = snakeToCamel(quoteRows[0]);
      
      res.status(201).json({
        success: true,
        data: quote,
        message: `Quote created from template: ${template.name}`
      });
      
      reindexDocument('quotes', quoteRows[0]);
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
