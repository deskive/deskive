/**
 * Key Exchange Helper
 * Handles sharing conversation keys between participants
 */

import { api } from '@/lib/fetch';
import { encryptionService } from './encryption.service';

/**
 * Share conversation key with all participants
 * Called when sending the first encrypted message in a conversation
 */
export async function shareConversationKey(
  conversationId: string,
  participantIds: string[]
): Promise<void> {
  try {
    console.log('🔑 Sharing conversation key with participants:', participantIds);

    // Get the conversation symmetric key
    const conversationKey = encryptionService.getConversationKey(conversationId);
    if (!conversationKey) {
      console.warn('⚠️ Conversation key not found, skipping key sharing');
      return;
    }

    console.log('🔑 SHARING - Conversation key (first 20):', conversationKey.substring(0, 20));
    console.log('🔑 SHARING - For conversation:', conversationId);

    // Get public keys for all participants
    let publicKeysResponse;
    try {
      publicKeysResponse = await api.post('/crypto/keys/batch', {
        userIds: participantIds,
      });
    } catch (error: any) {
      console.error('❌ Failed to get public keys:', error);
      console.error('Error details:', error.response?.data);
      // If participants don't have keys yet, skip sharing
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.warn('⚠️ Some participants don\'t have encryption keys yet');
        return;
      }
      // Don't throw - allow message to send
      return;
    }

    const publicKeys: any[] = Array.isArray(publicKeysResponse)
      ? publicKeysResponse
      : ((publicKeysResponse as any)?.data || []);

    console.log(`🔑 Retrieved ${publicKeys.length} public keys`);

    if (publicKeys.length === 0) {
      console.warn('⚠️ No public keys found for participants');
      return;
    }

    // Encrypt conversation key for each participant
    for (const participant of publicKeys) {
      try {
        // Encrypt the conversation symmetric key with participant's public key
        const encryptedKey = await encryptionService.encryptForUser(
          conversationKey,
          participant.publicKey
        );

        // Store encrypted key on server
        await api.post('/crypto/conversation-keys', {
          conversationId,
          userId: participant.userId,
          encryptedKey,
          createdBy: encryptionService.getCurrentUserId(),
          keyVersion: 1,
        });

        console.log(`✅ Shared key with user: ${participant.userId}`);
      } catch (error) {
        console.error(`Failed to share key with ${participant.userId}:`, error);
      }
    }

    console.log('✅ Conversation key shared with all participants');
  } catch (error) {
    console.error('❌ Failed to share conversation key:', error);
    // Don't throw - this is non-fatal, message is already sent
  }
}

/**
 * Retrieve conversation key from server (for recipients)
 * Called when a user joins an encrypted conversation
 */
export async function retrieveConversationKey(
  conversationId: string
): Promise<boolean> {
  try {
    console.log('🔑 Retrieving conversation key for:', conversationId);

    // ALWAYS retrieve from server to ensure we have the correct key
    // (Local key might be wrong/stale)
    console.log('🔑 Fetching conversation key from server (ignoring local cache)...');

    // Get encrypted conversation key from server (for current user)
    // @ts-ignore
    const response = await api.get(`/crypto/conversation-keys/${conversationId}`);
    // @ts-ignore
    if (!response.data || !response.data.encryptedKey) {
      console.log('⚠️ No conversation key found on server - creator hasn\'t shared it yet');
      return false;
    }

    // @ts-ignore - Response typing
    const responseData: any = response?.data || response;
    // @ts-ignore
    const { encryptedKey, createdBy } = responseData;
    console.log('📦 RETRIEVED - Encrypted key (first 30):', encryptedKey.substring(0, 30));
    console.log('📦 RETRIEVED - Created by:', createdBy);
    console.log('📦 RETRIEVED - For conversation:', conversationId);

    // Get the creator's public key (the person who encrypted this key for us)
    let senderPublicKey: string;

    if (createdBy) {
      // Get public key from the user who created/shared the key
      // @ts-ignore - Response typing
      const creatorKeyResponse = await api.get(`/crypto/keys/${createdBy}`);
      // @ts-ignore
      if (creatorKeyResponse.data && creatorKeyResponse.data.publicKey) {
        // @ts-ignore
        senderPublicKey = creatorKeyResponse.data.publicKey;
        console.log('✓ Got creator public key');
      } else {
        throw new Error('Could not get creator public key');
      }
    } else {
      // Fallback: try to get from conversation metadata or first message
      console.error('No createdBy field in conversation key');
      return false;
    }

    // Decrypt the conversation key using sender's public key
    await encryptionService.addConversationKey(
      conversationId,
      encryptedKey,
      senderPublicKey
    );

    console.log('✅ Conversation key retrieved and stored');
    return true;
  } catch (error) {
    console.error('Failed to retrieve conversation key:', error);
    return false;
  }
}

/**
 * Initialize conversation encryption
 * Call this when opening a conversation
 */
export async function initializeConversationEncryption(
  conversationId: string,
  workspaceId: string
): Promise<void> {
  try {
    // Attempt to retrieve conversation key if we don't have it
    await retrieveConversationKey(conversationId);
  } catch (error) {
    console.log('Could not retrieve conversation key:', error);
    // Non-fatal - conversation may not be encrypted yet
  }
}
