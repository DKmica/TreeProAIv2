const { Pool } = require('pg');
const { getPoolConfig, dbConfig } = require('./config');

let queryImpl;
let getClientImpl;
let pool;
let isShuttingDown = false;

const initializePool = () => {
  if (process.env.DATABASE_URL) {
    pool = new Pool(getPoolConfig(process.env.DATABASE_URL));

    pool.on('error', (err, client) => {
      console.error('❌ Unexpected error on idle database client:', err.message);
      console.error('   Code:', err.code);
      console.error('   This error has been caught and will not crash the server.');
    });

    let connectionCount = 0;
    pool.on('connect', (client) => {
      connectionCount++;
      if (connectionCount === 1) {
        console.log('✅ Database connection pool ready');
      }
    });

    const safeQuery = async (text, params) => {
      if (isShuttingDown) {
        throw new Error('Database is shutting down');
      }
      
      try {
        return await pool.query(text, params);
      } catch (err) {
        if (err.code === dbConfig.retry.connectionTerminatedCode) {
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
    const { createInMemoryDatabase } = require('../../../inMemoryDb');
    const inMemory = createInMemoryDatabase();
    queryImpl = (text, params) => inMemory.query(text, params);
    getClientImpl = () => {
      throw new Error('Transactions not supported with in-memory database');
    };
  }
};

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

initializePool();

const query = (text, params) => queryImpl(text, params);
const getClient = () => getClientImpl();
const getPool = () => pool;
const isPoolShuttingDown = () => isShuttingDown;

module.exports = {
  query,
  getClient,
  closePool,
  pool,
  getPool,
  isPoolShuttingDown,
};
