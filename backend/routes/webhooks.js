const express = require('express');
const router = express.Router();
const db = require('../db');
const stripeService = require('../services/stripeService');
const { getStripeSecretKey, getStripeWebhookSecret } = require('../stripeClient');

let cachedStripeSecretKey = null;
let cachedWebhookSecret = null;
let stripeInitialized = false;

(async () => {
  try {
    cachedStripeSecretKey = await getStripeSecretKey();
    cachedWebhookSecret = await getStripeWebhookSecret();
    if (cachedStripeSecretKey && cachedWebhookSecret) {
      stripeInitialized = true;
      console.log('✅ Webhook module: Stripe initialized');
    }
  } catch (err) {
    console.warn('⚠️ Webhook module: Stripe credentials missing');
  }
})();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || !stripeInitialized) {
    return res.status(400).json({ error: 'Webhook not ready or missing signature' });
  }

  try {
    const stripe = require('stripe')(cachedStripeSecretKey);
    const event = stripe.webhooks.constructEvent(req.body, signature, cachedWebhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId && session.payment_status === 'paid') {
        const clientId = await stripeService.updateInvoiceAfterPayment(invoiceId, session, 'Credit Card');
        if (clientId && session.customer) {
          await db.query('UPDATE clients SET stripe_customer_id = $1 WHERE id = $2', [session.customer, clientId]);
        }
      }
    } 

    res.json({ received: true });
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

module.exports = router;