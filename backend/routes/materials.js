const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

const transformMaterialInventory = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    materialName: row.material_name,
    manufacturer: row.manufacturer,
    epaRegNumber: row.epa_reg_number,
    activeIngredient: row.active_ingredient,
    formulationType: row.formulation_type,
    defaultUnit: row.default_unit,
    defaultApplicationMethod: row.default_application_method,
    defaultApplicationRate: row.default_application_rate,
    signalWord: row.signal_word,
    requiredPpe: row.required_ppe,
    defaultReiHours: row.default_rei_hours,
    storageRequirements: row.storage_requirements,
    disposalInstructions: row.disposal_instructions,
    currentQuantity: row.current_quantity ? parseFloat(row.current_quantity) : null,
    minimumQuantity: row.minimum_quantity ? parseFloat(row.minimum_quantity) : null,
    unitCost: row.unit_cost ? parseFloat(row.unit_cost) : null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

router.get('/material-inventory', async (req, res) => {
  try {
    const { search, activeOnly } = req.query;
    
    let query = 'SELECT * FROM material_inventory WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (activeOnly !== 'false') {
      query += ' AND is_active = true';
    }
    
    if (search) {
      query += ` AND (material_name ILIKE $${paramCount} OR epa_reg_number ILIKE $${paramCount} OR active_ingredient ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ' ORDER BY material_name ASC';
    
    const { rows } = await db.query(query, params);
    
    res.json({
      success: true,
      data: rows.map(transformMaterialInventory)
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/material-inventory', async (req, res) => {
  try {
    const {
      materialName,
      manufacturer,
      epaRegNumber,
      activeIngredient,
      formulationType,
      defaultUnit,
      defaultApplicationMethod,
      defaultApplicationRate,
      signalWord,
      requiredPpe,
      defaultReiHours,
      storageRequirements,
      disposalInstructions,
      currentQuantity,
      minimumQuantity,
      unitCost
    } = req.body;
    
    if (!materialName) {
      return res.status(400).json({
        success: false,
        error: 'materialName is required'
      });
    }
    
    const id = uuidv4();
    
    const query = `
      INSERT INTO material_inventory (
        id, material_name, manufacturer, epa_reg_number, active_ingredient,
        formulation_type, default_unit, default_application_method,
        default_application_rate, signal_word, required_ppe, default_rei_hours,
        storage_requirements, disposal_instructions, current_quantity,
        minimum_quantity, unit_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      id,
      materialName,
      manufacturer || null,
      epaRegNumber || null,
      activeIngredient || null,
      formulationType || null,
      defaultUnit || null,
      defaultApplicationMethod || null,
      defaultApplicationRate || null,
      signalWord || null,
      requiredPpe || null,
      defaultReiHours || null,
      storageRequirements || null,
      disposalInstructions || null,
      currentQuantity || null,
      minimumQuantity || null,
      unitCost || null
    ]);
    
    res.status(201).json({
      success: true,
      data: transformMaterialInventory(rows[0]),
      message: 'Material added to inventory'
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Material with this name already exists'
      });
    }
    handleError(res, err);
  }
});

router.get('/material-inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query('SELECT * FROM material_inventory WHERE id = $1', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }
    
    res.json({
      success: true,
      data: transformMaterialInventory(rows[0])
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/material-inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const setClause = [];
    const params = [];
    let paramCount = 1;
    
    const fieldMap = {
      materialName: 'material_name',
      manufacturer: 'manufacturer',
      epaRegNumber: 'epa_reg_number',
      activeIngredient: 'active_ingredient',
      formulationType: 'formulation_type',
      defaultUnit: 'default_unit',
      defaultApplicationMethod: 'default_application_method',
      defaultApplicationRate: 'default_application_rate',
      signalWord: 'signal_word',
      requiredPpe: 'required_ppe',
      defaultReiHours: 'default_rei_hours',
      storageRequirements: 'storage_requirements',
      disposalInstructions: 'disposal_instructions',
      currentQuantity: 'current_quantity',
      minimumQuantity: 'minimum_quantity',
      unitCost: 'unit_cost',
      isActive: 'is_active'
    };
    
    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClause.push(`${fieldMap[key]} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    setClause.push('updated_at = NOW()');
    params.push(id);
    
    const query = `
      UPDATE material_inventory 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const { rows } = await db.query(query, params);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }
    
    res.json({
      success: true,
      data: transformMaterialInventory(rows[0]),
      message: 'Material updated'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/material-inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'UPDATE material_inventory SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Material deactivated'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/phc-reports/compliance', async (req, res) => {
  try {
    const { startDate, endDate, jobId } = req.query;
    
    let query = `
      SELECT 
        jm.*,
        j.job_number,
        j.customer_name,
        j.scheduled_date,
        j.job_location,
        e.name as applicator_name
      FROM job_materials jm
      JOIN jobs j ON jm.job_id = j.id
      LEFT JOIN employees e ON jm.applied_by = e.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (startDate) {
      query += ` AND jm.applied_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }
    
    if (endDate) {
      query += ` AND jm.applied_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }
    
    if (jobId) {
      query += ` AND jm.job_id = $${paramCount}`;
      params.push(jobId);
      paramCount++;
    }
    
    query += ' ORDER BY jm.applied_at DESC, jm.created_at DESC';
    
    const { rows } = await db.query(query, params);
    
    const report = rows.map(row => ({
      id: row.id,
      jobNumber: row.job_number,
      customerName: row.customer_name,
      scheduledDate: row.scheduled_date,
      jobLocation: row.job_location,
      materialName: row.material_name,
      quantityUsed: row.quantity_used ? parseFloat(row.quantity_used) : null,
      unit: row.unit,
      epaRegNumber: row.epa_reg_number,
      applicationMethod: row.application_method,
      applicationRate: row.application_rate,
      targetPestOrCondition: row.target_pest_or_condition,
      applicatorName: row.applicator_name,
      appliedAt: row.applied_at,
      weatherConditions: row.weather_conditions,
      windSpeedMph: row.wind_speed_mph ? parseFloat(row.wind_speed_mph) : null,
      temperatureF: row.temperature_f ? parseFloat(row.temperature_f) : null,
      ppeUsed: row.ppe_used,
      reiHours: row.rei_hours
    }));
    
    res.json({
      success: true,
      data: report,
      summary: {
        totalApplications: rows.length,
        uniqueMaterials: [...new Set(rows.map(r => r.material_name))].length,
        dateRange: {
          start: startDate || 'all time',
          end: endDate || 'present'
        }
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
