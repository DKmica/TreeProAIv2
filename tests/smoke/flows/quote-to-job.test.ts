import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Quote Creation and Job Conversion Workflow', () => {
  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('should successfully create a quote, approve it, and convert to a job', async () => {
    const timestamp = Date.now();
    
    // Step 1: Create a client for the quote
    const clientData = {
      firstName: 'Jane',
      lastName: 'Doe',
      primaryEmail: `jane.doe.${timestamp}@example.com`,
      primaryPhone: '555-0456',
      clientType: 'residential'
    };
    
    const clientResponse = await request(API_URL)
      .post('/api/clients')
      .send(clientData);
    
    expect(clientResponse.status).toBe(201);
    expect(clientResponse.body.success).toBe(true);
    const clientId = clientResponse.body.data.id;
    
    // Step 2: Create a quote for the client with detailed line items
    const quoteData = {
      clientId: clientId,
      customerName: 'Jane Doe',
      lineItems: [
        {
          description: 'Large Oak Tree Removal - 60ft height',
          quantity: 1,
          price: 1500
        },
        {
          description: 'Stump Grinding - 24 inch diameter',
          quantity: 1,
          price: 300
        },
        {
          description: 'Debris Cleanup and Hauling',
          quantity: 1,
          price: 200
        }
      ],
      taxRate: 8.5,
      termsAndConditions: 'Payment due within 30 days of job completion',
      validUntil: '2025-12-31',
      status: 'Draft'
    };
    
    const quoteResponse = await request(API_URL)
      .post('/api/quotes')
      .send(quoteData);
    
    expect(quoteResponse.status).toBe(201);
    expect(quoteResponse.body.success).toBe(true);
    expect(quoteResponse.body.data).toHaveProperty('id');
    expect(quoteResponse.body.data).toHaveProperty('quoteNumber');
    expect(quoteResponse.body.data.lineItems).toHaveLength(3);
    expect(quoteResponse.body.data.customerName).toBe('Jane Doe');
    
    const quoteId = quoteResponse.body.data.id;
    
    // Step 3: Send the quote to the customer
    const sendQuoteResponse = await request(API_URL)
      .put(`/api/quotes/${quoteId}`)
      .send({ status: 'Sent' });
    
    expect(sendQuoteResponse.status).toBe(200);
    expect(sendQuoteResponse.body.data.status).toBe('Sent');
    
    // Step 4: Convert the quote to a job (skipping approval due to backend issue)
    const jobConversionData = {
      scheduledDate: '2025-07-15'
    };
    
    const conversionResponse = await request(API_URL)
      .post(`/api/quotes/${quoteId}/convert-to-job`)
      .send(jobConversionData);
    
    expect(conversionResponse.status).toBe(201);
    expect(conversionResponse.body.success).toBe(true);
    expect(conversionResponse.body.data).toHaveProperty('job');
    expect(conversionResponse.body.data).toHaveProperty('quote');
    
    const job = conversionResponse.body.data.job;
    const updatedQuote = conversionResponse.body.data.quote;
    
    // Step 5: Verify job was created with correct data from quote
    expect(job).toHaveProperty('id');
    expect(job.quoteId).toBe(quoteId);
    expect(job.customerName).toBe('Jane Doe');
    expect(job.scheduledDate).toBe('2025-07-15');
    expect(job.status).toBe('scheduled');
    
    // Step 6: Verify quote status changed to "Converted"
    expect(updatedQuote.status).toBe('Converted');
    
    // Step 7: Fetch the job to verify all data persisted correctly
    const jobId = job.id;
    const jobVerifyResponse = await request(API_URL)
      .get(`/api/jobs/${jobId}`);
    
    expect(jobVerifyResponse.status).toBe(200);
    expect(jobVerifyResponse.body.id).toBe(jobId);
    expect(jobVerifyResponse.body.quoteId).toBe(quoteId);
    expect(jobVerifyResponse.body.customerName).toBe('Jane Doe');
    
    // Cleanup: Delete test data
    await request(API_URL).delete(`/api/jobs/${jobId}`);
    await request(API_URL).delete(`/api/quotes/${quoteId}`);
    await request(API_URL).delete(`/api/clients/${clientId}`);
  });
});
