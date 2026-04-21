const getOllamaConfig = () => ({
  url: process.env.OLLAMA_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'qwen2.5-coder',
});

const SYSTEM_PROMPT = `You are a resume parser. Extract structured data ONLY from the provided text.
Do not infer, assume, or add any information not explicitly stated.
Return ONLY a valid JSON object with these exact keys:
{
  "skills": ["string array of technical and soft skills found"],
  "education": [{"degree": "string", "institution": "string", "year": number, "field": "string"}],
  "experience": [{"title": "string", "company": "string", "durationMonths": number, "description": "string"}],
  "projects": [{"name": "string", "techStack": ["string"], "description": "string"}],
  "certifications": ["string array of certifications found"],
  "totalExperienceMonths": number,
  "summary": "one-line professional summary"
}
If a field is not found in the text, return an empty array or 0. Return ONLY the JSON, no markdown formatting.`;

/**
 * Extract structured resume data via local Ollama LLM.
 * Falls back to regex-based extraction if the LLM output is malformed.
 */
const extractWithAI = async (resumeText) => {
  try {
    const { url, model } = getOllamaConfig();
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `Parse the following resume and extract structured data:\n\n---\n${resumeText}\n---`,
        system: SYSTEM_PROMPT,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    const rawOutput = data.response || '';

    // Try to extract JSON from the response
    const parsed = parseJSONResponse(rawOutput);
    if (parsed) {
      return normalizeExtractedData(parsed);
    }

    console.warn('AI extraction returned malformed JSON, falling back to regex');
    return regexFallback(resumeText);
  } catch (error) {
    console.error('AI extraction failed:', error.message);
    return regexFallback(resumeText);
  }
};

/**
 * Try to parse JSON from LLM output (handles markdown code fences).
 */
const parseJSONResponse = (text) => {
  // Remove markdown code fences if present
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try to find and parse the JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
};

/**
 * Normalize and validate extracted data to match our expected schema.
 */
const normalizeExtractedData = (data) => {
  return {
    skills: Array.isArray(data.skills)
      ? data.skills.map((s) => String(s).trim()).filter(Boolean)
      : [],
    education: Array.isArray(data.education)
      ? data.education.map((e) => ({
          degree: String(e.degree || '').trim(),
          institution: String(e.institution || '').trim(),
          year: parseInt(e.year, 10) || 0,
          field: String(e.field || '').trim(),
        }))
      : [],
    experience: Array.isArray(data.experience)
      ? data.experience.map((e) => ({
          title: String(e.title || '').trim(),
          company: String(e.company || '').trim(),
          durationMonths: parseInt(e.durationMonths, 10) || 0,
          description: String(e.description || '').trim(),
        }))
      : [],
    projects: Array.isArray(data.projects)
      ? data.projects.map((p) => ({
          name: String(p.name || '').trim(),
          techStack: Array.isArray(p.techStack)
            ? p.techStack.map((t) => String(t).trim()).filter(Boolean)
            : [],
          description: String(p.description || '').trim(),
        }))
      : [],
    certifications: Array.isArray(data.certifications)
      ? data.certifications.map((c) => String(c).trim()).filter(Boolean)
      : [],
    totalExperienceMonths: parseInt(data.totalExperienceMonths, 10) || 0,
    summary: String(data.summary || '').trim(),
  };
};

/**
 * Regex-based fallback when LLM is unavailable or returns bad data.
 * Extracts basic information from raw text patterns.
 */
const regexFallback = (text) => {
  const skills = extractSkillsRegex(text);
  const education = extractEducationRegex(text);
  const experience = extractExperienceRegex(text);
  const totalExperienceMonths = experience.reduce(
    (sum, e) => sum + (e.durationMonths || 0),
    0
  );

  return {
    skills,
    education,
    experience,
    projects: [],
    certifications: extractCertificationsRegex(text),
    totalExperienceMonths,
    summary: '',
  };
};

/**
 * Extract skills from common patterns like "Skills: X, Y, Z" or "Technologies: X | Y | Z".
 */
const extractSkillsRegex = (text) => {
  const skillPatterns = [
    /(?:skills|technologies|tech stack|proficient in|expertise)[:\s]*([^\n]+)/gi,
    /(?:languages|frameworks|tools|platforms)[:\s]*([^\n]+)/gi,
  ];

  const skills = new Set();
  for (const pattern of skillPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const items = match[1]
        .split(/[,|•·;]/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 1 && s.length < 40);
      items.forEach((item) => skills.add(item));
    }
  }
  return [...skills];
};

/**
 * Extract education entries from common patterns.
 */
const extractEducationRegex = (text) => {
  const entries = [];
  const patterns = [
    /(?:B\.?(?:Tech|E|Sc|A|Com)|M\.?(?:Tech|E|Sc|A|Com|BA)|Ph\.?D|Bachelor|Master|Diploma)[^\n]*(\d{4})?/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entries.push({
        degree: match[0].substring(0, 100).trim(),
        institution: '',
        year: parseInt(match[1], 10) || 0,
        field: '',
      });
    }
  }
  return entries;
};

/**
 * Extract very basic experience data.
 */
const extractExperienceRegex = (text) => {
  const entries = [];
  const patterns = [
    /(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entries.push({
        title: '',
        company: '',
        durationMonths: parseInt(match[1], 10) * 12,
        description: '',
      });
    }
  }
  return entries;
};

/**
 * Extract certifications from text.
 */
const extractCertificationsRegex = (text) => {
  const certs = [];
  const pattern = /(?:certified|certification|certificate)[:\s]*([^\n]+)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    certs.push(match[1].trim().substring(0, 150));
  }
  return certs;
};

/**
 * Check if Ollama is running and the model is available.
 */
const checkOllamaHealth = async () => {
  const { url, model } = getOllamaConfig();
  try {
    const response = await fetch(`${url}/api/tags`);
    if (!response.ok) return { healthy: false, error: 'Ollama server not responding' };

    const data = await response.json();
    const models = (data.models || []).map((m) => m.name);
    const hasModel = models.some((m) => m.startsWith(model));

    return {
      healthy: true,
      model,
      modelLoaded: hasModel,
      availableModels: models,
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

module.exports = { extractWithAI, checkOllamaHealth };
