const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const PasswordResetToken = require('../models/PasswordResetToken');
const { authMiddleware } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const { passwordReset: passwordResetTemplate } = require('../utils/emailTemplates');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const adminSignupCode = process.env.ADMIN_SIGNUP_CODE || 'placement_admin_2026';

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset requests. Try again later.' },
});

// Slow down credential stuffing. Per-IP because tokens are stateless.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate-limiting in test env so the auth suite isn't flaky when it
  // creates many users. Production still enforces.
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateToken = (userId) => {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
};

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, adminCode } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['student', 'recruiter', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be student, recruiter or admin' });
    }

    if (role === 'admin' && adminCode !== adminSignupCode) {
      return res.status(403).json({ message: 'Invalid admin signup code' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    });

    const token = generateToken(user._id.toString());

    return res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during signup' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Persist successful login metadata for audit visibility.
    await LoginEvent.create({
      userId: user._id,
      email: user.email,
      ipAddress: req.ip || '',
      userAgent: String(req.headers['user-agent'] || ''),
      loggedInAt: new Date(),
    });

    const token = generateToken(user._id.toString());

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  return res.json({ user: req.user });
});

// ── Forgot password: always 200 to avoid leaking account existence ──
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      await PasswordResetToken.create({
        userId: user._id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

      const template = passwordResetTemplate({ name: user.name, resetUrl });
      sendMail({ to: user.email, ...template }).catch((error) => {
        console.error('[auth] password reset email failed:', error.message);
      });
    }

    return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to process request' });
  }
});

// ── Reset password using a valid token ──
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'token and newPassword are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const record = await PasswordResetToken.findOne({ tokenHash: hashToken(String(token)) });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    record.usedAt = new Date();
    await record.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

module.exports = router;
