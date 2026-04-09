import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadKeyDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Base64 encoded public key' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ description: 'Device ID' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Device name', required: false })
  @IsString()
  @IsOptional()
  deviceName?: string;
}

export class GetPublicKeysDto {
  @ApiProperty({ description: 'List of user IDs', type: [String] })
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];
}

export class AddConversationKeyDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: 'User ID (recipient)' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Encrypted conversation key' })
  @IsString()
  @IsNotEmpty()
  encryptedKey: string;

  @ApiProperty({ description: 'User ID who created/shared the key', required: false })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiProperty({ description: 'Key version', required: false })
  @IsOptional()
  keyVersion?: number;
}
