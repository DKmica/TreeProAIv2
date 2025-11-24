const express = require('express');
const cors = require('cors');
const { buildCorsOptions } = require('../middleware/cors');

/**
 * Apply the standard middleware stack for the API.
 *
 * We keep this separate from server.js so feature-flagged modular routing can
 * share a consistent middleware foundation without duplicating setup logic.
 * The Stripe webhook must be registered before this helper is invoked to avoid
 * conflicts between express.json() and express.raw().
 *
 * @param {express.Application} app - Express application instance
 * @param {{ enableCors?: boolean, corsOptions?: import('cors').CorsOptions }} [options]
 */
function applyStandardMiddleware(app, options = {}) {
  const { enableCors = true, corsOptions } = options;

  if (enableCors) {
    app.use(cors(corsOptions || buildCorsOptions()));
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
}

module.exports = { applyStandardMiddleware };
