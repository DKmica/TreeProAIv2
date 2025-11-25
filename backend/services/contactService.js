const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { camelToSnake, snakeToCamel } = require('../utils/formatters');
const { notFoundError, badRequestError } = require('../utils/errors');

const getContactsByClientId = async (clientId) => {
  const { rows: clientRows } = await db.query(
    'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
    [clientId]
  );
  
  if (clientRows.length === 0) {
    throw notFoundError('Client');
  }
  
  const { rows } = await db.query(
    `SELECT * FROM contacts 
     WHERE client_id = $1 AND deleted_at IS NULL 
     ORDER BY is_primary DESC, created_at DESC`,
    [clientId]
  );
  
  return rows.map(row => snakeToCamel(row));
};

const createContact = async (clientId, contactData) => {
  const { rows: clientRows } = await db.query(
    'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
    [clientId]
  );
  
  if (clientRows.length === 0) {
    throw notFoundError('Client');
  }
  
  if (contactData.propertyId) {
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL',
      [contactData.propertyId, clientId]
    );
    
    if (propertyRows.length === 0) {
      throw badRequestError('Property not found or does not belong to this client');
    }
  }
  
  if (!contactData.firstName) {
    throw badRequestError('firstName is required');
  }
  
  await db.query('BEGIN');
  
  try {
    const channels = contactData.channels || [];
    
    if (contactData.email) {
      channels.push({
        channelType: 'email',
        channelValue: contactData.email,
        label: 'Primary',
        isPrimary: true
      });
    }
    
    if (contactData.phone) {
      channels.push({
        channelType: 'phone',
        channelValue: contactData.phone,
        label: 'Primary',
        isPrimary: true
      });
    }
    
    const dbData = camelToSnake(contactData);
    delete dbData.channels;
    
    const contactId = uuidv4();
    dbData.id = contactId;
    dbData.client_id = clientId;
    
    const columns = Object.keys(dbData).filter(k => k !== 'id');
    const values = columns.map(k => dbData[k]);
    const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
    
    const contactQuery = `
      INSERT INTO contacts (id, ${columns.join(', ')}) 
      VALUES ($1, ${placeholders}) 
      RETURNING *
    `;
    
    const { rows: contactRows } = await db.query(contactQuery, [contactId, ...values]);
    const createdContact = contactRows[0];
    
    const createdChannels = [];
    for (const channel of channels) {
      const channelId = uuidv4();
      const channelData = camelToSnake(channel);
      
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
    
    await db.query('COMMIT');
    
    const response = snakeToCamel(createdContact);
    response.channels = createdChannels.map(snakeToCamel);
    
    return response;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

const getContactById = async (id) => {
  const { rows: contactRows } = await db.query(
    'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  
  if (contactRows.length === 0) {
    throw notFoundError('Contact');
  }
  
  const contact = snakeToCamel(contactRows[0]);
  
  const { rows: channelRows } = await db.query(
    'SELECT * FROM contact_channels WHERE contact_id = $1',
    [id]
  );
  contact.channels = channelRows.map(snakeToCamel);
  
  const { rows: clientRows } = await db.query(
    'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
    [contactRows[0].client_id]
  );
  
  if (clientRows.length > 0) {
    contact.client = snakeToCamel(clientRows[0]);
  }
  
  if (contactRows[0].property_id) {
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
      [contactRows[0].property_id]
    );
    
    if (propertyRows.length > 0) {
      contact.property = snakeToCamel(propertyRows[0]);
    }
  }
  
  return contact;
};

const updateContact = async (id, contactData) => {
  const { rows: existingRows } = await db.query(
    'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  
  if (existingRows.length === 0) {
    throw notFoundError('Contact');
  }
  
  await db.query('BEGIN');
  
  try {
    const channels = contactData.channels;
    
    const dbData = camelToSnake(contactData);
    delete dbData.id;
    delete dbData.client_id;
    delete dbData.created_at;
    delete dbData.deleted_at;
    delete dbData.channels;
    delete dbData.client;
    delete dbData.property;
    
    const columns = Object.keys(dbData);
    const values = columns.map(k => dbData[k]);
    const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
    
    const updateQuery = `
      UPDATE contacts 
      SET ${setString}, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    
    await db.query(updateQuery, [id, ...values]);
    
    if (channels && Array.isArray(channels)) {
      await db.query('DELETE FROM contact_channels WHERE contact_id = $1', [id]);
      
      for (const channel of channels) {
        const channelId = uuidv4();
        const channelData = camelToSnake(channel);
        
        const channelQuery = `
          INSERT INTO contact_channels (id, contact_id, channel_type, channel_value, label, is_primary, is_verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        await db.query(channelQuery, [
          channelId,
          id,
          channelData.channel_type,
          channelData.channel_value,
          channelData.label || null,
          channelData.is_primary || false,
          channelData.is_verified || false
        ]);
      }
    }
    
    await db.query('COMMIT');
    
    const { rows: finalContactRows } = await db.query(
      'SELECT * FROM contacts WHERE id = $1',
      [id]
    );
    
    const response = snakeToCamel(finalContactRows[0]);
    
    const { rows: channelRows } = await db.query(
      'SELECT * FROM contact_channels WHERE contact_id = $1',
      [id]
    );
    response.channels = channelRows.map(snakeToCamel);
    
    return response;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

const deleteContact = async (id) => {
  const { rows: contactRows } = await db.query(
    'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  
  if (contactRows.length === 0) {
    throw notFoundError('Contact');
  }
  
  await db.query('BEGIN');
  
  try {
    await db.query(
      'UPDATE contacts SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    
    await db.query(
      'DELETE FROM contact_channels WHERE contact_id = $1',
      [id]
    );
    
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

const createContactChannel = async (contactId, channelData) => {
  const { rows: contactRows } = await db.query(
    'SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL',
    [contactId]
  );
  
  if (contactRows.length === 0) {
    throw notFoundError('Contact');
  }
  
  await db.query('BEGIN');
  
  try {
    const dbData = camelToSnake(channelData);
    
    if (dbData.is_primary === true && dbData.channel_type) {
      await db.query(
        'UPDATE contact_channels SET is_primary = false WHERE contact_id = $1 AND channel_type = $2',
        [contactId, dbData.channel_type]
      );
    }
    
    const channelId = uuidv4();
    
    const channelQuery = `
      INSERT INTO contact_channels (id, contact_id, channel_type, channel_value, label, is_primary, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const { rows: channelRows } = await db.query(channelQuery, [
      channelId,
      contactId,
      dbData.channel_type,
      dbData.channel_value,
      dbData.label || null,
      dbData.is_primary || false,
      dbData.is_verified || false
    ]);
    
    await db.query('COMMIT');
    
    return snakeToCamel(channelRows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

const deleteContactChannel = async (id) => {
  const { rows: channelRows } = await db.query(
    'SELECT * FROM contact_channels WHERE id = $1',
    [id]
  );
  
  if (channelRows.length === 0) {
    throw notFoundError('Channel');
  }
  
  await db.query(
    'DELETE FROM contact_channels WHERE id = $1',
    [id]
  );
};

module.exports = {
  getContactsByClientId,
  createContact,
  getContactById,
  updateContact,
  deleteContact,
  createContactChannel,
  deleteContactChannel,
};
