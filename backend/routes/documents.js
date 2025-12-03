const express = require('express');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const { query, pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('[DocumentScanner] No Gemini API key found. Document scanning will be disabled.');
}
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `File type ${file.mimetype} not supported`));
    }
  }
});

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 25MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: err.field || 'Unsupported file type. Please upload JPEG, PNG, or HEIC images.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
}

const contractExtractionSchema = {
  type: 'object',
  properties: {
    customer: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer full name' },
        address: { type: 'string', description: 'Full street address including city, state, zip' },
        phone: { type: 'string', description: 'Phone number' },
        email: { type: 'string', description: 'Email address if present' }
      }
    },
    work_description: { type: 'string', description: 'Full description of work to be performed' },
    totals: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total cost of project' },
        deposit: { type: 'number', description: 'Deposit amount if specified' },
        balance: { type: 'number', description: 'Balance due if specified' }
      }
    },
    dates: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format if readable' },
        completion_date: { type: 'string', description: 'Completion/signing date in YYYY-MM-DD format if readable' },
        scheduled_time: { type: 'string', description: 'Scheduled time if present (e.g., "Monday 10:00")' }
      }
    },
    signatures: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of signer' },
          role: { type: 'string', description: 'Role: contractor or customer' },
          present: { type: 'boolean', description: 'Whether signature is present' }
        }
      }
    },
    tree_species: { type: 'array', items: { type: 'string' }, description: 'Tree species mentioned in the work' },
    services: { type: 'array', items: { type: 'string' }, description: 'List of services to be performed (e.g., removal, trimming, stump grinding)' }
  }
};

async function extractContractData(imageBuffer, mimeType) {
  const base64Image = imageBuffer.toString('base64');
  
  const prompt = `You are an OCR expert specializing in reading handwritten and printed documents, especially service contracts for tree service and landscaping companies.

TASK: Carefully analyze this image and extract ALL visible text and information. This could be:
- A handwritten service contract or estimate
- A printed invoice or work order  
- A business card with customer info
- Any document with customer and job details

EXTRACT THESE FIELDS (use empty string "" if not found, don't skip fields):

{
  "customer": {
    "name": "Full customer name (first and last)",
    "address": "Complete street address including city, state, zip",
    "phone": "Phone number in format XXX-XXX-XXXX",
    "email": "Email address if visible"
  },
  "work_description": "All text describing the work to be done - be thorough and include all details",
  "totals": {
    "total": 0,
    "deposit": 0,
    "balance": 0
  },
  "dates": {
    "start_date": "YYYY-MM-DD or null",
    "completion_date": "YYYY-MM-DD or null", 
    "scheduled_time": "Time or day if mentioned"
  },
  "signatures": [],
  "tree_species": ["list", "of", "tree", "types"],
  "services": ["list", "of", "services"]
}

CRITICAL INSTRUCTIONS:
1. READ THE IMAGE CAREFULLY - Look at every part of the document
2. Handwriting can be messy - make your best interpretation
3. For money amounts: extract the NUMBER only (2600 not "$2,600.00")
4. For phone: format as XXX-XXX-XXXX
5. Look for: names, addresses, phone numbers, prices, dates, descriptions of work
6. Common tree services: removal, trimming, pruning, stump grinding, hauling, cleanup
7. Common tree types: oak, pine, maple, sweetgum, cedar, elm, ash, pecan, magnolia

Return ONLY valid JSON with all fields populated (use "" for missing strings, 0 for missing numbers, [] for missing arrays).`;

  if (!ai) {
    throw new Error('Document scanning is not available. Gemini API key is not configured.');
  }

  console.log('[DocumentScanner] Processing image, mimeType:', mimeType, 'size:', imageBuffer.length, 'bytes');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    let responseText;
    if (response.text) {
      responseText = response.text;
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      responseText = response.candidates[0].content.parts[0].text;
    } else {
      console.error('[DocumentScanner] No text in Gemini response:', JSON.stringify(response, null, 2).slice(0, 500));
      throw new Error('No text response from Gemini');
    }

    responseText = responseText.trim();
    console.log('[DocumentScanner] Raw Gemini response:', responseText.slice(0, 500));
    
    const cleanedJson = responseText.replace(/^```json\s*|```$/g, '').trim();
    
    try {
      const rawData = JSON.parse(cleanedJson);
      console.log('[DocumentScanner] Parsed data keys:', Object.keys(rawData));
      const normalized = normalizeGeminiResponse(rawData);
      console.log('[DocumentScanner] Normalized - Customer:', normalized.customer?.name, 'Total:', normalized.totals?.total);
      return normalized;
    } catch (parseError) {
      console.error('[DocumentScanner] Failed to parse Gemini response:', cleanedJson.slice(0, 500));
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error('[DocumentScanner] Error extracting contract data:', error.message);
    throw new Error(`Failed to extract contract data: ${error.message}`);
  }
}

