const express = require('express');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.status(200).send('TreePro AI Backend is running.');
});

module.exports = router;
