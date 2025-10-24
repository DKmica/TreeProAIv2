const path = require('path');
// Load environment variables from .env file in the backend directory
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');


const app = express();
// Use the PORT environment variable provided by Cloud Run, default to 8080
const PORT = process.env.PORT || 8080;

app.use(cors()); // Keep CORS for local development if needed, Cloud Run handles origins via ingress
app.use(express.json());

// --- API Routes ---
const apiRouter = express.Router();
// Mount the API router under /api
app.use('/api', apiRouter);

// Health check endpoint (moved under /api for clarity)
apiRouter.get('/health', (req, res) => {
  res.status(200).send('TreePro AI Backend is running.');
});

// Generic function to handle errors
const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

// --- Generic CRUD Endpoints ---
const setupCrudEndpoints = (router, tableName) => {
  // GET all
  router.get(`/${tableName}`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${tableName}`);
      res.json(rows);
    } catch (err) {
      handleError(res, err);
    }
  });

  // GET by ID
  router.get(`/${tableName}/:id`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST new
  router.post(`/${tableName}`, async (req, res) => { // Changed from apiRouter to router
    try {
        const columns = Object.keys(req.body);
        const values = Object.values(req.body);
        const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');

        const newId = uuidv4();

        // Ensure column names are quoted if they might contain special characters or keywords
        const queryText = `INSERT INTO ${tableName} (id, ${columns.map(c => `"${c}"`).join(', ')}) VALUES ($1, ${placeholders}) RETURNING *`;

        const { rows } = await db.query(queryText, [newId, ...values]);
        res.status(201).json(rows[0]);
    } catch (err) {
        handleError(res, err);
    }
  });

  // PUT update by ID
  router.put(`/${tableName}/:id`, async (req, res) => {
    try {
      const columns = Object.keys(req.body);
      const values = Object.values(req.body);
      // Ensure column names are quoted
      const setString = columns.map((col, i) => `"${col}" = $${i + 2}`).join(', ');

      const queryText = `UPDATE ${tableName} SET ${setString} WHERE id = $1 RETURNING *`;
      const { rows } = await db.query(queryText, [req.params.id, ...values]);

      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  });

  // DELETE by ID
  router.delete(`/${tableName}/:id`, async (req, res) => {
    try {
      const result = await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  });
};

// Setup CRUD endpoints for all resources
const resources = ['customers', 'leads', 'quotes', 'jobs', 'invoices', 'employees', 'equipment'];
resources.forEach(resource => {
  setupCrudEndpoints(apiRouter, resource); // Use apiRouter here
});

// --- Static File Serving ---
// Serve static files from the 'public' directory (where frontend build is copied)
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing: for any request that doesn't match API or static file, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}, serving API at /api and frontend static files.`);
});