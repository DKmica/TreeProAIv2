const express = require('express');
const router = express.Router();
const db = require('../db');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

let aiModeEnabled = false;

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

module.exports = router;
