const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { snakeToCamel, camelToSnake } = require('../utils/formatters');

const calculateTagUsageCount = async (tagId) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) as count FROM entity_tags WHERE tag_id = $1',
      [tagId]
    );
    return parseInt(rows[0]?.count || 0);
  } catch (err) {
    console.error('Error calculating tag usage count:', err);
    return 0;
  }
};

const getOrCreateTagByName = async (name, category = null) => {
  try {
    const { rows: existingTags } = await db.query(
      'SELECT * FROM tags WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    if (existingTags.length > 0) {
      return snakeToCamel(existingTags[0]);
    }
    
    const tagId = uuidv4();
    const { rows: newTagRows } = await db.query(
      `INSERT INTO tags (id, name, color, category) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [tagId, name, '#00c2ff', category]
    );
    
    return snakeToCamel(newTagRows[0]);
  } catch (err) {
    console.error('Error in getOrCreateTagByName:', err);
    throw err;
  }
};

const validateEntityType = (entityType) => {
  const validTypes = ['client', 'property', 'quote', 'job', 'lead'];
  return validTypes.includes(entityType);
};

const getTableNameForEntityType = (entityType) => {
  const tableMap = {
    'client': 'clients',
    'property': 'properties',
    'quote': 'quotes',
    'job': 'jobs',
    'lead': 'leads'
  };
  return tableMap[entityType];
};

const validateEntityExists = async (entityType, entityId) => {
  const tableName = getTableNameForEntityType(entityType);
  if (!tableName) return false;
  
  try {
    const { rows } = await db.query(
      `SELECT id FROM ${tableName} WHERE id = $1`,
      [entityId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('Error validating entity existence:', err);
    return false;
  }
};

const getAllTags = async (category = null) => {
  let queryText = `
    SELECT t.*, 
           (SELECT COUNT(*) FROM entity_tags et WHERE et.tag_id = t.id) as usage_count
    FROM tags t
  `;
  
  const queryParams = [];
  
  if (category) {
    queryText += ' WHERE t.category = $1';
    queryParams.push(category);
  }
  
  queryText += ' ORDER BY t.name ASC';
  
  const { rows } = await db.query(queryText, queryParams);
  
  return rows.map(row => ({
    ...snakeToCamel(row),
    usageCount: parseInt(row.usage_count || 0)
  }));
};

const createTag = async (tagData) => {
  const { name, color = '#00c2ff', description, category } = tagData;
  
  const { rows: existingTags } = await db.query(
    'SELECT * FROM tags WHERE LOWER(name) = LOWER($1)',
    [name.trim()]
  );
  
  if (existingTags.length > 0) {
    throw new Error('Tag name must be unique (case-insensitive)');
  }
  
  const tagId = uuidv4();
  const { rows: newTagRows } = await db.query(
    `INSERT INTO tags (id, name, color, description, category) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [tagId, name.trim(), color, description || null, category || null]
  );
  
  const tag = snakeToCamel(newTagRows[0]);
  tag.usageCount = 0;
  
  return tag;
};

const getTagById = async (tagId) => {
  const { rows } = await db.query(
    'SELECT * FROM tags WHERE id = $1',
    [tagId]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const tag = snakeToCamel(rows[0]);
  tag.usageCount = await calculateTagUsageCount(tagId);
  
  return tag;
};

const updateTag = async (tagId, updates) => {
  const { name, color, description, category } = updates;
  
  const { rows: existingTagRows } = await db.query(
    'SELECT * FROM tags WHERE id = $1',
    [tagId]
  );
  
  if (existingTagRows.length === 0) {
    return null;
  }
  
  if (name && name.trim() !== '') {
    const { rows: duplicateTagRows } = await db.query(
      'SELECT * FROM tags WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), tagId]
    );
    
    if (duplicateTagRows.length > 0) {
      throw new Error('Tag name must be unique (case-insensitive)');
    }
  }
  
  const updateFields = [];
  const values = [tagId];
  let paramIndex = 2;
  
  if (name !== undefined && name.trim() !== '') {
    updateFields.push(`name = $${paramIndex}`);
    values.push(name.trim());
    paramIndex++;
  }
  
  if (color !== undefined) {
    updateFields.push(`color = $${paramIndex}`);
    values.push(color);
    paramIndex++;
  }
  
  if (description !== undefined) {
    updateFields.push(`description = $${paramIndex}`);
    values.push(description);
    paramIndex++;
  }
  
  if (category !== undefined) {
    updateFields.push(`category = $${paramIndex}`);
    values.push(category);
    paramIndex++;
  }
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  const queryText = `
    UPDATE tags 
    SET ${updateFields.join(', ')} 
    WHERE id = $1 
    RETURNING *
  `;
  
  const { rows: updatedTagRows } = await db.query(queryText, values);
  
  const tag = snakeToCamel(updatedTagRows[0]);
  tag.usageCount = await calculateTagUsageCount(tagId);
  
  return tag;
};

const deleteTag = async (tagId) => {
  const { rows: existingTagRows } = await db.query(
    'SELECT * FROM tags WHERE id = $1',
    [tagId]
  );
  
  if (existingTagRows.length === 0) {
    return false;
  }
  
  await db.query('DELETE FROM entity_tags WHERE tag_id = $1', [tagId]);
  await db.query('DELETE FROM tags WHERE id = $1', [tagId]);
  
  return true;
};

const addTagsToEntity = async (entityType, entityId, tagIds = [], tagNames = []) => {
  const tagsToAdd = [];
  
  if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
    for (const tagId of tagIds) {
      const { rows: tagRows } = await db.query(
        'SELECT * FROM tags WHERE id = $1',
        [tagId]
      );
      
      if (tagRows.length > 0) {
        tagsToAdd.push(tagRows[0]);
      }
    }
  }
  
  if (tagNames && Array.isArray(tagNames) && tagNames.length > 0) {
    for (const tagName of tagNames) {
      if (tagName && tagName.trim() !== '') {
        const tag = await getOrCreateTagByName(tagName.trim(), entityType);
        const tagSnake = camelToSnake(tag);
        tagsToAdd.push(tagSnake);
      }
    }
  }
  
  for (const tag of tagsToAdd) {
    const entityTagId = uuidv4();
    await db.query(
      `INSERT INTO entity_tags (id, tag_id, entity_type, entity_id, tagged_by) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ON CONSTRAINT unique_entity_tag DO NOTHING`,
      [entityTagId, tag.id, entityType, entityId, 'system']
    );
  }
  
  const { rows: allEntityTagRows } = await db.query(
    `SELECT t.* 
     FROM tags t
     INNER JOIN entity_tags et ON et.tag_id = t.id
     WHERE et.entity_type = $1 AND et.entity_id = $2
     ORDER BY t.name ASC`,
    [entityType, entityId]
  );
  
  return allEntityTagRows.map(row => snakeToCamel(row));
};

const getEntityTags = async (entityType, entityId) => {
  const { rows: tagRows } = await db.query(
    `SELECT t.* 
     FROM tags t
     INNER JOIN entity_tags et ON et.tag_id = t.id
     WHERE et.entity_type = $1 AND et.entity_id = $2
     ORDER BY t.name ASC`,
    [entityType, entityId]
  );
  
  return tagRows.map(row => snakeToCamel(row));
};

const removeTagFromEntity = async (entityType, entityId, tagId) => {
  const { rows: entityTagRows } = await db.query(
    `SELECT * FROM entity_tags 
     WHERE tag_id = $1 AND entity_type = $2 AND entity_id = $3`,
    [tagId, entityType, entityId]
  );
  
  if (entityTagRows.length === 0) {
    return false;
  }
  
  await db.query(
    `DELETE FROM entity_tags 
     WHERE tag_id = $1 AND entity_type = $2 AND entity_id = $3`,
    [tagId, entityType, entityId]
  );
  
  return true;
};

module.exports = {
  calculateTagUsageCount,
  getOrCreateTagByName,
  validateEntityType,
  getTableNameForEntityType,
  validateEntityExists,
  getAllTags,
  createTag,
  getTagById,
  updateTag,
  deleteTag,
  addTagsToEntity,
  getEntityTags,
  removeTagFromEntity,
};
