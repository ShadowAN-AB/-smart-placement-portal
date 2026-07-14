import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';

// Mock the socket hook — the real one opens a network connection that never
// resolves in jsdom, which would hang tests. Tests focus on the REST/poll
// side of useNotifications; socket delivery is exercised via the mocked
// `on(event, handler)` returned here.
let socketHandlers = {};
vi.mock('../../src/hooks/useSocket', () => ({
  useSocket: () => ({
    connected: false,
    socket: null,
    on: (event, handler) => {
      socketHandlers[event] = handler;
      return () => delete socketHandlers[event];
    },
  }),
}));

// Import AFTER the mock so useNotifications picks up the mocked useSocket.
const { useNotifications } = await import('../../src/hooks/useNotifications');

describe('useNotifications', () => {
  beforeEach(() => {
    socketHandlers = {};
  });

  it('fetches on mount and exposes items + unreadCount', async () => {
    server.use(
      http.get('/api/notifications', () =>
        HttpResponse.json({
          items: [{ _id: 'n1', title: 'Hi', body: 'body', read: false, createdAt: new Date().toISOString() }],
          unreadCount: 1,
          total: 1,
          totalPages: 1,
          page: 1,
          pageSize: 10,
        })
      )
    );
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('markRead updates local state optimistically', async () => {
    server.use(
      http.get('/api/notifications', () =>
        HttpResponse.json({
          items: [{ _id: 'n1', title: 'A', body: '', read: false, createdAt: new Date().toISOString() }],
          unreadCount: 1,
          total: 1,
          totalPages: 1,
          page: 1,
          pageSize: 10,
        })
      ),
      http.post('/api/notifications/:id/read', () => HttpResponse.json({ notification: { _id: 'n1', read: true } }))
    );

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.markRead('n1');
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.items[0].read).toBe(true);
  });

  it('receives a live notification via the socket event and prepends it', async () => {
    server.use(
      http.get('/api/notifications', () =>
        HttpResponse.json({ items: [], unreadCount: 0, total: 0, totalPages: 1, page: 1, pageSize: 10 })
      )
    );
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate a server push through the mocked socket.
    act(() => {
      socketHandlers['notification']?.({
        _id: 'live1',
        title: 'Live!',
        body: 'from socket',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    expect(result.current.items[0]._id).toBe('live1');
    expect(result.current.unreadCount).toBe(1);
  });

  it('dedupes a socket notification whose _id already exists locally', async () => {
    server.use(
      http.get('/api/notifications', () =>
        HttpResponse.json({
          items: [{ _id: 'dup', title: 'X', body: '', read: false, createdAt: new Date().toISOString() }],
          unreadCount: 1,
          total: 1,
          totalPages: 1,
          page: 1,
          pageSize: 10,
        })
      )
    );
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      socketHandlers['notification']?.({ _id: 'dup', title: 'X', body: '', read: false });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1); // no double-count
  });
});
