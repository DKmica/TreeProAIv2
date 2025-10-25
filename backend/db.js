const { Pool } = require('pg');

// The Pool will use a connection string from the DATABASE_URL environment variable.
// This is a standard practice for services like Heroku, Render, and can be easily
// constructed for Google Cloud SQL.
// Example: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Use SSL for production connections to Cloud SQL, but not for local development
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  // A query function that will be used by the server to interact with the database.
  query: (text, params) => pool.query(text, params),
};