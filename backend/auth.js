const { loadUserContext, ROLES } = require('./src/modules/core/auth');
const replitAuth = require('./replitAuth');
const rbac = require('./src/modules/core/auth');

async function setupAuth(app) {
  await replitAuth.setupAuth(app);
  
  app.use(async (req, res, next) => {
    if (req.user && req.user.claims) {
      await loadUserContext(req, res, () => {});
    }
    next();
  });
}

const isAuthenticated = replitAuth.isAuthenticated;
const getUser = replitAuth.getUser;

module.exports = { 
  setupAuth, 
  isAuthenticated, 
  getUser,
  requireRole: rbac.requireRole,
  requirePermission: rbac.requirePermission,
  requireResourcePermission: rbac.requireResourcePermission,
  requireOwnerOrAdmin: rbac.requireOwnerOrAdmin,
  requireManager: rbac.requireManager,
  ROLES: rbac.ROLES,
  ACTIONS: rbac.ACTIONS,
  RESOURCES: rbac.RESOURCES
};
