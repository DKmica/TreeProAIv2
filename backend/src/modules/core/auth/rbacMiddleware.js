const { hasPermission, ROLES, ACTIONS, RESOURCES, isRoleAtLeast } = require('./permissions');
const { getUserRoles, getPrimaryRole } = require('./roleLoader');
const { logPermissionDenied, getClientIp } = require('./auditLogger');

async function loadUserContext(req, res, next) {
  try {
    if (req.user && req.user.id) {
      const roles = await getUserRoles(req.user.id);
      req.user.roles = roles;
      req.user.primaryRole = getPrimaryRole(roles);
    } else if (req.user) {
      console.error('User object exists but missing id - clearing context');
      req.user = null;
      req.isAuthenticated = () => false;
    }
    
    next();
  } catch (err) {
    console.error('Error loading user context - denying access:', err.message);
    req.user = null;
    req.isAuthenticated = () => false;
    next();
  }
}

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ 
        success: false, 
        error: 'User context not loaded' 
      });
    }
    
    const userRoles = req.user.roles;
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      await logPermissionDenied({
        userId: req.user.id,
        resource: 'role_check',
        action: 'access',
        roles: userRoles,
        ipAddress: getClientIp(req),
        path: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }
    
    next();
  };
}

function requirePermission(resource, action) {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ 
        success: false, 
        error: 'User context not loaded' 
      });
    }
    
    const userRoles = req.user.roles;
    const hasAccess = userRoles.some(role => hasPermission(role, resource, action));
    
    if (!hasAccess) {
      await logPermissionDenied({
        userId: req.user.id,
        resource,
        action,
        roles: userRoles,
        ipAddress: getClientIp(req),
        path: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions',
        details: {
          resource,
          action,
          required: `${action} permission on ${resource}`
        }
      });
    }
    
    next();
  };
}

function requireMinimumRole(minimumRole) {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    if (!req.user || !req.user.primaryRole) {
      return res.status(401).json({ 
        success: false, 
        error: 'User context not loaded' 
      });
    }
    
    if (!isRoleAtLeast(req.user.primaryRole, minimumRole)) {
      await logPermissionDenied({
        userId: req.user.id,
        resource: 'role_hierarchy',
        action: 'access',
        roles: req.user.roles,
        ipAddress: getClientIp(req),
        path: req.originalUrl,
        method: req.method
      });
      
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient role level' 
      });
    }
    
    next();
  };
}

function requireOwnerOrAdmin() {
  return requireRole(ROLES.OWNER, ROLES.ADMIN);
}

function requireManager() {
  return requireMinimumRole(ROLES.MANAGER);
}

function mapHttpMethodToAction(method) {
  const mapping = {
    'GET': ACTIONS.READ,
    'POST': ACTIONS.CREATE,
    'PUT': ACTIONS.UPDATE,
    'PATCH': ACTIONS.UPDATE,
    'DELETE': ACTIONS.DELETE
  };
  
  return mapping[method.toUpperCase()] || ACTIONS.READ;
}

function requireResourcePermission(resource) {
  return async (req, res, next) => {
    const action = mapHttpMethodToAction(req.method);
    
    if (req.method === 'GET' && !req.params.id) {
      return requirePermission(resource, ACTIONS.LIST)(req, res, next);
    }
    
    return requirePermission(resource, action)(req, res, next);
  };
}

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
  RESOURCES
};
