const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

const router = express.Router();

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(query.pageSize, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize };
};

router.get('/analytics', authMiddleware, requireRole('admin'), async (_req, res) => {
  try {
    const [totalStudents, totalRecruiters, totalJobs, totalApplications] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'recruiter' }),
      Job.countDocuments(),
      Application.countDocuments(),
    ]);

    const shortlisted = await Application.countDocuments({ status: { $in: ['shortlisted', 'interview'] } });
    const placementRate = totalApplications > 0 ? (shortlisted / totalApplications) * 100 : 0;

    const salaryStats = await Job.aggregate([
      { $match: { maxSalary: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgPackage: { $avg: '$maxSalary' },
        },
      },
    ]);

    const topCompanies = await Job.aggregate([
      { $group: { _id: '$company', offers: { $sum: 1 } } },
      { $sort: { offers: -1 } },
      { $limit: 5 },
    ]);

    const trendsRaw = await Application.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$appliedAt' },
            month: { $month: '$appliedAt' },
          },
          applications: { $sum: 1 },
          placements: {
            $sum: {
              $cond: [{ $in: ['$status', ['shortlisted', 'interview']] }, 1, 0],
            },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    const monthlyTrends = trendsRaw.map((item) => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      applications: item.applications,
      placements: item.placements,
    }));

    const recentPlacements = await Application.find({ status: { $in: ['shortlisted', 'interview'] } })
      .populate('studentId', 'name email')
      .populate('jobId', 'title company maxSalary')
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();

    return res.json({
      analytics: {
        totalStudents,
        totalRecruiters,
        totalJobs,
        totalApplications,
        placementRate: Math.round(placementRate * 100) / 100,
        avgPackage: Math.round((salaryStats[0]?.avgPackage || 0) * 100) / 100,
        topCompanies: topCompanies.map((item) => ({ company: item._id, offers: item.offers })),
        monthlyTrends,
        recentPlacements,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load analytics' });
  }
});

router.get('/approvals', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const filters = { approved: false };

    const [total, pendingJobs] = await Promise.all([
      Job.countDocuments(filters),
      Job.find(filters).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    ]);

    return res.json({
      approvals: pendingJobs,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load approvals' });
  }
});

router.post('/approve-job/:jobId', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.approved = true;
    await job.save();

    return res.json({ message: 'Job approved', job });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve job' });
  }
});

module.exports = router;
