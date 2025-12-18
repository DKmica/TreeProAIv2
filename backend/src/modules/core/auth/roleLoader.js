const db = require('../../../../db');
const { ROLES } = require('./permissions');

const roleCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getUserRoles(userId) {
  if (!userId) {
    throw new Error('User ID required for role lookup');
  }
  
  const cacheKey = `roles:${userId}`;
  const cached = roleCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.roles;
  }
  
  try {
    const { rows } = await db.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );
    
    if (rows.length === 0) {
      console.warn(`No roles found for user ${userId} - access denied`);
      throw new Error('No roles assigned - access denied');
    }
    
    const roles = rows.map(r => r.role);
    
    roleCache.set(cacheKey, {
      roles,
      timestamp: Date.now()
    });
    
    return roles;
  } catch (err) {
    console.error('Error fetching user roles:', err.message);
    throw new Error('Role lookup failed - access denied');
  }
}

function getPrimaryRole(roles) {
  const roleOrder = [
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SALES,
    ROLES.SCHEDULER,
    ROLES.CREW,
    ROLES.CLIENT
  ];
  
  for (const role of roleOrder) {
    if (roles.includes(role)) {
      return role;
    }
  }
  
  return ROLES.OWNER;
}

function invalidateUserRoleCache(userId) {
  roleCache.delete(`roles:${userId}`);
}

function clearRoleCache() {
  roleCache.clear();
}

async function assignRole(userId, role) {
  const validRoles = Object.values(ROLES);
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  
  try {
    await db.query(
      `INSERT INTO user_roles (user_id, role) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, role) DO NOTHING`,
      [userId, role]
    );
    
    invalidateUserRoleCache(userId);
    return true;
  } catch (err) {
    console.error('Error assigning role:', err.message);
    throw err;
  }
}

async function removeRole(userId, role) {
  try {
    await db.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role = $2',
      [userId, role]
    );
    
    invalidateUserRoleCache(userId);
    return true;
  } catch (err) {
    console.error('Error removing role:', err.message);
    throw err;
  }
}

module.exports = {
  getUserRoles,
  getPrimaryRole,
  invalidateUserRoleCache,
  clearRoleCache,
  assignRole,
  removeRole
};
