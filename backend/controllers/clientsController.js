const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { camelToSnake, snakeToCamel } = require('../utils/formatters');
const { CLIENT_CATEGORIES } = require('../utils/constants');

const buildClientStats = async (clientId) => {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM quotes WHERE client_id = $1 AND deleted_at IS NULL) as total_quotes,
        (SELECT COUNT(*) FROM jobs WHERE client_id = $1) as total_jobs,
        (SELECT COUNT(*) FROM invoices WHERE client_id = $1 AND status = 'Paid') as total_invoices,
        (SELECT COALESCE(SUM(COALESCE(grand_total, total_amount, amount)::numeric), 0)
           FROM invoices WHERE client_id = $1 AND status = 'Paid') as lifetime_value,
        (SELECT MAX(scheduled_date) FROM jobs WHERE client_id = $1) as last_job_date
    `;

    const { rows } = await db.query(statsQuery, [clientId]);
    return {
      totalQuotes: parseInt(rows[0]?.total_quotes || 0),
      totalJobs: parseInt(rows[0]?.total_jobs || 0),
      totalInvoices: parseInt(rows[0]?.total_invoices || 0),
      lifetimeValue: parseFloat(rows[0]?.lifetime_value || 0),
      lastJobDate: rows[0]?.last_job_date || null
    };
  } catch (err) {
    console.error('Error building client stats:', err);
    return {
      totalQuotes: 0,
      totalJobs: 0,
      totalInvoices: 0,
      lifetimeValue: 0,
      lastJobDate: null
    };
  }
};

const validateClientInput = (data) => {
  const errors = [];
  
  if (data.primaryEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.primaryEmail)) {
      errors.push('Invalid email format');
    }
  }
  
  if (!data.firstName && !data.companyName) {
    errors.push('Either firstName or companyName is required');
  }
  
  return errors;
};

const createClient = async (req, res) => {
  try {
    const clientData = req.body;
    
    const validationErrors = validateClientInput(clientData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    await db.query('BEGIN');
    
    try {
      const dbData = camelToSnake(clientData);
      
      if (dbData.billing_zip !== undefined) {
        dbData.billing_zip_code = dbData.billing_zip;
        delete dbData.billing_zip;
      }
      
      const properties = clientData.properties || [];
      const contacts = clientData.contacts || [];
      const tags = clientData.tags || [];
      
      delete dbData.properties;
      delete dbData.contacts;
      delete dbData.tags;
      
      const clientId = uuidv4();
      dbData.id = clientId;
      dbData.status = dbData.status || 'active';
      dbData.client_type = dbData.client_type || 'residential';
      dbData.client_category = dbData.client_category || CLIENT_CATEGORIES.POTENTIAL;
      
      const clientColumns = Object.keys(dbData).filter(k => k !== 'id');
      const clientValues = clientColumns.map(k => dbData[k]);
      const clientPlaceholders = clientColumns.map((_, i) => `$${i + 2}`).join(', ');
      
      const clientQuery = `
        INSERT INTO clients (id, ${clientColumns.join(', ')}) 
        VALUES ($1, ${clientPlaceholders}) 
        RETURNING *
      `;
      
      const { rows: clientRows } = await db.query(clientQuery, [clientId, ...clientValues]);
      const createdClient = clientRows[0];
      
      const createdProperties = [];
      for (const property of properties) {
        const propertyId = uuidv4();
        const propData = camelToSnake(property);
        propData.id = propertyId;
        propData.client_id = clientId;
        
        const propColumns = Object.keys(propData).filter(k => k !== 'id');
        const propValues = propColumns.map(k => propData[k]);
        const propPlaceholders = propColumns.map((_, i) => `$${i + 2}`).join(', ');
        
        const propQuery = `
          INSERT INTO properties (id, ${propColumns.join(', ')}) 
          VALUES ($1, ${propPlaceholders}) 
          RETURNING *
        `;
        
        const { rows: propRows } = await db.query(propQuery, [propertyId, ...propValues]);
        createdProperties.push(propRows[0]);
      }
      
      const createdContacts = [];
      for (const contact of contacts) {
        const contactId = uuidv4();
        const contactData = camelToSnake(contact);
        contactData.id = contactId;
        contactData.client_id = clientId;
        
        const channels = contact.channels || [];
        delete contactData.channels;
        
        const contactColumns = Object.keys(contactData).filter(k => k !== 'id');
        const contactValues = contactColumns.map(k => contactData[k]);
        const contactPlaceholders = contactColumns.map((_, i) => `$${i + 2}`).join(', ');
        
        const contactQuery = `
          INSERT INTO contacts (id, ${contactColumns.join(', ')}) 
          VALUES ($1, ${contactPlaceholders}) 
          RETURNING *
        `;
        
        const { rows: contactRows } = await db.query(contactQuery, [contactId, ...contactValues]);
        const createdContact = contactRows[0];
        
        const createdChannels = [];
        for (const channel of channels) {
          const channelId = uuidv4();
          const channelData = camelToSnake(channel);
          channelData.id = channelId;
          channelData.contact_id = contactId;
          
          const channelQuery = `
            INSERT INTO contact_channels (id, contact_id, channel_type, channel_value, label, is_primary, is_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
          
          const { rows: channelRows } = await db.query(channelQuery, [
            channelId,
            contactId,
            channelData.channel_type,
            channelData.channel_value,
            channelData.label || null,
            channelData.is_primary || false,
            channelData.is_verified || false
          ]);
          createdChannels.push(channelRows[0]);
        }
        
        createdContact.channels = createdChannels;
        createdContacts.push(createdContact);
      }
      
      const createdTags = [];
      for (const tagName of tags) {
        let tagId;
        const { rows: existingTags } = await db.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );
        
        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          tagId = uuidv4();
          await db.query(
            'INSERT INTO tags (id, name, category) VALUES ($1, $2, $3)',
            [tagId, tagName, 'client']
          );
        }
        
        await db.query(
          'INSERT INTO entity_tags (id, tag_id, entity_type, entity_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [uuidv4(), tagId, 'client', clientId]
        );
        
        createdTags.push({ id: tagId, name: tagName });
      }
      
      await db.query('COMMIT');
      
      const response = snakeToCamel(createdClient);
      response.properties = createdProperties.map(snakeToCamel);
      response.contacts = createdContacts.map(snakeToCamel);
      response.tags = createdTags;
      
      res.status(201).json({ success: true, data: response });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    handleError(res, err);
  }
};

