const mongoose = require('mongoose');

const resumeUploadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },
    extractedText: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['uploaded', 'parsing', 'extracted', 'analyzed', 'failed'],
      default: 'uploaded',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Auto-increment version per user
resumeUploadSchema.pre('save', async function () {
  if (this.isNew) {
    const lastUpload = await this.constructor
      .findOne({ userId: this.userId })
      .sort({ version: -1 })
      .select('version');
    this.version = lastUpload ? lastUpload.version + 1 : 1;
  }
});

module.exports = mongoose.model('ResumeUpload', resumeUploadSchema);
