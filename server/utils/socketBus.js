let ioInstance = null;

/**
 * Register the Socket.IO server instance. Called from server.js after the
 * HTTP server is created. Not called on Vercel (serverless), where sockets
 * can't stay alive — getIO() will return null there and callers should
 * treat that as a no-op.
 */
const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

const roomForUser = (userId) => `user:${userId}`;

/**
 * Emit an event to a specific user's room. No-op when sockets are disabled
 * (e.g. on Vercel). Never throws — callers can `emitToUser(...)` freely.
 */
const emitToUser = (userId, event, payload) => {
  const io = getIO();
  if (!io || !userId) return;
  try {
    io.to(roomForUser(userId)).emit(event, payload);
  } catch (error) {
    console.error('[socketBus] emit failed:', error.message);
  }
};

module.exports = { setIO, getIO, roomForUser, emitToUser };
