const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const connectPg = require('connect-pg-simple');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { logLogin } = require('./src/modules/core/auth');

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

function getSession() {
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: SESSION_TTL,
    tableName: 'sessions'
  });

  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL
    }
  });
}

async function findUserByEmail(email) {
  const result = await db.query(
    'SELECT id, email, first_name, last_name, profile_image_url, password_hash, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function getUser(userId) {
  const result = await db.query(
    'SELECT id, email, first_name, last_name, profile_image_url, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

async function assignDefaultRole(userId, email) {
  // Copy any pre-registered roles for matching email
  if (email) {
    const preRegistered = await db.query(
      'SELECT ur.role FROM user_roles ur JOIN users u ON ur.user_id = u.id WHERE u.email = $1 AND u.id != $2',
      [email, userId]
    );

    if (preRegistered.rows.length > 0) {
      for (const row of preRegistered.rows) {
        await db.query(
          `INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, row.role]
        );
      }
      await db.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email = $1 AND id != $2)', [email, userId]);
      await db.query('DELETE FROM users WHERE email = $1 AND id != $2', [email, userId]);
      return;
    }
  }

  const existingRoles = await db.query('SELECT COUNT(*) as count FROM user_roles');
  const defaultRole = existingRoles.rows[0].count === '0' ? 'owner' : 'crew_member';
  await db.query(
    `INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, defaultRole]
  );
}

async function createUser({ email, password, firstName, lastName }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query(
    `INSERT INTO users (email, first_name, last_name, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING id, email, first_name, last_name, profile_image_url, created_at, updated_at`,
    [email, firstName || null, lastName || null, passwordHash]
  );

  const user = result.rows[0];
  await assignDefaultRole(user.id, user.email);
  return user;
}

async function setupAuth(app) {
  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, cb) => cb(null, { id: user.id }));
  passport.deserializeUser(async (sessionUser, cb) => {
    try {
      const user = await getUser(sessionUser.id);
      cb(null, user || false);
    } catch (err) {
      cb(err);
    }
  });

  passport.use(
    new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
      try {
        const user = await findUserByEmail(email);
        if (!user || !user.password_hash) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        const { password_hash, ...safeUser } = user;
        return done(null, safeUser);
      } catch (err) {
        return done(err);
      }
    })
  );
}

function validateCredentials(email, password) {
  if (!email || !password) {
    return 'Email and password are required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  return null;
}

async function signup(req, res, next) {
  try {
    const { email, password, firstName, lastName } = req.body;
    const validationError = validateCredentials(email, password);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await createUser({ email, password, firstName, lastName });

    req.login(user, async (err) => {
      if (err) return next(err);
      await logLogin({ userId: user.id, method: 'local', metadata: { email } });
      return res.json(user);
    });
  } catch (err) {
    console.error('Signup error:', err);
    next(err);
  }
}

function login(req, res, next) {
  passport.authenticate('local', async (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Invalid credentials' });
    }

    req.login(user, async (loginErr) => {
      if (loginErr) return next(loginErr);
      await logLogin({ userId: user.id, method: 'local', metadata: { email: user.email } });
      res.json(user);
    });
  })(req, res, next);
}

function logout(req, res) {
  req.logout(() => {
    req.session?.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
}

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

module.exports = {
  setupAuth,
  isAuthenticated,
  getUser,
  signup,
  login,
  logout,
  getSession
};