function normalizeGeminiResponse(raw) {
  const getNestedValue = (obj, keys) => {
    for (const key of keys) {
      const found = Object.keys(obj || {}).find(k => 
        k.toLowerCase().replace(/[_\s]/g, '') === key.toLowerCase().replace(/[_\s]/g, '')
      );
      if (found) return obj[found];
    }
    return undefined;
  };

  const customerInfo = getNestedValue(raw, ['customer', 'Customer Information', 'customer_information', 'customerInfo']) || {};
  const financialInfo = getNestedValue(raw, ['totals', 'Financial Details', 'financial_details', 'financials']) || {};
  const dateInfo = getNestedValue(raw, ['dates', 'Dates', 'date_information']) || {};
  const signatureInfo = getNestedValue(raw, ['signatures', 'Signatures']) || [];

  const extractNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const normalized = {
    customer: {
      name: customerInfo.name || customerInfo['name'] || raw.customer?.name || '',
      address: customerInfo.address || customerInfo['address'] || raw.customer?.address || '',
      phone: customerInfo.phone || customerInfo['phone number'] || customerInfo['phone_number'] || raw.customer?.phone || '',
      email: customerInfo.email || customerInfo['email'] || raw.customer?.email || null
    },
    work_description: raw.work_description || raw['Work Description'] || raw['work description'] || 
                     getNestedValue(raw, ['work_description', 'Work Description', 'workDescription']) || '',
    totals: {
      total: extractNumber(financialInfo.total || financialInfo['total cost'] || financialInfo['total_cost'] || raw.totals?.total),
      deposit: extractNumber(financialInfo.deposit || financialInfo['deposit amount'] || financialInfo['deposit_amount'] || raw.totals?.deposit),
      balance: extractNumber(financialInfo.balance || financialInfo['balance due'] || financialInfo['balance_due'] || raw.totals?.balance)
    },
    dates: {
      start_date: dateInfo.start_date || dateInfo['start date'] || raw.dates?.start_date || null,
      completion_date: dateInfo.completion_date || dateInfo['completion date'] || raw.dates?.completion_date || null,
      scheduled_time: dateInfo.scheduled_time || dateInfo['scheduled time'] || raw.dates?.scheduled_time || null
    },
    signatures: Array.isArray(signatureInfo) ? signatureInfo : 
      Object.entries(signatureInfo || {}).map(([key, val]) => ({
        name: val?.name || key,
        role: val?.role || 'unknown',
        present: val?.present !== false
      })),
    tree_species: raw.tree_species || raw['Tree Species'] || raw['tree species'] || [],
    services: raw.services || raw['Services'] || raw['services'] || []
  };

  if (normalized.totals.total > 0 && normalized.totals.deposit > 0 && !normalized.totals.balance) {
    normalized.totals.balance = normalized.totals.total - normalized.totals.deposit;
  }

  return normalized;
}

