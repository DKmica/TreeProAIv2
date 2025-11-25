const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { handleError, notFoundError, badRequestError } = require('../utils/errors');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { isAuthenticated } = require('../auth');

const router = express.Router();

router.get('/email-templates', isAuthenticated, async (req, res) => {
  try {
    const { category, active_only, include_system } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);
    
    const filters = ['deleted_at IS NULL'];
    const params = [];
    
    if (category) {
      params.push(category);
      filters.push(`category = $${params.length}`);
    }
    
    if (active_only === 'true') {
      filters.push('is_active = true');
    }
    
    if (include_system !== 'true') {
      filters.push('is_system = false');
    }
    
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    
    const baseQuery = `FROM email_templates ${whereClause}`;
    
    const selectQuery = `
      SELECT * ${baseQuery}
      ORDER BY is_system DESC, category, name
      ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
    `;
    
    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);
    
    if (!usePagination) {
      return res.json({ success: true, data: rows });
    }
    
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0]?.total, 10) || 0;
    
    res.json({
      success: true,
      data: rows,
      pagination: buildPaginationMeta(total, page, pageSize)
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/email-templates', isAuthenticated, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      subject,
      body_html,
      body_text,
      available_variables = [],
      is_active = true
    } = req.body;
    
    if (!name) {
      throw badRequestError('Template name is required');
    }
    if (!subject) {
      throw badRequestError('Email subject is required');
    }
    if (!body_html) {
      throw badRequestError('Email body HTML is required');
    }
    
    const templateId = uuidv4();
    
    await db.query(`
      INSERT INTO email_templates (
        id, name, description, category, subject, body_html, body_text,
        available_variables, is_active, is_system, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    `, [
      templateId,
      name,
      description || null,
      category || null,
      subject,
      body_html,
      body_text || null,
      JSON.stringify(available_variables),
      is_active,
      false,
      req.user?.id || req.user?.claims?.sub || null
    ]);
    
    const { rows: [newTemplate] } = await db.query(
      `SELECT * FROM email_templates WHERE id = $1`,
      [templateId]
    );
    
    res.status(201).json({ success: true, data: newTemplate });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/email-templates/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      subject,
      body_html,
      body_text,
      available_variables,
      is_active
    } = req.body;
    
    const { rows: existing } = await db.query(
      `SELECT * FROM email_templates WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (existing.length === 0) {
      throw notFoundError('Email template');
    }
    
    if (existing[0].is_system) {
      throw badRequestError('System templates cannot be modified');
    }
    
    await db.query(`
      UPDATE email_templates SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        subject = COALESCE($4, subject),
        body_html = COALESCE($5, body_html),
        body_text = COALESCE($6, body_text),
        available_variables = COALESCE($7, available_variables),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $9
    `, [
      name,
      description,
      category,
      subject,
      body_html,
      body_text,
      available_variables ? JSON.stringify(available_variables) : null,
      is_active,
      id
    ]);
    
    const { rows: [updatedTemplate] } = await db.query(
      `SELECT * FROM email_templates WHERE id = $1`,
      [id]
    );
    
    res.json({ success: true, data: updatedTemplate });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/sms-templates', isAuthenticated, async (req, res) => {
  try {
    const { category, active_only, include_system } = req.query;
    const { usePagination, page, pageSize, limit, offset } = parsePagination(req.query);
    
    const filters = ['deleted_at IS NULL'];
    const params = [];
    
    if (category) {
      params.push(category);
      filters.push(`category = $${params.length}`);
    }
    
    if (active_only === 'true') {
      filters.push('is_active = true');
    }
    
    if (include_system !== 'true') {
      filters.push('is_system = false');
    }
    
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    
    const baseQuery = `FROM sms_templates ${whereClause}`;
    
    const selectQuery = `
      SELECT * ${baseQuery}
      ORDER BY is_system DESC, category, name
      ${usePagination ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''}
    `;
    
    const queryParams = usePagination ? [...params, limit, offset] : params;
    const { rows } = await db.query(selectQuery, queryParams);
    
    if (!usePagination) {
      return res.json({ success: true, data: rows });
    }
    
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0]?.total, 10) || 0;
    
    res.json({
      success: true,
      data: rows,
      pagination: buildPaginationMeta(total, page, pageSize)
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/sms-templates', isAuthenticated, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      message,
      available_variables = [],
      is_active = true
    } = req.body;
    
    if (!name) {
      throw badRequestError('Template name is required');
    }
    if (!message) {
      throw badRequestError('SMS message is required');
    }
    
    const templateId = uuidv4();
    
    await db.query(`
      INSERT INTO sms_templates (
        id, name, description, category, message,
        available_variables, is_active, is_system, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `, [
      templateId,
      name,
      description || null,
      category || null,
      message,
      JSON.stringify(available_variables),
      is_active,
      false,
      req.user?.id || req.user?.claims?.sub || null
    ]);
    
    const { rows: [newTemplate] } = await db.query(
      `SELECT * FROM sms_templates WHERE id = $1`,
      [templateId]
    );
    
    res.status(201).json({ success: true, data: newTemplate });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/sms-templates/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      message,
      available_variables,
      is_active
    } = req.body;
    
    const { rows: existing } = await db.query(
      `SELECT * FROM sms_templates WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (existing.length === 0) {
      throw notFoundError('SMS template');
    }
    
    if (existing[0].is_system) {
      throw badRequestError('System templates cannot be modified');
    }
    
    await db.query(`
      UPDATE sms_templates SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        message = COALESCE($4, message),
        available_variables = COALESCE($5, available_variables),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7
    `, [
      name,
      description,
      category,
      message,
      available_variables ? JSON.stringify(available_variables) : null,
      is_active,
      id
    ]);
    
    const { rows: [updatedTemplate] } = await db.query(
      `SELECT * FROM sms_templates WHERE id = $1`,
      [id]
    );
    
    res.json({ success: true, data: updatedTemplate });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
