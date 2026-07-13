const request = require('supertest');
const { buildApp } = require('../app');
const { createUser, authHeader, createJob, createStudentProfile } = require('./helpers');

let app;

beforeAll(() => {
  app = buildApp();
});

describe('POST /api/applications', () => {
  it('creates an application and returns 201', async () => {
    const student = await createUser({ role: 'student' });
    const recruiter = await createUser({ role: 'recruiter' });
    await createStudentProfile(student._id);
    const job = await createJob(recruiter._id);

    const res = await request(app)
      .post('/api/applications')
      .set(authHeader(student._id))
      .send({ jobId: job._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('pending');
  });

  it('rejects duplicate applications with 409', async () => {
    const student = await createUser({ role: 'student' });
    const recruiter = await createUser({ role: 'recruiter' });
    await createStudentProfile(student._id);
    const job = await createJob(recruiter._id);

    await request(app).post('/api/applications').set(authHeader(student._id)).send({ jobId: job._id.toString() });
    const res = await request(app).post('/api/applications').set(authHeader(student._id)).send({ jobId: job._id.toString() });

    expect(res.status).toBe(409);
  });

  it('refuses to apply to an unapproved job', async () => {
    const student = await createUser({ role: 'student' });
    const recruiter = await createUser({ role: 'recruiter' });
    await createStudentProfile(student._id);
    const job = await createJob(recruiter._id, { approved: false });

    const res = await request(app)
      .post('/api/applications')
      .set(authHeader(student._id))
      .send({ jobId: job._id.toString() });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/applications/bulk-status', () => {
  it('updates all owned applications atomically', async () => {
    const recruiter = await createUser({ role: 'recruiter' });
    const students = await Promise.all([createUser({ role: 'student' }), createUser({ role: 'student' })]);
    await Promise.all(students.map((s) => createStudentProfile(s._id)));
    const job = await createJob(recruiter._id);

    const apps = await Promise.all(
      students.map((s) =>
        request(app).post('/api/applications').set(authHeader(s._id)).send({ jobId: job._id.toString() })
      )
    );
    const appIds = apps.map((r) => r.body.application._id);

    const res = await request(app)
      .post('/api/applications/bulk-status')
      .set(authHeader(recruiter._id))
      .send({ appIds, status: 'shortlisted' });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
  });

  it('rejects the whole batch with 403 if any application is owned by another recruiter', async () => {
    const mine = await createUser({ role: 'recruiter' });
    const other = await createUser({ role: 'recruiter' });
    const student = await createUser({ role: 'student' });
    await createStudentProfile(student._id);

    const myJob = await createJob(mine._id, { title: 'Mine' });
    const otherJob = await createJob(other._id, { title: 'Theirs' });

    const app1 = await request(app).post('/api/applications').set(authHeader(student._id)).send({ jobId: myJob._id.toString() });
    // Second application to the other recruiter's job — must apply as a different student due to unique index
    const student2 = await createUser({ role: 'student' });
    await createStudentProfile(student2._id);
    const app2 = await request(app).post('/api/applications').set(authHeader(student2._id)).send({ jobId: otherJob._id.toString() });

    const res = await request(app)
      .post('/api/applications/bulk-status')
      .set(authHeader(mine._id))
      .send({ appIds: [app1.body.application._id, app2.body.application._id], status: 'shortlisted' });

    expect(res.status).toBe(403);
    expect(res.body.owned).toBe(1);
    expect(res.body.requested).toBe(2);
  });
});
