const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware, requireRole } = require('../middleware/auth');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { generateICS } = require('../utils/icsGenerator');

const router = express.Router();

router.use(authMiddleware);

// ── Schedule an interview (recruiter only) ──
router.post('/', requireRole('recruiter'), async (req, res) => {
  try {
    const { applicationId, scheduledAt, duration, meetingType, meetingLink, location, notes } = req.body;

    if (!applicationId || !scheduledAt) {
      return res.status(400).json({ message: 'applicationId and scheduledAt are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid applicationId' });
    }

    const scheduled = new Date(scheduledAt);
    if (Number.isNaN(scheduled.getTime()) || scheduled <= new Date()) {
      return res.status(400).json({ message: 'scheduledAt must be a valid future date' });
    }

    const durationNum = Math.min(180, Math.max(15, Number(duration) || 30));

    const application = await Application.findById(applicationId).populate('jobId');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.jobId.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only schedule interviews for your own jobs' });
    }

    // Check for existing interview
    const existingInterview = await Interview.findOne({ applicationId });
    if (existingInterview && existingInterview.status === 'scheduled') {
      return res.status(409).json({ message: 'An interview is already scheduled for this application. Cancel or reschedule it first.' });
    }

    // Check for student time conflicts (±30 min buffer)
    const bufferMs = 30 * 60 * 1000;
    const conflictCheck = await Interview.findOne({
      studentId: application.studentId,
      status: 'scheduled',
      scheduledAt: {
        $gte: new Date(scheduled.getTime() - bufferMs - durationNum * 60 * 1000),
        $lte: new Date(scheduled.getTime() + durationNum * 60 * 1000 + bufferMs),
      },
    });

    if (conflictCheck) {
      return res.status(409).json({
        message: 'Student has a conflicting interview at this time slot. Please choose another time.',
      });
    }

    const interview = await Interview.create({
      applicationId,
      jobId: application.jobId._id,
      studentId: application.studentId,
      recruiterId: req.user._id,
      scheduledAt: scheduled,
      duration: durationNum,
      meetingType: meetingType || 'video',
      meetingLink: meetingLink || '',
      location: location || '',
      notes: notes || '',
      status: 'scheduled',
    });

    // Update application status to 'interview'
    application.status = 'interview';
    await application.save();

    return res.status(201).json({ message: 'Interview scheduled', interview });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An interview already exists for this application' });
    }
    console.error('Schedule interview error:', error);
    return res.status(500).json({ message: 'Failed to schedule interview' });
  }
});

// ── List interviews for current user ──
router.get('/', async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    const query = {};

    if (req.user.role === 'student') {
      query.studentId = req.user._id;
    } else if (req.user.role === 'recruiter') {
      query.recruiterId = req.user._id;
    }

    if (status) {
      query.status = String(status).toLowerCase();
    }

    if (upcoming === 'true') {
      query.scheduledAt = { $gte: new Date() };
      query.status = 'scheduled';
    }

    const interviews = await Interview.find(query)
      .populate('jobId', 'title company')
      .populate('studentId', 'name email')
      .populate('recruiterId', 'name email')
      .sort({ scheduledAt: 1 })
      .limit(50)
      .lean();

    return res.json({ interviews });
  } catch (error) {
    console.error('List interviews error:', error);
    return res.status(500).json({ message: 'Failed to fetch interviews' });
  }
});

// ── Get single interview ──
router.get('/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ message: 'Invalid interviewId' });
    }

    const interview = await Interview.findById(interviewId)
      .populate('jobId', 'title company description requiredSkills')
      .populate('studentId', 'name email')
      .populate('recruiterId', 'name email')
      .lean();

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Authorization: only the student, recruiter, or admin can view
    const userId = req.user._id.toString();
    if (
      req.user.role !== 'admin' &&
      interview.studentId._id.toString() !== userId &&
      interview.recruiterId._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json({ interview });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch interview' });
  }
});

// ── Reschedule interview (recruiter only) ──
router.put('/:interviewId/reschedule', requireRole('recruiter'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { scheduledAt, duration, meetingType, meetingLink, location, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ message: 'Invalid interviewId' });
    }

    if (!scheduledAt) {
      return res.status(400).json({ message: 'scheduledAt is required' });
    }

    const scheduled = new Date(scheduledAt);
    if (Number.isNaN(scheduled.getTime()) || scheduled <= new Date()) {
      return res.status(400).json({ message: 'scheduledAt must be a valid future date' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only reschedule your own interviews' });
    }

    if (interview.status === 'completed' || interview.status === 'cancelled') {
      return res.status(400).json({ message: `Cannot reschedule a ${interview.status} interview` });
    }

    interview.scheduledAt = scheduled;
    interview.status = 'scheduled';
    if (duration) interview.duration = Math.min(180, Math.max(15, Number(duration)));
    if (meetingType) interview.meetingType = meetingType;
    if (meetingLink !== undefined) interview.meetingLink = meetingLink;
    if (location !== undefined) interview.location = location;
    if (notes !== undefined) interview.notes = notes;

    await interview.save();

    return res.json({ message: 'Interview rescheduled', interview });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reschedule interview' });
  }
});

