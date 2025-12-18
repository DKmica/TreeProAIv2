const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const db = require('./db');
const { setupAuth } = require('./auth');
const { applyStandardMiddleware } = require('./config/express');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const ragService = require('./services/ragService');
const reminderService = require('./services/reminderService');
const { initializeAutomationEngine, shutdownAutomationEngine } = require('./services/automation');
const { getStripeSecretKey, getStripeWebhookSecret } = require('./stripeClient');
const { mountApiRoutes } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

let server;
let reminderInterval;

let cachedStripeSecretKey = null;
let cachedWebhookSecret = null;
let stripeInitialized = false;

async function initStripe() {
  try {
    console.log('🔄 Fetching and caching Stripe credentials...');
    cachedStripeSecretKey = await getStripeSecretKey();
    cachedWebhookSecret = await getStripeWebhookSecret();

    if (!cachedStripeSecretKey || !cachedWebhookSecret) {
      console.warn('⚠️ Stripe keys are not fully configured. Payment features will be disabled.');
      cachedStripeSecretKey = null;
      cachedWebhookSecret = null;
      stripeInitialized = false;
      return false;
    }

    console.log('✅ Stripe credentials cached');
    stripeInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Stripe:', error.message);
    console.warn('⚠️ Continuing without Stripe integration. Payment features will be unavailable.');
    cachedStripeSecretKey = null;
    cachedWebhookSecret = null;
    stripeInitialized = false;
    return false;
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      console.error('❌ Webhook error: Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }
    
    if (!stripeInitialized) {
      console.error('⚠️ Stripe webhook called but Stripe not initialized');
      return res.status(503).json({ error: 'Stripe not initialized' });
    }
    
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      
      if (!Buffer.isBuffer(req.body)) {
        const errorMsg = 'STRIPE WEBHOOK ERROR: req.body is not a Buffer. ' +
          'This means express.json() ran before this webhook route.';
        console.error(errorMsg);
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      if (!cachedWebhookSecret || !cachedStripeSecretKey) {
        console.error('❌ CRITICAL: Webhook secret not initialized. Rejecting webhook.');
        return res.status(503).json({ error: 'Webhook secret not initialized' });
      }

      const stripe = require('stripe')(cachedStripeSecretKey);
      const event = stripe.webhooks.constructEvent(req.body, sig, cachedWebhookSecret);

      console.log(`📨 Stripe webhook received: ${event.type}`);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const invoiceId = session.metadata?.invoiceId;
        const stripeCustomerId = session.customer;
        
        console.log(`💳 Processing checkout.session.completed for invoice: ${invoiceId}`);
        console.log(`   Payment status: ${session.payment_status}`);
        
        if (invoiceId) {
          if (session.payment_status === 'paid') {
            try {
              const amountPaidCents = session.amount_total || 0;
              const amountPaid = amountPaidCents / 100;
              const paymentMethod = session.payment_method_types?.[0] || 'card';
              
              const stripe = require('stripe')(cachedStripeSecretKey);
              let paymentMethodType = 'Card';
              if (session.payment_intent) {
                const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
                const pmType = paymentIntent.payment_method_types?.[0];
                if (pmType === 'us_bank_account') {
                  paymentMethodType = 'ACH Bank Transfer';
                } else if (pmType === 'card') {
                  paymentMethodType = 'Credit Card';
                }
              }
              
              await db.query(
                `UPDATE invoices 
                 SET status = 'Paid', 
                     paid_at = NOW(), 
                     amount_paid = COALESCE(amount_paid, 0) + $1,
                     amount_due = GREATEST(0, amount_due - $1),
                     payment_method = $2,
                     updated_at = NOW()
                 WHERE id = $3`,
                [amountPaid, paymentMethodType, invoiceId]
              );
              
              const { v4: uuidv4 } = require('uuid');
              await db.query(
                `INSERT INTO payment_records (id, invoice_id, amount, payment_method, payment_date, reference_number, notes)
                 VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
                [
                  uuidv4(),
                  invoiceId,
                  amountPaid,
                  paymentMethodType,
                  session.payment_intent || session.id,
                  `Stripe checkout session: ${session.id}`
                ]
              );

              if (stripeCustomerId) {
                const { rows: invoiceRows } = await db.query(
                  'SELECT client_id FROM invoices WHERE id = $1',
                  [invoiceId]
                );
                
                if (invoiceRows.length > 0 && invoiceRows[0].client_id) {
                  await db.query(
                    'UPDATE clients SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2 AND stripe_customer_id IS NULL',
                    [stripeCustomerId, invoiceRows[0].client_id]
                  );
                }
              }

              console.log(`✅ Invoice ${invoiceId} marked as Paid. Amount: $${amountPaid.toFixed(2)}`);
            } catch (dbError) {
              console.error(`❌ Database error processing checkout for invoice ${invoiceId}:`, dbError);
              return res.status(500).json({ error: 'Database processing error' });
            }
          } else {
            console.log(`🔄 ACH payment processing for invoice: ${invoiceId}`);
            await db.query(
              `UPDATE invoices SET status = 'Processing', updated_at = NOW() WHERE id = $1`,
              [invoiceId]
            );
          }
        }
      }

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoiceId;
        
        if (invoiceId) {
          console.log(`💰 PaymentIntent succeeded for invoice: ${invoiceId}`);
          
          const { rows } = await db.query('SELECT status FROM invoices WHERE id = $1', [invoiceId]);
          if (rows.length > 0 && rows[0].status === 'Processing') {
            const amountPaid = paymentIntent.amount / 100;
            const pmType = paymentIntent.payment_method_types?.[0];
            const paymentMethodType = pmType === 'us_bank_account' ? 'ACH Bank Transfer' : 'Credit Card';
            
            await db.query(
              `UPDATE invoices 
               SET status = 'Paid', 
                   paid_at = NOW(), 
                   amount_paid = COALESCE(amount_paid, 0) + $1,
                   amount_due = GREATEST(0, amount_due - $1),
                   payment_method = $2,
                   updated_at = NOW()
               WHERE id = $3`,
              [amountPaid, paymentMethodType, invoiceId]
            );
            
            const { v4: uuidv4 } = require('uuid');
            await db.query(
              `INSERT INTO payment_records (id, invoice_id, amount, payment_method, payment_date, reference_number, notes)
               VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
              [
                uuidv4(),
                invoiceId,
                amountPaid,
                paymentMethodType,
                paymentIntent.id,
                `ACH payment completed: ${paymentIntent.id}`
              ]
            );
            
            console.log(`✅ ACH payment completed for invoice ${invoiceId}. Amount: $${amountPaid.toFixed(2)}`);
          }
        }
      }

      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoiceId;
        
        if (invoiceId) {
          console.log(`❌ Payment failed for invoice: ${invoiceId}`);
          console.log(`   Failure reason: ${paymentIntent.last_payment_error?.message || 'Unknown'}`);
          
          await db.query(
            `UPDATE invoices SET status = 'Sent', updated_at = NOW() WHERE id = $1 AND status = 'Processing'`,
            [invoiceId]
          );
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('❌ Webhook error:', error.message);
      
      if (error.message && error.message.includes('No signatures found matching the expected signature')) {
        console.error('❌ Webhook signature verification failed:', error.message);
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      if (error.message && error.message.includes('already recorded')) {
        console.log('✅ Webhook already processed (idempotent). Returning 200.');
        return res.status(200).json({ received: true, note: 'Already processed' });
      }
      
      if (error.message && (
        error.message.includes('validation failed') ||
        error.message.includes('Invalid currency') ||
        error.message.includes('not found')
      )) {
        console.error('❌ Webhook validation error:', error.message);
        return res.status(400).json({ error: 'Validation error', details: error.message });
      }
      
      console.error('❌ Webhook processing error (transient):', error.message);
      res.status(500).json({ error: 'Transient processing error' });
    }
  }
);

applyStandardMiddleware(app);

const scheduleFinancialReminders = () => {
  const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const run = async () => {
    try {
      await reminderService.hydrateReminderSchedule();
      await reminderService.runDunningCheck();

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const { rows: quotes } = await db.query("SELECT * FROM quotes WHERE status = 'Sent'");
      quotes.forEach(quote => {
        const createdAt = parseDate(quote.created_at);
        if (!createdAt) return;

        const ageDays = Math.floor((startOfToday.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays >= 14) {
          console.log(`📧 [Quote Follow-up] Quote ${quote.id} for ${quote.customer_name} has been open for ${ageDays} days. Consider a polite follow-up.`);
        }
      });
    } catch (error) {
      console.error('⚠️ Automated reminder check failed:', error.message);
    }
  };

  run();
  reminderInterval = setInterval(run, reminderService.ONE_DAY_MS);
};

async function startServer() {
  await initStripe();
  
  await setupAuth(app);
  
  mountApiRoutes(app);
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  server = app.listen(PORT, HOST, async () => {
    console.log(`Backend server running on http://${HOST}:${PORT}`);

    try {
      await ragService.initialize();
      console.log('🤖 RAG Service ready');
    } catch (error) {
      console.error('⚠️ RAG Service initialization failed:', error);
      console.log('💡 Run POST /api/rag/build to build the vector database');
    }

    scheduleFinancialReminders();

    try {
      initializeAutomationEngine();
      console.log('⚙️ Automation Engine initialized');
    } catch (error) {
      console.error('⚠️ Automation Engine initialization failed:', error);
      console.log('💡 Workflows may not run automatically until this is resolved');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.error('   This error has been caught and will not crash the server.');
      console.error('   The server will remain stopped. Please check for other running instances.');
    } else {
      console.error('❌ Server error:', err);
      shutdown(1);
    }
  });
}

async function shutdown(exitCode = 0) {
  console.log('\n🔄 Initiating graceful shutdown...');
  
  try {
    shutdownAutomationEngine();
    console.log('✅ Automation Engine shut down');
  } catch (error) {
    console.error('⚠️ Error shutting down Automation Engine:', error.message);
  }
  
  if (reminderInterval) {
    clearInterval(reminderInterval);
    console.log('✅ Cleared reminder interval');
  }

  if (server) {
    await new Promise((resolve) => {
      server.close((err) => {
        if (err) {
          console.error('❌ Error closing HTTP server:', err.message);
        } else {
          console.log('✅ HTTP server closed');
        }
        resolve();
      });
    });
  }

  await db.closePool();

  console.log('✅ Graceful shutdown complete');
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

process.on('SIGTERM', () => {
  console.log('📥 SIGTERM received');
  shutdown(0);
});

process.on('SIGINT', () => {
  console.log('📥 SIGINT received');
  shutdown(0);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  shutdown(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown(1);
});

module.exports = {
  app,
  startServer,
  stopServer: shutdown,
  getServer: () => server
};

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
