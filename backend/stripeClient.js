const Stripe = require('stripe');

let cachedCredentials = null;
let credentialsFetchedAt = 0;
const CACHE_DURATION = 5 * 60 * 1000;

function getRequiredEnv(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

async function getCredentialsFromReplit() {
  if (cachedCredentials && Date.now() - credentialsFetchedAt < CACHE_DURATION) {
    return cachedCredentials;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    return null;
  }

  try {
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    const targetEnvironment = isProduction ? 'production' : 'development';

    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', 'stripe');
    url.searchParams.set('environment', targetEnvironment);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    const data = await response.json();
    const connection = data.items?.[0];

    if (connection?.settings?.publishable && connection?.settings?.secret) {
      cachedCredentials = {
        publishableKey: connection.settings.publishable,
        secretKey: connection.settings.secret,
      };
      credentialsFetchedAt = Date.now();
      return cachedCredentials;
    }
  } catch (err) {
    console.error('Error fetching Stripe credentials from Replit:', err.message);
  }

  return null;
}

async function getStripeCredentials() {
  const envSecretKey = getRequiredEnv('STRIPE_SECRET_KEY');
  const envPublishableKey = getRequiredEnv('STRIPE_PUBLISHABLE_KEY');
  
  if (envSecretKey && envPublishableKey) {
    return {
      secretKey: envSecretKey,
      publishableKey: envPublishableKey,
    };
  }

  const replitCredentials = await getCredentialsFromReplit();
  if (replitCredentials) {
    return replitCredentials;
  }

  return null;
}

async function getUncachableStripeClient() {
  const credentials = await getStripeCredentials();

  if (!credentials?.secretKey) {
    throw new Error('Stripe secret key is not configured. Please set up Stripe integration or add STRIPE_SECRET_KEY environment variable.');
  }

  return new Stripe(credentials.secretKey, {
    apiVersion: '2024-06-20',
  });
}

async function getStripePublishableKey() {
  const credentials = await getStripeCredentials();
  return credentials?.publishableKey || null;
}

async function getStripeSecretKey() {
  const credentials = await getStripeCredentials();
  return credentials?.secretKey || null;
}

async function getStripeWebhookSecret() {
  return getRequiredEnv('STRIPE_WEBHOOK_SECRET');
}

async function fetchAndLogCredentials() {
  console.log('🔄 Fetching and caching Stripe credentials...');
  const credentials = await getStripeCredentials();
  if (credentials?.secretKey && credentials?.publishableKey) {
    console.log('✅ Stripe credentials loaded successfully');
    return true;
  } else {
    console.log('⚠️ Stripe keys are not fully configured. Payment features will be disabled.');
    return false;
  }
}

module.exports = {
  getUncachableStripeClient,
  getStripePublishableKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
  fetchAndLogCredentials,
  getStripeCredentials,
};
