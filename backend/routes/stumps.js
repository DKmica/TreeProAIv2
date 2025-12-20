const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads/stumps');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'stump-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

const generateStumpNumber = async () => {
  const { rows } = await db.query(
    "SELECT stump_number FROM stumps WHERE stump_number LIKE 'STG-%' ORDER BY created_at DESC LIMIT 1"
  );
  
  let nextNum = 1;
  if (rows.length > 0 && rows[0].stump_number) {
    const match = rows[0].stump_number.match(/STG-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `STG-${String(nextNum).padStart(5, '0')}`;
};

const transformStump = (row) => ({
  id: row.id,
  jobId: row.job_id,
  clientId: row.client_id,
  propertyId: row.property_id,
  stumpNumber: row.stump_number,
  locationDescription: row.location_description,
  treeSpecies: row.tree_species,
  diameterInches: parseFloat(row.diameter_inches) || 0,
  estimatedDepthInches: parseFloat(row.estimated_depth_inches) || 0,
  coordinates: row.coordinates,
  status: row.status,
  assignedTo: row.assigned_to,
  assignedToName: row.assigned_to_name,
  assignedAt: row.assigned_at,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  completionPhotoUrl: row.completion_photo_url,
  notes: row.notes,
  customerName: row.customer_name,
  jobLocation: row.job_location,
  jobNumber: row.job_number,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

router.get('/stumps', async (req, res) => {
  try {
    const { status, assignedTo } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    
    if (status) {
      params.push(status);
      whereClause += ` AND s.status = $${params.length}`;
    }
    
    if (assignedTo) {
      params.push(assignedTo);
      whereClause += ` AND s.assigned_to = $${params.length}`;
    }
    
    const { rows } = await db.query(`
      SELECT s.*, 
             e.name as assigned_to_name,
             j.job_number
      FROM stumps s
      LEFT JOIN employees e ON s.assigned_to = e.id
      LEFT JOIN jobs j ON s.job_id = j.id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
    `, params);
    
    res.json(rows.map(transformStump));
  } catch (err) {
    console.error('Error fetching stumps:', err);
    res.status(500).json({ error: 'Failed to fetch stumps' });
  }
});

router.get('/stumps/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, 
             e.name as assigned_to_name,
             j.job_number
      FROM stumps s
      LEFT JOIN employees e ON s.assigned_to = e.id
      LEFT JOIN jobs j ON s.job_id = j.id
      WHERE s.id = $1
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Stump not found' });
    }
    
    res.json(transformStump(rows[0]));
  } catch (err) {
    console.error('Error fetching stump:', err);
    res.status(500).json({ error: 'Failed to fetch stump' });
  }
});

router.post('/stumps', async (req, res) => {
  try {
    const {
      jobId,
      clientId,
      propertyId,
      locationDescription,
      treeSpecies,
      diameterInches,
      estimatedDepthInches,
      coordinates,
      customerName,
      jobLocation,
      notes
    } = req.body;
    
    const stumpNumber = await generateStumpNumber();
    
    const { rows } = await db.query(`
      INSERT INTO stumps (
        job_id, client_id, property_id, stump_number, location_description,
        tree_species, diameter_inches, estimated_depth_inches, coordinates,
        customer_name, job_location, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
      RETURNING *
    `, [
      jobId || null,
      clientId || null,
      propertyId || null,
      stumpNumber,
      locationDescription || null,
      treeSpecies || null,
      diameterInches || null,
      estimatedDepthInches || null,
      coordinates ? JSON.stringify(coordinates) : null,
      customerName || null,
      jobLocation || null,
      notes || null
    ]);
    
    res.status(201).json(transformStump(rows[0]));
  } catch (err) {
    console.error('Error creating stump:', err);
    res.status(500).json({ error: 'Failed to create stump' });
  }
});

router.post('/stumps/from-job', async (req, res) => {
  try {
    const { jobId, stumps } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }
    
    const { rows: jobRows } = await db.query(`
      SELECT j.*, c.id as client_id, p.id as property_id
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      LEFT JOIN properties p ON j.property_id = p.id
      WHERE j.id = $1
    `, [jobId]);
    
    if (jobRows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = jobRows[0];
    const createdStumps = [];
    
    const stumpList = stumps && stumps.length > 0 ? stumps : [{}];
    
    for (const stump of stumpList) {
      const stumpNumber = await generateStumpNumber();
      
      const { rows } = await db.query(`
        INSERT INTO stumps (
          job_id, client_id, property_id, stump_number, location_description,
          tree_species, diameter_inches, estimated_depth_inches, coordinates,
          customer_name, job_location, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
        RETURNING *
      `, [
        jobId,
        job.client_id,
        job.property_id,
        stumpNumber,
        stump.locationDescription || null,
        stump.treeSpecies || null,
        stump.diameterInches || null,
        stump.estimatedDepthInches || null,
        stump.coordinates ? JSON.stringify(stump.coordinates) : null,
        job.customer_name,
        job.job_location,
        stump.notes || null
      ]);
      
      createdStumps.push(transformStump(rows[0]));
    }
    
    res.status(201).json({
      success: true,
      stumps: createdStumps,
      message: `Created ${createdStumps.length} stump(s) from job`
    });
  } catch (err) {
    console.error('Error creating stumps from job:', err);
    res.status(500).json({ error: 'Failed to create stumps from job' });
  }
});

router.put('/stumps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const setClauses = [];
    const values = [id];
    let paramIndex = 2;
    
    const fieldMapping = {
      locationDescription: 'location_description',
      treeSpecies: 'tree_species',
      diameterInches: 'diameter_inches',
      estimatedDepthInches: 'estimated_depth_inches',
      status: 'status',
      assignedTo: 'assigned_to',
      notes: 'notes'
    };
    
    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMapping[key] || key;
      if (['location_description', 'tree_species', 'diameter_inches', 'estimated_depth_inches', 'status', 'assigned_to', 'notes', 'coordinates'].includes(dbField)) {
        let dbValue = value;
        if (dbField === 'coordinates' && typeof value === 'object') {
          dbValue = JSON.stringify(value);
        }
        setClauses.push(`${dbField} = $${paramIndex}`);
        values.push(dbValue);
        paramIndex++;
        
        if (dbField === 'assigned_to' && value) {
          setClauses.push(`assigned_at = NOW()`);
          setClauses.push(`status = 'assigned'`);
        }
      }
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    setClauses.push('updated_at = NOW()');
    
    const { rows } = await db.query(`
      UPDATE stumps SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Stump not found' });
    }
    
    res.json(transformStump(rows[0]));
  } catch (err) {
    console.error('Error updating stump:', err);
    res.status(500).json({ error: 'Failed to update stump' });
  }
});

router.post('/stumps/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    const { rows } = await db.query(`
      UPDATE stumps 
      SET assigned_to = $2, assigned_at = NOW(), status = 'assigned', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, employeeId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Stump not found' });
    }
    
    res.json({
      success: true,
      stump: transformStump(rows[0])
    });
  } catch (err) {
    console.error('Error assigning stump:', err);
    res.status(500).json({ error: 'Failed to assign stump' });
  }
});

