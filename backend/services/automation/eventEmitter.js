const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

const SUPPORTED_EVENT_TYPES = [
  'quote_sent',
  'quote_not_responded',
  'quote_approved',
  'quote_rejected',
  'job_created',
  'job_scheduled',
  'job_started',
  'job_completed',
  'job_cancelled',
  'invoice_created',
  'invoice_sent',
  'invoice_overdue',
  'invoice_paid',
  'lead_created',
  'lead_stage_changed'
];

class BusinessEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.executionRecords = new Map();
    this.idempotencyWindowMs = 5 * 60 * 1000;
  }

  generateIdempotencyKey(eventType, entityId) {
    return `${eventType}:${entityId}`;
  }

  isIdempotent(eventType, entityId) {
    const key = this.generateIdempotencyKey(eventType, entityId);
    const lastExecution = this.executionRecords.get(key);
    
    if (!lastExecution) {
      return false;
    }

    const elapsed = Date.now() - lastExecution;
    return elapsed < this.idempotencyWindowMs;
  }

  recordExecution(eventType, entityId) {
    const key = this.generateIdempotencyKey(eventType, entityId);
    this.executionRecords.set(key, Date.now());

    setTimeout(() => {
      if (this.executionRecords.get(key) <= Date.now() - this.idempotencyWindowMs) {
        this.executionRecords.delete(key);
      }
    }, this.idempotencyWindowMs + 1000);
  }

  async emitBusinessEvent(eventType, entityData) {
    if (!SUPPORTED_EVENT_TYPES.includes(eventType)) {
      console.warn(`[EventEmitter] Unknown event type: ${eventType}`);
    }

    const entityId = entityData?.id || entityData?.entityId || uuidv4();

    if (this.isIdempotent(eventType, entityId)) {
      console.log(`[EventEmitter] Skipping duplicate event: ${eventType} for entity ${entityId}`);
      return { skipped: true, reason: 'idempotency' };
    }

    this.recordExecution(eventType, entityId);

    const eventPayload = {
      eventId: uuidv4(),
      eventType,
      entityId,
      entityData,
      timestamp: new Date().toISOString(),
      metadata: {
        emittedAt: Date.now()
      }
    };

    console.log(`[EventEmitter] Emitting business event: ${eventType} for entity ${entityId}`);

    try {
      await this.logEventToDatabase(eventPayload);
    } catch (error) {
      console.error(`[EventEmitter] Failed to log event to database:`, error.message);
    }

    this.emit(eventType, eventPayload);
    this.emit('business_event', eventPayload);

    return { emitted: true, eventId: eventPayload.eventId };
  }

  async logEventToDatabase(eventPayload) {
    const executionId = uuidv4();
    
    await db.query(`
      INSERT INTO automation_logs (
        id, execution_id, trigger_type, 
        triggered_by_entity_type, triggered_by_entity_id,
        status, input_data, started_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `, [
      uuidv4(),
      executionId,
      eventPayload.eventType,
      this.getEntityType(eventPayload.eventType),
      eventPayload.entityId,
      'pending',
      JSON.stringify(eventPayload)
    ]);

    return executionId;
  }

  getEntityType(eventType) {
    if (eventType.startsWith('quote_')) return 'quote';
    if (eventType.startsWith('job_')) return 'job';
    if (eventType.startsWith('invoice_')) return 'invoice';
    if (eventType.startsWith('lead_')) return 'lead';
    return 'unknown';
  }

  onBusinessEvent(eventType, handler) {
    if (eventType === '*' || eventType === 'all') {
      this.on('business_event', handler);
      console.log(`[EventEmitter] Registered handler for all business events`);
      return () => this.off('business_event', handler);
    }

    if (!SUPPORTED_EVENT_TYPES.includes(eventType)) {
      console.warn(`[EventEmitter] Registering handler for unknown event type: ${eventType}`);
    }

    this.on(eventType, handler);
    console.log(`[EventEmitter] Registered handler for event: ${eventType}`);
    
    return () => this.off(eventType, handler);
  }

  offBusinessEvent(eventType, handler) {
    if (eventType === '*' || eventType === 'all') {
      this.off('business_event', handler);
    } else {
      this.off(eventType, handler);
    }
  }

  clearIdempotencyRecords() {
    this.executionRecords.clear();
    console.log('[EventEmitter] Cleared all idempotency records');
  }

  getRegisteredEventTypes() {
    return SUPPORTED_EVENT_TYPES;
  }

  getStats() {
    return {
      idempotencyRecordsCount: this.executionRecords.size,
      listenerCounts: SUPPORTED_EVENT_TYPES.reduce((acc, type) => {
        acc[type] = this.listenerCount(type);
        return acc;
      }, {}),
      totalListeners: this.listenerCount('business_event')
    };
  }
}

const businessEventEmitter = new BusinessEventEmitter();

module.exports = {
  businessEventEmitter,
  emitBusinessEvent: (eventType, entityData) => businessEventEmitter.emitBusinessEvent(eventType, entityData),
  onBusinessEvent: (eventType, handler) => businessEventEmitter.onBusinessEvent(eventType, handler),
  SUPPORTED_EVENT_TYPES
};
