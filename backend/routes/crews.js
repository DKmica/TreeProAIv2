const express = require('express');
const db = require('../db');
const { handleError } = require('../utils/errors');
const { transformRow } = require('../utils/transformers');
const { requirePermission, RESOURCES, ACTIONS } = require('../auth');

const router = express.Router();

router.get('/crews/available', async (req, res) => {
  try {
    const { date, exclude_job_id } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date query parameter is required'
      });
    }
    
    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.left_at IS NULL) as member_count,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.assigned_date = $1) as assignments_on_date
      FROM crews c
      LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.left_at IS NULL
      LEFT JOIN crew_assignments ca ON c.id = ca.crew_id
      WHERE c.deleted_at IS NULL 
        AND c.is_active = true
      GROUP BY c.id
      HAVING 
        c.capacity IS NULL 
        OR COUNT(DISTINCT ca.id) FILTER (WHERE ca.assigned_date = $1) < c.capacity
      ORDER BY c.name
    `;
    
    const { rows } = await db.query(query, [date]);
    
    let crews = rows;
    if (exclude_job_id) {
      const excludeQuery = `
        SELECT crew_id FROM crew_assignments 
        WHERE job_id = $1 AND assigned_date = $2
      `;
      const { rows: excludeRows } = await db.query(excludeQuery, [exclude_job_id, date]);
      const excludedCrewIds = excludeRows.map(r => r.crew_id);
      
      crews = rows.filter(crew => !excludedCrewIds.includes(crew.id));
    }
    
    const availableCrews = crews.map(row => transformRow(row, 'crews'));
    
    res.json({
      success: true,
      data: availableCrews
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/employees/unassigned', async (req, res) => {
  try {
    const query = `
      SELECT e.*
      FROM employees e
      LEFT JOIN crew_members cm ON e.id = cm.employee_id AND cm.left_at IS NULL
      WHERE cm.id IS NULL
      ORDER BY e.name
    `;
    
    const { rows } = await db.query(query);
    const employees = rows.map(row => transformRow(row, 'employees'));
    
    res.json({
      success: true,
      data: employees
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/crews', async (req, res) => {
  try {
    const includeDeleted = req.query.include_deleted === 'true';
    
    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.left_at IS NULL) as member_count,
        COUNT(DISTINCT ca.id) as active_assignments
      FROM crews c
      LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.left_at IS NULL
      LEFT JOIN crew_assignments ca ON c.id = ca.crew_id
      ${includeDeleted ? '' : 'WHERE c.deleted_at IS NULL'}
      GROUP BY c.id
      ORDER BY c.name
    `;
    
    const { rows } = await db.query(query);
    const crews = rows.map(row => transformRow(row, 'crews'));
    
    res.json({
      success: true,
      data: crews
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/crews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const crewQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.left_at IS NULL) as member_count
      FROM crews c
      LEFT JOIN crew_members cm ON c.id = cm.crew_id AND cm.left_at IS NULL
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const { rows: crewRows } = await db.query(crewQuery, [id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    const crew = transformRow(crewRows[0], 'crews');
    
    const membersQuery = `
      SELECT 
        cm.*,
        e.name as employee_name,
        e.phone,
        e.job_title,
        e.certifications
      FROM crew_members cm
      JOIN employees e ON cm.employee_id = e.id
      WHERE cm.crew_id = $1 AND cm.left_at IS NULL
      ORDER BY cm.role, e.name
    `;
    const { rows: memberRows } = await db.query(membersQuery, [id]);
    crew.members = memberRows.map(row => transformRow(row, 'crew_members'));
    
    const assignmentsQuery = `
      SELECT 
        ca.*,
        j.customer_name,
        j.status,
        j.scheduled_date,
        j.job_location
      FROM crew_assignments ca
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.crew_id = $1
      ORDER BY ca.assigned_date DESC
      LIMIT 10
    `;
    const { rows: assignmentRows } = await db.query(assignmentsQuery, [id]);
    crew.currentAssignments = assignmentRows.map(row => transformRow(row, 'crew_assignments'));
    
    res.json({
      success: true,
      data: crew
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/crews', async (req, res) => {
  try {
    const { name, description, default_start_time, default_end_time, capacity } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Crew name is required'
      });
    }
    
    if (capacity !== undefined && capacity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Capacity must be greater than 0'
      });
    }
    
    const query = `
      INSERT INTO crews (name, description, default_start_time, default_end_time, capacity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [
      name,
      description || null,
      default_start_time || null,
      default_end_time || null,
      capacity || null
    ]);
    
    const crew = transformRow(rows[0], 'crews');
    
    res.status(201).json({
      success: true,
      data: crew,
      message: 'Crew created successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/crews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, default_start_time, default_end_time, capacity } = req.body;
    
    const checkQuery = 'SELECT id FROM crews WHERE id = $1';
    const { rows: checkRows } = await db.query(checkQuery, [id]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    if (capacity !== undefined && capacity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Capacity must be greater than 0'
      });
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (default_start_time !== undefined) {
      updates.push(`default_start_time = $${paramCount++}`);
      values.push(default_start_time);
    }
    if (default_end_time !== undefined) {
      updates.push(`default_end_time = $${paramCount++}`);
      values.push(default_end_time);
    }
    if (capacity !== undefined) {
      updates.push(`capacity = $${paramCount++}`);
      values.push(capacity);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE crews
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const { rows } = await db.query(query, values);
    const crew = transformRow(rows[0], 'crews');
    
    res.json({
      success: true,
      data: crew,
      message: 'Crew updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/crews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const assignmentQuery = `
      SELECT COUNT(*) as count
      FROM crew_assignments ca
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.crew_id = $1 AND j.status NOT IN ('completed', 'cancelled')
    `;
    const { rows: assignmentRows } = await db.query(assignmentQuery, [id]);
    
    if (parseInt(assignmentRows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete crew with active job assignments'
      });
    }
    
    const query = `
      UPDATE crews
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found or already deleted'
      });
    }
    
    res.json({
      success: true,
      message: 'Crew deleted successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/crews/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, role } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({
        success: false,
        error: 'employee_id is required'
      });
    }
    
    const validRoles = ['leader', 'climber', 'groundsman', 'driver'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Role must be one of: ${validRoles.join(', ')}`
      });
    }
    
    const crewQuery = 'SELECT id FROM crews WHERE id = $1 AND deleted_at IS NULL';
    const { rows: crewRows } = await db.query(crewQuery, [id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    const employeeQuery = 'SELECT id FROM employees WHERE id = $1';
    const { rows: employeeRows } = await db.query(employeeQuery, [employee_id]);
    
    if (employeeRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
    
    const memberCheckQuery = `
      SELECT id FROM crew_members
      WHERE crew_id = $1 AND employee_id = $2 AND left_at IS NULL
    `;
    const { rows: existingRows } = await db.query(memberCheckQuery, [id, employee_id]);
    
    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Employee is already an active member of this crew'
      });
    }
    
    const insertQuery = `
      INSERT INTO crew_members (crew_id, employee_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const { rows } = await db.query(insertQuery, [id, employee_id, role || null]);
    const member = transformRow(rows[0], 'crew_members');
    
    res.status(201).json({
      success: true,
      data: member,
      message: 'Member added to crew successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/crews/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    
    const crewQuery = 'SELECT id FROM crews WHERE id = $1';
    const { rows: crewRows } = await db.query(crewQuery, [id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    const query = `
      SELECT 
        cm.*,
        e.name as employee_name,
        e.phone,
        e.job_title,
        e.certifications
      FROM crew_members cm
      JOIN employees e ON cm.employee_id = e.id
      WHERE cm.crew_id = $1 AND cm.left_at IS NULL
      ORDER BY 
        CASE cm.role
          WHEN 'leader' THEN 1
          WHEN 'climber' THEN 2
          WHEN 'groundsman' THEN 3
          WHEN 'driver' THEN 4
          ELSE 5
        END,
        e.name
    `;
    
    const { rows } = await db.query(query, [id]);
    const members = rows.map(row => transformRow(row, 'crew_members'));
    
    res.json({
      success: true,
      data: members
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/crews/:crew_id/members/:member_id', async (req, res) => {
  try {
    const { crew_id, member_id } = req.params;
    const { role } = req.body;
    
    const validRoles = ['leader', 'climber', 'groundsman', 'driver'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Role must be one of: ${validRoles.join(', ')}`
      });
    }
    
    const query = `
      UPDATE crew_members
      SET role = $1
      WHERE id = $2 AND crew_id = $3 AND left_at IS NULL
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [role || null, member_id, crew_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew member not found or no longer active'
      });
    }
    
    const member = transformRow(rows[0], 'crew_members');
    
    res.json({
      success: true,
      data: member,
      message: 'Member role updated successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/crews/:crew_id/members/:member_id', async (req, res) => {
  try {
    const { crew_id, member_id } = req.params;
    
    const query = `
      UPDATE crew_members
      SET left_at = NOW()
      WHERE id = $1 AND crew_id = $2 AND left_at IS NULL
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [member_id, crew_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew member not found or already removed'
      });
    }
    
    res.json({
      success: true,
      message: 'Member removed from crew successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/jobs/:job_id/assign-crew', async (req, res) => {
  try {
    const { job_id } = req.params;
    const { crew_id, assigned_date, notes } = req.body;
    
    if (!crew_id) {
      return res.status(400).json({
        success: false,
        error: 'crew_id is required'
      });
    }
    
    if (!assigned_date) {
      return res.status(400).json({
        success: false,
        error: 'assigned_date is required'
      });
    }
    
    const jobQuery = 'SELECT id FROM jobs WHERE id = $1';
    const { rows: jobRows } = await db.query(jobQuery, [job_id]);
    
    if (jobRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const crewQuery = 'SELECT id FROM crews WHERE id = $1 AND deleted_at IS NULL AND is_active = true';
    const { rows: crewRows } = await db.query(crewQuery, [crew_id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found or inactive'
      });
    }
    
    const insertQuery = `
      INSERT INTO crew_assignments (job_id, crew_id, assigned_date, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const { rows } = await db.query(insertQuery, [job_id, crew_id, assigned_date, notes || null]);
    const assignment = transformRow(rows[0], 'crew_assignments');
    
    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Crew assigned to job successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/crews/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    const crewQuery = 'SELECT id FROM crews WHERE id = $1';
    const { rows: crewRows } = await db.query(crewQuery, [id]);
    
    if (crewRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    let query = `
      SELECT 
        ca.*,
        j.customer_name,
        j.status,
        j.scheduled_date,
        j.job_location,
        j.special_instructions as job_description
      FROM crew_assignments ca
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.crew_id = $1
    `;
    
    const params = [id];
    let paramCount = 2;
    
    if (start_date) {
      query += ` AND ca.assigned_date >= $${paramCount++}`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND ca.assigned_date <= $${paramCount++}`;
      params.push(end_date);
    }
    
    query += ` ORDER BY ca.assigned_date DESC`;
    
    const { rows } = await db.query(query, params);
    const assignments = rows.map(row => transformRow(row, 'crew_assignments'));
    
    res.json({
      success: true,
      data: assignments
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/crew-assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM crew_assignments WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Crew assignment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Crew assignment removed successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/crew-assignments/schedule', async (req, res) => {
  try {
    const { start_date, end_date, crew_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }
    
    let query = `
      SELECT 
        ca.*,
        c.name as crew_name,
        j.id as job_id,
        j.customer_name as job_title,
        j.customer_name,
        j.status as job_status,
        j.scheduled_date,
        j.job_location,
        j.special_instructions
      FROM crew_assignments ca
      JOIN crews c ON ca.crew_id = c.id
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.assigned_date >= $1 AND ca.assigned_date <= $2
        AND c.deleted_at IS NULL
    `;
    
    const params = [start_date, end_date];
    let paramCount = 3;
    
    if (crew_id) {
      query += ` AND ca.crew_id = $${paramCount}`;
      params.push(crew_id);
      paramCount++;
    }
    
    query += ' ORDER BY ca.assigned_date, c.name';
    
    const { rows } = await db.query(query, params);
    
    const assignments = rows.map(row => ({
      ...transformRow(row, 'crew_assignments'),
      crewName: row.crew_name,
      jobTitle: row.job_title,
      clientName: row.customer_name,
      jobStatus: row.job_status,
      scheduledDate: row.scheduled_date,
      jobLocation: row.job_location,
      specialInstructions: row.special_instructions
    }));
    
    res.json({
      success: true,
      data: assignments
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/crew-assignments/check-conflicts', async (req, res) => {
  try {
    const { crew_id, assigned_date, job_id } = req.body;
    
    if (!crew_id || !assigned_date) {
      return res.status(400).json({
        success: false,
        error: 'crew_id and assigned_date are required'
      });
    }
    
    let query = `
      SELECT 
        ca.*,
        j.customer_name as job_title,
        j.customer_name,
        j.job_location
      FROM crew_assignments ca
      JOIN jobs j ON ca.job_id = j.id
      WHERE ca.crew_id = $1 AND ca.assigned_date = $2
    `;
    
    const params = [crew_id, assigned_date];
    
    if (job_id) {
      query += ' AND ca.job_id != $3';
      params.push(job_id);
    }
    
    const { rows } = await db.query(query, params);
    
    const hasConflict = rows.length > 0;
    const conflicts = rows.map(row => ({
      assignmentId: row.id,
      jobTitle: row.job_title,
      clientName: row.client_name,
      jobLocation: row.job_location,
      assignedDate: row.assigned_date
    }));
    
    res.json({
      success: true,
      hasConflict,
      conflicts
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/crew-assignments/bulk-assign', async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { crew_id, job_id, dates, notes } = req.body;
    
    if (!crew_id || !job_id || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'crew_id, job_id, and dates array are required'
      });
    }
    
    await client.query('BEGIN');
    
    const [crewCheck, jobCheck] = await Promise.all([
      client.query('SELECT id FROM crews WHERE id = $1 AND deleted_at IS NULL', [crew_id]),
      client.query('SELECT id FROM jobs WHERE id = $1', [job_id])
    ]);
    
    if (crewCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Crew not found'
      });
    }
    
    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    for (const date of dates) {
      const conflictCheck = await client.query(
        'SELECT id FROM crew_assignments WHERE crew_id = $1 AND assigned_date = $2 AND job_id != $3',
        [crew_id, date, job_id]
      );
      
      if (conflictCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: `Crew is already assigned on ${date}`
        });
      }
    }
    
    const values = dates.map((date, idx) => {
      const offset = idx * 4;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    }).join(', ');
    
    const params = dates.flatMap(date => [job_id, crew_id, date, notes || null]);
    
    const insertQuery = `
      INSERT INTO crew_assignments (job_id, crew_id, assigned_date, notes)
      VALUES ${values}
      RETURNING *
    `;
    
    const { rows } = await client.query(insertQuery, params);
    
    await client.query('COMMIT');
    
    const assignments = rows.map(row => transformRow(row, 'crew_assignments'));
    
    res.status(201).json({
      success: true,
      data: assignments,
      message: `Successfully created ${assignments.length} crew assignments`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    handleError(res, err);
  } finally {
    client.release();
  }
});

router.put('/crew-assignments/:id/reassign', async (req, res) => {
  try {
    const { id } = req.params;
    const { crew_id, assigned_date, notes } = req.body;
    
    if (!crew_id && !assigned_date) {
      return res.status(400).json({
        success: false,
        error: 'Either crew_id or assigned_date must be provided'
      });
    }
    
    const existingQuery = 'SELECT * FROM crew_assignments WHERE id = $1';
    const { rows: existingRows } = await db.query(existingQuery, [id]);
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }
    
    const existing = existingRows[0];
    
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (crew_id) {
      const crewCheck = await db.query(
        'SELECT id FROM crews WHERE id = $1 AND deleted_at IS NULL',
        [crew_id]
      );
      if (crewCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'New crew not found'
        });
      }
      updates.push(`crew_id = $${paramCount++}`);
      params.push(crew_id);
    }
    
    if (assigned_date) {
      updates.push(`assigned_date = $${paramCount++}`);
      params.push(assigned_date);
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      params.push(notes);
    }
    
    params.push(id);
    
    const query = `
      UPDATE crew_assignments 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const { rows } = await db.query(query, params);
    
    res.json({
      success: true,
      data: transformRow(rows[0], 'crew_assignments'),
      message: 'Assignment reassigned successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
