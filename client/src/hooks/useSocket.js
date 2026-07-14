import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const TOKEN_KEY = 'spp_token';

/**
 * Manages the Socket.IO connection lifecycle:
 * - Connects on login (token appears).
 * - Reconnects when the token changes.
 * - Disconnects on logout / unmount.
 * - Exposes a stable `on(event, handler)` that returns an unsubscribe fn.
 *
 * Returns { connected, on, socket }. `on` is safe to call from render effects.
 */
export const useSocket = () => {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      // Clean up any lingering socket if the user logged out.
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Same-origin in prod (served by whatever hosts the client); the Vite dev
    // proxy does not forward WebSocket upgrades, so point at the API base
    // directly in dev.
    const url = import.meta.env.VITE_API_BASE_URL || undefined;

    const socket = io(url, {
      auth: { token: localStorage.getItem(TOKEN_KEY) || token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });

    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError = (err) => {
      console.warn('[socket] connect_error:', err?.message || err);
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const on = (event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  };

  return { connected, on, socket: socketRef.current };
};
