const db = require('../../../../db');
const { v4: uuidv4 } = require('uuid');

async function logAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  metadata = null
}) {
  try {
    const id = uuidv4();
    
    await db.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        userId || 'system',
        action,
        entityType,
        entityId || uuidv4(),
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress
      ]
    );
    
    return id;
  } catch (err) {
    console.error('Audit log error:', err.message);
    return null;
  }
}

async function logPermissionDenied({
  userId,
  resource,
  action,
  roles,
  ipAddress,
  path,
  method
}) {
  return logAuditEvent({
    userId,
    action: 'permission_denied',
    entityType: resource,
    entityId: null,
    oldValues: null,
    newValues: {
      requestedAction: action,
      userRoles: roles,
      path,
      method,
      timestamp: new Date().toISOString()
    },
    ipAddress
  });
}

async function logLogin({
  userId,
  success,
  ipAddress,
  userAgent,
  method
}) {
  return logAuditEvent({
    userId,
    action: success ? 'login_success' : 'login_failed',
    entityType: 'auth',
    entityId: null,
    newValues: {
      method,
      userAgent,
      timestamp: new Date().toISOString()
    },
    ipAddress
  });
}

async function logDataChange({
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  ipAddress
}) {
  return logAuditEvent({
    userId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress
  });
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] 
    || req.connection?.remoteAddress 
    || req.socket?.remoteAddress
    || null;
}

module.exports = {
  logAuditEvent,
  logPermissionDenied,
  logLogin,
  logDataChange,
  getClientIp
};
