const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./emailService');
const smsService = require('./smsService');

const ACTION_HANDLERS = {
  send_email: async (config, context) => {
    return await emailService.sendEmail(config, context);
  },

  send_sms: async (config, context) => {
    return await smsService.sendSms(config, context);
  },

  create_task: async (config, context) => {
    const { title, description, due_in_days, assign_to, priority } = config;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (due_in_days || 3));
    
    console.log(`[Action:create_task] Would create task:`);
    console.log(`  Title: ${title}`);
    console.log(`  Due: ${dueDate.toISOString()}`);
    console.log(`  Assigned to: ${assign_to || 'Unassigned'}`);
    console.log(`  Priority: ${priority || 'normal'}`);
    
    return {
      success: true,
      action: 'create_task',
      title,
      dueDate: dueDate.toISOString(),
      assignedTo: assign_to,
      note: 'Task creation stub - integrate with task management'
    };
  },

  create_reminder: async (config, context) => {
    const { title, remind_in_days, remind_in_hours, remind_at } = config;
    
    let reminderTime;
    if (remind_at) {
      reminderTime = new Date(remind_at);
    } else if (remind_in_hours) {
      reminderTime = new Date(Date.now() + remind_in_hours * 60 * 60 * 1000);
    } else {
      reminderTime = new Date(Date.now() + (remind_in_days || 1) * 24 * 60 * 60 * 1000);
    }
    
    console.log(`[Action:create_reminder] Would create reminder:`);
    console.log(`  Title: ${title}`);
    console.log(`  Remind at: ${reminderTime.toISOString()}`);
    
    return {
      success: true,
      action: 'create_reminder',
      title,
      reminderTime: reminderTime.toISOString(),
      note: 'Reminder creation stub - integrate with reminder service'
    };
  },

  update_lead_stage: async (config, context) => {
    const { new_stage } = config;
    const leadId = context.entityId || context.entityData?.id;
    
    if (!leadId) {
      throw new Error('Lead ID not found in context');
    }
    
    console.log(`[Action:update_lead_stage] Updating lead ${leadId} to stage: ${new_stage}`);
    
    await db.query(
      `UPDATE leads SET stage = $1, updated_at = NOW() WHERE id = $2`,
      [new_stage, leadId]
    );
    
    return {
      success: true,
      action: 'update_lead_stage',
      leadId,
      newStage: new_stage
    };
  },

  update_job_status: async (config, context) => {
    const { new_status } = config;
    const jobId = context.entityId || context.entityData?.id;
    
    if (!jobId) {
      throw new Error('Job ID not found in context');
    }
    
    console.log(`[Action:update_job_status] Updating job ${jobId} to status: ${new_status}`);
    
    await db.query(
      `UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2`,
      [new_status, jobId]
    );
    
    return {
      success: true,
      action: 'update_job_status',
      jobId,
      newStatus: new_status
    };
  },

  create_invoice: async (config, context) => {
    const { amount, due_in_days, line_items } = config;
    const jobId = context.entityData?.id || context.entityData?.job_id;
    const clientId = context.entityData?.client_id;
    
    console.log(`[Action:create_invoice] Would create invoice:`);
    console.log(`  Job ID: ${jobId}`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  Amount: ${amount || 'From line items'}`);
    console.log(`  Due in days: ${due_in_days || 30}`);
    
    return {
      success: true,
      action: 'create_invoice',
      jobId,
      clientId,
      amount,
      note: 'Invoice creation stub - use existing invoice creation logic'
    };
  }
};

const evaluateCondition = (condition, entityData) => {
  const { field, operator, value } = condition;
  
  const fieldValue = getNestedValue(entityData, field);
  
  switch (operator) {
    case '==':
    case 'equals':
      return fieldValue == value;
    case '===':
    case 'strict_equals':
      return fieldValue === value;
    case '!=':
    case 'not_equals':
      return fieldValue != value;
    case '>':
    case 'greater_than':
      return parseFloat(fieldValue) > parseFloat(value);
    case '>=':
    case 'greater_than_or_equals':
      return parseFloat(fieldValue) >= parseFloat(value);
    case '<':
    case 'less_than':
      return parseFloat(fieldValue) < parseFloat(value);
    case '<=':
    case 'less_than_or_equals':
      return parseFloat(fieldValue) <= parseFloat(value);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'starts_with':
      return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
    case 'ends_with':
      return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
    case 'is_empty':
      return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
    case 'is_not_empty':
      return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
    case 'in':
      const valueList = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
      return valueList.includes(String(fieldValue));
    case 'not_in':
      const excludeList = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
      return !excludeList.includes(String(fieldValue));
    default:
      console.warn(`[WorkflowEngine] Unknown operator: ${operator}`);
      return false;
  }
};

const getNestedValue = (obj, path) => {
  if (!path) return obj;
  
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }
  
  return value;
};

const evaluateAllConditions = (conditions, entityData) => {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return true;
  }
  
  return conditions.every(condition => evaluateCondition(condition, entityData));
};

const logExecution = async (logData) => {
  const {
    workflowId,
    triggerId,
    actionId,
    executionId,
    triggerType,
    entityType,
    entityId,
    actionType,
    status,
    inputData,
    outputData,
    errorMessage,
    startedAt,
    completedAt
  } = logData;

  const durationMs = startedAt && completedAt 
    ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
    : null;

  await db.query(`
    INSERT INTO automation_logs (
      id, workflow_id, trigger_id, action_id, execution_id,
      trigger_type, triggered_by_entity_type, triggered_by_entity_id,
      action_type, status, input_data, output_data, error_message,
      started_at, completed_at, duration_ms, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
  `, [
    uuidv4(),
    workflowId,
    triggerId || null,
    actionId || null,
    executionId,
    triggerType || null,
    entityType || null,
    entityId || null,
    actionType || null,
    status,
    inputData ? JSON.stringify(inputData) : null,
    outputData ? JSON.stringify(outputData) : null,
    errorMessage || null,
    startedAt || new Date(),
    completedAt || null,
    durationMs
  ]);
};

const executeWorkflow = async (workflowId, triggerContext) => {
  const executionId = uuidv4();
  const startedAt = new Date();
  
  console.log(`[WorkflowEngine] Starting workflow execution: ${workflowId}`);
  console.log(`  Execution ID: ${executionId}`);

  try {
    const { rows: workflows } = await db.query(
      `SELECT * FROM automation_workflows 
       WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
      [workflowId]
    );

    if (workflows.length === 0) {
      throw new Error(`Workflow not found or inactive: ${workflowId}`);
    }

    const workflow = workflows[0];
    console.log(`  Workflow name: ${workflow.name}`);

    const { rows: triggers } = await db.query(
      `SELECT * FROM automation_triggers 
       WHERE workflow_id = $1 
       ORDER BY trigger_order ASC`,
      [workflowId]
    );

    const { rows: actions } = await db.query(
      `SELECT * FROM automation_actions 
       WHERE workflow_id = $1 
       ORDER BY action_order ASC`,
      [workflowId]
    );

    console.log(`  Found ${triggers.length} trigger(s) and ${actions.length} action(s)`);

    let triggerMatched = false;
    let matchedTrigger = null;

    for (const trigger of triggers) {
      const conditions = trigger.conditions || [];
      
      if (triggerContext.entityData && conditions.length > 0) {
        if (evaluateAllConditions(conditions, triggerContext.entityData)) {
          triggerMatched = true;
          matchedTrigger = trigger;
          console.log(`  Trigger matched: ${trigger.trigger_type}`);
          break;
        }
      } else if (conditions.length === 0) {
        triggerMatched = true;
        matchedTrigger = trigger;
        console.log(`  Trigger matched (no conditions): ${trigger.trigger_type}`);
        break;
      }
    }

    if (triggers.length > 0 && !triggerMatched) {
      console.log(`  No trigger conditions matched, skipping workflow`);
      
      await logExecution({
        workflowId,
        executionId,
        status: 'skipped',
        inputData: triggerContext,
        startedAt,
        completedAt: new Date()
      });

      return {
        success: true,
        skipped: true,
        reason: 'No trigger conditions matched',
        executionId
      };
    }

    await logExecution({
      workflowId,
      triggerId: matchedTrigger?.id,
      executionId,
      triggerType: matchedTrigger?.trigger_type || triggerContext.eventType,
      entityType: triggerContext.entityType,
      entityId: triggerContext.entityId,
      status: 'running',
      inputData: triggerContext,
      startedAt
    });

    const results = [];

    for (const action of actions) {
      const actionStartedAt = new Date();
      
      try {
        if (action.delay_minutes > 0) {
          console.log(`  Scheduling delayed action: ${action.action_type} (delay: ${action.delay_minutes} min)`);
          
          const cronScheduler = require('./cronScheduler');
          await cronScheduler.scheduleDelayedAction(
            workflowId,
            matchedTrigger?.id || triggers[0]?.id,
            action.delay_minutes,
            { actionId: action.id, context: triggerContext }
          );
          
          results.push({
            actionId: action.id,
            actionType: action.action_type,
            status: 'scheduled',
            scheduledFor: new Date(Date.now() + action.delay_minutes * 60 * 1000).toISOString()
          });
          
          continue;
        }

        const handler = ACTION_HANDLERS[action.action_type];
        
        if (!handler) {
          console.warn(`  Unknown action type: ${action.action_type}`);
          results.push({
            actionId: action.id,
            actionType: action.action_type,
            status: 'skipped',
            reason: 'Unknown action type'
          });
          continue;
        }

        console.log(`  Executing action: ${action.action_type}`);
        
        const actionConfig = action.config || {};
        const result = await handler(actionConfig, triggerContext);
        
        const actionCompletedAt = new Date();

        await logExecution({
          workflowId,
          triggerId: matchedTrigger?.id,
          actionId: action.id,
          executionId,
          actionType: action.action_type,
          status: 'completed',
          inputData: { config: actionConfig, context: triggerContext },
          outputData: result,
          startedAt: actionStartedAt,
          completedAt: actionCompletedAt
        });

        results.push({
          actionId: action.id,
          actionType: action.action_type,
          status: 'completed',
          result
        });
        
      } catch (actionError) {
        console.error(`  Action error (${action.action_type}):`, actionError.message);

        await logExecution({
          workflowId,
          triggerId: matchedTrigger?.id,
          actionId: action.id,
          executionId,
          actionType: action.action_type,
          status: 'failed',
          inputData: { config: action.config, context: triggerContext },
          errorMessage: actionError.message,
          startedAt: actionStartedAt,
          completedAt: new Date()
        });

        results.push({
          actionId: action.id,
          actionType: action.action_type,
          status: 'failed',
          error: actionError.message
        });

        if (!action.continue_on_error) {
          throw actionError;
        }
      }
    }

    const completedAt = new Date();

    await logExecution({
      workflowId,
      triggerId: matchedTrigger?.id,
      executionId,
      status: 'completed',
      outputData: { results },
      startedAt,
      completedAt
    });

    console.log(`[WorkflowEngine] Workflow completed: ${workflow.name}`);

    return {
      success: true,
      executionId,
      workflowId,
      workflowName: workflow.name,
      results,
      duration: completedAt.getTime() - startedAt.getTime()
    };

  } catch (error) {
    console.error(`[WorkflowEngine] Workflow execution failed:`, error.message);

    await logExecution({
      workflowId,
      executionId,
      status: 'failed',
      inputData: triggerContext,
      errorMessage: error.message,
      startedAt,
      completedAt: new Date()
    });

    return {
      success: false,
      executionId,
      workflowId,
      error: error.message
    };
  }
};

