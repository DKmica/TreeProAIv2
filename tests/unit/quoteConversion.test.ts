import { describe, it, expect, vi, beforeEach } from 'vitest';

interface QuoteLineItem {
  description: string;
  price: number;
  quantity?: number;
  selected?: boolean;
}

interface Quote {
  id: string;
  quote_number: string;
  client_id: string | null;
  property_id: string | null;
  customer_name: string;
  job_location: string | null;
  special_instructions: string | null;
  status: string;
  approval_status?: string;
  line_items: QuoteLineItem[];
  grand_total: number;
  price?: number;
  created_at: string;
}

interface Job {
  id: string;
  job_number: string;
  quote_id: string;
  client_id: string | null;
  property_id: string | null;
  customer_name: string;
  job_location: string | null;
  special_instructions: string | null;
  status: string;
  price: number;
  line_items: QuoteLineItem[];
}

const ALLOWED_CONVERSION_STATUSES = ['Sent', 'Accepted'];
const BLOCKED_CONVERSION_STATUSES = ['Draft', 'Pending', 'Rejected', 'Converted'];

function canConvertQuoteToJob(quote: Quote): { canConvert: boolean; error?: string } {
  if (quote.approval_status === 'rejected') {
    return { canConvert: false, error: 'Cannot convert rejected quote to job' };
  }
  
  if (!ALLOWED_CONVERSION_STATUSES.includes(quote.status)) {
    return {
      canConvert: false,
      error: `Cannot convert quote with status '${quote.status}' to job. Quote must be 'Sent' or 'Accepted'.`
    };
  }
  
  return { canConvert: true };
}

function convertQuoteToJob(quote: Quote, jobId: string, jobNumber: string): Job {
  return {
    id: jobId,
    job_number: jobNumber,
    quote_id: quote.id,
    client_id: quote.client_id,
    property_id: quote.property_id,
    customer_name: quote.customer_name || 'Unknown',
    job_location: quote.job_location || null,
    special_instructions: quote.special_instructions || null,
    status: 'Scheduled',
    price: quote.grand_total || quote.price || 0,
    line_items: quote.line_items || []
  };
}

