import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Lead to Client Conversion Workflow', () => {
  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('should successfully convert a lead through the complete sales workflow', async () => {
    const timestamp = Date.now();
    
    // Step 1: Create a new lead from a prospect
    const leadData = {
      source: 'Website',
      status: 'New',
      priority: 'high',
      description: 'Customer interested in tree removal for large oak tree',
      estimatedValue: 5000,
      leadScore: 85
    };
    
    const leadResponse = await request(API_URL)
      .post('/api/leads')
      .send(leadData);
    
    expect(leadResponse.status).toBe(201);
    expect(leadResponse.body).toHaveProperty('id');
    expect(leadResponse.body.source).toBe('Website');
    expect(leadResponse.body.status).toBe('New');
    expect(leadResponse.body.priority).toBe('high');
    
    const leadId = leadResponse.body.id;
    
    // Step 2: Update lead status to "Contacted" after initial outreach
    const contactedResponse = await request(API_URL)
      .put(`/api/leads/${leadId}`)
      .send({ status: 'Contacted' });
    
    expect(contactedResponse.status).toBe(200);
    expect(contactedResponse.body.status).toBe('Contacted');
    
    // Step 3: Update lead status to "Qualified" after site visit
    const qualifiedResponse = await request(API_URL)
      .put(`/api/leads/${leadId}`)
      .send({ status: 'Qualified' });
    
    expect(qualifiedResponse.status).toBe(200);
    expect(qualifiedResponse.body.status).toBe('Qualified');
    
    // Step 4: Create a full client from the qualified lead
    const clientData = {
      firstName: 'John',
      lastName: 'Smith',
      primaryEmail: `john.smith.${timestamp}@example.com`,
      primaryPhone: '555-0123',
      clientType: 'residential'
    };
    
    const clientResponse = await request(API_URL)
      .post('/api/clients')
      .send(clientData);
    
    expect(clientResponse.status).toBe(201);
    expect(clientResponse.body).toHaveProperty('success', true);
    expect(clientResponse.body.data).toHaveProperty('id');
    expect(clientResponse.body.data.firstName).toBe('John');
    expect(clientResponse.body.data.lastName).toBe('Smith');
    expect(clientResponse.body.data.primaryEmail).toBe(`john.smith.${timestamp}@example.com`);
    expect(clientResponse.body.data.clientType).toBe('residential');
    
    const clientId = clientResponse.body.data.id;
    
    // Step 5: Verify client was created successfully by fetching it
    const verifyClientResponse = await request(API_URL)
      .get(`/api/clients/${clientId}`);
    
    expect(verifyClientResponse.status).toBe(200);
    expect(verifyClientResponse.body.success).toBe(true);
    expect(verifyClientResponse.body.data.id).toBe(clientId);
    expect(verifyClientResponse.body.data.firstName).toBe('John');
    
    // Step 6: Mark lead as converted by deleting it
    const deleteLeadResponse = await request(API_URL)
      .delete(`/api/leads/${leadId}`);
    
    expect(deleteLeadResponse.status).toBe(204);
    
    // Step 7: Verify lead was deleted
    const verifyDeleteResponse = await request(API_URL)
      .get(`/api/leads/${leadId}`);
    
    expect(verifyDeleteResponse.status).toBe(404);
    
    // Cleanup: Delete the test client
    await request(API_URL).delete(`/api/clients/${clientId}`);
  });
});
