// backend/api/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import the main app
const app = require('../src/server');

// Add a simple root route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// Export for Vercel
module.exports = app;