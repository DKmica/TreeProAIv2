const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');
const jobStateService = require('../services/jobStateService');
const jobTemplateService = require('../services/jobTemplateService');
const recurringJobsService = require('../services/recurringJobsService');
const { generateJobNumber } = require('../services/numberService');

const router = express.Router();

const updateClientCategoryFromJobs = async (clientId) => {
  if (!clientId) return;

  const { rows } = await db.query(
    `SELECT COUNT(*) AS completed_jobs
       FROM jobs
       WHERE client_id = $1 AND status IN ('completed', 'invoiced', 'paid')`,
    [clientId]
  );

  const completedJobs = parseInt(rows[0]?.completed_jobs || '0', 10);
  let category = 'new';
  if (completedJobs >= 5) {
    category = 'vip';
  } else if (completedJobs >= 1) {
    category = 'repeat';
  }

  await db.query(
    'UPDATE clients SET category = $1, updated_at = NOW() WHERE id = $2',
    [category, clientId]
  );
};

const transformJobMaterial = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    jobId: row.job_id,
    materialName: row.material_name,
    quantityUsed: row.quantity_used ? parseFloat(row.quantity_used) : null,
    unit: row.unit,
    epaRegNumber: row.epa_reg_number,
    applicationMethod: row.application_method,
    applicationRate: row.application_rate,
    targetPestOrCondition: row.target_pest_or_condition,
    appliedBy: row.applied_by,
    employeeName: row.employee_name || null,
    appliedAt: row.applied_at,
    weatherConditions: row.weather_conditions,
    windSpeedMph: row.wind_speed_mph ? parseFloat(row.wind_speed_mph) : null,
    temperatureF: row.temperature_f ? parseFloat(row.temperature_f) : null,
    ppeUsed: row.ppe_used,
    reiHours: row.rei_hours ? parseFloat(row.rei_hours) : null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

