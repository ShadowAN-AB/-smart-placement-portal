const Notification = require('../models/Notification');

/**
 * Create an in-app notification for a user. Fire-and-forget from routes —
 * persistence failures are logged but do not surface to the caller.
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
    return doc;
  } catch (error) {
    console.error('[notifier] failed to create notification:', error.message);
    return null;
  }
};

module.exports = { notify };
