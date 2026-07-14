import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { apiRequest } from '../../src/utils/api';
import { server } from '../msw/server';

describe('apiRequest', () => {
  beforeEach(() => localStorage.clear());

  it('attaches the Bearer token from localStorage', async () => {
    localStorage.setItem('spp_token', 'my-token');
    let seenAuth = null;
    server.use(
      http.get('/api/probe', ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      })
    );
    const data = await apiRequest('/api/probe');
    expect(data).toEqual({ ok: true });
    expect(seenAuth).toBe('Bearer my-token');
  });

  it('omits Authorization header when no token is stored', async () => {
    let seenAuth = null;
    server.use(
      http.get('/api/probe', ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      })
    );
    await apiRequest('/api/probe');
    expect(seenAuth).toBeNull();
  });

  it('throws with server message on non-2xx', async () => {
    server.use(
      http.get('/api/broken', () =>
        HttpResponse.json({ message: 'nope' }, { status: 400 })
      )
    );
    await expect(apiRequest('/api/broken')).rejects.toThrow('nope');
  });

  it('parses 204 as null', async () => {
    server.use(http.delete('/api/x', () => new HttpResponse(null, { status: 204 })));
    const res = await apiRequest('/api/x', { method: 'DELETE' });
    expect(res).toBeNull();
  });

  it('sets Content-Type: application/json by default', async () => {
    let seenType = null;
    server.use(
      http.post('/api/echo', ({ request }) => {
        seenType = request.headers.get('content-type');
        return HttpResponse.json({});
      })
    );
    await apiRequest('/api/echo', { method: 'POST', body: JSON.stringify({}) });
    expect(seenType).toContain('application/json');
  });
});
