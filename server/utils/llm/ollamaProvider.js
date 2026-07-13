const getConfig = () => ({
  url: process.env.OLLAMA_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'qwen2.5-coder',
});

const generate = async ({ system, prompt, temperature, maxTokens }) => {
  const { url, model } = getConfig();
  const response = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned status ${response.status}`);
  }

  const data = await response.json();
  return (data.response || '').trim();
};

const generateJSON = async (opts) => generate({
  ...opts,
  temperature: opts.temperature ?? 0.1,
  maxTokens: opts.maxTokens ?? 2048,
});

const generateText = async (opts) => generate({
  ...opts,
  temperature: opts.temperature ?? 0.3,
  maxTokens: opts.maxTokens ?? 1024,
});

const health = async () => {
  const { url, model } = getConfig();
  try {
    const response = await fetch(`${url}/api/tags`);
    if (!response.ok) return { healthy: false, provider: 'ollama', model, error: 'Ollama server not responding' };

    const data = await response.json();
    const models = (data.models || []).map((m) => m.name);
    const hasModel = models.some((m) => m.startsWith(model));

    return {
      healthy: true,
      provider: 'ollama',
      model,
      modelLoaded: hasModel,
      availableModels: models,
    };
  } catch (error) {
    return { healthy: false, provider: 'ollama', model, error: error.message };
  }
};

module.exports = { generateJSON, generateText, health, name: 'ollama' };
