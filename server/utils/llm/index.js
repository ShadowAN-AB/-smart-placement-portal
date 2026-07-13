const ollamaProvider = require('./ollamaProvider');
const anthropicProvider = require('./anthropicProvider');

const providers = {
  ollama: ollamaProvider,
  anthropic: anthropicProvider,
};

/**
 * Resolve the active LLM provider from LLM_PROVIDER env.
 * Defaults to ollama for local dev backwards compatibility.
 */
const getProvider = () => {
  const name = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();
  const provider = providers[name];
  if (!provider) {
    console.warn(`[llm] unknown provider "${name}", falling back to ollama`);
    return providers.ollama;
  }
  return provider;
};

module.exports = { getProvider };
