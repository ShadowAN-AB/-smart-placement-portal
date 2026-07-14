import { http, HttpResponse } from 'msw';

// Default responders. Individual tests override with server.use(...).
export const handlers = [
  http.get('/api/notifications', () =>
    HttpResponse.json({ items: [], unreadCount: 0, total: 0, totalPages: 1, page: 1, pageSize: 10 })
  ),

  http.get('/api/jobs', () =>
    HttpResponse.json({ jobs: [], page: 1, pageSize: 10, total: 0, totalPages: 1 })
  ),

  http.get('/api/applications/my-applications', () =>
    HttpResponse.json({ applications: [], page: 1, pageSize: 10, total: 0, totalPages: 1 })
  ),

  http.get('/api/students/profile', () =>
    HttpResponse.json({
      profile: { skills: [], yearsOfExperience: 0, expectedSalary: 0, bio: '' },
    })
  ),

  http.post('/api/auth/login', async ({ request }) => {
    const { email } = await request.json();
    return HttpResponse.json({
      token: 'fake.jwt.token',
      user: { id: 'u1', name: 'Test User', email, role: 'student' },
    });
  }),
];