const getWorkflowsByTriggerType = async (triggerType) => {
  const { rows } = await db.query(`
    SELECT DISTINCT w.* 
    FROM automation_workflows w
    JOIN automation_triggers t ON t.workflow_id = w.id
    WHERE t.trigger_type = $1
      AND w.is_active = true
      AND w.deleted_at IS NULL
    ORDER BY w.name
  `, [triggerType]);

  return rows;
};

const executeWorkflowsForEvent = async (eventType, entityData) => {
  const workflows = await getWorkflowsByTriggerType(eventType);
  
  if (workflows.length === 0) {
    console.log(`[WorkflowEngine] No active workflows for event: ${eventType}`);
    return [];
  }

  console.log(`[WorkflowEngine] Found ${workflows.length} workflow(s) for event: ${eventType}`);

  const results = [];
  const triggerContext = {
    eventType,
    entityType: getEntityTypeFromEvent(eventType),
    entityId: entityData?.id,
    entityData,
    triggeredAt: new Date().toISOString()
  };

  for (const workflow of workflows) {
    const result = await executeWorkflow(workflow.id, triggerContext);
    results.push(result);
  }

  return results;
};

const getEntityTypeFromEvent = (eventType) => {
  if (eventType.startsWith('quote_')) return 'quote';
  if (eventType.startsWith('job_')) return 'job';
  if (eventType.startsWith('invoice_')) return 'invoice';
  if (eventType.startsWith('lead_')) return 'lead';
  return 'unknown';
};

module.exports = {
  executeWorkflow,
  executeWorkflowsForEvent,
  getWorkflowsByTriggerType,
  evaluateCondition,
  evaluateAllConditions,
  ACTION_HANDLERS
};
