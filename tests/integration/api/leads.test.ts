import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Leads API Integration Tests', () => {
  let testLeadId: string;

  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  describe('GET /api/leads', () => {
    it('should return list of all leads with customer info', async () => {
      const response = await request(API_URL).get('/api/leads');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const lead = response.body[0];
        expect(lead).toHaveProperty('id');
        expect(lead).toHaveProperty('customer');
      }
    });
  });

  describe('POST /api/leads', () => {
    it('should create a new lead', async () => {
      const newLead = {
        source: 'Website',
        status: 'New',
        priority: 'high',
        leadScore: 75,
        description: 'Integration test lead',
        estimatedValue: 5000
      };
      
      const response = await request(API_URL)
        .post('/api/leads')
        .send(newLead);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.source).toBe('Website');
      expect(response.body.status).toBe('New');
      expect(response.body.priority).toBe('high');
      
      testLeadId = response.body.id;
    });

    it('should create a lead with default values when optional fields omitted', async () => {
      const minimalLead = {
        source: 'Referral'
      };
      
      const response = await request(API_URL)
        .post('/api/leads')
        .send(minimalLead);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('New');
      expect(response.body.priority).toBe('medium');
      expect(response.body.leadScore).toBe(50);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('should return a single lead with customer info', async () => {
      const response = await request(API_URL).get(`/api/leads/${testLeadId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testLeadId);
      expect(response.body).toHaveProperty('source');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('customer');
    });

    it('should return 404 for non-existent lead', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL).get(`/api/leads/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/leads/:id', () => {
    it('should update an existing lead', async () => {
      const updates = {
        status: 'Contacted',
        priority: 'medium',
        leadScore: 80,
        estimatedValue: 6000
      };
      
      const response = await request(API_URL)
        .put(`/api/leads/${testLeadId}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Contacted');
      expect(response.body.priority).toBe('medium');
      expect(response.body.leadScore).toBe(80);
    });

    it('should return 404 when updating non-existent lead', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updates = { status: 'Contacted' };
      
      const response = await request(API_URL)
        .put(`/api/leads/${fakeId}`)
        .send(updates);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/leads/:id', () => {
    it('should delete a lead', async () => {
      const response = await request(API_URL)
        .delete(`/api/leads/${testLeadId}`);
      
      expect(response.status).toBe(204);
    });

    it('should return 404 when deleting non-existent lead', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL)
        .delete(`/api/leads/${fakeId}`);
      
      expect(response.status).toBe(404);
    });
  });
});
