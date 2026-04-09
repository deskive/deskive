import '../base_api_client.dart';
import '../../config/api_config.dart';
import '../../models/signature/user_signature.dart';

/// API Service for managing user signatures
class SignatureApiService {
  static SignatureApiService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  SignatureApiService._();

  static SignatureApiService get instance =>
      _instance ??= SignatureApiService._();

  /// Get all signatures for the current user
  Future<List<UserSignature>> getSignatures({
    required String workspaceId,
    bool includeDeleted = false,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (includeDeleted) {
        queryParams['includeDeleted'] = true;
      }

      final response = await _apiClient.get(
        ApiConfig.signatures(workspaceId),
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final signatures = data['data'] as List<dynamic>? ?? [];
        return signatures
            .map((json) => UserSignature.fromJson(json as Map<String, dynamic>))
            .toList();
      }

      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get a signature by ID
  Future<UserSignature> getSignature({
    required String workspaceId,
    required String signatureId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.signatureById(workspaceId, signatureId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final signatureData = data['data'] as Map<String, dynamic>? ?? data;
        return UserSignature.fromJson(signatureData);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Get default signature for the current user
  Future<UserSignature?> getDefaultSignature({
    required String workspaceId,
  }) async {
    try {
      final response = await _apiClient.get(
        ApiConfig.signatureDefault(workspaceId),
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final signatureData = data['data'];
        if (signatureData == null) {
          return null;
        }
        return UserSignature.fromJson(signatureData as Map<String, dynamic>);
      }

      return null;
    } catch (e) {
      rethrow;
    }
  }

  /// Create a new signature
  Future<UserSignature> createSignature({
    required String workspaceId,
    required String name,
    required String signatureType,
    required String signatureData,
    String? typedName,
    String? fontFamily,
    bool isDefault = false,
  }) async {
    try {
      final body = <String, dynamic>{
        'name': name,
        'signatureType': signatureType,
        'signatureData': signatureData,
        'isDefault': isDefault,
      };

      if (typedName != null) body['typedName'] = typedName;
      if (fontFamily != null) body['fontFamily'] = fontFamily;

      final response = await _apiClient.post(
        ApiConfig.signatures(workspaceId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final signatureResult = data['data'] as Map<String, dynamic>? ?? data;
        return UserSignature.fromJson(signatureResult);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Update a signature
  Future<UserSignature> updateSignature({
    required String workspaceId,
    required String signatureId,
    String? name,
    bool? isDefault,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (isDefault != null) body['isDefault'] = isDefault;

      final response = await _apiClient.patch(
        ApiConfig.signatureById(workspaceId, signatureId),
        data: body,
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final signatureResult = data['data'] as Map<String, dynamic>? ?? data;
        return UserSignature.fromJson(signatureResult);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Set a signature as default
  Future<UserSignature> setDefaultSignature({
    required String workspaceId,
    required String signatureId,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiConfig.signatureSetDefault(workspaceId, signatureId),
        data: {},
      );

      final data = response.data;
      if (data is Map<String, dynamic>) {
        final signatureResult = data['data'] as Map<String, dynamic>? ?? data;
        return UserSignature.fromJson(signatureResult);
      }

      throw Exception('Invalid response format');
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a signature
  Future<void> deleteSignature({
    required String workspaceId,
    required String signatureId,
  }) async {
    try {
      await _apiClient.delete(
        ApiConfig.signatureById(workspaceId, signatureId),
      );
    } catch (e) {
      rethrow;
    }
  }
}
