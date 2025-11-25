const defaultUser = {
  id: 'local-admin',
  email: process.env.ADMIN_EMAIL || 'owner@treepro.ai',
  first_name: process.env.ADMIN_FIRST_NAME || 'TreePro',
  last_name: process.env.ADMIN_LAST_NAME || 'Owner',
  profile_image_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const authenticatedUser = {
  ...defaultUser,
  claims: { sub: defaultUser.id },
};

function getRequestToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const apiKey = req.headers['x-api-key'];
  return typeof apiKey === 'string' ? apiKey.trim() : null;
}

async function setupAuth(app) {
  app.use((req, _res, next) => {
    const requiredToken = process.env.AUTH_TOKEN;
    const providedToken = getRequestToken(req);

    if (!requiredToken) {
      req.user = authenticatedUser;
      req.isAuthenticated = () => true;
      return next();
    }

    if (providedToken && providedToken === requiredToken) {
      req.user = authenticatedUser;
      req.isAuthenticated = () => true;
      return next();
    }

    req.user = null;
    req.isAuthenticated = () => false;
    return next();
  });

  app.get('/api/login', (_req, res) => {
    res.status(200).json({
      message: 'Supply AUTH_TOKEN as Bearer token or x-api-key header to authenticate.',
    });
  });

  app.get('/api/logout', (_req, res) => {
    res.status(200).json({ message: 'Logged out' });
  });
}

async function getUser(userId) {
  return userId === defaultUser.id ? defaultUser : null;
}

const isAuthenticated = async (req, res, next) => {
  const requiredToken = process.env.AUTH_TOKEN;

  if (!requiredToken) {
    req.user = authenticatedUser;
    return next();
  }

  const providedToken = getRequestToken(req);

  if (providedToken && providedToken === requiredToken) {
    req.user = authenticatedUser;
    return next();
  }

  return res.status(401).json({ message: 'Unauthorized' });
};

module.exports = { setupAuth, isAuthenticated, getUser };
