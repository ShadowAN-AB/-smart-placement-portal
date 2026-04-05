const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const StudentProfile = require('../models/StudentProfile');

const router = express.Router();

const normalizeStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const toNonNegativeNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

router.get('/profile', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.json({
        profile: {
          userId: req.user._id,
          skills: [],
          resumeUrl: '',
          bio: '',
          expectedSalary: 0,
          prefJobTitles: [],
          yearsOfExperience: 0,
        },
      });
    }

    return res.json({ profile });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

router.put('/profile', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const expectedSalary = toNonNegativeNumber(req.body.expectedSalary || 0);
    const yearsOfExperience = toNonNegativeNumber(req.body.yearsOfExperience || 0);

    if (expectedSalary === null || yearsOfExperience === null) {
      return res.status(400).json({ message: 'expectedSalary and yearsOfExperience must be non-negative numbers' });
    }

    const bio = String(req.body.bio || '').trim();
    if (bio.length > 500) {
      return res.status(400).json({ message: 'bio must be 500 characters or less' });
    }

    const updates = {
      skills: normalizeStringArray(req.body.skills),
      bio,
      expectedSalary,
      prefJobTitles: normalizeStringArray(req.body.prefJobTitles),
      yearsOfExperience,
    };

    const profile = await StudentProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, upsert: true }
    );

    return res.json({ message: 'Profile updated', profile });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.post('/profile/resume', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const resumeUrl = String(req.body.resumeUrl || '').trim();

    if (!resumeUrl) {
      return res.status(400).json({ message: 'resumeUrl is required' });
    }

    if (!/^https?:\/\//i.test(resumeUrl)) {
      return res.status(400).json({ message: 'resumeUrl must be a valid http/https link' });
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { resumeUrl } },
      { new: true, upsert: true }
    );

    return res.json({ message: 'Resume updated', profile });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update resume' });
  }
});

module.exports = router;
