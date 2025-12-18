const express = require('express');
const eventService = require('../services/eventService');
const eventProcessor = require('../services/eventProcessor');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

router.get('/events', 
  requirePermission(RESOURCES.SETTINGS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const { status, limit = 50 } = req.query;
      
      let events;
      if (status === 'failed') {
        events = await eventService.getFailedEvents(parseInt(limit, 10));
      } else if (status === 'pending') {
        events = await eventService.getPendingEvents(parseInt(limit, 10));
      } else {
        const { rows } = await require('../db').query(
          `SELECT * FROM domain_events ORDER BY created_at DESC LIMIT $1`,
          [parseInt(limit, 10)]
        );
        events = rows;
      }
      
      res.json({ success: true, data: events });
    } catch (err) {
      console.error('Failed to fetch events:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.get('/events/stats',
  requirePermission(RESOURCES.SETTINGS, ACTIONS.VIEW),
  async (req, res) => {
    try {
      const stats = await eventService.getEventStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('Failed to fetch event stats:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.post('/events/:id/retry',
  requirePermission(RESOURCES.SETTINGS, ACTIONS.MANAGE),
  async (req, res) => {
    try {
      const { id } = req.params;
      await eventService.retryEvent(id);
      
      await eventProcessor.triggerProcessing();
      
      res.json({ success: true, message: 'Event queued for retry' });
    } catch (err) {
      console.error('Failed to retry event:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.post('/events/:id/dismiss',
  requirePermission(RESOURCES.SETTINGS, ACTIONS.MANAGE),
  async (req, res) => {
    try {
      const { id } = req.params;
      await eventService.dismissEvent(id);
      
      res.json({ success: true, message: 'Event dismissed' });
    } catch (err) {
      console.error('Failed to dismiss event:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.post('/events/process',
  requirePermission(RESOURCES.SETTINGS, ACTIONS.MANAGE),
  async (req, res) => {
    try {
      await eventProcessor.triggerProcessing();
      
      res.json({ success: true, message: 'Event processing triggered' });
    } catch (err) {
      console.error('Failed to trigger processing:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
