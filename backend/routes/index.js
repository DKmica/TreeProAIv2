const express = require('express');
const authRouter = require('./auth');
const healthRouter = require('./health');
const leadsRouter = require('./leads');

const useModularRoutes = String(process.env.USE_MODULAR_ROUTES).toLowerCase() === 'true';

function buildApiRouter() {
  const router = express.Router();
  router.use(healthRouter);
  router.use(authRouter);
  router.use(leadsRouter);
  return router;
}

function mountApiRoutes(app, legacyRouter) {
  const modularRouter = buildApiRouter();

  // Default to mounting modular routes alongside the legacy router so health/auth
  // endpoints remain available while we migrate incrementally. When
  // USE_MODULAR_ROUTES is true we only mount the modular stack to exercise the
  // new routing surface without legacy handlers.
  if (useModularRoutes || !legacyRouter) {
    app.use('/api', modularRouter);
    return;
  }

  const combinedRouter = express.Router();
  combinedRouter.use(modularRouter);
  combinedRouter.use(legacyRouter);
  app.use('/api', combinedRouter);
}

module.exports = { buildApiRouter, mountApiRoutes };
