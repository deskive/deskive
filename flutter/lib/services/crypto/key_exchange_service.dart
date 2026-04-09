import 'encryption_service.dart';
import '../../api/services/crypto_api_service.dart';

/// Key Exchange Helper
/// Handles sharing conversation keys between participants
class KeyExchangeService {
  static final KeyExchangeService _instance = KeyExchangeService._internal();
  factory KeyExchangeService() => _instance;
  KeyExchangeService._internal();

  final _encryptionService = EncryptionService();
  final _cryptoApiService = CryptoApiService.instance;

  /// Share conversation key with all participants
  /// Called when sending the first encrypted message in a conversation
  Future<void> shareConversationKey(
    String conversationId,
    List<String> participantIds,
  ) async {
    try {
      print('🔑 Sharing conversation key with participants: $participantIds');

      // Get the conversation symmetric key
      final conversationKey = _encryptionService.getConversationKey(conversationId);
      if (conversationKey == null) {
        print('⚠️ Conversation key not found, skipping key sharing');
        return;
      }

      print('🔑 SHARING - Conversation key (first 20): ${conversationKey.substring(0, conversationKey.length < 20 ? conversationKey.length : 20)}');
      print('🔑 SHARING - For conversation: $conversationId');

      // Get public keys for all participants
      List<PublicKeyInfo> publicKeys;
      try {
        publicKeys = await _cryptoApiService.getPublicKeysBatch(participantIds);
      } catch (error) {
        print('❌ Failed to get public keys: $error');
        // If participants don't have keys yet, skip sharing
        return;
      }

      print('🔑 Retrieved ${publicKeys.length} public keys');

      if (publicKeys.isEmpty) {
        print('⚠️ No public keys found for participants');
        return;
      }

      // Encrypt conversation key for each participant
      for (final participant in publicKeys) {
        try {
          // Encrypt the conversation symmetric key with participant's public key
          final encryptedKey = await _encryptionService.encryptForUser(
            conversationKey,
            participant.publicKey,
          );

          // Store encrypted key on server
          await _cryptoApiService.storeConversationKey(
            conversationId: conversationId,
            userId: participant.userId,
            encryptedKey: encryptedKey,
            createdBy: _encryptionService.currentUserId ?? '',
            keyVersion: 1,
          );

          print('✅ Shared key with user: ${participant.userId}');
        } catch (error) {
          print('Failed to share key with ${participant.userId}: $error');
        }
      }

      print('✅ Conversation key shared with all participants');
    } catch (error) {
      print('❌ Failed to share conversation key: $error');
      // Don't throw - this is non-fatal, message is already sent
    }
  }

  /// Retrieve conversation key from server (for recipients)
  /// Called when a user joins an encrypted conversation
  Future<bool> retrieveConversationKey(String conversationId) async {
    try {
      print('🔑 Retrieving conversation key for: $conversationId');

      // Check if we already have the key
      if (_encryptionService.hasConversationKey(conversationId)) {
        print('✓ Already have conversation key locally');
        // Still try to retrieve from server to ensure we have the correct key
      }

      print('🔑 Fetching conversation key from server...');

      // Get encrypted conversation key from server (for current user)
      final keyInfo = await _cryptoApiService.getConversationKey(conversationId);

      if (keyInfo == null) {
        print('⚠️ No conversation key found on server - creator hasn\'t shared it yet');
        return false;
      }

      print('📦 RETRIEVED - Encrypted key (first 30): ${keyInfo.encryptedKey.substring(0, keyInfo.encryptedKey.length < 30 ? keyInfo.encryptedKey.length : 30)}');
      print('📦 RETRIEVED - Created by: ${keyInfo.createdBy}');
      print('📦 RETRIEVED - For conversation: $conversationId');

      // Get the creator's public key (the person who encrypted this key for us)
      if (keyInfo.createdBy.isEmpty) {
        print('❌ No createdBy field in conversation key');
        return false;
      }

      // Get public key from the user who created/shared the key
      final creatorKeyInfo = await _cryptoApiService.getPublicKey(keyInfo.createdBy);

      if (creatorKeyInfo == null) {
        print('❌ Could not get creator public key');
        return false;
      }

      final senderPublicKey = creatorKeyInfo.publicKey;
      print('✓ Got creator public key');

      // Decrypt the conversation key using sender's public key
      await _encryptionService.addConversationKey(
        conversationId,
        keyInfo.encryptedKey,
        senderPublicKey,
      );

      print('✅ Conversation key retrieved and stored');
      return true;
    } catch (error) {
      print('Failed to retrieve conversation key: $error');
      return false;
    }
  }

  /// Initialize conversation encryption
  /// Call this when opening a conversation
  Future<void> initializeConversationEncryption(
    String conversationId,
    String workspaceId,
  ) async {
    try {
      // Attempt to retrieve conversation key if we don't have it
      await retrieveConversationKey(conversationId);
    } catch (error) {
      print('Could not retrieve conversation key: $error');
      // Non-fatal - conversation may not be encrypted yet
    }
  }
}
