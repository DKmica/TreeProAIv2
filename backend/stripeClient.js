const Stripe = require('stripe');

function getRequiredEnv(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

async function getUncachableStripeClient() {
  const secretKey = getRequiredEnv('STRIPE_SECRET_KEY');

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

async function getStripePublishableKey() {
  return getRequiredEnv('STRIPE_PUBLISHABLE_KEY');
}

async function getStripeSecretKey() {
  return getRequiredEnv('STRIPE_SECRET_KEY');
}

async function getStripeWebhookSecret() {
  return getRequiredEnv('STRIPE_WEBHOOK_SECRET');
}

module.exports = {
  getUncachableStripeClient,
  getStripePublishableKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
};
