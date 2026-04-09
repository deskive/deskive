import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class VerifyAppleReceiptDto {
  @ApiProperty({
    description: 'Base64 encoded App Store receipt data',
    example: 'MIIT...',
  })
  @IsString()
  @IsNotEmpty()
  receiptData: string;

  @ApiProperty({
    description: 'Product ID of the purchased subscription',
    example: 'starter_monthly',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Transaction ID from Apple',
    example: '1000000123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
