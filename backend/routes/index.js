const express = require('express');
const authRouter = require('./auth');
const healthRouter = require('./health');
const leadsRouter = require('./leads');
const clientsRouter = require('./clients');
const propertiesRouter = require('./properties');
const contactsRouter = require('./contacts');
const tagsRouter = require('./tags');
const jobsRouter = require('./jobs');
const invoicesRouter = require('./invoices');
const employeesRouter = require('./employees');
const equipmentRouter = require('./equipment');

const useModularRoutes = String(process.env.USE_MODULAR_ROUTES).toLowerCase() === 'true';

function buildApiRouter() {
  const router = express.Router();
  router.use(healthRouter);
  router.use(authRouter);
  router.use(leadsRouter);
  router.use(clientsRouter);
  router.use(propertiesRouter);
  router.use(contactsRouter);
  router.use(tagsRouter);
  router.use(jobsRouter);
  router.use(invoicesRouter);
  router.use(employeesRouter);
  router.use(equipmentRouter);
  return router;
}

function mountApiRoutes(app, legacyRouter) {
  const modularRouter = buildApiRouter();

  // When USE_MODULAR_ROUTES is true, only mount the modular stack
  if (useModularRoutes) {
    if (legacyRouter) {
      modularRouter.use(legacyRouter);
    }
    app.use('/api', modularRouter);
    return;
  }

  // Default: mount modular routes alongside the legacy router
  // so health/auth endpoints remain available during migration
  if (!legacyRouter) {
    app.use('/api', modularRouter);
    return;
  }

  const combinedRouter = express.Router();
  combinedRouter.use(modularRouter);
  combinedRouter.use(legacyRouter);
  app.use('/api', combinedRouter);
}

module.exports = { buildApiRouter, mountApiRoutes };
