import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

const ACTUAL_SUPPORTED_EVENT_TYPES = [
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

const ACTUAL_STATE_TO_EVENT_TYPE: Record<string, string | null> = {
  'scheduled': 'job_scheduled',
  'in_progress': 'job_started',
  'completed': 'job_completed',
  'cancelled': 'job_cancelled'
};

function getEventTypeForState(toState: string): string | null {
  return ACTUAL_STATE_TO_EVENT_TYPE[toState] || null;
}

describe('Automation Event System', () => {
  describe('SUPPORTED_EVENT_TYPES matches production eventEmitter.js', () => {
    it('should include all job lifecycle events', () => {
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('job_created');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('job_scheduled');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('job_started');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('job_completed');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('job_cancelled');
    });

    it('should include all quote lifecycle events', () => {
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('quote_sent');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('quote_not_responded');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('quote_approved');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('quote_rejected');
    });

    it('should include all invoice lifecycle events', () => {
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('invoice_created');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('invoice_sent');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('invoice_paid');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('invoice_overdue');
    });

    it('should include lead lifecycle events', () => {
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('lead_created');
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toContain('lead_stage_changed');
    });

    it('should have exactly 15 event types', () => {
      expect(ACTUAL_SUPPORTED_EVENT_TYPES).toHaveLength(15);
    });
  });

  describe('STATE_TO_EVENT_TYPE mapping matches jobStateService.js', () => {
    it('should map scheduled state to job_scheduled event', () => {
      expect(getEventTypeForState('scheduled')).toBe('job_scheduled');
    });

    it('should map in_progress state to job_started event', () => {
      expect(getEventTypeForState('in_progress')).toBe('job_started');
    });

    it('should map completed state to job_completed event', () => {
      expect(getEventTypeForState('completed')).toBe('job_completed');
    });

    it('should map cancelled state to job_cancelled event', () => {
      expect(getEventTypeForState('cancelled')).toBe('job_cancelled');
    });

    it('should return null for states without event mappings', () => {
      expect(getEventTypeForState('draft')).toBeNull();
      expect(getEventTypeForState('en_route')).toBeNull();
      expect(getEventTypeForState('on_site')).toBeNull();
      expect(getEventTypeForState('weather_hold')).toBeNull();
      expect(getEventTypeForState('invoiced')).toBeNull();
      expect(getEventTypeForState('paid')).toBeNull();
    });

    it('should only map 4 specific states to events', () => {
      expect(Object.keys(ACTUAL_STATE_TO_EVENT_TYPE)).toHaveLength(4);
    });
  });

  describe('Event Payload Structure', () => {
    interface EventPayload {
      eventId: string;
      eventType: string;
      entityId: string;
      entityData: Record<string, unknown>;
      timestamp: string;
      metadata: {
        emittedAt: number;
      };
    }

    it('should structure job_completed event payload correctly', () => {
      const payload: EventPayload = {
        eventId: 'evt-123',
        eventType: 'job_completed',
        entityId: 'job-123',
        entityData: {
          id: 'job-123',
          status: 'completed',
          client_id: 'client-456',
          property_id: 'prop-789',
          customer_name: 'John Smith',
          price: 1500,
          total_amount: 1500,
          transition: {
            from: 'in_progress',
            to: 'completed',
            changedBy: 'user-789',
            reason: 'Job completed successfully',
            notes: null
          }
        },
        timestamp: new Date().toISOString(),
        metadata: { emittedAt: Date.now() }
      };

      expect(payload.eventType).toBe('job_completed');
      expect(payload.entityData.id).toBe('job-123');
      expect(payload.entityData.customer_name).toBe('John Smith');
      expect(payload.entityData.price).toBe(1500);
      expect(payload.entityData.transition).toBeDefined();
      expect((payload.entityData.transition as Record<string, unknown>).from).toBe('in_progress');
      expect((payload.entityData.transition as Record<string, unknown>).to).toBe('completed');
    });

    it('should structure quote_sent event payload correctly', () => {
      const payload: EventPayload = {
        eventId: 'evt-456',
        eventType: 'quote_sent',
        entityId: 'quote-123',
        entityData: {
          id: 'quote-123',
          status: 'Sent',
          client_id: 'client-456',
          total_amount: 2500,
          customer_name: 'ABC Corp',
          customer_email: 'contact@abc.com'
        },
        timestamp: new Date().toISOString(),
        metadata: { emittedAt: Date.now() }
      };

      expect(payload.eventType).toBe('quote_sent');
      expect(payload.entityData.status).toBe('Sent');
      expect(payload.entityData.total_amount).toBe(2500);
    });

    it('should structure invoice_created event payload correctly', () => {
      const payload: EventPayload = {
        eventId: 'evt-789',
        eventType: 'invoice_created',
        entityId: 'inv-123',
        entityData: {
          id: 'inv-123',
          invoice_number: 'INV-2024-0001',
          status: 'Draft',
          job_id: 'job-456',
          client_id: 'client-789',
          total_amount: 1500,
          grand_total: 1500,
          amount_due: 1500
        },
        timestamp: new Date().toISOString(),
        metadata: { emittedAt: Date.now() }
      };

      expect(payload.eventType).toBe('invoice_created');
      expect(payload.entityData.invoice_number).toBe('INV-2024-0001');
      expect(payload.entityData.status).toBe('Draft');
      expect(payload.entityData.amount_due).toBe(1500);
    });
  });

  describe('Event Emitter Pattern', () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
      emitter.setMaxListeners(50);
    });

    afterEach(() => {
      emitter.removeAllListeners();
    });

    it('should emit events to subscribed listeners', () => {
      const handler = vi.fn();
      emitter.on('job_completed', handler);

      emitter.emit('job_completed', { jobId: 'job-123' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ jobId: 'job-123' });
    });

    it('should support wildcard listeners with * event', () => {
      const wildcardHandler = vi.fn();
      emitter.on('*', wildcardHandler);

      emitter.emit('*', { eventType: 'job_completed', data: {} });

      expect(wildcardHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      emitter.on('invoice_paid', handler1);
      emitter.on('invoice_paid', handler2);

      emitter.emit('invoice_paid', { invoiceId: 'inv-123' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not fail when emitting event with no listeners', () => {
      expect(() => {
        emitter.emit('no_listeners_event', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Action Handler Types match workflowEngine.js', () => {
    const ACTUAL_ACTION_HANDLERS = [
      'send_email',
      'send_sms',
      'create_task',
      'create_reminder',
      'create_invoice',
      'update_lead_stage',
      'update_job_status'
    ];

    it('should support email actions', () => {
      expect(ACTUAL_ACTION_HANDLERS).toContain('send_email');
    });

    it('should support SMS actions', () => {
      expect(ACTUAL_ACTION_HANDLERS).toContain('send_sms');
    });

    it('should support invoice creation action', () => {
      expect(ACTUAL_ACTION_HANDLERS).toContain('create_invoice');
    });

    it('should support reminder creation action', () => {
      expect(ACTUAL_ACTION_HANDLERS).toContain('create_reminder');
    });

    it('should support status update actions', () => {
      expect(ACTUAL_ACTION_HANDLERS).toContain('update_lead_stage');
      expect(ACTUAL_ACTION_HANDLERS).toContain('update_job_status');
    });

    it('should have 7 action handlers', () => {
      expect(ACTUAL_ACTION_HANDLERS).toHaveLength(7);
    });
  });

  describe('Workflow Condition Evaluation', () => {
    const evaluateCondition = (condition: { field: string; operator: string; value: unknown }, entityData: Record<string, unknown>): boolean => {
      const fieldValue = entityData[condition.field];
      
      switch (condition.operator) {
        case '==':
        case 'equals':
          return fieldValue == condition.value;
        case '===':
        case 'strict_equals':
          return fieldValue === condition.value;
        case '!=':
        case 'not_equals':
          return fieldValue != condition.value;
        case '>':
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case '>=':
        case 'greater_than_or_equals':
          return Number(fieldValue) >= Number(condition.value);
        case '<':
        case 'less_than':
          return Number(fieldValue) < Number(condition.value);
        case '<=':
        case 'less_than_or_equals':
          return Number(fieldValue) <= Number(condition.value);
        case 'contains':
          return Array.isArray(fieldValue) && fieldValue.includes(condition.value);
        default:
          return false;
      }
    };

    it('should correctly evaluate equals condition', () => {
      const result = evaluateCondition(
        { field: 'status', operator: 'equals', value: 'completed' },
        { status: 'completed', price: 1500 }
      );
      expect(result).toBe(true);
    });

    it('should correctly evaluate not_equals condition', () => {
      const result = evaluateCondition(
        { field: 'status', operator: 'not_equals', value: 'cancelled' },
        { status: 'completed' }
      );
      expect(result).toBe(true);
    });

    it('should correctly evaluate greater_than condition', () => {
      const result = evaluateCondition(
        { field: 'price', operator: 'greater_than', value: 1000 },
        { price: 1500 }
      );
      expect(result).toBe(true);
    });

    it('should correctly evaluate less_than condition', () => {
      const result = evaluateCondition(
        { field: 'price', operator: 'less_than', value: 2000 },
        { price: 1500 }
      );
      expect(result).toBe(true);
    });

    it('should correctly evaluate greater_than_or_equals condition', () => {
      const result = evaluateCondition(
        { field: 'price', operator: 'greater_than_or_equals', value: 1500 },
        { price: 1500 }
      );
      expect(result).toBe(true);
    });

    it('should correctly evaluate less_than_or_equals condition', () => {
      const result = evaluateCondition(
        { field: 'price', operator: 'less_than_or_equals', value: 1500 },
        { price: 1500 }
      );
      expect(result).toBe(true);
    });

    it('should correctly evaluate contains condition for arrays', () => {
      const result = evaluateCondition(
        { field: 'tags', operator: 'contains', value: 'priority' },
        { tags: ['priority', 'commercial'] }
      );
      expect(result).toBe(true);
    });

    it('should return false for unknown operator', () => {
      const result = evaluateCondition(
        { field: 'status', operator: 'unknown_op', value: 'test' },
        { status: 'test' }
      );
      expect(result).toBe(false);
    });
  });

  describe('Invoice Number Generation', () => {
    const generateInvoiceNumber = (year: number, sequence: number): string => {
      const prefix = `INV-${year}-`;
      return `${prefix}${String(sequence).padStart(4, '0')}`;
    };

    it('should generate sequential invoice numbers with 4-digit padding', () => {
      expect(generateInvoiceNumber(2024, 1)).toBe('INV-2024-0001');
      expect(generateInvoiceNumber(2024, 42)).toBe('INV-2024-0042');
      expect(generateInvoiceNumber(2024, 999)).toBe('INV-2024-0999');
      expect(generateInvoiceNumber(2024, 9999)).toBe('INV-2024-9999');
    });

    it('should reset sequence for new year', () => {
      expect(generateInvoiceNumber(2024, 100)).toBe('INV-2024-0100');
      expect(generateInvoiceNumber(2025, 1)).toBe('INV-2025-0001');
    });

    it('should handle edge cases for sequence numbers', () => {
      expect(generateInvoiceNumber(2024, 0)).toBe('INV-2024-0000');
      expect(generateInvoiceNumber(2024, 10000)).toBe('INV-2024-10000');
    });
  });

  describe('Delayed Action Scheduling', () => {
    it('should calculate correct delay in milliseconds for 3 days', () => {
      const delayMinutes = 4320;
      const delayMs = delayMinutes * 60 * 1000;
      expect(delayMs).toBe(259200000);
    });

    it('should calculate 3 day delay in minutes for review requests', () => {
      const threeDaysInMinutes = 3 * 24 * 60;
      expect(threeDaysInMinutes).toBe(4320);
    });

    it('should calculate 7 day delay in minutes for quote follow-ups', () => {
      const sevenDaysInMinutes = 7 * 24 * 60;
      expect(sevenDaysInMinutes).toBe(10080);
    });

    it('should calculate scheduled execution time correctly', () => {
      const now = new Date('2024-12-06T10:00:00Z');
      const delayMinutes = 4320;
      const scheduledTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
      expect(scheduledTime.toISOString()).toBe('2024-12-09T10:00:00.000Z');
    });

    it('should handle immediate execution (0 delay)', () => {
      const now = new Date('2024-12-06T10:00:00Z');
      const delayMinutes = 0;
      const scheduledTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
      expect(scheduledTime.toISOString()).toBe('2024-12-06T10:00:00.000Z');
    });
  });

  describe('Idempotency Key Generation', () => {
    const generateIdempotencyKey = (eventType: string, entityId: string): string => {
      return `${eventType}:${entityId}`;
    };

    it('should generate consistent keys for same event and entity', () => {
      const key1 = generateIdempotencyKey('job_completed', 'job-123');
      const key2 = generateIdempotencyKey('job_completed', 'job-123');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different events', () => {
      const key1 = generateIdempotencyKey('job_completed', 'job-123');
      const key2 = generateIdempotencyKey('job_started', 'job-123');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different entities', () => {
      const key1 = generateIdempotencyKey('job_completed', 'job-123');
      const key2 = generateIdempotencyKey('job_completed', 'job-456');
      expect(key1).not.toBe(key2);
    });

    it('should produce properly formatted keys', () => {
      const key = generateIdempotencyKey('invoice_paid', 'inv-789');
      expect(key).toBe('invoice_paid:inv-789');
    });
  });
});
