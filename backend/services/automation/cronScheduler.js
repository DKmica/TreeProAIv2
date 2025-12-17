const db = require('../../db');
const { randomUUID } = require('crypto');

const uuidv4 = () => randomUUID();

const POLL_INTERVAL_MS = 60 * 1000;

let pollInterval = null;
let isRunning = false;
let workflowEngine = null;

const parseCronExpression = (cronExpression) => {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4]
  };
};

const calculateNextRunFromCron = (cronExpression, timezone = 'UTC') => {
  try {
    const cron = parseCronExpression(cronExpression);
    const now = new Date();
    
    let nextRun = new Date(now);
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);
    nextRun.setMinutes(nextRun.getMinutes() + 1);

    const maxIterations = 60 * 24 * 32;
    
    for (let i = 0; i < maxIterations; i++) {
      if (matchesCron(nextRun, cron)) {
        return nextRun;
      }
      nextRun.setMinutes(nextRun.getMinutes() + 1);
    }

    console.warn(`[CronScheduler] Could not calculate next run for cron: ${cronExpression}`);
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
  } catch (error) {
    console.error(`[CronScheduler] Error parsing cron expression:`, error.message);
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
};

const matchesCron = (date, cron) => {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  return (
    matchesCronField(minute, cron.minute, 0, 59) &&
    matchesCronField(hour, cron.hour, 0, 23) &&
    matchesCronField(dayOfMonth, cron.dayOfMonth, 1, 31) &&
    matchesCronField(month, cron.month, 1, 12) &&
    matchesCronField(dayOfWeek, cron.dayOfWeek, 0, 6)
  );
};

const matchesCronField = (value, field, min, max) => {
  if (field === '*') return true;

  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const stepNum = parseInt(step);
    if (range === '*') {
      return value % stepNum === 0;
    }
  }

  if (field.includes(',')) {
    const values = field.split(',').map(v => parseInt(v.trim()));
    return values.includes(value);
  }

  if (field.includes('-')) {
    const [start, end] = field.split('-').map(v => parseInt(v.trim()));
    return value >= start && value <= end;
  }

  return parseInt(field) === value;
};

const checkWorkflowCooldown = async (workflowId) => {
  const { rows: workflows } = await db.query(
    `SELECT cooldown_minutes, max_executions_per_day 
     FROM automation_workflows 
     WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
    [workflowId]
  );

  if (workflows.length === 0) {
    return { allowed: false, reason: 'Workflow not found or inactive' };
  }

  const workflow = workflows[0];

  if (workflow.cooldown_minutes > 0) {
    const cooldownCheck = await db.query(
      `SELECT MAX(started_at) as last_execution
       FROM automation_logs
       WHERE workflow_id = $1 AND status IN ('completed', 'running')`,
      [workflowId]
    );

    if (cooldownCheck.rows[0]?.last_execution) {
      const lastExecution = new Date(cooldownCheck.rows[0].last_execution);
      const cooldownEnd = new Date(lastExecution.getTime() + workflow.cooldown_minutes * 60 * 1000);
      
      if (cooldownEnd > new Date()) {
        return { 
          allowed: false, 
          reason: `Cooldown active until ${cooldownEnd.toISOString()}` 
        };
      }
    }
  }

  if (workflow.max_executions_per_day > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) as execution_count
       FROM automation_logs
       WHERE workflow_id = $1 
         AND started_at >= $2
         AND status = 'completed'`,
      [workflowId, today]
    );

    const executionCount = parseInt(countRows[0]?.execution_count || 0);
    
    if (executionCount >= workflow.max_executions_per_day) {
      return { 
        allowed: false, 
        reason: `Max executions per day reached (${executionCount}/${workflow.max_executions_per_day})` 
      };
    }
  }

  return { allowed: true };
};

const pollScheduledJobs = async () => {
  if (!workflowEngine) {
    console.warn('[CronScheduler] Workflow engine not set, skipping poll');
    return;
  }

  try {
    const { rows: dueJobs } = await db.query(`
      SELECT sj.*, w.name as workflow_name
      FROM automation_scheduled_jobs sj
      JOIN automation_workflows w ON sj.workflow_id = w.id
      WHERE sj.is_active = true 
        AND sj.next_run_at <= NOW()
        AND w.is_active = true
        AND w.deleted_at IS NULL
      ORDER BY sj.next_run_at ASC
      LIMIT 10
    `);

    if (dueJobs.length === 0) {
      return;
    }

    console.log(`[CronScheduler] Found ${dueJobs.length} due scheduled job(s)`);

    for (const job of dueJobs) {
      await executeScheduledJob(job);
    }
    
  } catch (error) {
    console.error('[CronScheduler] Error polling scheduled jobs:', error.message);
  }
};

