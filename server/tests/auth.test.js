const request = require('supertest');
const { buildApp } = require('../app');
const { createUser } = require('./helpers');

let app;

beforeAll(() => {
  app = buildApp();
});

describe('POST /api/auth/signup', () => {
  it('creates a student and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Alice', email: 'alice@test.local', password: 'Password@123', role: 'student' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('student');
  });

  it('rejects admin signup without the correct admin code', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Nope', email: 'nope@test.local', password: 'Password@123', role: 'admin', adminCode: 'wrong' });
    expect(res.status).toBe(403);
  });

  it('accepts admin signup with the correct admin code', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Boss', email: 'boss@test.local', password: 'Password@123', role: 'admin', adminCode: 'test_admin_code' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser({ email: 'dupe@test.local' });
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'X', email: 'dupe@test.local', password: 'Password@123', role: 'student' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    await createUser({ email: 'login@test.local' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.local', password: 'Password@123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects wrong password with 401', async () => {
    await createUser({ email: 'wrongpw@test.local' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrongpw@test.local', password: 'not-the-password' });
    expect(res.status).toBe(401);
  });
});
