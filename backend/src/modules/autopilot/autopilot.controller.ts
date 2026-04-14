import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Param,
  Logger,
  Res,
  Req,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AutoPilotService } from './autopilot.service';
import { ScheduledActionsService, ScheduledAction } from './scheduled-actions.service';
import {
  ExecuteCommandDto,
  AutoPilotResponseDto,
  GetHistoryDto,
  ConversationMessage,
  ActionFeedbackDto,
  AutoPilotCapability,
  SmartSuggestionsResponseDto,
} from './dto/autopilot.dto';

@ApiTags('AutoPilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autopilot')
export class AutoPilotController {
  private readonly logger = new Logger(AutoPilotController.name);

  constructor(
    private readonly autoPilotService: AutoPilotService,
    private readonly scheduledActionsService: ScheduledActionsService,
  ) {}

  @Post('execute')
  @ApiOperation({
    summary: 'Execute AutoPilot command',
    description: 'Process a natural language command and execute the corresponding actions',
  })
  @ApiResponse({
    status: 200,
    description: 'Command executed successfully',
    type: AutoPilotResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid command' })
  async executeCommand(
    @Body() dto: ExecuteCommandDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AutoPilotResponseDto> {
    this.logger.log(
      `[AutoPilot] Execute command request - userId: ${userId}, command: ${dto.command?.substring(0, 50)}...`,
    );
    try {
      const result = await this.autoPilotService.executeCommand(dto, userId);
      this.logger.log(`[AutoPilot] Execute command completed - success: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error(`[AutoPilot] Execute command error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('execute/stream')
  @ApiOperation({
    summary: 'Execute AutoPilot command with streaming',
    description: 'Process a natural language command and stream the response in real-time',
  })
  async executeCommandStream(
    @Body() dto: ExecuteCommandDto,
    @CurrentUser('sub') userId: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    this.logger.log(
      `[AutoPilot] Stream execute request - userId: ${userId}, command: ${dto.command?.substring(0, 50)}...`,
    );

    // Get user language from Accept-Language header or default to 'en'
    const acceptLanguage = req.headers['accept-language'] || 'en';
    const userLanguage = acceptLanguage.split(',')[0].split('-')[0]; // Extract primary language code (e.g., 'ja' from 'ja-JP')
    this.logger.log(`[AutoPilot] User language detected: ${userLanguage}`);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      // Stream callback to send events to client
      const onStream = (event: { type: string; data: any }) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Execute with streaming
      const result = await this.autoPilotService.executeCommandStream(
        dto,
        userId,
        onStream,
        userLanguage,
      );

      // Send final result
      res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      this.logger.error(`[AutoPilot] Stream execute error: ${error.message}`, error.stack);
      res.write(`data: ${JSON.stringify({ type: 'error', data: { message: error.message } })}\n\n`);
      res.end();
    }
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Preview AutoPilot actions',
    description: 'Preview what actions would be taken without executing them',
  })
  @ApiResponse({ status: 200, description: 'Actions previewed', type: AutoPilotResponseDto })
  async previewCommand(
    @Body() dto: ExecuteCommandDto,
    @CurrentUser('sub') userId: string,
  ): Promise<AutoPilotResponseDto> {
    return this.autoPilotService.executeCommand({ ...dto, executeActions: false }, userId);
  }

  @Get('history/:sessionId')
  @ApiOperation({
    summary: 'Get conversation history',
    description: 'Retrieve the conversation history for a session',
  })
  @ApiResponse({ status: 200, description: 'Conversation history', type: [ConversationMessage] })
  async getHistory(
    @Param('sessionId') sessionId: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: number,
  ): Promise<ConversationMessage[]> {
    return this.autoPilotService.getHistory(sessionId, userId, limit);
  }

  @Post('feedback')
  @ApiOperation({
    summary: 'Provide feedback on action',
    description: 'Submit feedback on whether an action was helpful',
  })
  @ApiResponse({ status: 200, description: 'Feedback submitted' })
  async provideFeedback(
    @Body() dto: ActionFeedbackDto,
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    return this.autoPilotService.saveFeedback(dto, userId);
  }

  @Get('capabilities')
  @ApiOperation({
    summary: 'Get AutoPilot capabilities',
    description: 'List all available tools and what AutoPilot can do',
  })
  @ApiResponse({ status: 200, description: 'List of capabilities', type: [AutoPilotCapability] })
  async getCapabilities(): Promise<AutoPilotCapability[]> {
    return this.autoPilotService.getCapabilities();
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get smart suggestions',
    description:
      'Get contextual suggestions based on user data (overdue tasks, upcoming events, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of smart suggestions',
    type: SmartSuggestionsResponseDto,
  })
  async getSmartSuggestions(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<SmartSuggestionsResponseDto> {
    this.logger.log(
      `[AutoPilot] Get smart suggestions - userId: ${userId}, workspaceId: ${workspaceId}`,
    );
    return this.autoPilotService.getSmartSuggestions(userId, workspaceId);
  }

  @Get('test-ai')
  @ApiOperation({
    summary: 'Test AI connection',
    description: 'Test if the AI service is working',
  })
  async testAI(): Promise<{ success: boolean; message: string }> {
    this.logger.log('[AutoPilot] Testing AI connection...');
    try {
      const result = await this.autoPilotService.testAIConnection();
      return result;
    } catch (error) {
      this.logger.error(`[AutoPilot] AI test error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  @Post('sessions/new')
  @ApiOperation({
    summary: 'Create new session',
    description: 'Start a new AutoPilot conversation session',
  })
  @ApiResponse({ status: 200, description: 'New session created' })
  async createSession(
    @Body() body: { workspaceId: string },
    @CurrentUser('sub') userId: string,
  ): Promise<{ sessionId: string }> {
    return this.autoPilotService.createSession(body.workspaceId, userId);
  }

  @Post('sessions/resume')
  @ApiOperation({
    summary: 'Get or resume session',
    description:
      'Resume an existing session or create a new one if none exists. This ensures the user continues their previous conversation.',
  })
  @ApiResponse({ status: 200, description: 'Session ID returned' })
  async getOrCreateSession(
    @Body() body: { workspaceId: string },
    @CurrentUser('sub') userId: string,
  ): Promise<{ sessionId: string; isNew: boolean }> {
    return this.autoPilotService.getOrCreateSession(body.workspaceId, userId);
  }

  @Post('sessions/:sessionId/clear')
  @ApiOperation({
    summary: 'Clear session memory',
    description: 'Clear the conversation memory for a session',
  })
  @ApiResponse({ status: 200, description: 'Session cleared' })
  async clearSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    return this.autoPilotService.clearSession(sessionId, userId);
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'List all sessions',
    description: 'Get all conversation sessions for the current user in a workspace',
  })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async listSessions(
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit: number,
    @CurrentUser('sub') userId: string,
  ): Promise<
    {
      id: string;
      sessionId: string;
      title: string;
      messageCount: number;
      createdAt: string;
      updatedAt: string;
    }[]
  > {
    return this.autoPilotService.getUserSessions(workspaceId, userId, limit || 20);
  }

  @Post('sessions/:sessionId/delete')
  @ApiOperation({
    summary: 'Delete session',
    description: 'Delete a conversation session permanently',
  })
  @ApiResponse({ status: 200, description: 'Session deleted' })
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    return this.autoPilotService.deleteSession(sessionId, userId);
  }

  @Post('extract-pdf')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Extract text from PDF',
    description: 'Upload a PDF file and extract its text content',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'PDF text extracted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or extraction failed' })
  async extractPdfText(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ): Promise<{ text: string; numPages: number; info: any }> {
    this.logger.log(
      `[AutoPilot] PDF extraction request - userId: ${userId}, file: ${file?.originalname}`,
    );

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    try {
      const result = await this.autoPilotService.extractPdfText(file.buffer);
      return result;
    } catch (error) {
      this.logger.error(`[AutoPilot] PDF extraction error: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to extract PDF: ${error.message}`);
    }
  }

  @Get('scheduled-actions')
  @ApiOperation({
    summary: 'Get pending scheduled actions',
    description: 'Get all pending scheduled actions for a user in a workspace',
  })
  @ApiResponse({ status: 200, description: 'List of scheduled actions' })
  async getScheduledActions(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: ScheduledAction[] }> {
    this.logger.log(`[AutoPilot] >>>>>> GET SCHEDULED ACTIONS API CALLED <<<<<<`);
    this.logger.log(
      `[AutoPilot] Get scheduled actions - userId: ${userId}, workspaceId: ${workspaceId}`,
    );
    if (!workspaceId) {
      this.logger.error(`[AutoPilot] workspaceId is missing!`);
      throw new BadRequestException('workspaceId is required');
    }
    // Get actions for this specific user in this workspace
    const actions = await this.scheduledActionsService.getPendingActions(workspaceId, userId);
    this.logger.log(`[AutoPilot] Returning ${actions.length} scheduled actions to client`);
    return { data: actions };
  }

  @Post('scheduled-actions/:actionId/cancel')
  @ApiOperation({
    summary: 'Cancel a scheduled action',
    description: 'Cancel a pending scheduled action',
  })
  @ApiResponse({ status: 200, description: 'Action cancelled' })
  async cancelScheduledAction(
    @Param('actionId') actionId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `[AutoPilot] Cancel scheduled action - actionId: ${actionId}, userId: ${userId}`,
    );
    const success = await this.scheduledActionsService.cancelAction(actionId, userId);
    return { success };
  }

  @Post('scheduled-actions/trigger')
  @ApiOperation({
    summary: 'Manually trigger scheduled actions processing',
    description: 'Debug endpoint to manually trigger processing of due scheduled actions',
  })
  @ApiResponse({ status: 200, description: 'Processing triggered' })
  async triggerScheduledActions(): Promise<{ processed: number }> {
    this.logger.log('[AutoPilot] Manual trigger of scheduled actions processing');
    return this.scheduledActionsService.triggerProcessing();
  }

  @Get('scheduled-actions/debug')
  @ApiOperation({
    summary: 'Debug: Get ALL scheduled actions',
    description:
      'Debug endpoint to get ALL scheduled actions regardless of status (no auth required for debugging)',
  })
  @ApiResponse({ status: 200, description: 'All scheduled actions' })
  async debugGetAllActions(@Query('workspaceId') workspaceId?: string): Promise<{
    data: ScheduledAction[];
    count: number;
    workspaceBreakdown: Record<string, number>;
  }> {
    this.logger.log(`[AutoPilot] Debug: Getting ALL scheduled actions`);
    const actions = await this.scheduledActionsService.getAllActions(workspaceId);

    // Count actions per workspace
    const workspaceBreakdown: Record<string, number> = {};
    for (const action of actions) {
      workspaceBreakdown[action.workspaceId] = (workspaceBreakdown[action.workspaceId] || 0) + 1;
    }

    return { data: actions, count: actions.length, workspaceBreakdown };
  }
}
