import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactFormDto {
  @ApiProperty({ description: 'Name of the person contacting', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Company name (optional)', example: 'Acme Inc', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @ApiProperty({
    description: 'Subject of the inquiry',
    example: 'general',
    enum: ['general', 'sales', 'support', 'partnership', 'other'],
  })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'Message content',
    example: 'I would like to learn more about your product.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;
}
