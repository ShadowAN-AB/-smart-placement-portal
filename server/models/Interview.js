const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // minutes
      default: 30,
      min: 15,
      max: 180,
    },
    meetingType: {
      type: String,
      enum: ['video', 'in-person', 'phone'],
      default: 'video',
    },
    meetingLink: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    cancelReason: {
      type: String,
      trim: true,
      default: '',
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
  },
  { timestamps: true }
);

interviewSchema.index({ studentId: 1, scheduledAt: 1 });
interviewSchema.index({ recruiterId: 1, scheduledAt: 1 });
interviewSchema.index({ applicationId: 1 }, { unique: true });

module.exports = mongoose.model('Interview', interviewSchema);
