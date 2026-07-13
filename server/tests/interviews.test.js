const request = require('supertest');
const { buildApp } = require('../app');
const { createUser, authHeader, createJob, createStudentProfile } = require('./helpers');

let app;

beforeAll(() => {
  app = buildApp();
});

const futureDate = (offsetMinutes) => new Date(Date.now() + offsetMinutes * 60_000).toISOString();

const setupApplication = async () => {
  const recruiter = await createUser({ role: 'recruiter' });
  const student = await createUser({ role: 'student' });
  await createStudentProfile(student._id);
  const job = await createJob(recruiter._id);
  const applyRes = await request(app)
    .post('/api/applications')
    .set(authHeader(student._id))
    .send({ jobId: job._id.toString() });
  return { recruiter, student, job, application: applyRes.body.application };
};

describe('POST /api/interviews', () => {
  it('schedules an interview and moves the application to "interview" status', async () => {
    const { recruiter, application } = await setupApplication();

    const res = await request(app)
      .post('/api/interviews')
      .set(authHeader(recruiter._id))
      .send({
        applicationId: application._id,
        scheduledAt: futureDate(60),
        duration: 30,
        meetingType: 'video',
        meetingLink: 'https://meet.example.com/test',
      });

    expect(res.status).toBe(201);
    expect(res.body.interview.status).toBe('scheduled');
  });

  it('rejects a second interview within the ±30 min buffer for the same student', async () => {
    const { recruiter, student, application } = await setupApplication();

    // Schedule the first at t+60
    const first = await request(app)
      .post('/api/interviews')
      .set(authHeader(recruiter._id))
      .send({ applicationId: application._id, scheduledAt: futureDate(60), duration: 30, meetingType: 'video', meetingLink: 'https://meet.example.com/a' });
    expect(first.status).toBe(201);

    // Second application for the SAME student on a different job
    const otherRecruiter = await createUser({ role: 'recruiter' });
    const otherJob = await createJob(otherRecruiter._id, { title: 'Other' });
    const otherApp = await request(app).post('/api/applications').set(authHeader(student._id)).send({ jobId: otherJob._id.toString() });

    // Schedule at t+65 (5 min later; well within the ±30 min buffer of the first)
    const second = await request(app)
      .post('/api/interviews')
      .set(authHeader(otherRecruiter._id))
      .send({ applicationId: otherApp.body.application._id, scheduledAt: futureDate(65), duration: 30, meetingType: 'video', meetingLink: 'https://meet.example.com/b' });

    expect(second.status).toBe(409);
  });

  it('rejects a scheduledAt in the past', async () => {
    const { recruiter, application } = await setupApplication();
    const res = await request(app)
      .post('/api/interviews')
      .set(authHeader(recruiter._id))
      .send({ applicationId: application._id, scheduledAt: new Date(Date.now() - 3600_000).toISOString(), duration: 30, meetingType: 'video', meetingLink: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/interviews/:id/cancel', () => {
  it('reverts the application status back to shortlisted', async () => {
    const { recruiter, application } = await setupApplication();

    const scheduled = await request(app)
      .post('/api/interviews')
      .set(authHeader(recruiter._id))
      .send({ applicationId: application._id, scheduledAt: futureDate(60), duration: 30, meetingType: 'video', meetingLink: 'https://meet.example.com/x' });

    const cancel = await request(app)
      .put(`/api/interviews/${scheduled.body.interview._id}/cancel`)
      .set(authHeader(recruiter._id))
      .send({ reason: 'candidate withdrew' });

    expect(cancel.status).toBe(200);
    expect(cancel.body.interview.status).toBe('cancelled');

    // Verify the application status was reverted
    const Application = require('../models/Application');
    const app_ = await Application.findById(application._id);
    expect(app_.status).toBe('shortlisted');
  });
});
