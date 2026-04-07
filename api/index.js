// api/index.js
// Vercel Serverless Function entry point.
// Vercel looks for files in /api — this re-exports our Express app.

const app = require('../src/server');

module.exports = app;
