const path = require('path');
// Load environment variables from .env file in the backend directory
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('TreePro AI Backend is running.');
});

const apiRouter = express.Router();
app.use('/api', apiRouter);

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
  apiRouter.post(`/${tableName}`, async (req, res) => {
    try {
        const columns = Object.keys(req.body);
        const values = Object.values(req.body);
        const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');

        const newId = uuidv4();

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
  setupCrudEndpoints(apiRouter, resource);
});


app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});