const express = require('express');
const { isAuthenticated } = require('../auth');
const userManagement = require('../controllers/userManagementController');

const router = express.Router();

router.get('/users', isAuthenticated, userManagement.listUsers);
router.get('/users/pending', isAuthenticated, userManagement.getPendingUsers);
router.get('/users/roles-config', isAuthenticated, userManagement.getRolesAndPermissions);
router.get('/users/:userId', isAuthenticated, userManagement.getUserDetails);
router.post('/users/:userId/approve', isAuthenticated, userManagement.approveUser);
router.post('/users/:userId/reject', isAuthenticated, userManagement.rejectUser);
router.post('/users/:userId/roles', isAuthenticated, userManagement.assignUserRole);
router.delete('/users/:userId/roles/:role', isAuthenticated, userManagement.removeUserRole);
router.put('/users/:userId/permissions', isAuthenticated, userManagement.updateUserCustomPermissions);

module.exports = router;
