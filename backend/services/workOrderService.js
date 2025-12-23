const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { transformRow } = require('../utils/transformers');

const STAGES = {
  LEAD: 'lead',
  QUOTING: 'quoting',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  INVOICED: 'invoiced',
  LOST: 'lost'
};

const VALID_STAGES = Object.values(STAGES);

const STAGE_TRANSITIONS = {
  [STAGES.LEAD]: [STAGES.QUOTING, STAGES.LOST],
  [STAGES.QUOTING]: [STAGES.SCHEDULED, STAGES.LOST, STAGES.LEAD],
  [STAGES.SCHEDULED]: [STAGES.IN_PROGRESS, STAGES.COMPLETE, STAGES.LOST, STAGES.QUOTING],
  [STAGES.IN_PROGRESS]: [STAGES.COMPLETE, STAGES.SCHEDULED],
  [STAGES.COMPLETE]: [STAGES.INVOICED],
  [STAGES.INVOICED]: [STAGES.COMPLETE, STAGES.LOST],
  [STAGES.LOST]: [STAGES.LEAD, STAGES.QUOTING]
};

const transformWorkOrder = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    propertyId: row.property_id,
    sourceLeadId: row.source_lead_id,
    title: row.title,
    description: row.description,
    stage: row.stage,
    statusReason: row.status_reason,
    assignedEmployeeId: row.assigned_employee_id,
    soldByEmployeeId: row.sold_by_employee_id,
    estimatedValue: row.estimated_value ? parseFloat(row.estimated_value) : null,
    source: row.source,
    priority: row.priority,
    tags: row.tags || [],
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    clientName: row.client_name || row.client_first_name 
      ? `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim() 
      : row.client_company_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    propertyAddress: row.property_address,
    propertyCity: row.property_city,
    propertyState: row.property_state,
    assignedEmployeeName: row.assigned_employee_name,
    quotesCount: parseInt(row.quotes_count) || 0,
    jobsCount: parseInt(row.jobs_count) || 0,
    invoicesCount: parseInt(row.invoices_count) || 0
  };
};

const emitWorkOrderEvent = async (workOrderId, eventType, payload = {}, actorId = null, actorType = 'system') => {
  try {
    await db.query(`
      INSERT INTO work_order_events (id, work_order_id, event_type, payload, actor_id, actor_type, occurred_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [uuidv4(), workOrderId, eventType, JSON.stringify(payload), actorId, actorType]);
  } catch (err) {
    console.error('Failed to emit work order event:', err.message);
  }
};

