const { loadUserContext, ROLES } = require('./src/modules/core/auth');
const localAuth = require('./localAuth');
const rbac = require('./src/modules/core/auth');

async function setupAuth(app) {
  await localAuth.setupAuth(app);

  app.use(async (req, res, next) => {
    if (req.user && req.user.id) {
      await loadUserContext(req, res, () => {});
    }
    next();
  });
}

const isAuthenticated = localAuth.isAuthenticated;
const getUser = localAuth.getUser;

module.exports = {
  setupAuth,
  isAuthenticated,
  getUser,
  login: localAuth.login,
  signup: localAuth.signup,
  logout: localAuth.logout,
  requireRole: rbac.requireRole,
  requirePermission: rbac.requirePermission,
  requireResourcePermission: rbac.requireResourcePermission,
  requireOwnerOrAdmin: rbac.requireOwnerOrAdmin,
  requireManager: rbac.requireManager,
  ROLES: rbac.ROLES,
  ACTIONS: rbac.ACTIONS,
  RESOURCES: rbac.RESOURCES
};
