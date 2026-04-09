// src/lib/api/ai-api.ts
import { api, fetchWithAuth, handleApiResponse } from '@/lib/fetch';
import { useMutation } from '@tanstack/react-query';

// Types
export type ImageType = "logo" | "artwork" | "illustration" | "photo" | "banner" | "social_media" | "product" | "character" | "landscape" | "portrait" | "abstract" | "icon";

export type ImageStyle = "natural" | "vivid";

export type ImageSize = "256x256" | "512x512" | "1024x1024" | "512x768" | "768x1024" | "768x512" | "1024x768" | "1024x576" | "1344x768";

export type ImageQuality = "standard" | "hd";

export interface ImageGenerationRequest {
  prompt: string;
  image_type: ImageType;
  style?: ImageStyle;
  size?: ImageSize;
  quality?: ImageQuality;
  count?: number;
  color_palette?: string[];
  mood?: string[];
  lighting?: string;
}

export interface ImageGenerationResponse {
  image_urls: string[];
  specifications: {
    width: number;
    height: number;
    format: string;
    quality: string;
  };
  generation_params: {
    style?: string;
    steps?: number;
    guidance_scale?: number;
    seed?: number;
  };
  timestamp: string;
  request_id: string;
  usage: {
    images_generated: number;
    processing_time_ms: number;
  };
}

export type SummaryType = 'extractive' | 'abstractive' | 'bullet_points' | 'key_insights' | 'executive_summary' | 'highlights';

export type ContentType = 'article' | 'research_paper' | 'news' | 'blog_post' | 'document' | 'email' | 'meeting_transcript' | 'book_chapter' | 'web_page' | 'social_media' | 'legal_document' | 'technical_manual' | 'general';

export type SummaryLength = 'very_short' | 'short' | 'medium' | 'long' | 'detailed' | 'custom';

export interface SummarizeRequest {
  content: string;
  summary_type: SummaryType;
  content_type?: ContentType;
  length?: SummaryLength;
  word_count?: number;
  sentence_count?: number;
  focus_areas?: string[];
  include_statistics?: boolean;
  include_quotes?: boolean;
  include_action_items?: boolean;
  target_audience?: string;
  preserve_tone?: boolean;
  additional_instructions?: string;
}

export interface SummarizeResponse {
  summary: string;
  original_length: number;
  summary_length: number;
  timestamp: string;
  request_id: string;
}

export interface GlossaryEntry {
  source: string;
  target: string;
}

export interface TranslateRequest {
  text: string;
  target_language: string;
  source_language?: string;
  style?: 'formal' | 'informal' | 'technical' | 'literary' | 'business' | 'academic' | 'casual' | 'medical' | 'legal' | 'marketing';
  context?: string;
  preserve_formatting?: boolean;
  include_confidence?: boolean;
  include_alternatives?: boolean;
  glossary?: GlossaryEntry[];
  cultural_adaptation?: boolean;
  notes?: string;
}

export interface TranslateResponse {
  translated_text: string;
  source_language: string;
  target_language: string;
  confidence?: number;
  alternatives?: string[];
  timestamp: string;
  request_id: string;
  usage: {
    characters_processed: number;
    processing_time_ms: number;
  };
}

