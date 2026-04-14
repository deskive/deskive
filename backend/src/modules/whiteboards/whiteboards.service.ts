import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AppGateway } from '../../common/gateways/app.gateway';
import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  AddCollaboratorDto,
  WhiteboardResponseDto,
  WhiteboardListItemDto,
  CollaboratorResponseDto,
} from './dto/whiteboards.dto';

@Injectable()
export class WhiteboardsService {
  private readonly logger = new Logger(WhiteboardsService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => AppGateway))
    private appGateway: AppGateway,
  ) {}

  // ==================== Helper Methods ====================

  /**
   * Sanitize elements for Excalidraw compatibility
   * Ensures freedraw elements have valid points, converts opacity, etc.
   */
  private sanitizeElements(elements: any[]): any[] {
    if (!Array.isArray(elements)) return [];

    return elements
      .filter((el) => el && typeof el === 'object' && el.id)
      .map((el) => {
        // Ensure freedraw elements have valid points array
        if (el.type === 'freedraw') {
          if (!el.points || !Array.isArray(el.points) || el.points.length === 0) {
            // Create minimal points array to prevent Excalidraw crash
            // Use element position as a single point if no points exist
            el.points = [[0, 0, 0.5]]; // [x, y, pressure]
            this.logger.warn(`Sanitized freedraw element ${el.id} with missing points`);
          } else {
            // Ensure each point has at least [x, y] (pressure is optional)
            el.points = el.points
              .filter((p: any) => Array.isArray(p) && p.length >= 2)
              .map((p: any[]) => {
                // Ensure numeric values
                return [
                  typeof p[0] === 'number' ? p[0] : 0,
                  typeof p[1] === 'number' ? p[1] : 0,
                  typeof p[2] === 'number' ? p[2] : 0.5, // Default pressure
                ];
              });
            // If all points were invalid, add a minimal point
            if (el.points.length === 0) {
              el.points = [[0, 0, 0.5]];
            }
          }
        }

        // Ensure opacity is in Excalidraw format (0-100)
        // If opacity is <= 1, it's likely Flutter format, convert to 0-100
        if (typeof el.opacity === 'number') {
          if (el.opacity <= 1) {
            el.opacity = Math.round(el.opacity * 100);
          }
          // Clamp to valid range
          el.opacity = Math.max(0, Math.min(100, el.opacity));
        } else {
          el.opacity = 100; // Default to fully opaque
        }

        return el;
      });
  }

  private async getUserInfo(
    userId: string | undefined,
  ): Promise<{ name: string; avatar?: string } | null> {
    if (!userId) {
      return null;
    }
    try {
      const user = await this.db.getUserById(userId);
      return user
        ? {
            name: user.name || (user as any).fullName || user.email || 'Unknown',
            avatar: (user as any).avatarUrl,
          }
        : null;
    } catch (error) {
      this.logger.warn(`getUserById error: ${error}`);
      return null;
    }
  }

  private async hasAccess(
    whiteboardId: string,
    userId: string,
    requiredPermission: 'view' | 'edit' | 'admin' = 'view',
  ): Promise<boolean> {
    this.logger.log(
      `hasAccess check: whiteboardId=${whiteboardId}, userId=${userId}, requiredPermission=${requiredPermission}`,
    );

    // Check if user is the creator
    const whiteboardResult = await this.db
      .table('whiteboards')
      .select('created_by, is_public')
      .where('id', '=', whiteboardId)
      .execute();

    const whiteboards = whiteboardResult.data || [];
    if (whiteboards.length === 0) {
      this.logger.log(`hasAccess: whiteboard not found`);
      return false;
    }

    const whiteboard = whiteboards[0];
    this.logger.log(
      `hasAccess: whiteboard.created_by=${whiteboard.created_by}, match=${whiteboard.created_by === userId}`,
    );

    // Creator always has full access
    if (whiteboard.created_by === userId) return true;

    // Public whiteboards allow view access
    if (whiteboard.is_public && requiredPermission === 'view') return true;

    // Check collaborator permission
    const collabResult = await this.db
      .table('whiteboard_collaborators')
      .select('permission')
      .where('whiteboard_id', '=', whiteboardId)
      .where('user_id', '=', userId)
      .execute();

    const collaborators = collabResult.data || [];
    if (collaborators.length === 0) return false;

    const permission = collaborators[0].permission;

    // Permission hierarchy: admin > edit > view
    if (requiredPermission === 'view') return true;
    if (requiredPermission === 'edit') return permission === 'edit' || permission === 'admin';
    if (requiredPermission === 'admin') return permission === 'admin';

    return false;
  }

  private mapWhiteboard(data: any): WhiteboardResponseDto {
    // Handle elements - might be string (if stored incorrectly) or array
    let elements = data.elements || [];
    if (typeof elements === 'string') {
      try {
        elements = JSON.parse(elements);
      } catch (e) {
        elements = [];
      }
    }
    // Ensure elements is a flat array of objects, not nested arrays
    if (Array.isArray(elements) && elements.length > 0 && Array.isArray(elements[0])) {
      // Flatten if accidentally nested
      elements = elements.flat().filter((el: any) => el && typeof el === 'object' && el.id);
    }

    // Sanitize elements for Excalidraw compatibility
    elements = this.sanitizeElements(elements);

    // Handle appState
    let appState = data.app_state || {};
    if (typeof appState === 'string') {
      try {
        appState = JSON.parse(appState);
      } catch (e) {
        appState = {};
      }
    }

    // Handle files
    let files = data.files || {};
    if (typeof files === 'string') {
      try {
        files = JSON.parse(files);
      } catch (e) {
        files = {};
      }
    }

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      elements,
      appState,
      files,
      thumbnailUrl: data.thumbnail_url,
      isPublic: data.is_public,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapWhiteboardListItem(data: any): WhiteboardListItemDto {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      thumbnailUrl: data.thumbnail_url,
      isPublic: data.is_public,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapCollaborator(data: any): CollaboratorResponseDto {
    return {
      id: data.id,
      whiteboardId: data.whiteboard_id,
      userId: data.user_id,
      userName: data.user_name,
      userAvatar: data.user_avatar,
      permission: data.permission,
      createdAt: data.created_at,
    };
  }

  // ==================== CRUD Operations ====================

  async createWhiteboard(
    workspaceId: string,
    dto: CreateWhiteboardDto,
    userId: string,
  ): Promise<WhiteboardResponseDto> {
    const data = {
      workspace_id: workspaceId,
      name: dto.name,
      description: dto.description || null,
      elements: JSON.stringify(dto.elements || []),
      app_state: JSON.stringify(dto.appState || {}),
      files: JSON.stringify({}),
      thumbnail_url: null,
      is_public: false,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await this.db.insert('whiteboards', data);

    // Get user info for response
    const userInfo = await this.getUserInfo(userId);

    return this.mapWhiteboard({
      ...result,
      created_by_name: userInfo?.name,
    });
  }

  async getWhiteboards(workspaceId: string, userId: string): Promise<WhiteboardListItemDto[]> {
    // Get whiteboards created by user or where user is a collaborator
    const result = await this.db
      .table('whiteboards')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .orderBy('updated_at', 'desc')
      .execute();

    const whiteboards = result.data || [];

    // Filter to whiteboards the user has access to
    const accessibleWhiteboards: any[] = [];

    for (const wb of whiteboards) {
      if (wb.created_by === userId || wb.is_public) {
        accessibleWhiteboards.push(wb);
        continue;
      }

      // Check if user is a collaborator
      const collabResult = await this.db
        .table('whiteboard_collaborators')
        .select('id')
        .where('whiteboard_id', '=', wb.id)
        .where('user_id', '=', userId)
        .execute();

      if ((collabResult.data || []).length > 0) {
        accessibleWhiteboards.push(wb);
      }
    }

    // Get user info for all creators
    const userIds = [...new Set(accessibleWhiteboards.map((w) => w.created_by))];
    const userInfoMap = new Map<string, { name: string; avatar?: string }>();

    for (const uid of userIds) {
      const info = await this.getUserInfo(uid);
      if (info) userInfoMap.set(uid, info);
    }

    return accessibleWhiteboards.map((w) =>
      this.mapWhiteboardListItem({
        ...w,
        created_by_name: userInfoMap.get(w.created_by)?.name,
      }),
    );
  }

  async getWhiteboard(
    workspaceId: string,
    whiteboardId: string,
    userId: string,
  ): Promise<WhiteboardResponseDto> {
    const result = await this.db
      .table('whiteboards')
      .select('*')
      .where('id', '=', whiteboardId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const whiteboards = result.data || [];
    if (whiteboards.length === 0) {
      throw new NotFoundException('Whiteboard not found');
    }

    const whiteboard = whiteboards[0];

    // Check access
    const hasAccess = await this.hasAccess(whiteboardId, userId, 'view');
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this whiteboard');
    }

    const userInfo = await this.getUserInfo(whiteboard.created_by);

    return this.mapWhiteboard({
      ...whiteboard,
      created_by_name: userInfo?.name,
    });
  }

  async updateWhiteboard(
    workspaceId: string,
    whiteboardId: string,
    dto: UpdateWhiteboardDto,
    userId: string,
  ): Promise<WhiteboardResponseDto> {
    // First check if whiteboard exists
    const existsResult = await this.db
      .table('whiteboards')
      .select('id, created_by')
      .where('id', '=', whiteboardId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const exists = (existsResult.data || []).length > 0;
    if (!exists) {
      this.logger.log(
        `updateWhiteboard: whiteboard ${whiteboardId} not found in workspace ${workspaceId}`,
      );
      throw new NotFoundException(`Whiteboard with ID ${whiteboardId} not found`);
    }

    // Check access
    const hasAccess = await this.hasAccess(whiteboardId, userId, 'edit');
    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to edit this whiteboard');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.elements !== undefined) updateData.elements = JSON.stringify(dto.elements);
    if (dto.appState !== undefined) updateData.app_state = JSON.stringify(dto.appState);
    if (dto.files !== undefined) updateData.files = JSON.stringify(dto.files);
    if (dto.isPublic !== undefined) updateData.is_public = dto.isPublic;

    this.logger.log(
      `Updating whiteboard ${whiteboardId} with elements count: ${dto.elements?.length || 0}`,
    );
    this.logger.log(`Stringified elements: ${updateData.elements?.substring(0, 200)}...`);

    await this.db.update('whiteboards', whiteboardId, updateData);

    // Fetch the updated whiteboard to get all fields including created_by
    const fetchResult = await this.db
      .table('whiteboards')
      .select('*')
      .where('id', '=', whiteboardId)
      .execute();

    const result = (fetchResult.data || [])[0];
    this.logger.log(
      `Fetched result elements type: ${typeof result?.elements}, value: ${JSON.stringify(result?.elements)?.substring(0, 200)}...`,
    );

    // Emit WebSocket event for real-time updates
    this.emitWhiteboardUpdate(workspaceId, whiteboardId, userId, dto);

    const userInfo = await this.getUserInfo(result?.created_by);

    return this.mapWhiteboard({
      ...result,
      created_by_name: userInfo?.name,
    });
  }

  async deleteWhiteboard(workspaceId: string, whiteboardId: string, userId: string): Promise<void> {
    // Only creator can delete
    const result = await this.db
      .table('whiteboards')
      .select('created_by')
      .where('id', '=', whiteboardId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const whiteboards = result.data || [];
    if (whiteboards.length === 0) {
      throw new NotFoundException('Whiteboard not found');
    }

    if (whiteboards[0].created_by !== userId) {
      throw new ForbiddenException('Only the creator can delete this whiteboard');
    }

    // Delete collaborators first
    const collabResult = await this.db
      .table('whiteboard_collaborators')
      .select('id')
      .where('whiteboard_id', '=', whiteboardId)
      .execute();

    for (const collab of collabResult.data || []) {
      await this.db.delete('whiteboard_collaborators', collab.id);
    }

    // Delete whiteboard
    await this.db.delete('whiteboards', whiteboardId);
  }

  // ==================== Collaborator Management ====================

  async addCollaborator(
    workspaceId: string,
    whiteboardId: string,
    dto: AddCollaboratorDto,
    userId: string,
  ): Promise<CollaboratorResponseDto> {
    // Check if user has admin access
    const hasAccess = await this.hasAccess(whiteboardId, userId, 'admin');

    // Also check if user is the creator
    const wbResult = await this.db
      .table('whiteboards')
      .select('created_by')
      .where('id', '=', whiteboardId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const whiteboards = wbResult.data || [];
    if (whiteboards.length === 0) {
      throw new NotFoundException('Whiteboard not found');
    }

    if (!hasAccess && whiteboards[0].created_by !== userId) {
      throw new ForbiddenException('You do not have permission to add collaborators');
    }

    // Check if collaborator already exists
    const existingResult = await this.db
      .table('whiteboard_collaborators')
      .select('id')
      .where('whiteboard_id', '=', whiteboardId)
      .where('user_id', '=', dto.userId)
      .execute();

    if ((existingResult.data || []).length > 0) {
      // Update existing collaborator permission
      const existing = existingResult.data[0];
      await this.db.update('whiteboard_collaborators', existing.id, {
        permission: dto.permission || 'edit',
      });

      const userInfo = await this.getUserInfo(dto.userId);
      return this.mapCollaborator({
        ...existing,
        permission: dto.permission || 'edit',
        user_name: userInfo?.name,
        user_avatar: userInfo?.avatar,
      });
    }

    // Add new collaborator
    const data = {
      whiteboard_id: whiteboardId,
      user_id: dto.userId,
      permission: dto.permission || 'edit',
      created_at: new Date().toISOString(),
    };

    const result = await this.db.insert('whiteboard_collaborators', data);
    const userInfo = await this.getUserInfo(dto.userId);

    return this.mapCollaborator({
      ...result,
      user_name: userInfo?.name,
      user_avatar: userInfo?.avatar,
    });
  }

  async removeCollaborator(
    workspaceId: string,
    whiteboardId: string,
    collaboratorUserId: string,
    userId: string,
  ): Promise<void> {
    // Check if user has admin access or is the creator
    const wbResult = await this.db
      .table('whiteboards')
      .select('created_by')
      .where('id', '=', whiteboardId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const whiteboards = wbResult.data || [];
    if (whiteboards.length === 0) {
      throw new NotFoundException('Whiteboard not found');
    }

    const hasAccess = await this.hasAccess(whiteboardId, userId, 'admin');
    if (!hasAccess && whiteboards[0].created_by !== userId) {
      throw new ForbiddenException('You do not have permission to remove collaborators');
    }

    // Find and delete the collaborator
    const collabResult = await this.db
      .table('whiteboard_collaborators')
      .select('id')
      .where('whiteboard_id', '=', whiteboardId)
      .where('user_id', '=', collaboratorUserId)
      .execute();

    if ((collabResult.data || []).length === 0) {
      throw new NotFoundException('Collaborator not found');
    }

    await this.db.delete('whiteboard_collaborators', collabResult.data[0].id);
  }

  async getCollaborators(
    workspaceId: string,
    whiteboardId: string,
    userId: string,
  ): Promise<CollaboratorResponseDto[]> {
    // Check access
    const hasAccess = await this.hasAccess(whiteboardId, userId, 'view');
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this whiteboard');
    }

    const result = await this.db
      .table('whiteboard_collaborators')
      .select('*')
      .where('whiteboard_id', '=', whiteboardId)
      .orderBy('created_at', 'asc')
      .execute();

    const collaborators = result.data || [];

    // Get user info for all collaborators
    const enrichedCollaborators: CollaboratorResponseDto[] = [];
    for (const collab of collaborators) {
      const userInfo = await this.getUserInfo(collab.user_id);
      enrichedCollaborators.push(
        this.mapCollaborator({
          ...collab,
          user_name: userInfo?.name,
          user_avatar: userInfo?.avatar,
        }),
      );
    }

    return enrichedCollaborators;
  }

  // ==================== Collaboration Helper Methods ====================

  /**
   * Get whiteboard session data for collaboration service
   * This fetches whiteboard data without access control (for internal use)
   */
  async getWhiteboardSession(
    sessionId: string,
  ): Promise<{ elements: any[]; appState: any } | null> {
    try {
      const result = await this.db
        .table('whiteboards')
        .select('elements, app_state')
        .where('id', '=', sessionId)
        .execute();

      const whiteboards = result.data || [];
      if (whiteboards.length === 0) {
        return null;
      }

      const data = whiteboards[0];

      // Parse elements
      let elements = data.elements || [];
      if (typeof elements === 'string') {
        try {
          elements = JSON.parse(elements);
        } catch (e) {
          elements = [];
        }
      }
      // Flatten if nested
      if (Array.isArray(elements) && elements.length > 0 && Array.isArray(elements[0])) {
        elements = elements.flat().filter((el: any) => el && typeof el === 'object' && el.id);
      }

      // Sanitize elements for Excalidraw compatibility
      elements = this.sanitizeElements(elements);

      // Parse appState
      let appState = data.app_state || {};
      if (typeof appState === 'string') {
        try {
          appState = JSON.parse(appState);
        } catch (e) {
          appState = {};
        }
      }

      return { elements, appState };
    } catch (error) {
      this.logger.error(`Error getting whiteboard session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Update whiteboard session data from collaboration service
   * This updates whiteboard data without access control (for internal use by collaboration)
   */
  async updateWhiteboardSession(
    sessionId: string,
    userId: string,
    data: { elements?: any[]; appState?: any },
  ): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.elements !== undefined) {
        updateData.elements = JSON.stringify(data.elements);
      }
      if (data.appState !== undefined) {
        updateData.app_state = JSON.stringify(data.appState);
      }

      await this.db.update('whiteboards', sessionId, updateData);
      this.logger.log(
        `Collaboration service updated whiteboard ${sessionId} with ${data.elements?.length || 0} elements`,
      );
    } catch (error) {
      this.logger.error(`Error updating whiteboard session ${sessionId}:`, error);
      throw error;
    }
  }

  // ==================== WebSocket Events ====================

  private emitWhiteboardUpdate(
    workspaceId: string,
    whiteboardId: string,
    userId: string,
    data: UpdateWhiteboardDto,
  ): void {
    this.appGateway.server.to(`workspace:${workspaceId}`).emit('whiteboard:update', {
      whiteboardId,
      userId,
      elements: data.elements,
      appState: data.appState,
      timestamp: new Date().toISOString(),
    });
  }

  emitUserJoined(
    workspaceId: string,
    whiteboardId: string,
    user: { id: string; name: string; color: string },
  ): void {
    this.appGateway.server.to(`workspace:${workspaceId}`).emit('whiteboard:user_joined', {
      whiteboardId,
      ...user,
      timestamp: new Date().toISOString(),
    });
  }

  emitUserLeft(workspaceId: string, whiteboardId: string, userId: string): void {
    this.appGateway.server.to(`workspace:${workspaceId}`).emit('whiteboard:user_left', {
      whiteboardId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}
