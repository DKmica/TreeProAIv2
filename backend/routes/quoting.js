const express = require('express');
const { handleError, notFoundError, badRequestError } = require('../utils/errors');
const { isAuthenticated } = require('../auth');
const quoting = require('../services/quoting');

const router = express.Router();

router.get('/proposals/templates', isAuthenticated, async (req, res) => {
  try {
    const templates = await quoting.proposalService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/proposals/templates/:id', isAuthenticated, async (req, res) => {
  try {
    const template = await quoting.proposalService.getTemplateById(req.params.id);
    res.json({ success: true, data: template });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/proposals/templates', isAuthenticated, async (req, res) => {
  try {
    const template = await quoting.proposalService.createTemplate(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/proposals/templates/:id', isAuthenticated, async (req, res) => {
  try {
    const template = await quoting.proposalService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, data: template });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/proposals/sections', isAuthenticated, async (req, res) => {
  try {
    const sections = await quoting.proposalService.getSections();
    res.json({ success: true, data: sections });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/apply-template', isAuthenticated, async (req, res) => {
  try {
    const { templateId } = req.body;
    if (!templateId) {
      throw badRequestError('templateId is required');
    }
    const result = await quoting.proposalService.applyTemplateToQuote(req.params.quoteId, templateId);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/:quoteId/proposal', isAuthenticated, async (req, res) => {
  try {
    const proposalData = await quoting.proposalService.generateProposalData(req.params.quoteId);
    res.json({ success: true, data: proposalData });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/:quoteId/pricing-options', isAuthenticated, async (req, res) => {
  try {
    const options = await quoting.pricingOptionsService.getOptionsForQuote(req.params.quoteId);
    res.json({ success: true, data: options });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/pricing-options', isAuthenticated, async (req, res) => {
  try {
    const option = await quoting.pricingOptionsService.createOption(req.params.quoteId, req.body);
    res.status(201).json({ success: true, data: option });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/quotes/pricing-options/:optionId', isAuthenticated, async (req, res) => {
  try {
    const option = await quoting.pricingOptionsService.updateOption(req.params.optionId, req.body);
    res.json({ success: true, data: option });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/quotes/pricing-options/:optionId', isAuthenticated, async (req, res) => {
  try {
    await quoting.pricingOptionsService.deleteOption(req.params.optionId);
    res.json({ success: true, message: 'Pricing option deleted' });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/pricing-options/:optionId/recommend', isAuthenticated, async (req, res) => {
  try {
    const option = await quoting.pricingOptionsService.setRecommended(req.params.optionId);
    res.json({ success: true, data: option });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/select-option', isAuthenticated, async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) {
      throw badRequestError('optionId is required');
    }
    const result = await quoting.pricingOptionsService.selectOption(req.params.quoteId, optionId);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/:quoteId/versions', isAuthenticated, async (req, res) => {
  try {
    const versions = await quoting.versioningService.getVersionHistory(req.params.quoteId);
    res.json({ success: true, data: versions });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/versions', isAuthenticated, async (req, res) => {
  try {
    const { changesSummary } = req.body;
    const version = await quoting.versioningService.createVersion(req.params.quoteId, changesSummary);
    res.status(201).json({ success: true, data: version });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/versions/:versionId', isAuthenticated, async (req, res) => {
  try {
    const version = await quoting.versioningService.getVersion(req.params.versionId);
    res.json({ success: true, data: version });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/restore/:versionId', isAuthenticated, async (req, res) => {
  try {
    const result = await quoting.versioningService.restoreVersion(req.params.quoteId, req.params.versionId);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/versions/compare', isAuthenticated, async (req, res) => {
  try {
    const { v1, v2 } = req.query;
    if (!v1 || !v2) {
      throw badRequestError('v1 and v2 version IDs are required');
    }
    const comparison = await quoting.versioningService.compareVersions(v1, v2);
    res.json({ success: true, data: comparison });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/request-signature', isAuthenticated, async (req, res) => {
  try {
    const result = await quoting.signatureService.requestSignature(req.params.quoteId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/signature', async (req, res) => {
  try {
    const { signatureData, signatureType, signerName, signerEmail, termsAccepted } = req.body;
    
    if (!signatureData || !signerName) {
      throw badRequestError('signatureData and signerName are required');
    }
    
    const result = await quoting.signatureService.captureSignature(req.params.quoteId, {
      signatureData,
      signatureType: signatureType || 'drawn',
      signerName,
      signerEmail,
      termsAccepted: termsAccepted !== false,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ success: true, data: result, message: 'Quote signed successfully' });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/quotes/:quoteId/signature', isAuthenticated, async (req, res) => {
  try {
    const signature = await quoting.signatureService.getSignature(req.params.quoteId);
    res.json({ success: true, data: signature });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/convert-to-job', isAuthenticated, async (req, res) => {
  try {
    const { jobId, selectedOptionId, notes } = req.body;
    
    if (!jobId) {
      throw badRequestError('jobId is required');
    }
    
    const result = await quoting.conversionAnalyticsService.trackConversion(
      req.params.quoteId,
      jobId,
      { selectedOptionId, notes, conversionSource: 'manual' }
    );
    
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/mark-lost', isAuthenticated, async (req, res) => {
  try {
    const result = await quoting.conversionAnalyticsService.markQuoteLost(req.params.quoteId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/follow-up', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub || 'unknown';
    const result = await quoting.conversionAnalyticsService.recordFollowUp(req.params.quoteId, {
      ...req.body,
      createdBy: userId
    });
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/analytics/conversions', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const metrics = await quoting.conversionAnalyticsService.getConversionMetrics(startDate, endDate);
    res.json({ success: true, data: metrics });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/analytics/lost-quotes', isAuthenticated, async (req, res) => {
  try {
    const analysis = await quoting.conversionAnalyticsService.getLostQuoteAnalysis();
    res.json({ success: true, data: analysis });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/analytics/follow-ups', isAuthenticated, async (req, res) => {
  try {
    const effectiveness = await quoting.conversionAnalyticsService.getFollowUpEffectiveness();
    res.json({ success: true, data: effectiveness });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/quotes/:quoteId/accuracy-feedback', isAuthenticated, async (req, res) => {
  try {
    const { actualPrice, feedback } = req.body;
    
    if (actualPrice === undefined) {
      throw badRequestError('actualPrice is required');
    }
    
    const result = await quoting.aiAccuracyService.recordAccuracy(
      req.params.quoteId,
      actualPrice,
      feedback || {}
    );
    
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/analytics/ai-accuracy', isAuthenticated, async (req, res) => {
  try {
    const { period } = req.query;
    const stats = await quoting.aiAccuracyService.getAccuracyStats(period || 'month');
    res.json({ success: true, data: stats });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/analytics/ai-suggestions', isAuthenticated, async (req, res) => {
  try {
    const suggestions = await quoting.aiAccuracyService.getImprovementSuggestions();
    res.json({ success: true, data: suggestions });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/analytics/ai-accuracy/update-aggregates', isAuthenticated, async (req, res) => {
  try {
    await quoting.aiAccuracyService.updateAggregates();
    res.json({ success: true, message: 'Accuracy aggregates updated' });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
