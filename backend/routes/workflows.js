const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { handleError, notFoundError, badRequestError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { isAuthenticated } = require('../replitAuth');
const { executeWorkflow } = require('../services/automation');

const router = express.Router();

router.get('/workflows/templates', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT w.*, 
        (SELECT COUNT(*) FROM automation_triggers WHERE workflow_id = w.id) as trigger_count,
        (SELECT COUNT(*) FROM automation_actions WHERE workflow_id = w.id) as action_count
      FROM automation_workflows w
      WHERE w.is_template = true AND w.deleted_at IS NULL
    `;
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND w.template_category = $${params.length}`;
    }
    
    query += ` ORDER BY w.template_category, w.name`;
    
    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/workflows/from-template/:templateId', isAuthenticated, async (req, res) => {
  const client = await db.getClient();
  try {
    const { templateId } = req.params;
    const { name, description } = req.body;
    
    const { rows: templates } = await client.query(
      `SELECT * FROM automation_workflows WHERE id = $1 AND is_template = true AND deleted_at IS NULL`,
      [templateId]
    );
    
    if (templates.length === 0) {
      throw notFoundError('Workflow template');
    }
    
    const template = templates[0];
    const newWorkflowId = uuidv4();
    
    await client.query('BEGIN');
    
    await client.query(`
      INSERT INTO automation_workflows (
        id, name, description, is_active, is_template, template_category,
        max_executions_per_day, cooldown_minutes, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `, [
      newWorkflowId,
      name || template.name,
      description || template.description,
      true,
      false,
      null,
      template.max_executions_per_day,
      template.cooldown_minutes,
      req.user?.id || req.user?.claims?.sub || null
    ]);
    
    const { rows: triggers } = await client.query(
      `SELECT * FROM automation_triggers WHERE workflow_id = $1 ORDER BY trigger_order`,
      [templateId]
    );
    
    for (const trigger of triggers) {
      await client.query(`
        INSERT INTO automation_triggers (
          id, workflow_id, trigger_type, config, conditions, trigger_order, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        uuidv4(),
        newWorkflowId,
        trigger.trigger_type,
        JSON.stringify(trigger.config || {}),
        JSON.stringify(trigger.conditions || []),
        trigger.trigger_order
      ]);
    }
    
    const { rows: actions } = await client.query(
      `SELECT * FROM automation_actions WHERE workflow_id = $1 ORDER BY action_order`,
      [templateId]
    );
    
    for (const action of actions) {
      await client.query(`
        INSERT INTO automation_actions (
          id, workflow_id, action_type, config, delay_minutes, action_order, continue_on_error, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        uuidv4(),
        newWorkflowId,
        action.action_type,
        JSON.stringify(action.config || {}),
        action.delay_minutes,
        action.action_order,
        action.continue_on_error
      ]);
    }
    
    await client.query('COMMIT');
    
    const { rows: [newWorkflow] } = await db.query(
      `SELECT * FROM automation_workflows WHERE id = $1`,
      [newWorkflowId]
    );
    
    res.status(201).json({ success: true, data: newWorkflow });
  } catch (err) {
    await client.query('ROLLBACK');
    handleError(res, err);
  } finally {
    client.release();
  }
});

