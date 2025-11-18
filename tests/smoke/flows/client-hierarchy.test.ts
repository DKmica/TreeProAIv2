import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Client Hierarchy Creation Workflow', () => {
  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('should create a complete client hierarchy with properties and contacts', async () => {
    const timestamp = Date.now();
    
    // Step 1: Create a client (parent entity)
    const clientData = {
      firstName: 'Michael',
      lastName: 'Anderson',
      primaryEmail: `michael.anderson.${timestamp}@example.com`,
      primaryPhone: '555-0987',
      clientType: 'commercial',
      companyName: 'Anderson Property Management LLC',
      notes: 'Managing multiple properties in the area'
    };
    
    const clientResponse = await request(API_URL)
      .post('/api/clients')
      .send(clientData);
    
    expect(clientResponse.status).toBe(201);
    expect(clientResponse.body.success).toBe(true);
    expect(clientResponse.body.data).toHaveProperty('id');
    expect(clientResponse.body.data.firstName).toBe('Michael');
    expect(clientResponse.body.data.lastName).toBe('Anderson');
    expect(clientResponse.body.data.companyName).toBe('Anderson Property Management LLC');
    
    const clientId = clientResponse.body.data.id;
    
    // Step 2: Add first property to the client
    const property1Data = {
      propertyName: 'Oakwood Apartments',
      addressLine1: '100 Oakwood Drive',
      city: 'Springfield',
      state: 'IL'
    };
    
    const property1Response = await request(API_URL)
      .post(`/api/clients/${clientId}/properties`)
      .send(property1Data);
    
    expect(property1Response.status).toBe(201);
    expect(property1Response.body.success).toBe(true);
    expect(property1Response.body.data).toHaveProperty('id');
    expect(property1Response.body.data.propertyName).toBe('Oakwood Apartments');
    expect(property1Response.body.data.addressLine1).toBe('100 Oakwood Drive');
    
    const property1Id = property1Response.body.data.id;
    
    // Step 3: Add second property to the client
    const property2Data = {
      propertyName: 'Maple Grove Shopping Center',
      addressLine1: '200 Maple Grove Road',
      city: 'Springfield',
      state: 'IL'
    };
    
    const property2Response = await request(API_URL)
      .post(`/api/clients/${clientId}/properties`)
      .send(property2Data);
    
    expect(property2Response.status).toBe(201);
    expect(property2Response.body.success).toBe(true);
    const property2Id = property2Response.body.data.id;
    
    // Step 4: Add third property to the client
    const property3Data = {
      propertyName: 'Riverside Office Park',
      addressLine1: '300 Riverside Drive',
      city: 'Springfield',
      state: 'IL'
    };
    
    const property3Response = await request(API_URL)
      .post(`/api/clients/${clientId}/properties`)
      .send(property3Data);
    
    expect(property3Response.status).toBe(201);
    const property3Id = property3Response.body.data.id;
    
    // Step 5: Add primary contact to the client
    const contact1Data = {
      firstName: 'David',
      lastName: 'Martinez',
      email: `david.martinez.${timestamp}@andersonpm.com`,
      phone: '555-1111',
      role: 'Property Manager'
    };
    
    const contact1Response = await request(API_URL)
      .post(`/api/clients/${clientId}/contacts`)
      .send(contact1Data);
    
    expect(contact1Response.status).toBe(201);
    expect(contact1Response.body.success).toBe(true);
    expect(contact1Response.body.data).toHaveProperty('id');
    expect(contact1Response.body.data.firstName).toBe('David');
    expect(contact1Response.body.data.role).toBe('Property Manager');
    
    const contact1Id = contact1Response.body.data.id;
    
    // Step 6: Add secondary contact to the client
    const contact2Data = {
      firstName: 'Lisa',
      lastName: 'Thompson',
      email: `lisa.thompson.${timestamp}@andersonpm.com`,
      phone: '555-2222',
      role: 'Maintenance Supervisor'
    };
    
    const contact2Response = await request(API_URL)
      .post(`/api/clients/${clientId}/contacts`)
      .send(contact2Data);
    
    expect(contact2Response.status).toBe(201);
    const contact2Id = contact2Response.body.data.id;
    
    // Step 7: Add billing contact to the client
    const contact3Data = {
      firstName: 'James',
      lastName: 'Chen',
      email: `james.chen.${timestamp}@andersonpm.com`,
      phone: '555-3333',
      role: 'Accounts Payable'
    };
    
    const contact3Response = await request(API_URL)
      .post(`/api/clients/${clientId}/contacts`)
      .send(contact3Data);
    
    expect(contact3Response.status).toBe(201);
    const contact3Id = contact3Response.body.data.id;
    
    // Step 8: Verify all properties are linked to the client
    const propertiesResponse = await request(API_URL)
      .get(`/api/clients/${clientId}/properties`);
    
    expect(propertiesResponse.status).toBe(200);
    expect(propertiesResponse.body.success).toBe(true);
    expect(Array.isArray(propertiesResponse.body.data)).toBe(true);
    expect(propertiesResponse.body.data).toHaveLength(3);
    
    const properties = propertiesResponse.body.data;
    const propertyNames = properties.map(p => p.propertyName);
    expect(propertyNames).toContain('Oakwood Apartments');
    expect(propertyNames).toContain('Maple Grove Shopping Center');
    expect(propertyNames).toContain('Riverside Office Park');
    
    // Step 9: Verify all contacts are linked to the client
    const contactsResponse = await request(API_URL)
      .get(`/api/clients/${clientId}/contacts`);
    
    expect(contactsResponse.status).toBe(200);
    expect(contactsResponse.body.success).toBe(true);
    expect(Array.isArray(contactsResponse.body.data)).toBe(true);
    expect(contactsResponse.body.data).toHaveLength(3);
    
    const contacts = contactsResponse.body.data;
    const contactRoles = contacts.map(c => c.role);
    expect(contactRoles).toContain('Property Manager');
    expect(contactRoles).toContain('Maintenance Supervisor');
    expect(contactRoles).toContain('Accounts Payable');
    
    // Verify contact names are correct
    const contactNames = contacts.map(c => c.firstName);
    expect(contactNames).toContain('David');
    expect(contactNames).toContain('Lisa');
    expect(contactNames).toContain('James');
    
    // Step 10: Fetch client and verify complete hierarchy
    const fullClientResponse = await request(API_URL)
      .get(`/api/clients/${clientId}`);
    
    expect(fullClientResponse.status).toBe(200);
    expect(fullClientResponse.body.success).toBe(true);
    expect(fullClientResponse.body.data.id).toBe(clientId);
    expect(fullClientResponse.body.data.firstName).toBe('Michael');
    expect(fullClientResponse.body.data.lastName).toBe('Anderson');
    
    // Step 11: Verify relationships work correctly by creating a quote for a specific property
    const quoteForPropertyData = {
      clientId: clientId,
      propertyId: property1Id,
      customerName: 'Michael Anderson',
      lineItems: [
        {
          description: 'Quarterly Tree Trimming - Oakwood Apartments',
          quantity: 1,
          price: 1200
        }
      ],
      taxRate: 8.0,
      termsAndConditions: 'Net 30',
      validUntil: '2025-09-30'
    };
    
    const quoteResponse = await request(API_URL)
      .post('/api/quotes')
      .send(quoteForPropertyData);
    
    expect(quoteResponse.status).toBe(201);
    expect(quoteResponse.body.data.clientId).toBe(clientId);
    expect(quoteResponse.body.data.propertyId).toBe(property1Id);
    
    const quoteId = quoteResponse.body.data.id;
    
    // Cleanup: Delete all test data
    await request(API_URL).delete(`/api/quotes/${quoteId}`);
    await request(API_URL).delete(`/api/clients/${clientId}`);
  });
});
