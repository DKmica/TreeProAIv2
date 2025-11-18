import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Quotes API Integration Tests', () => {
  let testQuoteId: string;

  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  describe('GET /api/quotes', () => {
    it('should return list of all quotes', async () => {
      const response = await request(API_URL).get('/api/quotes');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/quotes', () => {
    it('should create a new quote with line items', async () => {
      const newQuote = {
        customerName: 'Quote Test Customer',
        lineItems: [
          {
            description: 'Tree Removal',
            quantity: 1,
            price: 500
          },
          {
            description: 'Stump Grinding',
            quantity: 1,
            price: 150
          }
        ],
        taxRate: 8.5,
        termsAndConditions: 'Payment due within 30 days',
        validUntil: '2025-12-31'
      };
      
      const response = await request(API_URL)
        .post('/api/quotes')
        .send(newQuote);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('quoteNumber');
      expect(response.body.data.customerName).toBe('Quote Test Customer');
      expect(response.body.data.lineItems).toHaveLength(2);
      expect(response.body.data.totalAmount).toBeGreaterThan(0);
      
      testQuoteId = response.body.data.id;
    });

    it('should return 400 when customerName is missing', async () => {
      const invalidQuote = {
        lineItems: [{ description: 'Service', quantity: 1, price: 100 }]
      };
      
      const response = await request(API_URL)
        .post('/api/quotes')
        .send(invalidQuote);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when lineItems is missing', async () => {
      const invalidQuote = {
        customerName: 'Test Customer'
      };
      
      const response = await request(API_URL)
        .post('/api/quotes')
        .send(invalidQuote);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/quotes/:id', () => {
    it('should return a single quote', async () => {
      const response = await request(API_URL).get(`/api/quotes/${testQuoteId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testQuoteId);
      expect(response.body.data).toHaveProperty('customerName');
      expect(response.body.data).toHaveProperty('lineItems');
      expect(response.body.data).toHaveProperty('quoteNumber');
    });

    it('should return 404 for non-existent quote', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL).get(`/api/quotes/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/quotes/:id', () => {
    it('should update an existing quote', async () => {
      const updates = {
        customerName: 'Updated Customer Name',
        status: 'Sent',
        termsAndConditions: 'Updated terms'
      };
      
      const response = await request(API_URL)
        .put(`/api/quotes/${testQuoteId}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.customerName).toBe('Updated Customer Name');
      expect(response.body.data.status).toBe('Sent');
    });

    it('should return 404 when updating non-existent quote', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updates = { status: 'Sent' };
      
      const response = await request(API_URL)
        .put(`/api/quotes/${fakeId}`)
        .send(updates);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/quotes/:id/approve', () => {
    it('should approve a quote', async () => {
      const approvalData = {
        approvedBy: 'Test Manager',
        notes: 'Approved for integration testing'
      };
      
      const response = await request(API_URL)
        .post(`/api/quotes/${testQuoteId}/approve`)
        .send(approvalData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.approvalStatus).toBe('approved');
      expect(response.body.data).toHaveProperty('approvedAt');
    });

    it('should return 404 for non-existent quote', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL)
        .post(`/api/quotes/${fakeId}/approve`)
        .send({ approvedBy: 'Test' });
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/quotes/:id/convert-to-job', () => {
    it('should convert an approved quote to a job', async () => {
      const jobData = {
        scheduledDate: '2025-06-15'
      };
      
      const response = await request(API_URL)
        .post(`/api/quotes/${testQuoteId}/convert-to-job`)
        .send(jobData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('job');
      expect(response.body.data.job).toHaveProperty('id');
      expect(response.body.data.job.quoteId).toBe(testQuoteId);
    });

    it('should return 404 for non-existent quote', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL)
        .post(`/api/quotes/${fakeId}/convert-to-job`)
        .send({ scheduledDate: '2025-06-15' });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/quotes/:id', () => {
    it('should soft delete a quote', async () => {
      const response = await request(API_URL)
        .delete(`/api/quotes/${testQuoteId}`);
      
      expect(response.status).toBe(204);
    });

    it('should return 404 when deleting already deleted quote', async () => {
      const response = await request(API_URL)
        .delete(`/api/quotes/${testQuoteId}`);
      
      expect(response.status).toBe(404);
    });
  });
});
