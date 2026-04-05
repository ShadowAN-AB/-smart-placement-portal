const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const adminSignupCode = process.env.ADMIN_SIGNUP_CODE || 'placement_admin_2026';

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

router.post('/login', async (req, res) => {
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

module.exports = router;
