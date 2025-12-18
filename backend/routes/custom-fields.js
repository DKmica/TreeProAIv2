const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { snakeToCamel } = require('../utils/formatters');
const { validateEntityType, validateEntityExists } = require('../services/tagService');

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

const validateFieldType = (fieldType) => {
  const validTypes = ['text', 'number', 'date', 'dropdown', 'checkbox', 'textarea'];
  return validTypes.includes(fieldType);
};

const generateFieldName = (label) => {
  if (!label) return '';
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
};

const applyValidationRules = (value, rules, fieldType) => {
  if (!rules || typeof rules !== 'object') {
    return { valid: true };
  }

  if (fieldType === 'number') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return { valid: false, error: 'Value must be a valid number' };
    }
    
    if (rules.min !== undefined && numValue < rules.min) {
      return { valid: false, error: `Value must be at least ${rules.min}` };
    }
    
    if (rules.max !== undefined && numValue > rules.max) {
      return { valid: false, error: `Value must be at most ${rules.max}` };
    }
  }

  if (fieldType === 'text' || fieldType === 'textarea') {
    if (rules.pattern) {
      try {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          return { valid: false, error: `Value does not match required pattern` };
        }
      } catch (err) {
        console.error('Invalid regex pattern:', err);
      }
    }
    
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return { valid: false, error: `Value must be at least ${rules.minLength} characters` };
    }
    
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return { valid: false, error: `Value must be at most ${rules.maxLength} characters` };
    }
  }

  return { valid: true };
};

const validateFieldValue = (value, fieldDefinition) => {
  if (!value && fieldDefinition.is_required) {
    return { valid: false, error: `${fieldDefinition.field_label} is required` };
  }

  if (!value) {
    return { valid: true };
  }

  const fieldType = fieldDefinition.field_type;

  if (fieldType === 'date') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }
  }

  if (fieldType === 'checkbox') {
    if (value !== 'true' && value !== 'false') {
      return { valid: false, error: 'Checkbox value must be true or false' };
    }
  }

  if (fieldType === 'dropdown') {
    const options = fieldDefinition.options || [];
    if (!options.includes(value)) {
      return { valid: false, error: `Value must be one of: ${options.join(', ')}` };
    }
  }

  if (fieldDefinition.validation_rules) {
    return applyValidationRules(value, fieldDefinition.validation_rules, fieldType);
  }

  return { valid: true };
};

