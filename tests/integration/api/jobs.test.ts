import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Jobs API Integration Tests', () => {
  let testJobId: string;

  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  describe('GET /api/jobs', () => {
    it('should return list of all jobs', async () => {
      const response = await request(API_URL).get('/api/jobs');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const job = response.body[0];
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('status');
      }
    });
  });

  describe('POST /api/jobs', () => {
    it('should create a new job', async () => {
      const newJob = {
        customerName: 'Job Test Customer',
        jobLocation: '456 Oak Ave',
        scheduledDate: '2025-07-01',
        status: 'scheduled',
        specialInstructions: 'Handle with care',
        estimatedHours: 4
      };
      
      const response = await request(API_URL)
        .post('/api/jobs')
        .send(newJob);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.customerName).toBe('Job Test Customer');
      expect(response.body.status).toBe('scheduled');
      expect(response.body.scheduledDate).toBe('2025-07-01');
      
      testJobId = response.body.id;
    });

    it('should create a job with default status', async () => {
      const minimalJob = {
        customerName: 'Minimal Job Customer',
        jobLocation: '789 Pine St'
      };
      
      const response = await request(API_URL)
        .post('/api/jobs')
        .send(minimalJob);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.customerName).toBe('Minimal Job Customer');
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should return a single job', async () => {
      const response = await request(API_URL).get(`/api/jobs/${testJobId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testJobId);
      expect(response.body).toHaveProperty('customerName');
      expect(response.body).toHaveProperty('status');
    });

    it('should return 404 for non-existent job', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL).get(`/api/jobs/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/jobs/:id', () => {
    it('should update an existing job', async () => {
      const updates = {
        customerName: 'Updated Job Customer',
        scheduledDate: '2025-07-15',
        specialInstructions: 'Updated instructions',
        estimatedHours: 6
      };
      
      const response = await request(API_URL)
        .put(`/api/jobs/${testJobId}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body.customerName).toBe('Updated Job Customer');
      expect(response.body.scheduledDate).toBe('2025-07-15');
      expect(response.body.estimatedHours).toBe(6);
    });

    it('should return 404 when updating non-existent job', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updates = { customerName: 'Test' };
      
      const response = await request(API_URL)
        .put(`/api/jobs/${fakeId}`)
        .send(updates);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/jobs/:id/allowed-transitions', () => {
    it('should return allowed state transitions for a job', async () => {
      const response = await request(API_URL)
        .get(`/api/jobs/${testJobId}/allowed-transitions`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('currentState');
      expect(response.body.data).toHaveProperty('allowedTransitions');
      expect(Array.isArray(response.body.data.allowedTransitions)).toBe(true);
    });

    it('should return 404 for non-existent job', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL)
        .get(`/api/jobs/${fakeId}/allowed-transitions`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/jobs/:id/state-transitions', () => {
    it('should transition job to a new state', async () => {
      const transition = {
        toState: 'in_progress',
        reason: 'Job started by crew',
        notes: 'Integration test transition'
      };
      
      const response = await request(API_URL)
        .post(`/api/jobs/${testJobId}/state-transitions`)
        .send(transition);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('job');
      expect(response.body.data).toHaveProperty('transition');
      expect(response.body.data.job.status).toBe('in_progress');
    });

    it('should return 400 when toState is missing', async () => {
      const invalidTransition = {
        reason: 'No state provided'
      };
      
      const response = await request(API_URL)
        .post(`/api/jobs/${testJobId}/state-transitions`)
        .send(invalidTransition);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent job', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const transition = {
        toState: 'in_progress',
        reason: 'Test'
      };
      
      const response = await request(API_URL)
        .post(`/api/jobs/${fakeId}/state-transitions`)
        .send(transition);
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('should delete a job', async () => {
      const response = await request(API_URL)
        .delete(`/api/jobs/${testJobId}`);
      
      expect(response.status).toBe(204);
    });

    it('should return 404 when deleting non-existent job', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL)
        .delete(`/api/jobs/${fakeId}`);
      
      expect(response.status).toBe(404);
    });
  });
});
