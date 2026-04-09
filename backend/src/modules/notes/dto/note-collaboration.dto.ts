import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

/**
 * DTO for joining a note collaboration session
 */
export class JoinNoteDto {
  @ApiProperty({ description: 'Note ID to join' })
  @IsString()
  noteId: string;
}

/**
 * DTO for leaving a note collaboration session
 */
export class LeaveNoteDto {
  @ApiProperty({ description: 'Note ID to leave' })
  @IsString()
  noteId: string;
}

/**
 * DTO for Yjs sync step 1 (requesting state)
 */
export class SyncStep1Dto {
  @ApiProperty({ description: 'Note ID' })
  @IsString()
  noteId: string;

  @ApiProperty({ description: 'State vector encoded as base64' })
  @IsString()
  stateVector: string;
}

/**
 * DTO for Yjs document update
 */
export class NoteUpdateDto {
  @ApiProperty({ description: 'Note ID' })
  @IsString()
  noteId: string;

  @ApiProperty({ description: 'Yjs update encoded as base64' })
  @IsString()
  update: string;
}

/**
 * DTO for awareness update (cursor position, user presence)
 */
export class AwarenessUpdateDto {
  @ApiProperty({ description: 'Note ID' })
  @IsString()
  noteId: string;

  @ApiProperty({ description: 'Awareness update encoded as base64' })
  @IsString()
  update: string;
}

/**
 * DTO for cursor position
 */
export class CursorPositionDto {
  @ApiProperty({ description: 'Note ID' })
  @IsString()
  noteId: string;

  @ApiProperty({ description: 'Cursor index position' })
  @IsNumber()
  index: number;

  @ApiProperty({ description: 'Selection length (0 for just cursor)', required: false })
  @IsNumber()
  @IsOptional()
  length?: number;
}

/**
 * Represents a user in a collaboration session
 */
export interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursorIndex?: number;
  selectionLength?: number;
  joinedAt: string;
}

/**
 * Response for presence data
 */
export interface NotePresenceResponse {
  noteId: string;
  users: CollaborationUser[];
}

/**
 * Event emitted when a user joins
 */
export interface UserJoinedEvent {
  noteId: string;
  user: CollaborationUser;
}

/**
 * Event emitted when a user leaves
 */
export interface UserLeftEvent {
  noteId: string;
  userId: string;
}

/**
 * Predefined cursor colors for collaboration
 */
export const CURSOR_COLORS = [
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#00BCD4', // Cyan
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#F44336', // Red
];
