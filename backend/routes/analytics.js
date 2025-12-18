const express = require('express');
const analyticsService = require('../services/analyticsService');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

router.get('/analytics/sales-funnel',
  requirePermission(RESOURCES.REPORTS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getSalesFunnelMetrics(startDate, endDate);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching sales funnel metrics:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.get('/analytics/job-profitability',
  requirePermission(RESOURCES.REPORTS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getJobProfitability(startDate, endDate);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching job profitability:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.get('/analytics/crew-productivity',
  requirePermission(RESOURCES.REPORTS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getCrewProductivity(startDate, endDate);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching crew productivity:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.get('/analytics/equipment-utilization',
  requirePermission(RESOURCES.REPORTS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getEquipmentUtilization(startDate, endDate);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching equipment utilization:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.get('/analytics/revenue-by-service',
  requirePermission(RESOURCES.REPORTS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getRevenueByServiceType(startDate, endDate);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching revenue by service:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.get('/analytics/revenue-trend',
  requirePermission(RESOURCES.REPORTS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const data = await analyticsService.getRevenueTrend(startDate, endDate, groupBy);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching revenue trend:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.get('/analytics/dashboard-kpis',
  requirePermission(RESOURCES.REPORTS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getDashboardKPIs(startDate, endDate);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching dashboard KPIs:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
