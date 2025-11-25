const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { camelToSnake, snakeToCamel } = require('../utils/formatters');

class PropertyService {
  async getPropertiesByClientId(clientId) {
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (clientRows.length === 0) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }
    
    const { rows } = await db.query(
      `SELECT * FROM properties 
       WHERE client_id = $1 AND deleted_at IS NULL 
       ORDER BY is_primary DESC, created_at DESC`,
      [clientId]
    );
    
    return rows.map(row => snakeToCamel(row));
  }

  async createProperty(clientId, propertyData) {
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [clientId]
    );
    
    if (clientRows.length === 0) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }
    
    await db.query('BEGIN');
    
    try {
      const dbData = camelToSnake(propertyData);
      const propertyId = uuidv4();
      dbData.id = propertyId;
      dbData.client_id = clientId;
      
      if (dbData.is_primary === true) {
        await db.query(
          'UPDATE properties SET is_primary = false WHERE client_id = $1 AND deleted_at IS NULL',
          [clientId]
        );
      }
      
      const columns = Object.keys(dbData).filter(k => k !== 'id' && dbData[k] !== undefined);
      
      if (columns.length === 0) {
        const error = new Error('No valid property data provided');
        error.statusCode = 400;
        throw error;
      }
      
      const values = columns.map(k => dbData[k]);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
      
      const insertQuery = `
        INSERT INTO properties (id, ${columns.join(', ')}) 
        VALUES ($1, ${placeholders}) 
        RETURNING *
      `;
      
      const { rows: propertyRows } = await db.query(insertQuery, [propertyId, ...values]);
      
      await db.query('COMMIT');
      
      return snakeToCamel(propertyRows[0]);
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }

  async getPropertyById(id) {
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (propertyRows.length === 0) {
      const error = new Error('Property not found');
      error.statusCode = 404;
      throw error;
    }
    
    const property = snakeToCamel(propertyRows[0]);
    
    const { rows: clientRows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL',
      [propertyRows[0].client_id]
    );
    
    if (clientRows.length > 0) {
      property.client = snakeToCamel(clientRows[0]);
    }
    
    const { rows: contactRows } = await db.query(
      'SELECT * FROM contacts WHERE property_id = $1 AND deleted_at IS NULL',
      [id]
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
    property.contacts = contacts;
    
    return property;
  }

  async updateProperty(id, propertyData) {
    const { rows: existingRows } = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existingRows.length === 0) {
      const error = new Error('Property not found');
      error.statusCode = 404;
      throw error;
    }
    
    await db.query('BEGIN');
    
    try {
      const existingProperty = existingRows[0];
      
      if (propertyData.isPrimary === true) {
        await db.query(
          'UPDATE properties SET is_primary = false WHERE client_id = $1 AND id != $2 AND deleted_at IS NULL',
          [existingProperty.client_id, id]
        );
      }
      
      const dbData = camelToSnake(propertyData);
      delete dbData.id;
      delete dbData.client_id;
      delete dbData.created_at;
      delete dbData.deleted_at;
      delete dbData.client;
      delete dbData.contacts;
      
      const columns = Object.keys(dbData);
      const values = columns.map(k => dbData[k]);
      const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
      
      const updateQuery = `
        UPDATE properties 
        SET ${setString}, updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
      `;
      
      const { rows: updatedRows } = await db.query(updateQuery, [id, ...values]);
      
      await db.query('COMMIT');
      
      return snakeToCamel(updatedRows[0]);
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }

  async deleteProperty(id) {
    const { rows: propertyRows } = await db.query(
      'SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (propertyRows.length === 0) {
      const error = new Error('Property not found');
      error.statusCode = 404;
      throw error;
    }
    
    const property = propertyRows[0];
    
    const { rows: clientPropertyRows } = await db.query(
      'SELECT COUNT(*) as count FROM properties WHERE client_id = $1 AND deleted_at IS NULL',
      [property.client_id]
    );
    
    if (parseInt(clientPropertyRows[0].count) <= 1) {
      const error = new Error('Cannot delete the only property for a client');
      error.statusCode = 400;
      throw error;
    }
    
    const propertyAddress = `${property.address_line1}, ${property.city}, ${property.state}`;
    const { rows: jobRows } = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE job_location ILIKE $1',
      [`%${property.address_line1}%`]
    );
    
    if (parseInt(jobRows[0].count) > 0) {
      const error = new Error('Cannot delete property that is linked to existing jobs');
      error.statusCode = 400;
      throw error;
    }
    
    await db.query(
      'UPDATE properties SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
  }
}

module.exports = new PropertyService();
