const {
  loadUserContext,
  requireRole,
  requirePermission,
  requireMinimumRole,
  requireOwnerOrAdmin,
  requireManager,
  requireResourcePermission,
  mapHttpMethodToAction
} = require('./rbacMiddleware');

const {
  ROLES,
  ACTIONS,
  RESOURCES,
  PERMISSIONS_MATRIX,
  hasPermission,
  getPermittedActions,
  getRoleHierarchy,
  isRoleAtLeast
} = require('./permissions');

const {
  getUserRoles,
  getPrimaryRole,
  invalidateUserRoleCache,
  clearRoleCache,
  assignRole,
  removeRole
} = require('./roleLoader');

const {
  logAuditEvent,
  logPermissionDenied,
  logLogin,
  logDataChange,
  getClientIp
} = require('./auditLogger');

module.exports = {
  loadUserContext,
  requireRole,
  requirePermission,
  requireMinimumRole,
  requireOwnerOrAdmin,
  requireManager,
  requireResourcePermission,
  mapHttpMethodToAction,
  
  ROLES,
  ACTIONS,
  RESOURCES,
  PERMISSIONS_MATRIX,
  hasPermission,
  getPermittedActions,
  getRoleHierarchy,
  isRoleAtLeast,
  
  getUserRoles,
  getPrimaryRole,
  invalidateUserRoleCache,
  clearRoleCache,
  assignRole,
  removeRole,
  
  logAuditEvent,
  logPermissionDenied,
  logLogin,
  logDataChange,
  getClientIp
};
