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

/**
 * Enhanced scoring with 5 factors — used by AI resume analysis.
 * Compatible with AI-extracted data (education, projects, etc.)
 *
 * Weights: Skills 55%, Experience 20%, Salary 10%, Education 10%, Projects 5%
 */
const calculateEnhancedMatchScore = ({ extractedData, studentProfile, job }) => {
  // ── Skills (55%) ──
  const studentSkills = toLowerSet([
    ...(extractedData?.skills || []),
    ...(studentProfile?.skills || []),
  ]);
  const requiredSkills = [...toLowerSet(job?.requiredSkills || [])];

  const matchedSkills = requiredSkills.filter((skill) => studentSkills.has(skill));
  const missingSkills = requiredSkills.filter((skill) => !studentSkills.has(skill));
  const skillScore = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 100 : 0;

  // ── Experience (20%) ──
  const totalExpMonths = toNonNegativeNumber(extractedData?.totalExperienceMonths || 0);
  const studentExpYears = toNonNegativeNumber(studentProfile?.yearsOfExperience || 0);
  const effectiveExpMonths = Math.max(totalExpMonths, studentExpYears * 12);
  const jobMinExpMonths = toNonNegativeNumber(job?.minExperience || 0) * 12;
  const experienceScore =
    jobMinExpMonths === 0 || effectiveExpMonths >= jobMinExpMonths
      ? 100
      : Math.max(0, (effectiveExpMonths / jobMinExpMonths) * 100);

  // ── Salary (10%) ──
  const expectedSalary = toNonNegativeNumber(studentProfile?.expectedSalary || 0);
  const minSalary = toNonNegativeNumber(job?.minSalary || 0);
  const maxSalary = toNonNegativeNumber(job?.maxSalary || 0);
  const isValidSalaryBand = minSalary > 0 && maxSalary > 0 && maxSalary >= minSalary;

  let salaryScore = 50;
  if (expectedSalary > 0 && isValidSalaryBand) {
    if (expectedSalary >= minSalary && expectedSalary <= maxSalary) {
      salaryScore = 100;
    } else {
      const nearest = expectedSalary < minSalary ? minSalary : maxSalary;
      salaryScore = Math.max(0, 100 - (Math.abs(expectedSalary - nearest) / nearest) * 100);
    }
  }

  // ── Education (10%) ──
  let educationScore = 50; // neutral default
  const education = extractedData?.education || [];
  if (education.length > 0) {
    const degreeWeights = {
      phd: 100, 'ph.d': 100, doctorate: 100,
      mtech: 90, 'ms': 90, master: 90, mba: 85, msc: 85, 'me': 90, mca: 85, 'mcom': 80,
      btech: 75, 'bs': 75, bachelor: 75, bsc: 70, be: 75, bca: 70, bba: 65, 'bcom': 65,
      diploma: 50, associate: 45,
    };

    let bestDegreeScore = 0;
    for (const edu of education) {
      const degreeLower = (edu.degree || '').toLowerCase().replace(/[.\s]/g, '');
      for (const [key, weight] of Object.entries(degreeWeights)) {
        if (degreeLower.includes(key)) {
          bestDegreeScore = Math.max(bestDegreeScore, weight);
          break;
        }
      }
    }
    if (bestDegreeScore > 0) educationScore = bestDegreeScore;
  }

  // ── Projects (5%) ──
  let projectScore = 0;
  const projects = extractedData?.projects || [];
  if (projects.length > 0 && requiredSkills.length > 0) {
    const projectTech = toLowerSet(projects.flatMap((p) => p.techStack || []));
    const overlapCount = requiredSkills.filter((skill) => projectTech.has(skill)).length;
    projectScore = (overlapCount / requiredSkills.length) * 100;
  }

  // ── Weighted total ──
  const weightedScore =
    skillScore * 0.55 +
    experienceScore * 0.20 +
    salaryScore * 0.10 +
    educationScore * 0.10 +
    projectScore * 0.05;

  const score = Math.max(0, Math.min(100, round(weightedScore)));

  const explanation =
    `${matchedSkills.length} of ${requiredSkills.length} required skills matched. ` +
    `Experience: ${round(effectiveExpMonths / 12)} yrs. ` +
    `Education score: ${round(educationScore)}%. ` +
    `Project tech overlap: ${round(projectScore)}%.`;

  return {
    score,
    matchedSkills,
    missingSkills,
    explanation,
    factors: {
      skills: round(skillScore),
      experience: round(experienceScore),
      salary: round(salaryScore),
      education: round(educationScore),
      projects: round(projectScore),
    },
  };
};

module.exports = { calculateMatchScore, calculateEnhancedMatchScore };
