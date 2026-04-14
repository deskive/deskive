import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== Connection DTOs ====================

export class OpenAIConnectDto {
  @ApiProperty({ description: 'OpenAI API key' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'OpenAI organization ID (optional)' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class OpenAIConnectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ description: 'User ID who owns this connection' })
  userId: string;

  @ApiPropertyOptional({ description: 'OpenAI organization ID if provided' })
  organizationId?: string;

  @ApiProperty({ description: 'Whether the API key has been validated' })
  isValidated: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last time the connection was used' })
  lastUsedAt?: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  updatedAt?: string;
}

export class OpenAIConnectionStatusDto {
  @ApiProperty({ description: 'Whether user has a connection' })
  connected: boolean;

  @ApiPropertyOptional({ type: OpenAIConnectionDto })
  connection?: OpenAIConnectionDto;
}

// ==================== Model DTOs ====================

export class OpenAIModelDto {
  @ApiProperty({ description: 'Model ID (e.g., gpt-4, gpt-3.5-turbo)' })
  id: string;

  @ApiProperty({ description: 'Object type' })
  object: string;

  @ApiProperty({ description: 'Model creation timestamp' })
  created: number;

  @ApiProperty({ description: 'Owner organization' })
  ownedBy: string;
}

export class ListModelsResponseDto {
  @ApiProperty({ type: [OpenAIModelDto] })
  models: OpenAIModelDto[];
}

// ==================== Chat Completion DTOs ====================

export class ChatMessageDto {
  @ApiProperty({
    enum: ['system', 'user', 'assistant', 'function'],
    description: 'Role of the message author',
  })
  @IsString()
  role: 'system' | 'user' | 'assistant' | 'function';

  @ApiProperty({ description: 'Content of the message' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Name of the function (for function role)' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ChatCompletionRequestDto {
  @ApiProperty({
    description: 'Model to use (e.g., gpt-4, gpt-3.5-turbo)',
    default: 'gpt-3.5-turbo',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ type: [ChatMessageDto], description: 'Messages for the conversation' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({ description: 'Temperature (0-2)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Maximum tokens to generate' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Top P sampling (0-1)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({ description: 'Frequency penalty (-2 to 2)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @ApiPropertyOptional({ description: 'Presence penalty (-2 to 2)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;

  @ApiPropertyOptional({ description: 'Stop sequences' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop?: string[];

  @ApiPropertyOptional({ description: 'User identifier for abuse detection' })
  @IsOptional()
  @IsString()
  user?: string;
}

export class ChatCompletionChoiceDto {
  @ApiProperty({ description: 'Choice index' })
  index: number;

  @ApiProperty({ type: ChatMessageDto, description: 'Generated message' })
  message: ChatMessageDto;

  @ApiProperty({ description: 'Finish reason (stop, length, etc.)' })
  finishReason: string;
}

export class ChatCompletionUsageDto {
  @ApiProperty({ description: 'Tokens in the prompt' })
  promptTokens: number;

  @ApiProperty({ description: 'Tokens in the completion' })
  completionTokens: number;

  @ApiProperty({ description: 'Total tokens used' })
  totalTokens: number;
}

export class ChatCompletionResponseDto {
  @ApiProperty({ description: 'Completion ID' })
  id: string;

  @ApiProperty({ description: 'Object type' })
  object: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created: number;

  @ApiProperty({ description: 'Model used' })
  model: string;

  @ApiProperty({ type: [ChatCompletionChoiceDto], description: 'Generated choices' })
  choices: ChatCompletionChoiceDto[];

  @ApiProperty({ type: ChatCompletionUsageDto, description: 'Token usage' })
  usage: ChatCompletionUsageDto;
}

// ==================== Embeddings DTOs ====================

export class CreateEmbeddingRequestDto {
  @ApiProperty({ description: 'Text input(s) to embed' })
  @IsArray()
  @IsString({ each: true })
  input: string[];

  @ApiPropertyOptional({ description: 'Model to use', default: 'text-embedding-ada-002' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'User identifier for abuse detection' })
  @IsOptional()
  @IsString()
  user?: string;
}

export class EmbeddingDataDto {
  @ApiProperty({ description: 'Object type' })
  object: string;

  @ApiProperty({ description: 'Index of the embedding' })
  index: number;

  @ApiProperty({ type: [Number], description: 'Embedding vector' })
  embedding: number[];
}

export class EmbeddingUsageDto {
  @ApiProperty({ description: 'Tokens used in prompt' })
  promptTokens: number;

  @ApiProperty({ description: 'Total tokens used' })
  totalTokens: number;
}

export class CreateEmbeddingResponseDto {
  @ApiProperty({ description: 'Object type' })
  object: string;

  @ApiProperty({ type: [EmbeddingDataDto], description: 'Embedding data' })
  data: EmbeddingDataDto[];

  @ApiProperty({ description: 'Model used' })
  model: string;

  @ApiProperty({ type: EmbeddingUsageDto, description: 'Token usage' })
  usage: EmbeddingUsageDto;
}

// ==================== Text Completion DTOs (Legacy) ====================

export class TextCompletionRequestDto {
  @ApiProperty({ description: 'Model to use (e.g., gpt-3.5-turbo-instruct)' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: 'Prompt text' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'Maximum tokens to generate' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Temperature (0-2)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Top P sampling (0-1)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({ description: 'Number of completions to generate', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  n?: number;

  @ApiPropertyOptional({ description: 'Stop sequences' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop?: string[];

  @ApiPropertyOptional({ description: 'User identifier for abuse detection' })
  @IsOptional()
  @IsString()
  user?: string;
}

export class TextCompletionChoiceDto {
  @ApiProperty({ description: 'Generated text' })
  text: string;

  @ApiProperty({ description: 'Choice index' })
  index: number;

  @ApiPropertyOptional({ description: 'Log probabilities' })
  logprobs?: any;

  @ApiProperty({ description: 'Finish reason' })
  finishReason: string;
}

export class TextCompletionResponseDto {
  @ApiProperty({ description: 'Completion ID' })
  id: string;

  @ApiProperty({ description: 'Object type' })
  object: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created: number;

  @ApiProperty({ description: 'Model used' })
  model: string;

  @ApiProperty({ type: [TextCompletionChoiceDto], description: 'Generated choices' })
  choices: TextCompletionChoiceDto[];

  @ApiProperty({ type: ChatCompletionUsageDto, description: 'Token usage' })
  usage: ChatCompletionUsageDto;
}
