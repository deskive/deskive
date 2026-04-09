import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsInt, Min, Max, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogPostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoMetaTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoMetaDescription?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  publish?: boolean;
}

export class UpdateBlogPostDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoMetaTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoMetaDescription?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  publish?: boolean;
}

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  authorName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  authorEmail: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string;
}

export class CreateRatingDto {
  @ApiProperty({ description: 'Rating from 1 to 5 stars', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Written review (optional)' })
  @IsString()
  @IsOptional()
  review?: string;

  @ApiPropertyOptional({ description: 'User name (if not logged in)' })
  @IsString()
  @IsOptional()
  userName?: string;

  @ApiPropertyOptional({ description: 'User email (if not logged in)' })
  @IsEmail()
  @IsOptional()
  userEmail?: string;
}
