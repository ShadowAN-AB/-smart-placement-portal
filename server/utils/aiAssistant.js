// Configured via OLLAMA_URL and OLLAMA_MODEL env vars
const getOllamaConfig = () => ({
  url: process.env.OLLAMA_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'qwen2.5-coder',
});

const SYSTEM_PROMPT = `You are a placement advisor for a college placement portal.
Answer ONLY using the context provided below.
If the answer cannot be found in the context, reply: "I don't have enough information to answer this based on your resume and available jobs."
Do NOT use any knowledge outside the provided context.
Keep answers concise, actionable, and helpful.
Format your response in plain text with bullet points where appropriate.`;

/**
 * Ask a context-only question about the student's resume and job matches.
 *
 * @param {Object} options
 * @param {string} options.question - The student's question
 * @param {Object} options.extractedData - AI-extracted resume data
 * @param {Array} options.topJobs - Top matching jobs with scores
 * @param {Object} options.studentProfile - Student profile
 * @returns {Promise<Object>} Answer with confidence metadata
 */
const askAssistant = async ({ question, extractedData, topJobs, studentProfile }) => {
  const contextPrompt = buildContextPrompt({
    extractedData,
    topJobs,
    studentProfile,
  });

  try {
    const { url, model } = getOllamaConfig();
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${contextPrompt}\n\nQUESTION: ${question}`,
        system: SYSTEM_PROMPT,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    const answer = (data.response || '').trim();

    if (!answer) {
      return {
        answer: "I wasn't able to generate a response. Please try rephrasing your question.",
        fromContext: false,
        confidence: 'low',
      };
    }

    // Detect if the model admitted it can't answer
    const cantAnswerPhrases = [
      "don't have enough information",
      'cannot be found',
      'not available in the context',
      'no information',
    ];
    const isLowConfidence = cantAnswerPhrases.some((phrase) =>
      answer.toLowerCase().includes(phrase)
    );

    return {
      answer,
      fromContext: !isLowConfidence,
      confidence: isLowConfidence ? 'low' : 'high',
    };
  } catch (error) {
    console.error('AI Assistant error:', error.message);
    return {
      answer:
        'The AI assistant is currently unavailable. Please ensure Ollama is running on your machine.',
      fromContext: false,
      confidence: 'none',
      error: error.message,
    };
  }
};

/**
 * Build the context injection block for the prompt.
 */
const buildContextPrompt = ({ extractedData, topJobs, studentProfile }) => {
  const lines = [];

  lines.push('=== STUDENT RESUME DATA ===');
  lines.push(`Skills: ${(extractedData?.skills || []).join(', ') || 'None listed'}`);

  if (extractedData?.education?.length) {
    lines.push('Education:');
    extractedData.education.forEach((e) => {
      lines.push(`  - ${e.degree} in ${e.field || 'N/A'} from ${e.institution || 'N/A'} (${e.year || 'N/A'})`);
    });
  }

  if (extractedData?.experience?.length) {
    lines.push('Experience:');
    extractedData.experience.forEach((e) => {
      lines.push(`  - ${e.title} at ${e.company} (${e.durationMonths} months): ${e.description || ''}`);
    });
  }

  if (extractedData?.projects?.length) {
    lines.push('Projects:');
    extractedData.projects.forEach((p) => {
      lines.push(`  - ${p.name} [${(p.techStack || []).join(', ')}]: ${p.description || ''}`);
    });
  }

  if (extractedData?.certifications?.length) {
    lines.push(`Certifications: ${extractedData.certifications.join(', ')}`);
  }

  lines.push(`Total Experience: ${extractedData?.totalExperienceMonths || 0} months`);
  lines.push(`Expected Salary: INR ${(studentProfile?.expectedSalary || 0).toLocaleString('en-IN')}`);
  lines.push('');

  lines.push('=== RELEVANT JOBS ===');
  if (topJobs?.length) {
    topJobs.slice(0, 10).forEach((j, i) => {
      lines.push(`${i + 1}. ${j.jobTitle || 'Untitled'} at ${j.company || 'Unknown'}`);
      lines.push(`   Match Score: ${j.score}%`);
      lines.push(`   Matched Skills: ${(j.matchedSkills || []).join(', ') || 'None'}`);
      lines.push(`   Missing Skills: ${(j.missingSkills || []).join(', ') || 'None'}`);
      if (j.explanation) lines.push(`   Note: ${j.explanation}`);
    });
  } else {
    lines.push('No job matches available yet.');
  }

  lines.push('');
  lines.push('=== SCORING RUBRIC ===');
  lines.push('Skills Match: 55% weight — intersection of resume skills vs job required skills');
  lines.push('Experience Fit: 20% weight — resume total months vs job minimum experience');
  lines.push('Salary Fit: 10% weight — expected salary vs job salary band');
  lines.push('Education Fit: 10% weight — degree level and field relevance');
  lines.push('Project Relevance: 5% weight — tech stack overlap between student projects and job');

  return lines.join('\n');
};

module.exports = { askAssistant };