export interface GenerateTextRequest {
  prompt: string;
  text_type?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'conversational' | 'persuasive' | 'educational' | 'humorous' | 'inspiring' | 'urgent';
  target_audience?: string;
  word_count?: number;
  language?: string;
  keywords?: string[];
  seo_optimized?: boolean;
  include_cta?: boolean;
  additional_context?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface GenerateTextResponse {
  content: string;
  text_type: string;
  word_count: number;
  character_count: number;
  language: string;
  timestamp: string;
  request_id: string;
  usage: {
    tokens_used: number;
    processing_time_ms: number;
  };
}

export interface VideoGenerationRequest {
  prompt: string;
  duration: number;
  aspect_ratio: string;
}

export interface VideoGenerationResponse {
  video_url: string;
  thumbnail_url?: string;
  specifications: {
    duration: number;
    width: number;
    height: number;
    aspect_ratio: string;
    format: string;
    quality: string;
    file_size_mb: number;
  };
  generation_params: {
    style: string;
    fps: number;
    steps?: number;
    guidance_scale?: number;
    seed?: number;
  };
  timestamp: string;
  request_id: string;
  usage: {
    processing_time_ms: number;
    frames_generated: number;
  };
}

// API Functions
export const aiApi = {
  async generateImage(data: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    console.log('🎨 AI Image Generation Request:', {
      prompt: data.prompt,
      image_type: data.image_type,
      style: data.style,
      size: data.size,
      quality: data.quality,
      endpoint: '/ai/generate-image',
    });

    try {
      // Use fetchWithAuth directly with silentAuthFailure to prevent redirect on 401
      const response = await fetchWithAuth('/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify(data),
        requireAuth: true,
        silentAuthFailure: true, // Don't redirect to login on auth failure
      });

      console.log('📡 API Response Status:', response.status, response.statusText);

      // Check if we got a 401 and provide a better error message
      if (response.status === 401) {
        console.error('🔒 Authentication failed (401)');
        throw new Error('Authentication failed. Please ensure you are logged in and try again.');
      }

      // Check if endpoint doesn't exist
      if (response.status === 404) {
        console.error('❌ Endpoint not found (404)');
        throw new Error('AI generation endpoint not found. Please ensure the backend API is running and configured correctly.');
      }

      // Check for other error statuses
      if (!response.ok) {
        console.error(`⚠️ API Error (${response.status}):`, response.statusText);
      }

      const result = await handleApiResponse<ImageGenerationResponse>(response);
      console.log('✅ AI Image Generation Success:', {
        images_count: result.image_urls?.length || 0,
        request_id: result.request_id,
      });

      return result;
    } catch (error) {
      console.error('❌ AI Image Generation Error:', error);
      throw error;
    }
  },

  async summarize(data: SummarizeRequest): Promise<SummarizeResponse> {
    console.log('📝 AI Summarization Request:', {
      content_length: data.content.length,
      summary_type: data.summary_type,
      length: data.length,
      content_type: data.content_type,
      endpoint: '/ai/summarize',
    });

    try {
      // Use fetchWithAuth directly with silentAuthFailure to prevent redirect on 401
      const response = await fetchWithAuth('/ai/summarize', {
        method: 'POST',
        body: JSON.stringify(data),
        requireAuth: true,
        silentAuthFailure: true,
      });

      console.log('📡 API Response Status:', response.status, response.statusText);

      // Check if we got a 401 and provide a better error message
      if (response.status === 401) {
        console.error('🔒 Authentication failed (401)');
        throw new Error('Authentication failed. Please ensure you are logged in and try again.');
      }

      // Check if endpoint doesn't exist
      if (response.status === 404) {
        console.error('❌ Endpoint not found (404)');
        throw new Error('AI summarization endpoint not found. Please ensure the backend API is running and configured correctly.');
      }

      // Check for other error statuses
      if (!response.ok) {
        console.error(`⚠️ API Error (${response.status}):`, response.statusText);
      }

      const result = await handleApiResponse<SummarizeResponse>(response);
      console.log('✅ AI Summarization Success:', {
        summary_length: result.summary?.length || 0,
        request_id: result.request_id,
      });

      return result;
    } catch (error) {
      console.error('❌ AI Summarization Error:', error);
      throw error;
    }
  },