router.get('/workflows', isAuthenticated, async (req, res) => {
  try {
    const { status, search, include_templates } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);
    
    const filters = ['w.deleted_at IS NULL'];
    const params = [];
    
    if (include_templates !== 'true') {
      filters.push('w.is_template = false');
    }
    
    if (status === 'active') {
      filters.push('w.is_active = true');
    } else if (status === 'inactive') {
      filters.push('w.is_active = false');
    }
    
    if (search) {
      params.push(`%${search}%`);
      filters.push(`(w.name ILIKE $${params.length} OR w.description ILIKE $${params.length})`);
    }
    
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    
    const baseQuery = `
      FROM automation_workflows w
      ${whereClause}
    `;
    
    const selectQuery = `
      SELECT w.*,
        (SELECT COUNT(*) FROM automation_triggers WHERE workflow_id = w.id) as trigger_count,
        (SELECT COUNT(*) FROM automation_actions WHERE workflow_id = w.id) as action_count,
        (SELECT COUNT(*) FROM automation_logs WHERE workflow_id = w.id AND created_at > NOW() - INTERVAL '24 hours') as executions_24h
      ${baseQuery}
      ORDER BY w.updated_at DESC
      ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
    `;
    
    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);
    
    if (!usePagination) {
      return res.json({ success: true, data: rows });
    }
    
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0]?.total, 10) || 0;
    
    res.json({
      success: true,
      data: rows,
      pagination: buildPaginationMeta(total, page, pageSize)
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/workflows/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: workflows } = await db.query(
      `SELECT * FROM automation_workflows WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (workflows.length === 0) {
      throw notFoundError('Workflow');
    }
    
    const workflow = workflows[0];
    
    const { rows: triggers } = await db.query(
      `SELECT * FROM automation_triggers WHERE workflow_id = $1 ORDER BY trigger_order`,
      [id]
    );
    
    const { rows: actions } = await db.query(
      `SELECT * FROM automation_actions WHERE workflow_id = $1 ORDER BY action_order`,
      [id]
    );
    
    const { rows: recentLogs } = await db.query(
      `SELECT * FROM automation_logs 
       WHERE workflow_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...workflow,
        triggers,
        actions,
        recentLogs
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/workflows', isAuthenticated, async (req, res) => {
  const client = await db.getClient();
  try {
    const {
      name,
      description,
      is_active = true,
      max_executions_per_day = 100,
      cooldown_minutes = 0,
      triggers = [],
      actions = []
    } = req.body;
    
    if (!name) {
      throw badRequestError('Workflow name is required');
    }
    
    const workflowId = uuidv4();
    
    await client.query('BEGIN');
    
    await client.query(`
      INSERT INTO automation_workflows (
        id, name, description, is_active, is_template,
        max_executions_per_day, cooldown_minutes, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [
      workflowId,
      name,
      description || null,
      is_active,
      false,
      max_executions_per_day,
      cooldown_minutes,
      req.user?.id || req.user?.claims?.sub || null
    ]);
    
    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];
      await client.query(`
        INSERT INTO automation_triggers (
          id, workflow_id, trigger_type, config, conditions, trigger_order, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        uuidv4(),
        workflowId,
        trigger.trigger_type,
        JSON.stringify(trigger.config || {}),
        JSON.stringify(trigger.conditions || []),
        trigger.trigger_order ?? i
      ]);
    }
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      await client.query(`
        INSERT INTO automation_actions (
          id, workflow_id, action_type, config, delay_minutes, action_order, continue_on_error, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        uuidv4(),
        workflowId,
        action.action_type,
        JSON.stringify(action.config || {}),
        action.delay_minutes ?? 0,
        action.action_order ?? i,
        action.continue_on_error ?? true
      ]);
    }
    
    await client.query('COMMIT');
    
    const { rows: [newWorkflow] } = await db.query(
      `SELECT * FROM automation_workflows WHERE id = $1`,
      [workflowId]
    );
    
    res.status(201).json({ success: true, data: newWorkflow });
  } catch (err) {
    await client.query('ROLLBACK');
    handleError(res, err);
  } finally {
    client.release();
  }
});

router.put('/workflows/:id', isAuthenticated, async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const {
      name,
      description,
      is_active,
      max_executions_per_day,
      cooldown_minutes,
      triggers,
      actions
    } = req.body;
    
    const { rows: existing } = await client.query(
      `SELECT * FROM automation_workflows WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (existing.length === 0) {
      throw notFoundError('Workflow');
    }
    
    await client.query('BEGIN');
    
    await client.query(`
      UPDATE automation_workflows SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        max_executions_per_day = COALESCE($4, max_executions_per_day),
        cooldown_minutes = COALESCE($5, cooldown_minutes),
        updated_at = NOW()
      WHERE id = $6
    `, [name, description, is_active, max_executions_per_day, cooldown_minutes, id]);
    
    if (triggers !== undefined) {
      await client.query(`DELETE FROM automation_triggers WHERE workflow_id = $1`, [id]);
      
      for (let i = 0; i < triggers.length; i++) {
        const trigger = triggers[i];
        await client.query(`
          INSERT INTO automation_triggers (
            id, workflow_id, trigger_type, config, conditions, trigger_order, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [
          trigger.id || uuidv4(),
          id,
          trigger.trigger_type,
          JSON.stringify(trigger.config || {}),
          JSON.stringify(trigger.conditions || []),
          trigger.trigger_order ?? i
        ]);
      }
    }
    
    if (actions !== undefined) {
      await client.query(`DELETE FROM automation_actions WHERE workflow_id = $1`, [id]);
      
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        await client.query(`
          INSERT INTO automation_actions (
            id, workflow_id, action_type, config, delay_minutes, action_order, continue_on_error, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          action.id || uuidv4(),
          id,
          action.action_type,
          JSON.stringify(action.config || {}),
          action.delay_minutes ?? 0,
          action.action_order ?? i,
          action.continue_on_error ?? true
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    const { rows: [updatedWorkflow] } = await db.query(
      `SELECT * FROM automation_workflows WHERE id = $1`,
      [id]
    );
    
    res.json({ success: true, data: updatedWorkflow });
  } catch (err) {
    await client.query('ROLLBACK');
    handleError(res, err);
  } finally {
    client.release();
  }
});

router.delete('/workflows/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: existing } = await db.query(
      `SELECT * FROM automation_workflows WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (existing.length === 0) {
      throw notFoundError('Workflow');
    }
    
    await db.query(
      `UPDATE automation_workflows SET deleted_at = NOW(), is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    
    res.json({ success: true, message: 'Workflow deleted successfully' });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/workflows/:id/toggle', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: existing } = await db.query(
      `SELECT * FROM automation_workflows WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (existing.length === 0) {
      throw notFoundError('Workflow');
    }
    
    const newStatus = !existing[0].is_active;
    
    await db.query(
      `UPDATE automation_workflows SET is_active = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, id]
    );
    
    res.json({ 
      success: true, 
      data: { 
        id, 
        is_active: newStatus 
      },
      message: `Workflow ${newStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/workflows/:id/execute', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { entityType, entityId, entityData } = req.body;
    
    const { rows: existing } = await db.query(
      `SELECT * FROM automation_workflows WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (existing.length === 0) {
      throw notFoundError('Workflow');
    }
    
    const triggerContext = {
      triggerType: 'manual',
      entityType: entityType || null,
      entityId: entityId || null,
      entityData: entityData || {},
      triggeredBy: req.user?.id || req.user?.claims?.sub || 'system'
    };
    
    const result = await executeWorkflow(id, triggerContext);
    
    res.json({ 
      success: true, 
      data: result,
      message: 'Workflow execution started'
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
