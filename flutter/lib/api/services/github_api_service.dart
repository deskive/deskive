import 'package:dio/dio.dart';
import '../base_api_client.dart';

/// GitHub Connection model
class GitHubConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? githubId;
  final String? githubLogin;
  final String? githubName;
  final String? githubEmail;
  final String? githubAvatar;
  final bool isActive;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;

  GitHubConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.githubId,
    this.githubLogin,
    this.githubName,
    this.githubEmail,
    this.githubAvatar,
    required this.isActive,
    this.lastSyncedAt,
    required this.createdAt,
  });

  factory GitHubConnection.fromJson(Map<String, dynamic> json) {
    return GitHubConnection(
      id: json['id'] ?? '',
      workspaceId: json['workspaceId'] ?? json['workspace_id'] ?? '',
      userId: json['userId'] ?? json['user_id'] ?? '',
      githubId: json['githubId'] ?? json['github_id'],
      githubLogin: json['githubLogin'] ?? json['github_login'],
      githubName: json['githubName'] ?? json['github_name'],
      githubEmail: json['githubEmail'] ?? json['github_email'],
      githubAvatar: json['githubAvatar'] ?? json['github_avatar'],
      isActive: json['isActive'] ?? json['is_active'] ?? false,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'])
          : json['last_synced_at'] != null
              ? DateTime.parse(json['last_synced_at'])
              : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : DateTime.now(),
    );
  }
}

/// GitHub Repository model
class GitHubRepository {
  final int id;
  final String name;
  final String fullName;
  final String? description;
  final bool private;
  final String htmlUrl;
  final String? language;
  final String defaultBranch;
  final int stargazersCount;
  final int forksCount;
  final int openIssuesCount;
  final DateTime updatedAt;

  GitHubRepository({
    required this.id,
    required this.name,
    required this.fullName,
    this.description,
    required this.private,
    required this.htmlUrl,
    this.language,
    required this.defaultBranch,
    required this.stargazersCount,
    required this.forksCount,
    required this.openIssuesCount,
    required this.updatedAt,
  });

  factory GitHubRepository.fromJson(Map<String, dynamic> json) {
    return GitHubRepository(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? '',
      description: json['description'],
      private: json['private'] ?? false,
      htmlUrl: json['htmlUrl'] ?? json['html_url'] ?? '',
      language: json['language'],
      defaultBranch: json['defaultBranch'] ?? json['default_branch'] ?? 'main',
      stargazersCount: json['stargazersCount'] ?? json['stargazers_count'] ?? 0,
      forksCount: json['forksCount'] ?? json['forks_count'] ?? 0,
      openIssuesCount: json['openIssuesCount'] ?? json['open_issues_count'] ?? 0,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : json['updated_at'] != null
              ? DateTime.parse(json['updated_at'])
              : DateTime.now(),
    );
  }
}

/// GitHub Label model
class GitHubLabel {
  final String name;
  final String color;

  GitHubLabel({required this.name, required this.color});

  factory GitHubLabel.fromJson(Map<String, dynamic> json) {
    return GitHubLabel(
      name: json['name'] ?? '',
      color: json['color'] ?? '858585',
    );
  }
}

/// GitHub Issue model
class GitHubIssue {
  final int id;
  final int number;
  final String title;
  final String? body;
  final String state;
  final String htmlUrl;
  final String type; // 'issue' or 'pull_request'
  final String? authorLogin;
  final String? authorAvatar;
  final List<GitHubLabel> labels;
  final List<String> assignees;
  final int commentsCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? closedAt;
  final DateTime? mergedAt;
  final bool? draft;
  final bool? merged;

  GitHubIssue({
    required this.id,
    required this.number,
    required this.title,
    this.body,
    required this.state,
    required this.htmlUrl,
    required this.type,
    this.authorLogin,
    this.authorAvatar,
    required this.labels,
    required this.assignees,
    required this.commentsCount,
    required this.createdAt,
    required this.updatedAt,
    this.closedAt,
    this.mergedAt,
    this.draft,
    this.merged,
  });

