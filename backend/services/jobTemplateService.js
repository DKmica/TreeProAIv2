/**
 * TreePro AI - Job Template Service
 * 
 * Implements job template management with:
 * - CRUD operations for templates
 * - Template creation from existing jobs
 * - Job creation from templates
 * - Usage tracking and analytics
 * - Category-based filtering
 * 
 * Template Flow:
 * 1. Create templates (manual or from existing jobs)
 * 2. Browse templates by category
 * 3. Use template to pre-fill job creation form
 * 4. Track template usage statistics
 */

const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// TEMPLATE RETRIEVAL
// ============================================================================

/**
 * Get all templates with optional filters
 * @param {Object} filters - Optional filters (category, search, limit)
 * @returns {Promise<Array>} Array of templates
 */
const getAllTemplates = async (filters = {}) => {
  try {
    const { category, search, limit, includeDeleted } = filters;
    
    let query = `
      SELECT 
        id, name, description, category,
        default_duration_hours, default_crew_size, default_equipment_ids,
        base_price, price_per_hour, line_items,
        permit_required, deposit_required, deposit_percentage, jha_required,
        completion_checklist, safety_notes, special_instructions,
        created_by, created_at, updated_at, deleted_at,
        usage_count, last_used_at
      FROM job_templates
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Filter by deleted status
    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }
    
    // Filter by category
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    // Search filter (name or description)
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Order by usage and recency
    query += ` ORDER BY usage_count DESC, last_used_at DESC NULLS LAST, created_at DESC`;
    
    // Limit results
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
    }
    
    const { rows } = await db.query(query, params);
    
    return rows.map(transformTemplate);
  } catch (error) {
    console.error('[JobTemplateService] Error getting templates:', error);
    throw error;
  }
};

/**
 * Get a single template by ID
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Template object
 */
const getTemplateById = async (id) => {
  try {
    const { rows } = await db.query(
      `SELECT 
        id, name, description, category,
        default_duration_hours, default_crew_size, default_equipment_ids,
        base_price, price_per_hour, line_items,
        permit_required, deposit_required, deposit_percentage, jha_required,
        completion_checklist, safety_notes, special_instructions,
        created_by, created_at, updated_at, deleted_at,
        usage_count, last_used_at
      FROM job_templates
      WHERE id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      throw new Error(`Template not found: ${id}`);
    }
    
    return transformTemplate(rows[0]);
  } catch (error) {
    console.error('[JobTemplateService] Error getting template by ID:', error);
    throw error;
  }
};

/**
 * Get templates grouped by category
 * @returns {Promise<Object>} Templates grouped by category
 */
const getTemplatesByCategory = async () => {
  try {
    const { rows } = await db.query(
      `SELECT 
        category,
        json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'description', description,
            'basePrice', base_price,
            'usageCount', usage_count,
            'lastUsedAt', last_used_at
          ) ORDER BY usage_count DESC, name
        ) as templates
      FROM job_templates
      WHERE deleted_at IS NULL
      GROUP BY category
      ORDER BY category`
    );
    
    const grouped = {};
    rows.forEach(row => {
      grouped[row.category || 'Uncategorized'] = row.templates;
    });
    
    return grouped;
  } catch (error) {
    console.error('[JobTemplateService] Error getting templates by category:', error);
    throw error;
  }
};

// ============================================================================
// TEMPLATE CREATION
// ============================================================================

/**
 * Create a new template
 * @param {Object} data - Template data
 * @returns {Promise<Object>} Created template
 */
