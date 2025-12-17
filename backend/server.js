// backend/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const { applyStandardMiddleware } = require('./config/express');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { mountApiRoutes } = require('./routes');
const { initializeAutomationEngine, shutdownAutomationEngine } = require('./services/automation');
const { getStripeSecretKey, getStripeWebhookSecret } = require('./stripeClient');

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Initialize Stripe (Cache secrets)
let stripeInitialized = false;
(async () => {
  try {
    const key = await getStripeSecretKey();
    const secret = await getStripeWebhookSecret();
    if (key && secret) {
      console.log('✅ Stripe initialized');
      stripeInitialized = true;
    } else {
      console.warn('⚠️ Stripe credentials missing. Payment features disabled.');
    }
  } catch (err) {
    console.error('❌ Stripe init failed:', err.message);
  }
})();

// 2. Middleware
applyStandardMiddleware(app);

// 3. Mount Routes (The "Slim Down" Magic)
// This replaces the 10,000 lines of inline routes
const legacyRouter = express.Router(); 
// Note: If you still have routes ONLY in server.js that aren't in /routes, 
// move them to a new file in /routes/misc.js first.
mountApiRoutes(app, null); 

// 4. Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// 5. Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  initializeAutomationEngine();
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  shutdownAutomationEngine();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
