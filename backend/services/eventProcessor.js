const eventService = require('./eventService');
const { processEvent } = require('./eventHandlers');

let isProcessing = false;
let processorInterval = null;

const processNextBatch = async () => {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  
  try {
    const events = await eventService.getPendingEvents(5);
    
    for (const event of events) {
      try {
        await eventService.markEventProcessing(event.id);
        
        const result = await processEvent(event);
        
        if (result.skipped) {
          await eventService.markEventSkipped(event.id, result.reason);
          console.log(`[EventProcessor] Skipped event ${event.id}: ${result.reason}`);
        } else {
          await eventService.markEventCompleted(event.id);
          console.log(`[EventProcessor] Completed event ${event.id}: ${event.event_type}`);
        }
      } catch (error) {
        console.error(`[EventProcessor] Failed to process event ${event.id}:`, error.message);
        await eventService.markEventFailed(event.id, error.message);
      }
    }
  } catch (error) {
    console.error('[EventProcessor] Error fetching events:', error.message);
  } finally {
    isProcessing = false;
  }
};

const startProcessor = (intervalMs = 5000) => {
  if (processorInterval) {
    console.log('[EventProcessor] Already running');
    return;
  }
  
  console.log(`[EventProcessor] Starting with ${intervalMs}ms interval`);
  processorInterval = setInterval(processNextBatch, intervalMs);
  
  processNextBatch();
};

const stopProcessor = () => {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('[EventProcessor] Stopped');
  }
};

const triggerProcessing = async () => {
  await processNextBatch();
};

module.exports = {
  startProcessor,
  stopProcessor,
  triggerProcessing,
  processNextBatch
};
