/**
 * Database module - re-exports from the modular core/db module
 * for backward compatibility with existing imports.
 * 
 * @see backend/src/modules/core/db/ for the actual implementation
 */
const { query, getClient, closePool, pool } = require('./src/modules/core/db');

module.exports = {
  query,
  getClient,
  closePool,
  pool,
};
