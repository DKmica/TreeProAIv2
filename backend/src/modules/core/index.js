/**
 * TreePro AI - Core Module
 * 
 * Central export for all core infrastructure:
 * - Authentication & RBAC
 * - Database connections
 * - Shared utilities
 */

const auth = require('./auth');
const db = require('./db');
const utils = require('./utils');

module.exports = {
  auth,
  db,
  utils,
  
  ...auth,
  ...db,
  ...utils,
};
