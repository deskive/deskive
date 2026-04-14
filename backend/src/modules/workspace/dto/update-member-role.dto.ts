import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray, IsOptional } from 'class-validator';
import { WorkspaceRole } from './invite-member.dto';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: WorkspaceRole,
    example: WorkspaceRole.ADMIN,
  })
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;

  @ApiProperty({
    description: 'Additional permissions',
    example: ['manage_projects', 'manage_files'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}
