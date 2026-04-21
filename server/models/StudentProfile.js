const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    resumeUrl: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    expectedSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    prefJobTitles: {
      type: [String],
      default: [],
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: 0,
    },
    education: [
      {
        degree: { type: String, default: '' },
        institution: { type: String, default: '' },
        year: { type: Number, default: 0 },
        field: { type: String, default: '' },
      },
    ],
    projects: [
      {
        name: { type: String, default: '' },
        techStack: { type: [String], default: [] },
        description: { type: String, default: '' },
      },
    ],
    certifications: {
      type: [String],
      default: [],
    },
    lastAnalyzedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
