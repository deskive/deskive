import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export class InviteMemberDto {
  @ApiProperty({ description: 'Email address to invite', example: 'user@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'Role for the invited member',
    enum: WorkspaceRole,
    example: WorkspaceRole.MEMBER,
    required: false
  })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole = WorkspaceRole.MEMBER;

  @ApiProperty({ description: 'Custom invitation message', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}