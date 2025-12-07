const { discovery, refreshTokenGrant, buildEndSessionUrl } = require('openid-client');
const { Strategy } = require('openid-client/passport');
const passport = require('passport');
const session = require('express-session');
const memoize = require('memoizee');
const connectPg = require('connect-pg-simple');
const db = require('./db');

const getOidcConfig = memoize(
  async () => {
    return await discovery(
      new URL(process.env.ISSUER_URL || 'https://replit.com/oidc'),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: 'sessions',
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims) {
  const userId = claims.sub;
  const email = claims.email || null;
  const firstName = claims.first_name || null;
  const lastName = claims.last_name || null;
  const profileImageUrl = claims.profile_image_url || null;

  const existingUser = await db.query(
    'SELECT id FROM users WHERE id = $1',
    [userId]
  );

  if (existingUser.rows.length > 0) {
    await db.query(
      `UPDATE users SET email = $1, first_name = $2, last_name = $3, profile_image_url = $4, updated_at = NOW() WHERE id = $5`,
      [email, firstName, lastName, profileImageUrl, userId]
    );
  } else {
    await db.query(
      `INSERT INTO users (id, email, first_name, last_name, profile_image_url, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userId, email, firstName, lastName, profileImageUrl]
    );
  }
}

async function setupAuth(app) {
  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify = async (tokens, verified) => {
    const claims = tokens.claims();
    const user = {
      id: claims.sub,
    };
    updateUserSession(user, tokens);
    await upsertUser(claims);
    verified(null, user);
  };

  const registeredStrategies = new Set();

  const ensureStrategy = (domain) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: 'openid email profile offline_access',
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));

  const getEffectiveHost = (req) => {
    return req.headers['x-forwarded-host'] || req.hostname;
  };

  app.get('/api/login', (req, res, next) => {
    const host = getEffectiveHost(req);
    ensureStrategy(host);
    passport.authenticate(`replitauth:${host}`, {
      prompt: 'login consent',
      scope: ['openid', 'email', 'profile', 'offline_access'],
    })(req, res, next);
  });

  app.get('/api/callback', (req, res, next) => {
    const host = getEffectiveHost(req);
    ensureStrategy(host);
    passport.authenticate(`replitauth:${host}`, {
      successReturnToOrRedirect: '/',
      failureRedirect: '/api/login',
    })(req, res, next);
  });

  app.get('/api/logout', (req, res) => {
    const host = getEffectiveHost(req);
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    req.logout(() => {
      res.redirect(
        buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${protocol}://${host}`,
        }).href
      );
    });
  });
}

const isAuthenticated = async (req, res, next) => {
  const user = req.user;

  if (!req.isAuthenticated || !req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

async function getUser(userId) {
  const result = await db.query(
    'SELECT id, email, first_name, last_name, profile_image_url, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = { 
  setupAuth, 
  isAuthenticated,
  getUser,
  getSession
};
