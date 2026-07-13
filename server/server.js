const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { buildApp } = require('./app');

dotenv.config();

const PORT = process.env.PORT || 5050;

connectDB();

const app = buildApp();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
