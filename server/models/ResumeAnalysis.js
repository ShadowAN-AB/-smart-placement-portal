const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, default: '' },
    institution: { type: String, default: '' },
    year: { type: Number, default: 0 },
    field: { type: String, default: '' },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    durationMonths: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    techStack: { type: [String], default: [] },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const factorsSchema = new mongoose.Schema(
  {
    skills: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    salary: { type: Number, default: 0 },
    education: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
  },
  { _id: false }
);

const companyFitSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    score: { type: Number, default: 0 },
    topJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    topJobScore: { type: Number, default: 0 },
    factors: { type: factorsSchema, default: () => ({}) },
  },
  { _id: false }
);

const jobFitSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    score: { type: Number, default: 0 },
    factors: { type: factorsSchema, default: () => ({}) },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const resumeAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResumeUpload',
      required: true,
    },
    extractedData: {
      skills: { type: [String], default: [] },
      education: { type: [educationSchema], default: [] },
      experience: { type: [experienceSchema], default: [] },
      projects: { type: [projectSchema], default: [] },
      certifications: { type: [String], default: [] },
      totalExperienceMonths: { type: Number, default: 0 },
      summary: { type: String, default: '' },
    },
    companyFitScores: { type: [companyFitSchema], default: [] },
    jobFitScores: { type: [jobFitSchema], default: [] },
    analyzedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