// ── Cancel interview (recruiter only) ──
router.put('/:interviewId/cancel', requireRole('recruiter'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ message: 'Invalid interviewId' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own interviews' });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed interview' });
    }

    interview.status = 'cancelled';
    interview.cancelReason = reason || '';
    await interview.save();

    // Revert application status to shortlisted
    await Application.findByIdAndUpdate(interview.applicationId, { status: 'shortlisted' });

    return res.json({ message: 'Interview cancelled', interview });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to cancel interview' });
  }
});

// ── Complete interview with feedback (recruiter only) ──
router.put('/:interviewId/complete', requireRole('recruiter'), async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { feedback, rating } = req.body;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ message: 'Invalid interviewId' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only complete your own interviews' });
    }

    interview.status = 'completed';
    if (feedback) interview.feedback = feedback;
    if (rating) {
      const ratingNum = Math.min(5, Math.max(1, Number(rating)));
      if (Number.isFinite(ratingNum)) interview.rating = ratingNum;
    }

    await interview.save();

    return res.json({ message: 'Interview marked as completed', interview });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to complete interview' });
  }
});

// ── Download .ics calendar file ──
router.get('/:interviewId/calendar', async (req, res) => {
  try {
    const { interviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ message: 'Invalid interviewId' });
    }

    const interview = await Interview.findById(interviewId)
      .populate('jobId', 'title company')
      .populate('studentId', 'name email')
      .populate('recruiterId', 'name email')
      .lean();

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const userId = req.user._id.toString();
    if (
      req.user.role !== 'admin' &&
      interview.studentId._id.toString() !== userId &&
      interview.recruiterId._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const title = `Interview: ${interview.jobId?.title || 'Position'} at ${interview.jobId?.company || 'Company'}`;
    const description = [
      `Role: ${interview.jobId?.title || '-'}`,
      `Company: ${interview.jobId?.company || '-'}`,
      `Candidate: ${interview.studentId?.name || '-'}`,
      `Type: ${interview.meetingType}`,
      interview.meetingLink ? `Join: ${interview.meetingLink}` : '',
      interview.notes ? `Notes: ${interview.notes}` : '',
    ]
      .filter(Boolean)
      .join('\\n');

    const locationStr = interview.meetingType === 'video'
      ? interview.meetingLink || 'Online'
      : interview.location || 'TBD';

    const icsContent = generateICS({
      title,
      start: interview.scheduledAt,
      durationMin: interview.duration,
      description,
      location: locationStr,
      organizer: interview.recruiterId?.email,
      attendee: interview.studentId?.email,
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="interview-${interviewId}.ics"`);
    return res.send(icsContent);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate calendar file' });
  }
});

// ── Get recruiter's available/busy slots for a given date ──
router.get('/slots/:recruiterId', async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!mongoose.Types.ObjectId.isValid(recruiterId)) {
      return res.status(400).json({ message: 'Invalid recruiterId' });
    }

    if (!date) {
      return res.status(400).json({ message: 'date query param is required (YYYY-MM-DD)' });
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    if (Number.isNaN(dayStart.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const busyInterviews = await Interview.find({
      recruiterId,
      status: 'scheduled',
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
    })
      .select('scheduledAt duration')
      .sort({ scheduledAt: 1 })
      .lean();

    // Generate available 30-min slots between 9 AM and 6 PM
    const slots = [];
    const slotDuration = 30; // minutes
    for (let hour = 9; hour < 18; hour++) {
      for (let min = 0; min < 60; min += slotDuration) {
        const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.000Z`);
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);

        const isBusy = busyInterviews.some((iv) => {
          const ivStart = new Date(iv.scheduledAt);
          const ivEnd = new Date(ivStart.getTime() + (iv.duration || 30) * 60 * 1000);
          return slotStart < ivEnd && slotEnd > ivStart;
        });

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: !isBusy,
        });
      }
    }

    return res.json({ date, slots });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch slots' });
  }
});

module.exports = router;
