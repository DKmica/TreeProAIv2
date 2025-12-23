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
const badgeCountsRouter = require('./badge-counts');
const workflowsRouter = require('./workflows');
const automationLogsRouter = require('./automation-logs');
const templatesRouter = require('./templates');
const schedulingRouter = require('./scheduling');
const quotesRouter = require('./quotes');
const quotingRouter = require('./quoting');
const telemetryRouter = require('./telemetry');
const segmentsRouter = require('./segments');
const integrationsRouter = require('./integrations');
const aiRouter = require('./ai');
const documentsRouter = require('./documents');
const pdfRouter = require('./pdf');
const analyticsRouter = require('./analytics');
const crewsRouter = require('./crews');
const timeTrackingRouter = require('./time-tracking');
const customFieldsRouter = require('./custom-fields');
const formTemplatesRouter = require('./form-templates');
const materialsRouter = require('./materials');
const operationsRouter = require('./operations');
const companyRouter = require('./company');
const exceptionQueueRouter = require('./exception-queue');
const ragRouter = require('./rag');
const webhooksRouter = require('./webhooks');
const estimateFeedbackRouter = require('./estimate-feedback');
const payPeriodsRouter = require('./pay-periods');
const usersRouter = require('./users');
const eventsRouter = require('./events');
const salesRouter = require('./sales');
const stumpsRouter = require('./stumps');
const workOrdersRouter = require('./workOrders');

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
  router.use(crewsRouter);
  router.use('/search', searchRouter);
  router.use(badgeCountsRouter);
  router.use(workflowsRouter);
  router.use(automationLogsRouter);
  router.use(templatesRouter);
  router.use(schedulingRouter);
  router.use(quotesRouter);
  router.use(quotingRouter);
  router.use(telemetryRouter);
  router.use(segmentsRouter);
  router.use(integrationsRouter);
  router.use(aiRouter);
  router.use(documentsRouter);
  router.use(pdfRouter);
  router.use(analyticsRouter);
  router.use(timeTrackingRouter);
  router.use(customFieldsRouter);
  router.use(formTemplatesRouter);
  router.use(materialsRouter);
  router.use(operationsRouter);
  router.use(companyRouter);
  router.use(exceptionQueueRouter);
  router.use(ragRouter);
  router.use(webhooksRouter);
  router.use(estimateFeedbackRouter);
  router.use(payPeriodsRouter);
  router.use(usersRouter);
  router.use(eventsRouter);
  router.use(salesRouter);
  router.use(stumpsRouter);
  router.use(workOrdersRouter);
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
