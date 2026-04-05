const express = require('express');
const Job = require('../models/Job');
const StudentProfile = require('../models/StudentProfile');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { calculateMatchScore } = require('../utils/matchAlgorithm');

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

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(query.pageSize, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize };
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { company, skills, minSalary, maxSalary } = req.query;
    const { page, pageSize, skip } = parsePagination(req.query);

    const filters = {};

    if (req.user.role === 'student') {
      filters.status = 'active';
      filters.approved = true;
    }

    if (req.user.role === 'recruiter') {
      filters.postedBy = req.user._id;
    }

    if (company) {
      filters.company = { $regex: String(company), $options: 'i' };
    }

    if (skills) {
      filters.requiredSkills = {
        $in: normalizeStringArray(skills).map((item) => item.toLowerCase()),
      };
    }

    if (minSalary !== undefined || maxSalary !== undefined) {
      const minSalaryNum = minSalary !== undefined ? toNonNegativeNumber(minSalary) : 0;
      const maxSalaryNum = maxSalary !== undefined ? toNonNegativeNumber(maxSalary) : null;

      if (minSalaryNum === null || (maxSalary !== undefined && maxSalaryNum === null)) {
        return res.status(400).json({ message: 'minSalary and maxSalary must be non-negative numbers' });
      }

      if (maxSalaryNum !== null && maxSalaryNum < minSalaryNum) {
        return res.status(400).json({ message: 'maxSalary must be greater than or equal to minSalary' });
      }

      filters.minSalary = { $gte: minSalaryNum };
      if (maxSalaryNum !== null) {
        filters.maxSalary = { $lte: maxSalaryNum };
      }
    }

    if (req.user.role === 'student') {
      const jobs = await Job.find(filters).sort({ createdAt: -1 }).lean();
      const total = jobs.length;

      const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();

      const jobsWithMatch = jobs.map((job) => ({
        ...job,
        match: calculateMatchScore({ studentProfile: profile, job }),
      }));

      jobsWithMatch.sort((a, b) => b.match.score - a.match.score);

      const pagedJobs = jobsWithMatch.slice(skip, skip + pageSize);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      return res.json({
        jobs: pagedJobs,
        page,
        pageSize,
        total,
        totalPages,
      });
    }

    const total = await Job.countDocuments(filters);
    const jobs = await Job.find(filters).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return res.json({ jobs, page, pageSize, total, totalPages });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

router.get('/:jobId', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).lean();
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (req.user.role === 'recruiter' && job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only view your own jobs' });
    }

    if (req.user.role === 'student' && (!job.approved || job.status !== 'active')) {
      return res.status(403).json({ message: 'This job is not available for students yet' });
    }

    if (req.user.role !== 'student') {
      return res.json({ job });
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();
    const match = calculateMatchScore({ studentProfile: profile, job });

    return res.json({ job: { ...job, match } });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch job' });
  }
});

router.post('/', authMiddleware, requireRole('recruiter'), async (req, res) => {
  try {
    const { title, company, description, requiredSkills, minExperience, minSalary, maxSalary } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({ message: 'title, company and description are required' });
    }

    const normalizedSkills = normalizeStringArray(requiredSkills);
    if (normalizedSkills.length === 0) {
      return res.status(400).json({ message: 'At least one required skill is needed' });
    }

    const minExperienceNum = toNonNegativeNumber(minExperience || 0);
    const minSalaryNum = toNonNegativeNumber(minSalary || 0);
    const maxSalaryNum = toNonNegativeNumber(maxSalary || 0);

    if (minExperienceNum === null || minSalaryNum === null || maxSalaryNum === null) {
      return res.status(400).json({ message: 'minExperience, minSalary and maxSalary must be non-negative numbers' });
    }

    if (maxSalaryNum > 0 && minSalaryNum > 0 && maxSalaryNum < minSalaryNum) {
      return res.status(400).json({ message: 'maxSalary must be greater than or equal to minSalary' });
    }

    const job = await Job.create({
      title: String(title).trim(),
      company: String(company).trim(),
      description: String(description).trim(),
      requiredSkills: normalizedSkills.map((item) => item.toLowerCase()),
      minExperience: minExperienceNum,
      minSalary: minSalaryNum,
      maxSalary: maxSalaryNum,
      postedBy: req.user._id,
      approved: false,
    });

    return res.status(201).json({ message: 'Job posted', job });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to post job' });
  }
});

router.put('/:jobId', authMiddleware, requireRole('recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own jobs' });
    }

    const updatable = ['title', 'company', 'description', 'status'];
    updatable.forEach((key) => {
      if (req.body[key] !== undefined) {
        job[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      }
    });

    if (req.body.minExperience !== undefined) {
      const minExperienceNum = toNonNegativeNumber(req.body.minExperience);
      if (minExperienceNum === null) {
        return res.status(400).json({ message: 'minExperience must be a non-negative number' });
      }
      job.minExperience = minExperienceNum;
    }

    if (req.body.minSalary !== undefined) {
      const minSalaryNum = toNonNegativeNumber(req.body.minSalary);
      if (minSalaryNum === null) {
        return res.status(400).json({ message: 'minSalary must be a non-negative number' });
      }
      job.minSalary = minSalaryNum;
    }

    if (req.body.maxSalary !== undefined) {
      const maxSalaryNum = toNonNegativeNumber(req.body.maxSalary);
      if (maxSalaryNum === null) {
        return res.status(400).json({ message: 'maxSalary must be a non-negative number' });
      }
      job.maxSalary = maxSalaryNum;
    }

    if (job.maxSalary > 0 && job.minSalary > 0 && job.maxSalary < job.minSalary) {
      return res.status(400).json({ message: 'maxSalary must be greater than or equal to minSalary' });
    }

    if (req.body.requiredSkills !== undefined) {
      const normalizedSkills = normalizeStringArray(req.body.requiredSkills);
      if (normalizedSkills.length === 0) {
        return res.status(400).json({ message: 'At least one required skill is needed' });
      }
      job.requiredSkills = normalizedSkills.map((item) => item.toLowerCase());
    }

    await job.save();

    return res.json({ message: 'Job updated', job });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update job' });
  }
});

router.delete('/:jobId', authMiddleware, requireRole('recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only close your own jobs' });
    }

    job.status = 'closed';
    await job.save();

    return res.json({ message: 'Job closed' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to close job' });
  }
});

module.exports = router;
