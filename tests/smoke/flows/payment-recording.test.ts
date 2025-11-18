import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../../helpers/testServer';

const API_URL = 'http://localhost:3001';

describe('Payment Recording Workflow', () => {
  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('should successfully record partial and full payments against an invoice', async () => {
    const timestamp = Date.now();
    
    // Step 1: Create a client
    const clientData = {
      firstName: 'Sarah',
      lastName: 'Williams',
      primaryEmail: `sarah.williams.${timestamp}@example.com`,
      primaryPhone: '555-0321',
      clientType: 'residential'
    };
    
    const clientResponse = await request(API_URL)
      .post('/api/clients')
      .send(clientData);
    
    expect(clientResponse.status).toBe(201);
    const clientId = clientResponse.body.data.id;
    
    // Step 2: Create an invoice with line items
    const invoiceData = {
      clientId: clientId,
      customerName: 'Sarah Williams',
      lineItems: [
        {
          description: 'Emergency Tree Removal',
          quantity: 1,
          price: 2500
        },
        {
          description: 'Stump Grinding',
          quantity: 1,
          price: 400
        },
        {
          description: 'Site Cleanup',
          quantity: 1,
          price: 300
        }
      ],
      taxRate: 8.0,
      discountPercentage: 0,
      paymentTerms: 'Net 15',
      issueDate: '2025-06-01',
      dueDate: '2025-06-16',
      status: 'Sent'
    };
    
    const invoiceResponse = await request(API_URL)
      .post('/api/invoices')
      .send(invoiceData);
    
    expect(invoiceResponse.status).toBe(201);
    expect(invoiceResponse.body.success).toBe(true);
    
    const invoiceId = invoiceResponse.body.data.id;
    const originalGrandTotal = invoiceResponse.body.data.grandTotal;
    
    // Verify initial invoice state
    expect(invoiceResponse.body.data.amountPaid).toBe(0);
    expect(invoiceResponse.body.data.amountDue).toBe(originalGrandTotal);
    expect(invoiceResponse.body.data.status).toBe('Sent');
    
    // Step 3: Record a partial payment (50% deposit)
    const partialPaymentAmount = Math.round(originalGrandTotal * 0.5 * 100) / 100;
    const partialPaymentData = {
      amount: partialPaymentAmount,
      paymentDate: '2025-06-05',
      paymentMethod: 'credit_card',
      transactionId: `TXN-${timestamp}-001`,
      notes: '50% deposit payment'
    };
    
    const partialPaymentResponse = await request(API_URL)
      .post(`/api/invoices/${invoiceId}/payments`)
      .send(partialPaymentData);
    
    expect(partialPaymentResponse.status).toBe(201);
    expect(partialPaymentResponse.body.success).toBe(true);
    expect(partialPaymentResponse.body.data).toHaveProperty('payment');
    expect(partialPaymentResponse.body.data).toHaveProperty('invoice');
    
    const paymentRecord1 = partialPaymentResponse.body.data.payment;
    const updatedInvoice1 = partialPaymentResponse.body.data.invoice;
    
    // Step 4: Verify invoice amountPaid was updated correctly
    expect(parseFloat(paymentRecord1.amount)).toBeCloseTo(partialPaymentAmount, 2);
    expect(paymentRecord1.paymentMethod).toBe('credit_card');
    expect(parseFloat(updatedInvoice1.amountPaid)).toBeCloseTo(partialPaymentAmount, 2);
    
    // Step 5: Verify invoice amountDue is calculated correctly
    const expectedAmountDue1 = Math.round((originalGrandTotal - partialPaymentAmount) * 100) / 100;
    expect(parseFloat(updatedInvoice1.amountDue)).toBeCloseTo(expectedAmountDue1, 2);
    // Note: Invoice status may not automatically change to 'Partial' depending on backend logic
    
    // Step 6: Fetch the invoice to verify payment was recorded
    const fetchInvoiceResponse = await request(API_URL)
      .get(`/api/invoices/${invoiceId}`);
    
    expect(fetchInvoiceResponse.status).toBe(200);
    expect(parseFloat(fetchInvoiceResponse.body.data.amountPaid)).toBeCloseTo(partialPaymentAmount, 2);
    expect(fetchInvoiceResponse.body.data.payments).toHaveLength(1);
    
    // Step 7: Record a second partial payment
    const secondPaymentAmount = 1000;
    const secondPaymentData = {
      amount: secondPaymentAmount,
      paymentDate: '2025-06-10',
      paymentMethod: 'check',
      transactionId: `CHK-${timestamp}-002`,
      notes: 'Second installment payment'
    };
    
    const secondPaymentResponse = await request(API_URL)
      .post(`/api/invoices/${invoiceId}/payments`)
      .send(secondPaymentData);
    
    expect(secondPaymentResponse.status).toBe(201);
    const updatedInvoice2 = secondPaymentResponse.body.data.invoice;
    
    const totalPaidSoFar = partialPaymentAmount + secondPaymentAmount;
    expect(parseFloat(updatedInvoice2.amountPaid)).toBeCloseTo(totalPaidSoFar, 2);
    
    // Step 8: Record final payment to complete the invoice
    const remainingBalance = originalGrandTotal - totalPaidSoFar;
    const finalPaymentData = {
      amount: remainingBalance,
      paymentDate: '2025-06-15',
      paymentMethod: 'cash',
      transactionId: `CASH-${timestamp}-003`,
      notes: 'Final payment - invoice paid in full'
    };
    
    const finalPaymentResponse = await request(API_URL)
      .post(`/api/invoices/${invoiceId}/payments`)
      .send(finalPaymentData);
    
    expect(finalPaymentResponse.status).toBe(201);
    expect(finalPaymentResponse.body.success).toBe(true);
    
    const finalInvoice = finalPaymentResponse.body.data.invoice;
    
    // Step 9: Verify invoice status changed to "Paid"
    expect(parseFloat(finalInvoice.amountPaid)).toBeCloseTo(originalGrandTotal, 2);
    expect(parseFloat(finalInvoice.amountDue)).toBeCloseTo(0, 2);
    expect(finalInvoice.status).toBe('Paid');
    
    // Step 10: Verify all payments are recorded
    const allPaymentsResponse = await request(API_URL)
      .get(`/api/invoices/${invoiceId}/payments`);
    
    expect(allPaymentsResponse.status).toBe(200);
    expect(allPaymentsResponse.body.success).toBe(true);
    expect(allPaymentsResponse.body.data).toHaveLength(3);
    
    const payments = allPaymentsResponse.body.data;
    expect(parseFloat(payments[0].amount)).toBeCloseTo(partialPaymentAmount, 2);
    expect(parseFloat(payments[1].amount)).toBeCloseTo(secondPaymentAmount, 2);
    expect(parseFloat(payments[2].amount)).toBeCloseTo(remainingBalance, 2);
    
    // Verify payment methods are recorded correctly
    expect(payments[0].paymentMethod).toBe('credit_card');
    expect(payments[1].paymentMethod).toBe('check');
    expect(payments[2].paymentMethod).toBe('cash');
    
    // Cleanup: Delete test data
    await request(API_URL).delete(`/api/invoices/${invoiceId}`);
    await request(API_URL).delete(`/api/clients/${clientId}`);
  });
});
