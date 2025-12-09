const db = require('../db');
const { ROLES, ROLE_DESCRIPTIONS, CONFIGURABLE_PERMISSIONS } = require('../src/modules/core/auth/permissions');
const { getUserRoles, assignRole, removeRole, invalidateUserRoleCache } = require('../src/modules/core/auth/roleLoader');

async function listUsers(req, res) {
  try {
    const result = await db.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.profile_image_url, 
        u.status, u.approved_by, u.approved_at, u.created_at, u.updated_at,
        COALESCE(json_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]') as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
}

async function getPendingUsers(req, res) {
  try {
    const result = await db.query(`
      SELECT 
        id, email, first_name, last_name, profile_image_url, 
        status, created_at
      FROM users
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting pending users:', err);
    res.status(500).json({ error: 'Failed to get pending users' });
  }
}

async function approveUser(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const approverId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const assignedRole = role || ROLES.LABORER;
    
    if (!Object.values(ROLES).includes(assignedRole)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }
    
    await db.query(
      `UPDATE users SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [approverId, userId]
    );
    
    await db.query(
      `INSERT INTO user_roles (id, user_id, role, created_at) VALUES (gen_random_uuid(), $1, $2, NOW()) ON CONFLICT DO NOTHING`,
      [userId, assignedRole]
    );
    
    invalidateUserRoleCache(userId);
    
    const result = await db.query(
      `SELECT id, email, first_name, last_name, status, approved_by, approved_at FROM users WHERE id = $1`,
      [userId]
    );
    
    res.json({ 
      message: 'User approved successfully', 
      user: result.rows[0],
      assignedRole 
    });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
}

async function rejectUser(req, res) {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await db.query(
      `UPDATE users SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    
    res.json({ message: 'User rejected', userId, reason });
  } catch (err) {
    console.error('Error rejecting user:', err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
}

async function assignUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role, customPermissions } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }
    
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }
    
    await assignRole(userId, role);
    
    if (customPermissions && typeof customPermissions === 'object') {
      await db.query(
        `INSERT INTO user_custom_permissions (user_id, role, permissions, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (user_id, role) DO UPDATE SET permissions = $3, updated_at = NOW()`,
        [userId, role, JSON.stringify(customPermissions)]
      );
    }
    
    const roles = await getUserRoles(userId);
    
    res.json({ message: 'Role assigned successfully', userId, role, allRoles: roles });
  } catch (err) {
    console.error('Error assigning role:', err);
    res.status(500).json({ error: 'Failed to assign role' });
  }
}

async function removeUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }
    
    await removeRole(userId, role);
    
    const roles = await getUserRoles(userId);
    
    res.json({ message: 'Role removed successfully', userId, role, remainingRoles: roles });
  } catch (err) {
    console.error('Error removing role:', err);
    res.status(500).json({ error: 'Failed to remove role' });
  }
}

async function getUserDetails(req, res) {
  try {
    const { userId } = req.params;
    
    const userResult = await db.query(
      `SELECT id, email, first_name, last_name, profile_image_url, status, approved_by, approved_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const rolesResult = await db.query(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [userId]
    );
    
    const customPermsResult = await db.query(
      `SELECT role, permissions FROM user_custom_permissions WHERE user_id = $1`,
      [userId]
    );
    
    const user = userResult.rows[0];
    user.roles = rolesResult.rows.map(r => r.role);
    user.customPermissions = {};
    
    for (const row of customPermsResult.rows) {
      user.customPermissions[row.role] = row.permissions;
    }
    
    res.json(user);
  } catch (err) {
    console.error('Error getting user details:', err);
    res.status(500).json({ error: 'Failed to get user details' });
  }
}

async function getRolesAndPermissions(req, res) {
  try {
    const availableRoles = Object.entries(ROLES)
      .filter(([key]) => !['CLIENT', 'CREW', 'ADMIN', 'MANAGER', 'SCHEDULER'].includes(key))
      .map(([key, value]) => ({
        key,
        value,
        description: ROLE_DESCRIPTIONS[value] || ''
      }));
    
    res.json({
      roles: availableRoles,
      configurablePermissions: CONFIGURABLE_PERMISSIONS
    });
  } catch (err) {
    console.error('Error getting roles:', err);
    res.status(500).json({ error: 'Failed to get roles' });
  }
}

async function updateUserCustomPermissions(req, res) {
  try {
    const { userId } = req.params;
    const { role, permissions } = req.body;
    
    if (!userId || !role || !permissions) {
      return res.status(400).json({ error: 'User ID, role, and permissions are required' });
    }
    
    await db.query(
      `INSERT INTO user_custom_permissions (user_id, role, permissions, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id, role) DO UPDATE SET permissions = $3, updated_at = NOW()`,
      [userId, role, JSON.stringify(permissions)]
    );
    
    res.json({ message: 'Permissions updated successfully', userId, role, permissions });
  } catch (err) {
    console.error('Error updating permissions:', err);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
}

module.exports = {
  listUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  assignUserRole,
  removeUserRole,
  getUserDetails,
  getRolesAndPermissions,
  updateUserCustomPermissions
};
