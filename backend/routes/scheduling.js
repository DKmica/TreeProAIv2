const express = require('express');
const db = require('../db');
const { handleError, notFoundError, badRequestError } = require('../utils/errors');
const { isAuthenticated } = require('../auth');
const scheduling = require('../services/scheduling');

const router = express.Router();

router.get('/scheduling/skills', isAuthenticated, async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM skills';
    const params = [];
    
    if (category) {
      params.push(category);
      query += ' WHERE category = $1';
    }
    
    query += ' ORDER BY category, name';
    
    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/crews/:crewId/skills', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const skills = await scheduling.crewAssignmentService.getCrewSkills(crewId);
    res.json({ success: true, data: skills });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/crews/:crewId/skills', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const { skillId, proficiencyLevel, certifiedUntil, notes } = req.body;
    
    if (!skillId) {
      throw badRequestError('skillId is required');
    }
    
    const query = `
      INSERT INTO crew_skill_profiles (crew_id, skill_id, proficiency_level, certified_until, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (crew_id, skill_id) 
      DO UPDATE SET proficiency_level = $3, certified_until = $4, notes = $5, updated_at = NOW()
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [crewId, skillId, proficiencyLevel || 3, certifiedUntil, notes]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/scheduling/crews/:crewId/skills/:skillId', isAuthenticated, async (req, res) => {
  try {
    const { crewId, skillId } = req.params;
    
    await db.query('DELETE FROM crew_skill_profiles WHERE crew_id = $1 AND skill_id = $2', [crewId, skillId]);
    res.json({ success: true, message: 'Skill removed from crew' });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/routes/:crewId/:date', isAuthenticated, async (req, res) => {
  try {
    const { crewId, date } = req.params;
    const routePlan = await scheduling.routeOptimizationService.getRoutePlan(crewId, date);
    
    if (!routePlan) {
      return res.json({ success: true, data: null });
    }
    
    res.json({ success: true, data: routePlan });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/routes/optimize', isAuthenticated, async (req, res) => {
  try {
    const { crewId, date, startLocation, endLocation, useGoogleMaps } = req.body;
    
    if (!crewId || !date) {
      throw badRequestError('crewId and date are required');
    }
    
    const result = await scheduling.routeOptimizationService.optimizeRoute(crewId, date, {
      startLocation,
      endLocation,
      useGoogleMaps: useGoogleMaps !== false
    });
    
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.patch('/scheduling/routes/:routePlanId/reorder', isAuthenticated, async (req, res) => {
  try {
    const { routePlanId } = req.params;
    const { stopOrder } = req.body;
    
    if (!stopOrder || !Array.isArray(stopOrder)) {
      throw badRequestError('stopOrder array is required');
    }
    
    const result = await scheduling.routeOptimizationService.reorderStops(routePlanId, stopOrder);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/routes/:routePlanId/publish', isAuthenticated, async (req, res) => {
  try {
    const { routePlanId } = req.params;
    const userId = req.user?.id || req.user?.claims?.sub || 'unknown';
    
    const query = `
      UPDATE route_plans 
      SET status = 'published', published_at = NOW(), published_by = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [routePlanId, userId]);
    
    if (rows.length === 0) {
      throw notFoundError('Route plan');
    }
    
    res.json({ success: true, data: rows[0], message: 'Route published to crew' });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/crews/available', isAuthenticated, async (req, res) => {
  try {
    const { date, jobId, includeSkillMatch } = req.query;
    
    if (!date) {
      throw badRequestError('date is required');
    }
    
    const crews = await scheduling.crewAssignmentService.getAvailableCrewsForDate(date, {
      jobId,
      includeSkillMatch: includeSkillMatch === 'true'
    });
    
    res.json({ success: true, data: crews });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/crews/:crewId/assign', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const { jobId, date } = req.body;
    
    if (!jobId || !date) {
      throw badRequestError('jobId and date are required');
    }
    
    const result = await scheduling.crewAssignmentService.assignCrewToJob(jobId, crewId, date);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/crews/:crewId/capacity', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      throw badRequestError('date is required');
    }
    
    const capacity = await scheduling.crewAssignmentService.checkCapacity(crewId, date);
    res.json({ success: true, data: capacity });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/jobs/:jobId/matching-crews', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      throw badRequestError('date is required');
    }
    
    const crews = await scheduling.crewAssignmentService.findMatchingCrews(jobId, date);
    res.json({ success: true, data: crews });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/conflicts/:crewId/:date', isAuthenticated, async (req, res) => {
  try {
    const { crewId, date } = req.params;
    const conflicts = await scheduling.conflictResolutionService.getConflicts(crewId, date);
    res.json({ success: true, data: conflicts });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/conflicts/:crewId/:date/alternatives', isAuthenticated, async (req, res) => {
  try {
    const { crewId, date } = req.params;
    const { jobId } = req.query;
    
    const [alternativeCrews, alternativeDates] = await Promise.all([
      jobId ? scheduling.conflictResolutionService.suggestAlternativeCrews(jobId, date) : [],
      jobId ? scheduling.conflictResolutionService.suggestAlternativeDates(jobId, crewId) : []
    ]);
    
    res.json({
      success: true,
      data: {
        alternativeCrews,
        alternativeDates
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/crews/status', isAuthenticated, async (req, res) => {
  try {
    const statuses = await scheduling.crewStatusService.getAllCrewStatuses();
    res.json({ success: true, data: statuses });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/crews/:crewId/status', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const status = await scheduling.crewStatusService.getCurrentStatus(crewId);
    res.json({ success: true, data: status });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/crews/:crewId/status', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const { status, latitude, longitude, accuracy, heading, speed, batteryLevel, currentJobId } = req.body;
    
    if (!status) {
      throw badRequestError('status is required');
    }
    
    const userId = req.user?.id || req.user?.claims?.sub || 'unknown';
    
    const result = await scheduling.crewStatusService.updateStatus(crewId, status, {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      batteryLevel,
      currentJobId,
      updatedBy: userId
    });
    
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/crews/:crewId/location-history', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const { startDate, endDate, limit } = req.query;
    
    const history = await scheduling.crewStatusService.getLocationHistory(crewId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100
    });
    
    res.json({ success: true, data: history });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/jobs/:jobId/on-my-way', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { crewId, etaMinutes } = req.body;
    
    if (!crewId) {
      throw badRequestError('crewId is required');
    }
    
    const result = await scheduling.notificationService.sendOnMyWay(jobId, crewId, etaMinutes);
    
    await scheduling.crewStatusService.setCrewEnRoute(crewId, jobId);
    
    res.json({ success: true, data: result, message: 'On My Way notification sent to customer' });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/jobs/:jobId/arrived', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { crewId } = req.body;
    
    const result = await scheduling.notificationService.sendArrivalNotification(jobId);
    
    if (crewId) {
      await scheduling.crewStatusService.setCrewOnSite(crewId, jobId);
    }
    
    res.json({ success: true, data: result, message: 'Arrival notification sent' });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/jobs/:jobId/completed', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { crewId, actualHours } = req.body;
    
    const [notificationResult] = await Promise.all([
      scheduling.notificationService.sendCompletionNotification(jobId),
      actualHours ? scheduling.jobDurationService.recordDuration(jobId, actualHours) : Promise.resolve()
    ]);
    
    if (crewId) {
      await scheduling.crewStatusService.setCrewAvailable(crewId);
    }
    
    res.json({ success: true, data: notificationResult, message: 'Completion notification sent' });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/jobs/:jobId/notifications', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const notifications = await scheduling.notificationService.getNotificationHistory(jobId);
    res.json({ success: true, data: notifications });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/jobs/:jobId/predict-duration', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const { rows } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (rows.length === 0) {
      throw notFoundError('Job');
    }
    
    const job = rows[0];
    
    const prediction = await scheduling.jobDurationService.predictDuration({
      jobType: job.special_instructions ? 'tree_removal' : 'tree_trimming',
      serviceTypes: [],
      treeSizeCategory: 'medium'
    });
    
    res.json({ success: true, data: prediction });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/duration-stats', isAuthenticated, async (req, res) => {
  try {
    const { jobType } = req.query;
    const stats = await scheduling.jobDurationService.getAveragesByType(jobType);
    res.json({ success: true, data: stats });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/crews/:crewId/messages', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const { message, messageType } = req.body;
    const userId = req.user?.id || req.user?.claims?.sub || 'unknown';
    const userName = req.user?.name || 'Dispatcher';
    
    if (!message) {
      throw badRequestError('message is required');
    }
    
    const query = `
      INSERT INTO crew_messages (crew_id, sender_type, sender_id, sender_name, message, message_type)
      VALUES ($1, 'dispatcher', $2, $3, $4, $5)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [crewId, userId, userName, message, messageType || 'text']);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/crews/:crewId/messages', isAuthenticated, async (req, res) => {
  try {
    const { crewId } = req.params;
    const { limit, since } = req.query;
    
    let query = `
      SELECT * FROM crew_messages 
      WHERE crew_id = $1
    `;
    const params = [crewId];
    
    if (since) {
      params.push(since);
      query += ` AND created_at > $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
    }
    
    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows.reverse() });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/dispatcher/dashboard', isAuthenticated, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const [crewStatuses, routePlans, conflicts] = await Promise.all([
      scheduling.crewStatusService.getAllCrewStatuses(),
      db.query(`
        SELECT rp.*, c.name as crew_name
        FROM route_plans rp
        JOIN crews c ON rp.crew_id = c.id
        WHERE rp.date = $1
        ORDER BY c.name
      `, [targetDate]),
      db.query(`
        SELECT ca.*, c.name as crew_name, j.customer_name, j.job_location
        FROM crew_assignments ca
        JOIN crews c ON ca.crew_id = c.id
        JOIN jobs j ON ca.job_id = j.id
        WHERE ca.assigned_date = $1
        ORDER BY c.name, j.customer_name
      `, [targetDate])
    ]);
    
    const jobsQuery = await db.query(`
      SELECT j.*, 
        COALESCE(p.lat, j.job_lat) as latitude,
        COALESCE(p.lon, j.job_lon) as longitude
      FROM jobs j
      LEFT JOIN properties p ON j.property_id = p.id
      WHERE j.scheduled_date = $1 
        AND j.status NOT IN ('Cancelled', 'Completed')
      ORDER BY j.customer_name
    `, [targetDate]);
    
    res.json({
      success: true,
      data: {
        date: targetDate,
        crewStatuses,
        routePlans: routePlans.rows,
        assignments: conflicts.rows,
        jobs: jobsQuery.rows
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/scheduling/capacity-calendar', isAuthenticated, async (req, res) => {
  try {
    const { crewId, startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      throw badRequestError('startDate and endDate are required');
    }
    
    let query = `
      SELECT cc.*, c.name as crew_name, c.capacity as default_capacity
      FROM crew_capacity_calendar cc
      JOIN crews c ON cc.crew_id = c.id
      WHERE cc.date >= $1 AND cc.date <= $2
    `;
    const params = [startDate, endDate];
    
    if (crewId) {
      params.push(crewId);
      query += ` AND cc.crew_id = $${params.length}`;
    }
    
    query += ' ORDER BY cc.date, c.name';
    
    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/scheduling/capacity-calendar', isAuthenticated, async (req, res) => {
  try {
    const { crewId, date, availableHours, isAvailable, reason, notes } = req.body;
    
    if (!crewId || !date) {
      throw badRequestError('crewId and date are required');
    }
    
    const query = `
      INSERT INTO crew_capacity_calendar (crew_id, date, available_hours, is_available, reason, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (crew_id, date)
      DO UPDATE SET available_hours = $3, is_available = $4, reason = $5, notes = $6, updated_at = NOW()
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [crewId, date, availableHours, isAvailable !== false, reason, notes]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
