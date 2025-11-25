const eventEmitter = require('./eventEmitter');
const cronScheduler = require('./cronScheduler');
const workflowEngine = require('./workflowEngine');

const initializeAutomationEngine = () => {
  console.log('[AutomationEngine] Initializing automation engine...');

  cronScheduler.start(workflowEngine);

  eventEmitter.onBusinessEvent('*', async (eventPayload) => {
    try {
      console.log(`[AutomationEngine] Processing event: ${eventPayload.eventType}`);
      await workflowEngine.executeWorkflowsForEvent(
        eventPayload.eventType,
        eventPayload.entityData
      );
    } catch (error) {
      console.error(`[AutomationEngine] Error processing event:`, error.message);
    }
  });

  console.log('[AutomationEngine] Automation engine initialized');

  return {
    eventEmitter: eventEmitter.businessEventEmitter,
    cronScheduler,
    workflowEngine
  };
};

const shutdownAutomationEngine = () => {
  console.log('[AutomationEngine] Shutting down automation engine...');
  cronScheduler.stop();
  eventEmitter.businessEventEmitter.removeAllListeners();
  console.log('[AutomationEngine] Automation engine shut down');
};

module.exports = {
  initializeAutomationEngine,
  shutdownAutomationEngine,
  
  emitBusinessEvent: eventEmitter.emitBusinessEvent,
  onBusinessEvent: eventEmitter.onBusinessEvent,
  businessEventEmitter: eventEmitter.businessEventEmitter,
  SUPPORTED_EVENT_TYPES: eventEmitter.SUPPORTED_EVENT_TYPES,
  
  startCronScheduler: cronScheduler.start,
  stopCronScheduler: cronScheduler.stop,
  scheduleDelayedAction: cronScheduler.scheduleDelayedAction,
  getCronSchedulerStatus: cronScheduler.getStatus,
  
  executeWorkflow: workflowEngine.executeWorkflow,
  executeWorkflowsForEvent: workflowEngine.executeWorkflowsForEvent,
  getWorkflowsByTriggerType: workflowEngine.getWorkflowsByTriggerType,
  ACTION_HANDLERS: workflowEngine.ACTION_HANDLERS
};
