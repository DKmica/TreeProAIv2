const {
  query,
  getClient,
  closePool,
  pool,
  getPool,
  isPoolShuttingDown,
} = require('./connection');

const {
  dbConfig,
  getSSLConfig,
  getPoolConfig,
} = require('./config');

module.exports = {
  query,
  getClient,
  closePool,
  pool,
  getPool,
  isPoolShuttingDown,
  
  dbConfig,
  getSSLConfig,
  getPoolConfig,
};
