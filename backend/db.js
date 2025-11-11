const { Pool } = require('pg');

let queryImpl;
let getClientImpl;
let pool;
let isShuttingDown = false;

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

  const safeQuery = async (text, params) => {
    if (isShuttingDown) {
      throw new Error('Database is shutting down');
    }
    
    try {
      return await pool.query(text, params);
    } catch (err) {
      if (err.code === '57P01') {
        console.error('⚠️ Connection terminated by administrator. Retrying once...');
        try {
          return await pool.query(text, params);
        } catch (retryErr) {
          console.error('❌ Retry failed:', retryErr.message);
          throw retryErr;
        }
      }
      throw err;
    }
  };

  queryImpl = (text, params) => safeQuery(text, params);
  getClientImpl = () => pool.connect();
} else {
  const { createInMemoryDatabase } = require('./inMemoryDb');
  const inMemory = createInMemoryDatabase();
  queryImpl = (text, params) => inMemory.query(text, params);
  getClientImpl = () => {
    throw new Error('Transactions not supported with in-memory database');
  };
}

const closePool = async () => {
  if (pool && !isShuttingDown) {
    isShuttingDown = true;
    console.log('🔄 Closing database pool...');
    try {
      await pool.end();
      console.log('✅ Database pool closed');
    } catch (err) {
      console.error('❌ Error closing database pool:', err.message);
    }
  }
};

module.exports = {
  query: (text, params) => queryImpl(text, params),
  getClient: () => getClientImpl(),
  closePool,
  pool,
};
