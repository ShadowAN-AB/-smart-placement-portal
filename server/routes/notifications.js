const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();
router.use(authMiddleware);

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(query.pageSize, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize };
};

// ── List notifications for current user ──
router.get('/', async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const unreadOnly = String(req.query.unreadOnly).toLowerCase() === 'true';

    const filter = { userId: req.user._id };
    if (unreadOnly) filter.read = false;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);

    return res.json({
      items,
      page,
      pageSize,
      total,
      unreadCount,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load notifications' });
  }
});

// ── Mark one as read ──
router.post('/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const doc = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: 'Notification not found' });
    return res.json({ notification: doc });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark as read' });
  }
});

// ── Mark all as read ──
router.post('/read-all', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } }
    );
    return res.json({ updated: result.modifiedCount });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark all as read' });
  }
});

module.exports = router;