  async translate(data: TranslateRequest): Promise<TranslateResponse> {
    console.log('🌐 AI Translation Request:', {
      text_length: data.text.length,
      target_language: data.target_language,
      source_language: data.source_language || 'auto-detect',
      endpoint: '/ai/translate',
    });

    try {
      // Use fetchWithAuth directly with silentAuthFailure to prevent redirect on 401
      const response = await fetchWithAuth('/ai/translate', {
        method: 'POST',
        body: JSON.stringify(data),
        requireAuth: true,
        silentAuthFailure: true,
      });

      console.log('📡 API Response Status:', response.status, response.statusText);

      // Check if we got a 401 and provide a better error message
      if (response.status === 401) {
        console.error('🔒 Authentication failed (401)');
        throw new Error('Authentication failed. Please ensure you are logged in and try again.');
      }

      // Check if endpoint doesn't exist
      if (response.status === 404) {
        console.error('❌ Endpoint not found (404)');
        throw new Error('AI translation endpoint not found. Please ensure the backend API is running and configured correctly.');
      }

      // Check for other error statuses
      if (!response.ok) {
        console.error(`⚠️ API Error (${response.status}):`, response.statusText);
      }

      const result = await handleApiResponse<TranslateResponse>(response);
      console.log('✅ AI Translation Success:', {
        translated_length: result.translated_text?.length || 0,
        target_language: result.target_language,
        request_id: result.request_id,
      });

      return result;
    } catch (error) {
      console.error('❌ AI Translation Error:', error);
      throw error;
    }
  },

  async generateText(data: GenerateTextRequest): Promise<GenerateTextResponse> {
    console.log('✍️ AI Text Generation Request:', {
      prompt_length: data.prompt.length,
      text_type: data.text_type,
      tone: data.tone,
      word_count: data.word_count,
      endpoint: '/ai/generate-text',
    });

    try {
      // Use fetchWithAuth directly with silentAuthFailure to prevent redirect on 401
      const response = await fetchWithAuth('/ai/generate-text', {
        method: 'POST',
        body: JSON.stringify(data),
        requireAuth: true,
        silentAuthFailure: true,
      });

      console.log('📡 API Response Status:', response.status, response.statusText);

      // Check if we got a 401 and provide a better error message
      if (response.status === 401) {
        console.error('🔒 Authentication failed (401)');
        throw new Error('Authentication failed. Please ensure you are logged in and try again.');
      }

      // Check if endpoint doesn't exist
      if (response.status === 404) {
        console.error('❌ Endpoint not found (404)');
        throw new Error('AI text generation endpoint not found. Please ensure the backend API is running and configured correctly.');
      }

      // Check for other error statuses
      if (!response.ok) {
        console.error(`⚠️ API Error (${response.status}):`, response.statusText);
      }

      const result = await handleApiResponse<GenerateTextResponse>(response);
      console.log('✅ AI Text Generation Success:', {
        generated_length: result.content?.length || 0,
        word_count: result.word_count,
        request_id: result.request_id,
      });

      return result;
    } catch (error) {
      console.error('❌ AI Text Generation Error:', error);
      throw error;
    }
  },

  async generateVideo(data: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    console.log('🎬 AI Video Generation Request:', {
      prompt: data.prompt,
      duration: data.duration,
      aspect_ratio: data.aspect_ratio,
      endpoint: '/api/v1/ai/generate-video',
    });

    try {
      // Use fetchWithAuth directly with silentAuthFailure to prevent redirect on 401
      const response = await fetchWithAuth('/ai/generate-video', {
        method: 'POST',
        body: JSON.stringify(data),
        requireAuth: true,
        silentAuthFailure: true,
      });

      console.log('📡 API Response Status:', response.status, response.statusText);

      // Check if we got a 401 and provide a better error message
      if (response.status === 401) {
        console.error('🔒 Authentication failed (401)');
        throw new Error('Authentication failed. Please ensure you are logged in and try again.');
      }

      // Check if endpoint doesn't exist
      if (response.status === 404) {
        console.error('❌ Endpoint not found (404)');
        throw new Error('AI video generation endpoint not found. Please ensure the backend API is running and configured correctly.');
      }

      // Check for other error statuses
      if (!response.ok) {
        console.error(`⚠️ API Error (${response.status}):`, response.statusText);
      }

      const result = await handleApiResponse<VideoGenerationResponse>(response);
      console.log('✅ AI Video Generation Success:', {
        video_url: result.video_url,
        duration: result.specifications?.duration,
        request_id: result.request_id,
      });

      return result;
    } catch (error) {
      console.error('❌ AI Video Generation Error:', error);
      throw error;
    }
  },
};

