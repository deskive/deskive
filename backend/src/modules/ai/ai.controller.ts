import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Param,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AIService } from './ai.service';
import { AIRouterService, RouterAgentResponse } from './ai-router.service';

// Import DTOs
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
  UpdateChatSessionDto,
  AIQueryDto,
  AIUsageQueryDto,
  ChatSessionQueryDto,
  UsagePeriod,
  // Email Suggestion DTOs
  GenerateEmailSuggestionsDto,
  GenerateSmartRepliesDto,
  EmailSuggestionResponseDto,
  SmartReplyResponseDto,
  // Description Suggestion DTOs
  GenerateDescriptionSuggestionsDto,
  DescriptionSuggestionResponseDto,
  // Response DTOs
  AITextResponse,
  AIImageResponse,
  AIVideoResponse,
  AICodeResponse,
  AITranslationResponse,
  AISummaryResponse,
  AIChatResponse,
  AIRecipeResponse,
  AIWorkoutResponse,
  AIMealPlanResponse,
  AIHistoryResponse,
  AIUsageStats,
} from './dto';

// Travel DTO - removed since travel module doesn't exist

@ApiTags('AI Services')
@Controller('ai')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly aiRouterService: AIRouterService,
  ) {}

  /**
   * Unified AI Assistant Endpoint
   * Routes commands to the appropriate specialized agent using AI
   */
  @Post('assistant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process command with AI assistant',
    description:
      'Intelligently routes natural language commands to the appropriate specialized agent (projects, tasks, notes, calendar, files, or chat)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['prompt', 'workspaceId'],
      properties: {
        prompt: { type: 'string', description: 'Natural language command' },
        workspaceId: { type: 'string', description: 'Workspace ID' },
        currentView: { type: 'string', description: 'Current UI view as a hint (optional)' },
        projectId: { type: 'string', description: 'Project ID for task operations (optional)' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Command processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async processAssistantCommand(
    @Body() body: { prompt: string; workspaceId: string; currentView?: string; projectId?: string },
    @CurrentUser('sub') userId: string,
  ): Promise<RouterAgentResponse> {
    if (!body.prompt || !body.workspaceId) {
      throw new BadRequestException('prompt and workspaceId are required');
    }

    return await this.aiRouterService.processCommand(
      {
        prompt: body.prompt,
        workspaceId: body.workspaceId,
        currentView: body.currentView,
        projectId: body.projectId,
      },
      userId,
    );
  }

  /**
   * Text Generation Endpoints
   */
  @Post('generate-text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate text content',
    description:
      'Generate various types of text content including blog posts, social media, emails, articles, and more',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Text generated successfully',
    type: AITextResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async generateText(
    @Body() dto: GenerateTextDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AITextResponse> {
    return await this.aiService.generateText(userId, dto);
  }

  /**
   * Email Suggestion Endpoints
   */
  @Post('email-suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate email suggestions',
    description:
      'Generate multiple email body suggestions for composing new emails or replying to existing ones',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email suggestions generated successfully',
    type: EmailSuggestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async generateEmailSuggestions(
    @Body() dto: GenerateEmailSuggestionsDto,
    @CurrentUser('sub') userId: string,
  ): Promise<EmailSuggestionResponseDto> {
    return await this.aiService.generateEmailSuggestions(userId, dto);
  }

  @Post('smart-replies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate smart replies',
    description: 'Generate short, one-line smart reply suggestions for quick email responses',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Smart replies generated successfully',
    type: SmartReplyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async generateSmartReplies(
    @Body() dto: GenerateSmartRepliesDto,
    @CurrentUser('sub') userId: string,
  ): Promise<SmartReplyResponseDto> {
    return await this.aiService.generateSmartReplies(userId, dto);
  }

  /**
   * Description Suggestion Endpoint (Unified for task, project, event, meeting)
   */
  @Post('description-suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate description suggestions',
    description:
      'Generate multiple description suggestions for tasks, projects, events, or meetings based on title',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Description suggestions generated successfully',
    type: DescriptionSuggestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async generateDescriptionSuggestions(
    @Body() dto: GenerateDescriptionSuggestionsDto,
    @CurrentUser('sub') userId: string,
  ): Promise<DescriptionSuggestionResponseDto> {
    return await this.aiService.generateDescriptionSuggestions(userId, dto);
  }

  /**
   * Image Generation Endpoints
   */
  @Post('generate-image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate images',
    description:
      'Generate AI images including artwork, logos, illustrations, and more with customizable styles and parameters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image generated successfully',
    type: AIImageResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async generateImage(
    @Body() dto: GenerateImageDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AIImageResponse> {
    return await this.aiService.generateImage(userId, dto);
  }

  /**
   * Video Generation Endpoints
   */
  @Post('generate-video')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate videos',
    description:
      'Generate AI videos including animations, timelapses, cinematic scenes with customizable duration, style, and motion parameters. Returns the video URL directly.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Video generated successfully',
    type: AIVideoResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async generateVideo(
    @Body() dto: GenerateVideoDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AIVideoResponse> {
    return await this.aiService.generateVideo(userId, dto);
  }

  /**
   * Code Generation Endpoints
   */
  @Post('generate-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate code',
    description:
      'Generate code in various programming languages with support for different frameworks, patterns, and complexity levels',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Code generated successfully',
    type: AICodeResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async generateCode(
    @Body() dto: GenerateCodeDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AICodeResponse> {
    return await this.aiService.generateCode(userId, dto);
  }

  /**
   * Translation Endpoints
   */
  @Post('translate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Translate text',
    description:
      'Translate text between different languages with context-aware translation and style options',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Text translated successfully',
    type: AITranslationResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async translateText(
    @Body() dto: TranslateTextDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AITranslationResponse> {
    return await this.aiService.translateText(userId, dto);
  }

  @Post('translate-batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch translate multiple texts',
    description: 'Translate multiple text items in a single request for efficiency',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch translation completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async batchTranslate(@Body() dto: BatchTranslateDto, @CurrentUser('sub') userId: string) {
    const results = [];
    for (const text of dto.texts) {
      const translationDto: TranslateTextDto = {
        text,
        target_language: dto.target_language,
        source_language: dto.source_language,
        style: dto.style,
        context: dto.context,
        preserve_formatting: dto.preserve_formatting,
        glossary: dto.glossary,
      };

      const result = await this.aiService.translateText(userId, translationDto);
      results.push(result);
    }

    return {
      translations: results,
      total_items: dto.texts.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Summarization Endpoints
   */
  @Post('summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Summarize content',
    description:
      'Generate summaries of various content types with customizable length and focus areas',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content summarized successfully',
    type: AISummaryResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async summarizeContent(
    @Body() dto: SummarizeContentDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AISummaryResponse> {
    return await this.aiService.summarizeContent(userId, dto);
  }

  @Post('summarize-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Summarize content from URL',
    description: 'Fetch and summarize content from a given URL',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'URL content summarized successfully',
    type: AISummaryResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid URL or content could not be fetched',
  })
  async summarizeUrl(@Body() dto: SummarizeUrlDto, @CurrentUser('sub') userId: string) {
    // This would need URL content fetching logic
    // For now, return an error indicating it's not implemented
    throw new Error('URL summarization not yet implemented');
  }

  /**
   * AI Chat Endpoints
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI chat conversation',
    description: 'Engage in AI-powered conversations with customizable personality and context',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat response generated successfully',
    type: AIChatResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async createChat(
    @Body() dto: CreateChatDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AIChatResponse> {
    return await this.aiService.createChat(userId, dto);
  }

  @Post('chat-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Continue chat with history',
    description: 'Continue a conversation by providing the full message history',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat response with history generated successfully',
    type: AIChatResponse,
  })
  async chatWithHistory(@Body() dto: ChatHistoryDto, @CurrentUser('sub') userId: string) {
    // Convert ChatHistoryDto to CreateChatDto format
    const createChatDto: CreateChatDto = {
      message: dto.message,
      personality: dto.personality,
      context: dto.context,
      response_format: dto.response_format,
      max_tokens: dto.max_tokens,
      temperature: dto.temperature,
      include_history: true,
    };

    return await this.aiService.createChat(userId, createChatDto);
  }

  @Get('chat-sessions')
  @ApiOperation({
    summary: 'Get chat sessions',
    description: "Retrieve user's chat sessions with pagination and filtering",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  async getChatSessions(@Query() query: ChatSessionQueryDto, @CurrentUser('sub') userId: string) {
    // This would need implementation in the service
    return { message: 'Chat sessions endpoint not yet implemented' };
  }

  @Get('chat-sessions/:sessionId')
  @ApiOperation({
    summary: 'Get specific chat session',
    description: 'Retrieve a specific chat session with its message history',
  })
  async getChatSession(@Param('sessionId') sessionId: string, @CurrentUser('sub') userId: string) {
    // This would need implementation in the service
    return { message: 'Get chat session endpoint not yet implemented' };
  }

  /**
   * Specialized Generation Endpoints
   */
  @Post('recipe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate recipes',
    description:
      'Generate detailed recipes with ingredients, instructions, and nutritional information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipe generated successfully',
    type: AIRecipeResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async generateRecipe(
    @Body() dto: GenerateRecipeDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AIRecipeResponse> {
    return await this.aiService.generateRecipe(userId, dto);
  }

  @Post('travel-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate travel plans',
    description:
      'Create comprehensive travel itineraries with accommodations, activities, and recommendations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Travel plan generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  // Travel plan functionality disabled - requires travel module
  async generateTravelPlan(@Body() dto: any, @CurrentUser('sub') userId: string) {
    throw new BadRequestException('Travel plan functionality is not available');
  }

  @Post('workout-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate workout plans',
    description: 'Create personalized workout routines based on fitness goals and preferences',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workout plan generated successfully',
    type: AIWorkoutResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async generateWorkoutPlan(
    @Body() dto: GenerateWorkoutPlanDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AIWorkoutResponse> {
    return await this.aiService.generateWorkoutPlan(userId, dto);
  }

  @Post('meal-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate meal plans',
    description:
      'Create detailed meal plans with recipes and grocery lists based on dietary preferences',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meal plan generated successfully',
    type: AIMealPlanResponse,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  async generateMealPlan(
    @Body() dto: GenerateMealPlanDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AIMealPlanResponse> {
    return await this.aiService.generateMealPlan(userId, dto);
  }

  /**
   * History and Analytics Endpoints
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get AI generation history',
    description: "Retrieve user's AI generation history with filtering and pagination",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'service_type',
    required: false,
    enum: [
      'text_generation',
      'image_generation',
      'code_generation',
      'translation',
      'summarization',
      'chat',
      'recipe',
      'travel_plan',
      'workout_plan',
      'meal_plan',
    ],
    description: 'Filter by AI service type',
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in prompts' })
  @ApiQuery({
    name: 'date_from',
    required: false,
    type: String,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({ name: 'date_to', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({
    name: 'sort_order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiQuery({
    name: 'include_preview',
    required: false,
    type: Boolean,
    description: 'Include content preview (default: true)',
  })
  @ApiQuery({
    name: 'include_usage',
    required: false,
    type: Boolean,
    description: 'Include usage stats (default: false)',
  })
  @ApiQuery({
    name: 'include_metadata',
    required: false,
    type: Boolean,
    description: 'Include metadata (default: false)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI generation history retrieved successfully',
    type: AIHistoryResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async getHistory(
    @Query() query: AIQueryDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AIHistoryResponse> {
    return await this.aiService.getHistory(userId, query);
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Get usage statistics',
    description: "Retrieve user's AI service usage statistics and limits",
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'all_time'],
    description: 'Usage period (default: monthly)',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Custom start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Custom end date (ISO 8601)',
  })
  @ApiQuery({
    name: 'detailed',
    required: false,
    type: Boolean,
    description: 'Include detailed breakdown (default: false)',
  })
  @ApiQuery({
    name: 'include_costs',
    required: false,
    type: Boolean,
    description: 'Include cost information (default: false)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage statistics retrieved successfully',
    type: AIUsageStats,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async getUsageStats(
    @Query() query: AIUsageQueryDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AIUsageStats> {
    return await this.aiService.getUsageStats(userId, query);
  }

  /**
   * Health Check and Info Endpoints
   */
  @Get('health')
  @ApiOperation({
    summary: 'AI service health check',
    description: 'Check the health and availability of AI services',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI services are healthy',
  })
  async healthCheck() {
    return {
      status: 'healthy',
      services: {
        text_generation: 'available',
        image_generation: 'available',
        code_generation: 'available',
        translation: 'available',
        summarization: 'available',
        chat: 'available',
        specialized_generation: 'available',
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Get('models')
  @ApiOperation({
    summary: 'Get available AI models',
    description: 'List all available AI models and their capabilities',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available models retrieved successfully',
  })
  async getAvailableModels() {
    return {
      text_models: [
        {
          name: 'gpt-4-turbo',
          description: 'Most capable model for text generation',
          max_tokens: 4096,
          supports: ['text_generation', 'code_generation', 'translation', 'summarization', 'chat'],
        },
        {
          name: 'gpt-3.5-turbo',
          description: 'Fast and efficient model for general text tasks',
          max_tokens: 2048,
          supports: ['text_generation', 'translation', 'summarization', 'chat'],
        },
      ],
      image_models: [
        {
          name: 'dall-e-3',
          description: 'High-quality image generation',
          max_resolution: '1024x1024',
          supports: ['image_generation'],
        },
        {
          name: 'stable-diffusion',
          description: 'Versatile image generation with style control',
          max_resolution: '1024x1024',
          supports: ['image_generation'],
        },
      ],
      specialized_models: [
        {
          name: 'recipe-assistant',
          description: 'Specialized in recipe generation',
          supports: ['recipe_generation'],
        },
        {
          name: 'fitness-coach',
          description: 'Specialized in workout planning',
          supports: ['workout_plan_generation'],
        },
        {
          name: 'travel-planner',
          description: 'Specialized in travel itinerary creation',
          supports: ['travel_plan_generation'],
        },
      ],
    };
  }

  @Get('limits')
  @ApiOperation({
    summary: 'Get user limits and quotas',
    description: "Get current user's AI service limits and remaining quotas",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User limits retrieved successfully',
  })
  async getUserLimits(@CurrentUser('sub') userId: string) {
    const usage = await this.aiService.getUsageStats(userId, { period: UsagePeriod.MONTHLY });

    return {
      user_id: userId,
      plan: 'premium', // This would come from user's subscription
      current_usage: usage,
      limits: {
        requests_per_month: 10000,
        tokens_per_month: 100000,
        images_per_month: 500,
        translations_per_month: 50000, // characters
      },
      remaining: {
        requests: Math.max(0, 10000 - (usage.total_requests || 0)),
        tokens: Math.max(0, 100000 - (usage.tokens_used || 0)),
        images: Math.max(0, 500 - (usage.images_generated || 0)),
        translations: Math.max(0, 50000 - (usage.characters_translated || 0)),
      },
      reset_date: '2024-02-01T00:00:00Z', // Next billing cycle
      timestamp: new Date().toISOString(),
    };
  }
}
