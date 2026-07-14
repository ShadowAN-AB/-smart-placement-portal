const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { authMiddleware, requireRole } = require('../middleware/auth');
const ResumeUpload = require('../models/ResumeUpload');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const StudentProfile = require('../models/StudentProfile');
const Job = require('../models/Job');
const ChatMessage = require('../models/ChatMessage');
const { extractText } = require('../utils/resumeParser');
const { extractWithAI, checkOllamaHealth } = require('../utils/aiExtractor');
const { computeCompanyScores, computeJobScores } = require('../utils/companyScorer');
const { askAssistant } = require('../utils/aiAssistant');
const { notify } = require('../utils/notifier');
const { getBackend } = require('../utils/storage');

const router = express.Router();

// ── Multer: buffer files in memory. Storage backend takes it from here. ──
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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// ── Health check for the LLM provider (public — no auth) ──
// Intentionally declared BEFORE the auth guard below. Callers only see
// {healthy, provider, model, modelLoaded} — no user data, no cost on
// Anthropic (which returns healthy from key presence alone, no API call).
router.get('/health', async (_req, res) => {
  const health = await checkOllamaHealth();
  res.json(health);
});

// All remaining AI routes require student auth
router.use(authMiddleware, requireRole('student'));

// ── Upload resume ──
// The buffer is handed straight to the storage backend (disk locally,
// S3/R2 in production). ResumeUpload.filePath stores the storage KEY,
// not a filesystem path — analyze route resolves it via getBackend().
router.post('/resume/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname);
    const key = `${req.user._id}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

    const backend = getBackend();
    await backend.put(key, req.file.buffer, req.file.mimetype);

    const resumeUpload = await ResumeUpload.create({
      userId: req.user._id,
      originalFilename: req.file.originalname,
      filePath: key,
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
      const buffer = await getBackend().getBuffer(resumeUpload.filePath);
      extractedText = await extractText(buffer, resumeUpload.mimeType);
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

    notify(req.user._id, {
      type: 'resume_analyzed',
      title: 'Resume analysis complete',
      body: `We scored ${jobFitScores.length} job(s) against your resume. Open Resume Intelligence to see your top matches.`,
      link: '/resume-intelligence',
      meta: { resumeId: resumeUpload._id, jobsScored: jobFitScores.length },
    }).catch(() => {});

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

    try {
      await ChatMessage.insertMany([
        { userId: req.user._id, role: 'user', text: question.trim() },
        {
          userId: req.user._id,
          role: 'assistant',
          text: result.answer,
          fromContext: result.fromContext ?? null,
          confidence: result.confidence ?? null,
        },
      ]);
    } catch (persistError) {
      console.error('Chat persist failed:', persistError.message);
    }

    res.json(result);
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ message: error.message || 'Failed to get an answer' });
  }
});

// ── Fetch chat history ──
router.get('/chat', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const messages = await ChatMessage.find({ userId: req.user._id })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch chat history' });
  }
});

// ── Clear chat history ──
router.delete('/chat', async (req, res) => {
  try {
    const result = await ChatMessage.deleteMany({ userId: req.user._id });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to clear chat history' });
  }
});

// ── Version list with score summaries for compare picker ──
router.get('/resume/versions', async (req, res) => {
  try {
    const uploads = await ResumeUpload.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('originalFilename version createdAt status')
      .lean();

    if (uploads.length === 0) {
      return res.json({ versions: [] });
    }

    const analyses = await ResumeAnalysis.find({
      userId: req.user._id,
      resumeId: { $in: uploads.map((u) => u._id) },
    })
      .select('resumeId jobFitScores analyzedAt')
      .lean();

    const analysisByResume = new Map(analyses.map((a) => [a.resumeId.toString(), a]));

    const versions = uploads.map((u) => {
      const analysis = analysisByResume.get(u._id.toString());
      const scores = (analysis?.jobFitScores || []).map((j) => j.score || 0);
      const topScore = scores.length > 0 ? Math.max(...scores) : 0;
      const avgScore = scores.length > 0 ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100 : 0;

      return {
        resumeId: u._id,
        version: u.version,
        filename: u.originalFilename,
        uploadedAt: u.createdAt,
        status: u.status,
        analyzedAt: analysis?.analyzedAt || null,
        topScore,
        avgScore,
        jobsScored: scores.length,
      };
    });

    return res.json({ versions });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch versions' });
  }
});

// ── Compare two resume analyses ──
router.get('/resume/compare', async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a || !b) {
      return res.status(400).json({ message: 'Both a and b query params are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(a) || !mongoose.Types.ObjectId.isValid(b)) {
      return res.status(400).json({ message: 'Invalid resume id' });
    }

    const [analysisA, analysisB] = await Promise.all([
      ResumeAnalysis.findOne({ userId: req.user._id, resumeId: a }).lean(),
      ResumeAnalysis.findOne({ userId: req.user._id, resumeId: b }).lean(),
    ]);

    if (!analysisA || !analysisB) {
      return res.status(404).json({ message: 'One or both analyses not found for this user' });
    }

    const skillsA = new Set((analysisA.extractedData?.skills || []).map((s) => String(s).toLowerCase()));
    const skillsB = new Set((analysisB.extractedData?.skills || []).map((s) => String(s).toLowerCase()));
    const skillsAdded = [...skillsB].filter((s) => !skillsA.has(s));
    const skillsRemoved = [...skillsA].filter((s) => !skillsB.has(s));

    const jobsAMap = new Map(
      (analysisA.jobFitScores || []).map((j) => [j.jobId.toString(), j])
    );
    const jobsBMap = new Map(
      (analysisB.jobFitScores || []).map((j) => [j.jobId.toString(), j])
    );

    const allJobIds = new Set([...jobsAMap.keys(), ...jobsBMap.keys()]);
    const jobIdsList = [...allJobIds].map((id) => new mongoose.Types.ObjectId(id));
    const jobs = await Job.find({ _id: { $in: jobIdsList } }).select('title company').lean();
    const jobsMeta = new Map(jobs.map((j) => [j._id.toString(), j]));

    const jobScoreDeltas = [...allJobIds]
      .map((id) => {
        const before = jobsAMap.get(id)?.score ?? null;
        const after = jobsBMap.get(id)?.score ?? null;
        const meta = jobsMeta.get(id) || {};
        return {
          jobId: id,
          title: meta.title || '',
          company: meta.company || '',
          before,
          after,
          delta: before !== null && after !== null ? Math.round((after - before) * 100) / 100 : null,
        };
      })
      .sort((x, y) => (Math.abs(y.delta ?? -Infinity) - Math.abs(x.delta ?? -Infinity)));

    return res.json({
      a: {
        resumeId: a,
        extractedData: analysisA.extractedData,
        analyzedAt: analysisA.analyzedAt,
      },
      b: {
        resumeId: b,
        extractedData: analysisB.extractedData,
        analyzedAt: analysisB.analyzedAt,
      },
      diff: {
        skillsAdded,
        skillsRemoved,
        jobScoreDeltas,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to compare' });
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
