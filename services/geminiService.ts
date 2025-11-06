// Main Gemini Service - Re-exports from modular services
export { generateTreeEstimate, generateJobHazardAnalysis } from './gemini/estimateService';
export { generateSocialMediaPost, optimizeSEOContent, generateEmailCampaign } from './gemini/marketingService';
export { getAiCoreInsights, generateUpsellSuggestions, generateMaintenanceAdvice } from './gemini/businessService';