import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { InstallBotDto, UninstallBotDto } from '../dto/install-bot.dto';

export interface BotInstallation {
  id: string;
  botId: string;
  channelId?: string;
  conversationId?: string;
  installedBy: string;
  isActive: boolean;
  settingsOverride: Record<string, any>;
  installedAt: string;
  uninstalledAt?: string;
}

@Injectable()
export class BotInstallationsService {
  private readonly logger = new Logger(BotInstallationsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Install a bot to a channel or conversation
   */
  async install(botId: string, userId: string, dto: InstallBotDto): Promise<BotInstallation> {
    if (!dto.channelId && !dto.conversationId) {
      throw new BadRequestException('Either channelId or conversationId must be provided');
    }

    if (dto.channelId && dto.conversationId) {
      throw new BadRequestException('Only one of channelId or conversationId should be provided');
    }

    const locationField = dto.channelId ? 'channel_id' : 'conversation_id';
    const locationValue = dto.channelId || dto.conversationId;

    this.logger.log(`[BotInstallations] Installing bot ${botId} to ${locationField}: ${locationValue}`);

    // Check if already installed
    const existing = await this.db.table('bot_installations')
      .select('*')
      .where('bot_id', '=', botId)
      .where(locationField, '=', locationValue)
      .execute();

    if (existing.data?.[0]) {
      const installation = existing.data[0];
      if (installation.is_active) {
        throw new ConflictException('Bot is already installed at this location');
      }

      // Reactivate existing installation
      await this.db.update('bot_installations', installation.id, {
        is_active: true,
        installed_by: userId,
        installed_at: new Date().toISOString(),
        uninstalled_at: null,
        settings_override: dto.settingsOverride || {},
      });

      return this.findOne(installation.id);
    }

    // Create new installation
    const installationData = {
      bot_id: botId,
      channel_id: dto.channelId || null,
      conversation_id: dto.conversationId || null,
      installed_by: userId,
      is_active: true,
      settings_override: dto.settingsOverride || {},
    };

    const result = await this.db.insert('bot_installations', installationData);
    this.logger.log(`[BotInstallations] Created installation with ID: ${result.id}`);

    return this.transformToInstallation(result);
  }

  /**
   * Uninstall a bot from a channel or conversation
   */
  async uninstall(botId: string, userId: string, dto: UninstallBotDto): Promise<void> {
    if (!dto.channelId && !dto.conversationId) {
      throw new BadRequestException('Either channelId or conversationId must be provided');
    }

    const locationField = dto.channelId ? 'channel_id' : 'conversation_id';
    const locationValue = dto.channelId || dto.conversationId;

    const result = await this.db.table('bot_installations')
      .select('*')
      .where('bot_id', '=', botId)
      .where(locationField, '=', locationValue)
      .where('is_active', '=', true)
      .execute();

    const installation = result.data?.[0];
    if (!installation) {
      throw new NotFoundException('Bot is not installed at this location');
    }

    await this.db.update('bot_installations', installation.id, {
      is_active: false,
      uninstalled_at: new Date().toISOString(),
    });

    this.logger.log(`[BotInstallations] Uninstalled bot ${botId} from ${locationField}: ${locationValue}`);
  }

  /**
   * Get all installations for a bot
   */
  async findAllForBot(botId: string): Promise<BotInstallation[]> {
    const result = await this.db.table('bot_installations')
      .select('*')
      .where('bot_id', '=', botId)
      .execute();

    return (result.data || []).map((installation: any) => this.transformToInstallation(installation));
  }

  /**
   * Get active installations for a bot
   */
  async getActiveInstallations(botId: string): Promise<BotInstallation[]> {
    const result = await this.db.table('bot_installations')
      .select('*')
      .where('bot_id', '=', botId)
      .where('is_active', '=', true)
      .execute();

    return (result.data || []).map((installation: any) => this.transformToInstallation(installation));
  }

  /**
   * Get a single installation by ID
   */
  async findOne(installationId: string): Promise<BotInstallation> {
    const result = await this.db.findOne('bot_installations', { id: installationId });

    if (!result) {
      throw new NotFoundException(`Installation with ID "${installationId}" not found`);
    }

    return this.transformToInstallation(result);
  }

  /**
   * Get installations for a channel
   */
  async getInstallationsForChannel(channelId: string): Promise<BotInstallation[]> {
    const result = await this.db.table('bot_installations')
      .select('*')
      .where('channel_id', '=', channelId)
      .where('is_active', '=', true)
      .execute();

    return (result.data || []).map((installation: any) => this.transformToInstallation(installation));
  }

  /**
   * Get installations for a conversation
   */
  async getInstallationsForConversation(conversationId: string): Promise<BotInstallation[]> {
    const result = await this.db.table('bot_installations')
      .select('*')
      .where('conversation_id', '=', conversationId)
      .where('is_active', '=', true)
      .execute();

    return (result.data || []).map((installation: any) => this.transformToInstallation(installation));
  }

  /**
   * Update installation settings override
   */
  async updateSettingsOverride(installationId: string, settingsOverride: Record<string, any>): Promise<BotInstallation> {
    await this.findOne(installationId); // Verify exists

    await this.db.update('bot_installations', installationId, {
      settings_override: settingsOverride,
    });

    return this.findOne(installationId);
  }

  /**
   * Transform database record to BotInstallation interface
   */
  private transformToInstallation(record: any): BotInstallation {
    return {
      id: record.id,
      botId: record.bot_id,
      channelId: record.channel_id,
      conversationId: record.conversation_id,
      installedBy: record.installed_by,
      isActive: record.is_active,
      settingsOverride: record.settings_override || {},
      installedAt: record.installed_at,
      uninstalledAt: record.uninstalled_at,
    };
  }
}