const executeScheduledJob = async (scheduledJob) => {
  const { id, workflow_id, trigger_id, cron_expression, timezone, workflow_name } = scheduledJob;

  try {
    console.log(`[CronScheduler] Executing scheduled job: ${workflow_name} (${id})`);

    const cooldownCheck = await checkWorkflowCooldown(workflow_id);
    if (!cooldownCheck.allowed) {
      console.log(`[CronScheduler] Skipping job ${id}: ${cooldownCheck.reason}`);
      
      if (cron_expression) {
        const nextRun = calculateNextRunFromCron(cron_expression, timezone);
        await db.query(
          `UPDATE automation_scheduled_jobs 
           SET next_run_at = $1, updated_at = NOW() 
           WHERE id = $2`,
          [nextRun, id]
        );
      }
      return;
    }

    const triggerContext = {
      scheduledJobId: id,
      triggerId: trigger_id,
      scheduledAt: scheduledJob.next_run_at,
      executedAt: new Date().toISOString(),
      isScheduledExecution: true
    };

    const result = await workflowEngine.executeWorkflow(workflow_id, triggerContext);

    await db.query(
      `UPDATE automation_scheduled_jobs 
       SET last_run_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    if (cron_expression) {
      const nextRun = calculateNextRunFromCron(cron_expression, timezone);
      await db.query(
        `UPDATE automation_scheduled_jobs 
         SET next_run_at = $1, updated_at = NOW() 
         WHERE id = $2`,
        [nextRun, id]
      );
      console.log(`[CronScheduler] Next run for ${workflow_name}: ${nextRun.toISOString()}`);
    } else {
      await db.query(
        `UPDATE automation_scheduled_jobs SET is_active = false, updated_at = NOW() WHERE id = $1`,
        [id]
      );
      console.log(`[CronScheduler] One-time job ${id} deactivated`);
    }

    console.log(`[CronScheduler] Completed scheduled job: ${workflow_name}`, result);
    
  } catch (error) {
    console.error(`[CronScheduler] Error executing scheduled job ${id}:`, error.message);

    await db.query(`
      INSERT INTO automation_logs (
        id, workflow_id, trigger_id, execution_id,
        trigger_type, status, error_message,
        started_at, completed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
    `, [
      uuidv4(),
      workflow_id,
      trigger_id,
      uuidv4(),
      'schedule',
      'failed',
      error.message
    ]);
  }
};

const scheduleDelayedAction = async (workflowId, triggerId, delayMinutes, actionContext) => {
  const nextRunAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  const { rows } = await db.query(`
    INSERT INTO automation_scheduled_jobs (
      id, workflow_id, trigger_id, next_run_at, 
      cron_expression, timezone, is_active,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, NULL, 'UTC', true, NOW(), NOW())
    RETURNING id
  `, [
    uuidv4(),
    workflowId,
    triggerId,
    nextRunAt
  ]);

  console.log(`[CronScheduler] Scheduled delayed action for ${nextRunAt.toISOString()}`);
  
  return rows[0]?.id;
};

const start = (engine) => {
  if (isRunning) {
    console.warn('[CronScheduler] Already running');
    return;
  }

  workflowEngine = engine;
  isRunning = true;

  pollScheduledJobs();

  pollInterval = setInterval(pollScheduledJobs, POLL_INTERVAL_MS);
  
  console.log(`[CronScheduler] Started with ${POLL_INTERVAL_MS / 1000}s poll interval`);
};

const stop = () => {
  if (!isRunning) {
    return;
  }

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  isRunning = false;
  console.log('[CronScheduler] Stopped');
};

const getStatus = () => {
  return {
    isRunning,
    pollIntervalMs: POLL_INTERVAL_MS,
    hasWorkflowEngine: !!workflowEngine
  };
};

module.exports = {
  start,
  stop,
  pollScheduledJobs,
  scheduleDelayedAction,
  calculateNextRunFromCron,
  checkWorkflowCooldown,
  getStatus,
  POLL_INTERVAL_MS
};
