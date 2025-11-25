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
const dashboardRouter = require('./dashboard');
const searchRouter = require('./search');

const useModularRoutes = String(process.env.USE_MODULAR_ROUTES).toLowerCase() === 'true';

function buildApiRouter() {
  const router = express.Router();
  router.use(healthRouter);
  router.use(authRouter);
  router.use(dashboardRouter);
  router.use(leadsRouter);
  router.use(clientsRouter);
  router.use(propertiesRouter);
  router.use(contactsRouter);
  router.use(tagsRouter);
  router.use(jobsRouter);
  router.use(invoicesRouter);
  router.use(employeesRouter);
  router.use(equipmentRouter);
  router.use('/search', searchRouter);
  return router;
}

function mountApiRoutes(app, legacyRouter) {
  const modularRouter = buildApiRouter();

  if (useModularRoutes) {
    if (legacyRouter) {
      modularRouter.use(legacyRouter);
    }
    app.use('/api', modularRouter);
    return;
  }

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