const getClients = async (req, res) => {
  try {
    const {
      status,
      clientType,
      clientCategory,
      search,
      tags,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (clientType) {
      conditions.push(`client_type = $${paramIndex}`);
      params.push(clientType);
      paramIndex++;
    }
    
    if (clientCategory) {
      conditions.push(`client_category = $${paramIndex}`);
      params.push(clientCategory);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(
        to_tsvector('english', 
          coalesce(first_name, '') || ' ' || 
          coalesce(last_name, '') || ' ' || 
          coalesce(company_name, '') || ' ' || 
          coalesce(primary_email, '')
        ) @@ plainto_tsquery('english', $${paramIndex})
        OR first_name ILIKE $${paramIndex + 1}
        OR last_name ILIKE $${paramIndex + 1}
        OR company_name ILIKE $${paramIndex + 1}
        OR primary_email ILIKE $${paramIndex + 1}
      )`);
      params.push(search, `%${search}%`);
      paramIndex += 2;
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      conditions.push(`id IN (
        SELECT entity_id FROM entity_tags 
        WHERE entity_type = 'client' 
        AND tag_id IN (SELECT id FROM tags WHERE name = ANY($${paramIndex}))
      )`);
      params.push(tagArray);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const validSortColumns = ['created_at', 'updated_at', 'first_name', 'last_name', 'company_name', 'lifetime_value', 'client_category'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    const countQuery = `SELECT COUNT(*) FROM clients ${whereClause}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const totalCount = parseInt(countRows[0].count);
    
    const clientsQuery = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM jobs j WHERE j.client_id = c.id) as job_count,
        (SELECT COUNT(*) FROM quotes q WHERE q.client_id = c.id AND q.deleted_at IS NULL) as quote_count,
        (SELECT COALESCE(SUM(COALESCE(grand_total, total_amount, amount)::numeric), 0)
           FROM invoices i WHERE i.client_id = c.id AND i.status = 'Paid') as calculated_lifetime_value
      FROM clients c
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const { rows: clients } = await db.query(clientsQuery, [...params, parseInt(limit), offset]);
    
    const transformedClients = clients.map(client => {
      const transformed = snakeToCamel(client);
      transformed.stats = {
        jobCount: parseInt(client.job_count || 0),
        quoteCount: parseInt(client.quote_count || 0),
        lifetimeValue: parseFloat(client.calculated_lifetime_value || client.lifetime_value || 0)
      };
      delete transformed.jobCount;
      delete transformed.quoteCount;
      delete transformed.calculatedLifetimeValue;
      return transformed;
    });
    
    res.json({
      success: true,
      data: transformedClients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (err) {
    handleError(res, err);
  }
};

const getClientById = async (req, res) => {
  try {
    const clientId = req.params.id;
    
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (clientRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    const client = snakeToCamel(clientRows[0]);
    
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE client_id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    client.properties = propertyRows.map(snakeToCamel);
    
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE client_id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    const contacts = [];
    for (const contact of contactRows) {
      const transformedContact = snakeToCamel(contact);
      
      const { rows: channelRows } = await db.query(
        'SELECT * FROM contact_channels WHERE contact_id = $1',
        [contact.id]
      );
      transformedContact.channels = channelRows.map(snakeToCamel);
      
      contacts.push(transformedContact);
    }
    client.contacts = contacts;
    
    const { rows: tagRows } = await db.query(`
      SELECT t.id, t.name, t.color, t.category
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'client' AND et.entity_id = $1
    `, [clientId]);
    client.tags = tagRows.map(snakeToCamel);
    
    const { rows: customFieldRows } = await db.query(`
      SELECT 
        cfv.id,
        cfv.field_value,
        cfd.field_name,
        cfd.field_label,
        cfd.field_type
      FROM custom_field_values cfv
      INNER JOIN custom_field_definitions cfd ON cfv.field_definition_id = cfd.id
      WHERE cfv.entity_type = 'client' AND cfv.entity_id = $1
    `, [clientId]);
    client.customFields = customFieldRows.map(snakeToCamel);
    
    client.stats = await buildClientStats(clientId);
    
    res.json({ success: true, data: client });
    
  } catch (err) {
    handleError(res, err);
  }
};

const updateClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    const clientData = req.body;
    
    const validationErrors = validateClientInput(clientData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    const { rows: existingRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    if (clientData.primaryEmail && clientData.primaryEmail !== existingRows[0].primary_email) {
      const { rows: emailCheckRows } = await db.query(
        'SELECT id FROM clients WHERE primary_email = $1 AND id != $2 AND deleted_at IS NULL',
        [clientData.primaryEmail, clientId]
      );
      
      if (emailCheckRows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already exists for another client' 
        });
      }
    }
    
    const dbData = camelToSnake(clientData);
    
    if (dbData.billing_zip !== undefined) {
      dbData.billing_zip_code = dbData.billing_zip;
      delete dbData.billing_zip;
    }
    
    delete dbData.properties;
    delete dbData.contacts;
    delete dbData.tags;
    delete dbData.customFields;
    delete dbData.stats;
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.deleted_at;
    
    const columns = Object.keys(dbData);
    const values = columns.map(k => dbData[k]);
    const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    
    const updateQuery = `
      UPDATE clients 
      SET ${setString}, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    
    const { rows: updatedRows } = await db.query(updateQuery, [clientId, ...values]);
    
    const response = await db.query(
      'SELECT * FROM clients WHERE id = $1',
      [clientId]
    );
    
    const client = snakeToCamel(response.rows[0]);
    
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE client_id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    client.properties = propertyRows.map(snakeToCamel);
    
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE client_id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    const contacts = [];
    for (const contact of contactRows) {
      const transformedContact = snakeToCamel(contact);
      const { rows: channelRows } = await db.query(
        'SELECT * FROM contact_channels WHERE contact_id = $1',
        [contact.id]
      );
      transformedContact.channels = channelRows.map(snakeToCamel);
      contacts.push(transformedContact);
    }
    client.contacts = contacts;
    
    const { rows: tagRows } = await db.query(`
      SELECT t.id, t.name, t.color, t.category
      FROM tags t
      INNER JOIN entity_tags et ON t.id = et.tag_id
      WHERE et.entity_type = 'client' AND et.entity_id = $1
    `, [clientId]);
    client.tags = tagRows.map(snakeToCamel);
    
    res.json({ success: true, data: client });
    
  } catch (err) {
    handleError(res, err);
  }
};

const deleteClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (clientRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }
    
    const clientName = `${clientRows[0].first_name} ${clientRows[0].last_name}`.trim() || clientRows[0].company_name;
    const { rows: jobRows } = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE customer_name = $1',
      [clientName]
    );
    
    if (parseInt(jobRows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete client with existing jobs' 
      });
    }
    
    await db.query(
      'UPDATE clients SET deleted_at = NOW() WHERE id = $1',
      [clientId]
    );
    
    await db.query(
      'UPDATE properties SET deleted_at = NOW() WHERE client_id = $1',
      [clientId]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
};
