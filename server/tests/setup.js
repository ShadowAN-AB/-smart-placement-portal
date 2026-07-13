// Env must be set BEFORE any application module loads so
// modules that read process.env at import time (auth middleware,
// auth routes) see the test values.
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.ADMIN_SIGNUP_CODE = 'test_admin_code';
process.env.LLM_PROVIDER = 'ollama'; // health() only, no network calls in tests
process.env.APP_URL = 'http://localhost:5173';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
// beforeAll / afterAll / afterEach are provided as globals (see vitest.config.js).

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 60_000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});
