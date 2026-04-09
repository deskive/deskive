import 'package:flutter/foundation.dart';
import '../../../services/auth_service.dart';
import '../../../services/workspace_service.dart';
import '../models/whiteboard_data.dart';
import '../models/whiteboard_element.dart';

/// Service for whiteboard REST API operations
class WhiteboardApiService {
  static WhiteboardApiService? _instance;
  static WhiteboardApiService get instance => _instance ??= WhiteboardApiService._();

  WhiteboardApiService._();

  /// Get base path for whiteboard API (includes workspace ID)
  String _getBasePath() {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }
    return '/workspaces/$workspaceId/whiteboards';
  }

  /// Get all whiteboards for current workspace
  Future<List<WhiteboardListItem>> getWhiteboards() async {
    try {
      final basePath = _getBasePath();

      final response = await AuthService.instance.dio.get(basePath);

      final data = response.data;
      List<dynamic> whiteboardsList;

      if (data is Map && data['data'] != null) {
        whiteboardsList = data['data'] as List;
      } else if (data is List) {
        whiteboardsList = data;
      } else {
        whiteboardsList = [];
      }

      return whiteboardsList
          .map((json) => WhiteboardListItem.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[WhiteboardApiService] getWhiteboards error: $e');
      rethrow;
    }
  }

  /// Get a single whiteboard by ID
  Future<WhiteboardData> getWhiteboard(String whiteboardId) async {
    try {
      final basePath = _getBasePath();

      final response = await AuthService.instance.dio.get(
        '$basePath/$whiteboardId',
      );

      final data = response.data;
      Map<String, dynamic> whiteboardJson;

      if (data is Map && data['data'] != null) {
        whiteboardJson = data['data'] as Map<String, dynamic>;
      } else if (data is Map) {
        whiteboardJson = data as Map<String, dynamic>;
      } else {
        throw Exception('Invalid response format');
      }

      return WhiteboardData.fromJson(whiteboardJson);
    } catch (e) {
      debugPrint('[WhiteboardApiService] getWhiteboard error: $e');
      rethrow;
    }
  }

  /// Create a new whiteboard
  Future<WhiteboardData> createWhiteboard({
    required String name,
    List<WhiteboardElement>? elements,
  }) async {
    try {
      final basePath = _getBasePath();

      final response = await AuthService.instance.dio.post(
        basePath,
        data: {
          'name': name,
          'elements': elements?.map((e) => e.toJson()).toList() ?? [],
        },
      );

      final data = response.data;
      Map<String, dynamic> whiteboardJson;

      if (data is Map && data['data'] != null) {
        whiteboardJson = data['data'] as Map<String, dynamic>;
      } else if (data is Map) {
        whiteboardJson = data as Map<String, dynamic>;
      } else {
        throw Exception('Invalid response format');
      }

      return WhiteboardData.fromJson(whiteboardJson);
    } catch (e) {
      debugPrint('[WhiteboardApiService] createWhiteboard error: $e');
      rethrow;
    }
  }

  /// Update whiteboard metadata (name, etc.)
  Future<WhiteboardData> updateWhiteboard(
    String whiteboardId, {
    String? name,
    bool? isPublic,
  }) async {
    try {
      final basePath = _getBasePath();

      final response = await AuthService.instance.dio.patch(
        '$basePath/$whiteboardId',
        data: {
          if (name != null) 'name': name,
          if (isPublic != null) 'isPublic': isPublic,
        },
      );

      final data = response.data;
      Map<String, dynamic> whiteboardJson;

      if (data is Map && data['data'] != null) {
        whiteboardJson = data['data'] as Map<String, dynamic>;
      } else if (data is Map) {
        whiteboardJson = data as Map<String, dynamic>;
      } else {
        throw Exception('Invalid response format');
      }

      return WhiteboardData.fromJson(whiteboardJson);
    } catch (e) {
      debugPrint('[WhiteboardApiService] updateWhiteboard error: $e');
      rethrow;
    }
  }

  /// Save whiteboard elements
  Future<WhiteboardData> saveElements(
    String whiteboardId,
    List<WhiteboardElement> elements,
  ) async {
    try {
      final basePath = _getBasePath();

      // Use PATCH to update the whiteboard with elements in body
      final response = await AuthService.instance.dio.patch(
        '$basePath/$whiteboardId',
        data: {
          'elements': elements.map((e) => e.toJson()).toList(),
        },
      );

      final data = response.data;
      Map<String, dynamic> whiteboardJson;

      if (data is Map && data['data'] != null) {
        whiteboardJson = data['data'] as Map<String, dynamic>;
      } else if (data is Map) {
        whiteboardJson = data as Map<String, dynamic>;
      } else {
        throw Exception('Invalid response format');
      }

      return WhiteboardData.fromJson(whiteboardJson);
    } catch (e) {
      debugPrint('[WhiteboardApiService] saveElements error: $e');
      rethrow;
    }
  }

  /// Delete a whiteboard
  Future<void> deleteWhiteboard(String whiteboardId) async {
    try {
      final basePath = _getBasePath();
      await AuthService.instance.dio.delete('$basePath/$whiteboardId');
    } catch (e) {
      debugPrint('[WhiteboardApiService] deleteWhiteboard error: $e');
      rethrow;
    }
  }

  /// Generate share link for whiteboard
  Future<String> generateShareLink(String whiteboardId) async {
    try {
      final basePath = _getBasePath();

      final response = await AuthService.instance.dio.post(
        '$basePath/$whiteboardId/share',
        data: {},
      );

      final data = response.data;
      if (data is Map && data['data'] != null && data['data']['shareLink'] != null) {
        return data['data']['shareLink'] as String;
      } else if (data is Map && data['shareLink'] != null) {
        return data['shareLink'] as String;
      }

      throw Exception('Share link not found in response');
    } catch (e) {
      debugPrint('[WhiteboardApiService] generateShareLink error: $e');
      rethrow;
    }
  }

  /// Upload image for whiteboard
  Future<String> uploadImage(String whiteboardId, List<int> imageBytes, String fileName) async {
    try {
      final basePath = _getBasePath();

      final formData = {
        'file': MultipartFile.fromBytes(imageBytes, filename: fileName),
        'whiteboardId': whiteboardId,
      };

      final response = await AuthService.instance.dio.post(
        '$basePath/$whiteboardId/upload',
        data: formData,
      );

      final data = response.data;
      if (data is Map && data['data'] != null && data['data']['url'] != null) {
        return data['data']['url'] as String;
      } else if (data is Map && data['url'] != null) {
        return data['url'] as String;
      }

      throw Exception('Upload URL not found in response');
    } catch (e) {
      debugPrint('[WhiteboardApiService] uploadImage error: $e');
      rethrow;
    }
  }
}

/// Multipart file helper for image uploads
class MultipartFile {
  final List<int> bytes;
  final String filename;

  MultipartFile.fromBytes(this.bytes, {required this.filename});

  Map<String, dynamic> toJson() {
    return {
      'bytes': bytes,
      'filename': filename,
    };
  }
}
