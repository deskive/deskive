import 'package:dio/dio.dart';
import '../base_api_client.dart';

/// Crypto API Service for E2EE key management
class CryptoApiService {
  static CryptoApiService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  static CryptoApiService get instance => _instance ??= CryptoApiService._internal();

  CryptoApiService._internal();

  /// Upload public key to server
  /// POST /crypto/keys
  Future<void> uploadPublicKey({
    required String userId,
    required String publicKey,
    required String deviceId,
    required String deviceName,
  }) async {
    try {
      await _apiClient.post('/crypto/keys', data: {
        'userId': userId,
        'publicKey': publicKey,
        'deviceId': deviceId,
        'deviceName': deviceName,
      });
      print('✅ Public key uploaded successfully');
    } catch (e) {
      print('❌ Failed to upload public key: $e');
      // Don't throw - allow encryption to continue even if upload fails
      print('⚠️ Continuing without server-side key registration');
    }
  }

  /// Get public keys for multiple users
  /// POST /crypto/keys/batch
  Future<List<PublicKeyInfo>> getPublicKeysBatch(List<String> userIds) async {
    try {
      final response = await _apiClient.post('/crypto/keys/batch', data: {
        'userIds': userIds,
      });

      // Handle both direct array and nested data structure
      final data = response.data;
      final List<dynamic> keysList;

      if (data is List) {
        keysList = data;
      } else if (data is Map && data['data'] is List) {
        keysList = data['data'];
      } else {
        print('⚠️ Unexpected response format for public keys batch');
        return [];
      }

      return keysList
          .map((item) => PublicKeyInfo.fromJson(item))
          .toList();
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 400) {
        print('⚠️ Some participants don\'t have encryption keys yet');
        return [];
      }
      rethrow;
    }
  }

  /// Get public key for a single user
  /// GET /crypto/keys/:userId
  Future<PublicKeyInfo?> getPublicKey(String userId) async {
    try {
      final response = await _apiClient.get('/crypto/keys/$userId');
      final data = response.data;

      // Handle nested data structure
      final keyData = data is Map && data['data'] != null ? data['data'] : data;

      return PublicKeyInfo.fromJson(keyData);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        print('⚠️ User doesn\'t have encryption keys yet: $userId');
        return null;
      }
      rethrow;
    }
  }

  /// Store encrypted conversation key on server
  /// POST /crypto/conversation-keys
  Future<void> storeConversationKey({
    required String conversationId,
    required String userId,
    required String encryptedKey,
    required String createdBy,
    int keyVersion = 1,
  }) async {
    try {
      await _apiClient.post('/crypto/conversation-keys', data: {
        'conversationId': conversationId,
        'userId': userId,
        'encryptedKey': encryptedKey,
        'createdBy': createdBy,
        'keyVersion': keyVersion,
      });
      print('✅ Stored conversation key for user: $userId');
    } catch (e) {
      print('❌ Failed to store conversation key: $e');
      rethrow;
    }
  }

  /// Retrieve encrypted conversation key from server
  /// GET /crypto/conversation-keys/:conversationId
  Future<ConversationKeyInfo?> getConversationKey(String conversationId) async {
    try {
      final response = await _apiClient.get('/crypto/conversation-keys/$conversationId');
      final data = response.data;

      // Handle nested data structure
      final keyData = data is Map && data['data'] != null ? data['data'] : data;

      if (keyData == null || keyData['encryptedKey'] == null) {
        print('⚠️ No conversation key found on server');
        return null;
      }

      return ConversationKeyInfo.fromJson(keyData);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        print('⚠️ No conversation key found - creator hasn\'t shared it yet');
        return null;
      }
      rethrow;
    }
  }
}

/// Public key information
class PublicKeyInfo {
  final String userId;
  final String publicKey;
  final String? deviceId;
  final String? deviceName;

  PublicKeyInfo({
    required this.userId,
    required this.publicKey,
    this.deviceId,
    this.deviceName,
  });

  factory PublicKeyInfo.fromJson(Map<String, dynamic> json) {
    return PublicKeyInfo(
      userId: json['userId'] ?? json['user_id'] ?? '',
      publicKey: json['publicKey'] ?? json['public_key'] ?? '',
      deviceId: json['deviceId'] ?? json['device_id'],
      deviceName: json['deviceName'] ?? json['device_name'],
    );
  }

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'publicKey': publicKey,
        if (deviceId != null) 'deviceId': deviceId,
        if (deviceName != null) 'deviceName': deviceName,
      };
}

/// Conversation key information
class ConversationKeyInfo {
  final String conversationId;
  final String encryptedKey;
  final String createdBy;
  final int keyVersion;

  ConversationKeyInfo({
    required this.conversationId,
    required this.encryptedKey,
    required this.createdBy,
    this.keyVersion = 1,
  });

  factory ConversationKeyInfo.fromJson(Map<String, dynamic> json) {
    return ConversationKeyInfo(
      conversationId: json['conversationId'] ?? json['conversation_id'] ?? '',
      encryptedKey: json['encryptedKey'] ?? json['encrypted_key'] ?? '',
      createdBy: json['createdBy'] ?? json['created_by'] ?? '',
      keyVersion: json['keyVersion'] ?? json['key_version'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
        'conversationId': conversationId,
        'encryptedKey': encryptedKey,
        'createdBy': createdBy,
        'keyVersion': keyVersion,
      };
}
