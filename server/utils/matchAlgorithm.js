const toLowerSet = (arr) => new Set((arr || []).map((item) => String(item).trim().toLowerCase()).filter(Boolean));

const round = (value) => Math.round(value * 100) / 100;
const toNonNegativeNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

const calculateMatchScore = ({ studentProfile, job }) => {
  const studentSkills = toLowerSet(studentProfile?.skills || []);
  const requiredSkills = [...toLowerSet(job?.requiredSkills || [])];

  const matchedSkills = requiredSkills.filter((skill) => studentSkills.has(skill));
  const missingSkills = requiredSkills.filter((skill) => !studentSkills.has(skill));

  const skillScore = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 100 : 0;

  const studentExp = toNonNegativeNumber(studentProfile?.yearsOfExperience || 0);
  const jobMinExp = toNonNegativeNumber(job?.minExperience || 0);
  const experienceScore = jobMinExp === 0 || studentExp >= jobMinExp ? 100 : Math.max(0, (studentExp / jobMinExp) * 100);

  const expectedSalary = toNonNegativeNumber(studentProfile?.expectedSalary || 0);
  const minSalary = toNonNegativeNumber(job?.minSalary || 0);
  const maxSalary = toNonNegativeNumber(job?.maxSalary || 0);
  const isValidSalaryBand = minSalary > 0 && maxSalary > 0 && maxSalary >= minSalary;

  // Use neutral score when salary data is missing/invalid so neither side gains unfair advantage.
  let salaryScore = 50;
  if (expectedSalary > 0 && isValidSalaryBand) {
    if (expectedSalary >= minSalary && expectedSalary <= maxSalary) {
      salaryScore = 100;
    } else {
      const nearest = expectedSalary < minSalary ? minSalary : maxSalary;
      salaryScore = Math.max(0, 100 - (Math.abs(expectedSalary - nearest) / nearest) * 100);
    }
  }

  const weightedScore = skillScore * 0.7 + experienceScore * 0.2 + salaryScore * 0.1;
  const score = Math.max(0, Math.min(100, round(weightedScore)));

  const explanation = `${matchedSkills.length} of ${requiredSkills.length} required skills matched`;

  return {
    score,
    matchedSkills,
    missingSkills,
    explanation,
  };
};

module.exports = { calculateMatchScore };