const createTemplate = async (data) => {
  try {
    const id = data.id || uuidv4();
    
    const { rows } = await db.query(
      `INSERT INTO job_templates (
        id, name, description, category,
        default_duration_hours, default_crew_size, default_equipment_ids,
        base_price, price_per_hour, line_items,
        permit_required, deposit_required, deposit_percentage, jha_required,
        completion_checklist, safety_notes, special_instructions,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        id,
        data.name,
        data.description || null,
        data.category || null,
        data.defaultDurationHours || data.default_duration_hours || null,
        data.defaultCrewSize || data.default_crew_size || null,
        data.defaultEquipmentIds ? JSON.stringify(data.defaultEquipmentIds) : null,
        data.basePrice || data.base_price || null,
        data.pricePerHour || data.price_per_hour || null,
        data.lineItems ? JSON.stringify(data.lineItems) : null,
        data.permitRequired || data.permit_required || false,
        data.depositRequired || data.deposit_required || false,
        data.depositPercentage || data.deposit_percentage || null,
        data.jhaRequired || data.jha_required || false,
        data.completionChecklist ? JSON.stringify(data.completionChecklist) : null,
        data.safetyNotes || data.safety_notes || null,
        data.specialInstructions || data.special_instructions || null,
        data.createdBy || data.created_by || null
      ]
    );
    
    console.log(`✅ [JobTemplateService] Template created: ${id} - ${data.name}`);
    
    return transformTemplate(rows[0]);
  } catch (error) {
    console.error('[JobTemplateService] Error creating template:', error);
    throw error;
  }
};

/**
 * Create a template from an existing job
 * @param {string} jobId - Job ID to create template from
 * @param {Object} templateData - Additional template data (name, description, category)
 * @returns {Promise<Object>} Created template
 */
const createTemplateFromJob = async (jobId, templateData = {}) => {
  try {
    // Fetch the job
    const { rows: jobs } = await db.query(
      `SELECT 
        j.*,
        q.line_items as quote_line_items,
        q.stump_grinding_price
      FROM jobs j
      LEFT JOIN quotes q ON j.quote_id = q.id
      WHERE j.id = $1`,
      [jobId]
    );
    
    if (jobs.length === 0) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    const job = jobs[0];
    
    // Extract template data from job
    const templateId = uuidv4();
    
    // Build line items from quote if available
    let lineItems = null;
    if (job.quote_line_items) {
      lineItems = job.quote_line_items;
    }
    
    // Calculate duration from job times if available
    let durationHours = null;
    if (job.work_start_time && job.work_end_time) {
      const start = new Date(job.work_start_time);
      const end = new Date(job.work_end_time);
      durationHours = (end - start) / (1000 * 60 * 60);
    }
    
    const template = {
      id: templateId,
      name: templateData.name || `${job.description || 'Job'} Template`,
      description: templateData.description || job.description,
      category: templateData.category || 'Custom',
      defaultDurationHours: durationHours,
      defaultCrewSize: job.assigned_crew ? job.assigned_crew.length : null,
      defaultEquipmentIds: job.assigned_equipment || null,
      basePrice: null, // Will be calculated from line items
      pricePerHour: null,
      lineItems: lineItems,
      permitRequired: job.permit_required || false,
      depositRequired: job.deposit_required || false,
      depositPercentage: null,
      jhaRequired: job.jha_required || false,
      completionChecklist: job.completion_checklist || null,
      safetyNotes: templateData.safetyNotes || null,
      specialInstructions: job.special_instructions || null,
      createdBy: templateData.createdBy || null
    };
    
    const createdTemplate = await createTemplate(template);
    
    console.log(`✅ [JobTemplateService] Template created from job ${jobId}: ${templateId}`);
    
    return createdTemplate;
  } catch (error) {
    console.error('[JobTemplateService] Error creating template from job:', error);
    throw error;
  }
};

// ============================================================================
// TEMPLATE UPDATE
// ============================================================================

/**
 * Update an existing template
 * @param {string} id - Template ID
 * @param {Object} data - Updated template data
 * @returns {Promise<Object>} Updated template
 */
const updateTemplate = async (id, data) => {
  try {
    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    const fieldMap = {
      name: 'name',
      description: 'description',
      category: 'category',
      defaultDurationHours: 'default_duration_hours',
      defaultCrewSize: 'default_crew_size',
      defaultEquipmentIds: 'default_equipment_ids',
      basePrice: 'base_price',
      pricePerHour: 'price_per_hour',
      lineItems: 'line_items',
      permitRequired: 'permit_required',
      depositRequired: 'deposit_required',
      depositPercentage: 'deposit_percentage',
      jhaRequired: 'jha_required',
      completionChecklist: 'completion_checklist',
      safetyNotes: 'safety_notes',
      specialInstructions: 'special_instructions'
    };
    
    Object.keys(fieldMap).forEach(camelKey => {
      const snakeKey = fieldMap[camelKey];
      if (data[camelKey] !== undefined) {
        // Handle JSONB fields
        if (['defaultEquipmentIds', 'lineItems', 'completionChecklist'].includes(camelKey)) {
          updates.push(`${snakeKey} = $${paramIndex}`);
          params.push(JSON.stringify(data[camelKey]));
        } else {
          updates.push(`${snakeKey} = $${paramIndex}`);
          params.push(data[camelKey]);
        }
        paramIndex++;
      }
    });
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);
    
    // Add template ID parameter
    params.push(id);
    
    const query = `
      UPDATE job_templates
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `;
    
    const { rows } = await db.query(query, params);
    
    if (rows.length === 0) {
      throw new Error(`Template not found or already deleted: ${id}`);
    }
    
    console.log(`✅ [JobTemplateService] Template updated: ${id}`);
    
    return transformTemplate(rows[0]);
  } catch (error) {
    console.error('[JobTemplateService] Error updating template:', error);
    throw error;
  }
};

// ============================================================================
// TEMPLATE DELETION
// ============================================================================

/**
 * Soft delete a template
 * @param {string} id - Template ID
 * @returns {Promise<boolean>} Success status
 */
const deleteTemplate = async (id) => {
  try {
    const { rows } = await db.query(
      `UPDATE job_templates
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id`,
      [id]
    );
    
    if (rows.length === 0) {
      throw new Error(`Template not found or already deleted: ${id}`);
    }
    
    console.log(`🗑️ [JobTemplateService] Template soft deleted: ${id}`);
    
    return true;
  } catch (error) {
    console.error('[JobTemplateService] Error deleting template:', error);
    throw error;
  }
};

// ============================================================================
// TEMPLATE USAGE
// ============================================================================

/**
 * Create a job from a template
 * @param {string} templateId - Template ID
 * @param {Object} jobData - Job-specific data to override template defaults
 * @returns {Promise<Object>} Created job
 */
const useTemplate = async (templateId, jobData = {}) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Fetch the template
    const { rows: templates } = await client.query(
      `SELECT * FROM job_templates WHERE id = $1 AND deleted_at IS NULL`,
      [templateId]
    );
    
    if (templates.length === 0) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    const template = templates[0];
    
    // Create job from template with override data
    const jobId = jobData.id || uuidv4();
    
    // Merge template defaults with job-specific data
    const job = {
      id: jobId,
      status: 'draft', // Always start as draft
      customer_name: jobData.customerName || jobData.customer_name || null,
      job_location: jobData.jobLocation || jobData.job_location || template.name,
      assigned_crew: jobData.assignedCrew || jobData.assigned_crew || null,
      equipment_needed: jobData.equipmentNeeded || jobData.equipment_needed || template.default_equipment_ids,
      permit_required: jobData.permitRequired !== undefined ? jobData.permitRequired : template.permit_required,
      deposit_required: jobData.depositRequired !== undefined ? jobData.depositRequired : template.deposit_required,
      completion_checklist: jobData.completionChecklist || template.completion_checklist,
      special_instructions: jobData.specialInstructions || jobData.special_instructions || template.special_instructions,
      quote_id: jobData.quoteId || jobData.quote_id || null,
      scheduled_date: jobData.scheduledDate || jobData.scheduled_date || null,
      estimated_hours: template.default_duration_hours || null,
      required_crew_size: jobData.requiredCrewSize || jobData.required_crew_size || template.default_crew_size || null,
      job_template_id: template.id
    };
    
    // Insert job
    const { rows: createdJobs } = await client.query(
      `INSERT INTO jobs (
        id, status, customer_name, job_location,
        assigned_crew, equipment_needed,
        permit_required, deposit_required,
        completion_checklist, special_instructions,
        quote_id, scheduled_date, estimated_hours,
        required_crew_size, job_template_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        job.id,
        job.status,
        job.customer_name,
        job.job_location,
        job.assigned_crew ? JSON.stringify(job.assigned_crew) : null,
        job.equipment_needed ? JSON.stringify(job.equipment_needed) : null,
        job.permit_required,
        job.deposit_required,
        job.completion_checklist ? JSON.stringify(job.completion_checklist) : null,
        job.special_instructions,
        job.quote_id,
        job.scheduled_date,
        job.estimated_hours,
        job.required_crew_size,
        job.job_template_id
      ]
    );
    
    // Update template usage statistics
    await client.query(
      `UPDATE job_templates
      SET usage_count = usage_count + 1,
          last_used_at = NOW()
      WHERE id = $1`,
      [templateId]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ [JobTemplateService] Job created from template ${templateId}: ${jobId}`);
    
    return createdJobs[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[JobTemplateService] Error using template:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get template usage statistics
 * @returns {Promise<Array>} Usage statistics
 */
const getUsageStats = async () => {
  try {
    const { rows } = await db.query(
      `SELECT 
        id, name, category,
        usage_count, last_used_at,
        created_at
      FROM job_templates
      WHERE deleted_at IS NULL
      ORDER BY usage_count DESC, last_used_at DESC NULLS LAST
      LIMIT 10`
    );
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      usageCount: row.usage_count,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('[JobTemplateService] Error getting usage stats:', error);
    throw error;
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform database row to API format
 * @param {Object} row - Database row
 * @returns {Object} Transformed template
 */
const transformTemplate = (row) => {
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    defaultDurationHours: row.default_duration_hours,
    defaultCrewSize: row.default_crew_size,
    defaultEquipmentIds: row.default_equipment_ids,
    basePrice: row.base_price,
    pricePerHour: row.price_per_hour,
    lineItems: row.line_items,
    permitRequired: row.permit_required,
    depositRequired: row.deposit_required,
    depositPercentage: row.deposit_percentage,
    jhaRequired: row.jha_required,
    completionChecklist: row.completion_checklist,
    safetyNotes: row.safety_notes,
    specialInstructions: row.special_instructions,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  createTemplate,
  createTemplateFromJob,
  updateTemplate,
  deleteTemplate,
  useTemplate,
  getUsageStats
};
