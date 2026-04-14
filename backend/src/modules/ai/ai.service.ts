import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { v4 as uuidv4 } from 'uuid';

// DTOs
import {
  GenerateTextDto,
  GenerateImageDto,
  GenerateVideoDto,
  GenerateCodeDto,
  TranslateTextDto,
  BatchTranslateDto,
  SummarizeContentDto,
  SummarizeUrlDto,
  CreateChatDto,
  ChatHistoryDto,
  GenerateRecipeDto,
  GenerateWorkoutPlanDto,
  GenerateMealPlanDto,
  AIQueryDto,
  AIUsageQueryDto,
  ChatSessionQueryDto,
  UpdateChatSessionDto,
  AIVideoResponse,
  GenerateEmailSuggestionsDto,
  GenerateSmartRepliesDto,
  EmailSuggestionResponseDto,
  SmartReplyResponseDto,
  GenerateDescriptionSuggestionsDto,
  DescriptionSuggestionResponseDto,
  DescriptionType,
} from './dto';

// Travel DTO - removed since travel module doesn't exist

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(private readonly db: DatabaseService) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in. Lets all this.aiProvider.generateText/
  // chatCompletion calls compile.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Text Generation Service
   */
  async generateText(userId: string, dto: GenerateTextDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      // Prepare the prompt based on text type and parameters
      const enhancedPrompt = this.buildTextPrompt(dto);

      // Call database AI text generation
      const response = await this.aiProvider.generateText(enhancedPrompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const content = this.extractTextContent(response);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'text_generation',
        prompt: dto.prompt,
        response: content,
        parameters: {
          text_type: dto.text_type,
          tone: dto.tone,
          target_audience: dto.target_audience,
          word_count: dto.word_count,
          language: dto.language,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        content,
        text_type: dto.text_type,
        word_count: content.split(' ').length,
        character_count: content.length,
        language: dto.language || 'en',
        timestamp: new Date().toISOString(),
        request_id: requestId,
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Text generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate text content');
    }
  }

  /**
   * Generate Email Suggestions
   * Returns multiple email body suggestions for composing or replying
   */
  async generateEmailSuggestions(
    userId: string,
    dto: GenerateEmailSuggestionsDto,
  ): Promise<EmailSuggestionResponseDto> {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();
      const count = Math.min(Math.max(dto.count || 3, 1), 5);
      const tone = dto.tone || 'professional';
      const isReply = dto.isReply || !!dto.replyTo;

      // Build the prompt based on whether it's a new email or a reply
      let prompt = '';
      if (isReply && dto.replyTo) {
        const originalContent =
          dto.replyTo.bodyText || this.stripHtmlTags(dto.replyTo.bodyHtml || '');
        prompt = `Generate ${count} professional email reply options for the following email.

Original Email Subject: ${dto.replyTo.subject || '(no subject)'}
From: ${dto.replyTo.senderName || dto.replyTo.senderEmail || 'Unknown'}
Original Email Content:
${originalContent.substring(0, 1000)}

Generate ${count} different reply options that are ${tone}, concise, and appropriate. Each reply should be 2-4 sentences. Separate each option with "---".`;
      } else {
        prompt = `Generate ${count} professional email draft options for the following:

Subject: ${dto.subject}
Recipient: ${dto.recipient || 'recipient'}
${dto.currentDraft ? `Current draft context: ${dto.currentDraft}` : ''}

Generate ${count} different email body options that are ${tone}, clear, and appropriate for the subject. Each option should be 2-4 sentences. Separate each option with "---".`;
      }

      // Call database AI text generation
      const response = await this.aiProvider.generateText(prompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const content = this.extractTextContent(response);

      // Parse the response into suggestions
      const suggestions = this.parseEmailSuggestions(content, count);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'email_suggestion',
        prompt: dto.subject,
        response: suggestions,
        parameters: {
          isReply,
          tone,
          count,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        suggestions,
        count: suggestions.length,
        isReply,
        timestamp: new Date().toISOString(),
        requestId,
        usage: {
          tokensUsed: this.extractTokenUsage(response),
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Email suggestion generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate email suggestions');
    }
  }

  /**
   * Generate Smart Replies
   * Returns short, one-line smart reply options for quick responses
   */
  async generateSmartReplies(
    userId: string,
    dto: GenerateSmartRepliesDto,
  ): Promise<SmartReplyResponseDto> {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();
      const count = Math.min(Math.max(dto.count || 3, 1), 5);
      const tone = dto.tone || 'professional';

      const prompt = `Generate ${count} short, one-line smart reply suggestions for this email. Each reply should be a complete, ${tone} response in 1-2 sentences.

Original Email Subject: ${dto.subject || '(no subject)'}
From: ${dto.sender || 'Unknown'}
Original Email:
${dto.body.substring(0, 800)}

Generate ${count} different quick reply options. Separate each with "---".`;

      // Call database AI text generation
      const response = await this.aiProvider.generateText(prompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const content = this.extractTextContent(response);

      // Parse the response into replies
      const replies = this.parseSmartReplies(content, count);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'smart_reply',
        prompt: dto.subject,
        response: replies,
        parameters: {
          tone,
          count,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        replies,
        count: replies.length,
        timestamp: new Date().toISOString(),
        requestId,
        usage: {
          tokensUsed: this.extractTokenUsage(response),
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Smart reply generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate smart replies');
    }
  }

  /**
   * Generate Description Suggestions (Unified for task, project, event, meeting)
   * Returns multiple description suggestions based on the type and title
   */
  async generateDescriptionSuggestions(
    userId: string,
    dto: GenerateDescriptionSuggestionsDto,
  ): Promise<DescriptionSuggestionResponseDto> {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();
      const count = Math.min(Math.max(dto.count || 3, 1), 5);
      const tone = dto.tone || 'professional';
      const length = dto.length || 'medium';

      // Build prompt based on type
      const prompt = this.buildDescriptionPrompt(
        dto.type,
        dto.title,
        count,
        tone,
        length,
        dto.context,
      );

      // Call database AI text generation
      const response = await this.aiProvider.generateText(prompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const content = this.extractTextContent(response);

      // Parse the response into suggestions
      const suggestions = this.parseDescriptionSuggestions(content, count);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'description_suggestion',
        prompt: dto.title,
        response: suggestions,
        parameters: {
          type: dto.type,
          tone,
          length,
          count,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        suggestions,
        count: suggestions.length,
        type: dto.type,
        timestamp: new Date().toISOString(),
        requestId,
        usage: {
          tokensUsed: this.extractTokenUsage(response),
          processingTimeMs: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Description suggestion generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate description suggestions');
    }
  }

  /**
   * Build prompt for description suggestions based on type
   */
  private buildDescriptionPrompt(
    type: DescriptionType,
    title: string,
    count: number,
    tone: string,
    length: string,
    context?: string,
  ): string {
    const lengthGuide = {
      short: '1-2 sentences',
      medium: '2-3 sentences',
      long: '3-5 sentences',
    };

    const typeConfig = {
      [DescriptionType.TASK]: {
        label: 'task',
        focus: 'what needs to be done, expected outcomes, and any relevant details',
      },
      [DescriptionType.PROJECT]: {
        label: 'project',
        focus: 'project goals, scope, key deliverables, and objectives',
      },
      [DescriptionType.EVENT]: {
        label: 'calendar event',
        focus: 'purpose of the event, agenda highlights, and what attendees should expect',
      },
      [DescriptionType.MEETING]: {
        label: 'meeting',
        focus: 'meeting objectives, topics to discuss, and expected outcomes',
      },
    };

    const config = typeConfig[type];
    const lengthDesc = lengthGuide[length] || lengthGuide.medium;

    const prompt = `Generate ${count} ${tone} description options for a ${config.label}.

Title: ${title}
${context ? `Context: ${context}\n` : ''}
Requirements:
- Each description should be ${lengthDesc}
- Focus on: ${config.focus}
- Tone: ${tone}
- Write clear, actionable descriptions
- Do NOT include any prefixes like "Option 1:", "Description:", or numbering

Separate each description with "---".`;

    return prompt;
  }

  /**
   * Parse AI response into description suggestions
   */
  private parseDescriptionSuggestions(content: string, maxCount: number): string[] {
    const trimmedContent = content.trim();
    let suggestions: string[] = [];

    // Try splitting by "---" first
    if (trimmedContent.includes('---')) {
      suggestions = trimmedContent
        .split('---')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (trimmedContent.includes('\n\n')) {
      // Fallback to double newline
      suggestions = trimmedContent
        .split('\n\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (trimmedContent.includes('\n')) {
      // Fallback to single newline
      suggestions = trimmedContent
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      // Single suggestion
      suggestions = [trimmedContent];
    }

    // Clean up suggestions - remove any prefixes
    suggestions = suggestions
      .map((s) => {
        return (
          s
            // Remove "Option 1:", "**Description 1:**", "**Task Description:**", etc.
            .replace(
              /^\*{0,2}(Option|Draft|Description|Task\s+Description|Project\s+Description|Event\s+Description|Meeting\s+Description)\s*\d*\s*[:\-\*]*\s*/gi,
              '',
            )
            // Remove numbered prefixes like "1.", "1)", "1:"
            .replace(/^\d+[.):\-\s]+/g, '')
            // Remove bullet points
            .replace(/^[-*]\s*/, '')
            .trim()
        );
      })
      .filter(Boolean);

    // Limit to max count
    return suggestions.slice(0, maxCount);
  }

  /**
   * Parse AI response into email suggestions
   */
  private parseEmailSuggestions(content: string, maxCount: number): string[] {
    const trimmedContent = content.trim();
    let suggestions: string[] = [];

    // Try splitting by "---" first
    if (trimmedContent.includes('---')) {
      suggestions = trimmedContent
        .split('---')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (trimmedContent.includes('\n\n')) {
      // Fallback to double newline
      suggestions = trimmedContent
        .split('\n\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      // Single suggestion
      suggestions = [trimmedContent];
    }

    // Clean up suggestions - remove option/draft/reply prefixes thoroughly
    suggestions = suggestions
      .map((s) => {
        return (
          s
            // Remove "Option 1:", "**Option 1:**", "Option 1 -", etc.
            .replace(/^\*{0,2}(Option|Draft|Reply|Email|Response)\s*\d*\s*[:\-\*]*\s*/gi, '')
            // Remove numbered prefixes like "1.", "1)", "1:"
            .replace(/^\d+[.):\-\s]+/g, '')
            .trim()
        );
      })
      .filter(Boolean);

    // Limit to max count
    return suggestions.slice(0, maxCount);
  }

  /**
   * Parse AI response into smart replies
   */
  private parseSmartReplies(content: string, maxCount: number): string[] {
    const trimmedContent = content.trim();
    let replies: string[] = [];

    // Try splitting by "---" first
    if (trimmedContent.includes('---')) {
      replies = trimmedContent
        .split('---')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (trimmedContent.includes('\n')) {
      // Fallback to single newline for short replies
      replies = trimmedContent
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      // Single reply
      replies = [trimmedContent];
    }

    // Clean up replies - remove prefixes thoroughly
    replies = replies
      .map((s) => {
        return (
          s
            // Remove "Option 1:", "**Reply 1:**", etc.
            .replace(/^\*{0,2}(Option|Draft|Reply|Email|Response)\s*\d*\s*[:\-\*]*\s*/gi, '')
            // Remove numbered prefixes like "1.", "1)", "1:"
            .replace(/^\d+[.):\-\s]+/g, '')
            .trim()
        );
      })
      .filter(Boolean);

    // Limit to max count
    return replies.slice(0, maxCount);
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Image Generation Service
   */
  async generateImage(userId: string, dto: GenerateImageDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      // Enhance prompt with style and quality parameters
      const enhancedPrompt = this.buildImagePrompt(dto);

      // Call database AI image generation
      const response = await this.aiProvider.generateImage(enhancedPrompt, {
        size: dto.size || '512x512',
        quality: dto.quality || 'standard',
        n: dto.count || 1,
        style: dto.style,
      });

      const processingTime = Date.now() - startTime;

      // Add debugging for undefined response
      if (!response) {
        this.logger.error('AI provider returned undefined response');
        throw new InternalServerErrorException('Image generation service returned no response');
      }

      this.logger.debug('AI response:', JSON.stringify(response, null, 2));

      // Extract image URLs - pass through queue information if present
      const imageUrlsData = this.extractImageUrlsWithQueue(response);

      // Parse size for response
      const [width, height] = (dto.size || '512x512').split('x').map(Number);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'image_generation',
        prompt: dto.prompt,
        response: imageUrlsData,
        parameters: {
          image_type: dto.image_type,
          style: dto.style,
          size: dto.size,
          quality: dto.quality,
          count: dto.count,
        },
        usage: {
          images_generated: Array.isArray(imageUrlsData)
            ? imageUrlsData.filter(
                (item: any) => typeof item === 'string' || (item && !item.queued),
              ).length
            : 0,
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        images_generated: Array.isArray(imageUrlsData)
          ? imageUrlsData.filter((item: any) => typeof item === 'string' || (item && !item.queued))
              .length
          : 0,
      });

      return {
        image_urls: imageUrlsData,
        specifications: {
          width,
          height,
          format: 'png',
          quality: dto.quality || 'standard',
        },
        generation_params: {
          style: dto.style,
          steps: dto.steps,
          guidance_scale: dto.guidance_scale,
          seed: dto.seed,
        },
        timestamp: new Date().toISOString(),
        request_id: requestId,
        usage: {
          images_generated: Array.isArray(imageUrlsData)
            ? imageUrlsData.filter(
                (item: any) => typeof item === 'string' || (item && !item.queued),
              ).length
            : 0,
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Image generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate image');
    }
  }

  /**
   * Video Generation Service
   */
  async generateVideo(userId: string, dto: GenerateVideoDto): Promise<AIVideoResponse> {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      // Enhance prompt with video-specific parameters
      const enhancedPrompt = this.buildVideoPrompt(dto);

      // Call database AI video generation (only pass supported parameters)
      const initialResponse = await this.aiProvider.generateVideo(enhancedPrompt, {
        duration: dto.duration || 4,
        aspectRatio: dto.aspect_ratio || '16:9',
        frameRate: dto.frame_rate || 24,
      });

      // Add debugging for response structure
      if (!initialResponse) {
        this.logger.error('AI provider returned undefined video response');
        throw new InternalServerErrorException('Video generation service returned no response');
      }

      this.logger.log('=== AI VIDEO RESPONSE DEBUG ===');
      this.logger.log('Response type:', typeof initialResponse);
      this.logger.log('Response keys:', Object.keys(initialResponse || {}));
      this.logger.log('Full response:', JSON.stringify(initialResponse, null, 2));
      this.logger.log('taskId value:', initialResponse.taskId);
      this.logger.log('task_id value:', initialResponse.task_id);
      this.logger.log('id value:', initialResponse.id);
      this.logger.log('jobId value:', initialResponse.jobId);
      this.logger.log('=== END DEBUG ===');

      // Check if the response already contains a video URL (synchronous generation)
      if (
        initialResponse.videoUrl &&
        initialResponse.videoUrl !== '' &&
        initialResponse.status === 'completed'
      ) {
        this.logger.log('Video generation completed immediately (synchronous)');
        const processingTime = Date.now() - startTime;
        const videoUrl = this.extractVideoUrl(initialResponse);

        // Save generation history for synchronous response
        await this.saveGenerationHistory(userId, {
          request_id: requestId,
          service_type: 'video_generation',
          prompt: dto.prompt,
          response: videoUrl,
          parameters: {
            duration: dto.duration,
            aspect_ratio: dto.aspect_ratio,
            frame_rate: dto.frame_rate,
            quality: 'standard',
            style: dto.style,
            motion_intensity: dto.motion_intensity,
          },
          usage: {
            videos_generated: 1,
            processing_time_ms: processingTime,
          },
        });

        return {
          video_url: videoUrl,
          thumbnail_url: initialResponse.thumbnailUrl || initialResponse.thumbnail_url,
          specifications: {
            duration: dto.duration || 4,
            aspect_ratio: dto.aspect_ratio || '16:9',
            frame_rate: dto.frame_rate || 24,
            quality: 'standard',
          },
          generation_params: {
            style: dto.style,
            motion_intensity: dto.motion_intensity,
            camera_movement: dto.camera_movement,
            seed: dto.seed,
          },
          timestamp: new Date().toISOString(),
          request_id: requestId,
          usage: {
            videos_generated: 1,
            processing_time_ms: processingTime,
          },
        };
      }

      // Handle queued/processing status - poll by re-generating with same prompt
      if (initialResponse.status === 'queued' || initialResponse.status === 'processing') {
        this.logger.log(`Video generation status: ${initialResponse.status}, starting polling...`);

        // Poll for completion using the same prompt
        const finalResponse = await this.pollVideoCompletionByPrompt(enhancedPrompt, {
          duration: dto.duration || 4,
          aspectRatio: dto.aspect_ratio || '16:9',
          frameRate: dto.frame_rate || 24,
        });

        const processingTime = Date.now() - startTime;
        const videoUrl = this.extractVideoUrl(finalResponse);

        // Save generation history
        await this.saveGenerationHistory(userId, {
          request_id: requestId,
          service_type: 'video_generation',
          prompt: dto.prompt,
          response: videoUrl,
          parameters: {
            duration: dto.duration,
            aspect_ratio: dto.aspect_ratio,
            frame_rate: dto.frame_rate,
            quality: 'standard',
            style: dto.style,
            motion_intensity: dto.motion_intensity,
          },
          usage: {
            videos_generated: 1,
            processing_time_ms: processingTime,
          },
        });

        return {
          video_url: videoUrl,
          thumbnail_url: finalResponse.thumbnailUrl || finalResponse.thumbnail_url,
          specifications: {
            duration: dto.duration || 4,
            aspect_ratio: dto.aspect_ratio || '16:9',
            frame_rate: dto.frame_rate || 24,
            quality: 'standard',
          },
          generation_params: {
            style: dto.style,
            motion_intensity: dto.motion_intensity,
            camera_movement: dto.camera_movement,
            seed: dto.seed,
          },
          timestamp: new Date().toISOString(),
          request_id: requestId,
          usage: {
            videos_generated: 1,
            processing_time_ms: processingTime,
          },
        };
      }

      // If we get here, the response format is unexpected
      this.logger.error('Unexpected response format:', JSON.stringify(initialResponse, null, 2));
      throw new InternalServerErrorException('Unexpected video generation response format');
    } catch (error) {
      this.logger.error(`Video generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate video');
    }
  }

  /**
   * Helper method to poll video generation completion
   */
  private async pollVideoCompletion(
    taskId: string,
    maxAttempts = 60,
    intervalMs = 5000,
  ): Promise<any> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await /* TODO: use LiveKit */ this.db.getVideoJobStatus(taskId);

        if (status.status === 'completed') {
          return status;
        }

        if (status.status === 'failed' || status.status === 'error') {
          throw new InternalServerErrorException(
            `Video generation failed: ${status.error || 'Unknown error'}`,
          );
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        attempts++;

        this.logger.debug(
          `Video generation polling attempt ${attempts}/${maxAttempts}, status: ${status.status}`,
        );
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        attempts++;
      }
    }

    throw new InternalServerErrorException('Video generation timeout - please try again later');
  }

  /**
   * Helper method to poll video generation completion by re-calling the same prompt
   */
  private async pollVideoCompletionByPrompt(
    prompt: string,
    options: any,
    maxAttempts = 60,
    intervalMs = 5000,
  ): Promise<any> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // Call the same generation request again to check status
        const status = await this.aiProvider.generateVideo(prompt, options);

        this.logger.debug(
          `Video polling attempt ${attempts + 1}/${maxAttempts}, status: ${status.status}, videoUrl: ${status.videoUrl ? 'present' : 'empty'}`,
        );

        if (status.status === 'completed' && status.videoUrl && status.videoUrl !== '') {
          this.logger.log('Video generation completed!');
          return status;
        }

        if (status.status === 'failed' || status.status === 'error') {
          throw new InternalServerErrorException(
            `Video generation failed: ${status.error || 'Unknown error'}`,
          );
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        attempts++;
      }
    }

    throw new InternalServerErrorException('Video generation timeout - please try again later');
  }

  /**
   * Helper method to extract video URL from response
   */
  private extractVideoUrl(response: any): string {
    if (!response) {
      throw new Error('No response data to extract video URL from');
    }

    // Use correct database property name
    if (response.videoUrl) {
      return response.videoUrl;
    }

    if (response.url) {
      return response.url;
    }

    if (response.data?.videoUrl) {
      return response.data.videoUrl;
    }

    throw new Error('Video URL not found in response');
  }

  /**
   * Code Generation Service
   */
  async generateCode(userId: string, dto: GenerateCodeDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      // Build comprehensive code generation prompt
      const codePrompt = this.buildCodePrompt(dto);

      const response = await this.aiProvider.generateText(codePrompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const generatedContent = this.extractTextContent(response);

      // Extract code, explanation, and examples from the response
      const { code, explanation, examples, dependencies } =
        this.parseCodeResponse(generatedContent);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'code_generation',
        prompt: dto.prompt,
        response: code,
        parameters: {
          language: dto.language,
          code_type: dto.code_type,
          framework: dto.framework,
          complexity: dto.complexity,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        code,
        language: dto.language,
        code_type: dto.code_type,
        explanation,
        examples,
        dependencies,
        timestamp: new Date().toISOString(),
        request_id: requestId,
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Code generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate code');
    }
  }

  /**
   * Translation Service
   */
  async translateText(userId: string, dto: TranslateTextDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      // Build translation prompt
      const translationPrompt = this.buildTranslationPrompt(dto);

      const response = await this.aiProvider.generateText(translationPrompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const translatedText = this.extractTextContent(response);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'translation',
        prompt: `Translate from ${dto.source_language || 'auto'} to ${dto.target_language}: ${dto.text.substring(0, 100)}...`,
        response: translatedText,
        parameters: {
          source_language: dto.source_language,
          target_language: dto.target_language,
          style: dto.style,
          context: dto.context,
        },
        usage: {
          characters_translated: dto.text.length,
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        characters_translated: dto.text.length,
      });

      return {
        translated_text: translatedText,
        source_language: dto.source_language || 'auto-detected',
        target_language: dto.target_language,
        timestamp: new Date().toISOString(),
        request_id: requestId,
        usage: {
          characters_translated: dto.text.length,
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to translate text');
    }
  }

  /**
   * Content Summarization Service
   */
  async summarizeContent(userId: string, dto: SummarizeContentDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      // Build summarization prompt
      const summarizationPrompt = this.buildSummarizationPrompt(dto);

      const response = await this.aiProvider.generateText(summarizationPrompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const summary = this.extractTextContent(response);

      // Extract key points if bullet point format
      const keyPoints =
        dto.summary_type === 'bullet_points'
          ? summary
              .split('\n')
              .filter((line) => line.trim().startsWith('•') || line.trim().startsWith('-'))
          : undefined;

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'summarization',
        prompt: `Summarize (${dto.summary_type}): ${dto.content.substring(0, 100)}...`,
        response: summary,
        parameters: {
          summary_type: dto.summary_type,
          content_type: dto.content_type,
          length: dto.length,
          focus_areas: dto.focus_areas,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        summary,
        summary_type: dto.summary_type,
        key_points: keyPoints,
        original_length: dto.content.length,
        summary_length: summary.length,
        compression_ratio: Math.round((summary.length / dto.content.length) * 100) / 100,
        timestamp: new Date().toISOString(),
        request_id: requestId,
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Summarization failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to summarize content');
    }
  }

  /**
   * AI Chat Service
   */
  async createChat(userId: string, dto: CreateChatDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();
      const sessionId = dto.session_id || uuidv4();

      // Get conversation history if session exists
      let conversationHistory = [];
      if (dto.session_id && dto.include_history) {
        const session = await this.getChatSession(userId, dto.session_id);
        conversationHistory = session?.messages || [];
      }

      // Build chat prompt with context and personality
      const messages = [
        ...(dto.system_prompt ? [{ role: 'system', content: dto.system_prompt }] : []),
        ...conversationHistory,
        { role: 'user', content: dto.message },
      ];

      const response = await this.aiProvider.generateText(this.buildChatPrompt(dto, messages), {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const aiResponse = this.extractTextContent(response);

      // Save or update chat session
      await this.saveChatMessage(userId, sessionId, {
        role: 'user',
        content: dto.message,
        timestamp: new Date().toISOString(),
      });

      await this.saveChatMessage(userId, sessionId, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          personality: dto.personality,
          context: dto.context,
          request_id: requestId,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        message: aiResponse,
        session_id: sessionId,
        role: 'assistant',
        format: dto.response_format,
        context: dto.context,
        timestamp: new Date().toISOString(),
        request_id: requestId,
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Chat generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate chat response');
    }
  }

  /**
   * Recipe Generation Service
   */
  async generateRecipe(userId: string, dto: GenerateRecipeDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      const recipePrompt = this.buildRecipePrompt(dto);

      const response = await this.aiProvider.generateText(recipePrompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const generatedContent = this.extractTextContent(response);

      // Parse the recipe response into structured format
      const recipeData = this.parseRecipeResponse(generatedContent, dto);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'recipe',
        prompt: dto.recipe_request,
        response: recipeData,
        parameters: {
          cuisine: dto.cuisine,
          meal_type: dto.meal_type,
          dietary_restrictions: dto.dietary_restrictions,
          servings: dto.servings,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        ...recipeData,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      };
    } catch (error) {
      this.logger.error(`Recipe generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate recipe');
    }
  }

  /**
   * Travel Plan Generation Service (integrating with travel module)
   */
  async generateTravelPlan(userId: string, dto: any) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      const travelPrompt = this.buildTravelPrompt(dto);

      const response = await this.aiProvider.generateText(travelPrompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const generatedContent = this.extractTextContent(response);

      // Parse travel plan response
      const travelPlan = this.parseTravelPlanResponse(generatedContent, dto);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'travel_plan',
        prompt: `Travel plan for ${dto.destinations.join(', ')} from ${dto.start_date} to ${dto.end_date}`,
        response: travelPlan,
        parameters: {
          destinations: dto.destinations,
          budget: dto.budget,
          travel_type: dto.travel_type,
          travelers_count: dto.travelers_count,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return travelPlan;
    } catch (error) {
      this.logger.error(`Travel plan generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate travel plan');
    }
  }

  /**
   * Workout Plan Generation Service
   */
  async generateWorkoutPlan(userId: string, dto: GenerateWorkoutPlanDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      const workoutPrompt = this.buildWorkoutPrompt(dto);

      const response = await this.aiProvider.generateText(workoutPrompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const generatedContent = this.extractTextContent(response);

      // Parse workout plan response
      const workoutPlan = this.parseWorkoutPlanResponse(generatedContent, dto);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'workout_plan',
        prompt: `${dto.fitness_goal} workout plan for ${dto.fitness_level} level`,
        response: workoutPlan,
        parameters: {
          fitness_goal: dto.fitness_goal,
          fitness_level: dto.fitness_level,
          days_per_week: dto.days_per_week,
          session_duration: dto.session_duration,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        ...workoutPlan,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      };
    } catch (error) {
      this.logger.error(`Workout plan generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate workout plan');
    }
  }

  /**
   * Meal Plan Generation Service
   */
  async generateMealPlan(userId: string, dto: GenerateMealPlanDto) {
    try {
      const requestId = uuidv4();
      const startTime = Date.now();

      const mealPlanPrompt = this.buildMealPlanPrompt(dto);

      const response = await this.aiProvider.generateText(mealPlanPrompt, {
        saveToDatabase: false,
      });

      const processingTime = Date.now() - startTime;
      const generatedContent = this.extractTextContent(response);

      // Parse meal plan response
      const mealPlan = this.parseMealPlanResponse(generatedContent, dto);

      // Save generation history
      await this.saveGenerationHistory(userId, {
        request_id: requestId,
        service_type: 'meal_plan',
        prompt: `${dto.days}-day meal plan with ${dto.daily_calories || 'flexible'} calories`,
        response: mealPlan,
        parameters: {
          days: dto.days,
          daily_calories: dto.daily_calories,
          dietary_restrictions: dto.dietary_restrictions,
          meals_per_day: dto.meals_per_day,
        },
        usage: {
          tokens_used: this.extractTokenUsage(response),
          processing_time_ms: processingTime,
        },
      });

      // Update user usage statistics
      await this.updateUsageStats(userId, {
        total_requests: 1,
        tokens_used: this.extractTokenUsage(response),
      });

      return {
        ...mealPlan,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      };
    } catch (error) {
      this.logger.error(`Meal plan generation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate meal plan');
    }
  }

  /**
   * Get AI Generation History
   */
  async getHistory(userId: string, query: AIQueryDto) {
    try {
      const offset = (query.page - 1) * query.limit;

      const whereConditions: any = { user_id: userId };

      if (query.service_type) {
        whereConditions.service_type = query.service_type;
      }

      if (query.search) {
        // Simple search in prompt field
        whereConditions.prompt = query.search; // This would need to be enhanced for actual search
      }

      if (query.date_from || query.date_to) {
        // Add date range filtering logic
      }

      let itemsQuery = this.db.table('ai_generations').select('*').where('user_id', '=', userId);

      if (query.service_type) {
        itemsQuery = itemsQuery.where('service_type', '=', query.service_type);
      }

      if (query.search) {
        itemsQuery = itemsQuery.where('prompt', 'like', `%${query.search}%`);
      }

      const itemsResult = await itemsQuery
        .orderBy(query.sort_by || 'created_at', query.sort_order || 'desc')
        .limit(query.limit)
        .offset(offset)
        .execute();

      let totalQuery = this.db
        .table('ai_generations')
        .select('COUNT(*) as total')
        .where('user_id', '=', userId);

      if (query.service_type) {
        totalQuery = totalQuery.where('service_type', '=', query.service_type);
      }

      if (query.search) {
        totalQuery = totalQuery.where('prompt', 'like', `%${query.search}%`);
      }

      const totalCountResult = await totalQuery.execute();

      const items = itemsResult.data || itemsResult || [];
      const totalCountData = totalCountResult.data || totalCountResult || [];
      const total = Array.isArray(totalCountData) ? totalCountData.length : 0;
      const totalPages = Math.ceil(total / query.limit);

      return {
        items: (Array.isArray(items) ? items : []).map((item) => ({
          id: item.id,
          type: item.service_type,
          prompt: item.prompt,
          content_preview: query.include_preview
            ? typeof item.response === 'string'
              ? item.response.substring(0, 200)
              : JSON.stringify(item.response).substring(0, 200)
            : undefined,
          created_at: item.created_at,
          usage: query.include_usage ? item.usage : undefined,
          metadata: query.include_metadata ? item.parameters : undefined,
        })),
        total,
        page: query.page,
        limit: query.limit,
        total_pages: totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get AI history: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve AI generation history');
    }
  }

  /**
   * Get Usage Statistics
   */
  async getUsageStats(userId: string, query: AIUsageQueryDto) {
    try {
      // This would need more sophisticated date range and aggregation logic
      const statsResult = await this.db
        .table('ai_usage_stats')
        .select('*')
        .where('user_id', '=', userId)
        .limit(1)
        .execute();

      const stats = statsResult.data?.[0] || {
        total_requests: 0,
        tokens_used: 0,
        images_generated: 0,
        characters_translated: 0,
      };

      return {
        total_requests: stats.total_requests || 0,
        tokens_used: stats.tokens_used || 0,
        images_generated: stats.images_generated || 0,
        characters_translated: stats.characters_translated || 0,
        last_reset: stats.last_reset,
        plan_limits: {
          requests_per_month: 10000, // This would come from user's plan
          tokens_per_month: 100000,
          images_per_month: 500,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get usage stats: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve usage statistics');
    }
  }

  // Private helper methods...

  private buildTextPrompt(dto: GenerateTextDto): string {
    let prompt = `Create ${dto.text_type} content about: ${dto.prompt}\n\n`;

    if (dto.tone) prompt += `Tone: ${dto.tone}\n`;
    if (dto.target_audience) prompt += `Target audience: ${dto.target_audience}\n`;
    if (dto.word_count) prompt += `Target length: approximately ${dto.word_count} words\n`;
    if (dto.language && dto.language !== 'en') prompt += `Language: ${dto.language}\n`;
    if (dto.keywords?.length) prompt += `Include these keywords: ${dto.keywords.join(', ')}\n`;
    if (dto.seo_optimized) prompt += `Optimize for SEO\n`;
    if (dto.include_cta) prompt += `Include a call-to-action\n`;
    if (dto.additional_context) prompt += `Additional context: ${dto.additional_context}\n`;

    prompt += '\nPlease create engaging, high-quality content that meets these requirements.';

    return prompt;
  }

  private buildImagePrompt(dto: GenerateImageDto): string {
    let prompt = dto.prompt;

    if (dto.style) prompt += `, ${dto.style} style`;
    if (dto.color_palette?.length) prompt += `, ${dto.color_palette.join(' ')} colors`;
    if (dto.mood?.length) prompt += `, ${dto.mood.join(' ')} mood`;
    if (dto.lighting) prompt += `, ${dto.lighting}`;
    if (dto.perspective) prompt += `, ${dto.perspective}`;
    if (dto.medium) prompt += `, ${dto.medium}`;
    if (dto.artist_reference) prompt += `, ${dto.artist_reference}`;
    if (dto.negative_prompt) prompt += ` --no ${dto.negative_prompt}`;

    return prompt;
  }

  private buildVideoPrompt(dto: GenerateVideoDto): string {
    let prompt = dto.prompt;

    if (dto.style) prompt += `, ${dto.style} style`;
    if (dto.color_palette?.length) prompt += `, ${dto.color_palette.join(' ')} colors`;
    if (dto.mood?.length) prompt += `, ${dto.mood.join(' ')} mood`;
    if (dto.lighting) prompt += `, ${dto.lighting}`;
    if (dto.environment) prompt += `, ${dto.environment}`;
    if (dto.subject) prompt += `, focusing on ${dto.subject}`;
    if (dto.camera_movement) prompt += `, ${dto.camera_movement} camera movement`;
    if (dto.motion_intensity) prompt += `, motion intensity level ${dto.motion_intensity}/10`;
    if (dto.negative_prompt) prompt += ` --no ${dto.negative_prompt}`;

    return prompt;
  }

  private buildCodePrompt(dto: GenerateCodeDto): string {
    let prompt = `Generate ${dto.language} code for: ${dto.prompt}\n\n`;

    prompt += `Code type: ${dto.code_type}\n`;
    if (dto.framework) prompt += `Framework: ${dto.framework}\n`;
    if (dto.complexity) prompt += `Complexity level: ${dto.complexity}\n`;
    if (dto.requirements?.length) prompt += `Requirements: ${dto.requirements.join(', ')}\n`;
    if (dto.dependencies?.length)
      prompt += `Use these dependencies: ${dto.dependencies.join(', ')}\n`;
    if (dto.style_guide) prompt += `Follow coding style: ${dto.style_guide}\n`;

    prompt += '\nPlease provide:\n';
    prompt += '1. Clean, well-structured code\n';
    if (dto.include_comments) prompt += '2. Detailed comments explaining the code\n';
    if (dto.include_error_handling) prompt += '3. Proper error handling\n';
    if (dto.include_validation) prompt += '4. Input validation\n';
    if (dto.include_tests) prompt += '5. Basic unit tests\n';
    prompt += '6. Brief explanation of how it works\n';

    return prompt;
  }

  private buildTranslationPrompt(dto: TranslateTextDto): string {
    let prompt = `Translate the following text to ${dto.target_language}.\n\n`;
    prompt += `TEXT TO TRANSLATE:\n${dto.text}\n\n`;

    if (dto.source_language) prompt += `Source language: ${dto.source_language}\n`;
    if (dto.style) prompt += `Translation style: ${dto.style}\n`;
    if (dto.context) prompt += `Context: ${dto.context}\n`;
    if (dto.cultural_adaptation) prompt += `Please adapt culturally for the target audience\n`;
    if (dto.preserve_formatting) prompt += `Preserve any formatting in the original text\n`;
    if (dto.glossary?.length) {
      prompt += `Use these specific translations:\n`;
      dto.glossary.forEach((term) => (prompt += `- "${term.source}" -> "${term.target}"\n`));
    }
    if (dto.notes) prompt += `Additional notes: ${dto.notes}\n`;

    prompt +=
      '\nIMPORTANT: Provide ONLY the translated text. Do NOT include quotation marks around the translation, do NOT include any explanations, labels, or preambles like "Translation:" or "Here is the translation:". Just output the pure translated text.';

    return prompt;
  }

  private buildSummarizationPrompt(dto: SummarizeContentDto): string {
    let prompt = `Create a ${dto.summary_type} summary of the following content:\n\n${dto.content}\n\n`;

    if (dto.length) prompt += `Length: ${dto.length}\n`;
    if (dto.word_count) prompt += `Target word count: ${dto.word_count} words\n`;
    if (dto.sentence_count) prompt += `Target sentence count: ${dto.sentence_count} sentences\n`;
    if (dto.focus_areas?.length) prompt += `Focus on: ${dto.focus_areas.join(', ')}\n`;
    if (dto.target_audience) prompt += `Target audience: ${dto.target_audience}\n`;
    if (dto.include_statistics) prompt += `Include key statistics and numbers\n`;
    if (dto.include_quotes) prompt += `Include important quotes\n`;
    if (dto.include_action_items) prompt += `Extract action items\n`;
    if (dto.additional_instructions)
      prompt += `Additional instructions: ${dto.additional_instructions}\n`;

    return prompt;
  }

  private buildChatPrompt(dto: CreateChatDto, messages: any[]): string {
    let systemPrompt = '';

    if (dto.personality) {
      systemPrompt += `You are an AI assistant with a ${dto.personality} personality. `;
    }

    if (dto.context) {
      systemPrompt += `You specialize in ${dto.context}. `;
    }

    systemPrompt += 'Provide helpful, accurate, and engaging responses.';

    if (dto.response_format && dto.response_format !== 'text') {
      systemPrompt += ` Format your response as ${dto.response_format}.`;
    }

    // Return the last user message with system context
    const lastUserMessage = messages[messages.length - 1];
    return `${systemPrompt}\n\nUser: ${lastUserMessage.content}`;
  }

  private buildRecipePrompt(dto: GenerateRecipeDto): string {
    let prompt = `Create a detailed recipe for ${dto.recipe_request}.\n\n`;

    if (dto.cuisine) prompt += `Cuisine: ${dto.cuisine}\n`;
    if (dto.meal_type) prompt += `Meal type: ${dto.meal_type}\n`;
    if (dto.servings) prompt += `Servings: ${dto.servings}\n`;
    if (dto.cooking_time) prompt += `Cooking time: ${dto.cooking_time} minutes\n`;
    if (dto.difficulty) prompt += `Difficulty: ${dto.difficulty}\n`;
    if (dto.dietary_restrictions?.length)
      prompt += `Dietary restrictions: ${dto.dietary_restrictions.join(', ')}\n`;
    if (dto.available_ingredients?.length)
      prompt += `Use these ingredients: ${dto.available_ingredients.join(', ')}\n`;
    if (dto.avoid_ingredients?.length) prompt += `Avoid: ${dto.avoid_ingredients.join(', ')}\n`;

    prompt += '\nPlease provide:\n';
    prompt += '1. Recipe title\n';
    prompt += '2. Brief description\n';
    prompt += '3. Detailed ingredient list with measurements\n';
    prompt += '4. Step-by-step instructions\n';
    prompt += '5. Prep time, cook time, and total time\n';
    if (dto.include_nutrition) prompt += '6. Nutritional information\n';
    if (dto.include_tips) prompt += '7. Cooking tips and tricks\n';
    if (dto.include_variations) prompt += '8. Variations or substitutions\n';

    return prompt;
  }

  private buildTravelPrompt(dto: any): string {
    let prompt = `Create a comprehensive travel plan for:\n`;
    prompt += `Destinations: ${dto.destinations.join(', ')}\n`;
    prompt += `Dates: ${dto.start_date} to ${dto.end_date}\n`;
    prompt += `Travel type: ${dto.travel_type}\n`;
    prompt += `Budget: ${dto.currency || 'USD'} ${dto.budget} (${dto.budget_range})\n`;
    prompt += `Travelers: ${dto.travelers_count}\n`;

    if (dto.traveler_ages?.length) prompt += `Ages: ${dto.traveler_ages.join(', ')}\n`;
    if (dto.accommodation_preference) prompt += `Accommodation: ${dto.accommodation_preference}\n`;
    if (dto.transportation_preference)
      prompt += `Transportation: ${dto.transportation_preference}\n`;
    if (dto.interests?.length) prompt += `Interests: ${dto.interests.join(', ')}\n`;
    if (dto.group_type) prompt += `Group type: ${dto.group_type}\n`;
    if (dto.departure_location) prompt += `Departing from: ${dto.departure_location}\n`;

    prompt += '\nInclude:\n';
    if (dto.include_flights) prompt += '- Flight recommendations\n';
    if (dto.include_accommodation) prompt += '- Accommodation suggestions\n';
    if (dto.include_activities) prompt += '- Activity recommendations\n';
    if (dto.include_restaurants) prompt += '- Restaurant suggestions\n';
    if (dto.include_itinerary) prompt += '- Detailed day-by-day itinerary\n';

    return prompt;
  }

  private buildWorkoutPrompt(dto: GenerateWorkoutPlanDto): string {
    let prompt = `Create a ${dto.plan_duration_weeks || 4}-week workout plan for:\n`;
    prompt += `Fitness goal: ${dto.fitness_goal}\n`;
    prompt += `Fitness level: ${dto.fitness_level}\n`;
    prompt += `Frequency: ${dto.days_per_week || 3} days per week\n`;
    prompt += `Session duration: ${dto.session_duration || 45} minutes\n`;

    if (dto.age) prompt += `Age: ${dto.age}\n`;
    if (dto.preferred_workouts?.length)
      prompt += `Preferred workouts: ${dto.preferred_workouts.join(', ')}\n`;
    if (dto.available_equipment?.length)
      prompt += `Available equipment: ${dto.available_equipment.join(', ')}\n`;
    if (dto.focus_areas?.length) prompt += `Focus areas: ${dto.focus_areas.join(', ')}\n`;
    if (dto.limitations?.length) prompt += `Limitations: ${dto.limitations.join(', ')}\n`;

    prompt += '\nProvide:\n';
    prompt += '1. Weekly schedule breakdown\n';
    prompt += '2. Specific exercises with sets, reps, and rest periods\n';
    prompt += '3. Exercise descriptions and form cues\n';
    if (dto.include_warmup_cooldown) prompt += '4. Warm-up and cool-down routines\n';
    if (dto.include_progression) prompt += '5. Progression guidelines for each week\n';

    return prompt;
  }

  private buildMealPlanPrompt(dto: GenerateMealPlanDto): string {
    let prompt = `Create a ${dto.days || 7}-day meal plan with:\n`;

    if (dto.daily_calories) prompt += `Daily calories: ${dto.daily_calories}\n`;
    prompt += `Meals per day: ${dto.meals_per_day || 3}\n`;
    if (dto.include_snacks) prompt += `Include snacks\n`;
    if (dto.dietary_restrictions?.length)
      prompt += `Dietary restrictions: ${dto.dietary_restrictions.join(', ')}\n`;
    if (dto.preferred_cuisines?.length)
      prompt += `Preferred cuisines: ${dto.preferred_cuisines.join(', ')}\n`;
    if (dto.foods_to_include?.length) prompt += `Include: ${dto.foods_to_include.join(', ')}\n`;
    if (dto.foods_to_avoid?.length) prompt += `Avoid: ${dto.foods_to_avoid.join(', ')}\n`;
    if (dto.cooking_skill) prompt += `Cooking skill: ${dto.cooking_skill}\n`;
    if (dto.max_prep_time) prompt += `Max prep time: ${dto.max_prep_time} minutes\n`;
    if (dto.daily_budget) prompt += `Daily budget: $${dto.daily_budget}\n`;

    prompt += '\nProvide:\n';
    prompt += '1. Daily meal breakdown with recipes\n';
    prompt += '2. Ingredient lists for each recipe\n';
    prompt += '3. Simple cooking instructions\n';
    if (dto.include_grocery_list) prompt += '4. Consolidated grocery list\n';
    if (dto.include_nutrition) prompt += '5. Nutritional breakdown per meal and daily totals\n';

    return prompt;
  }

  private parseCodeResponse(content: string) {
    // This is a simplified parser - you'd want more sophisticated parsing
    const lines = content.split('\n');
    let code = '';
    let explanation = '';
    const examples: string[] = [];
    const dependencies: string[] = [];

    let currentSection = 'code';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('explanation') || lowerLine.includes('how it works')) {
        currentSection = 'explanation';
        continue;
      } else if (lowerLine.includes('example') || lowerLine.includes('usage')) {
        currentSection = 'examples';
        continue;
      } else if (lowerLine.includes('dependencies') || lowerLine.includes('requirements')) {
        currentSection = 'dependencies';
        continue;
      }

      switch (currentSection) {
        case 'code':
          if (!line.startsWith('#') && !lowerLine.includes('explanation')) {
            code += line + '\n';
          }
          break;
        case 'explanation':
          explanation += line + '\n';
          break;
        case 'examples':
          if (line.trim()) examples.push(line);
          break;
        case 'dependencies':
          if (line.trim()) dependencies.push(line);
          break;
      }
    }

    return {
      code: code.trim(),
      explanation: explanation.trim(),
      examples: examples.length ? examples : undefined,
      dependencies: dependencies.length ? dependencies : undefined,
    };
  }

  private parseRecipeResponse(content: string, dto: GenerateRecipeDto) {
    // Simplified recipe parser - would need more sophisticated parsing
    const lines = content.split('\n').filter((line) => line.trim());

    return {
      title: dto.recipe_request,
      description: 'AI-generated recipe',
      ingredients: [
        { name: 'Ingredient 1', amount: '1 cup', unit: 'cup' },
        { name: 'Ingredient 2', amount: '2 tbsp', unit: 'tbsp' },
      ],
      instructions: [
        'Step 1: Prepare ingredients',
        'Step 2: Follow cooking method',
        'Step 3: Serve and enjoy',
      ],
      metadata: {
        prep_time: 15,
        cook_time: dto.cooking_time || 30,
        total_time: 45,
        servings: dto.servings || 4,
        difficulty: dto.difficulty || 'intermediate',
        cuisine: dto.cuisine,
        meal_type: dto.meal_type,
      },
    };
  }

  private parseTravelPlanResponse(content: string, dto: any) {
    // Simplified travel plan parser
    return {
      title: `Travel Plan: ${dto.destinations.join(' & ')}`,
      destinations: dto.destinations,
      start_date: dto.start_date,
      end_date: dto.end_date,
      duration_days: Math.ceil(
        (new Date(dto.end_date).getTime() - new Date(dto.start_date).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      travelers_count: dto.travelers_count,
      budget: {
        total: dto.budget,
        currency: dto.currency || 'USD',
        per_person: Math.round(dto.budget / dto.travelers_count),
      },
      itinerary: [
        {
          day: 1,
          date: dto.start_date,
          activities: ['Arrival', 'Check-in', 'City orientation'],
          accommodation: 'Recommended hotel',
          meals: ['Welcome dinner'],
        },
      ],
      recommendations: {
        flights: dto.include_flights ? ['Flight option 1', 'Flight option 2'] : undefined,
        accommodations: dto.include_accommodation ? ['Hotel 1', 'Hotel 2'] : undefined,
        activities: dto.include_activities ? ['Activity 1', 'Activity 2'] : undefined,
        restaurants: dto.include_restaurants ? ['Restaurant 1', 'Restaurant 2'] : undefined,
      },
    };
  }

  private parseWorkoutPlanResponse(content: string, dto: GenerateWorkoutPlanDto) {
    // Simplified workout plan parser
    return {
      title: `${dto.fitness_goal} Workout Plan`,
      overview: `${dto.plan_duration_weeks || 4}-week program for ${dto.fitness_level} level`,
      schedule: [
        {
          day: 1,
          day_name: 'Monday',
          workout_type: 'Strength Training',
          exercises: [
            {
              name: 'Push-ups',
              sets: 3,
              reps: '10-15',
              rest: '60 seconds',
            },
          ],
          estimated_duration: dto.session_duration || 45,
        },
      ],
      metadata: {
        duration_weeks: dto.plan_duration_weeks || 4,
        days_per_week: dto.days_per_week || 3,
        fitness_level: dto.fitness_level,
        primary_goal: dto.fitness_goal,
        equipment_needed: dto.available_equipment || ['none'],
      },
    };
  }

  private parseMealPlanResponse(content: string, dto: GenerateMealPlanDto) {
    // Simplified meal plan parser
    return {
      title: `${dto.days || 7}-Day Meal Plan`,
      overview: `Customized meal plan with ${dto.daily_calories || 'flexible'} calories per day`,
      meal_plan: [
        {
          day: 1,
          day_name: 'Monday',
          meals: [
            {
              meal_type: 'breakfast',
              recipe_name: 'Healthy Breakfast',
              ingredients: ['Oats', 'Berries', 'Milk'],
              instructions: ['Combine ingredients', 'Mix well', 'Serve'],
              prep_time: 10,
              calories: dto.daily_calories ? Math.round(dto.daily_calories * 0.25) : undefined,
            },
          ],
          daily_nutrition: dto.include_nutrition
            ? {
                total_calories: dto.daily_calories || 2000,
                protein: '20%',
                carbs: '50%',
                fat: '30%',
              }
            : undefined,
        },
      ],
      grocery_list: dto.include_grocery_list
        ? [
            {
              category: 'Dairy',
              items: ['Milk', 'Eggs', 'Yogurt'],
            },
          ]
        : undefined,
      metadata: {
        duration_days: dto.days || 7,
        daily_calories: dto.daily_calories,
        dietary_restrictions: dto.dietary_restrictions || [],
        cuisines: dto.preferred_cuisines || [],
      },
    };
  }

  private calculateSummaryTokens(dto: SummarizeContentDto): number {
    switch (dto.length) {
      case 'very_short':
        return 100;
      case 'short':
        return 200;
      case 'medium':
        return 400;
      case 'long':
        return 600;
      case 'detailed':
        return 1000;
      case 'custom':
        return dto.word_count ? dto.word_count * 1.5 : 400;
      default:
        return 400;
    }
  }

  private async saveGenerationHistory(userId: string, data: any) {
    try {
      await this.db.insert('ai_generations', {
        id: data.request_id,
        user_id: userId,
        service_type: data.service_type,
        prompt: data.prompt,
        response: JSON.stringify(data.response),
        parameters: JSON.stringify(data.parameters || {}),
        usage: JSON.stringify(data.usage || {}),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Failed to save generation history: ${error.message}`);
    }
  }

  private async updateUsageStats(userId: string, stats: any) {
    try {
      const existingResult = await this.db
        .table('ai_usage_stats')
        .select('*')
        .where('user_id', '=', userId)
        .limit(1)
        .execute();

      const existing = existingResult.data?.[0];

      if (existing) {
        await this.db.update('ai_usage_stats', existing.id, {
          total_requests: (existing.total_requests || 0) + (stats.total_requests || 0),
          tokens_used: (existing.tokens_used || 0) + (stats.tokens_used || 0),
          images_generated: (existing.images_generated || 0) + (stats.images_generated || 0),
          characters_translated:
            (existing.characters_translated || 0) + (stats.characters_translated || 0),
          updated_at: new Date().toISOString(),
        });
      } else {
        await this.db.insert('ai_usage_stats', {
          user_id: userId,
          total_requests: stats.total_requests || 0,
          tokens_used: stats.tokens_used || 0,
          images_generated: stats.images_generated || 0,
          characters_translated: stats.characters_translated || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to update usage stats: ${error.message}`);
    }
  }

  private async saveChatMessage(userId: string, sessionId: string, message: any) {
    try {
      // First ensure chat session exists
      const existingSessionResult = await this.db
        .table('chat_sessions')
        .select('*')
        .where('id', '=', sessionId)
        .where('user_id', '=', userId)
        .limit(1)
        .execute();

      const existingSession = existingSessionResult.data?.[0];

      if (!existingSession) {
        await this.db.insert('chat_sessions', {
          id: sessionId,
          user_id: userId,
          title: 'AI Chat Session',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Save the message
      await this.db.insert('chat_messages', {
        id: uuidv4(),
        session_id: sessionId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        metadata: JSON.stringify(message.metadata || {}),
      });

      // Update session's updated_at
      await this.db.update('chat_sessions', sessionId, {
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Failed to save chat message: ${error.message}`);
    }
  }

  private async getChatSession(userId: string, sessionId: string) {
    try {
      const sessionResult = await this.db
        .table('chat_sessions')
        .select('*')
        .where('id', '=', sessionId)
        .where('user_id', '=', userId)
        .limit(1)
        .execute();

      const session = sessionResult.data?.[0];

      if (!session) return null;

      const messagesResult = await this.db
        .table('chat_messages')
        .select('*')
        .where('session_id', '=', sessionId)
        .orderBy('timestamp', 'asc')
        .execute();

      const messages = messagesResult.data || messagesResult || [];

      return {
        ...session,
        messages: (Array.isArray(messages) ? messages : []).map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
        })),
      };
    } catch (error) {
      this.logger.warn(`Failed to get chat session: ${error.message}`);
      return null;
    }
  }

  /**
   * Helper methods to extract content from database responses
   */
  private extractTextContent(response: any): string {
    // Handle null/undefined responses
    if (!response) {
      this.logger.warn('Received null or undefined response from AI generation');
      return '';
    }

    // Handle different possible response formats from database
    if (typeof response === 'string') {
      return response;
    }

    // database response format (priority)
    if (response?.text) {
      return response.text;
    }

    // OpenAI-style response
    if (response?.choices && response.choices[0]) {
      return response.choices[0].message?.content || response.choices[0].text || '';
    }

    // Direct content property
    if (response?.content) {
      return response.content;
    }

    // Generated text property
    if (response?.generated_text) {
      return response.generated_text;
    }

    // Fallback to JSON string if it's an object
    if (typeof response === 'object') {
      return JSON.stringify(response);
    }

    return '';
  }

  /**
   * Extract image URLs with queue information
   * This method preserves queue information from database responses
   */
  private extractImageUrlsWithQueue(response: any): any[] {
    // Handle null/undefined response
    if (!response) {
      this.logger.error('extractImageUrlsWithQueue: Response is null or undefined');
      throw new Error('No response data to extract image URLs from');
    }

    // Handle different possible response formats
    if (Array.isArray(response)) {
      return response;
    }

    // database response format (priority) - preserve queue info
    if (response.images && Array.isArray(response.images)) {
      return response.images;
    }

    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // Single image response
    if (response.url) {
      return [response.url];
    }

    if (response.image_url) {
      return [response.image_url];
    }

    // If it's a queued job response, return queue info
    if (response.jobId || response.queueJobId || response.status === 'queued') {
      return [
        {
          url: response.url || '',
          queueJobId: response.jobId || response.queueJobId,
          queued: true,
        },
      ];
    }

    return [];
  }

  private extractImageUrls(response: any): string[] {
    // Handle null/undefined response
    if (!response) {
      this.logger.error('extractImageUrls: Response is null or undefined');
      throw new Error('No response data to extract image URLs from');
    }

    // Handle different possible response formats
    if (Array.isArray(response)) {
      return response.map((item) => item.url || item).filter(Boolean);
    }

    // database response format (priority)
    if (response.images && Array.isArray(response.images)) {
      return response.images.map((img: any) => img.url || img).filter(Boolean);
    }

    if (response.data && Array.isArray(response.data)) {
      return response.data.map((img: any) => img.url || img).filter(Boolean);
    }

    if (response.url) {
      return [response.url];
    }

    if (response.image_url) {
      return [response.image_url];
    }

    // If it's a job response, return empty for now
    if (response.jobId || response.status) {
      return [];
    }

    return [];
  }

  private extractTokenUsage(response: any): number {
    // Handle different usage formats
    if (response.usage) {
      return (
        response.usage.total_tokens ||
        response.usage.tokens ||
        (response.usage.prompt_tokens || 0) + (response.usage.completion_tokens || 0) ||
        0
      );
    }

    if (response.tokens_used) {
      return response.tokens_used;
    }

    if (response.token_count) {
      return response.token_count;
    }

    return 0;
  }
}
