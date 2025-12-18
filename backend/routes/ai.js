const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');
const { estimatorService, assistantService, schedulingHelper } = require('../src/modules/ai');

let aiModeEnabled = false;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

const defaultRecommendations = [
  {
    id: 'rec-quote-followup',
    title: 'Automate Quote Follow-ups',
    description: 'Automatically follow up on quotes that haven\'t received a response after 3 days. This can increase your conversion rate by 20%.',
    trigger: 'quote_sent',
    confidence: 0.92,
    estimatedImpact: 'High',
    suggestedActions: ['Wait 3 days', 'Send follow-up email', 'Create task for sales rep']
  },
  {
    id: 'rec-job-complete',
    title: 'Post-Job Customer Survey',
    description: 'Send a satisfaction survey after each job is completed to gather feedback and reviews.',
    trigger: 'job_completed',
    confidence: 0.88,
    estimatedImpact: 'Medium',
    suggestedActions: ['Wait 24 hours', 'Send survey email', 'Track response']
  },
  {
    id: 'rec-invoice-reminder',
    title: 'Invoice Payment Reminders',
    description: 'Send automated reminders for overdue invoices at 7, 14, and 30 days.',
    trigger: 'invoice_overdue',
    confidence: 0.95,
    estimatedImpact: 'High',
    suggestedActions: ['Check if overdue', 'Send reminder email', 'Send SMS if 14+ days']
  },
  {
    id: 'rec-seasonal-outreach',
    title: 'Seasonal Service Reminder',
    description: 'Remind customers about seasonal tree services based on their property\'s history.',
    trigger: 'schedule_trigger',
    confidence: 0.85,
    estimatedImpact: 'Medium',
    suggestedActions: ['Filter customers by last service', 'Send seasonal reminder', 'Create quote if interested']
  },
  {
    id: 'rec-new-lead-nurture',
    title: 'New Lead Welcome Sequence',
    description: 'Automatically nurture new leads with a welcome email series to build trust.',
    trigger: 'lead_created',
    confidence: 0.9,
    estimatedImpact: 'High',
    suggestedActions: ['Send welcome email', 'Wait 2 days', 'Send educational content', 'Create follow-up task']
  }
];

router.get('/ai/workflows/recommendations', 
  requirePermission(RESOURCES.AI, ACTIONS.LIST),
  async (req, res) => {
  try {
    const { rows: existingWorkflows } = await db.query(`
      SELECT name, description FROM automation_workflows 
      WHERE deleted_at IS NULL AND is_template = false
    `);

    const existingNames = new Set(existingWorkflows.map(w => w.name.toLowerCase()));

    const recommendations = defaultRecommendations.filter(rec => {
      const recName = rec.title.toLowerCase();
      return !Array.from(existingNames).some(name => 
        name.includes(recName) || recName.includes(name)
      );
    });

    res.json({ success: true, data: recommendations });
  } catch (err) {
    console.error('Error fetching AI recommendations:', err);
    res.json({ success: true, data: defaultRecommendations });
  }
});

router.post('/ai/workflows/ai-mode', 
  requirePermission(RESOURCES.AI, ACTIONS.UPDATE),
  async (req, res) => {
  try {
    const { enabled } = req.body;
    
    aiModeEnabled = !!enabled;
    
    res.json({
      success: true,
      data: {
        enabled: aiModeEnabled,
        message: aiModeEnabled 
          ? 'AI Mode enabled. The system will now suggest workflow improvements based on your data patterns.'
          : 'AI Mode disabled.'
      }
    });
  } catch (err) {
    console.error('Error setting AI mode:', err);
    res.status(500).json({ success: false, error: 'Failed to set AI mode' });
  }
});

router.get('/ai/workflows/ai-mode', 
  requirePermission(RESOURCES.AI, ACTIONS.READ),
  async (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: aiModeEnabled
    }
  });
});