router.post('/stumps/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await db.query(`
      UPDATE stumps 
      SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Stump not found' });
    }
    
    res.json({
      success: true,
      stump: transformStump(rows[0])
    });
  } catch (err) {
    console.error('Error starting stump:', err);
    res.status(500).json({ error: 'Failed to start stump grinding' });
  }
});

router.post('/stumps/:id/complete', upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/stumps/${req.file.filename}`;
    }
    
    const updateFields = ['status = \'completed\'', 'completed_at = NOW()', 'updated_at = NOW()'];
    const values = [id];
    let paramIndex = 2;
    
    if (photoUrl) {
      updateFields.push(`completion_photo_url = $${paramIndex}`);
      values.push(photoUrl);
      paramIndex++;
    }
    
    if (notes) {
      updateFields.push(`notes = COALESCE(notes || E\'\\n\', \'\') || $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }
    
    const { rows } = await db.query(`
      UPDATE stumps 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Stump not found' });
    }
    
    res.json({
      success: true,
      stump: transformStump(rows[0]),
      message: 'Stump grinding completed'
    });
  } catch (err) {
    console.error('Error completing stump:', err);
    res.status(500).json({ error: 'Failed to complete stump grinding' });
  }
});

router.get('/stumps/summary/stats', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) as total
      FROM stumps
    `);
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching stump stats:', err);
    res.status(500).json({ error: 'Failed to fetch stump stats' });
  }
});

router.get('/stump-grinders', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, job_title
      FROM employees
      WHERE deleted_at IS NULL
      ORDER BY name
    `);
    
    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      jobTitle: row.job_title
    })));
  } catch (err) {
    console.error('Error fetching stump grinders:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.delete('/stumps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rowCount } = await db.query('DELETE FROM stumps WHERE id = $1', [id]);
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Stump not found' });
    }
    
    res.json({ success: true, message: 'Stump deleted' });
  } catch (err) {
    console.error('Error deleting stump:', err);
    res.status(500).json({ error: 'Failed to delete stump' });
  }
});

module.exports = router;