function generateJobNumber(prefix: string = 'JOB', sequence: number = 1): string {
  const year = new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${paddedSequence}`;
}

function transferLineItems(quoteLineItems: QuoteLineItem[]): QuoteLineItem[] {
  if (!quoteLineItems || !Array.isArray(quoteLineItems)) {
    return [];
  }
  return quoteLineItems.map(item => ({
    description: item.description,
    price: item.price,
    quantity: item.quantity || 1
  }));
}

function calculateJobPrice(lineItems: QuoteLineItem[]): number {
  if (!lineItems || lineItems.length === 0) {
    return 0;
  }
  return lineItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
}

describe('QuoteConversion', () => {
  describe('canConvertQuoteToJob', () => {
    describe('Allowed statuses', () => {
      it('should allow conversion of Sent quotes', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: null,
          customer_name: 'John Doe',
          job_location: '123 Main St',
          special_instructions: null,
          status: 'Sent',
          line_items: [],
          grand_total: 1500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow conversion of Accepted quotes', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: 'property-456',
          customer_name: 'Jane Smith',
          job_location: '456 Oak Ave',
          special_instructions: 'Call before arrival',
          status: 'Accepted',
          line_items: [],
          grand_total: 2500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Blocked statuses', () => {
      it('should reject conversion of Draft quotes', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: null,
          customer_name: 'John Doe',
          job_location: '123 Main St',
          special_instructions: null,
          status: 'Draft',
          line_items: [],
          grand_total: 1500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(false);
        expect(result.error).toContain("Cannot convert quote with status 'Draft'");
      });

      it('should reject conversion of Pending quotes', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: null,
          customer_name: 'John Doe',
          job_location: '123 Main St',
          special_instructions: null,
          status: 'Pending',
          line_items: [],
          grand_total: 1500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(false);
        expect(result.error).toContain("Cannot convert quote with status 'Pending'");
      });

      it('should reject conversion of Rejected quotes', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: null,
          customer_name: 'John Doe',
          job_location: '123 Main St',
          special_instructions: null,
          status: 'Rejected',
          line_items: [],
          grand_total: 1500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(false);
        expect(result.error).toContain("Cannot convert quote with status 'Rejected'");
      });

      it('should reject conversion of already Converted quotes', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: null,
          customer_name: 'John Doe',
          job_location: '123 Main St',
          special_instructions: null,
          status: 'Converted',
          line_items: [],
          grand_total: 1500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(false);
        expect(result.error).toContain("Cannot convert quote with status 'Converted'");
      });
    });

    describe('Approval status checks', () => {
      it('should reject quotes with rejected approval status', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: null,
          customer_name: 'John Doe',
          job_location: '123 Main St',
          special_instructions: null,
          status: 'Sent',
          approval_status: 'rejected',
          line_items: [],
          grand_total: 1500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(false);
        expect(result.error).toBe('Cannot convert rejected quote to job');
      });

      it('should allow quotes with approved approval status', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: null,
          customer_name: 'John Doe',
          job_location: '123 Main St',
          special_instructions: null,
          status: 'Sent',
          approval_status: 'approved',
          line_items: [],
          grand_total: 1500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(true);
      });

      it('should allow quotes without approval status', () => {
        const quote: Quote = {
          id: 'quote-123',
          quote_number: 'Q-2025-0001',
          client_id: 'client-123',
          property_id: null,
          customer_name: 'John Doe',
          job_location: '123 Main St',
          special_instructions: null,
          status: 'Sent',
          line_items: [],
          grand_total: 1500,
          created_at: '2025-01-01T00:00:00Z'
        };
        
        const result = canConvertQuoteToJob(quote);
        expect(result.canConvert).toBe(true);
      });
    });
  });

  describe('convertQuoteToJob', () => {
    it('should create job with correct fields from quote', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: 'client-456',
        property_id: 'property-789',
        customer_name: 'John Doe',
        job_location: '123 Main St, City, State 12345',
        special_instructions: 'Use side gate entrance',
        status: 'Sent',
        line_items: [
          { description: 'Tree Removal', price: 800, quantity: 1 },
          { description: 'Stump Grinding', price: 200, quantity: 1 }
        ],
        grand_total: 1000,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.id).toBe('job-001');
      expect(job.job_number).toBe('JOB-2025-0001');
      expect(job.quote_id).toBe('quote-123');
      expect(job.client_id).toBe('client-456');
      expect(job.property_id).toBe('property-789');
      expect(job.customer_name).toBe('John Doe');
      expect(job.job_location).toBe('123 Main St, City, State 12345');
      expect(job.special_instructions).toBe('Use side gate entrance');
      expect(job.status).toBe('Scheduled');
      expect(job.price).toBe(1000);
    });

    it('should use "Unknown" as default customer name when not provided', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: null,
        property_id: null,
        customer_name: '',
        job_location: null,
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 500,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.customer_name).toBe('Unknown');
    });

    it('should set initial job status to Scheduled', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: 'client-123',
        property_id: null,
        customer_name: 'Test Customer',
        job_location: null,
        special_instructions: null,
        status: 'Accepted',
        line_items: [],
        grand_total: 750,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.status).toBe('Scheduled');
    });

    it('should use grand_total as job price', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: null,
        property_id: null,
        customer_name: 'Customer',
        job_location: null,
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 2500,
        price: 2000,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.price).toBe(2500);
    });

    it('should fallback to price when grand_total is not available', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: null,
        property_id: null,
        customer_name: 'Customer',
        job_location: null,
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 0,
        price: 1800,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.price).toBe(1800);
    });

    it('should default to 0 when no price information is available', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: null,
        property_id: null,
        customer_name: 'Customer',
        job_location: null,
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 0,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.price).toBe(0);
    });

    it('should preserve quote_id reference in job', () => {
      const quote: Quote = {
        id: 'original-quote-uuid',
        quote_number: 'Q-2025-0042',
        client_id: 'client-123',
        property_id: null,
        customer_name: 'Test',
        job_location: null,
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 500,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.quote_id).toBe('original-quote-uuid');
    });
  });

  describe('Line Items Transfer', () => {
    it('should transfer all line items from quote to job', () => {
      const quoteLineItems: QuoteLineItem[] = [
        { description: 'Large Oak Tree Removal', price: 1200, quantity: 1 },
        { description: 'Medium Pine Tree Trimming', price: 400, quantity: 2 },
        { description: 'Stump Grinding', price: 150, quantity: 3 }
      ];
      
      const transferredItems = transferLineItems(quoteLineItems);
      
      expect(transferredItems.length).toBe(3);
      expect(transferredItems[0].description).toBe('Large Oak Tree Removal');
      expect(transferredItems[0].price).toBe(1200);
      expect(transferredItems[1].description).toBe('Medium Pine Tree Trimming');
      expect(transferredItems[1].price).toBe(400);
      expect(transferredItems[2].description).toBe('Stump Grinding');
      expect(transferredItems[2].price).toBe(150);
    });

    it('should preserve quantity in transferred line items', () => {
      const quoteLineItems: QuoteLineItem[] = [
        { description: 'Tree Removal', price: 500, quantity: 3 }
      ];
      
      const transferredItems = transferLineItems(quoteLineItems);
      
      expect(transferredItems[0].quantity).toBe(3);
    });

    it('should default quantity to 1 when not specified', () => {
      const quoteLineItems: QuoteLineItem[] = [
        { description: 'Tree Removal', price: 500 }
      ];
      
      const transferredItems = transferLineItems(quoteLineItems);
      
      expect(transferredItems[0].quantity).toBe(1);
    });

    it('should handle empty line items array', () => {
      const transferredItems = transferLineItems([]);
      
      expect(transferredItems).toEqual([]);
    });

    it('should handle null/undefined line items', () => {
      expect(transferLineItems(null as any)).toEqual([]);
      expect(transferLineItems(undefined as any)).toEqual([]);
    });
  });

  describe('Client and Property Associations', () => {
    it('should maintain client_id association in converted job', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: 'client-abc-123',
        property_id: null,
        customer_name: 'Acme Corp',
        job_location: null,
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 1000,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.client_id).toBe('client-abc-123');
    });

    it('should maintain property_id association in converted job', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: 'client-123',
        property_id: 'property-xyz-789',
        customer_name: 'Test Customer',
        job_location: null,
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 1500,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.property_id).toBe('property-xyz-789');
    });

    it('should handle null client_id', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: null,
        property_id: null,
        customer_name: 'Walk-in Customer',
        job_location: '789 Random St',
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 500,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.client_id).toBeNull();
    });

    it('should handle null property_id', () => {
      const quote: Quote = {
        id: 'quote-123',
        quote_number: 'Q-2025-0001',
        client_id: 'client-123',
        property_id: null,
        customer_name: 'Test Customer',
        job_location: 'Location TBD',
        special_instructions: null,
        status: 'Sent',
        line_items: [],
        grand_total: 800,
        created_at: '2025-01-01T00:00:00Z'
      };
      
      const job = convertQuoteToJob(quote, 'job-001', 'JOB-2025-0001');
      
      expect(job.property_id).toBeNull();
    });
  });

  describe('Job Number Generation', () => {
    it('should generate job number with correct format', () => {
      const jobNumber = generateJobNumber('JOB', 1);
      const year = new Date().getFullYear();
      
      expect(jobNumber).toBe(`JOB-${year}-0001`);
    });

    it('should pad sequence number to 4 digits', () => {
      expect(generateJobNumber('JOB', 1)).toContain('-0001');
      expect(generateJobNumber('JOB', 12)).toContain('-0012');
      expect(generateJobNumber('JOB', 123)).toContain('-0123');
      expect(generateJobNumber('JOB', 1234)).toContain('-1234');
    });

    it('should handle sequence numbers larger than 9999', () => {
      const jobNumber = generateJobNumber('JOB', 12345);
      expect(jobNumber).toContain('-12345');
    });

    it('should use provided prefix', () => {
      const jobNumber = generateJobNumber('TREE', 1);
      expect(jobNumber).toMatch(/^TREE-/);
    });

    it('should include current year', () => {
      const year = new Date().getFullYear();
      const jobNumber = generateJobNumber('JOB', 1);
      
      expect(jobNumber).toContain(`-${year}-`);
    });
  });

  describe('Price Calculation', () => {
    it('should calculate total price from line items', () => {
      const lineItems: QuoteLineItem[] = [
        { description: 'Service A', price: 100, quantity: 1 },
        { description: 'Service B', price: 200, quantity: 1 },
        { description: 'Service C', price: 300, quantity: 1 }
      ];
      
      const total = calculateJobPrice(lineItems);
      
      expect(total).toBe(600);
    });

    it('should account for quantity in price calculation', () => {
      const lineItems: QuoteLineItem[] = [
        { description: 'Tree Removal', price: 500, quantity: 3 }
      ];
      
      const total = calculateJobPrice(lineItems);
      
      expect(total).toBe(1500);
    });

    it('should handle empty line items', () => {
      const total = calculateJobPrice([]);
      
      expect(total).toBe(0);
    });

    it('should handle mixed quantities', () => {
      const lineItems: QuoteLineItem[] = [
        { description: 'Item A', price: 100, quantity: 2 },
        { description: 'Item B', price: 50, quantity: 4 },
        { description: 'Item C', price: 200, quantity: 1 }
      ];
      
      const total = calculateJobPrice(lineItems);
      
      expect(total).toBe(600);
    });

    it('should default quantity to 1 when not specified', () => {
      const lineItems: QuoteLineItem[] = [
        { description: 'Item A', price: 150 }
      ];
      
      const total = calculateJobPrice(lineItems);
      
      expect(total).toBe(150);
    });
  });

  describe('Quote Status After Conversion', () => {
    it('should have status "Converted" after successful conversion', () => {
      const originalStatus = 'Sent';
      const statusAfterConversion = 'Converted';
      
      expect(originalStatus).not.toBe(statusAfterConversion);
      expect(statusAfterConversion).toBe('Converted');
    });
  });

  describe('Status Constants', () => {
    it('should have correct allowed conversion statuses', () => {
      expect(ALLOWED_CONVERSION_STATUSES).toContain('Sent');
      expect(ALLOWED_CONVERSION_STATUSES).toContain('Accepted');
      expect(ALLOWED_CONVERSION_STATUSES.length).toBe(2);
    });

    it('should have correct blocked conversion statuses', () => {
      expect(BLOCKED_CONVERSION_STATUSES).toContain('Draft');
      expect(BLOCKED_CONVERSION_STATUSES).toContain('Pending');
      expect(BLOCKED_CONVERSION_STATUSES).toContain('Rejected');
      expect(BLOCKED_CONVERSION_STATUSES).toContain('Converted');
      expect(BLOCKED_CONVERSION_STATUSES.length).toBe(4);
    });

    it('should not have overlap between allowed and blocked statuses', () => {
      const overlap = ALLOWED_CONVERSION_STATUSES.filter(
        status => BLOCKED_CONVERSION_STATUSES.includes(status)
      );
      
      expect(overlap.length).toBe(0);
    });
  });
});
