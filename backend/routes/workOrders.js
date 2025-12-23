const express = require('express');
const workOrderService = require('../services/workOrderService');
const { handleError } = require('../utils/errors');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

router.get('/work-orders',
  requirePermission(RESOURCES.JOBS, ACTIONS.LIST),
  async (req, res) => {
    try {
      const { stage, clientId, search, page = 1, pageSize = 50 } = req.query;
      
      const result = await workOrderService.getAll({
        stage,
        clientId,
        search,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/work-orders/summary',
  requirePermission(RESOURCES.JOBS, ACTIONS.LIST),
  async (req, res) => {
    try {
      const summary = await workOrderService.getSummaryByStage();
      res.json({
        success: true,
        data: summary
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/work-orders/:id',
  requirePermission(RESOURCES.JOBS, ACTIONS.READ),
  async (req, res) => {
    try {
      const workOrder = await workOrderService.getById(req.params.id);
      
      if (!workOrder) {
        return res.status(404).json({ error: 'Work order not found' });
      }

      res.json({
        success: true,
        data: workOrder
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.post('/work-orders',
  requirePermission(RESOURCES.JOBS, ACTIONS.CREATE),
  async (req, res) => {
    try {
      const actorId = req.user?.id || null;
      const workOrder = await workOrderService.create(req.body, actorId);

      res.status(201).json({
        success: true,
        data: workOrder
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.put('/work-orders/:id',
  requirePermission(RESOURCES.JOBS, ACTIONS.UPDATE),
  async (req, res) => {
    try {
      const actorId = req.user?.id || null;
      const workOrder = await workOrderService.update(req.params.id, req.body, actorId);

      res.json({
        success: true,
        data: workOrder
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.patch('/work-orders/:id/stage',
  requirePermission(RESOURCES.JOBS, ACTIONS.UPDATE),
  async (req, res) => {
    try {
      const { stage, statusReason } = req.body;
      const actorId = req.user?.id || null;

      if (!stage) {
        return res.status(400).json({ error: 'Stage is required' });
      }

      const workOrder = await workOrderService.changeStage(
        req.params.id,
        stage,
        statusReason,
        actorId
      );

      res.json({
        success: true,
        data: workOrder
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.delete('/work-orders/:id',
  requirePermission(RESOURCES.JOBS, ACTIONS.DELETE),
  async (req, res) => {
    try {
      const actorId = req.user?.id || null;
      const deleted = await workOrderService.delete(req.params.id, actorId);

      if (!deleted) {
        return res.status(404).json({ error: 'Work order not found' });
      }

      res.json({
        success: true,
        message: 'Work order deleted'
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/work-orders/:id/timeline',
  requirePermission(RESOURCES.JOBS, ACTIONS.READ),
  async (req, res) => {
    try {
      const timeline = await workOrderService.getTimeline(req.params.id);
      res.json({
        success: true,
        data: timeline
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/work-orders/:id/quotes',
  requirePermission(RESOURCES.QUOTES, ACTIONS.LIST),
  async (req, res) => {
    try {
      const quotes = await workOrderService.getQuotes(req.params.id);
      res.json({
        success: true,
        data: quotes
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.get('/work-orders/:id/jobs',
  requirePermission(RESOURCES.JOBS, ACTIONS.LIST),
  async (req, res) => {
    try {
      const jobs = await workOrderService.getJobs(req.params.id);
      res.json({
        success: true,
        data: jobs
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

router.post('/work-orders/from-lead',
  requirePermission(RESOURCES.LEADS, ACTIONS.CREATE),
  async (req, res) => {
    try {
      const actorId = req.user?.id || null;
      const result = await workOrderService.createLeadWorkOrder(req.body, actorId);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      handleError(res, err);
    }
  }
);

module.exports = router;
