const proposalService = require('./proposalService');
const pricingOptionsService = require('./pricingOptionsService');
const versioningService = require('./versioningService');
const signatureService = require('./signatureService');
const conversionAnalyticsService = require('./conversionAnalyticsService');
const aiAccuracyService = require('./aiAccuracyService');

module.exports = {
  proposalService,
  pricingOptionsService,
  versioningService,
  signatureService,
  conversionAnalyticsService,
  aiAccuracyService,

  getTemplates: proposalService.getTemplates,
  getTemplateById: proposalService.getTemplateById,
  createTemplate: proposalService.createTemplate,
  updateTemplate: proposalService.updateTemplate,
  getSections: proposalService.getSections,
  applyTemplateToQuote: proposalService.applyTemplateToQuote,
  generateProposalData: proposalService.generateProposalData,

  getOptionsForQuote: pricingOptionsService.getOptionsForQuote,
  createOption: pricingOptionsService.createOption,
  updateOption: pricingOptionsService.updateOption,
  deleteOption: pricingOptionsService.deleteOption,
  setRecommended: pricingOptionsService.setRecommended,
  selectOption: pricingOptionsService.selectOption,
  calculateTotals: pricingOptionsService.calculateTotals,

  createVersion: versioningService.createVersion,
  getVersionHistory: versioningService.getVersionHistory,
  getVersion: versioningService.getVersion,
  restoreVersion: versioningService.restoreVersion,
  compareVersions: versioningService.compareVersions,

  requestSignature: signatureService.requestSignature,
  captureSignature: signatureService.captureSignature,
  getSignature: signatureService.getSignature,
  validateSignature: signatureService.validateSignature,

  trackConversion: conversionAnalyticsService.trackConversion,
  getConversionMetrics: conversionAnalyticsService.getConversionMetrics,
  getLostQuoteAnalysis: conversionAnalyticsService.getLostQuoteAnalysis,
  getFollowUpEffectiveness: conversionAnalyticsService.getFollowUpEffectiveness,
  recordFollowUp: conversionAnalyticsService.recordFollowUp,
  markQuoteLost: conversionAnalyticsService.markQuoteLost,

  recordAccuracy: aiAccuracyService.recordAccuracy,
  getAccuracyStats: aiAccuracyService.getAccuracyStats,
  getImprovementSuggestions: aiAccuracyService.getImprovementSuggestions,
  updateAggregates: aiAccuracyService.updateAggregates,
  calculateAccuracyScore: aiAccuracyService.calculateAccuracyScore,
  ACCURACY_THRESHOLDS: aiAccuracyService.ACCURACY_THRESHOLDS
};
