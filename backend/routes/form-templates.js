const express = require('express');
const router = express.Router();
const db = require('../db');

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

const transformRow = (row) => {
  if (!row) return null;
  const transformed = { ...row };
  if (row.form_type !== undefined) {
    transformed.formType = row.form_type;
    delete transformed.form_type;
  }
  if (row.require_signature !== undefined) {
    transformed.requireSignature = row.require_signature;
    delete transformed.require_signature;
  }
  if (row.require_photos !== undefined) {
    transformed.requirePhotos = row.require_photos;
    delete transformed.require_photos;
  }
  if (row.min_photos !== undefined) {
    transformed.minPhotos = row.min_photos;
    delete transformed.min_photos;
  }
  if (row.is_active !== undefined) {
    transformed.isActive = row.is_active;
    delete transformed.is_active;
  }
  if (row.created_at !== undefined) {
    transformed.createdAt = row.created_at;
    delete transformed.created_at;
  }
  if (row.updated_at !== undefined) {
    transformed.updatedAt = row.updated_at;
    delete transformed.updated_at;
  }
  if (row.deleted_at !== undefined) {
    transformed.deletedAt = row.deleted_at;
    delete transformed.deleted_at;
  }
  return transformed;
};

router.get('/form-templates', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    
    let query = 'SELECT * FROM form_templates WHERE deleted_at IS NULL';
    const params = [];
    let paramCount = 1;
    
    if (category) {
      query += ` AND form_type = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(active === 'true');
      paramCount++;
    }
    
    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await db.query(query, params);
    const templates = rows.map(row => transformRow(row));
    
    res.json({
      success: true,
      data: templates
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/form-templates/categories', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT DISTINCT form_type as category
      FROM form_templates
      WHERE deleted_at IS NULL AND form_type IS NOT NULL
      ORDER BY form_type
    `);
    
    const categories = rows.map(row => row.category);
    
    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/form-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'SELECT * FROM form_templates WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form template not found'
      });
    }
    
    const template = transformRow(rows[0]);
    
    res.json({
      success: true,
      data: template
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/form-templates', async (req, res) => {
  try {
    const {
      name,
      description,
      formType,
      fields,
      requireSignature,
      requirePhotos,
      minPhotos
    } = req.body;
    
    if (!name || !fields) {
      return res.status(400).json({
        success: false,
        error: 'Name and fields are required'
      });
    }
    
    if (!Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Fields must be an array'
      });
    }
    
    for (const field of fields) {
      if (!field.id || !field.type || !field.label) {
        return res.status(400).json({
          success: false,
          error: 'Each field must have id, type, and label'
        });
      }
    }
    
    const { rows } = await db.query(
      `INSERT INTO form_templates (
        name, description, form_type, fields, 
        require_signature, require_photos, min_photos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name,
        description || null,
        formType || null,
        JSON.stringify(fields),
        requireSignature || false,
        requirePhotos || false,
        minPhotos || null
      ]
    );
    
    const template = transformRow(rows[0]);
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Form template created successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/form-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      formType,
      fields,
      isActive,
      requireSignature,
      requirePhotos,
      minPhotos
    } = req.body;
    
    const { rows: existing } = await db.query(
      'SELECT * FROM form_templates WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form template not found'
      });
    }
    
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount++;
    }
    if (formType !== undefined) {
      updates.push(`form_type = $${paramCount}`);
      params.push(formType);
      paramCount++;
    }
    if (fields !== undefined) {
      if (!Array.isArray(fields)) {
        return res.status(400).json({
          success: false,
          error: 'Fields must be an array'
        });
      }
      updates.push(`fields = $${paramCount}`);
      params.push(JSON.stringify(fields));
      paramCount++;
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      params.push(isActive);
      paramCount++;
    }
    if (requireSignature !== undefined) {
      updates.push(`require_signature = $${paramCount}`);
      params.push(requireSignature);
      paramCount++;
    }
    if (requirePhotos !== undefined) {
      updates.push(`require_photos = $${paramCount}`);
      params.push(requirePhotos);
      paramCount++;
    }
    if (minPhotos !== undefined) {
      updates.push(`min_photos = $${paramCount}`);
      params.push(minPhotos);
      paramCount++;
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(id);
    
    const { rows } = await db.query(
      `UPDATE form_templates SET ${updates.join(', ')}
       WHERE id = $${paramCount} RETURNING *`,
      params
    );
    
    const template = transformRow(rows[0]);
    
    res.json({
      success: true,
      data: template,
      message: 'Form template updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/form-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      `UPDATE form_templates 
       SET is_active = false, deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Form template deleted successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/form-templates/seed', async (req, res) => {
  try {
    const sampleTemplates = [
      {
        name: 'Pre-Job Safety Checklist',
        description: 'Mandatory safety checklist to be completed before starting any tree work',
        form_type: 'safety',
        fields: [
          { id: 'ppe_check', type: 'checkbox', label: 'All crew members wearing proper PPE (helmet, gloves, safety glasses, boots)', required: true },
          { id: 'equipment_inspection', type: 'checkbox', label: 'All equipment inspected and in safe working condition', required: true },
          { id: 'drop_zone', type: 'checkbox', label: 'Drop zone clearly marked and secured', required: true },
          { id: 'traffic_control', type: 'checkbox', label: 'Traffic control measures in place (if applicable)', required: false },
          { id: 'power_lines', type: 'select', label: 'Power line proximity status', required: true, options: ['No power lines nearby', 'Power lines present - keeping safe distance', 'Power company notified'] },
          { id: 'weather_conditions', type: 'select', label: 'Weather conditions', required: true, options: ['Clear and safe', 'Marginal - monitoring', 'Unsafe - work postponed'] },
          { id: 'emergency_plan', type: 'checkbox', label: 'Emergency action plan reviewed with crew', required: true },
          { id: 'first_aid_kit', type: 'checkbox', label: 'First aid kit accessible on site', required: true },
          { id: 'additional_hazards', type: 'textarea', label: 'Additional hazards identified', required: false },
          { id: 'crew_leader_name', type: 'text', label: 'Crew Leader Name', required: true },
          { id: 'checklist_date', type: 'date', label: 'Date', required: true }
        ],
        require_signature: true,
        is_active: true
      },
      {
        name: 'Tree Removal Inspection',
        description: 'Detailed inspection form for tree removal assessment and documentation',
        form_type: 'inspection',
        fields: [
          { id: 'tree_species', type: 'text', label: 'Tree Species', required: true },
          { id: 'tree_height', type: 'number', label: 'Estimated Height (feet)', required: true },
          { id: 'trunk_diameter', type: 'number', label: 'Trunk Diameter (inches)', required: true },
          { id: 'tree_health', type: 'select', label: 'Tree Health Assessment', required: true, options: ['Healthy', 'Declining', 'Dead', 'Hazardous'] },
          { id: 'decay_present', type: 'checkbox', label: 'Signs of decay or rot present', required: false },
          { id: 'structural_defects', type: 'textarea', label: 'Structural defects noted', required: false },
          { id: 'obstacles', type: 'textarea', label: 'Nearby obstacles (buildings, fences, utilities)', required: true },
          { id: 'access_notes', type: 'textarea', label: 'Site access notes', required: false },
          { id: 'recommended_equipment', type: 'textarea', label: 'Recommended equipment for removal', required: true },
          { id: 'crew_size', type: 'number', label: 'Recommended crew size', required: true },
          { id: 'estimated_time', type: 'number', label: 'Estimated time (hours)', required: true },
          { id: 'special_considerations', type: 'textarea', label: 'Special considerations', required: false },
          { id: 'inspector_name', type: 'text', label: 'Inspector Name', required: true },
          { id: 'inspection_date', type: 'date', label: 'Inspection Date', required: true }
        ],
        require_signature: true,
        require_photos: true,
        min_photos: 3,
        is_active: true
      },
      {
        name: 'Customer Walkthrough',
        description: 'Documentation of customer walkthrough and verbal confirmation',
        form_type: 'customer',
        fields: [
          { id: 'customer_present', type: 'checkbox', label: 'Customer was present for walkthrough', required: true },
          { id: 'scope_explained', type: 'checkbox', label: 'Scope of work explained and understood', required: true },
          { id: 'stump_treatment', type: 'select', label: 'Stump treatment preference', required: true, options: ['Grind below grade', 'Grind to grade', 'Leave stump', 'Chemical treatment'] },
          { id: 'wood_disposal', type: 'select', label: 'Wood disposal preference', required: true, options: ['Haul away', 'Leave on site stacked', 'Cut for firewood'] },
          { id: 'debris_cleanup', type: 'select', label: 'Debris cleanup level', required: true, options: ['Full cleanup', 'Basic cleanup', 'Customer will handle'] },
          { id: 'access_granted', type: 'checkbox', label: 'Access to property confirmed', required: true },
          { id: 'pets_secured', type: 'checkbox', label: 'Customer will secure pets during work', required: false },
          { id: 'special_requests', type: 'textarea', label: 'Special requests or concerns', required: false },
          { id: 'customer_signature', type: 'signature', label: 'Customer Signature', required: true }
        ],
        require_signature: true,
        is_active: true
      },
      {
        name: 'Job Completion Report',
        description: 'Internal checklist for job wrap-up and quality assurance',
        form_type: 'completion',
        fields: [
          { id: 'all_work_completed', type: 'checkbox', label: 'All work items from quote completed', required: true },
          { id: 'stumps_ground', type: 'checkbox', label: 'Stumps ground (if applicable)', required: false },
          { id: 'wood_hauled', type: 'checkbox', label: 'Wood hauled away or stacked as requested', required: true },
          { id: 'debris_removed', type: 'checkbox', label: 'All debris and branches removed', required: true },
          { id: 'site_raked', type: 'checkbox', label: 'Work area raked and cleaned', required: true },
          { id: 'equipment_removed', type: 'checkbox', label: 'All equipment removed from site', required: true },
          { id: 'no_property_damage', type: 'checkbox', label: 'No damage to customer property', required: true },
          { id: 'damage_notes', type: 'textarea', label: 'Property damage notes (if any)', required: false },
          { id: 'safety_incidents', type: 'checkbox', label: 'Any safety incidents occurred', required: false },
          { id: 'incident_details', type: 'textarea', label: 'Safety incident details', required: false },
          { id: 'additional_services_sold', type: 'textarea', label: 'Additional services sold on site', required: false },
          { id: 'crew_leader_name', type: 'text', label: 'Crew Leader Name', required: true },
          { id: 'completion_date', type: 'date', label: 'Completion Date', required: true }
        ],
        require_signature: true,
        require_photos: true,
        is_active: true
      }
    ];
    
    const inserted = [];
    const skipped = [];
    
    for (const template of sampleTemplates) {
      const { rows: existing } = await db.query(
        'SELECT id FROM form_templates WHERE name = $1 AND deleted_at IS NULL',
        [template.name]
      );
      
      if (existing.length > 0) {
        skipped.push(template.name);
        continue;
      }
      
      const { rows } = await db.query(
        `INSERT INTO form_templates (
          name, description, form_type, fields, require_signature, require_photos, min_photos, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          template.name,
          template.description,
          template.form_type,
          JSON.stringify(template.fields),
          template.require_signature || false,
          template.require_photos || false,
          template.min_photos || null,
          template.is_active
        ]
      );
      
      inserted.push(transformRow(rows[0]));
    }
    
    res.json({
      success: true,
      data: { inserted, skipped },
      message: `Seeded ${inserted.length} templates, ${skipped.length} already existed`
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
