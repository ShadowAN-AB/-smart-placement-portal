// dotenv.config() must run BEFORE requiring the app factory — see server.js
// header comment for why. Same rule holds on Vercel.
require('dotenv').config({ path: './server/.env' });

const connectDB = require('../server/config/db');
const { buildApp } = require('../server/app');

connectDB();

module.exports = buildApp();
