import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';
import {
  OpenAIConnectDto,
  OpenAIConnectionDto,
  OpenAIModelDto,
  ChatCompletionRequestDto,
  ChatCompletionResponseDto,
  CreateEmbeddingRequestDto,
  CreateEmbeddingResponseDto,
  TextCompletionRequestDto,
  TextCompletionResponseDto,
} from './dto/openai.dto';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly OPENAI_API_BASE = 'https://api.openai.com/v1';

  constructor(private readonly db: DatabaseService) {}

  // ==================== Connection Management ====================

  /**
   * Save OpenAI API key connection for user
   */
  async saveConnection(
    userId: string,
    workspaceId: string,
    dto: OpenAIConnectDto,
  ): Promise<OpenAIConnectionDto> {
    // First, validate the API key by making a test request
    const isValid = await this.validateApiKey(dto.apiKey, dto.organizationId);
    if (!isValid) {
      throw new BadRequestException('Invalid OpenAI API key. Please check your key and try again.');
    }

    // Check if user already has a connection in this workspace
    const existingConnection = await this.db.findOne('openai_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      api_key: dto.apiKey, // In production, this should be encrypted
      organization_id: dto.organizationId || null,
      is_validated: true,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      await this.db.update('openai_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      connection = await this.db.insert('openai_connections', connectionData);
    }

    this.logger.log(`OpenAI connected for user ${userId} in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Get user's OpenAI connection in this workspace
   */
  async getConnection(userId: string, workspaceId: string): Promise<OpenAIConnectionDto | null> {
    const connection = await this.db.findOne('openai_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      return null;
    }

    return this.transformConnection(connection);
  }

  /**
   * Disconnect user's OpenAI in this workspace
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = await this.db.findOne('openai_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('OpenAI connection not found');
    }

    // Soft delete the connection
    await this.db.update('openai_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`OpenAI disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Test the current connection by validating the stored API key
   */
  async testConnection(
    userId: string,
    workspaceId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const connection = await this.db.findOne('openai_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      return {
        success: false,
        error: 'OpenAI not connected. Please connect your API key first.',
      };
    }

    const isValid = await this.validateApiKey(connection.api_key, connection.organization_id);
    if (isValid) {
      return {
        success: true,
        message: 'OpenAI API key is valid and working.',
      };
    }

    return {
      success: false,
      error: 'OpenAI API key is invalid or expired. Please reconnect.',
    };
  }

  /**
   * Validate an API key by making a test request
   */
  private async validateApiKey(apiKey: string, organizationId?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };

      if (organizationId) {
        headers['OpenAI-Organization'] = organizationId;
      }

      const response = await axios.get(`${this.OPENAI_API_BASE}/models`, {
        headers,
        timeout: 10000,
      });

      return response.status === 200;
    } catch (error) {
      this.logger.warn(`API key validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get API key for making requests
   */
  private async getApiKeyAndHeaders(
    userId: string,
    workspaceId: string,
  ): Promise<{ apiKey: string; headers: Record<string, string> }> {
    const connection = await this.db.findOne('openai_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException(
        'OpenAI not connected. Please connect your OpenAI API key first.',
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${connection.api_key}`,
      'Content-Type': 'application/json',
    };

    if (connection.organization_id) {
      headers['OpenAI-Organization'] = connection.organization_id;
    }

    // Update last used timestamp
    await this.db.update('openai_connections', connection.id, {
      last_used_at: new Date().toISOString(),
    });

    return { apiKey: connection.api_key, headers };
  }

  // ==================== OpenAI API Operations ====================

  /**
   * List available models
   */
  async listModels(userId: string, workspaceId: string): Promise<OpenAIModelDto[]> {
    const { headers } = await this.getApiKeyAndHeaders(userId, workspaceId);

    try {
      const response = await axios.get(`${this.OPENAI_API_BASE}/models`, { headers });

      const models = response.data.data || [];
      return models.map((model: any) => ({
        id: model.id,
        object: model.object,
        created: model.created,
        ownedBy: model.owned_by,
      }));
    } catch (error) {
      this.logger.error('Failed to list models:', error.response?.data || error.message);
      this.handleOpenAIError(error);
    }
  }

  /**
   * Create chat completion
   */
  async chatCompletion(
    userId: string,
    workspaceId: string,
    dto: ChatCompletionRequestDto,
  ): Promise<ChatCompletionResponseDto> {
    const { headers } = await this.getApiKeyAndHeaders(userId, workspaceId);

    try {
      const requestBody: any = {
        model: dto.model || 'gpt-3.5-turbo',
        messages: dto.messages,
      };

      if (dto.temperature !== undefined) requestBody.temperature = dto.temperature;
      if (dto.maxTokens !== undefined) requestBody.max_tokens = dto.maxTokens;
      if (dto.topP !== undefined) requestBody.top_p = dto.topP;
      if (dto.frequencyPenalty !== undefined) requestBody.frequency_penalty = dto.frequencyPenalty;
      if (dto.presencePenalty !== undefined) requestBody.presence_penalty = dto.presencePenalty;
      if (dto.stop) requestBody.stop = dto.stop;
      if (dto.user) requestBody.user = dto.user;

      const response = await axios.post(`${this.OPENAI_API_BASE}/chat/completions`, requestBody, {
        headers,
      });

      return this.transformChatCompletionResponse(response.data);
    } catch (error) {
      this.logger.error('Failed to create chat completion:', error.response?.data || error.message);
      this.handleOpenAIError(error);
    }
  }

  /**
   * Create embeddings
   */
  async createEmbedding(
    userId: string,
    workspaceId: string,
    dto: CreateEmbeddingRequestDto,
  ): Promise<CreateEmbeddingResponseDto> {
    const { headers } = await this.getApiKeyAndHeaders(userId, workspaceId);

    try {
      const requestBody = {
        model: dto.model || 'text-embedding-ada-002',
        input: dto.input,
        user: dto.user,
      };

      const response = await axios.post(`${this.OPENAI_API_BASE}/embeddings`, requestBody, {
        headers,
      });

      return this.transformEmbeddingResponse(response.data);
    } catch (error) {
      this.logger.error('Failed to create embedding:', error.response?.data || error.message);
      this.handleOpenAIError(error);
    }
  }

  /**
   * Create text completion (legacy completions endpoint)
   */
  async textCompletion(
    userId: string,
    workspaceId: string,
    dto: TextCompletionRequestDto,
  ): Promise<TextCompletionResponseDto> {
    const { headers } = await this.getApiKeyAndHeaders(userId, workspaceId);

    try {
      const requestBody: any = {
        model: dto.model || 'gpt-3.5-turbo-instruct',
        prompt: dto.prompt,
      };

      if (dto.maxTokens !== undefined) requestBody.max_tokens = dto.maxTokens;
      if (dto.temperature !== undefined) requestBody.temperature = dto.temperature;
      if (dto.topP !== undefined) requestBody.top_p = dto.topP;
      if (dto.n !== undefined) requestBody.n = dto.n;
      if (dto.stop) requestBody.stop = dto.stop;
      if (dto.user) requestBody.user = dto.user;

      const response = await axios.post(`${this.OPENAI_API_BASE}/completions`, requestBody, {
        headers,
      });

      return this.transformTextCompletionResponse(response.data);
    } catch (error) {
      this.logger.error('Failed to create text completion:', error.response?.data || error.message);
      this.handleOpenAIError(error);
    }
  }

  // ==================== Helper Methods ====================

  private handleOpenAIError(error: any): never {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        throw new BadRequestException(
          'Invalid or expired OpenAI API key. Please reconnect your OpenAI account.',
        );
      }
      if (status === 429) {
        throw new BadRequestException('OpenAI rate limit exceeded. Please try again later.');
      }
      if (status === 500 || status === 503) {
        throw new BadRequestException(
          'OpenAI service is temporarily unavailable. Please try again later.',
        );
      }

      throw new BadRequestException(`OpenAI API error: ${message}`);
    }

    throw new BadRequestException(
      'Failed to connect to OpenAI. Please check your internet connection.',
    );
  }

  private transformConnection(connection: any): OpenAIConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      organizationId: connection.organization_id,
      isValidated: connection.is_validated,
      isActive: connection.is_active,
      lastUsedAt: connection.last_used_at,
      createdAt: connection.created_at,
      updatedAt: connection.updated_at,
    };
  }

  private transformChatCompletionResponse(data: any): ChatCompletionResponseDto {
    return {
      id: data.id,
      object: data.object,
      created: data.created,
      model: data.model,
      choices: data.choices.map((choice: any) => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
          name: choice.message.name,
        },
        finishReason: choice.finish_reason,
      })),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  private transformEmbeddingResponse(data: any): CreateEmbeddingResponseDto {
    return {
      object: data.object,
      data: data.data.map((item: any) => ({
        object: item.object,
        index: item.index,
        embedding: item.embedding,
      })),
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  private transformTextCompletionResponse(data: any): TextCompletionResponseDto {
    return {
      id: data.id,
      object: data.object,
      created: data.created,
      model: data.model,
      choices: data.choices.map((choice: any) => ({
        text: choice.text,
        index: choice.index,
        logprobs: choice.logprobs,
        finishReason: choice.finish_reason,
      })),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}
