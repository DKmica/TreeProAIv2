import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Invoices API Integration Tests', () => {
  let testInvoiceId: string;

  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  describe('GET /api/invoices', () => {
    it('should return list of all invoices', async () => {
      const response = await request(API_URL).get('/api/invoices');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/invoices', () => {
    it('should create a new invoice with line items', async () => {
      const newInvoice = {
        customerName: 'Invoice Test Customer',
        lineItems: [
          {
            description: 'Tree Removal Service',
            quantity: 1,
            price: 750
          },
          {
            description: 'Cleanup and Hauling',
            quantity: 1,
            price: 250
          }
        ],
        taxRate: 8.5,
        discountPercentage: 10,
        paymentTerms: 'Net 30',
        issueDate: '2025-05-20',
        dueDate: '2025-06-20'
      };
      
      const response = await request(API_URL)
        .post('/api/invoices')
        .send(newInvoice);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('invoiceNumber');
      expect(response.body.data.customerName).toBe('Invoice Test Customer');
      expect(response.body.data.lineItems).toHaveLength(2);
      expect(response.body.data.grandTotal).toBeGreaterThan(0);
      
      testInvoiceId = response.body.data.id;
    });

    it('should return 400 when customerName is missing', async () => {
      const invalidInvoice = {
        lineItems: [{ description: 'Service', quantity: 1, price: 100 }]
      };
      
      const response = await request(API_URL)
        .post('/api/invoices')
        .send(invalidInvoice);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when lineItems is missing or empty', async () => {
      const invalidInvoice = {
        customerName: 'Test Customer',
        lineItems: []
      };
      
      const response = await request(API_URL)
        .post('/api/invoices')
        .send(invalidInvoice);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('should return a single invoice with payment history', async () => {
      const response = await request(API_URL).get(`/api/invoices/${testInvoiceId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testInvoiceId);
      expect(response.body.data).toHaveProperty('customerName');
      expect(response.body.data).toHaveProperty('lineItems');
      expect(response.body.data).toHaveProperty('payments');
      expect(Array.isArray(response.body.data.payments)).toBe(true);
    });

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL).get(`/api/invoices/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/invoices/:id', () => {
    it('should update an existing invoice', async () => {
      const updates = {
        customerName: 'Updated Invoice Customer',
        status: 'Sent',
        notes: 'Updated notes for testing'
      };
      
      const response = await request(API_URL)
        .put(`/api/invoices/${testInvoiceId}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.customerName).toBe('Updated Invoice Customer');
      expect(response.body.data.status).toBe('Sent');
    });

    it('should return 404 when updating non-existent invoice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updates = { status: 'Sent' };
      
      const response = await request(API_URL)
        .put(`/api/invoices/${fakeId}`)
        .send(updates);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/invoices/:id/payments', () => {
    it('should record a payment against an invoice', async () => {
      const payment = {
        amount: 500,
        paymentDate: '2025-05-25',
        paymentMethod: 'credit_card',
        transactionId: 'TXN-12345',
        notes: 'Partial payment'
      };
      
      const response = await request(API_URL)
        .post(`/api/invoices/${testInvoiceId}/payments`)
        .send(payment);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('payment');
      expect(response.body.data).toHaveProperty('invoice');
      expect(response.body.data.payment.amount).toBe(500);
      expect(response.body.data.invoice.amountPaid).toBeGreaterThan(0);
    });

    it('should return 400 when amount is missing or invalid', async () => {
      const invalidPayment = {
        paymentMethod: 'cash'
      };
      
      const response = await request(API_URL)
        .post(`/api/invoices/${testInvoiceId}/payments`)
        .send(invalidPayment);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when paymentMethod is missing', async () => {
      const invalidPayment = {
        amount: 100
      };
      
      const response = await request(API_URL)
        .post(`/api/invoices/${testInvoiceId}/payments`)
        .send(invalidPayment);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const payment = {
        amount: 100,
        paymentMethod: 'cash'
      };
      
      const response = await request(API_URL)
        .post(`/api/invoices/${fakeId}/payments`)
        .send(payment);
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/invoices/:id/payments', () => {
    it('should return all payments for an invoice', async () => {
      const response = await request(API_URL)
        .get(`/api/invoices/${testInvoiceId}/payments`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL)
        .get(`/api/invoices/${fakeId}/payments`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/invoices/:id', () => {
    it('should void an invoice (soft delete)', async () => {
      const response = await request(API_URL)
        .delete(`/api/invoices/${testInvoiceId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('Void');
    });

    it('should return 404 when voiding non-existent invoice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL)
        .delete(`/api/invoices/${fakeId}`);
      
      expect(response.status).toBe(404);
    });
  });
});
