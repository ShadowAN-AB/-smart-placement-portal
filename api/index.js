const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('../server/config/db');
const authRoutes = require('../server/routes/auth');
const studentRoutes = require('../server/routes/students');
const jobRoutes = require('../server/routes/jobs');
const applicationRoutes = require('../server/routes/applications');
const adminRoutes = require('../server/routes/admin');
const aiRoutes = require('../server/routes/ai');
const interviewRoutes = require('../server/routes/interviews');

dotenv.config({ path: './server/.env' });

const app = express();

connectDB();

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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

module.exports = app;