function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function parseAddress(address) {
  if (!address) return { line1: '', city: '', state: '', zip: '' };
  
  const zipMatch = address.match(/\b(\d{5})(-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[0] : '';
  
  const stateMatch = address.match(/\b([A-Z]{2})\b(?:\s*\d{5})?/i);
  const state = stateMatch ? stateMatch[1].toUpperCase() : '';
  
  let remaining = address;
  if (zip) remaining = remaining.replace(zip, '');
  if (state) remaining = remaining.replace(new RegExp(`\\b${state}\\b`, 'i'), '');
  
  const parts = remaining.split(',').map(p => p.trim()).filter(Boolean);
  
  if (parts.length >= 2) {
    return {
      line1: parts[0],
      city: parts[parts.length - 1].replace(/[^a-zA-Z\s]/g, '').trim(),
      state,
      zip
    };
  }
  
  return { line1: address, city: '', state, zip };
}

function validateExtractedData(data) {
  const warnings = [];
  const confidence = {};
  
  if (!data.customer?.name) {
    warnings.push('Customer name could not be extracted');
    confidence.customerName = 0.3;
  } else {
    confidence.customerName = 0.9;
  }
  
  if (!data.customer?.phone && !data.customer?.email) {
    warnings.push('No contact information (phone or email) found');
    confidence.contact = 0.3;
  } else {
    confidence.contact = 0.85;
  }
  
  if (!data.customer?.address) {
    warnings.push('Address could not be extracted');
    confidence.address = 0.3;
  } else {
    confidence.address = 0.8;
  }
  
  if (!data.work_description) {
    warnings.push('Work description could not be extracted');
    confidence.workDescription = 0.3;
  } else {
    confidence.workDescription = 0.85;
  }
  
  if (!data.totals?.total || data.totals.total === 0) {
    warnings.push('Total cost could not be extracted');
    confidence.total = 0.3;
  } else {
    confidence.total = 0.9;
  }
  
  return { warnings, confidence };
}

router.post('/documents/scan', upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ 
        success: false, 
        error: 'Document scanning is not available. AI service is not configured.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const scanId = uuidv4();
    
    await query(`
      INSERT INTO document_scans (id, status, original_filename, mime_type, file_size, created_by)
      VALUES ($1, 'processing', $2, $3, $4, $5)
    `, [scanId, req.file.originalname, req.file.mimetype, req.file.size, 'admin']);

    let mimeType = req.file.mimetype;
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
      mimeType = 'image/jpeg';
    }

    const extractedData = await extractContractData(req.file.buffer, mimeType);
    
    if (extractedData.customer?.phone) {
      extractedData.customer.phone = normalizePhoneNumber(extractedData.customer.phone);
    }
    
    if (extractedData.customer?.address) {
      extractedData.customer.parsedAddress = parseAddress(extractedData.customer.address);
    }

    if (extractedData.totals?.total && extractedData.totals?.deposit && !extractedData.totals?.balance) {
      extractedData.totals.balance = extractedData.totals.total - extractedData.totals.deposit;
    }

    const { warnings, confidence } = validateExtractedData(extractedData);

    await query(`
      UPDATE document_scans 
      SET status = 'completed', 
          parsed_data = $1, 
          confidence_scores = $2, 
          warnings = $3,
          processed_at = NOW(),
          updated_at = NOW()
      WHERE id = $4
    `, [JSON.stringify(extractedData), JSON.stringify(confidence), warnings, scanId]);

    res.json({
      success: true,
      data: {
        id: scanId,
        status: 'completed',
        extractedData,
        confidence,
        warnings
      }
    });

  } catch (error) {
    console.error('Document scan error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process document'
    });
  }
});

router.get('/documents/scans', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, status, original_filename, parsed_data, confidence_scores, warnings, 
             created_at, processed_at, created_client_id, created_job_id
      FROM document_scans 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching scans:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scans' });
  }
});

router.get('/documents/scans/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM document_scans WHERE id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Scan not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching scan:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scan' });
  }
});

