import 'package:dio/dio.dart';
import '../../api/base_api_client.dart';
import '../../config/app_config.dart';
import '../models/twitter_models.dart';

/// Service for Twitter/X API operations
class TwitterService {
  static TwitterService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  static TwitterService get instance => _instance ??= TwitterService._internal();

  TwitterService._internal();

  // ==========================================================================
  // OAuth & Connection
  // ==========================================================================

  /// Get OAuth authorization URL for connecting Twitter
  Future<Map<String, String>> getAuthUrl({String? returnUrl}) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (returnUrl != null) {
      queryParams['returnUrl'] = returnUrl;
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/auth/url',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return {
      'authorizationUrl': data['authorizationUrl'] as String,
      'state': data['state'] as String? ?? '',
    };
  }

  /// Get current Twitter connection status
  Future<TwitterConnection?> getConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/twitter/connection',
      );

      final data = _extractData(response.data);
      if (data == null) return null;

      return TwitterConnection.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  /// Disconnect Twitter
  Future<void> disconnect() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete('/workspaces/$workspaceId/twitter/disconnect');
  }

  // ==========================================================================
  // Timeline
  // ==========================================================================

  /// Get home timeline
  Future<TwitterTimelineResponse> getHomeTimeline({
    int? maxResults,
    String? paginationToken,
    bool? excludeReplies,
    bool? excludeRetweets,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (maxResults != null) queryParams['maxResults'] = maxResults.toString();
    if (paginationToken != null) queryParams['paginationToken'] = paginationToken;
    if (excludeReplies != null) queryParams['excludeReplies'] = excludeReplies.toString();
    if (excludeRetweets != null) queryParams['excludeRetweets'] = excludeRetweets.toString();

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/timeline/home',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return TwitterTimelineResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Get user tweets
  Future<TwitterTimelineResponse> getUserTweets(
    String twitterUserId, {
    int? maxResults,
    String? paginationToken,
    bool? excludeReplies,
    bool? excludeRetweets,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (maxResults != null) queryParams['maxResults'] = maxResults.toString();
    if (paginationToken != null) queryParams['paginationToken'] = paginationToken;
    if (excludeReplies != null) queryParams['excludeReplies'] = excludeReplies.toString();
    if (excludeRetweets != null) queryParams['excludeRetweets'] = excludeRetweets.toString();

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/users/$twitterUserId/tweets',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return TwitterTimelineResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Tweets
  // ==========================================================================

  /// Get a single tweet
  Future<Tweet> getTweet(String tweetId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/tweets/$tweetId',
    );

    final data = _extractData(response.data);
    return Tweet.fromJson(data as Map<String, dynamic>);
  }

  /// Create a new tweet
  Future<Map<String, String>> createTweet({
    required String text,
    String? replyToTweetId,
    String? quoteTweetId,
    List<String>? mediaIds,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/twitter/tweets',
      data: {
        'text': text,
        if (replyToTweetId != null) 'replyToTweetId': replyToTweetId,
        if (quoteTweetId != null) 'quoteTweetId': quoteTweetId,
        if (mediaIds != null) 'mediaIds': mediaIds,
      },
    );

    final data = _extractData(response.data);
    return {
      'id': data['id'] as String,
      'text': data['text'] as String,
    };
  }

  /// Delete a tweet
  Future<bool> deleteTweet(String tweetId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.delete(
      '/workspaces/$workspaceId/twitter/tweets/$tweetId',
    );

    final data = _extractData(response.data);
    return data['deleted'] as bool? ?? false;
  }

  // ==========================================================================
  // Likes
  // ==========================================================================

  /// Like a tweet
  Future<bool> likeTweet(String tweetId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/twitter/tweets/$tweetId/like',
      data: {},
    );

    final data = _extractData(response.data);
    return data['liked'] as bool? ?? false;
  }

  /// Unlike a tweet
  Future<bool> unlikeTweet(String tweetId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.delete(
      '/workspaces/$workspaceId/twitter/tweets/$tweetId/like',
    );

    final data = _extractData(response.data);
    return data['liked'] as bool? ?? false;
  }

  /// Get user's liked tweets
  Future<TwitterTimelineResponse> getLikedTweets(
    String twitterUserId, {
    int? maxResults,
    String? paginationToken,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (maxResults != null) queryParams['maxResults'] = maxResults.toString();
    if (paginationToken != null) queryParams['paginationToken'] = paginationToken;

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/users/$twitterUserId/liked-tweets',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return TwitterTimelineResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Retweets
  // ==========================================================================

  /// Retweet a tweet
  Future<bool> retweet(String tweetId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/twitter/tweets/$tweetId/retweet',
      data: {},
    );

    final data = _extractData(response.data);
    return data['retweeted'] as bool? ?? false;
  }

  /// Undo retweet
  Future<bool> undoRetweet(String tweetId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.delete(
      '/workspaces/$workspaceId/twitter/tweets/$tweetId/retweet',
    );

    final data = _extractData(response.data);
    return data['retweeted'] as bool? ?? false;
  }

  // ==========================================================================
  // Users
  // ==========================================================================

  /// Get user by username
  Future<TwitterUser> getUserByUsername(String username) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/users/by/username/$username',
    );

    final data = _extractData(response.data);
    return TwitterUser.fromJson(data as Map<String, dynamic>);
  }

  /// Get user by ID
  Future<TwitterUser> getUserById(String twitterUserId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/users/$twitterUserId',
    );

    final data = _extractData(response.data);
    return TwitterUser.fromJson(data as Map<String, dynamic>);
  }

  /// Get followers
  Future<TwitterFollowResponse> getFollowers(
    String twitterUserId, {
    int? maxResults,
    String? paginationToken,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (maxResults != null) queryParams['maxResults'] = maxResults.toString();
    if (paginationToken != null) queryParams['paginationToken'] = paginationToken;

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/users/$twitterUserId/followers',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return TwitterFollowResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Get following
  Future<TwitterFollowResponse> getFollowing(
    String twitterUserId, {
    int? maxResults,
    String? paginationToken,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (maxResults != null) queryParams['maxResults'] = maxResults.toString();
    if (paginationToken != null) queryParams['paginationToken'] = paginationToken;

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/users/$twitterUserId/following',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return TwitterFollowResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Follow a user
  Future<Map<String, bool>> followUser(String targetUserId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/twitter/users/$targetUserId/follow',
      data: {},
    );

    final data = _extractData(response.data);
    return {
      'following': data['following'] as bool? ?? false,
      'pendingFollow': data['pendingFollow'] as bool? ?? false,
    };
  }

  /// Unfollow a user
  Future<bool> unfollowUser(String targetUserId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.delete(
      '/workspaces/$workspaceId/twitter/users/$targetUserId/follow',
    );

    final data = _extractData(response.data);
    return data['following'] as bool? ?? false;
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  /// Search tweets
  Future<TwitterTimelineResponse> searchTweets({
    required String query,
    int? maxResults,
    String? nextToken,
    String? startTime,
    String? endTime,
    String? sortOrder,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{
      'query': query,
    };
    if (maxResults != null) queryParams['maxResults'] = maxResults.toString();
    if (nextToken != null) queryParams['nextToken'] = nextToken;
    if (startTime != null) queryParams['startTime'] = startTime;
    if (endTime != null) queryParams['endTime'] = endTime;
    if (sortOrder != null) queryParams['sortOrder'] = sortOrder;

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/search/tweets',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return TwitterTimelineResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Direct Messages
  // ==========================================================================

  /// Get DM conversations
  Future<Map<String, dynamic>> getDMConversations({
    int? maxResults,
    String? paginationToken,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (maxResults != null) queryParams['maxResults'] = maxResults.toString();
    if (paginationToken != null) queryParams['paginationToken'] = paginationToken;

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/twitter/dm/conversations',
      queryParameters: queryParams,
    );

    return _extractData(response.data) as Map<String, dynamic>;
  }

  /// Send a direct message
  Future<String> sendDirectMessage({
    required String participantId,
    required String text,
    String? mediaId,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/twitter/dm/messages',
      data: {
        'participantId': participantId,
        'text': text,
        if (mediaId != null) 'mediaId': mediaId,
      },
    );

    final data = _extractData(response.data);
    return data['eventId'] as String? ?? '';
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  dynamic _extractData(dynamic responseData) {
    if (responseData is Map<String, dynamic>) {
      if (responseData.containsKey('data')) {
        return responseData['data'];
      }
      return responseData;
    }
    return responseData;
  }
}
