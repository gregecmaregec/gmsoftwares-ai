// Model configuration and utilities
export interface ModelOption {
  id: string;
  name: string;
  provider?: string;
}

// Comprehensive model list with many options
export const ALL_MODEL_OPTIONS: ModelOption[] = [
  // top of the line
  { id: 'auto', name: 'Automatic'},
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.7-sonnet:thinking', name: 'Claude 3.7 Sonnet (Thinking)', provider: 'Anthropic' },
  { id: 'x-ai/grok-3-mini-beta', name: 'Grok 3 Mini β', provider: 'xAI' },
  { id: 'x-ai/grok-3-beta', name: 'Grok 3 β', provider: 'xAI' },
  { id: 'openai/o4-mini-high', name: 'GPT-o4 Mini High', provider: 'OpenAI' },
  { id: 'openai/codex-mini', name: 'OpenAI Codex Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
  { id: 'openai/gpt-4.5-preview', name: 'GPT-4.5 Preview', provider: 'OpenAI' },
  { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro Preview', provider: 'Google' },
  { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash Preview', provider: 'Google' },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat V3 0324', provider: 'DeepSeek' },
  // the rest
  { id: 'amazon/nova-lite-v1', name: 'Nova Lite V1', provider: 'Amazon' },
  { id: 'anthropic/claude-3.5-haiku-20241022:beta', name: 'Claude 3.5 Haiku 20241022 β', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.7-sonnet:beta', name: 'Claude 3.7 Sonnet β', provider: 'Anthropic' },
  { id: 'cohere/command-r-plus-08-2024', name: 'Command R Plus 08 2024', provider: 'Cohere' },
  { id: 'cohere/command-r7b-12-2024', name: 'Command R7B 12 2024', provider: 'Cohere' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash 001', provider: 'Google' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', provider: 'Meta-Llama' },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta-Llama' },
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta-Llama' },
  { id: 'microsoft/phi-4', name: 'Phi-4', provider: 'Microsoft' },
  { id: 'mistral/ministral-8b', name: 'Ministral 8B', provider: 'Mistral' },
  { id: 'mistralai/mistral-large-2407', name: 'Mistral Large 2407', provider: 'MistralAI' },
  { id: 'mistralai/mistral-medium-3', name: 'Mistral Medium 3', provider: 'MistralAI' },
  { id: 'nousresearch/hermes-3-llama-3.1-70b', name: 'Hermes 3 Llama 3.1 70B', provider: 'NousResearch' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free', name: 'Llama 3.1 Nemotron Ultra 253B V1 (Free)', provider: 'Nvidia' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'openai/o3-mini', name: 'GPT-o3 Mini', provider: 'OpenAI' },
  { id: 'openai/o4-mini', name: 'GPT-o4 Mini', provider: 'OpenAI' },
  { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen 2.5 7B Instruct', provider: 'Qwen' },
];

// Define the set of top-tier model IDs
export const TOP_TIER_MODEL_IDS = new Set([
  'auto',
  'anthropic/claude-opus-4',
  'anthropic/claude-sonnet-4',
  'x-ai/grok-3-mini-beta',
  'x-ai/grok-3-mini-beta:online',
  'openai/o4-mini-high',
  'anthropic/claude-3.7-sonnet:thinking',
  'google/gemini-2.5-pro-preview',
  'google/gemini-2.5-flash-preview',
  'openai/gpt-4.1',
  'openai/gpt-4.5-preview',
  'deepseek/deepseek-chat-v3-0324',
  'openai/codex-mini',
  'google/gemini-2.5-flash-preview-05-20',  
  'x-ai/grok-3-beta'
]);

// Helper function to get display name for a model - memoized
export const getModelDisplayName = (modelId: string): string => {
  const isOnline = modelId.endsWith(':online');
  const baseModelId = isOnline ? modelId.replace(':online', '') : modelId;
  const baseModel = ALL_MODEL_OPTIONS.find(m => m.id === baseModelId);
  const baseName = baseModel?.name || baseModelId;
  return isOnline ? `${baseName} + Web Search` : baseName;
}; 