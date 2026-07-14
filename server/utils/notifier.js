const Notification = require('../models/Notification');
const { emitToUser } = require('./socketBus');

/**
 * Create an in-app notification for a user, then push it live over Socket.IO
 * if a socket connection exists. Fire-and-forget from routes — persistence
 * failures are logged but do not surface to the caller.
 */
const notify = async (userId, { type, title, body, link, meta }) => {
  if (!userId || !type || !title) return null;

  try {
    const doc = await Notification.create({
      userId,
      type,
      title,
      body: body || '',
      link: link || '',
      meta: meta || {},
    });

    // Live push. No-op if the user isn't connected or sockets are disabled.
    emitToUser(userId, 'notification', doc.toJSON());

    return doc;
  } catch (error) {
    console.error('[notifier] failed to create notification:', error.message);
    return null;
  }
};

module.exports = { notify };