router.get('/jobs', 
  requirePermission(RESOURCES.JOBS, ACTIONS.LIST),
  async (req, res) => {
  try {
    const { status, search } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);

    const filters = [];
    const params = [];

    if (status) {
      params.push(status);
      filters.push(`j.status = $${params.length}`);
    }

    if (search) {
      const likeValue = `%${String(search)}%`;
      params.push(likeValue, likeValue, likeValue, likeValue);
      const startIndex = params.length - 3;
      filters.push(`(
        j.customer_name ILIKE $${startIndex}
        OR j.job_location ILIKE $${startIndex + 1}
        OR j.special_instructions ILIKE $${startIndex + 2}
        OR j.job_number ILIKE $${startIndex + 3}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const baseQuery = `
      FROM jobs j
      LEFT JOIN quotes q ON q.id = j.quote_id
      LEFT JOIN properties p ON p.id = j.property_id
      LEFT JOIN clients c ON c.id = j.client_id
      ${whereClause}
    `;

    const selectQuery = `
      SELECT
        j.*,
        q.quote_number,
        q.version AS quote_version,
        q.approval_status AS quote_approval_status,
        q.approved_by AS quote_approved_by,
        q.approved_at AS quote_approved_at,
        p.lat AS property_lat,
        p.lon AS property_lon,
        p.property_name,
        p.address_line1 AS property_address,
        p.city AS property_city,
        p.state AS property_state,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.company_name AS client_company_name
      ${baseQuery}
      ORDER BY j.created_at DESC
      ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
    `;

    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);

    const transformed = rows.map((row) => transformRow(row, 'jobs'));

    if (!usePagination) {
      return res.json(transformed);
    }

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = Number.parseInt(countRows[0]?.total, 10) || 0;

    res.json({
      success: true,
      data: transformed,
      pagination: buildPaginationMeta(total, page, pageSize),
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /jobs/:id - Get a single job by ID
router.get('/jobs/:id',
  requirePermission(RESOURCES.JOBS, ACTIONS.READ),
  async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT
        j.*,
        q.quote_number,
        q.version AS quote_version,
        q.approval_status AS quote_approval_status,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.company_name as client_company_name,
        c.primary_email as client_email,
        c.primary_phone as client_phone,
        p.property_name,
        p.address_line1 as property_address,
        p.city as property_city,
        p.state as property_state
      FROM jobs j
      LEFT JOIN quotes q ON q.id = j.quote_id
      LEFT JOIN clients c ON c.id = j.client_id
      LEFT JOIN properties p ON p.id = j.property_id
      WHERE j.id = $1 AND j.deleted_at IS NULL
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const job = transformRow(rows[0], 'jobs');
    
    if (rows[0].client_first_name || rows[0].client_last_name || rows[0].client_company_name) {
      job.client = {
        firstName: rows[0].client_first_name,
        lastName: rows[0].client_last_name,
        companyName: rows[0].client_company_name,
        email: rows[0].client_email,
        phone: rows[0].client_phone
      };
    }
    
    if (rows[0].property_name || rows[0].property_address) {
      job.property = {
        propertyName: rows[0].property_name,
        address: rows[0].property_address,
        city: rows[0].property_city,
        state: rows[0].property_state
      };
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /jobs - Create a new standalone job (no quote required)
router.post('/jobs',
  requirePermission(RESOURCES.JOBS, ACTIONS.CREATE),
  async (req, res) => {
  try {
    const {
      clientId,
      propertyId,
      quoteId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      jobLocation,
      scheduledDate,
      scheduledTime,
      estimatedHours,
      assignedCrew,
      specialInstructions,
      status,
      equipmentNeeded,
      completionChecklist,
      jhaRequired,
      soldByEmployeeId
    } = req.body;
    
    if (!customerName && !clientId) {
      return res.status(400).json({
        success: false,
        error: 'Either customerName or clientId is required'
      });
    }
    
    const jobId = uuidv4();
    const jobNumber = await generateJobNumber();
    
    let resolvedCustomerName = customerName;
    let resolvedCustomerPhone = customerPhone;
    let resolvedCustomerEmail = customerEmail;
    let resolvedCustomerAddress = customerAddress;
    
    if (clientId && !customerName) {
      const { rows: clientRows } = await db.query(
        `SELECT company_name, first_name, last_name, primary_phone, primary_email,
                billing_address_line1, billing_city, billing_state, billing_zip_code
         FROM clients WHERE id = $1`,
        [clientId]
      );
      if (clientRows.length > 0) {
        const client = clientRows[0];
        resolvedCustomerName = client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown';
        resolvedCustomerPhone = resolvedCustomerPhone || client.primary_phone;
        resolvedCustomerEmail = resolvedCustomerEmail || client.primary_email;
        const addressParts = [client.billing_address_line1, client.billing_city, client.billing_state, client.billing_zip_code].filter(Boolean);
        resolvedCustomerAddress = resolvedCustomerAddress || (addressParts.length > 0 ? addressParts.join(', ') : null);
      }
    }
    
    let resolvedJobLocation = jobLocation;
    if (propertyId && !jobLocation) {
      const { rows: propRows } = await db.query(
        `SELECT address_line1, city, state, zip_code FROM properties WHERE id = $1`,
        [propertyId]
      );
      if (propRows.length > 0) {
        const prop = propRows[0];
        const propParts = [prop.address_line1, prop.city, prop.state, prop.zip_code].filter(Boolean);
        resolvedJobLocation = propParts.length > 0 ? propParts.join(', ') : null;
      }
    }
    
    let resolvedSoldBy = soldByEmployeeId || null;
    let quoteGrandTotal = null;
    if (quoteId && !resolvedSoldBy) {
      const { rows: quoteRows } = await db.query(
        'SELECT sold_by_employee_id, grand_total FROM quotes WHERE id = $1',
        [quoteId]
      );
      if (quoteRows.length > 0) {
        resolvedSoldBy = quoteRows[0].sold_by_employee_id;
        quoteGrandTotal = quoteRows[0].grand_total;
      }
    }
    
    const query = `
      INSERT INTO jobs (
        id, client_id, property_id, quote_id, job_number, status,
        customer_name, customer_phone, customer_email, customer_address,
        job_location, scheduled_date, scheduled_time, estimated_hours,
        assigned_crew, special_instructions, equipment_needed,
        completion_checklist, jha_required, sold_by_employee_id, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()
      ) RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      jobId,
      clientId || null,
      propertyId || null,
      quoteId || null,
      jobNumber,
      status || 'draft',
      resolvedCustomerName,
      resolvedCustomerPhone || null,
      resolvedCustomerEmail || null,
      resolvedCustomerAddress || null,
      resolvedJobLocation || null,
      scheduledDate || null,
      scheduledTime || null,
      estimatedHours || null,
      assignedCrew ? JSON.stringify(assignedCrew) : null,
      specialInstructions || null,
      equipmentNeeded ? JSON.stringify(equipmentNeeded) : null,
      completionChecklist ? JSON.stringify(completionChecklist) : null,
      jhaRequired || false,
      resolvedSoldBy
    ]);
    
    const job = transformRow(rows[0], 'jobs');
    
    // If this job was created from a quote, delete the quote
    let quoteDeleted = false;
    if (quoteId) {
      await db.query('UPDATE quotes SET deleted_at = NOW() WHERE id = $1', [quoteId]);
      console.log(`Quote ${quoteId} archived after conversion to job ${jobId}`);
      quoteDeleted = true;
    }
    
    res.status(201).json({
      success: true,
      data: job,
      message: 'Job created successfully',
      quoteDeleted
    });
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /jobs/:id - Update a job (no status restrictions)
router.put('/jobs/:id',
  requirePermission(RESOURCES.JOBS, ACTIONS.UPDATE),
  async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { rows: existingRows } = await db.query(
      'SELECT * FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const allowedFields = [
      'client_id', 'property_id', 'quote_id', 'status', 'customer_name',
      'customer_phone', 'customer_email', 'customer_address', 'job_location',
      'scheduled_date', 'scheduled_time', 'estimated_hours', 'assigned_crew',
      'special_instructions', 'equipment_needed', 'completion_checklist',
      'jha_required', 'jha', 'jha_acknowledged_at', 'work_start_time',
      'work_end_time', 'work_started_at', 'work_ended_at', 'weather_hold_reason',
      'permit_required', 'permit_status', 'deposit_required', 'deposit_status',
      'costs', 'internal_notes', 'clock_in_coordinates', 'clock_out_coordinates'
    ];
    
    const fieldMapping = {
      clientId: 'client_id',
      propertyId: 'property_id',
      quoteId: 'quote_id',
      customerName: 'customer_name',
      customerPhone: 'customer_phone',
      customerEmail: 'customer_email',
      customerAddress: 'customer_address',
      jobLocation: 'job_location',
      scheduledDate: 'scheduled_date',
      scheduledTime: 'scheduled_time',
      estimatedHours: 'estimated_hours',
      assignedCrew: 'assigned_crew',
      specialInstructions: 'special_instructions',
      equipmentNeeded: 'equipment_needed',
      completionChecklist: 'completion_checklist',
      jhaRequired: 'jha_required',
      jhaAcknowledgedAt: 'jha_acknowledged_at',
      workStartTime: 'work_start_time',
      workEndTime: 'work_end_time',
      workStartedAt: 'work_started_at',
      workEndedAt: 'work_ended_at',
      weatherHoldReason: 'weather_hold_reason',
      permitRequired: 'permit_required',
      permitStatus: 'permit_status',
      depositRequired: 'deposit_required',
      depositStatus: 'deposit_status',
      internalNotes: 'internal_notes',
      clockInCoordinates: 'clock_in_coordinates',
      clockOutCoordinates: 'clock_out_coordinates'
    };
    
    const setClauses = [];
    const values = [id];
    let paramIndex = 2;
    
    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField)) {
        let dbValue = value;
        if (['assigned_crew', 'equipment_needed', 'completion_checklist', 'jha', 'costs', 'clock_in_coordinates', 'clock_out_coordinates'].includes(dbField) && typeof value === 'object') {
          dbValue = JSON.stringify(value);
        }
        setClauses.push(`${dbField} = $${paramIndex}`);
        values.push(dbValue);
        paramIndex++;
      }
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    setClauses.push('updated_at = NOW()');
    
    const query = `
      UPDATE jobs SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows } = await db.query(query, values);
    const job = transformRow(rows[0], 'jobs');
    const previousJob = existingRows[0];
    
    if (job.clientId) {
      await updateClientCategoryFromJobs(job.clientId);
    }
    
    // If job just completed and has a salesman, create/update commission
    if (updates.status === 'completed' && previousJob.status !== 'completed') {
      const soldBy = rows[0].sold_by_employee_id;
      if (soldBy) {
        try {
          // Get the sale amount from quote or estimate the job value
          let saleAmount = 0;
          if (rows[0].quote_id) {
            const { rows: quoteRows } = await db.query(
              'SELECT grand_total FROM quotes WHERE id = $1',
              [rows[0].quote_id]
            );
            saleAmount = quoteRows[0]?.grand_total || 0;
          }
          
          if (saleAmount > 0) {
            // Get salesman's default commission rate
            const { rows: empRows } = await db.query(
              'SELECT default_commission_rate FROM employees WHERE id = $1',
              [soldBy]
            );
            const commissionRate = empRows[0]?.default_commission_rate || 10;
            const commissionAmount = (saleAmount * commissionRate) / 100;
            
            // Check if commission already exists for this job
            const { rows: existingComm } = await db.query(
              'SELECT id FROM sales_commissions WHERE job_id = $1 AND employee_id = $2',
              [id, soldBy]
            );
            
            if (existingComm.length > 0) {
              // Update existing commission to earned
              await db.query(
                `UPDATE sales_commissions 
                 SET status = 'earned', job_completed_at = NOW(), updated_at = NOW()
                 WHERE id = $1`,
                [existingComm[0].id]
              );
            } else {
              // Create new commission record as earned
              await db.query(
                `INSERT INTO sales_commissions (
                  employee_id, job_id, quote_id, sale_amount, commission_rate,
                  commission_amount, status, job_completed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'earned', NOW())`,
                [soldBy, id, rows[0].quote_id, saleAmount, commissionRate, commissionAmount]
              );
            }
            console.log(`Commission created/updated for job ${id}: ${commissionAmount} (${commissionRate}%)`);
          }
        } catch (commErr) {
          console.error('Error creating commission:', commErr);
        }
      }
      
      // Check if job has stump grinding work and create stump records
      try {
        if (rows[0].quote_id) {
          const { rows: quoteRows } = await db.query(
            'SELECT line_items FROM quotes WHERE id = $1',
            [rows[0].quote_id]
          );
          
          if (quoteRows.length > 0 && quoteRows[0].line_items) {
            const lineItems = typeof quoteRows[0].line_items === 'string' 
              ? JSON.parse(quoteRows[0].line_items) 
              : quoteRows[0].line_items;
            
            // Find stump grinding line items
            const stumpItems = lineItems.filter(item => 
              item.description?.toLowerCase().includes('stump') ||
              item.service?.toLowerCase().includes('stump') ||
              item.name?.toLowerCase().includes('stump')
            );
            
            for (const stumpItem of stumpItems) {
              // Generate stump number
              const { rows: stumpNumRows } = await db.query(
                "SELECT stump_number FROM stumps WHERE stump_number LIKE 'STG-%' ORDER BY created_at DESC LIMIT 1"
              );
              let nextNum = 1;
              if (stumpNumRows.length > 0 && stumpNumRows[0].stump_number) {
                const match = stumpNumRows[0].stump_number.match(/STG-(\d+)/);
                if (match) {
                  nextNum = parseInt(match[1], 10) + 1;
                }
              }
              const stumpNumber = `STG-${String(nextNum).padStart(5, '0')}`;
              
              await db.query(`
                INSERT INTO stumps (
                  job_id, client_id, property_id, stump_number, 
                  tree_species, diameter_inches, customer_name, job_location, 
                  notes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
              `, [
                id,
                rows[0].client_id,
                rows[0].property_id,
                stumpNumber,
                stumpItem.treeSpecies || stumpItem.species || null,
                stumpItem.diameter || stumpItem.size || null,
                rows[0].customer_name,
                rows[0].job_location,
                stumpItem.description || stumpItem.notes || null
              ]);
              console.log(`Stump ${stumpNumber} created from completed job ${id}`);
            }
          }
        }
      } catch (stumpErr) {
        console.error('Error creating stumps from job:', stumpErr);
      }
    }
    
    res.json({
      success: true,
      data: job,
      message: 'Job updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /jobs/:id - Soft delete a job (no status restrictions)
router.delete('/jobs/:id',
  requirePermission(RESOURCES.JOBS, ACTIONS.DELETE),
  async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: existingRows } = await db.query(
      'SELECT id FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    await db.query(
      'UPDATE jobs SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/jobs/:id/state-history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await jobStateService.getJob(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const history = await jobStateService.getStateHistory(id);
    
    res.json({
      success: true,
      data: {
        jobId: id,
        currentState: job.status,
        currentStateName: jobStateService.STATE_NAMES[job.status],
        history
      }
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/jobs/:id/state-transitions', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      toState, 
      reason, 
      notes,
      changedByRole = 'admin',
      changeSource = 'manual',
      jobUpdates = {}
    } = req.body;
    
    const changedBy = req.session?.userId || null;
    
    if (!toState) {
      return res.status(400).json({
        success: false,
        error: 'toState is required'
      });
    }
    
    const job = await jobStateService.getJob(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const result = await jobStateService.transitionJobState(id, toState, {
      changedBy,
      changedByRole,
      changeSource,
      reason,
      notes,
      jobUpdates
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.errors
      });
    }

    if (result.job?.client_id) {
      await updateClientCategoryFromJobs(result.job.client_id);
    }
    
    res.json({
      success: true,
      data: {
        job: transformRow(result.job, 'jobs'),
        transition: result.transition
      },
      message: `Job transitioned from '${result.transition.from}' to '${result.transition.to}'`
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/jobs/:id/allowed-transitions', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await jobStateService.getAllowedTransitionsForJob(id);
    
    if (result.error) {
      return res.status(404).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/job-templates', async (req, res) => {
  try {
    const { category, search, limit } = req.query;
    
    const filters = {
      category,
      search,
      limit: limit ? parseInt(limit) : undefined
    };
    
    const templates = await jobTemplateService.getAllTemplates(filters);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/job-templates/by-category', async (req, res) => {
  try {
    const grouped = await jobTemplateService.getTemplatesByCategory();
    
    res.json({
      success: true,
      data: grouped
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/job-templates/usage-stats', async (req, res) => {
  try {
    const stats = await jobTemplateService.getUsageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/job-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await jobTemplateService.getTemplateById(id);
    
    res.json({
      success: true,
      data: template
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

router.post('/job-templates', async (req, res) => {
  try {
    const template = await jobTemplateService.createTemplate(req.body);
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/job-templates/from-job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const templateData = req.body;
    
    const template = await jobTemplateService.createTemplateFromJob(jobId, templateData);
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created from job successfully'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

router.put('/job-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await jobTemplateService.updateTemplate(id, req.body);
    
    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

router.delete('/job-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await jobTemplateService.deleteTemplate(id);
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

router.post('/job-templates/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    const jobData = req.body;
    
    const job = await jobTemplateService.useTemplate(id, jobData);
    
    res.status(201).json({
      success: true,
      data: transformRow(job, 'jobs'),
      message: 'Job created from template successfully'
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }
    handleError(res, err);
  }
});

router.get('/job-series', async (req, res) => {
  try {
    const data = await recurringJobsService.listSeries();
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/job-series/:id', async (req, res) => {
  try {
    const data = await recurringJobsService.getSeriesById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/job-series', async (req, res) => {
  try {
    const created = await recurringJobsService.createSeries(req.body || {});
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/job-series/:id', async (req, res) => {
  try {
    const updated = await recurringJobsService.updateSeries(req.params.id, req.body || {});
    res.json({ success: true, data: updated });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/job-series/:id', async (req, res) => {
  try {
    await recurringJobsService.removeSeries(req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/job-series/:id/instances', async (req, res) => {
  try {
    const instances = await recurringJobsService.listInstances(req.params.id);
    res.json({ success: true, data: instances });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/job-series/:id/generate', async (req, res) => {
  try {
    const instances = await recurringJobsService.generateInstances(req.params.id, req.body || {});
    res.json({ success: true, data: instances });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/job-series/:id/instances/:instanceId/convert', async (req, res) => {
  try {
    const { job, instance } = await recurringJobsService.convertInstanceToJob(req.params.id, req.params.instanceId);
    res.status(201).json({
      success: true,
      data: {
        job: transformRow(job, 'jobs'),
        instance: transformRow(instance, 'recurring_job_instances')
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/job-series/:id/instances/:instanceId/status', async (req, res) => {
  try {
    const updated = await recurringJobsService.updateInstanceStatus(req.params.id, req.params.instanceId, req.body?.status);
    res.json({ success: true, data: updated });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/jobs/:jobId/forms', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { formTemplateId } = req.body;
    
    if (!formTemplateId) {
      return res.status(400).json({
        success: false,
        error: 'formTemplateId is required'
      });
    }
    
    const { rows: jobRows } = await db.query(
      'SELECT id FROM jobs WHERE id = $1',
      [jobId]
    );
    
    if (jobRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const { rows: templateRows } = await db.query(
      'SELECT * FROM form_templates WHERE id = $1 AND deleted_at IS NULL',
      [formTemplateId]
    );
    
    if (templateRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Form template not found'
      });
    }
    
    const { rows } = await db.query(
      `INSERT INTO job_forms (job_id, form_template_id, status, form_data)
       VALUES ($1, $2, 'pending', '{}')
       RETURNING *`,
      [jobId, formTemplateId]
    );
    
    const jobForm = transformRow(rows[0], 'job_forms');
    
    res.status(201).json({
      success: true,
      data: jobForm,
      message: 'Form attached to job successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/jobs/:jobId/forms', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const { rows: jobRows } = await db.query(
      'SELECT id FROM jobs WHERE id = $1',
      [jobId]
    );
    
    if (jobRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const { rows } = await db.query(
      `SELECT 
        jf.*,
        ft.name as template_name,
        ft.description as template_description,
        ft.form_type as template_form_type,
        ft.fields as template_fields,
        ft.require_signature,
        ft.require_photos,
        ft.min_photos
       FROM job_forms jf
       JOIN form_templates ft ON jf.form_template_id = ft.id
       WHERE jf.job_id = $1
       ORDER BY jf.created_at DESC`,
      [jobId]
    );
    
    const jobForms = rows.map(row => {
      const jobForm = transformRow(row, 'job_forms');
      jobForm.template = {
        name: row.template_name,
        description: row.template_description,
        formType: row.template_form_type,
        fields: row.template_fields,
        requireSignature: row.require_signature,
        requirePhotos: row.require_photos,
        minPhotos: row.min_photos
      };
      return jobForm;
    });
    
    res.json({
      success: true,
      data: jobForms
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/job-forms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      `SELECT 
        jf.*,
        ft.name as template_name,
        ft.description as template_description,
        ft.form_type as template_form_type,
        ft.fields as template_fields,
        ft.require_signature,
        ft.require_photos,
        ft.min_photos
       FROM job_forms jf
       JOIN form_templates ft ON jf.form_template_id = ft.id
       WHERE jf.id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job form not found'
      });
    }
    
    const jobForm = transformRow(rows[0], 'job_forms');
    jobForm.template = {
      name: rows[0].template_name,
      description: rows[0].template_description,
      formType: rows[0].template_form_type,
      fields: rows[0].template_fields,
      requireSignature: rows[0].require_signature,
      requirePhotos: rows[0].require_photos,
      minPhotos: rows[0].min_photos
    };
    
    res.json({
      success: true,
      data: jobForm
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/job-forms/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { formData } = req.body;
    
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'formData is required and must be an object'
      });
    }
    
    const { rows: formRows } = await db.query(
      `SELECT jf.*, ft.fields as template_fields
       FROM job_forms jf
       JOIN form_templates ft ON jf.form_template_id = ft.id
       WHERE jf.id = $1`,
      [id]
    );
    
    if (formRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job form not found'
      });
    }
    
    const templateFields = formRows[0].template_fields;
    const errors = [];
    
    for (const field of templateFields) {
      const value = formData[field.id];
      
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Field '${field.label}' must be a number`);
            }
            break;
          case 'checkbox':
            if (typeof value !== 'boolean') {
              errors.push(`Field '${field.label}' must be a boolean`);
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors.push(`Field '${field.label}' must be a valid date`);
            }
            break;
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation errors',
        errors
      });
    }
    
    const { rows } = await db.query(
      `UPDATE job_forms 
       SET form_data = $1, status = 'in_progress', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(formData), id]
    );
    
    const jobForm = transformRow(rows[0], 'job_forms');
    
    res.json({
      success: true,
      data: jobForm,
      message: 'Form data updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/job-forms/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completedBy } = req.body;
    
    const { rows: formRows } = await db.query(
      `SELECT jf.*, ft.fields as template_fields
       FROM job_forms jf
       JOIN form_templates ft ON jf.form_template_id = ft.id
       WHERE jf.id = $1`,
      [id]
    );
    
    if (formRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job form not found'
      });
    }
    
    const jobForm = formRows[0];
    const templateFields = jobForm.template_fields;
    const formData = jobForm.form_data || {};
    
    const errors = [];
    for (const field of templateFields) {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === '') {
          errors.push(`Required field '${field.label}' is not filled`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot complete form: required fields are missing',
        errors
      });
    }
    
    const { rows } = await db.query(
      `UPDATE job_forms 
       SET status = 'completed', 
           completed_at = NOW(), 
           completed_by = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [completedBy || null, id]
    );
    
    const updatedJobForm = transformRow(rows[0], 'job_forms');
    
    res.json({
      success: true,
      data: updatedJobForm,
      message: 'Form marked as completed'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/job-forms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'DELETE FROM job_forms WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job form not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Form removed from job successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/jobs/:id/materials', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT jm.*, e.name as employee_name
      FROM job_materials jm
      LEFT JOIN employees e ON jm.applied_by = e.id
      WHERE jm.job_id = $1
      ORDER BY jm.created_at DESC
    `;
    
    const { rows } = await db.query(query, [id]);
    
    res.json({
      success: true,
      data: rows.map(transformJobMaterial)
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/jobs/:id/materials', async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const {
      materialName,
      quantityUsed,
      unit,
      epaRegNumber,
      applicationMethod,
      applicationRate,
      targetPestOrCondition,
      appliedBy,
      appliedAt,
      weatherConditions,
      windSpeedMph,
      temperatureF,
      ppeUsed,
      reiHours,
      notes
    } = req.body;
    
    if (!materialName) {
      return res.status(400).json({
        success: false,
        error: 'materialName is required'
      });
    }
    
    const materialId = uuidv4();
    const userId = req.user?.id || null;
    
    const query = `
      INSERT INTO job_materials (
        id, job_id, material_name, quantity_used, unit,
        epa_reg_number, application_method, application_rate,
        target_pest_or_condition, applied_by, applied_at,
        weather_conditions, wind_speed_mph, temperature_f,
        ppe_used, rei_hours, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      materialId,
      jobId,
      materialName,
      quantityUsed || null,
      unit || null,
      epaRegNumber || null,
      applicationMethod || null,
      applicationRate || null,
      targetPestOrCondition || null,
      appliedBy || null,
      appliedAt || null,
      weatherConditions || null,
      windSpeedMph || null,
      temperatureF || null,
      ppeUsed || null,
      reiHours || null,
      notes || null,
      userId
    ]);
    
    res.status(201).json({
      success: true,
      data: transformJobMaterial(rows[0]),
      message: 'Material usage recorded'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/job-materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      materialName,
      quantityUsed,
      unit,
      epaRegNumber,
      applicationMethod,
      applicationRate,
      targetPestOrCondition,
      appliedBy,
      appliedAt,
      weatherConditions,
      windSpeedMph,
      temperatureF,
      ppeUsed,
      reiHours,
      notes
    } = req.body;
    
    const query = `
      UPDATE job_materials SET
        material_name = COALESCE($1, material_name),
        quantity_used = COALESCE($2, quantity_used),
        unit = COALESCE($3, unit),
        epa_reg_number = COALESCE($4, epa_reg_number),
        application_method = COALESCE($5, application_method),
        application_rate = COALESCE($6, application_rate),
        target_pest_or_condition = COALESCE($7, target_pest_or_condition),
        applied_by = COALESCE($8, applied_by),
        applied_at = COALESCE($9, applied_at),
        weather_conditions = COALESCE($10, weather_conditions),
        wind_speed_mph = COALESCE($11, wind_speed_mph),
        temperature_f = COALESCE($12, temperature_f),
        ppe_used = COALESCE($13, ppe_used),
        rei_hours = COALESCE($14, rei_hours),
        notes = COALESCE($15, notes),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      materialName,
      quantityUsed,
      unit,
      epaRegNumber,
      applicationMethod,
      applicationRate,
      targetPestOrCondition,
      appliedBy,
      appliedAt,
      weatherConditions,
      windSpeedMph,
      temperatureF,
      ppeUsed,
      reiHours,
      notes,
      id
    ]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material record not found'
      });
    }
    
    res.json({
      success: true,
      data: transformJobMaterial(rows[0]),
      message: 'Material record updated'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/job-materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(
      'DELETE FROM job_materials WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Material record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Material record deleted'
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