router.post('/ai/estimates/generate', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    const imageData = req.files.map(file => ({
      mimeType: file.mimetype,
      data: file.buffer.toString('base64')
    }));

    const estimate = await estimatorService.generateEstimate(imageData);
    
    const priceMin = estimate.suggested_services?.[0]?.price_range?.min || 0;
    const priceMax = estimate.suggested_services?.[0]?.price_range?.max || 0;
    
    const logEntry = await estimatorService.logEstimate({
      imageCount: req.files.length,
      treeSpecies: estimate.tree_identification,
      treeHeightFeet: estimate.measurements?.height_feet,
      trunkDiameterInches: estimate.measurements?.trunk_diameter_inches,
      canopyWidthFeet: estimate.measurements?.canopy_width_feet,
      hazards: estimate.hazards_obstacles,
      aiSuggestedPriceMin: priceMin,
      aiSuggestedPriceMax: priceMax,
      suggestedServices: estimate.suggested_services,
      healthAssessment: estimate.health_assessment,
      detailedAssessment: estimate.detailed_assessment,
      requiredEquipment: estimate.required_equipment,
      requiredManpower: estimate.required_manpower,
      estimatedDurationHours: estimate.estimated_duration_hours,
      createdBy: req.user?.claims?.sub
    });

    res.json({
      success: true,
      estimate,
      logId: logEntry.id
    });
  } catch (error) {
    console.error('AI estimate generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai/estimates/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const { finalApprovedPrice, feedbackRating, feedbackNotes, quoteId, jobId } = req.body;

    const updated = await estimatorService.updateEstimateFeedback(id, {
      finalApprovedPrice,
      feedbackRating,
      feedbackNotes,
      quoteId,
      jobId
    });

    if (!updated) {
      return res.status(404).json({ error: 'Estimate log not found' });
    }

    res.json({ success: true, estimate: updated });
  } catch (error) {
    console.error('Estimate feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/estimates/export', async (req, res) => {
  try {
    const { startDate, endDate, onlyWithFeedback, format } = req.query;

    const data = await estimatorService.exportTrainingData({
      startDate,
      endDate,
      onlyWithFeedback: onlyWithFeedback === 'true',
      format: format || 'json'
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=ai_estimate_training_data.csv');
      return res.send(data);
    }

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Estimate export error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/estimates/stats', async (req, res) => {
  try {
    const stats = await estimatorService.getEstimateStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Estimate stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai/assistant/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await assistantService.chat(message, conversationHistory || []);

    res.json({
      success: true,
      response: result.response,
      intentResult: result.intentResult
    });
  } catch (error) {
    console.error('Assistant chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/assistant/jobs/tomorrow', async (req, res) => {
  try {
    const jobs = await assistantService.getJobsForTomorrow();
    res.json({ success: true, jobs, count: jobs.length });
  } catch (error) {
    console.error('Jobs tomorrow error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/assistant/jobs/date/:date', async (req, res) => {
  try {
    const jobs = await assistantService.getJobsForDate(req.params.date);
    res.json({ success: true, jobs, count: jobs.length, date: req.params.date });
  } catch (error) {
    console.error('Jobs for date error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/assistant/revenue/last-month', async (req, res) => {
  try {
    const revenue = await assistantService.getRevenueLastMonth();
    res.json({ success: true, ...revenue });
  } catch (error) {
    console.error('Revenue last month error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/assistant/invoices/overdue', async (req, res) => {
  try {
    const daysOverdue = parseInt(req.query.days) || 30;
    const result = await assistantService.getOverdueInvoices(daysOverdue);
    res.json({ success: true, ...result, daysOverdue });
  } catch (error) {
    console.error('Overdue invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/assistant/availability/friday', async (req, res) => {
  try {
    const availability = await assistantService.getCrewAvailabilityFriday();
    res.json({ success: true, ...availability });
  } catch (error) {
    console.error('Friday availability error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/assistant/availability/:date', async (req, res) => {
  try {
    const availability = await assistantService.getEmployeeAvailability(req.params.date);
    res.json({ success: true, ...availability });
  } catch (error) {
    console.error('Date availability error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai/scheduling/predict-duration', async (req, res) => {
  try {
    const { serviceType, treeHeightFeet, trunkDiameterInches, hazardLevel, crewSize } = req.body;

    const prediction = await schedulingHelper.predictJobDuration({
      serviceType,
      treeHeightFeet,
      trunkDiameterInches,
      hazardLevel,
      crewSize
    });

    res.json({ success: true, prediction });
  } catch (error) {
    console.error('Duration prediction error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai/scheduling/detect-conflicts', async (req, res) => {
  try {
    const { scheduledDate, startTime, endTime, crewMembers, equipmentIds } = req.body;

    const conflicts = await schedulingHelper.detectSchedulingConflicts({
      scheduledDate,
      startTime,
      endTime,
      crewMembers: crewMembers || [],
      equipmentIds: equipmentIds || []
    });

    res.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts
    });
  } catch (error) {
    console.error('Conflict detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai/scheduling/suggest-crew', async (req, res) => {
  try {
    const { 
      scheduledDate, startTime, endTime, serviceType, 
      hazardLevel, requiredSkills, preferredCrewSize 
    } = req.body;

    const suggestions = await schedulingHelper.suggestOptimalCrew({
      scheduledDate,
      startTime,
      endTime,
      serviceType,
      hazardLevel,
      requiredSkills: requiredSkills || [],
      preferredCrewSize: preferredCrewSize || 3
    });

    res.json({ success: true, ...suggestions });
  } catch (error) {
    console.error('Crew suggestion error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/scheduling/suggestions/:date', async (req, res) => {
  try {
    const suggestions = await schedulingHelper.getSchedulingSuggestions(req.params.date);
    res.json({ success: true, ...suggestions });
  } catch (error) {
    console.error('Scheduling suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai/scheduling/log-duration', async (req, res) => {
  try {
    const { jobId, ...durationData } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const logged = await schedulingHelper.logJobDuration(jobId, durationData);
    res.json({ success: true, entry: logged });
  } catch (error) {
    console.error('Duration logging error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/scheduling/history', async (req, res) => {
  try {
    const data = await schedulingHelper.getHistoricalDurationData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
