const express = require('express');
const db = require('../db');
const { handleError, notFoundError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { isAuthenticated } = require('../replitAuth');

const router = express.Router();

router.get('/automation-logs/stats', isAuthenticated, async (req, res) => {
  try {
    const { workflow_id, days = 30 } = req.query;
    const daysInt = parseInt(days, 10) || 30;
    
    const params = [];
    let workflowFilter = '';
    
    if (workflow_id) {
      params.push(workflow_id);
      workflowFilter = `AND workflow_id = $${params.length}`;
    }
    
    const overallStatsQuery = `
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
        AVG(duration_ms) as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        MIN(duration_ms) as min_duration_ms
      FROM automation_logs
      WHERE created_at > NOW() - INTERVAL '${daysInt} days'
      ${workflowFilter}
    `;
    
    const { rows: [overallStats] } = await db.query(overallStatsQuery, params);
    
    const dailyStatsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM automation_logs
      WHERE created_at > NOW() - INTERVAL '${daysInt} days'
      ${workflowFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const { rows: dailyStats } = await db.query(dailyStatsQuery, params);
    
    const actionStatsQuery = `
      SELECT 
        action_type,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(duration_ms) as avg_duration_ms
      FROM automation_logs
      WHERE action_type IS NOT NULL 
        AND created_at > NOW() - INTERVAL '${daysInt} days'
        ${workflowFilter}
      GROUP BY action_type
      ORDER BY total DESC
    `;
    
    const { rows: actionStats } = await db.query(actionStatsQuery, params);
    
    const topWorkflowsQuery = `
      SELECT 
        w.id,
        w.name,
        COUNT(l.id) as execution_count,
        COUNT(CASE WHEN l.status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN l.status = 'failed' THEN 1 END) as failed
      FROM automation_workflows w
      LEFT JOIN automation_logs l ON l.workflow_id = w.id 
        AND l.created_at > NOW() - INTERVAL '${daysInt} days'
      WHERE w.deleted_at IS NULL AND w.is_template = false
      GROUP BY w.id, w.name
      ORDER BY execution_count DESC
      LIMIT 10
    `;
    
    const { rows: topWorkflows } = await db.query(topWorkflowsQuery);
    
    const successRate = overallStats.total_executions > 0
      ? ((overallStats.successful / overallStats.total_executions) * 100).toFixed(2)
      : 0;
    
    res.json({
      success: true,
      data: {
        period_days: daysInt,
        overall: {
          total_executions: parseInt(overallStats.total_executions, 10) || 0,
          successful: parseInt(overallStats.successful, 10) || 0,
          failed: parseInt(overallStats.failed, 10) || 0,
          skipped: parseInt(overallStats.skipped, 10) || 0,
          success_rate: parseFloat(successRate),
          avg_duration_ms: parseFloat(overallStats.avg_duration_ms) || 0,
          max_duration_ms: parseInt(overallStats.max_duration_ms, 10) || 0,
          min_duration_ms: parseInt(overallStats.min_duration_ms, 10) || 0
        },
        daily: dailyStats,
        by_action_type: actionStats,
        top_workflows: topWorkflows
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/automation-logs/:executionId', isAuthenticated, async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const { rows: logs } = await db.query(
      `SELECT l.*, w.name as workflow_name
       FROM automation_logs l
       LEFT JOIN automation_workflows w ON w.id = l.workflow_id
       WHERE l.execution_id = $1
       ORDER BY l.created_at ASC`,
      [executionId]
    );
    
    if (logs.length === 0) {
      throw notFoundError('Execution logs');
    }
    
    const execution = {
      execution_id: executionId,
      workflow_id: logs[0].workflow_id,
      workflow_name: logs[0].workflow_name,
      trigger_type: logs[0].trigger_type,
      entity_type: logs[0].triggered_by_entity_type,
      entity_id: logs[0].triggered_by_entity_id,
      started_at: logs[0].started_at,
      completed_at: logs[logs.length - 1].completed_at,
      status: logs.some(l => l.status === 'failed') ? 'failed' : 
              logs.every(l => l.status === 'completed' || l.status === 'skipped') ? 'completed' : 'running',
      logs: logs.map(log => ({
        id: log.id,
        action_type: log.action_type,
        action_id: log.action_id,
        status: log.status,
        input_data: log.input_data,
        output_data: log.output_data,
        error_message: log.error_message,
        started_at: log.started_at,
        completed_at: log.completed_at,
        duration_ms: log.duration_ms
      }))
    };
    
    res.json({ success: true, data: execution });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/automation-logs', isAuthenticated, async (req, res) => {
  try {
    const { 
      workflow_id, 
      status, 
      action_type,
      entity_type,
      entity_id,
      start_date, 
      end_date 
    } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);
    
    const filters = [];
    const params = [];
    
    if (workflow_id) {
      params.push(workflow_id);
      filters.push(`l.workflow_id = $${params.length}`);
    }
    
    if (status) {
      params.push(status);
      filters.push(`l.status = $${params.length}`);
    }
    
    if (action_type) {
      params.push(action_type);
      filters.push(`l.action_type = $${params.length}`);
    }
    
    if (entity_type) {
      params.push(entity_type);
      filters.push(`l.triggered_by_entity_type = $${params.length}`);
    }
    
    if (entity_id) {
      params.push(entity_id);
      filters.push(`l.triggered_by_entity_id = $${params.length}`);
    }
    
    if (start_date) {
      params.push(start_date);
      filters.push(`l.created_at >= $${params.length}::timestamp`);
    }
    
    if (end_date) {
      params.push(end_date);
      filters.push(`l.created_at <= $${params.length}::timestamp`);
    }
    
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    
    const baseQuery = `
      FROM automation_logs l
      LEFT JOIN automation_workflows w ON w.id = l.workflow_id
      ${whereClause}
    `;
    
    const selectQuery = `
      SELECT l.*, w.name as workflow_name
      ${baseQuery}
      ORDER BY l.created_at DESC
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

module.exports = router;
