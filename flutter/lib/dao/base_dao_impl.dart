import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../api/base_api_client.dart';
import 'base_dao.dart';

/// Base DAO implementation using Dio through BaseApiClient
abstract class BaseDaoImpl implements BaseDao {
  final String baseEndpoint;
  final BaseApiClient _apiClient;

  BaseDaoImpl({
    required this.baseEndpoint,
  }) : _apiClient = BaseApiClient.instance;

  /// Build full endpoint path
  String _buildPath(String endpoint) {
    if (endpoint.isEmpty) {
      return baseEndpoint;
    }
    return '$baseEndpoint/$endpoint'.replaceAll('//', '/');
  }

  @override
  Future<T> get<T>(
    String endpoint, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final path = _buildPath(endpoint);

      final response = await _apiClient.get<T>(
        path,
        queryParameters: queryParameters,
      );

      return response.data as T;
    } on DioException catch (e) {
      rethrow;
    }
  }

  /// GET request with custom options and progress callback
  Future<Response<T>> getWithOptions<T>(
    String endpoint, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    void Function(int received, int total)? onReceiveProgress,
  }) async {
    try {
      final path = _buildPath(endpoint);

      final response = await _apiClient.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
        onReceiveProgress: onReceiveProgress,
      );

      return response;
    } on DioException catch (e) {
      rethrow;
    }
  }

  @override
  Future<T> post<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final path = _buildPath(endpoint);

      final response = await _apiClient.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
      );

      return response.data as T;
    } on DioException catch (e) {
      rethrow;
    }
  }

  @override
  Future<T> put<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final path = _buildPath(endpoint);

      final response = await _apiClient.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
      );

      return response.data as T;
    } on DioException catch (e) {
      rethrow;
    }
  }

  @override
  Future<T> patch<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final path = _buildPath(endpoint);

      final response = await _apiClient.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
      );

      return response.data as T;
    } on DioException catch (e) {
      rethrow;
    }
  }

  @override
  Future<T> delete<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final path = _buildPath(endpoint);

      final response = await _apiClient.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
      );

      return response.data as T;
    } on DioException catch (e) {
      rethrow;
    }
  }

  // ============================================
  // Direct methods (bypass base endpoint)
  // ============================================

  /// GET request directly to endpoint (without base endpoint prefix)
  Future<T> getDirect<T>(
    String endpoint, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {

      final response = await _apiClient.get<T>(
        endpoint,
        queryParameters: queryParameters,
      );

      return response.data as T;
    } on DioException catch (e) {
      rethrow;
    }
  }

  /// POST request directly to endpoint (without base endpoint prefix)
  Future<T> postDirect<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {

      final response = await _apiClient.post<T>(
        endpoint,
        data: data,
        queryParameters: queryParameters,
      );

      return response.data as T;
    } on DioException catch (e) {
      rethrow;
    }
  }

  /// PATCH request directly to endpoint (without base endpoint prefix)
  Future<T> patchDirect<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _apiClient.patch<T>(
        endpoint,
        data: data,
        queryParameters: queryParameters,
      );

      return response.data as T;
    } on DioException catch (e) {
      rethrow;
    }
  }
}
