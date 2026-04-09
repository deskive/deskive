import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyGooglePurchaseDto {
  @ApiProperty({
    description: 'Purchase token from Google Play',
    example: 'opaque-token-string...',
  })
  @IsString()
  @IsNotEmpty()
  purchaseToken: string;

  @ApiProperty({
    description: 'Product ID of the purchased subscription',
    example: 'starter_monthly',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Android package name',
    example: 'com.deskive.app',
  })
  @IsString()
  @IsNotEmpty()
  packageName: string;
}
