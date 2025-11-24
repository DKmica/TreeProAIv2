const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function buildCorsOptions() {
  if (!allowedOrigins.length) {
    return { origin: true, credentials: true };
  }

  return {
    origin(origin, callback) {
      // Allow non-browser or same-origin requests without CORS header checks
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
}

module.exports = { buildCorsOptions };
