// Unified AI model support list for frontend.
// Model IDs follow OpenRouter-style `provider/model` naming.

export const DEFAULT_AI_MODEL_MAP = {
  'openai/gpt-5.4': 'OpenAI: GPT-5.4',
  'x-ai/grok-code-fast-1': 'xAI: Grok Code Fast 1',
  'x-ai/grok-4-fast': 'xAI: Grok 4 Fast',
  'x-ai/grok-4.1-fast': 'xAI: Grok 4.1 Fast',
  'google/gemini-2.5-flash': 'Google: Gemini 2.5 Flash',
  'google/gemini-2.0-flash-001': 'Google: Gemini 2.0 Flash',
  'google/gemini-3-pro-preview': 'Google: Gemini 3 Pro Preview',
  'google/gemini-2.5-flash-lite': 'Google: Gemini 2.5 Flash Lite',
  'google/gemini-2.5-pro': 'Google: Gemini 2.5 Pro',
  'openai/gpt-4o': 'OpenAI: GPT-4o',
  'openai/gpt-4o-mini': 'OpenAI: GPT-4o-mini',
  'openai/gpt-5-mini': 'OpenAI: GPT-5 Mini',
  'openai/gpt-oss-120b': 'OpenAI: gpt-oss-120b',
  'deepseek/deepseek-v3.2': 'DeepSeek: DeepSeek V3.2',
  'minimax/minimax-m2': 'MiniMax: MiniMax M2',
  'anthropic/claude-sonnet-4': 'Anthropic: Claude Sonnet 4',
  'anthropic/claude-sonnet-4.5': 'Anthropic: Claude Sonnet 4.5',
  'anthropic/claude-opus-4.5': 'Anthropic: Claude Opus 4.5',
  'anthropic/claude-haiku-4.5': 'Anthropic: Claude Haiku 4.5',
  'z-ai/glm-4.6': 'Z.AI: GLM 4.6'
}

export function isPlainObject (val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}

export function mergeModelMaps (baseMap, overrideMap) {
  const base = isPlainObject(baseMap) ? baseMap : {}
  const override = isPlainObject(overrideMap) ? overrideMap : {}
  return { ...base, ...override }
}

export function modelMapToOptions (modelMap) {
  const map = isPlainObject(modelMap) ? modelMap : {}
  return Object.keys(map).map(key => ({
    value: key,
    label: map[key]
  }))
}
