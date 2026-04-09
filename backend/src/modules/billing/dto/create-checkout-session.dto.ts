import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Stripe price ID for the subscription plan',
    example: 'price_1234567890',
  })
  @IsString()
  priceId: string;

  @ApiProperty({
    description: 'Number of days for trial period',
    example: 14,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trialPeriodDays?: number;

  @ApiProperty({
    description: 'Success URL to redirect after successful payment',
    example: 'https://app.deskive.com/billing/success',
    required: false,
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({
    description: 'Cancel URL to redirect if user cancels',
    example: 'https://app.deskive.com/billing/cancel',
    required: false,
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
