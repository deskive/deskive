import 'dart:io';
import 'package:dio/dio.dart';
import '../base_api_client.dart';
import '../../models/feedback/feedback_model.dart';

/// DTO for creating feedback
class CreateFeedbackDto {
  final FeedbackType type;
  final String title;
  final String description;
  final FeedbackCategory? category;
  final List<FeedbackAttachment>? attachments;
  final String? appVersion;
  final DeviceInfo? deviceInfo;

  CreateFeedbackDto({
    required this.type,
    required this.title,
    required this.description,
    this.category,
    this.attachments,
    this.appVersion,
    this.deviceInfo,
  });

  Map<String, dynamic> toJson() => {
        'type': type.value,
        'title': title,
        'description': description,
        if (category != null) 'category': category!.value,
        if (attachments != null && attachments!.isNotEmpty)
          'attachments': attachments!.map((a) => a.toJson()).toList(),
        if (appVersion != null) 'appVersion': appVersion,
        if (deviceInfo != null) 'deviceInfo': deviceInfo!.toJson(),
      };
}

/// DTO for querying feedback
class FeedbackQueryDto {
  final FeedbackType? type;
  final FeedbackStatus? status;
  final String? search;
  final int? page;
  final int? limit;
  final String? sortBy;
  final String? sortOrder;

  FeedbackQueryDto({
    this.type,
    this.status,
    this.search,
    this.page,
    this.limit,
    this.sortBy,
    this.sortOrder,
  });

  Map<String, dynamic> toQueryParameters() {
    final map = <String, dynamic>{};
    if (type != null) map['type'] = type!.value;
    if (status != null) map['status'] = status!.value;
    if (search != null && search!.isNotEmpty) map['search'] = search;
    if (page != null) map['page'] = page;
    if (limit != null) map['limit'] = limit;
    if (sortBy != null) map['sortBy'] = sortBy;
    if (sortOrder != null) map['sortOrder'] = sortOrder;
    return map;
  }
}

/// API service for feedback operations
class FeedbackApiService {
  final BaseApiClient _apiClient;

  FeedbackApiService({BaseApiClient? apiClient})
      : _apiClient = apiClient ?? BaseApiClient.instance;

  // ==================== USER OPERATIONS ====================

  /// Submit new feedback
  Future<ApiResponse<FeedbackModel>> createFeedback(CreateFeedbackDto dto) async {
    try {
      final response = await _apiClient.post(
        '/feedback',
        data: dto.toJson(),
      );

      final responseData = response.data;
      final feedbackData = responseData is Map<String, dynamic>
          ? (responseData['data'] as Map<String, dynamic>? ?? responseData)
          : <String, dynamic>{};
      return ApiResponse.success(
        FeedbackModel.fromJson(feedbackData),
        message: responseData['message'] ?? 'Feedback submitted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to submit feedback',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to submit feedback: $e');
    }
  }

  /// Get user's feedback list
  Future<ApiResponse<PaginatedFeedback>> getUserFeedback({
    FeedbackQueryDto? query,
  }) async {
    try {
      final response = await _apiClient.get(
        '/feedback/my',
        queryParameters: query?.toQueryParameters(),
      );

      final responseData = response.data;
      // Handle different response structures
      Map<String, dynamic> paginatedData;
      if (responseData is Map<String, dynamic>) {
        paginatedData = responseData['data'] is Map<String, dynamic>
            ? responseData['data'] as Map<String, dynamic>
            : responseData;
      } else {
        // Fallback to empty paginated response
        paginatedData = {
          'data': [],
          'total': 0,
          'page': 1,
          'limit': 20,
          'totalPages': 0,
        };
      }

      return ApiResponse.success(
        PaginatedFeedback.fromJson(paginatedData),
        message: 'Feedback retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to get feedback',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse feedback data: $e',
      );
    }
  }

  /// Get single feedback by ID
  Future<ApiResponse<FeedbackModel>> getFeedbackById(String feedbackId) async {
    try {
      final response = await _apiClient.get('/feedback/$feedbackId');

      final responseData = response.data;
      final feedbackData = responseData is Map<String, dynamic>
          ? (responseData['data'] as Map<String, dynamic>? ?? responseData)
          : <String, dynamic>{};
      return ApiResponse.success(
        FeedbackModel.fromJson(feedbackData),
        message: 'Feedback retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to get feedback',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to get feedback: $e');
    }
  }

  /// Upload attachment for feedback
  Future<ApiResponse<FeedbackAttachment>> uploadAttachment(File file) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          file.path,
          filename: file.path.split('/').last,
        ),
      });

      final response = await _apiClient.post(
        '/feedback/upload',
        data: formData,
      );

      final responseData = response.data;
      final attachmentData = responseData is Map<String, dynamic>
          ? (responseData['data'] as Map<String, dynamic>? ?? responseData)
          : <String, dynamic>{};
      return ApiResponse.success(
        FeedbackAttachment.fromJson(attachmentData),
        message: 'File uploaded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to upload file',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to upload file: $e');
    }
  }

  /// Get responses for a feedback
  Future<ApiResponse<List<FeedbackResponseModel>>> getResponses(
      String feedbackId) async {
    try {
      final response = await _apiClient.get('/feedback/$feedbackId/responses');

      final responseData = response.data;
      List<dynamic> responsesData = [];
      if (responseData is Map<String, dynamic>) {
        responsesData = responseData['data'] is List
            ? responseData['data'] as List
            : [];
      } else if (responseData is List) {
        responsesData = responseData;
      }

      final List<FeedbackResponseModel> responses = responsesData
          .whereType<Map<String, dynamic>>()
          .map((e) => FeedbackResponseModel.fromJson(e))
          .toList();

      return ApiResponse.success(
        responses,
        message: 'Responses retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.response?.data?['message'] ?? e.message ?? 'Failed to get responses',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to get responses: $e');
    }
  }
}

