const express = require('express');
const { isAuthenticated, getUser } = require('../replitAuth');

const router = express.Router();

router.get('/auth/user', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims?.sub || req.user.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const user = await getUser(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

module.exports = router;
