const { Pool } = require('pg');

let queryImpl;
let getClientImpl;

if (process.env.DATABASE_URL) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  queryImpl = (text, params) => pool.query(text, params);
  getClientImpl = () => pool.connect();
} else {
  const { createInMemoryDatabase } = require('./inMemoryDb');
  const inMemory = createInMemoryDatabase();
  queryImpl = (text, params) => inMemory.query(text, params);
  getClientImpl = () => {
    throw new Error('Transactions not supported with in-memory database');
  };
}

module.exports = {
  query: (text, params) => queryImpl(text, params),
  getClient: () => getClientImpl(),
};
