import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import '../config/api_config.dart';
import '../config/env_config.dart';

/// Base API client with Dio configuration for all API operations
class BaseApiClient {
  static BaseApiClient? _instance;
  late Dio _dio;

  // Singleton pattern
  static BaseApiClient get instance => _instance ??= BaseApiClient._internal();

  BaseApiClient._internal() {
    _initializeDio();
  }

  // Base URL for the backend API - loaded from ApiConfig
  static String get baseUrl => ApiConfig.apiBaseUrl;
  
  /// Initialize Dio with configuration
  void _initializeDio() {
    final timeout = Duration(milliseconds: EnvConfig.apiTimeout);
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: timeout,
      receiveTimeout: timeout,
      sendTimeout: timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    
    // Add interceptors
    _dio.interceptors.add(_AuthInterceptor());
    
    if (EnvConfig.isLoggingEnabled && EnvConfig.isDebugMode) {
      // Add logging interceptor in debug mode
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        requestHeader: true,
        responseHeader: false,
        logPrint: (object) {
        },
      ));
    }
    
    // Add error handling interceptor
    _dio.interceptors.add(_ErrorInterceptor());
  }
  
  /// Get the configured Dio instance
  Dio get dio => _dio;

  /// Get the current auth token for external use (e.g., SSE streaming)
  Future<String?> getAuthToken() async {
    final authService = AuthService.instance;
    return authService.currentSession;
  }
  
  /// GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      return await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onReceiveProgress: onReceiveProgress,
      );
    } catch (e) {
      rethrow;
    }
  }
  
  /// POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
        onReceiveProgress: onReceiveProgress,
      );
    } catch (e) {
      rethrow;
    }
  }
  
  /// PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      return await _dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
        onReceiveProgress: onReceiveProgress,
      );
    } catch (e) {
      rethrow;
    }
  }
  
  /// PATCH request
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      return await _dio.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
        onReceiveProgress: onReceiveProgress,
      );
    } catch (e) {
      rethrow;
    }
  }
  
  /// DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } catch (e) {
      rethrow;
    }
  }
  
  /// Upload file using FormData
  Future<Response<T>> upload<T>(
    String path,
    Map<String, dynamic> data, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final formData = FormData.fromMap(data);
      return await _dio.post<T>(
        path,
        data: formData,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
      );
    } catch (e) {
      rethrow;
    }
  }
  
  /// Download file
  Future<Response> download(
    String urlPath,
    String savePath, {
    ProgressCallback? onReceiveProgress,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    bool deleteOnError = true,
    String lengthHeader = Headers.contentLengthHeader,
    Options? options,
  }) async {
    try {
      return await _dio.download(
        urlPath,
        savePath,
        onReceiveProgress: onReceiveProgress,
        queryParameters: queryParameters,
        cancelToken: cancelToken,
        deleteOnError: deleteOnError,
        lengthHeader: lengthHeader,
        options: options,
      );
    } catch (e) {
      rethrow;
    }
  }
}

/// Auth interceptor to automatically add JWT tokens to requests
class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Get the current session token from AuthService
    final authService = AuthService.instance;
    final token = authService.currentSession;
    
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    
    handler.next(options);
  }
}

