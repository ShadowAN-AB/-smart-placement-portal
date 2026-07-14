import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { useSocket } from './useSocket';

// Socket handles the live push; the poll is now a fallback for when the
// connection drops or was never established (e.g. serverless deploy).
const POLL_MS = 60000;

export const useNotifications = () => {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  const visibleRef = useRef(true);
  const { connected, on } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiRequest('/api/notifications?page=1&pageSize=10');
      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    const onVisibility = () => {
      visibleRef.current = !document.hidden;
      if (visibleRef.current) fetchNotifications();
    };
    document.addEventListener('visibilitychange', onVisibility);

    pollRef.current = setInterval(() => {
      if (visibleRef.current) fetchNotifications();
    }, POLL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  // Live push: when a socket delivers a fresh notification, prepend it and
  // bump the unread count. Dedupe by _id to guard against a race where the
  // poll fetches the same doc immediately after the socket delivers it.
  useEffect(() => {
    const off = on('notification', (doc) => {
      if (!doc?._id) return;
      setItems((prev) => {
        if (prev.some((n) => n._id === doc._id)) return prev;
        return [doc, ...prev].slice(0, 10);
      });
      if (!doc.read) setUnreadCount((prev) => prev + 1);
    });
    return off;
  }, [on, connected]);

  return {
    items,
    unreadCount,
    loading,
    error,
    live: connected,
    refetch: fetchNotifications,
    markRead,
    markAllRead,
  };
};
