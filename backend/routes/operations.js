const express = require('express');
const router = express.Router();
const operationsService = require('../services/operationsService');

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

router.get('/operations/availability', async (req, res) => {
  try {
    const { start_date, end_date, crew_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date query parameters are required'
      });
    }

    const data = await operationsService.getCrewAvailability({
      startDate: start_date,
      endDate: end_date
    });

    const filtered = crew_id ? data.filter(item => item.crewId === crew_id) : data;

    res.json({ success: true, data: filtered });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/operations/dispatch-messages', async (req, res) => {
  try {
    const { date, crewId, channel } = req.body || {};
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date is required in YYYY-MM-DD format'
      });
    }

    const result = await operationsService.dispatchCrewDigest({
      date,
      crewId,
      channel: channel || 'sms'
    });

    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/operations/route-optimize', async (req, res) => {
  try {
    const { date, crewId, startLocation, includeInProgress } = req.body || {};
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date is required in YYYY-MM-DD format'
      });
    }

    const result = await operationsService.optimizeCrewRoute({
      date,
      crewId,
      startLocation,
      includeInProgress: includeInProgress !== false
    });

    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/operations/weather-impacts', async (req, res) => {
  try {
    const { start_date, end_date, crew_id } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date query parameters are required'
      });
    }

    const data = await operationsService.generateWeatherInsights({
      startDate: start_date,
      endDate: end_date,
      crewId: crew_id
    });

    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