/// Error handling interceptor
class _ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Handle different types of errors
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        err = err.copyWith(
          message: 'Connection timeout. Please check your internet connection.',
        );
        break;
      case DioExceptionType.badResponse:
        err = _handleHttpError(err);
        break;
      case DioExceptionType.cancel:
        err = err.copyWith(message: 'Request was cancelled');
        break;
      case DioExceptionType.connectionError:
        err = err.copyWith(
          message: 'Connection error. Please check your internet connection.',
        );
        break;
      case DioExceptionType.badCertificate:
        err = err.copyWith(message: 'Certificate error');
        break;
      case DioExceptionType.unknown:
        err = err.copyWith(message: 'An unknown error occurred');
        break;
    }
    
    handler.next(err);
  }
  
  /// Handle HTTP response errors
  DioException _handleHttpError(DioException err) {
    final statusCode = err.response?.statusCode;
    final data = err.response?.data;
    
    switch (statusCode) {
      case 400:
        return err.copyWith(
          message: data?['message'] ?? 'Bad request',
        );
      case 401:
        // Handle unauthorized - maybe trigger logout
        _handleUnauthorized();
        return err.copyWith(
          message: data?['message'] ?? 'Unauthorized access',
        );
      case 403:
        return err.copyWith(
          message: data?['message'] ?? 'Access forbidden',
        );
      case 404:
        return err.copyWith(
          message: data?['message'] ?? 'Resource not found',
        );
      case 409:
        return err.copyWith(
          message: data?['message'] ?? 'Conflict error',
        );
      case 422:
        return err.copyWith(
          message: data?['message'] ?? 'Validation error',
        );
      case 500:
        return err.copyWith(
          message: data?['message'] ?? 'Internal server error',
        );
      default:
        return err.copyWith(
          message: data?['message'] ?? 'Server error occurred',
        );
    }
  }
  
  /// Handle unauthorized errors (401)
  void _handleUnauthorized() {
    // This could trigger a logout or token refresh
    // For now, just log it
    
    // In a full implementation, you might want to:
    // 1. Try to refresh the token first
    // 2. If refresh fails, logout the user
    // AuthService.instance.signOut();
  }
}

/// Custom exception for API errors
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  const ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() {
    return 'ApiException: $message (Status: $statusCode)';
  }
}

/// Helper to extract user-friendly error message from any error
/// Use this in catch blocks to show proper error messages to users
String extractErrorMessage(dynamic error, {String fallback = 'Something went wrong'}) {
  if (error is DioException) {
    // Try to get message from response data first
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      // Check for common error message fields
      final message = data['message'] ?? data['error'] ?? data['details']?['message'];
      if (message != null && message is String && message.isNotEmpty) {
        return message;
      }
    }
    // Fall back to Dio's message (which we set in the error interceptor)
    if (error.message != null && error.message!.isNotEmpty) {
      return error.message!;
    }
  } else if (error is ApiException) {
    return error.message;
  } else if (error is String) {
    return error;
  }

  // Last resort: use toString but clean it up
  final errorString = error.toString();

  // Remove type prefixes like "type '_Map<String, dynamic>' is not a subtype..."
  if (errorString.contains('type') && errorString.contains('is not a subtype')) {
    return fallback;
  }

  return errorString.isNotEmpty ? errorString : fallback;
}

/// Response wrapper for standardized API responses
class ApiResponse<T> {
  final T? data;
  final String? message;
  final bool success;
  final int? statusCode;

  const ApiResponse({
    this.data,
    this.message,
    required this.success,
    this.statusCode,
  });

  /// Convenience getter for success status
  bool get isSuccess => success;

  /// Convenience getter for error message (alias for message when not successful)
  String? get error => success ? null : message;

  factory ApiResponse.success(T data, {String? message, int? statusCode}) {
    return ApiResponse(
      data: data,
      message: message,
      success: true,
      statusCode: statusCode,
    );
  }

  factory ApiResponse.error(String message, {int? statusCode, dynamic data}) {
    return ApiResponse(
      data: data,
      message: message,
      success: false,
      statusCode: statusCode,
    );
  }
}

/// Pagination response wrapper
class PaginatedResponse<T> {
  final List<T> data;
  final int currentPage;
  final int totalPages;
  final int totalItems;
  final int itemsPerPage;
  final bool hasNextPage;
  final bool hasPreviousPage;
  
  const PaginatedResponse({
    required this.data,
    required this.currentPage,
    required this.totalPages,
    required this.totalItems,
    required this.itemsPerPage,
    required this.hasNextPage,
    required this.hasPreviousPage,
  });
  
  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    final dataList = (json['data'] as List?)
            ?.map((item) => fromJsonT(item as Map<String, dynamic>))
            .toList() ??
        <T>[];
    
    return PaginatedResponse(
      data: dataList,
      currentPage: json['currentPage'] ?? 1,
      totalPages: json['totalPages'] ?? 1,
      totalItems: json['totalItems'] ?? 0,
      itemsPerPage: json['itemsPerPage'] ?? 0,
      hasNextPage: json['hasNextPage'] ?? false,
      hasPreviousPage: json['hasPreviousPage'] ?? false,
    );
  }
}