const dotenv = require('dotenv');
const connectDB = require('../server/config/db');
const { buildApp } = require('../server/app');

dotenv.config({ path: './server/.env' });

connectDB();

module.exports = buildApp();