  factory GitHubIssue.fromJson(Map<String, dynamic> json) {
    return GitHubIssue(
      id: json['id'] ?? 0,
      number: json['number'] ?? 0,
      title: json['title'] ?? '',
      body: json['body'],
      state: json['state'] ?? 'open',
      htmlUrl: json['htmlUrl'] ?? json['html_url'] ?? '',
      type: json['type'] ?? 'issue',
      authorLogin: json['authorLogin'] ?? json['author_login'],
      authorAvatar: json['authorAvatar'] ?? json['author_avatar'],
      labels: (json['labels'] as List<dynamic>?)
              ?.map((l) => GitHubLabel.fromJson(l as Map<String, dynamic>))
              .toList() ??
          [],
      assignees: (json['assignees'] as List<dynamic>?)
              ?.map((a) => a.toString())
              .toList() ??
          [],
      commentsCount: json['commentsCount'] ?? json['comments_count'] ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : json['updated_at'] != null
              ? DateTime.parse(json['updated_at'])
              : DateTime.now(),
      closedAt: json['closedAt'] != null
          ? DateTime.parse(json['closedAt'])
          : json['closed_at'] != null
              ? DateTime.parse(json['closed_at'])
              : null,
      mergedAt: json['mergedAt'] != null
          ? DateTime.parse(json['mergedAt'])
          : json['merged_at'] != null
              ? DateTime.parse(json['merged_at'])
              : null,
      draft: json['draft'],
      merged: json['merged'],
    );
  }
}

/// GitHub Issue Link model
class GitHubIssueLink {
  final String id;
  final String taskId;
  final String workspaceId;
  final String issueType;
  final int issueNumber;
  final String issueId;
  final String repoOwner;
  final String repoName;
  final String repoFullName;
  final String title;
  final String state;
  final String htmlUrl;
  final String? authorLogin;
  final String? authorAvatar;
  final List<GitHubLabel> labels;
  final bool autoUpdateTaskStatus;
  final DateTime? createdAtGithub;
  final DateTime? updatedAtGithub;
  final DateTime? closedAtGithub;
  final DateTime? mergedAtGithub;
  final String linkedBy;
  final DateTime createdAt;

  GitHubIssueLink({
    required this.id,
    required this.taskId,
    required this.workspaceId,
    required this.issueType,
    required this.issueNumber,
    required this.issueId,
    required this.repoOwner,
    required this.repoName,
    required this.repoFullName,
    required this.title,
    required this.state,
    required this.htmlUrl,
    this.authorLogin,
    this.authorAvatar,
    required this.labels,
    required this.autoUpdateTaskStatus,
    this.createdAtGithub,
    this.updatedAtGithub,
    this.closedAtGithub,
    this.mergedAtGithub,
    required this.linkedBy,
    required this.createdAt,
  });

  factory GitHubIssueLink.fromJson(Map<String, dynamic> json) {
    return GitHubIssueLink(
      id: json['id'] ?? '',
      taskId: json['taskId'] ?? json['task_id'] ?? '',
      workspaceId: json['workspaceId'] ?? json['workspace_id'] ?? '',
      issueType: json['issueType'] ?? json['issue_type'] ?? 'issue',
      issueNumber: json['issueNumber'] ?? json['issue_number'] ?? 0,
      issueId: json['issueId'] ?? json['issue_id'] ?? '',
      repoOwner: json['repoOwner'] ?? json['repo_owner'] ?? '',
      repoName: json['repoName'] ?? json['repo_name'] ?? '',
      repoFullName: json['repoFullName'] ?? json['repo_full_name'] ?? '',
      title: json['title'] ?? '',
      state: json['state'] ?? 'open',
      htmlUrl: json['htmlUrl'] ?? json['html_url'] ?? '',
      authorLogin: json['authorLogin'] ?? json['author_login'],
      authorAvatar: json['authorAvatar'] ?? json['author_avatar'],
      labels: (json['labels'] as List<dynamic>?)
              ?.map((l) => GitHubLabel.fromJson(l as Map<String, dynamic>))
              .toList() ??
          [],
      autoUpdateTaskStatus:
          json['autoUpdateTaskStatus'] ?? json['auto_update_task_status'] ?? false,
      createdAtGithub: json['createdAtGithub'] != null
          ? DateTime.parse(json['createdAtGithub'])
          : null,
      updatedAtGithub: json['updatedAtGithub'] != null
          ? DateTime.parse(json['updatedAtGithub'])
          : null,
      closedAtGithub: json['closedAtGithub'] != null
          ? DateTime.parse(json['closedAtGithub'])
          : null,
      mergedAtGithub: json['mergedAtGithub'] != null
          ? DateTime.parse(json['mergedAtGithub'])
          : null,
      linkedBy: json['linkedBy'] ?? json['linked_by'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : DateTime.now(),
    );
  }
}

/// GitHub API Service
class GitHubApiService {
  static GitHubApiService? _instance;
  static GitHubApiService get instance => _instance ??= GitHubApiService._();

