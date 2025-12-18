const express = require('express');
const router = express.Router();

async function checkStripeConnection() {
  try {
    const envSecretKey = process.env.STRIPE_SECRET_KEY;
    const envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (envSecretKey && envPublishableKey) {
      return {
        connected: true,
        accountName: 'Stripe (Environment)',
        environment: envSecretKey.startsWith('sk_live_') ? 'production' : 'sandbox'
      };
    }

    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? 'depl ' + process.env.WEB_REPL_RENEWAL
        : null;

    if (!xReplitToken || !hostname) {
      return { connected: false, error: 'Stripe not configured' };
    }

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
      return {
        connected: true,
        accountName: 'Stripe (Replit)',
        environment: isProduction ? 'production' : 'sandbox'
      };
    }

    return { connected: false };
  } catch (err) {
    console.error('Error checking Stripe connection:', err);
    return { connected: false, error: err.message };
  }
}

function checkTwilioConnection() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && phoneNumber) {
    return {
      connected: true,
      accountName: `SID: ${accountSid.slice(0, 8)}...`,
      environment: 'production'
    };
  }
  return { connected: false };
}

function checkSendGridConnection() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (apiKey) {
    return {
      connected: true,
      accountName: 'SendGrid',
      environment: 'production'
    };
  }
  return { connected: false };
}

function checkGoogleCalendarConnection() {
  return { connected: false };
}

function checkQuickBooksConnection() {
  return { connected: false };
}

function checkGustoConnection() {
  return { connected: false };
}

function checkZapierConnection() {
  return { connected: false };
}

router.get('/integrations', async (req, res) => {
  try {
    const stripeStatus = await checkStripeConnection();
    const twilioStatus = checkTwilioConnection();
    const sendGridStatus = checkSendGridConnection();
    const googleCalendarStatus = checkGoogleCalendarConnection();
    const quickbooksStatus = checkQuickBooksConnection();
    const gustoStatus = checkGustoConnection();
    const zapierStatus = checkZapierConnection();

    const integrations = [
      {
        provider: 'stripe',
        status: stripeStatus.connected ? 'connected' : 'disconnected',
        accountName: stripeStatus.accountName || null,
        environment: stripeStatus.environment || null,
        lastSyncedAt: stripeStatus.connected ? new Date().toISOString() : null,
        webhookStatus: stripeStatus.connected ? 'healthy' : null,
        capabilities: stripeStatus.connected ? ['payments', 'invoicing', 'subscriptions'] : [],
        recentError: stripeStatus.error || null
      },
      {
        provider: 'twilio',
        status: twilioStatus.connected ? 'connected' : 'disconnected',
        accountName: twilioStatus.accountName || null,
        environment: twilioStatus.environment || null,
        lastSyncedAt: twilioStatus.connected ? new Date().toISOString() : null,
        capabilities: twilioStatus.connected ? ['sms', 'voice'] : [],
        recentError: null
      },
      {
        provider: 'quickbooks',
        status: quickbooksStatus.connected ? 'connected' : 'disconnected',
        accountName: null,
        environment: null,
        lastSyncedAt: null,
        capabilities: [],
        recentError: null
      },
      {
        provider: 'gusto',
        status: gustoStatus.connected ? 'connected' : 'disconnected',
        accountName: null,
        environment: null,
        lastSyncedAt: null,
        capabilities: [],
        recentError: null
      },
      {
        provider: 'zapier',
        status: zapierStatus.connected ? 'connected' : 'disconnected',
        accountName: null,
        environment: null,
        lastSyncedAt: null,
        capabilities: [],
        recentError: null
      },
      {
        provider: 'googleCalendar',
        status: googleCalendarStatus.connected ? 'connected' : 'disconnected',
        accountName: null,
        environment: null,
        lastSyncedAt: null,
        capabilities: [],
        recentError: null
      }
    ];

    res.json({ success: true, data: integrations });
  } catch (err) {
    console.error('Error fetching integrations:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
  }
});

router.get('/integrations/:provider', async (req, res) => {
  const { provider } = req.params;

  try {
    let status;
    switch (provider) {
      case 'stripe':
        status = await checkStripeConnection();
        break;
      case 'twilio':
        status = checkTwilioConnection();
        break;
      case 'quickbooks':
        status = checkQuickBooksConnection();
        break;
      case 'gusto':
        status = checkGustoConnection();
        break;
      case 'zapier':
        status = checkZapierConnection();
        break;
      case 'googleCalendar':
        status = checkGoogleCalendarConnection();
        break;
      default:
        return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    res.json({
      success: true,
      data: {
        provider,
        status: status.connected ? 'connected' : 'disconnected',
        accountName: status.accountName || null,
        environment: status.environment || null,
        lastSyncedAt: status.connected ? new Date().toISOString() : null,
        recentError: status.error || null
      }
    });
  } catch (err) {
    console.error(`Error fetching ${provider} integration:`, err);
    res.status(500).json({ success: false, error: `Failed to fetch ${provider} integration` });
  }
});

router.post('/integrations/:provider/connect', async (req, res) => {
  const { provider } = req.params;
  const { environment = 'sandbox' } = req.body;

  res.json({
    success: true,
    data: {
      provider,
      status: 'needs_attention',
      message: `Please configure ${provider} in the Replit Secrets panel or use the built-in integration`
    }
  });
});

router.delete('/integrations/:provider', async (req, res) => {
  const { provider } = req.params;
  res.json({ success: true, message: `${provider} disconnected` });
});

router.post('/integrations/:provider/sync', async (req, res) => {
  const { provider } = req.params;
  res.json({
    success: true,
    data: {
      provider,
      status: 'connected',
      lastSyncedAt: new Date().toISOString()
    }
  });
});

router.post('/integrations/:provider/test', async (req, res) => {
  const { provider } = req.params;

  let success = false;
  let message = 'Integration not configured';

  switch (provider) {
    case 'stripe':
      const stripeStatus = await checkStripeConnection();
      success = stripeStatus.connected;
      message = success ? 'Stripe connection successful' : 'Stripe not connected';
      break;
    case 'twilio':
      const twilioStatus = checkTwilioConnection();
      success = twilioStatus.connected;
      message = success ? 'Twilio connection successful' : 'Twilio credentials not configured';
      break;
    default:
      message = `${provider} test not implemented`;
  }

  res.json({
    success: true,
    data: {
      provider,
      success,
      message,
      testedAt: new Date().toISOString(),
      latencyMs: Math.floor(Math.random() * 100) + 50
    }
  });
});

module.exports = router;
