import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiProperty({
    description: 'New Stripe price ID to change the subscription plan',
    example: 'price_9876543210',
  })
  @IsString()
  priceId: string;
}
