import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';

const POLL_MS = 30000;

export const useNotifications = () => {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  const visibleRef = useRef(true);

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

  return {
    items,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markRead,
    markAllRead,
  };
};
