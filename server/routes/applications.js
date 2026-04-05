const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware, requireRole } = require('../middleware/auth');
const Application = require('../models/Application');
const Job = require('../models/Job');
const StudentProfile = require('../models/StudentProfile');
const MatchScore = require('../models/MatchScore');
const { calculateMatchScore } = require('../utils/matchAlgorithm');

const router = express.Router();

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(query.pageSize, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize };
};

router.post('/', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'jobId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'jobId is invalid' });
    }

    const job = await Job.findById(jobId).lean();
    if (!job || job.status !== 'active' || !job.approved) {
      return res.status(404).json({ message: 'Active job not found' });
    }

    const exists = await Application.findOne({ studentId: req.user._id, jobId });
    if (exists) {
      return res.status(409).json({ message: 'You already applied to this job' });
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();
    const match = calculateMatchScore({ studentProfile: profile, job });

    const application = await Application.create({
      studentId: req.user._id,
      jobId,
      status: 'pending',
      matchScore: match.score,
    });

    await MatchScore.findOneAndUpdate(
      { studentId: req.user._id, jobId },
      {
        $set: {
          score: match.score,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          explanation: match.explanation,
          calculatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({ message: 'Application submitted', application, match });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You already applied to this job' });
    }
    return res.status(500).json({ message: 'Failed to submit application' });
  }
});

router.get('/my-applications', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { page, pageSize, skip } = parsePagination(req.query);
    const filters = { studentId: req.user._id };

    const [total, applications] = await Promise.all([
      Application.countDocuments(filters),
      Application.find(filters)
        .populate('jobId', 'title company minSalary maxSalary status requiredSkills')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(pageSize),
    ]);

    return res.json({
      applications,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

router.get('/job/:jobId', authMiddleware, requireRole('recruiter'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { search, status, minMatchScore, skill, sortBy, order } = req.query;
    const { page, pageSize } = parsePagination(req.query);

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'jobId is invalid' });
    }

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only view applicants for your own jobs' });
    }

    const query = { jobId };
    if (status) {
      query.status = String(status).toLowerCase();
    }

    if (minMatchScore !== undefined) {
      const minMatchScoreNum = Number(minMatchScore);
      if (!Number.isFinite(minMatchScoreNum) || minMatchScoreNum < 0 || minMatchScoreNum > 100) {
        return res.status(400).json({ message: 'minMatchScore must be between 0 and 100' });
      }
      query.matchScore = { $gte: minMatchScoreNum };
    }

    const sortKey = sortBy === 'matchScore' ? 'matchScore' : 'appliedAt';
    const sortDir = String(order || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    const applications = await Application.find(query)
      .populate('studentId', 'name email')
      .sort({ [sortKey]: sortDir })
      .lean();

    const studentIds = applications.map((item) => item.studentId?._id).filter(Boolean);
    const profiles = await StudentProfile.find({ userId: { $in: studentIds } }).lean();
    const profileByUser = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));

    let enrichedApplications = applications.map((item) => ({
      ...item,
      studentProfile: item.studentId ? profileByUser.get(item.studentId._id.toString()) || null : null,
    }));

    if (search) {
      const needle = String(search).trim().toLowerCase();
      enrichedApplications = enrichedApplications.filter((item) => {
        const name = String(item.studentId?.name || '').toLowerCase();
        const email = String(item.studentId?.email || '').toLowerCase();
        return name.includes(needle) || email.includes(needle);
      });
    }

    if (skill) {
      const skillNeedle = String(skill).trim().toLowerCase();
      enrichedApplications = enrichedApplications.filter((item) =>
        (item.studentProfile?.skills || []).some((entry) => String(entry).toLowerCase().includes(skillNeedle))
      );
    }

    const total = enrichedApplications.length;
    const skip = (page - 1) * pageSize;
    const pagedApplications = enrichedApplications.slice(skip, skip + pageSize);

    return res.json({
      applications: pagedApplications,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch applicants' });
  }
});

router.put('/:appId/status', authMiddleware, requireRole('recruiter'), async (req, res) => {
  try {
    const { appId } = req.params;
    const status = String(req.body.status || '').trim().toLowerCase();

    if (!mongoose.Types.ObjectId.isValid(appId)) {
      return res.status(400).json({ message: 'appId is invalid' });
    }

    if (!['pending', 'shortlisted', 'rejected', 'interview'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const application = await Application.findById(appId).populate('jobId');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.jobId.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update applications for your own jobs' });
    }

    application.status = status;
    await application.save();

    return res.json({ message: 'Application status updated', application });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update status' });
  }
});

module.exports = router;
