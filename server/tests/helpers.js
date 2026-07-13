const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Job = require('../models/Job');

const createUser = async ({ role = 'student', email, name, password = 'Password@123' } = {}) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const finalEmail = email || `${role}-${suffix}@test.local`;
  const finalName = name || `Test ${role} ${suffix}`;
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for test speed
  const user = await User.create({ name: finalName, email: finalEmail, passwordHash, role });
  return user;
};

const tokenFor = (userId) =>
  jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET || 'test_jwt_secret', { expiresIn: '7d' });

const authHeader = (userId) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

const createStudentProfile = (userId, overrides = {}) =>
  StudentProfile.create({
    userId,
    skills: ['react', 'javascript'],
    yearsOfExperience: 1,
    expectedSalary: 600000,
    ...overrides,
  });

const createJob = (recruiterId, overrides = {}) =>
  Job.create({
    title: 'Test Role',
    company: 'TestCo',
    description: 'Test description',
    requiredSkills: ['react', 'javascript'],
    minExperience: 0,
    minSalary: 500000,
    maxSalary: 900000,
    status: 'active',
    approved: true,
    postedBy: recruiterId,
    ...overrides,
  });

module.exports = { createUser, tokenFor, authHeader, createStudentProfile, createJob };
