const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const { applyStandardMiddleware } = require('./config/express');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { mountApiRoutes } = require('./routes');
const { initializeAutomationEngine, shutdownAutomationEngine } = require('./services/automation');

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Standard Middleware (CORS, Logging, parsing)
applyStandardMiddleware(app);

// 2. Mount All Routes (including the new webhooks)
mountApiRoutes(app, null); 

// 3. Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// 4. Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  initializeAutomationEngine();
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  shutdownAutomationEngine();
  server.close(() => process.exit(0));
});