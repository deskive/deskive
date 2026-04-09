import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TextType {
  BLOG_POST = 'blog_post',
  SOCIAL_MEDIA = 'social_media',
  EMAIL = 'email',
  ARTICLE = 'article',
  PRODUCT_DESCRIPTION = 'product_description',
  AD_COPY = 'ad_copy',
  PRESS_RELEASE = 'press_release',
  NEWSLETTER = 'newsletter',
  CREATIVE_WRITING = 'creative_writing',
  TECHNICAL_DOCUMENTATION = 'technical_documentation',
  GENERAL = 'general'
}

export enum ToneOfVoice {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
  CONVERSATIONAL = 'conversational',
  PERSUASIVE = 'persuasive',
  EDUCATIONAL = 'educational',
  HUMOROUS = 'humorous',
  INSPIRING = 'inspiring',
  URGENT = 'urgent'
}

export enum TargetAudience {
  GENERAL_PUBLIC = 'general_public',
  PROFESSIONALS = 'professionals',
  STUDENTS = 'students',
  CHILDREN = 'children',
  SENIORS = 'seniors',
  MILLENNIALS = 'millennials',
  GEN_Z = 'gen_z',
  BUSINESS_OWNERS = 'business_owners',
  TECHNICAL_EXPERTS = 'technical_experts',
  CUSTOMERS = 'customers'
}

export class GenerateTextDto {
  @ApiProperty({ description: 'The prompt or topic for text generation', example: 'Write about sustainable living practices' })
  @IsString()
  prompt: string;

  @ApiProperty({ 
    description: 'Type of text to generate',
    enum: TextType,
    example: TextType.BLOG_POST
  })
  @IsEnum(TextType)
  text_type: TextType;

  @ApiPropertyOptional({ 
    description: 'Tone of voice for the content',
    enum: ToneOfVoice,
    example: ToneOfVoice.FRIENDLY
  })
  @IsOptional()
  @IsEnum(ToneOfVoice)
  tone?: ToneOfVoice;

  @ApiPropertyOptional({ 
    description: 'Target audience',
    enum: TargetAudience,
    example: TargetAudience.GENERAL_PUBLIC
  })
  @IsOptional()
  @IsEnum(TargetAudience)
  target_audience?: TargetAudience;

  @ApiPropertyOptional({ description: 'Desired length in words', example: 500 })
  @IsOptional()
  @IsNumber()
  word_count?: number;

  @ApiPropertyOptional({ description: 'Language for the content', example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Keywords to include in the content', example: ['sustainability', 'environment', 'green living'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Include SEO optimization', default: false })
  @IsOptional()
  @IsBoolean()
  seo_optimized?: boolean;

  @ApiPropertyOptional({ description: 'Include call-to-action', default: false })
  @IsOptional()
  @IsBoolean()
  include_cta?: boolean;

  @ApiPropertyOptional({ description: 'Additional context or instructions' })
  @IsOptional()
  @IsString()
  additional_context?: string;

  @ApiPropertyOptional({ description: 'Custom temperature for creativity (0-1)', example: 0.7 })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  temperature?: number;

  @ApiPropertyOptional({ description: 'Maximum number of tokens to generate', example: 1000 })
  @IsOptional()
  @IsNumber()
  max_tokens?: number;
}