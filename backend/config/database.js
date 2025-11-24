/**
 * Centralized database access so modular routers can import a single source of
 * truth for pooled connections. This currently re-exports the existing db
 * helper to avoid behavior changes while Phase 1 refactors proceed.
 */
module.exports = require('../db');
