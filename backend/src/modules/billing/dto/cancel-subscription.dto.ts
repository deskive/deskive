import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    description:
      'Whether to cancel at the end of the billing period or immediately. If true, subscription remains active until period end.',
    example: true,
    default: true,
  })
  @IsBoolean()
  cancelAtPeriodEnd: boolean = true;
}
