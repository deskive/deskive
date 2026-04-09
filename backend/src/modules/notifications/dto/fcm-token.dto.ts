import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
}

/**
 * DTO for registering FCM token (Flutter app login)
 */
export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging token',
    example: 'fGHJ123...xyz789',
  })
  @IsString()
  @IsNotEmpty()
  fcm_token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsEnum(DevicePlatform)
  @IsNotEmpty()
  platform: DevicePlatform;

  @ApiProperty({
    description: 'Device name/model',
    example: 'Samsung Galaxy S23',
    required: false,
  })
  @IsString()
  @IsOptional()
  device_name?: string;

  @ApiProperty({
    description: 'Unique device identifier',
    example: 'abc123-device-id',
    required: false,
  })
  @IsString()
  @IsOptional()
  device_id?: string;

  @ApiProperty({
    description: 'App version',
    example: '1.0.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  app_version?: string;
}

/**
 * DTO for unregistering FCM token (Flutter app logout)
 */
export class UnregisterFcmTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging token to unregister',
    example: 'fGHJ123...xyz789',
  })
  @IsString()
  @IsNotEmpty()
  fcm_token: string;
}

/**
 * Response DTO for FCM token operations
 */
export class FcmTokenResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Token ID if registration was successful',
    example: 'uuid-here',
    required: false,
  })
  token_id?: string;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'FCM token registered successfully',
  })
  message: string;
}
