const client = require('openid-client');
const { Strategy } = require('openid-client/passport');
const passport = require('passport');
const session = require('express-session');
const memoize = require('memoizee');
const connectPg = require('connect-pg-simple');
const db = require('./db');

const offlineUser = {
  id: 'offline-user',
  email: 'owner@treepro.ai',
  first_name: 'TreePro',
  last_name: 'Owner',
  profile_image_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let isOfflineAuth = false;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? 'https://replit.com/oidc'),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
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
  const query = `
    INSERT INTO users (id, email, first_name, last_name, profile_image_url, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      profile_image_url = EXCLUDED.profile_image_url,
      updated_at = NOW()
    RETURNING *;
  `;
  
  const values = [
    claims.sub,
    claims.email || null,
    claims.first_name || null,
    claims.last_name || null,
    claims.profile_image_url || null,
  ];
  
  const result = await db.query(query, values);
  return result.rows[0];
}

async function getUser(userId) {
  if (isOfflineAuth) {
    return offlineUser.id === userId ? offlineUser : null;
  }

  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await db.query(query, [userId]);
  return result.rows[0];
}

async function setupAuth(app) {
  const disableOidc =
    process.env.DISABLE_OIDC === 'true' ||
    !process.env.REPL_ID ||
    !process.env.SESSION_SECRET ||
    !process.env.DATABASE_URL;

  if (disableOidc) {
    isOfflineAuth = true;

    app.use((req, _res, next) => {
      req.user = offlineUser;
      req.isAuthenticated = () => true;
      next();
    });

    app.get('/api/auth/user', (_req, res) => {
      res.json(offlineUser);
    });

    app.get('/api/login', (_req, res) => {
      res.json({ success: true, mode: 'offline' });
    });

    app.get('/api/logout', (_req, res) => {
      res.json({ success: true, mode: 'offline' });
    });

    return;
  }

  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
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

  app.get('/api/login', (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: 'login consent',
      scope: ['openid', 'email', 'profile', 'offline_access'],
    })(req, res, next);
  });

  app.get('/api/callback', (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: '/',
      failureRedirect: '/api/login',
    })(req, res, next);
  });

  app.get('/api/logout', (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

const isAuthenticated = async (req, res, next) => {
  if (isOfflineAuth) {
    return next();
  }

  const user = req.user;

  if (!req.isAuthenticated() || !user.expires_at) {
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
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = { setupAuth, isAuthenticated, getUser };
