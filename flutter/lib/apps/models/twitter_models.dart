// Models for Twitter/X integration

/// Twitter connection status
class TwitterConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? twitterUserId;
  final String? twitterUsername;
  final String? twitterName;
  final String? twitterPicture;
  final bool? twitterVerified;
  final int? followersCount;
  final int? followingCount;
  final int? tweetCount;
  final bool isActive;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;

  TwitterConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.twitterUserId,
    this.twitterUsername,
    this.twitterName,
    this.twitterPicture,
    this.twitterVerified,
    this.followersCount,
    this.followingCount,
    this.tweetCount,
    required this.isActive,
    this.lastSyncedAt,
    required this.createdAt,
  });

  factory TwitterConnection.fromJson(Map<String, dynamic> json) {
    return TwitterConnection(
      id: json['id'] as String,
      workspaceId: json['workspaceId'] as String,
      userId: json['userId'] as String,
      twitterUserId: json['twitterUserId'] as String?,
      twitterUsername: json['twitterUsername'] as String?,
      twitterName: json['twitterName'] as String?,
      twitterPicture: json['twitterPicture'] as String?,
      twitterVerified: json['twitterVerified'] as bool?,
      followersCount: json['followersCount'] as int?,
      followingCount: json['followingCount'] as int?,
      tweetCount: json['tweetCount'] as int?,
      isActive: json['isActive'] as bool? ?? true,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// Tweet model
class Tweet {
  final String id;
  final String text;
  final String? authorId;
  final String? authorUsername;
  final String? authorName;
  final String? authorProfileImage;
  final String? createdAt;
  final TweetPublicMetrics? publicMetrics;
  final List<TweetMedia>? media;
  final List<ReferencedTweet>? referencedTweets;
  final String? conversationId;
  final String? inReplyToUserId;

  Tweet({
    required this.id,
    required this.text,
    this.authorId,
    this.authorUsername,
    this.authorName,
    this.authorProfileImage,
    this.createdAt,
    this.publicMetrics,
    this.media,
    this.referencedTweets,
    this.conversationId,
    this.inReplyToUserId,
  });

  factory Tweet.fromJson(Map<String, dynamic> json) {
    return Tweet(
      id: json['id'] as String,
      text: json['text'] as String? ?? '',
      authorId: json['authorId'] as String?,
      authorUsername: json['authorUsername'] as String?,
      authorName: json['authorName'] as String?,
      authorProfileImage: json['authorProfileImage'] as String?,
      createdAt: json['createdAt'] as String?,
      publicMetrics: json['publicMetrics'] != null
          ? TweetPublicMetrics.fromJson(
              json['publicMetrics'] as Map<String, dynamic>)
          : null,
      media: (json['media'] as List<dynamic>?)
          ?.map((e) => TweetMedia.fromJson(e as Map<String, dynamic>))
          .toList(),
      referencedTweets: (json['referencedTweets'] as List<dynamic>?)
          ?.map((e) => ReferencedTweet.fromJson(e as Map<String, dynamic>))
          .toList(),
      conversationId: json['conversationId'] as String?,
      inReplyToUserId: json['inReplyToUserId'] as String?,
    );
  }

  DateTime? get createdAtDateTime =>
      createdAt != null ? DateTime.parse(createdAt!) : null;

  bool get isReply => inReplyToUserId != null;

  bool get isRetweet =>
      referencedTweets?.any((r) => r.type == 'retweeted') ?? false;

  bool get isQuote =>
      referencedTweets?.any((r) => r.type == 'quoted') ?? false;
}

/// Tweet public metrics
class TweetPublicMetrics {
  final int retweetCount;
  final int replyCount;
  final int likeCount;
  final int quoteCount;
  final int? bookmarkCount;
  final int? impressionCount;

  TweetPublicMetrics({
    required this.retweetCount,
    required this.replyCount,
    required this.likeCount,
    required this.quoteCount,
    this.bookmarkCount,
    this.impressionCount,
  });

  factory TweetPublicMetrics.fromJson(Map<String, dynamic> json) {
    return TweetPublicMetrics(
      retweetCount: json['retweetCount'] as int? ?? 0,
      replyCount: json['replyCount'] as int? ?? 0,
      likeCount: json['likeCount'] as int? ?? 0,
      quoteCount: json['quoteCount'] as int? ?? 0,
      bookmarkCount: json['bookmarkCount'] as int?,
      impressionCount: json['impressionCount'] as int?,
    );
  }
}

/// Tweet media
class TweetMedia {
  final String mediaKey;
  final String type;
  final String? url;
  final String? previewImageUrl;
  final int? width;
  final int? height;
  final String? altText;
  final int? durationMs;

  TweetMedia({
    required this.mediaKey,
    required this.type,
    this.url,
    this.previewImageUrl,
    this.width,
    this.height,
    this.altText,
    this.durationMs,
  });

  factory TweetMedia.fromJson(Map<String, dynamic> json) {
    return TweetMedia(
      mediaKey: json['mediaKey'] as String,
      type: json['type'] as String,
      url: json['url'] as String?,
      previewImageUrl: json['previewImageUrl'] as String?,
      width: json['width'] as int?,
      height: json['height'] as int?,
      altText: json['altText'] as String?,
      durationMs: json['durationMs'] as int?,
    );
  }

  bool get isPhoto => type == 'photo';
  bool get isVideo => type == 'video';
  bool get isGif => type == 'animated_gif';
}

/// Referenced tweet
class ReferencedTweet {
  final String type;
  final String id;

  ReferencedTweet({
    required this.type,
    required this.id,
  });

  factory ReferencedTweet.fromJson(Map<String, dynamic> json) {
    return ReferencedTweet(
      type: json['type'] as String,
      id: json['id'] as String,
    );
  }
}

/// Twitter user model
class TwitterUser {
  final String id;
  final String username;
  final String name;
  final String? description;
  final String? profileImageUrl;
  final String? location;
  final String? url;
  final bool? verified;
  final bool? protected_;
  final TwitterUserMetrics? publicMetrics;
  final String? createdAt;

  TwitterUser({
    required this.id,
    required this.username,
    required this.name,
    this.description,
    this.profileImageUrl,
    this.location,
    this.url,
    this.verified,
    this.protected_,
    this.publicMetrics,
    this.createdAt,
  });

  factory TwitterUser.fromJson(Map<String, dynamic> json) {
    return TwitterUser(
      id: json['id'] as String,
      username: json['username'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      profileImageUrl: json['profileImageUrl'] as String?,
      location: json['location'] as String?,
      url: json['url'] as String?,
      verified: json['verified'] as bool?,
      protected_: json['protected'] as bool?,
      publicMetrics: json['publicMetrics'] != null
          ? TwitterUserMetrics.fromJson(
              json['publicMetrics'] as Map<String, dynamic>)
          : null,
      createdAt: json['createdAt'] as String?,
    );
  }

  String get handle => '@$username';
}

/// Twitter user metrics
class TwitterUserMetrics {
  final int followersCount;
  final int followingCount;
  final int tweetCount;
  final int listedCount;

  TwitterUserMetrics({
    required this.followersCount,
    required this.followingCount,
    required this.tweetCount,
    required this.listedCount,
  });

  factory TwitterUserMetrics.fromJson(Map<String, dynamic> json) {
    return TwitterUserMetrics(
      followersCount: json['followersCount'] as int? ?? 0,
      followingCount: json['followingCount'] as int? ?? 0,
      tweetCount: json['tweetCount'] as int? ?? 0,
      listedCount: json['listedCount'] as int? ?? 0,
    );
  }
}

/// Timeline response
class TwitterTimelineResponse {
  final List<Tweet> tweets;
  final String? nextToken;
  final String? previousToken;
  final int resultCount;

  TwitterTimelineResponse({
    required this.tweets,
    this.nextToken,
    this.previousToken,
    required this.resultCount,
  });

  factory TwitterTimelineResponse.fromJson(Map<String, dynamic> json) {
    return TwitterTimelineResponse(
      tweets: (json['tweets'] as List<dynamic>?)
              ?.map((e) => Tweet.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      nextToken: json['nextToken'] as String?,
      previousToken: json['previousToken'] as String?,
      resultCount: json['resultCount'] as int? ?? 0,
    );
  }
}

/// Follow response
class TwitterFollowResponse {
  final List<TwitterUser> users;
  final String? nextToken;
  final int resultCount;

  TwitterFollowResponse({
    required this.users,
    this.nextToken,
    required this.resultCount,
  });

  factory TwitterFollowResponse.fromJson(Map<String, dynamic> json) {
    return TwitterFollowResponse(
      users: (json['users'] as List<dynamic>?)
              ?.map((e) => TwitterUser.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      nextToken: json['nextToken'] as String?,
      resultCount: json['resultCount'] as int? ?? 0,
    );
  }
}
