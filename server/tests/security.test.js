const request = require('supertest');
const { buildApp } = require('../app');

let app;

beforeAll(() => {
  app = buildApp();
});

describe('GET /api/ai/health', () => {
  it('is public — no auth required', async () => {
    const res = await request(app).get('/api/ai/health');
    expect(res.status).toBe(200);
    // Shape check: never expose user data on a health endpoint.
    expect(res.body).toHaveProperty('provider');
    expect(res.body).toHaveProperty('healthy');
    expect(res.body).not.toHaveProperty('userId');
    expect(res.body).not.toHaveProperty('email');
  });
});

describe('validateEnv', () => {
  it('crashes when NODE_ENV=production and JWT_SECRET is missing', () => {
    const { validateEnv } = require('../config/validateEnv');
    const orig = { ...process.env };
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.ADMIN_SIGNUP_CODE;
    process.env.MONGODB_URI = 'mongodb://x';
    expect(() => validateEnv()).toThrow(/JWT_SECRET is not set/);
    // Restore
    Object.assign(process.env, orig);
  });

  it('crashes when NODE_ENV=production and secrets are still the dev defaults', () => {
    const { validateEnv } = require('../config/validateEnv');
    const orig = { ...process.env };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'dev_jwt_secret_change_me';
    process.env.ADMIN_SIGNUP_CODE = 'placement_admin_2026';
    process.env.MONGODB_URI = 'mongodb://x';
    expect(() => validateEnv()).toThrow(/well-known dev default/);
    Object.assign(process.env, orig);
  });

  it('passes when NODE_ENV=production and everything is set to non-defaults', () => {
    const { validateEnv } = require('../config/validateEnv');
    const orig = { ...process.env };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'real-random-secret-abc123';
    process.env.ADMIN_SIGNUP_CODE = 'not_the_default_code';
    process.env.MONGODB_URI = 'mongodb://cluster';
    expect(() => validateEnv()).not.toThrow();
    Object.assign(process.env, orig);
  });
});