const workOrderService = {
  STAGES,
  VALID_STAGES,

  async getAll({ stage, clientId, search, page = 1, pageSize = 50 } = {}) {
    const filters = ['wo.deleted_at IS NULL'];
    const params = [];

    if (stage) {
      params.push(stage);
      filters.push(`wo.stage = $${params.length}`);
    }

    if (clientId) {
      params.push(clientId);
      filters.push(`wo.client_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      filters.push(`(
        wo.title ILIKE $${params.length}
        OR wo.description ILIKE $${params.length}
        OR c.first_name ILIKE $${params.length}
        OR c.last_name ILIKE $${params.length}
        OR c.company_name ILIKE $${params.length}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT 
        wo.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.company_name as client_company_name,
        c.primary_email as client_email,
        c.primary_phone as client_phone,
        p.address_line1 as property_address,
        p.city as property_city,
        p.state as property_state,
        e.name as assigned_employee_name,
        (SELECT COUNT(*) FROM quotes q WHERE q.work_order_id = wo.id AND q.deleted_at IS NULL) as quotes_count,
        (SELECT COUNT(*) FROM jobs j WHERE j.work_order_id = wo.id AND j.deleted_at IS NULL) as jobs_count,
        (SELECT COUNT(*) FROM invoices i WHERE i.deleted_at IS NULL AND (
          i.quote_id IN (SELECT id FROM quotes WHERE work_order_id = wo.id)
          OR i.job_id IN (SELECT id FROM jobs WHERE work_order_id = wo.id)
        )) as invoices_count
      FROM work_orders wo
      LEFT JOIN clients c ON c.id = wo.client_id
      LEFT JOIN properties p ON p.id = wo.property_id
      LEFT JOIN employees e ON e.id = wo.assigned_employee_id
      ${whereClause}
      ORDER BY wo.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const { rows } = await db.query(query, params);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM work_orders wo
      LEFT JOIN clients c ON c.id = wo.client_id
      ${whereClause}
    `;
    const countParams = params.slice(0, -2);
    const { rows: countRows } = await db.query(countQuery, countParams);
    const total = parseInt(countRows[0]?.total) || 0;

    return {
      data: rows.map(transformWorkOrder),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  },

  async getById(id) {
    const { rows } = await db.query(`
      SELECT 
        wo.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.company_name as client_company_name,
        c.primary_email as client_email,
        c.primary_phone as client_phone,
        p.address_line1 as property_address,
        p.city as property_city,
        p.state as property_state,
        e.name as assigned_employee_name,
        (SELECT COUNT(*) FROM quotes q WHERE q.work_order_id = wo.id AND q.deleted_at IS NULL) as quotes_count,
        (SELECT COUNT(*) FROM jobs j WHERE j.work_order_id = wo.id AND j.deleted_at IS NULL) as jobs_count,
        (SELECT COUNT(*) FROM invoices i WHERE i.deleted_at IS NULL AND (
          i.quote_id IN (SELECT id FROM quotes WHERE work_order_id = wo.id)
          OR i.job_id IN (SELECT id FROM jobs WHERE work_order_id = wo.id)
        )) as invoices_count
      FROM work_orders wo
      LEFT JOIN clients c ON c.id = wo.client_id
      LEFT JOIN properties p ON p.id = wo.property_id
      LEFT JOIN employees e ON e.id = wo.assigned_employee_id
      WHERE wo.id = $1 AND wo.deleted_at IS NULL
    `, [id]);

    return transformWorkOrder(rows[0]);
  },

  async create({
    clientId,
    propertyId,
    stage = STAGES.LEAD,
    title,
    description,
    source,
    priority = 'medium',
    assignedEmployeeId,
    soldByEmployeeId,
    estimatedValue,
    tags = [],
    metadata = {}
  }, actorId = null) {
    if (!clientId) {
      throw new Error('Client ID is required to create a work order');
    }

    if (!VALID_STAGES.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}. Must be one of: ${VALID_STAGES.join(', ')}`);
    }

    const id = uuidv4();
    const { rows } = await db.query(`
      INSERT INTO work_orders (
        id, client_id, property_id, stage, title, description, source, 
        priority, assigned_employee_id, sold_by_employee_id, estimated_value,
        tags, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [
      id, clientId, propertyId || null, stage, title || null, description || null,
      source || null, priority, assignedEmployeeId || null, soldByEmployeeId || null,
      estimatedValue || null, JSON.stringify(tags), JSON.stringify(metadata)
    ]);

    await emitWorkOrderEvent(id, 'work_order.created', { stage, source }, actorId);

    return transformWorkOrder(rows[0]);
  },

  async update(id, updates, actorId = null) {
    const workOrder = await this.getById(id);
    if (!workOrder) {
      throw new Error('Work order not found');
    }

    const allowedFields = [
      'client_id', 'property_id', 'title', 'description', 'source',
      'priority', 'assigned_employee_id', 'sold_by_employee_id', 
      'estimated_value', 'tags', 'metadata', 'status_reason'
    ];

    const fieldMapping = {
      clientId: 'client_id',
      propertyId: 'property_id',
      assignedEmployeeId: 'assigned_employee_id',
      soldByEmployeeId: 'sold_by_employee_id',
      estimatedValue: 'estimated_value',
      statusReason: 'status_reason'
    };

    const setClauses = [];
    const params = [id];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'stage') continue;
      
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField)) {
        setClauses.push(`${dbField} = $${paramIndex}`);
        params.push(key === 'tags' || key === 'metadata' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0 && !updates.stage) {
      return workOrder;
    }

    setClauses.push(`updated_at = NOW()`);

    const { rows } = await db.query(`
      UPDATE work_orders
      SET ${setClauses.join(', ')}
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `, params);

    await emitWorkOrderEvent(id, 'work_order.updated', { updates }, actorId);

    return transformWorkOrder(rows[0]);
  },

  async changeStage(id, newStage, statusReason = null, actorId = null) {
    const workOrder = await this.getById(id);
    if (!workOrder) {
      throw new Error('Work order not found');
    }

    if (!VALID_STAGES.includes(newStage)) {
      throw new Error(`Invalid stage: ${newStage}`);
    }

    const oldStage = workOrder.stage;

    const { rows } = await db.query(`
      UPDATE work_orders
      SET stage = $2, status_reason = $3, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [id, newStage, statusReason]);

    await emitWorkOrderEvent(id, 'work_order.stage_changed', {
      from: oldStage,
      to: newStage,
      reason: statusReason
    }, actorId);

    return transformWorkOrder(rows[0]);
  },

  async delete(id, actorId = null) {
    const { rowCount } = await db.query(`
      UPDATE work_orders SET deleted_at = NOW() WHERE id = $1
    `, [id]);

    if (rowCount > 0) {
      await emitWorkOrderEvent(id, 'work_order.deleted', {}, actorId);
    }

    return rowCount > 0;
  },

  async getTimeline(workOrderId) {
    const { rows } = await db.query(`
      SELECT 
        e.*,
        emp.name as actor_name
      FROM work_order_events e
      LEFT JOIN employees emp ON emp.id = e.actor_id
      WHERE e.work_order_id = $1
      ORDER BY e.occurred_at DESC
    `, [workOrderId]);

    return rows.map(row => ({
      id: row.id,
      workOrderId: row.work_order_id,
      occurredAt: row.occurred_at,
      actorId: row.actor_id,
      actorType: row.actor_type,
      actorName: row.actor_name,
      eventType: row.event_type,
      payload: row.payload || {},
      sourceTable: row.source_table,
      sourceRecordId: row.source_record_id
    }));
  },

  async getQuotes(workOrderId) {
    const { rows } = await db.query(`
      SELECT q.*
      FROM quotes q
      WHERE q.work_order_id = $1 AND q.deleted_at IS NULL
      ORDER BY q.created_at DESC
    `, [workOrderId]);

    return rows.map(row => transformRow(row, 'quotes'));
  },

  async getJobs(workOrderId) {
    const { rows } = await db.query(`
      SELECT j.*
      FROM jobs j
      WHERE j.work_order_id = $1 AND j.deleted_at IS NULL
      ORDER BY j.created_at DESC
    `, [workOrderId]);

    return rows.map(row => transformRow(row, 'jobs'));
  },

  async getSummaryByStage() {
    const { rows } = await db.query(`
      SELECT 
        stage,
        COUNT(*) as count,
        COALESCE(SUM(estimated_value), 0) as total_value
      FROM work_orders
      WHERE deleted_at IS NULL
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'lead' THEN 1
          WHEN 'quoting' THEN 2
          WHEN 'scheduled' THEN 3
          WHEN 'in_progress' THEN 4
          WHEN 'complete' THEN 5
          WHEN 'invoiced' THEN 6
          WHEN 'lost' THEN 7
        END
    `);

    return rows.map(row => ({
      stage: row.stage,
      count: parseInt(row.count),
      totalValue: parseFloat(row.total_value) || 0
    }));
  },

  async createLeadWorkOrder({
    clientId,
    propertyId,
    source,
    description,
    priority = 'medium',
    assignedTo,
    soldByEmployeeId,
    estimatedValue,
    expectedCloseDate,
    nextFollowupDate
  }, actorId = null) {
    const client = await db.pool;
    
    try {
      await db.query('BEGIN');

      const workOrderId = uuidv4();
      const { rows: woRows } = await db.query(`
        INSERT INTO work_orders (
          id, client_id, property_id, stage, source, description, priority,
          assigned_employee_id, sold_by_employee_id, estimated_value, created_at, updated_at
        ) VALUES ($1, $2, $3, 'lead', $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `, [
        workOrderId, clientId, propertyId || null, source || null, description || null,
        priority, assignedTo || null, soldByEmployeeId || null, estimatedValue || null
      ]);

      const leadId = uuidv4();
      const { rows: leadRows } = await db.query(`
        INSERT INTO leads (
          id, client_id_new, property_id, work_order_id, source, status, priority,
          description, assigned_to, sold_by_employee_id, estimated_value,
          expected_close_date, next_followup_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'New', $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `, [
        leadId, clientId, propertyId || null, workOrderId, source || null,
        priority, description || null, assignedTo || null, soldByEmployeeId || null,
        estimatedValue || null, expectedCloseDate || null, nextFollowupDate || null
      ]);

      await db.query(`
        UPDATE work_orders SET source_lead_id = $1 WHERE id = $2
      `, [leadId, workOrderId]);

      await db.query('COMMIT');

      await emitWorkOrderEvent(workOrderId, 'work_order.created', {
        stage: 'lead',
        source,
        via: 'createLeadWorkOrder'
      }, actorId);

      return {
        workOrder: transformWorkOrder(woRows[0]),
        lead: transformRow(leadRows[0], 'leads')
      };
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }
};

module.exports = workOrderService;