router.post('/documents/scans/:id/create-records', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { extractedData } = req.body;
    
    const scanResult = await client.query(`SELECT * FROM document_scans WHERE id = $1`, [id]);
    if (scanResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, error: 'Scan not found' });
    }
    
    const scan = scanResult.rows[0];
    
    if (scan.status === 'records_created') {
      client.release();
      return res.status(400).json({ 
        success: false, 
        error: 'Records have already been created from this scan',
        data: {
          clientId: scan.created_client_id,
          propertyId: scan.created_property_id,
          jobId: scan.created_job_id,
          invoiceId: scan.created_invoice_id
        }
      });
    }
    
    const data = extractedData || scan.parsed_data;
    
    if (!data?.customer?.name) {
      client.release();
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }

    await client.query('BEGIN');

    const nameParts = data.customer.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const phone = normalizePhoneNumber(data.customer.phone);
    const email = data.customer.email || null;
    
    let clientId = null;
    if (phone) {
      const existingClient = await client.query(`
        SELECT id FROM clients 
        WHERE primary_phone = $1 AND deleted_at IS NULL
        LIMIT 1
      `, [phone]);
      
      if (existingClient.rows.length > 0) {
        clientId = existingClient.rows[0].id;
      }
    }
    
    if (!clientId) {
      const clientResult = await client.query(`
        INSERT INTO clients (first_name, last_name, primary_email, primary_phone, client_type, status, lead_source)
        VALUES ($1, $2, $3, $4, 'residential', 'active', 'document_scan')
        RETURNING id
      `, [firstName, lastName, email, phone]);
      clientId = clientResult.rows[0].id;
    }

    let propertyId = null;
    const parsedAddr = data.customer.parsedAddress || parseAddress(data.customer.address);
    if (parsedAddr.line1) {
      const existingProperty = await client.query(`
        SELECT id FROM properties 
        WHERE client_id = $1 AND address_line1 ILIKE $2 AND deleted_at IS NULL
        LIMIT 1
      `, [clientId, parsedAddr.line1]);
      
      if (existingProperty.rows.length > 0) {
        propertyId = existingProperty.rows[0].id;
      } else {
        const propertyResult = await client.query(`
          INSERT INTO properties (client_id, address_line1, city, state, zip_code)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [clientId, parsedAddr.line1, parsedAddr.city || 'Unknown', parsedAddr.state || 'MO', parsedAddr.zip || '']);
        propertyId = propertyResult.rows[0].id;
      }
    }

    const total = parseFloat(data.totals?.total) || 0;
    const deposit = parseFloat(data.totals?.deposit) || 0;
    const workDescription = data.work_description || '';
    const services = Array.isArray(data.services) ? data.services : [];
    const treeSpecies = Array.isArray(data.tree_species) ? data.tree_species : [];
    
    let scheduledDate = null;
    if (data.dates?.start_date) {
      try {
        scheduledDate = new Date(data.dates.start_date).toISOString();
      } catch (e) {}
    }
    
    const lineItems = services.map((service, idx) => ({
      id: uuidv4(),
      description: service + (treeSpecies[idx] ? ` - ${treeSpecies[idx]}` : ''),
      price: Math.round(total / Math.max(services.length, 1)),
      selected: true
    }));
    
    if (lineItems.length === 0) {
      lineItems.push({
        id: uuidv4(),
        description: workDescription || 'Tree Service',
        price: total,
        selected: true
      });
    }

    const jobResult = await client.query(`
      INSERT INTO jobs (
        property_id, status, description, scheduled_date, 
        total_cost, deposit_amount, notes, created_by
      )
      VALUES ($1, 'completed', $2, $3, $4, $5, $6, 'document_scan')
      RETURNING id, job_number
    `, [propertyId, workDescription, scheduledDate, total, deposit, 
        `Imported from scanned document. Tree species: ${treeSpecies.join(', ')}`]);
    
    const jobId = jobResult.rows[0].id;

    let invoiceId = null;
    if (total > 0) {
      const invoiceResult = await client.query(`
        INSERT INTO invoices (
          client_id, property_id, job_id, amount, status, 
          paid_amount, due_date, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '30 days', $7)
        RETURNING id, invoice_number
      `, [
        clientId, 
        propertyId, 
        jobId, 
        total, 
        deposit >= total ? 'paid' : (deposit > 0 ? 'partial' : 'sent'),
        deposit,
        'Generated from scanned service contract'
      ]);
      invoiceId = invoiceResult.rows[0].id;
    }

    await client.query(`
      UPDATE document_scans 
      SET status = 'records_created',
          created_client_id = $1,
          created_property_id = $2,
          created_job_id = $3,
          created_invoice_id = $4,
          updated_at = NOW()
      WHERE id = $5
    `, [clientId, propertyId, jobId, invoiceId, id]);

    await client.query(`
      UPDATE clients 
      SET lifetime_value = lifetime_value + $1,
          updated_at = NOW()
      WHERE id = $2
    `, [total, clientId]);

    await client.query('COMMIT');
    client.release();

    res.json({
      success: true,
      data: {
        clientId,
        propertyId,
        jobId,
        invoiceId,
        message: 'Records created successfully'
      }
    });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    client.release();
    
    console.error('Error creating records from scan:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create records' 
    });
  }
});

module.exports = router;