// React Query Hooks
export const useGenerateImage = () => {
  return useMutation({
    mutationFn: (data: ImageGenerationRequest) => aiApi.generateImage(data),
  });
};

export const useSummarize = () => {
  return useMutation({
    mutationFn: (data: SummarizeRequest) => aiApi.summarize(data),
  });
};

export const useTranslate = () => {
  return useMutation({
    mutationFn: (data: TranslateRequest) => aiApi.translate(data),
  });
};

export const useGenerateText = () => {
  return useMutation({
    mutationFn: (data: GenerateTextRequest) => aiApi.generateText(data),
  });
};

export const useGenerateVideo = () => {
  return useMutation({
    mutationFn: (data: VideoGenerationRequest) => aiApi.generateVideo(data),
  });
};

// ============================================
// EMAIL SUGGESTION API
// ============================================

export type EmailTone = 'professional' | 'casual' | 'friendly' | 'formal' | 'urgent';

export interface OriginalEmail {
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  bodyText?: string;
  bodyHtml?: string;
}

export interface GenerateEmailSuggestionsRequest {
  subject: string;
  recipient?: string;
  currentDraft?: string;
  replyTo?: OriginalEmail;
  isReply?: boolean;
  tone?: EmailTone;
  count?: number;
  maxTokens?: number;
}

export interface EmailSuggestionResponse {
  suggestions: string[];
  count: number;
  isReply: boolean;
  timestamp: string;
  requestId: string;
  usage?: {
    tokensUsed: number;
    processingTimeMs: number;
  };
}

export interface GenerateSmartRepliesRequest {
  subject: string;
  sender: string;
  body: string;
  count?: number;
  tone?: EmailTone;
}

export interface SmartReplyResponse {
  replies: string[];
  count: number;
  timestamp: string;
  requestId: string;
  usage?: {
    tokensUsed: number;
    processingTimeMs: number;
  };
}

export const emailAiApi = {
  async generateEmailSuggestions(data: GenerateEmailSuggestionsRequest): Promise<EmailSuggestionResponse> {
    console.log('📧 AI Email Suggestions Request:', {
      subject: data.subject,
      isReply: data.isReply,
      tone: data.tone,
      count: data.count,
    });

    try {
      const response = await fetchWithAuth('/ai/email-suggestions', {
        method: 'POST',
        body: JSON.stringify(data),
        requireAuth: true,
        silentAuthFailure: true,
      });

      if (response.status === 401) {
        throw new Error('Authentication failed. Please ensure you are logged in and try again.');
      }

      if (response.status === 404) {
        throw new Error('Email suggestions endpoint not found.');
      }

      const result = await handleApiResponse<EmailSuggestionResponse>(response);
      console.log('✅ AI Email Suggestions Success:', {
        count: result.suggestions?.length || 0,
        requestId: result.requestId,
      });

      return result;
    } catch (error) {
      console.error('❌ AI Email Suggestions Error:', error);
      throw error;
    }
  },

  async generateSmartReplies(data: GenerateSmartRepliesRequest): Promise<SmartReplyResponse> {
    console.log('💬 AI Smart Replies Request:', {
      subject: data.subject,
      sender: data.sender,
      count: data.count,
    });

    try {
      const response = await fetchWithAuth('/ai/smart-replies', {
        method: 'POST',
        body: JSON.stringify(data),
        requireAuth: true,
        silentAuthFailure: true,
      });

      if (response.status === 401) {
        throw new Error('Authentication failed. Please ensure you are logged in and try again.');
      }

      if (response.status === 404) {
        throw new Error('Smart replies endpoint not found.');
      }

      const result = await handleApiResponse<SmartReplyResponse>(response);
      console.log('✅ AI Smart Replies Success:', {
        count: result.replies?.length || 0,
        requestId: result.requestId,
      });

      return result;
    } catch (error) {
      console.error('❌ AI Smart Replies Error:', error);
      throw error;
    }
  },
};

