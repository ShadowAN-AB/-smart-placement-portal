const { calculateEnhancedMatchScore } = require('./matchAlgorithm');

/**
 * Score a student's fit against all companies by evaluating their jobs.
 * Company score = max of its individual jobs' scores (best-fit view).
 *
 * @param {Object} extractedData - AI-extracted resume data
 * @param {Object} studentProfile - Student profile with salary expectations
 * @param {Array} jobs - Array of active Job documents
 * @returns {Array} Sorted array of company scores with factor breakdowns
 */
const computeCompanyScores = (extractedData, studentProfile, jobs) => {
  // Group jobs by company
  const companyJobsMap = new Map();
  for (const job of jobs) {
    const company = (job.company || '').trim();
    if (!company) continue;

    if (!companyJobsMap.has(company)) {
      companyJobsMap.set(company, []);
    }
    companyJobsMap.get(company).push(job);
  }

  const companyScores = [];

  for (const [company, companyJobs] of companyJobsMap) {
    let bestJob = null;
    let bestScore = -1;
    let bestResult = null;

    for (const job of companyJobs) {
      const result = calculateEnhancedMatchScore({
        extractedData,
        studentProfile,
        job,
      });

      if (result.score > bestScore) {
        bestScore = result.score;
        bestJob = job;
        bestResult = result;
      }
    }

    if (bestJob && bestResult) {
      companyScores.push({
        company,
        score: bestResult.score,
        topJobId: bestJob._id,
        topJobScore: bestResult.score,
        factors: bestResult.factors,
        jobCount: companyJobs.length,
      });
    }
  }

  // Sort by score descending
  companyScores.sort((a, b) => b.score - a.score);
  return companyScores;
};

/**
 * Score a student's fit against all individual jobs.
 *
 * @param {Object} extractedData - AI-extracted resume data
 * @param {Object} studentProfile - Student profile with salary expectations
 * @param {Array} jobs - Array of active Job documents
 * @returns {Array} Sorted array of per-job scores with detailed breakdowns
 */
const computeJobScores = (extractedData, studentProfile, jobs) => {
  const jobScores = [];

  for (const job of jobs) {
    const result = calculateEnhancedMatchScore({
      extractedData,
      studentProfile,
      job,
    });

    jobScores.push({
      jobId: job._id,
      jobTitle: job.title,
      company: job.company,
      score: result.score,
      factors: result.factors,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      explanation: result.explanation,
    });
  }

  // Sort by score descending
  jobScores.sort((a, b) => b.score - a.score);
  return jobScores;
};

module.exports = { computeCompanyScores, computeJobScores };
