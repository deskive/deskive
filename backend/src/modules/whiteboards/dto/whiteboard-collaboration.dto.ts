import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsObject } from 'class-validator';

/**
 * DTO for joining a whiteboard collaboration session
 */
export class JoinWhiteboardDto {
  @ApiProperty({ description: 'Whiteboard session ID to join' })
  @IsString()
  sessionId: string;
}

/**
 * DTO for leaving a whiteboard collaboration session
 */
export class LeaveWhiteboardDto {
  @ApiProperty({ description: 'Whiteboard session ID to leave' })
  @IsString()
  sessionId: string;
}

/**
 * DTO for Yjs document update
 */
export class WhiteboardUpdateDto {
  @ApiProperty({ description: 'Whiteboard session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Yjs update encoded as base64' })
  @IsString()
  update: string;
}

/**
 * DTO for awareness update (pointer position, user presence)
 */
export class WhiteboardAwarenessUpdateDto {
  @ApiProperty({ description: 'Whiteboard session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Awareness update encoded as base64' })
  @IsString()
  update: string;
}

/**
 * DTO for pointer position (Excalidraw specific)
 */
export class PointerPositionDto {
  @ApiProperty({ description: 'Whiteboard session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Pointer X coordinate' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Pointer Y coordinate' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Current tool being used', required: false })
  @IsString()
  @IsOptional()
  tool?: string;

  @ApiProperty({ description: 'Is user currently pressing/drawing', required: false })
  @IsOptional()
  pressing?: boolean;
}

/**
 * DTO for elements update (direct JSON sync without Yjs)
 */
export class ElementsUpdateDto {
  @ApiProperty({ description: 'Whiteboard session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Excalidraw elements array' })
  @IsArray()
  elements: any[];

  @ApiProperty({ description: 'App state', required: false })
  @IsObject()
  @IsOptional()
  appState?: any;
}

/**
 * Represents a user in a whiteboard collaboration session
 */
export interface WhiteboardCollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  pointer?: {
    x: number;
    y: number;
    tool?: string;
    pressing?: boolean;
  };
  joinedAt: string;
}

/**
 * Response for presence data
 */
export interface WhiteboardPresenceResponse {
  sessionId: string;
  users: WhiteboardCollaborationUser[];
}

/**
 * Event emitted when a user joins
 */
export interface WhiteboardUserJoinedEvent {
  sessionId: string;
  user: WhiteboardCollaborationUser;
}

/**
 * Event emitted when a user leaves
 */
export interface WhiteboardUserLeftEvent {
  sessionId: string;
  userId: string;
}

/**
 * Excalidraw collaborator format (for frontend rendering)
 */
export interface ExcalidrawCollaborator {
  pointer?: {
    x: number;
    y: number;
  };
  button?: 'up' | 'down';
  selectedElementIds?: Record<string, boolean>;
  username?: string;
  userState?: 'active' | 'idle' | 'away';
  color?: {
    background: string;
    stroke: string;
  };
  avatarUrl?: string;
  id?: string;
}

/**
 * Predefined cursor colors for collaboration
 */
export const COLLABORATOR_COLORS = [
  { background: '#E91E63', stroke: '#C2185B' }, // Pink
  { background: '#9C27B0', stroke: '#7B1FA2' }, // Purple
  { background: '#3F51B5', stroke: '#303F9F' }, // Indigo
  { background: '#2196F3', stroke: '#1976D2' }, // Blue
  { background: '#00BCD4', stroke: '#0097A7' }, // Cyan
  { background: '#4CAF50', stroke: '#388E3C' }, // Green
  { background: '#FF9800', stroke: '#F57C00' }, // Orange
  { background: '#795548', stroke: '#5D4037' }, // Brown
  { background: '#607D8B', stroke: '#455A64' }, // Blue Grey
  { background: '#F44336', stroke: '#D32F2F' }, // Red
];
