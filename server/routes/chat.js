const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');

// Process chat message
router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    console.log(`🤖 Processing chat message: "${message}"`);
    
    // Extract request information for logging
    const requestInfo = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']
    };
    
    const result = await chatService.processChatMessage(message, requestInfo);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process chat message'
    });
  }
});

// Get question suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await chatService.generateSuggestions();
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions'
    });
  }
});

// Get available metrics and dimensions
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await chatService.getAvailableMetrics();
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available metrics'
    });
  }
});

// Get database schema information
router.get('/schema', async (req, res) => {
  try {
    const schema = await chatService.getDatabaseSchema();
    
    res.json({
      success: true,
      schema
    });
  } catch (error) {
    console.error('Schema error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database schema'
    });
  }
});

// Execute custom SQL query (for advanced users)
router.post('/sql', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'SQL query is required and must be a string'
      });
    }

    // Basic SQL injection protection
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(400).json({
        success: false,
        error: 'Only SELECT queries are allowed'
      });
    }

    const result = await chatService.executeQuery(query);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('SQL execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute SQL query'
    });
  }
});

module.exports = router; 