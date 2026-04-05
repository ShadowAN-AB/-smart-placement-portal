const mongoose = require('mongoose');

const matchScoreSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

matchScoreSchema.index({ studentId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('MatchScore', matchScoreSchema);
