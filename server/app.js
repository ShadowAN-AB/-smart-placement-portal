const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const interviewRoutes = require('./routes/interviews');
const notificationRoutes = require('./routes/notifications');

/**
 * Build the Express app without connecting to MongoDB or listening.
 * server.js (local) and api/index.js (Vercel) each handle those side effects.
 * Tests use this factory directly and connect to an in-memory MongoDB.
 */
const buildApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Unexpected server error' });
  });

  return app;
};

module.exports = { buildApp };
