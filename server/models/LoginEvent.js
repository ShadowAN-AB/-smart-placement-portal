const mongoose = require('mongoose');

const loginEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    loggedInAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

loginEventSchema.index({ userId: 1, loggedInAt: -1 });

module.exports = mongoose.model('LoginEvent', loginEventSchema);
