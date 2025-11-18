import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Clients API Integration Tests', () => {
  let testClientId: string;
  let testPropertyId: string;
  let testContactId: string;

  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  describe('GET /api/clients', () => {
    it('should return list of all clients', async () => {
      const response = await request(API_URL).get('/api/clients');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/clients', () => {
    it('should create a new client with required fields', async () => {
      const newClient = {
        firstName: 'Integration',
        lastName: 'TestClient',
        primaryEmail: 'integration.test@example.com',
        primaryPhone: '555-1234',
        clientType: 'residential'
      };
      
      const response = await request(API_URL)
        .post('/api/clients')
        .send(newClient);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.firstName).toBe('Integration');
      expect(response.body.data.lastName).toBe('TestClient');
      expect(response.body.data.primaryEmail).toBe('integration.test@example.com');
      
      testClientId = response.body.data.id;
    });

    it('should return 400 when firstName is missing', async () => {
      const invalidClient = {
        lastName: 'TestClient',
        primaryEmail: 'test@example.com',
        primaryPhone: '555-1234'
      };
      
      const response = await request(API_URL)
        .post('/api/clients')
        .send(invalidClient);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when lastName is missing', async () => {
      const invalidClient = {
        firstName: 'Test',
        primaryEmail: 'test@example.com',
        primaryPhone: '555-1234'
      };
      
      const response = await request(API_URL)
        .post('/api/clients')
        .send(invalidClient);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/clients/:id', () => {
    it('should return a single client with stats', async () => {
      const response = await request(API_URL).get(`/api/clients/${testClientId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testClientId);
      expect(response.body.data).toHaveProperty('firstName');
      expect(response.body.data).toHaveProperty('lastName');
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL).get(`/api/clients/${fakeId}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/clients/:id', () => {
    it('should update an existing client', async () => {
      const updates = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        clientType: 'commercial'
      };
      
      const response = await request(API_URL)
        .put(`/api/clients/${testClientId}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.firstName).toBe('UpdatedFirst');
      expect(response.body.data.lastName).toBe('UpdatedLast');
      expect(response.body.data.clientType).toBe('commercial');
    });

    it('should return 404 when updating non-existent client', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updates = { firstName: 'Test' };
      
      const response = await request(API_URL)
        .put(`/api/clients/${fakeId}`)
        .send(updates);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/clients/:clientId/properties', () => {
    it('should add a property to a client', async () => {
      const newProperty = {
        propertyName: 'Test Property',
        addressLine1: '123 Test St',
        city: 'TestCity',
        state: 'TS',
        zipCode: '12345'
      };
      
      const response = await request(API_URL)
        .post(`/api/clients/${testClientId}/properties`)
        .send(newProperty);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.propertyName).toBe('Test Property');
      
      testPropertyId = response.body.data.id;
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const newProperty = {
        propertyName: 'Test Property',
        addressLine1: '123 Test St'
      };
      
      const response = await request(API_URL)
        .post(`/api/clients/${fakeId}/properties`)
        .send(newProperty);
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/clients/:clientId/properties', () => {
    it('should return all properties for a client', async () => {
      const response = await request(API_URL)
        .get(`/api/clients/${testClientId}/properties`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/clients/:clientId/contacts', () => {
    it('should add a contact to a client', async () => {
      const newContact = {
        firstName: 'Contact',
        lastName: 'Person',
        email: 'contact@example.com',
        phone: '555-5678',
        role: 'Manager'
      };
      
      const response = await request(API_URL)
        .post(`/api/clients/${testClientId}/contacts`)
        .send(newContact);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.firstName).toBe('Contact');
      
      testContactId = response.body.data.id;
    });

    it('should return 400 when firstName is missing', async () => {
      const invalidContact = {
        lastName: 'Person',
        email: 'contact@example.com'
      };
      
      const response = await request(API_URL)
        .post(`/api/clients/${testClientId}/contacts`)
        .send(invalidContact);
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/clients/:clientId/contacts', () => {
    it('should return all contacts for a client', async () => {
      const response = await request(API_URL)
        .get(`/api/clients/${testClientId}/contacts`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/clients/:id', () => {
    it('should soft delete a client', async () => {
      const response = await request(API_URL)
        .delete(`/api/clients/${testClientId}`);
      
      expect(response.status).toBe(204);
    });

    it('should return 404 when deleting already deleted client', async () => {
      const response = await request(API_URL)
        .delete(`/api/clients/${testClientId}`);
      
      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting non-existent client', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_URL)
        .delete(`/api/clients/${fakeId}`);
      
      expect(response.status).toBe(404);
    });
  });
});