export const useGenerateEmailSuggestions = () => {
  return useMutation({
    mutationFn: (data: GenerateEmailSuggestionsRequest) => emailAiApi.generateEmailSuggestions(data),
  });
};

export const useGenerateSmartReplies = () => {
  return useMutation({
    mutationFn: (data: GenerateSmartRepliesRequest) => emailAiApi.generateSmartReplies(data),
  });
};

// ============================================
// DESCRIPTION SUGGESTION API (Unified)
// ============================================

export type DescriptionType = 'task' | 'project' | 'event' | 'meeting';
export type DescriptionTone = 'professional' | 'casual' | 'friendly' | 'formal' | 'concise';
export type DescriptionLength = 'short' | 'medium' | 'long';

export interface GenerateDescriptionSuggestionsRequest {
  type: DescriptionType;
  title: string;
  context?: string;
  count?: number;
  tone?: DescriptionTone;
  length?: DescriptionLength;
}

export interface DescriptionSuggestionResponse {
  suggestions: string[];
  count: number;
  type: DescriptionType;
  timestamp: string;
  requestId: string;
  usage?: {
    tokensUsed: number;
    processingTimeMs: number;
  };
}

export const descriptionAiApi = {
  async generateSuggestions(data: GenerateDescriptionSuggestionsRequest): Promise<DescriptionSuggestionResponse> {
    console.log('📝 AI Description Suggestions Request:', {
      type: data.type,
      title: data.title,
      count: data.count,
    });

    try {
      const response = await fetchWithAuth('/ai/description-suggestions', {
        method: 'POST',
        body: JSON.stringify(data),
        requireAuth: true,
        silentAuthFailure: true,
      });

      if (response.status === 401) {
        throw new Error('Authentication failed. Please ensure you are logged in and try again.');
      }

      if (response.status === 404) {
        throw new Error('Description suggestions endpoint not found.');
      }

      const result = await handleApiResponse<DescriptionSuggestionResponse>(response);
      console.log('✅ AI Description Suggestions Success:', {
        count: result.suggestions?.length || 0,
        type: result.type,
        requestId: result.requestId,
      });

      return result;
    } catch (error) {
      console.error('❌ AI Description Suggestions Error:', error);
      throw error;
    }
  },
};

export const useGenerateDescriptionSuggestions = () => {
  return useMutation({
    mutationFn: (data: GenerateDescriptionSuggestionsRequest) => descriptionAiApi.generateSuggestions(data),
  });
};

// Export as aiService for consistency
export const aiService = aiApi;

// ============================================
// UNIFIED AI ASSISTANT API
// ============================================

export type AgentType = 'projects' | 'tasks' | 'notes' | 'calendar' | 'files' | 'chat' | 'unknown';

export interface AIAssistantRequest {
  prompt: string;
  workspaceId: string;
  currentView?: string;
  projectId?: string;
}

export interface AIAssistantResponse {
  success: boolean;
  agentUsed: AgentType;
  action: string;
  message: string;
  data?: any;
  error?: string;
  routingConfidence?: number;
}

/**
 * Unified AI Assistant API
 * Routes commands to the appropriate specialized agent using AI
 */
export const aiAssistantApi = {
  /**
   * Process a natural language command with the AI assistant
   * The backend AI will intelligently route to the appropriate agent
   */
  async processCommand(request: AIAssistantRequest): Promise<AIAssistantResponse> {
    console.log('🤖 AI Assistant Request:', {
      prompt: request.prompt,
      workspaceId: request.workspaceId,
      currentView: request.currentView,
      projectId: request.projectId,
    });

    return api.post<AIAssistantResponse>('/ai/assistant', request);
  },
};

/**
 * React Query hook for AI Assistant
 */
export const useAIAssistant = () => {
  return useMutation({
    mutationFn: (request: AIAssistantRequest) => aiAssistantApi.processCommand(request),
  });
};
