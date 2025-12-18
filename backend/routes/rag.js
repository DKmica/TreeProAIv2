const express = require('express');
const ragService = require('../services/ragService');
const vectorStore = require('../services/vectorStore');

const router = express.Router();

router.post('/rag/search', async (req, res) => {
  try {
    const { query, collections, limit } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await ragService.search(query, { collections, limit });
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

router.post('/rag/context', async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const context = await ragService.getContextForQuery(query, maxResults);
    res.json({ context });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

router.post('/rag/build', async (req, res) => {
  try {
    console.log('🔄 Starting vector database build...');
    const stats = await ragService.buildVectorDatabase();
    res.json({ 
      success: true, 
      message: 'Vector database built successfully',
      stats 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

router.get('/rag/stats', async (req, res) => {
  try {
    const stats = await vectorStore.getCollectionStats();
    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

module.exports = router;
