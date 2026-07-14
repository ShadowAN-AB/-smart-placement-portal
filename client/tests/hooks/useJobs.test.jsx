import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useJobs } from '../../src/hooks/useJobs';
import { server } from '../msw/server';

describe('useJobs', () => {
  it('fetches on mount and exposes results + pagination', async () => {
    server.use(
      http.get('/api/jobs', () =>
        HttpResponse.json({
          jobs: [{ _id: 'j1', title: 'X', company: 'Y' }],
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        })
      )
    );
    const { result } = renderHook(() => useJobs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].title).toBe('X');
    expect(result.current.pagination.total).toBe(1);
  });

  it('refetches when filters change', async () => {
    const seen = [];
    server.use(
      http.get('/api/jobs', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('company') || '');
        return HttpResponse.json({ jobs: [], page: 1, pageSize: 10, total: 0, totalPages: 1 });
      })
    );

    const { result, rerender } = renderHook(({ filters }) => useJobs(filters), {
      initialProps: { filters: { company: 'A' } },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ filters: { company: 'B' } });
    await waitFor(() => expect(seen).toContain('B'));

    expect(seen).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('surfaces server errors via the error field', async () => {
    server.use(
      http.get('/api/jobs', () => HttpResponse.json({ message: 'boom' }, { status: 500 }))
    );
    const { result } = renderHook(() => useJobs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
  });
});
