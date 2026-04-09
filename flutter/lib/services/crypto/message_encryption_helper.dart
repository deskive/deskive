import 'encryption_service.dart';
import 'key_exchange_service.dart';

class MessageEncryptionHelper {
  static Future<Map<String, dynamic>> encryptMessageForSending({
    required String conversationId,
    required String content,
    String? contentHtml,
  }) async {
    print('🔐 MessageEncryptionHelper.encryptMessageForSending called');
    print('   ConversationId: $conversationId');
    print('   Content: ${content.substring(0, content.length < 50 ? content.length : 50)}');

    final service = EncryptionService();

    if (!service.isInitialized) {
      print('❌ Encryption service NOT initialized - sending unencrypted');
      return {'content': content, 'content_html': contentHtml, 'is_encrypted': false};
    }

    print('✅ Encryption service IS initialized');

    try {
      final toEncrypt = contentHtml ?? content;
      print('🔐 Calling service.encryptMessage...');
      final encrypted = await service.encryptMessage(conversationId, toEncrypt);

      print('✅ Encryption successful!');
      print('   Encrypted content length: ${encrypted['encryptedContent'].toString().length}');
      print('   Is encrypted: true');

      return {
        'encrypted_content': encrypted['encryptedContent'],
        'encryption_metadata': encrypted['encryptionMetadata'],
        'is_encrypted': true,
        'content': '',
        'content_html': '',
      };
    } catch (e, stack) {
      print('❌ Encryption failed: $e');
      print('Stack: $stack');
      return {'content': content, 'content_html': contentHtml, 'is_encrypted': false};
    }
  }

  static Future<Map<String, dynamic>> decryptMessageIfNeeded(Map<String, dynamic> message) async {
    if (message['is_encrypted'] != true) return message;

    final service = EncryptionService();
    if (!service.isInitialized) {
      print('❌ Encryption service NOT initialized!');
      return {...message, 'content': '[Encrypted - unable to decrypt]'};
    }

    print('✓ Encryption service IS initialized');

    // Check conversation key
    final convId = message['encryption_metadata']?['conversationId'];
    print('🔑 Conversation ID: $convId');
    print('🔑 Has key: ${service.hasConversationKey(convId ?? '')}');

    // If we don't have the conversation key, try to retrieve it first
    if (convId != null && !service.hasConversationKey(convId)) {
      print('🔑 No conversation key found, attempting to retrieve from server...');
      try {
        final retrieved = await KeyExchangeService().retrieveConversationKey(convId);
        if (retrieved) {
          print('✅ Retrieved conversation key from server');
        } else {
          print('⚠️ Could not retrieve conversation key from server');
          return {...message, 'content': '[Encrypted - key not available]'};
        }
      } catch (e) {
        print('❌ Failed to retrieve conversation key: $e');
        return {...message, 'content': '[Encrypted - key retrieval failed]'};
      }
    }

    try {
      print('🔓 Calling decrypt...');
      final decrypted = await service.decryptMessage(message);
      print('✅ Decrypted: $decrypted');
      return {...message, 'content': decrypted};
    } catch (e, stack) {
      print('❌ Decryption error: $e');
      print('Stack: $stack');

      // One more attempt: try retrieving the key again in case it was just updated
      if (convId != null) {
        print('🔄 Retrying key retrieval and decryption...');
        try {
          final retrieved = await KeyExchangeService().retrieveConversationKey(convId);
          if (retrieved) {
            final decrypted = await service.decryptMessage(message);
            print('✅ Decrypted on retry: $decrypted');
            return {...message, 'content': decrypted};
          }
        } catch (retryError) {
          print('❌ Retry also failed: $retryError');
        }
      }

      return {...message, 'content': '[Decryption failed: $e]'};
    }
  }
}
