const { calculateMatchScore, calculateEnhancedMatchScore } = require('../utils/matchAlgorithm');

describe('calculateMatchScore', () => {
  it('is 0 when the job requires skills and student has none', () => {
    const result = calculateMatchScore({
      studentProfile: { skills: [], yearsOfExperience: 0 },
      job: { requiredSkills: ['react', 'node'], minExperience: 0, minSalary: 0, maxSalary: 0 },
    });
    // With no skills matched: skills 0 * 0.7 + experience 100 * 0.2 + salary 50 * 0.1 = 25
    expect(result.score).toBe(25);
    expect(result.matchedSkills).toEqual([]);
    expect(result.missingSkills.sort()).toEqual(['node', 'react']);
  });

  it('gives full skill credit when all required skills match', () => {
    const result = calculateMatchScore({
      studentProfile: { skills: ['react', 'node', 'sql'], yearsOfExperience: 2 },
      job: { requiredSkills: ['react', 'node'], minExperience: 1, minSalary: 0, maxSalary: 0 },
    });
    // Skills 100 * 0.7 + experience 100 * 0.2 + salary 50 * 0.1 = 95
    expect(result.score).toBe(95);
    expect(result.matchedSkills.sort()).toEqual(['node', 'react']);
    expect(result.missingSkills).toEqual([]);
  });

  it('is case-insensitive on skill matching', () => {
    const result = calculateMatchScore({
      studentProfile: { skills: ['React'], yearsOfExperience: 0 },
      job: { requiredSkills: ['REACT'], minExperience: 0, minSalary: 0, maxSalary: 0 },
    });
    expect(result.matchedSkills).toEqual(['react']);
  });

  it('caps score at 100', () => {
    const result = calculateMatchScore({
      studentProfile: { skills: ['a', 'b'], yearsOfExperience: 100, expectedSalary: 600000 },
      job: { requiredSkills: ['a', 'b'], minExperience: 0, minSalary: 500000, maxSalary: 700000 },
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('calculateEnhancedMatchScore', () => {
  it('returns a factor breakdown', () => {
    const result = calculateEnhancedMatchScore({
      extractedData: { skills: ['react'], projects: [], education: [], totalExperienceMonths: 12 },
      studentProfile: { skills: [], yearsOfExperience: 0, expectedSalary: 0 },
      job: { requiredSkills: ['react'], minExperience: 0, minSalary: 0, maxSalary: 0 },
    });
    expect(result.factors).toBeDefined();
    expect(result.factors.skills).toBe(100);
  });
});
