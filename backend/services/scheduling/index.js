const routeOptimizationService = require('./routeOptimizationService');
const crewAssignmentService = require('./crewAssignmentService');
const conflictResolutionService = require('./conflictResolutionService');
const notificationService = require('./notificationService');
const jobDurationService = require('./jobDurationService');
const crewStatusService = require('./crewStatusService');

module.exports = {
  routeOptimizationService,
  crewAssignmentService,
  conflictResolutionService,
  notificationService,
  jobDurationService,
  crewStatusService,
  
  optimizeRoute: routeOptimizationService.optimizeRoute,
  getDistanceMatrix: routeOptimizationService.getDistanceMatrix,
  reorderStops: routeOptimizationService.reorderStops,
  getRoutePlan: routeOptimizationService.getRoutePlan,
  
  findMatchingCrews: crewAssignmentService.findMatchingCrews,
  checkCapacity: crewAssignmentService.checkCapacity,
  getCrewSkills: crewAssignmentService.getCrewSkills,
  assignCrewToJob: crewAssignmentService.assignCrewToJob,
  unassignCrewFromJob: crewAssignmentService.unassignCrewFromJob,
  getAvailableCrewsForDate: crewAssignmentService.getAvailableCrewsForDate,
  checkSkillMatch: crewAssignmentService.checkSkillMatch,
  
  getConflicts: conflictResolutionService.getConflicts,
  suggestAlternativeCrews: conflictResolutionService.suggestAlternativeCrews,
  suggestAlternativeDates: conflictResolutionService.suggestAlternativeDates,
  getConflictSeverityScore: conflictResolutionService.getConflictSeverityScore,
  resolveConflict: conflictResolutionService.resolveConflict,
  
  sendOnMyWay: notificationService.sendOnMyWay,
  sendArrivalNotification: notificationService.sendArrivalNotification,
  sendCompletionNotification: notificationService.sendCompletionNotification,
  sendDelayNotification: notificationService.sendDelayNotification,
  sendRescheduleNotification: notificationService.sendRescheduleNotification,
  getNotificationHistory: notificationService.getNotificationHistory,
  
  recordDuration: jobDurationService.recordDuration,
  predictDuration: jobDurationService.predictDuration,
  getAveragesByType: jobDurationService.getAveragesByType,
  getDurationHistory: jobDurationService.getDurationHistory,
  
  updateCrewStatus: crewStatusService.updateStatus,
  getCurrentStatus: crewStatusService.getCurrentStatus,
  getAllCrewStatuses: crewStatusService.getAllCrewStatuses,
  getLocationHistory: crewStatusService.getLocationHistory,
  setCrewOnSite: crewStatusService.setCrewOnSite,
  setCrewEnRoute: crewStatusService.setCrewEnRoute,
  setCrewAvailable: crewStatusService.setCrewAvailable,
  setCrewOffDuty: crewStatusService.setCrewOffDuty
};
