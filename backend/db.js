const { Pool } = require('pg');

let queryImpl;
let getClientImpl;
let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle database client:', err.message);
    console.error('   Code:', err.code);
    console.error('   This error has been caught and will not crash the server.');
  });

  pool.on('connect', (client) => {
    console.log('✅ Database client connected');
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
  pool,
};
