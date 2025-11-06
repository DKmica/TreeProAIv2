const { Pool } = require('pg');

let queryImpl;

if (process.env.DATABASE_URL) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  queryImpl = (text, params) => pool.query(text, params);
} else {
  const { createInMemoryDatabase } = require('./inMemoryDb');
  const inMemory = createInMemoryDatabase();
  queryImpl = (text, params) => inMemory.query(text, params);
}

module.exports = {
  query: (text, params) => queryImpl(text, params),
};
