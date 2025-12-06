const dbConfig = {
  pool: {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
  ssl: {
    production: { rejectUnauthorized: false },
    development: false,
  },
  retry: {
    maxAttempts: 2,
    connectionTerminatedCode: '57P01',
  },
};

const getSSLConfig = () => {
  return process.env.NODE_ENV === 'production' 
    ? dbConfig.ssl.production 
    : dbConfig.ssl.development;
};

const getPoolConfig = (connectionString) => ({
  connectionString,
  ssl: getSSLConfig(),
  max: dbConfig.pool.max,
  idleTimeoutMillis: dbConfig.pool.idleTimeoutMillis,
  connectionTimeoutMillis: dbConfig.pool.connectionTimeoutMillis,
});

module.exports = {
  dbConfig,
  getSSLConfig,
  getPoolConfig,
};
