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

describe('JWT_SECRET propagation', () => {
  // Regression: server.js used to call dotenv.config() AFTER requiring
  // routes/middleware, so those modules captured the fallback secret.
  // A REST-only flow was self-consistent (both sign + verify used the
  // fallback), but tokens signed by the REST layer couldn't be verified
  // by the socket handshake (which reads the secret post-dotenv). This
  // test locks in the shared-secret behavior.
  it('signs and verifies with the configured secret end-to-end', async () => {
    const jwt = require('jsonwebtoken');
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Sec', email: 'sec@test.local', password: 'Password@123', role: 'student' });
    expect(signup.status).toBe(201);
    // The token in the response must verify against process.env.JWT_SECRET.
    const decoded = jwt.verify(signup.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBeTruthy();
    // And the same token must authenticate a subsequent request.
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${signup.body.token}`);
    expect(me.status).toBe(200);
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
