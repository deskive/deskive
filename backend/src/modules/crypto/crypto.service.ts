import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UploadKeyDto, GetPublicKeysDto, AddConversationKeyDto } from './dto/upload-key.dto';

@Injectable()
export class CryptoService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Store or update user's public key
   */
  async storePublicKey(dto: UploadKeyDto) {
    try {
      // Check if key already exists for this user/device
      const existing = await this.db.table('user_keys')
        .select('*')
        .where('user_id', '=', dto.userId)
        .where('device_id', '=', dto.deviceId)
        .execute();

      const existingData = Array.isArray(existing) ? existing : (existing?.data || []);

      if (existingData && existingData.length > 0) {
        // Update existing key
        console.log('[CryptoService] Updating existing key for user:', dto.userId);

        const updated = await this.db.table('user_keys')
          .update({
            public_key: dto.publicKey,
            device_name: dto.deviceName,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', existingData[0].id)
          .returning('*')
          .execute();

        console.log('[CryptoService] Update result:', updated);

        const updatedData = Array.isArray(updated) ? updated[0] : (updated?.data?.[0] || updated);

        if (!updatedData) {
          console.error('[CryptoService] Update failed - no data returned');
          throw new Error('Failed to update user key');
        }

        return {
          data: {
            id: updatedData.id,
            userId: updatedData.user_id,
            publicKey: updatedData.public_key,
            deviceId: updatedData.device_id,
            deviceName: updatedData.device_name,
            isActive: updatedData.is_active,
            lastUsedAt: updatedData.last_used_at,
            createdAt: updatedData.created_at,
            updatedAt: updatedData.updated_at,
          },
          message: 'Public key updated successfully',
        };
      } else {
        // Insert new key
        console.log('[CryptoService] Inserting new key for user:', dto.userId);

        const result = await this.db.table('user_keys')
          .insert({
            user_id: dto.userId,
            public_key: dto.publicKey,
            device_id: dto.deviceId,
            device_name: dto.deviceName,
            is_active: true,
            last_used_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .returning('*')
          .execute();

        console.log('[CryptoService] Insert result:', result);

        const resultData = Array.isArray(result) ? result[0] : (result?.data?.[0] || result);

        if (!resultData) {
          console.error('[CryptoService] Insert failed - no data returned');
          throw new Error('Failed to insert user key');
        }

        return {
          data: {
            id: resultData.id,
            userId: resultData.user_id,
            publicKey: resultData.public_key,
            deviceId: resultData.device_id,
            deviceName: resultData.device_name,
            isActive: resultData.is_active,
            lastUsedAt: resultData.last_used_at,
            createdAt: resultData.created_at,
            updatedAt: resultData.updated_at,
          },
          message: 'Public key stored successfully',
        };
      }
    } catch (error) {
      console.error('Error storing public key:', error);
      throw error;
    }
  }

  /**
   * Get public keys for multiple users (for encrypting messages)
   */
  async getPublicKeys(dto: GetPublicKeysDto) {
    try {
      const keys = await this.db.table('user_keys')
        .select('user_id', 'public_key', 'device_id', 'device_name', 'is_active')
        .whereIn('user_id', dto.userIds)
        .where('is_active', '=', true)
        .execute();

      const keysData = Array.isArray(keys) ? keys : (keys?.data || []);

      return {
        data: keysData.map(k => ({
          userId: k.user_id,
          publicKey: k.public_key,
          deviceId: k.device_id,
          deviceName: k.device_name,
          isActive: k.is_active,
        })),
      };
    } catch (error) {
      console.error('Error fetching public keys:', error);
      throw error;
    }
  }

  /**
   * Get single user's public key
   */
  async getPublicKey(userId: string) {
    try {
      const keys = await this.db.table('user_keys')
        .select('*')
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const keysData = Array.isArray(keys) ? keys : (keys?.data || []);

      if (!keysData || keysData.length === 0) {
        return {
          data: null,
          message: 'No public key found for this user',
        };
      }

      // Return the most recently used key
      const mostRecent = keysData.sort((a, b) =>
        new Date(b.last_used_at || b.created_at).getTime() -
        new Date(a.last_used_at || a.created_at).getTime()
      )[0];

      return {
        data: {
          userId: mostRecent.user_id,
          publicKey: mostRecent.public_key,
          deviceId: mostRecent.device_id,
          deviceName: mostRecent.device_name,
          isActive: mostRecent.is_active,
          lastUsedAt: mostRecent.last_used_at,
        },
      };
    } catch (error) {
      console.error('Error fetching public key:', error);
      throw error;
    }
  }

  /**
   * Store encrypted conversation key for a user
   */
  async addConversationKey(dto: AddConversationKeyDto) {
    try {
      // Check if key already exists
      const existing = await this.db.table('conversation_keys')
        .select('*')
        .where('conversation_id', '=', dto.conversationId)
        .where('user_id', '=', dto.userId)
        .execute();

      const existingData = Array.isArray(existing) ? existing : (existing?.data || []);

      if (existingData && existingData.length > 0) {
        // Update existing
        console.log('[CryptoService] Updating existing conversation key');

        const updated = await this.db.table('conversation_keys')
          .update({
            encrypted_key: dto.encryptedKey,
            created_by: dto.createdBy,
            key_version: dto.keyVersion || 1,
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', existingData[0].id)
          .returning('*')
          .execute();

        console.log('[CryptoService] Update result:', updated);

        const updatedData = Array.isArray(updated) ? updated[0] : (updated?.data?.[0] || updated);

        if (!updatedData) {
          throw new Error('Failed to update conversation key');
        }

        return {
          data: {
            id: updatedData.id,
            conversationId: updatedData.conversation_id,
            userId: updatedData.user_id,
            keyVersion: updatedData.key_version,
          },
          message: 'Conversation key updated',
        };
      } else {
        // Insert new
        console.log('[CryptoService] Inserting new conversation key');

        const result = await this.db.table('conversation_keys')
          .insert({
            conversation_id: dto.conversationId,
            user_id: dto.userId,
            encrypted_key: dto.encryptedKey,
            created_by: dto.createdBy,
            key_version: dto.keyVersion || 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .returning('*')
          .execute();

        console.log('[CryptoService] Insert result:', result);

        const resultData = Array.isArray(result) ? result[0] : (result?.data?.[0] || result);

        if (!resultData) {
          throw new Error('Failed to insert conversation key');
        }

        return {
          data: {
            id: resultData.id,
            conversationId: resultData.conversation_id,
            userId: resultData.user_id,
            keyVersion: resultData.key_version,
          },
          message: 'Conversation key added',
        };
      }
    } catch (error) {
      console.error('Error adding conversation key:', error);
      throw error;
    }
  }

  /**
   * Get encrypted conversation key for a user
   */
  async getConversationKey(conversationId: string, userId: string) {
    try {
      const keys = await this.db.table('conversation_keys')
        .select('*')
        .where('conversation_id', '=', conversationId)
        .where('user_id', '=', userId)
        .execute();

      const keysData = Array.isArray(keys) ? keys : (keys?.data || []);

      if (!keysData || keysData.length === 0) {
        return {
          data: null,
          message: 'No conversation key found',
        };
      }

      return {
        data: {
          id: keysData[0].id,
          conversationId: keysData[0].conversation_id,
          userId: keysData[0].user_id,
          encryptedKey: keysData[0].encrypted_key,
          createdBy: keysData[0].created_by || null,
          keyVersion: keysData[0].key_version,
          createdAt: keysData[0].created_at,
        },
      };
    } catch (error) {
      console.error('Error fetching conversation key:', error);
      throw error;
    }
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string) {
    try {
      const devices = await this.db.table('user_keys')
        .select('*')
        .where('user_id', '=', userId)
        .execute();

      const devicesData = Array.isArray(devices) ? devices : (devices?.data || []);

      return {
        data: devicesData.map(d => ({
          id: d.id,
          deviceId: d.device_id,
          deviceName: d.device_name,
          publicKey: d.public_key,
          isActive: d.is_active,
          lastUsedAt: d.last_used_at,
          createdAt: d.created_at,
        })),
      };
    } catch (error) {
      console.error('Error fetching user devices:', error);
      throw error;
    }
  }

  /**
   * Deactivate a device
   */
  async deactivateDevice(userId: string, deviceId: string) {
    try {
      await this.db.table('user_keys')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .where('user_id', '=', userId)
        .where('device_id', '=', deviceId)
        .execute();

      return {
        message: 'Device deactivated successfully',
      };
    } catch (error) {
      console.error('Error deactivating device:', error);
      throw error;
    }
  }
}
