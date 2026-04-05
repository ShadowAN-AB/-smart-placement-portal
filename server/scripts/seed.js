const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const MatchScore = require('../models/MatchScore');
const { calculateMatchScore } = require('../utils/matchAlgorithm');

dotenv.config();

const run = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    StudentProfile.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
    MatchScore.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Password@123', 10);

  const [studentA, studentB, recruiter, admin] = await User.create([
    { name: 'Ananya Student', email: 'student1@spp.dev', passwordHash, role: 'student' },
    { name: 'Rahul Student', email: 'student2@spp.dev', passwordHash, role: 'student' },
    { name: 'Priya Recruiter', email: 'recruiter@spp.dev', passwordHash, role: 'recruiter' },
    { name: 'Placement Admin', email: 'admin@spp.dev', passwordHash, role: 'admin' },
  ]);

  const [profileA, profileB] = await StudentProfile.create([
    {
      userId: studentA._id,
      skills: ['python', 'react', 'sql', 'nodejs'],
      bio: 'Full-stack student interested in platform engineering',
      yearsOfExperience: 1,
      expectedSalary: 700000,
      prefJobTitles: ['software engineer', 'frontend developer'],
    },
    {
      userId: studentB._id,
      skills: ['java', 'spring', 'mysql', 'docker'],
      bio: 'Backend focused student with Java stack experience',
      yearsOfExperience: 2,
      expectedSalary: 900000,
      prefJobTitles: ['backend engineer'],
    },
  ]);

  const jobs = await Job.create([
    {
      title: 'Frontend Engineer Intern',
      company: 'Nexus Labs',
      description: 'Build dashboard UI modules and optimize React performance.',
      requiredSkills: ['react', 'javascript', 'css', 'api integration'],
      minExperience: 0,
      minSalary: 400000,
      maxSalary: 700000,
      status: 'active',
      approved: true,
      postedBy: recruiter._id,
    },
    {
      title: 'Backend Engineer',
      company: 'CloudAxis',
      description: 'Develop microservices and maintain high throughput APIs.',
      requiredSkills: ['java', 'spring', 'mysql', 'docker'],
      minExperience: 1,
      minSalary: 900000,
      maxSalary: 1400000,
      status: 'active',
      approved: true,
      postedBy: recruiter._id,
    },
    {
      title: 'Data Analyst Trainee',
      company: 'Insight Grid',
      description: 'Work on BI dashboards and SQL data pipelines.',
      requiredSkills: ['sql', 'python', 'excel', 'powerbi'],
      minExperience: 0,
      minSalary: 500000,
      maxSalary: 800000,
      status: 'active',
      approved: false,
      postedBy: recruiter._id,
    },
  ]);

  const matchA = calculateMatchScore({ studentProfile: profileA, job: jobs[0] });
  const matchB = calculateMatchScore({ studentProfile: profileB, job: jobs[1] });

  const [appA, appB] = await Application.create([
    {
      studentId: studentA._id,
      jobId: jobs[0]._id,
      status: 'shortlisted',
      matchScore: matchA.score,
    },
    {
      studentId: studentB._id,
      jobId: jobs[1]._id,
      status: 'interview',
      matchScore: matchB.score,
    },
  ]);

  await MatchScore.create([
    {
      studentId: appA.studentId,
      jobId: appA.jobId,
      score: matchA.score,
      matchedSkills: matchA.matchedSkills,
      missingSkills: matchA.missingSkills,
      explanation: matchA.explanation,
    },
    {
      studentId: appB.studentId,
      jobId: appB.jobId,
      score: matchB.score,
      matchedSkills: matchB.matchedSkills,
      missingSkills: matchB.missingSkills,
      explanation: matchB.explanation,
    },
  ]);

  console.log('Seed complete');
  console.log('Student login: student1@spp.dev / Password@123');
  console.log('Recruiter login: recruiter@spp.dev / Password@123');
  console.log('Admin login: admin@spp.dev / Password@123');

  process.exit(0);
};

run().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
