const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const apiRouter = express.Router();
app.use('/api', apiRouter);

apiRouter.get('/health', (req, res) => {
  res.status(200).send('TreePro AI Backend is running.');
});

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
};

// Helper function to transform database row to API format
const transformRow = (row, tableName) => {
  if (!row) return null;
  
  const transformed = { ...row };
  
  // Handle coordinate fields
  if (tableName === 'customers' || tableName === 'employees') {
    if (row.lat !== undefined && row.lon !== undefined) {
      transformed.coordinates = { lat: row.lat, lng: row.lon };
      delete transformed.lat;
      delete transformed.lon;
    }
  }
  
  if (tableName === 'jobs') {
    if (row.clock_in_lat !== undefined && row.clock_in_lon !== undefined) {
      transformed.clockInCoordinates = { lat: row.clock_in_lat, lng: row.clock_in_lon };
      delete transformed.clock_in_lat;
      delete transformed.clock_in_lon;
    }
    if (row.clock_out_lat !== undefined && row.clock_out_lon !== undefined) {
      transformed.clockOutCoordinates = { lat: row.clock_out_lat, lng: row.clock_out_lon };
      delete transformed.clock_out_lat;
      delete transformed.clock_out_lon;
    }
    // Transform snake_case to camelCase for job fields
    if (row.work_started_at !== undefined) {
      transformed.workStartedAt = row.work_started_at;
      delete transformed.work_started_at;
    }
    if (row.work_ended_at !== undefined) {
      transformed.workEndedAt = row.work_ended_at;
      delete transformed.work_ended_at;
    }
    if (row.assigned_crew !== undefined) {
      transformed.assignedCrew = row.assigned_crew;
      delete transformed.assigned_crew;
    }
    if (row.stump_grinding_price !== undefined) {
      transformed.stumpGrindingPrice = row.stump_grinding_price;
      delete transformed.stump_grinding_price;
    }
    if (row.quote_id !== undefined) {
      transformed.quoteId = row.quote_id;
      delete transformed.quote_id;
    }
    if (row.customer_name !== undefined) {
      transformed.customerName = row.customer_name;
      delete transformed.customer_name;
    }
    if (row.scheduled_date !== undefined) {
      transformed.scheduledDate = row.scheduled_date;
      delete transformed.scheduled_date;
    }
  }
  
  // Transform other snake_case fields
  if (row.created_at !== undefined) {
    transformed.createdAt = row.created_at;
    delete transformed.created_at;
  }
  
  return transformed;
};

// Helper function to transform API data to database format
const transformToDb = (data, tableName) => {
  const transformed = { ...data };
  
  // Handle coordinate fields
  if ((tableName === 'customers' || tableName === 'employees') && data.coordinates) {
    transformed.lat = data.coordinates.lat;
    transformed.lon = data.coordinates.lng;
    delete transformed.coordinates;
  }
  
  if (tableName === 'jobs') {
    if (data.clockInCoordinates) {
      transformed.clock_in_lat = data.clockInCoordinates.lat;
      transformed.clock_in_lon = data.clockInCoordinates.lng;
      delete transformed.clockInCoordinates;
    }
    if (data.clockOutCoordinates) {
      transformed.clock_out_lat = data.clockOutCoordinates.lat;
      transformed.clock_out_lon = data.clockOutCoordinates.lng;
      delete transformed.clockOutCoordinates;
    }
    // Transform camelCase to snake_case
    if (data.workStartedAt !== undefined) {
      transformed.work_started_at = data.workStartedAt;
      delete transformed.workStartedAt;
    }
    if (data.workEndedAt !== undefined) {
      transformed.work_ended_at = data.workEndedAt;
      delete transformed.workEndedAt;
    }
    if (data.assignedCrew !== undefined) {
      transformed.assigned_crew = data.assignedCrew;
      delete transformed.assignedCrew;
    }
    if (data.stumpGrindingPrice !== undefined) {
      transformed.stump_grinding_price = data.stumpGrindingPrice;
      delete transformed.stumpGrindingPrice;
    }
    if (data.quoteId !== undefined) {
      transformed.quote_id = data.quoteId;
      delete transformed.quoteId;
    }
    if (data.customerName !== undefined) {
      transformed.customer_name = data.customerName;
      delete transformed.customerName;
    }
    if (data.scheduledDate !== undefined) {
      transformed.scheduled_date = data.scheduledDate;
      delete transformed.scheduledDate;
    }
  }
  
  if (data.createdAt !== undefined) {
    transformed.created_at = data.createdAt;
    delete transformed.createdAt;
  }
  
  return transformed;
};

const setupCrudEndpoints = (router, tableName) => {
  // GET all
  router.get(`/${tableName}`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${tableName}`);
      const transformed = rows.map(row => transformRow(row, tableName));
      res.json(transformed);
    } catch (err) {
      handleError(res, err);
    }
  });

  // GET by ID
  router.get(`/${tableName}/:id`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(transformRow(rows[0], tableName));
    } catch (err) {
      handleError(res, err);
    }
  });

  // POST new
  router.post(`/${tableName}`, async (req, res) => {
    try {
      const data = transformToDb(req.body, tableName);
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
      const newId = uuidv4();

      const queryText = `INSERT INTO ${tableName} (id, ${columns.join(', ')}) VALUES ($1, ${placeholders}) RETURNING *`;
      const { rows } = await db.query(queryText, [newId, ...values]);
      res.status(201).json(transformRow(rows[0], tableName));
    } catch (err) {
      handleError(res, err);
    }
  });

  // PUT update by ID
  router.put(`/${tableName}/:id`, async (req, res) => {
    try {
      const data = transformToDb(req.body, tableName);
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setString = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

      const queryText = `UPDATE ${tableName} SET ${setString} WHERE id = $1 RETURNING *`;
      const { rows } = await db.query(queryText, [req.params.id, ...values]);

      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(transformRow(rows[0], tableName));
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

const resources = ['customers', 'leads', 'quotes', 'jobs', 'invoices', 'employees', 'equipment'];
resources.forEach(resource => {
  setupCrudEndpoints(apiRouter, resource);
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, 'localhost', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});