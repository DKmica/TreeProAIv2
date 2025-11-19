const { getUncachableStripeClient } = require('../stripeClient');
const db = require('../db');

class StripeService {
  async createCustomer(email, clientId) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { clientId },
    });
  }

  async createCheckoutSession(customerId, invoiceId, amount, invoiceNumber, customerEmail, successUrl, cancelUrl) {
    const stripe = await getUncachableStripeClient();
    
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoiceNumber}`,
              description: `Payment for invoice ${invoiceNumber}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        invoiceId,
        invoiceNumber,
      },
    };

    if (customerId) {
      sessionConfig.customer = customerId;
    } else {
      sessionConfig.customer_email = customerEmail;
      sessionConfig.customer_creation = 'always';
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    return {
      url: session.url,
      customerId: session.customer,
      sessionId: session.id
    };
  }

  async createCustomerPortalSession(customerId, returnUrl) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getCustomerByEmail(email) {
    const stripe = await getUncachableStripeClient();
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });
    return customers.data.length > 0 ? customers.data[0] : null;
  }

  async retrieveCheckoutSession(sessionId) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.retrieve(sessionId);
  }

  async updateInvoiceAfterPayment(invoiceId, session) {
    const client = await db.getClient();
    try {
      const paymentIntentId = session.payment_intent;
      const amount = session.amount_total / 100;
      const paymentStatus = session.payment_status;
      const currency = session.currency;

      console.log(`🔄 Processing payment for invoice ${invoiceId}`);
      console.log(`   Payment Intent: ${paymentIntentId}`);
      console.log(`   Amount: $${amount}`);
      console.log(`   Currency: ${currency}`);
      console.log(`   Payment Status: ${paymentStatus}`);

      // IDEMPOTENCY: Begin transaction and check for duplicates FIRST before any updates.
      // This prevents partial state changes if Stripe retries the webhook.
      await client.query('BEGIN');

      const { rows: existingPayments } = await client.query(
        'SELECT id FROM payment_records WHERE transaction_id = $1',
        [paymentIntentId]
      );

      if (existingPayments.length > 0) {
        await client.query('ROLLBACK');
        console.log(`⚠️ Duplicate webhook detected for payment_intent ${paymentIntentId}. Skipping to prevent duplicate processing.`);
        return;
      }

      // TODO: For async payment methods (ACH, SEPA, etc.), we need to check PaymentIntent
      // status directly as session.payment_status may not reflect the final state.
      // Current implementation only validates session.payment_status which works for
      // synchronous card payments but may need enhancement for async methods.
      if (paymentStatus !== 'paid') {
        await client.query('ROLLBACK');
        console.error(`❌ Payment not completed for invoice ${invoiceId}. Status: ${paymentStatus}`);
        throw new Error(`Payment not completed. Payment status is '${paymentStatus}', expected 'paid'`);
      }

      console.log(`✅ Payment status validated: ${paymentStatus}`);

      if (currency !== 'usd') {
        await client.query('ROLLBACK');
        console.error(`❌ Invalid currency for invoice ${invoiceId}. Expected: usd, Received: ${currency}`);
        throw new Error(`Invalid currency. Expected 'usd', received '${currency}'`);
      }

      console.log(`✅ Currency validated: ${currency}`);


      const invoiceResult = await client.query(
        'SELECT grand_total, client_id FROM invoices WHERE id = $1',
        [invoiceId]
      );

      if (invoiceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error(`❌ Invoice ${invoiceId} not found`);
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      const invoice = invoiceResult.rows[0];
      const expectedAmount = parseFloat(invoice.grand_total);
      const amountDifference = Math.abs(expectedAmount - amount);

      if (amountDifference > 0.01) {
        await client.query('ROLLBACK');
        console.error(`❌ Payment amount mismatch for invoice ${invoiceId}. Expected: $${expectedAmount}, Received: $${amount}`);
        throw new Error(`Payment amount validation failed. Expected $${expectedAmount}, received $${amount}`);
      }

      console.log(`✅ Amount validated: $${amount} matches invoice grand_total $${expectedAmount}`);

      await client.query(
        `UPDATE invoices 
         SET status = 'Paid', 
             paid_at = NOW(), 
             amount_paid = COALESCE(amount_paid, 0) + $1,
             amount_due = GREATEST(0, COALESCE(amount_due, total_amount, amount) - $1),
             updated_at = NOW()
         WHERE id = $2`,
        [amount, invoiceId]
      );

      await client.query(
        `INSERT INTO payment_records (id, invoice_id, amount, payment_date, payment_method, transaction_id, notes, created_at)
         VALUES (gen_random_uuid(), $1, $2, NOW(), 'Credit Card', $3, 'Stripe payment', NOW())`,
        [invoiceId, amount, paymentIntentId]
      );

      await client.query('COMMIT');
      console.log(`✅ Invoice ${invoiceId} marked as paid. Payment: $${amount}, transaction_id: ${paymentIntentId}`);

      return invoice.client_id;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Error updating invoice after payment:', err);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new StripeService();
