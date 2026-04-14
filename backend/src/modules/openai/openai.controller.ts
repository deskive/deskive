import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OpenAIService } from './openai.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  OpenAIConnectDto,
  ChatCompletionRequestDto,
  CreateEmbeddingRequestDto,
  TextCompletionRequestDto,
} from './dto/openai.dto';

@ApiTags('openai')
@Controller('workspaces/:workspaceId/openai')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class OpenAIController {
  constructor(private readonly openaiService: OpenAIService) {}

  // ==================== Connection Endpoints ====================

  @Post('connect')
  @ApiOperation({ summary: 'Connect OpenAI by providing API key' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'OpenAI connected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid API key' })
  async connect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: OpenAIConnectDto,
  ) {
    const connection = await this.openaiService.saveConnection(userId, workspaceId, dto);
    return {
      data: connection,
      message: 'OpenAI connected successfully',
    };
  }

  @Get('connection')
  @ApiOperation({ summary: 'Get current OpenAI connection status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection details or null if not connected' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connection = await this.openaiService.getConnection(userId, workspaceId);
    return {
      data: {
        connected: !!connection,
        connection,
      },
      message: connection ? 'Connected' : 'Not connected',
    };
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect your OpenAI connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async disconnect(@Param('workspaceId') workspaceId: string, @CurrentUser('sub') userId: string) {
    await this.openaiService.disconnect(userId, workspaceId);
    return {
      data: null,
      message: 'OpenAI disconnected successfully',
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test the OpenAI API key connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.openaiService.testConnection(userId, workspaceId);
    return {
      data: result,
      message: result.success ? 'Connection test passed' : 'Connection test failed',
    };
  }

  // ==================== Model Endpoints ====================

  @Get('models')
  @ApiOperation({ summary: 'List available OpenAI models' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of available models' })
  @ApiResponse({ status: 404, description: 'OpenAI not connected' })
  async listModels(@Param('workspaceId') workspaceId: string, @CurrentUser('sub') userId: string) {
    const models = await this.openaiService.listModels(userId, workspaceId);
    return {
      data: { models },
      message: 'Models retrieved successfully',
    };
  }

  // ==================== Chat Completion Endpoints ====================

  @Post('chat/completions')
  @ApiOperation({ summary: 'Create a chat completion' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Chat completion created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or API error' })
  @ApiResponse({ status: 404, description: 'OpenAI not connected' })
  async chatCompletion(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ChatCompletionRequestDto,
  ) {
    const completion = await this.openaiService.chatCompletion(userId, workspaceId, dto);
    return {
      data: completion,
      message: 'Chat completion created successfully',
    };
  }

  // ==================== Embeddings Endpoints ====================

  @Post('embeddings')
  @ApiOperation({ summary: 'Create embeddings for text input' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Embeddings created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or API error' })
  @ApiResponse({ status: 404, description: 'OpenAI not connected' })
  async createEmbedding(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateEmbeddingRequestDto,
  ) {
    const embedding = await this.openaiService.createEmbedding(userId, workspaceId, dto);
    return {
      data: embedding,
      message: 'Embeddings created successfully',
    };
  }

  // ==================== Text Completion Endpoints (Legacy) ====================

  @Post('completions')
  @ApiOperation({ summary: 'Create a text completion (legacy)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Text completion created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or API error' })
  @ApiResponse({ status: 404, description: 'OpenAI not connected' })
  async textCompletion(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TextCompletionRequestDto,
  ) {
    const completion = await this.openaiService.textCompletion(userId, workspaceId, dto);
    return {
      data: completion,
      message: 'Text completion created successfully',
    };
  }
}
