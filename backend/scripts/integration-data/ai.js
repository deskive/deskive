/**
 * AI & Machine Learning Integrations
 */

const aiIntegrations = [
  {
    slug: 'openai',
    name: 'OpenAI',
    description: 'Connect OpenAI for GPT and DALL-E.',
    category: 'AI',
    provider: 'OpenAI',
    logoUrl: 'https://openai.com/favicon.ico',
    website: 'https://openai.com',
    documentationUrl: 'https://platform.openai.com/docs/api-reference',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Get from platform.openai.com/api-keys',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api.openai.com/v1',
    capabilities: ['chat_completions', 'embeddings', 'image_generation', 'audio_transcription'],
    features: ['GPT-4', 'DALL-E 3', 'Whisper', 'Embeddings'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Connect Anthropic for Claude AI.',
    category: 'AI',
    provider: 'Anthropic',
    logoUrl: 'https://www.anthropic.com/favicon.ico',
    website: 'https://anthropic.com',
    documentationUrl: 'https://docs.anthropic.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Get from console.anthropic.com',
      headerName: 'x-api-key'
    },
    apiBaseUrl: 'https://api.anthropic.com/v1',
    capabilities: ['chat_completions', 'text_generation'],
    features: ['Claude 3', 'Long context', 'Constitutional AI', 'Vision'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'google-ai',
    name: 'Google AI (Gemini)',
    description: 'Connect Google AI for Gemini models.',
    category: 'AI',
    provider: 'Google',
    logoUrl: 'https://ai.google.dev/static/images/favicon.png',
    website: 'https://ai.google.dev',
    documentationUrl: 'https://ai.google.dev/docs',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Get from Google AI Studio',
      headerName: 'x-goog-api-key'
    },
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    capabilities: ['chat_completions', 'embeddings', 'multimodal'],
    features: ['Gemini Pro', 'Gemini Ultra', 'Multimodal', 'Long context'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'huggingface',
    name: 'Hugging Face',
    description: 'Connect Hugging Face for ML models.',
    category: 'AI',
    provider: 'Hugging Face',
    logoUrl: 'https://huggingface.co/favicon.ico',
    website: 'https://huggingface.co',
    documentationUrl: 'https://huggingface.co/docs/api-inference',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Token',
      helpText: 'Get from huggingface.co/settings/tokens',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api-inference.huggingface.co/models',
    capabilities: ['text_generation', 'embeddings', 'image_classification', 'translation'],
    features: ['Model hub', 'Inference API', 'Spaces', 'Datasets'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'replicate',
    name: 'Replicate',
    description: 'Connect Replicate for ML model hosting.',
    category: 'AI',
    provider: 'Replicate',
    logoUrl: 'https://replicate.com/favicon.ico',
    website: 'https://replicate.com',
    documentationUrl: 'https://replicate.com/docs/reference/http',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Token',
      helpText: 'Get from replicate.com/account/api-tokens',
      headerName: 'Authorization',
      headerPrefix: 'Token '
    },
    apiBaseUrl: 'https://api.replicate.com/v1',
    capabilities: ['run_models', 'image_generation', 'video_generation'],
    features: ['Model hosting', 'Stable Diffusion', 'LLaMA', 'Custom models'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'cohere',
    name: 'Cohere',
    description: 'Connect Cohere for enterprise NLP.',
    category: 'AI',
    provider: 'Cohere',
    logoUrl: 'https://cohere.com/favicon.ico',
    website: 'https://cohere.com',
    documentationUrl: 'https://docs.cohere.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Get from dashboard.cohere.com/api-keys',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api.cohere.ai/v1',
    capabilities: ['chat', 'embeddings', 'rerank', 'classify'],
    features: ['Command', 'Embed', 'Rerank', 'Enterprise security'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { aiIntegrations };
