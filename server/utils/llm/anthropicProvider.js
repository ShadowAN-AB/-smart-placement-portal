const Anthropic = require('@anthropic-ai/sdk');

let cachedClient = null;

const getConfig = () => ({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
});

const getClient = () => {
  if (cachedClient) return cachedClient;
  const { apiKey } = getConfig();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
};

const call = async ({ system, prompt, temperature, maxTokens }) => {
  const { model } = getConfig();
  const client = getClient();

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (response.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  return text;
};

const generateJSON = async (opts) => call({
  ...opts,
  temperature: opts.temperature ?? 0.1,
  maxTokens: opts.maxTokens ?? 2048,
});

const generateText = async (opts) => call({
  ...opts,
  temperature: opts.temperature ?? 0.3,
  maxTokens: opts.maxTokens ?? 1024,
});

const health = async () => {
  const { apiKey, model } = getConfig();
  if (!apiKey) {
    return { healthy: false, provider: 'anthropic', model, error: 'ANTHROPIC_API_KEY not set' };
  }
  // We don't hit the API here — that would cost tokens on every health check.
  // Presence of the key is treated as "healthy". Real errors surface on first call.
  return { healthy: true, provider: 'anthropic', model, modelLoaded: true };
};

module.exports = { generateJSON, generateText, health, name: 'anthropic' };