router.get('/custom-fields/:entityType', async (req, res) => {
  try {
    const { entityType } = req.params;
    const { includeInactive } = req.query;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    let queryText = `
      SELECT * FROM custom_field_definitions 
      WHERE entity_type = $1
    `;
    
    if (includeInactive !== 'true') {
      queryText += ' AND is_active = true';
    }
    
    queryText += ' ORDER BY display_order ASC, field_label ASC';
    
    const { rows } = await db.query(queryText, [entityType]);
    
    const fieldDefinitions = rows.map(row => snakeToCamel(row));
    
    res.json({ success: true, data: fieldDefinitions });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/custom-fields', async (req, res) => {
  try {
    const { 
      entityType, 
      fieldName, 
      fieldLabel, 
      fieldType, 
      isRequired = false, 
      defaultValue, 
      options, 
      validationRules, 
      displayOrder = 0, 
      helpText 
    } = req.body;
    
    if (!entityType || !fieldLabel || !fieldType) {
      return res.status(400).json({ 
        success: false, 
        error: 'entityType, fieldLabel, and fieldType are required' 
      });
    }
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    if (!validateFieldType(fieldType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid field type. Must be one of: text, number, date, dropdown, checkbox, textarea` 
      });
    }
    
    const finalFieldName = fieldName || generateFieldName(fieldLabel);
    
    if (!finalFieldName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid field name generated from label' 
      });
    }
    
    const { rows: existingFields } = await db.query(
      'SELECT * FROM custom_field_definitions WHERE entity_type = $1 AND LOWER(field_name) = LOWER($2)',
      [entityType, finalFieldName]
    );
    
    if (existingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Field name must be unique for this entity type (case-insensitive)' 
      });
    }
    
    if (fieldType === 'dropdown') {
      if (!options || !Array.isArray(options) || options.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dropdown fields must have options array' 
        });
      }
    }
    
    const fieldId = uuidv4();
    const { rows: newFieldRows } = await db.query(
      `INSERT INTO custom_field_definitions (
        id, entity_type, field_name, field_label, field_type, 
        is_required, default_value, options, validation_rules, 
        display_order, help_text, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        fieldId, 
        entityType, 
        finalFieldName, 
        fieldLabel, 
        fieldType, 
        isRequired, 
        defaultValue || null, 
        options ? JSON.stringify(options) : null, 
        validationRules ? JSON.stringify(validationRules) : null, 
        displayOrder, 
        helpText || null, 
        true
      ]
    );
    
    const fieldDefinition = snakeToCamel(newFieldRows[0]);
    
    res.status(201).json({ success: true, data: fieldDefinition });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fieldLabel, 
      fieldType, 
      isRequired, 
      defaultValue, 
      options, 
      validationRules, 
      displayOrder, 
      helpText,
      isActive
    } = req.body;
    
    const { rows: existingFieldRows } = await db.query(
      'SELECT * FROM custom_field_definitions WHERE id = $1',
      [id]
    );
    
    if (existingFieldRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Field definition not found' 
      });
    }
    
    if (fieldType !== undefined && !validateFieldType(fieldType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid field type. Must be one of: text, number, date, dropdown, checkbox, textarea` 
      });
    }
    
    if (fieldType === 'dropdown' && options) {
      if (!Array.isArray(options) || options.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dropdown fields must have options array' 
        });
      }
    }
    
    const updates = [];
    const values = [id];
    let paramIndex = 2;
    
    if (fieldLabel !== undefined) {
      updates.push(`field_label = $${paramIndex}`);
      values.push(fieldLabel);
      paramIndex++;
    }
    
    if (fieldType !== undefined) {
      updates.push(`field_type = $${paramIndex}`);
      values.push(fieldType);
      paramIndex++;
    }
    
    if (isRequired !== undefined) {
      updates.push(`is_required = $${paramIndex}`);
      values.push(isRequired);
      paramIndex++;
    }
    
    if (defaultValue !== undefined) {
      updates.push(`default_value = $${paramIndex}`);
      values.push(defaultValue);
      paramIndex++;
    }
    
    if (options !== undefined) {
      updates.push(`options = $${paramIndex}`);
      values.push(options ? JSON.stringify(options) : null);
      paramIndex++;
    }
    
    if (validationRules !== undefined) {
      updates.push(`validation_rules = $${paramIndex}`);
      values.push(validationRules ? JSON.stringify(validationRules) : null);
      paramIndex++;
    }
    
    if (displayOrder !== undefined) {
      updates.push(`display_order = $${paramIndex}`);
      values.push(displayOrder);
      paramIndex++;
    }
    
    if (helpText !== undefined) {
      updates.push(`help_text = $${paramIndex}`);
      values.push(helpText);
      paramIndex++;
    }
    
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No fields to update' 
      });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const queryText = `
      UPDATE custom_field_definitions 
      SET ${updates.join(', ')} 
      WHERE id = $1 
      RETURNING *
    `;
    
    const { rows: updatedFieldRows } = await db.query(queryText, values);
    
    const fieldDefinition = snakeToCamel(updatedFieldRows[0]);
    
    res.json({ success: true, data: fieldDefinition });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: existingFieldRows } = await db.query(
      'SELECT * FROM custom_field_definitions WHERE id = $1',
      [id]
    );
    
    if (existingFieldRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Field definition not found' 
      });
    }
    
    await db.query(
      'UPDATE custom_field_definitions SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/entities/:entityType/:entityId/custom-fields', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { fieldValues } = req.body;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    if (!fieldValues || typeof fieldValues !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'fieldValues object is required' 
      });
    }
    
    const { rows: fieldDefinitions } = await db.query(
      'SELECT * FROM custom_field_definitions WHERE entity_type = $1 AND is_active = true',
      [entityType]
    );
    
    const fieldDefMap = {};
    fieldDefinitions.forEach(fd => {
      fieldDefMap[fd.field_name.toLowerCase()] = fd;
    });
    
    for (const fieldName of Object.keys(fieldValues)) {
      const fieldDef = fieldDefMap[fieldName.toLowerCase()];
      if (!fieldDef) {
        return res.status(400).json({ 
          success: false, 
          error: `Unknown field: ${fieldName}` 
        });
      }
      
      const validation = validateFieldValue(fieldValues[fieldName], fieldDef);
      if (!validation.valid) {
        return res.status(400).json({ 
          success: false, 
          error: validation.error 
        });
      }
    }
    
    for (const fieldDef of fieldDefinitions) {
      if (fieldDef.is_required) {
        const fieldValue = fieldValues[fieldDef.field_name];
        if (!fieldValue) {
          return res.status(400).json({ 
            success: false, 
            error: `Required field missing: ${fieldDef.field_label}` 
          });
        }
      }
    }
    
    const savedValues = {};
    
    for (const [fieldName, fieldValue] of Object.entries(fieldValues)) {
      const fieldDef = fieldDefMap[fieldName.toLowerCase()];
      
      if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
        await db.query(
          `INSERT INTO custom_field_values (id, field_definition_id, entity_type, entity_id, field_value, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           ON CONFLICT (field_definition_id, entity_type, entity_id) 
           DO UPDATE SET field_value = $5, updated_at = NOW()`,
          [uuidv4(), fieldDef.id, entityType, entityId, String(fieldValue)]
        );
        savedValues[fieldName] = fieldValue;
      }
    }
    
    res.json({ success: true, data: savedValues });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/entities/:entityType/:entityId/custom-fields', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const { rows } = await db.query(
      `SELECT 
        cfd.*,
        cfv.field_value,
        cfv.id as value_id
       FROM custom_field_definitions cfd
       LEFT JOIN custom_field_values cfv 
         ON cfv.field_definition_id = cfd.id 
         AND cfv.entity_type = $1 
         AND cfv.entity_id = $2
       WHERE cfd.entity_type = $1 
         AND cfd.is_active = true
       ORDER BY cfd.display_order ASC, cfd.field_label ASC`,
      [entityType, entityId]
    );
    
    const customFields = rows.map(row => ({
      definition: snakeToCamel({
        id: row.id,
        entityType: row.entity_type,
        fieldName: row.field_name,
        fieldLabel: row.field_label,
        fieldType: row.field_type,
        isRequired: row.is_required,
        defaultValue: row.default_value,
        options: row.options,
        validationRules: row.validation_rules,
        displayOrder: row.display_order,
        helpText: row.help_text,
        isActive: row.is_active
      }),
      value: row.field_value || null,
      valueId: row.value_id || null
    }));
    
    res.json({ success: true, data: customFields });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/entities/:entityType/:entityId/custom-fields/:fieldDefinitionId', async (req, res) => {
  try {
    const { entityType, entityId, fieldDefinitionId } = req.params;
    
    if (!validateEntityType(entityType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid entity type. Must be one of: client, property, quote, job, lead` 
      });
    }
    
    const entityExists = await validateEntityExists(entityType, entityId);
    if (!entityExists) {
      return res.status(404).json({ 
        success: false, 
        error: `${entityType} not found` 
      });
    }
    
    const { rows: fieldValueRows } = await db.query(
      `SELECT * FROM custom_field_values 
       WHERE field_definition_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [fieldDefinitionId, entityType, entityId]
    );
    
    if (fieldValueRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Custom field value not found' 
      });
    }
    
    await db.query(
      `DELETE FROM custom_field_values 
       WHERE field_definition_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [fieldDefinitionId, entityType, entityId]
    );
    
    res.status(204).send();
    
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
