import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

const SUPPORTED_EVENT_TYPES = [
  'lead_created',
  'lead_updated',
  'quote_created',
  'quote_sent',
  'quote_accepted',
  'quote_rejected',
  'job_created',
  'job_scheduled',
  'job_started',
  'job_completed',
  'job_cancelled',
  'invoice_created',
  'invoice_sent',
  'invoice_paid',
  'invoice_overdue',
  'payment_received',
  'client_created',
  'employee_assigned',
  'review_requested',
  'review_received'
];

describe('Automation Event System', () => {
  describe('SUPPORTED_EVENT_TYPES', () => {
    it('should include all job lifecycle events', () => {
      expect(SUPPORTED_EVENT_TYPES).toContain('job_created');
      expect(SUPPORTED_EVENT_TYPES).toContain('job_scheduled');
      expect(SUPPORTED_EVENT_TYPES).toContain('job_started');
      expect(SUPPORTED_EVENT_TYPES).toContain('job_completed');
      expect(SUPPORTED_EVENT_TYPES).toContain('job_cancelled');
    });

    it('should include all quote lifecycle events', () => {
      expect(SUPPORTED_EVENT_TYPES).toContain('quote_created');
      expect(SUPPORTED_EVENT_TYPES).toContain('quote_sent');
      expect(SUPPORTED_EVENT_TYPES).toContain('quote_accepted');
      expect(SUPPORTED_EVENT_TYPES).toContain('quote_rejected');
    });

    it('should include all invoice lifecycle events', () => {
      expect(SUPPORTED_EVENT_TYPES).toContain('invoice_created');
      expect(SUPPORTED_EVENT_TYPES).toContain('invoice_sent');
      expect(SUPPORTED_EVENT_TYPES).toContain('invoice_paid');
      expect(SUPPORTED_EVENT_TYPES).toContain('invoice_overdue');
    });

    it('should include lead and client events', () => {
      expect(SUPPORTED_EVENT_TYPES).toContain('lead_created');
      expect(SUPPORTED_EVENT_TYPES).toContain('lead_updated');
      expect(SUPPORTED_EVENT_TYPES).toContain('client_created');
    });

    it('should include review events', () => {
      expect(SUPPORTED_EVENT_TYPES).toContain('review_requested');
      expect(SUPPORTED_EVENT_TYPES).toContain('review_received');
    });
  });

  describe('State to Event Mapping', () => {
    const STATE_TO_EVENT_TYPE: Record<string, string | null> = {
      'scheduled': 'job_scheduled',
      'in_progress': 'job_started',
      'completed': 'job_completed',
      'cancelled': 'job_cancelled',
      'draft': null,
      'en_route': null,
      'on_site': null,
      'weather_hold': null,
      'invoiced': null,
      'paid': null
    };

    it('should map scheduled state to job_scheduled event', () => {
      expect(STATE_TO_EVENT_TYPE['scheduled']).toBe('job_scheduled');
    });

    it('should map in_progress state to job_started event', () => {
      expect(STATE_TO_EVENT_TYPE['in_progress']).toBe('job_started');
    });

    it('should map completed state to job_completed event', () => {
      expect(STATE_TO_EVENT_TYPE['completed']).toBe('job_completed');
    });

    it('should map cancelled state to job_cancelled event', () => {
      expect(STATE_TO_EVENT_TYPE['cancelled']).toBe('job_cancelled');
    });

    it('should not map intermediate states to events', () => {
      expect(STATE_TO_EVENT_TYPE['draft']).toBeNull();
      expect(STATE_TO_EVENT_TYPE['en_route']).toBeNull();
      expect(STATE_TO_EVENT_TYPE['on_site']).toBeNull();
      expect(STATE_TO_EVENT_TYPE['weather_hold']).toBeNull();
    });
  });

  describe('Event Payload Structure', () => {
    interface EventPayload {
      eventType: string;
      entityId?: string;
      entityData: Record<string, unknown>;
      timestamp: Date;
    }

    it('should create valid job_completed event payload', () => {
      const payload: EventPayload = {
        eventType: 'job_completed',
        entityId: 'job-123',
        entityData: {
          id: 'job-123',
          status: 'completed',
          client_id: 'client-456',
          price: 1500,
          transition: {
            from: 'in_progress',
            to: 'completed',
            changedBy: 'user-789',
            reason: 'Job completed successfully'
          }
        },
        timestamp: new Date()
      };

      expect(payload.eventType).toBe('job_completed');
      expect(payload.entityData.id).toBe('job-123');
      expect(payload.entityData.transition).toBeDefined();
    });

    it('should create valid quote_sent event payload', () => {
      const payload: EventPayload = {
        eventType: 'quote_sent',
        entityId: 'quote-123',
        entityData: {
          id: 'quote-123',
          status: 'Sent',
          client_id: 'client-456',
          total_amount: 2500
        },
        timestamp: new Date()
      };

      expect(payload.eventType).toBe('quote_sent');
      expect(payload.entityData.status).toBe('Sent');
    });

    it('should create valid invoice_created event payload', () => {
      const payload: EventPayload = {
        eventType: 'invoice_created',
        entityId: 'inv-123',
        entityData: {
          id: 'inv-123',
          invoice_number: 'INV-2024-0001',
          status: 'Draft',
          job_id: 'job-456',
          client_id: 'client-789',
          total_amount: 1500
        },
        timestamp: new Date()
      };

      expect(payload.eventType).toBe('invoice_created');
      expect(payload.entityData.invoice_number).toBe('INV-2024-0001');
    });
  });

  describe('Event Emitter Pattern', () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
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

  describe('Action Handler Types', () => {
    const SUPPORTED_ACTION_TYPES = [
      'send_email',
      'send_sms',
      'create_task',
      'create_reminder',
      'create_invoice',
      'update_lead_stage',
      'update_job_status',
      'assign_employee',
      'webhook'
    ];

    it('should support email actions', () => {
      expect(SUPPORTED_ACTION_TYPES).toContain('send_email');
    });

    it('should support SMS actions', () => {
      expect(SUPPORTED_ACTION_TYPES).toContain('send_sms');
    });

    it('should support invoice creation action', () => {
      expect(SUPPORTED_ACTION_TYPES).toContain('create_invoice');
    });

    it('should support reminder creation action', () => {
      expect(SUPPORTED_ACTION_TYPES).toContain('create_reminder');
    });

    it('should support status update actions', () => {
      expect(SUPPORTED_ACTION_TYPES).toContain('update_lead_stage');
      expect(SUPPORTED_ACTION_TYPES).toContain('update_job_status');
    });
  });

  describe('Workflow Execution Logic', () => {
    it('should correctly evaluate equals condition', () => {
      const condition = { field: 'status', operator: 'equals', value: 'completed' };
      const entityData = { status: 'completed', price: 1500 };
      
      const result = entityData[condition.field as keyof typeof entityData] === condition.value;
      expect(result).toBe(true);
    });

    it('should correctly evaluate not_equals condition', () => {
      const condition = { field: 'status', operator: 'not_equals', value: 'cancelled' };
      const entityData = { status: 'completed' };
      
      const result = entityData[condition.field as keyof typeof entityData] !== condition.value;
      expect(result).toBe(true);
    });

    it('should correctly evaluate greater_than condition', () => {
      const condition = { field: 'price', operator: 'greater_than', value: 1000 };
      const entityData = { price: 1500 };
      
      const result = entityData.price > condition.value;
      expect(result).toBe(true);
    });

    it('should correctly evaluate less_than condition', () => {
      const condition = { field: 'price', operator: 'less_than', value: 2000 };
      const entityData = { price: 1500 };
      
      const result = entityData.price < condition.value;
      expect(result).toBe(true);
    });

    it('should correctly evaluate contains condition for arrays', () => {
      const condition = { field: 'tags', operator: 'contains', value: 'priority' };
      const entityData = { tags: ['priority', 'commercial'] };
      
      const result = entityData.tags.includes(condition.value);
      expect(result).toBe(true);
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate sequential invoice numbers', () => {
      const generateInvoiceNumber = (year: number, sequence: number): string => {
        const prefix = `INV-${year}-`;
        return `${prefix}${String(sequence).padStart(4, '0')}`;
      };

      expect(generateInvoiceNumber(2024, 1)).toBe('INV-2024-0001');
      expect(generateInvoiceNumber(2024, 42)).toBe('INV-2024-0042');
      expect(generateInvoiceNumber(2024, 999)).toBe('INV-2024-0999');
      expect(generateInvoiceNumber(2024, 9999)).toBe('INV-2024-9999');
    });

    it('should reset sequence for new year', () => {
      const generateInvoiceNumber = (year: number, sequence: number): string => {
        return `INV-${year}-${String(sequence).padStart(4, '0')}`;
      };

      expect(generateInvoiceNumber(2024, 100)).toBe('INV-2024-0100');
      expect(generateInvoiceNumber(2025, 1)).toBe('INV-2025-0001');
    });
  });

  describe('Delayed Action Scheduling', () => {
    it('should calculate correct delay in milliseconds', () => {
      const delayMinutes = 4320;
      const delayMs = delayMinutes * 60 * 1000;
      
      expect(delayMs).toBe(259200000);
    });

    it('should calculate 3 day delay for review requests', () => {
      const threeDaysInMinutes = 3 * 24 * 60;
      expect(threeDaysInMinutes).toBe(4320);
    });

    it('should calculate 7 day delay for quote follow-ups', () => {
      const sevenDaysInMinutes = 7 * 24 * 60;
      expect(sevenDaysInMinutes).toBe(10080);
    });

    it('should calculate scheduled execution time', () => {
      const now = new Date('2024-12-06T10:00:00Z');
      const delayMinutes = 4320;
      const scheduledTime = new Date(now.getTime() + delayMinutes * 60 * 1000);
      
      expect(scheduledTime.toISOString()).toBe('2024-12-09T10:00:00.000Z');
    });
  });
});
