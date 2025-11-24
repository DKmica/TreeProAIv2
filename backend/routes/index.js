const express = require('express');
const leadsRouter = require('./leads');

const useModularRoutes = String(process.env.USE_MODULAR_ROUTES).toLowerCase() === 'true';

function buildApiRouter() {
  const router = express.Router();
  router.use(leadsRouter);
  return router;
}

function mountApiRoutes(app, legacyRouter) {
  if (useModularRoutes) {
    const modularRouter = buildApiRouter();

    if (legacyRouter) {
      modularRouter.use(legacyRouter);
    }

    app.use('/api', modularRouter);
    return;
  }

  // Default to the legacy mounting approach to avoid surprise behavior changes
  // while we migrate endpoints out of server.js.
  if (legacyRouter) {
    app.use('/api', legacyRouter);
  }
  app.use('/api', leadsRouter);
}

module.exports = { buildApiRouter, mountApiRoutes };
