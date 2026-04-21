const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware, requireRole } = require('../middleware/auth');
const ResumeUpload = require('../models/ResumeUpload');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const StudentProfile = require('../models/StudentProfile');
const Job = require('../models/Job');
const { extractText } = require('../utils/resumeParser');
const { extractWithAI, checkOllamaHealth } = require('../utils/aiExtractor');
const { computeCompanyScores, computeJobScores } = require('../utils/companyScorer');
const { askAssistant } = require('../utils/aiAssistant');

const router = express.Router();

// ── Multer setup ──
const uploadsDir = process.env.VERCEL
  ? '/tmp'
  : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and DOCX files are accepted'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// All AI routes require student auth
router.use(authMiddleware, requireRole('student'));

// ── Health check for Ollama ──
router.get('/health', async (_req, res) => {
  const health = await checkOllamaHealth();
  res.json(health);
});

// ── Upload resume ──
router.post('/resume/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const resumeUpload = await ResumeUpload.create({
      userId: req.user._id,
      originalFilename: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'uploaded',
    });

    res.status(201).json({
      message: 'Resume uploaded successfully',
      resume: {
        id: resumeUpload._id,
        filename: resumeUpload.originalFilename,
        version: resumeUpload.version,
        status: resumeUpload.status,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

// ── Analyze resume (extract + score) ──
router.post('/resume/analyze', async (req, res) => {
  try {
    const { resumeId } = req.body;

    // Find the latest resume or use specified ID
    let resumeUpload;
    if (resumeId) {
      resumeUpload = await ResumeUpload.findOne({
        _id: resumeId,
        userId: req.user._id,
      });
    } else {
      resumeUpload = await ResumeUpload.findOne({ userId: req.user._id })
        .sort({ createdAt: -1 });
    }

    if (!resumeUpload) {
      return res.status(404).json({ message: 'No resume found. Please upload one first.' });
    }

    // Step 1: Extract text
    resumeUpload.status = 'parsing';
    await resumeUpload.save();

    let extractedText;
    try {
      extractedText = await extractText(resumeUpload.filePath, resumeUpload.mimeType);
      resumeUpload.extractedText = extractedText;
      resumeUpload.status = 'extracted';
      await resumeUpload.save();
    } catch (parseError) {
      resumeUpload.status = 'failed';
      resumeUpload.errorMessage = parseError.message;
      await resumeUpload.save();
      return res.status(422).json({ message: `Failed to parse resume: ${parseError.message}` });
    }

    // Step 2: AI extraction
    const extractedData = await extractWithAI(extractedText);

    // Step 3: Fetch active jobs and compute scores
    const jobs = await Job.find({ status: 'active', approved: true });
    const studentProfile = await StudentProfile.findOne({ userId: req.user._id });

    const companyFitScores = computeCompanyScores(extractedData, studentProfile, jobs);
    const jobFitScores = computeJobScores(extractedData, studentProfile, jobs);

    // Step 4: Save analysis
    const analysis = await ResumeAnalysis.findOneAndUpdate(
      { userId: req.user._id, resumeId: resumeUpload._id },
      {
        extractedData,
        companyFitScores,
        jobFitScores: jobFitScores.map((j) => ({
          jobId: j.jobId,
          score: j.score,
          factors: j.factors,
          matchedSkills: j.matchedSkills,
          missingSkills: j.missingSkills,
          explanation: j.explanation,
        })),
        analyzedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Step 5: Update student profile with extracted data
    await StudentProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          education: extractedData.education,
          projects: extractedData.projects,
          certifications: extractedData.certifications,
          lastAnalyzedAt: new Date(),
        },
        $addToSet: {
          skills: { $each: extractedData.skills },
        },
      },
      { upsert: true }
    );

    resumeUpload.status = 'analyzed';
    await resumeUpload.save();

    res.json({
      message: 'Resume analyzed successfully',
      analysis: {
        id: analysis._id,
        extractedData: analysis.extractedData,
        companyFitScores: analysis.companyFitScores,
        jobFitScores: analysis.jobFitScores.length,
        analyzedAt: analysis.analyzedAt,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: error.message || 'Analysis failed' });
  }
});

// ── Get analysis status ──
router.get('/resume/status', async (req, res) => {
  try {
    const resumeUpload = await ResumeUpload.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('status originalFilename version createdAt errorMessage');

    if (!resumeUpload) {
      return res.json({ status: 'none' });
    }

    res.json({
      status: resumeUpload.status,
      filename: resumeUpload.originalFilename,
      version: resumeUpload.version,
      uploadedAt: resumeUpload.createdAt,
      error: resumeUpload.errorMessage || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get company fit scores ──
router.get('/fit/companies', async (req, res) => {
  try {
    const analysis = await ResumeAnalysis.findOne({ userId: req.user._id })
      .sort({ analyzedAt: -1 });

    if (!analysis) {
      return res.status(404).json({ message: 'No analysis found. Please analyze your resume first.' });
    }

    res.json({
      companyFitScores: analysis.companyFitScores,
      analyzedAt: analysis.analyzedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get job fit scores ──
router.get('/fit/jobs', async (req, res) => {
  try {
    const analysis = await ResumeAnalysis.findOne({ userId: req.user._id })
      .sort({ analyzedAt: -1 })
      .populate('jobFitScores.jobId', 'title company description requiredSkills');

    if (!analysis) {
      return res.status(404).json({ message: 'No analysis found. Please analyze your resume first.' });
    }

    res.json({
      jobFitScores: analysis.jobFitScores,
      extractedData: analysis.extractedData,
      analyzedAt: analysis.analyzedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Context-only Q&A ──
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({ message: 'Please provide a valid question (at least 3 characters).' });
    }

    console.log('[/ask] userId:', req.user._id, 'question:', question.trim().substring(0, 50));

    const analysis = await ResumeAnalysis.findOne({ userId: req.user._id })
      .sort({ analyzedAt: -1 });

    if (!analysis) {
      console.log('[/ask] No analysis found for userId:', req.user._id);
      return res.status(404).json({
        message: 'No analysis found. Please analyze your resume first.',
      });
    }

    console.log('[/ask] Found analysis:', analysis._id, 'analyzedAt:', analysis.analyzedAt);

    const studentProfile = await StudentProfile.findOne({ userId: req.user._id });

    // Get job details for the context
    const topJobIds = analysis.jobFitScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((j) => j.jobId);

    const topJobDocs = await Job.find({ _id: { $in: topJobIds } }).lean();

    // Merge job docs with scores
    const topJobs = analysis.jobFitScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((j) => {
        const jobDoc = topJobDocs.find(
          (d) => d._id.toString() === j.jobId.toString()
        );
        return {
          jobTitle: jobDoc?.title || '',
          company: jobDoc?.company || '',
          score: j.score,
          matchedSkills: j.matchedSkills,
          missingSkills: j.missingSkills,
          explanation: j.explanation,
        };
      });

    const result = await askAssistant({
      question: question.trim(),
      extractedData: analysis.extractedData,
      topJobs,
      studentProfile,
    });

    res.json(result);
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ message: error.message || 'Failed to get an answer' });
  }
});

// ── Upload history ──
router.get('/resume/history', async (req, res) => {
  try {
    const uploads = await ResumeUpload.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('originalFilename version status createdAt');

    res.json({ uploads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