  GitHubApiService._();

  Dio get _dio => BaseApiClient.instance.dio;

  // ==================== OAuth & Connection ====================

  /// Get OAuth authorization URL
  Future<Map<String, String>> getAuthUrl(String workspaceId, {String? returnUrl}) async {
    try {
      final params = returnUrl != null ? '?returnUrl=${Uri.encodeComponent(returnUrl)}' : '';
      final response = await _dio.get('/workspaces/$workspaceId/github/auth/url$params');
      final data = response.data['data'] ?? response.data;
      return {
        'authorizationUrl': data['authorizationUrl'] ?? '',
        'state': data['state'] ?? '',
      };
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get GitHub auth URL');
    }
  }

  /// Get current GitHub connection status
  Future<GitHubConnection?> getConnection(String workspaceId) async {
    try {
      final response = await _dio.get('/workspaces/$workspaceId/github/connection');
      final data = response.data['data'] ?? response.data;
      if (data == null) return null;
      return GitHubConnection.fromJson(data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw Exception(e.response?.data?['message'] ?? 'Failed to get GitHub connection');
    }
  }

  /// Disconnect GitHub
  Future<void> disconnect(String workspaceId) async {
    try {
      await _dio.delete('/workspaces/$workspaceId/github/disconnect');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to disconnect GitHub');
    }
  }

  // ==================== Repositories ====================

  /// List user's repositories
  Future<List<GitHubRepository>> listRepositories(
    String workspaceId, {
    int page = 1,
    int perPage = 30,
    String sort = 'updated',
    String direction = 'desc',
    String type = 'all',
  }) async {
    try {
      final queryParams = {
        'page': page.toString(),
        'perPage': perPage.toString(),
        'sort': sort,
        'direction': direction,
        'type': type,
      };
      final queryString = queryParams.entries.map((e) => '${e.key}=${e.value}').join('&');
      final response = await _dio.get('/workspaces/$workspaceId/github/repositories?$queryString');
      final data = response.data['data'] ?? response.data;
      final repos = data['repositories'] ?? data;
      if (repos is! List) return [];
      return repos.map((r) => GitHubRepository.fromJson(r as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to list repositories');
    }
  }

  /// Get a specific repository
  Future<GitHubRepository> getRepository(String workspaceId, String owner, String repo) async {
    try {
      final response = await _dio.get('/workspaces/$workspaceId/github/repositories/$owner/$repo');
      final data = response.data['data'] ?? response.data;
      return GitHubRepository.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get repository');
    }
  }

  // ==================== Issues/PRs ====================

  /// List issues and PRs from a repository
  Future<List<GitHubIssue>> listIssues(
    String workspaceId,
    String owner,
    String repo, {
    String state = 'open',
    String type = 'all',
    String? query,
    int page = 1,
    int perPage = 30,
    String sort = 'updated',
    String direction = 'desc',
  }) async {
    try {
      final queryParams = <String, String>{
        'state': state,
        'type': type,
        'page': page.toString(),
        'perPage': perPage.toString(),
        'sort': sort,
        'direction': direction,
      };
      if (query != null && query.isNotEmpty) {
        queryParams['query'] = query;
      }
      final queryString = queryParams.entries.map((e) => '${e.key}=${e.value}').join('&');
      final response = await _dio.get(
        '/workspaces/$workspaceId/github/repositories/$owner/$repo/issues?$queryString',
      );
      final data = response.data['data'] ?? response.data;
      final issues = data['issues'] ?? data;
      if (issues is! List) return [];
      return issues.map((i) => GitHubIssue.fromJson(i as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to list issues');
    }
  }

  /// Get a specific issue or PR
  Future<GitHubIssue> getIssue(
    String workspaceId,
    String owner,
    String repo,
    int issueNumber,
  ) async {
    try {
      final response = await _dio.get(
        '/workspaces/$workspaceId/github/repositories/$owner/$repo/issues/$issueNumber',
      );
      final data = response.data['data'] ?? response.data;
      return GitHubIssue.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get issue');
    }
  }

  // ==================== Task Links ====================

  /// Link a GitHub issue/PR to a task
  Future<GitHubIssueLink> linkIssueToTask(
    String workspaceId, {
    required String taskId,
    required String repoOwner,
    required String repoName,
    required int issueNumber,
    bool autoUpdateTaskStatus = false,
  }) async {
    try {
      final response = await _dio.post(
        '/workspaces/$workspaceId/github/links',
        data: {
          'taskId': taskId,
          'repoOwner': repoOwner,
          'repoName': repoName,
          'issueNumber': issueNumber,
          'autoUpdateTaskStatus': autoUpdateTaskStatus,
        },
      );
      final data = response.data['data'] ?? response.data;
      return GitHubIssueLink.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to link issue');
    }
  }

  /// Unlink a GitHub issue/PR from a task
  Future<void> unlinkIssueFromTask(String workspaceId, String linkId) async {
    try {
      await _dio.delete('/workspaces/$workspaceId/github/links/$linkId');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to unlink issue');
    }
  }

  /// Get all GitHub links for a task
  Future<List<GitHubIssueLink>> getTaskLinks(String workspaceId, String taskId) async {
    try {
      final response = await _dio.get('/workspaces/$workspaceId/github/tasks/$taskId/links');
      final data = response.data['data'] ?? response.data;
      if (data is! List) return [];
      return data.map((l) => GitHubIssueLink.fromJson(l as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get task links');
    }
  }

  /// Sync/refresh a GitHub issue link with latest data
  Future<GitHubIssueLink> syncIssueLink(String workspaceId, String linkId) async {
    try {
      final response = await _dio.post(
        '/workspaces/$workspaceId/github/links/$linkId/sync',
        data: {},
      );
      final data = response.data['data'] ?? response.data;
      return GitHubIssueLink.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to sync issue link');
    }
  }
}

// ==================== Helper Functions ====================

/// Get language color for GitHub repository
String getLanguageColor(String? language) {
  const colors = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python': '#3572A5',
    'Java': '#b07219',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'Ruby': '#701516',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'PHP': '#4F5D95',
    'Swift': '#F05138',
    'Kotlin': '#A97BFF',
    'Dart': '#00B4AB',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Shell': '#89e051',
    'Vue': '#41b883',
  };
  return colors[language] ?? '#858585';
}

/// Format repository updated time
String formatUpdatedAt(DateTime date) {
  final now = DateTime.now();
  final diff = now.difference(date);

  if (diff.inMinutes < 60) {
    return '${diff.inMinutes}m ago';
  } else if (diff.inHours < 24) {
    return '${diff.inHours}h ago';
  } else if (diff.inDays == 1) {
    return 'yesterday';
  } else if (diff.inDays < 7) {
    return '${diff.inDays} days ago';
  } else if (diff.inDays < 30) {
    final weeks = diff.inDays ~/ 7;
    return '$weeks week${weeks > 1 ? 's' : ''} ago';
  } else if (diff.inDays < 365) {
    final months = diff.inDays ~/ 30;
    return '$months month${months > 1 ? 's' : ''} ago';
  } else {
    final years = diff.inDays ~/ 365;
    return '$years year${years > 1 ? 's' : ''} ago';
  }
}

/// Format star count
String formatStarCount(int count) {
  if (count >= 1000000) {
    return '${(count / 1000000).toStringAsFixed(1)}M';
  } else if (count >= 1000) {
    return '${(count / 1000).toStringAsFixed(1)}k';
  }
  return count.toString();
}
