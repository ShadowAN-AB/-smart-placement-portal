const mongoose = require('mongoose');

const adminAnalyticsSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    totalRecruiters: {
      type: Number,
      default: 0,
    },
    placementRate: {
      type: Number,
      default: 0,
    },
    avgPackage: {
      type: Number,
      default: 0,
    },
    topCompanies: {
      type: [String],
      default: [],
    },
    totalJobs: {
      type: Number,
      default: 0,
    },
    totalApplications: {
      type: Number,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminAnalytics', adminAnalyticsSchema);
