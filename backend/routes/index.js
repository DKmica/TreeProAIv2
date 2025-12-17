const express = require('express');

// Import all feature routers
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
const badgeCountsRouter = require('./badge-counts');
const workflowsRouter = require('./workflows');
const automationLogsRouter = require('./automation-logs');
const templatesRouter = require('./templates');
const schedulingRouter = require('./scheduling');
const quotingRouter = require('./quoting');
const telemetryRouter = require('./telemetry');
const segmentsRouter = require('./segments');
const integrationsRouter = require('./integrations');
const aiRouter = require('./ai');
const documentsRouter = require('./documents');
const pdfRouter = require('./pdf');
const analyticsRouter = require('./analytics');

// Import the new Webhooks router (created in the previous step)
const webhooksRouter = require('./webhooks');

/**
 * Builds the main API router by combining all feature modules.
 * This keeps the routing logic organized and modular.
 */
function buildApiRouter() {
  const router = express.Router();

  // Core features
  router.use(healthRouter);
  router.use(authRouter);
  router.use(dashboardRouter);
  router.use(searchRouter); // Mounted at root level in original, but often better at /search. 
                            // Note: The original file had `router.use('/search', searchRouter)`. 
                            // Ensure searchRouter doesn't have /search in its internal paths if you do this.
                            // Based on your original file:
  router.use('/search', searchRouter); 

  // CRM & Entity Management
  router.use(leadsRouter);
  router.use(clientsRouter);
  router.use(propertiesRouter);
  router.use(contactsRouter);
  router.use(tagsRouter);
  router.use(employeesRouter);
  router.use(equipmentRouter);

  // Operations & Finance
  router.use(jobsRouter);
  router.use(invoicesRouter);
  router.use(quotingRouter);
  router.use(schedulingRouter);

  // Automation & Intelligence
  router.use(workflowsRouter);
  router.use(automationLogsRouter);
  router.use(aiRouter);
  router.use(analyticsRouter);
  router.use(telemetryRouter);

  // Utilities & Integration
  router.use(templatesRouter);
  router.use(segmentsRouter);
  router.use(integrationsRouter);
  router.use(documentsRouter);
  router.use(pdfRouter);
  router.use(badgeCountsRouter);

  return router;
}

/**
 * Mounts the API routes onto the main Express application.
 * * @param {express.Application} app - The main Express app instance
 */
function mountApiRoutes(app) {
  // 1. Mount Webhooks
  // These are mounted separately and specifically to handle raw bodies or special parsing
  // needed for Stripe signatures.
  app.use('/api/stripe/webhook', webhooksRouter);

  // 2. Mount the Modular API Router
  // This unifies all your standard JSON-based API endpoints under /api
  const modularRouter = buildApiRouter();
  app.use('/api', modularRouter);
}

module.exports = { buildApiRouter, mountApiRoutes };