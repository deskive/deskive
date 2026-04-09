import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'models/twitter_models.dart';
import 'services/twitter_service.dart';

/// Twitter/X feed screen
class TwitterScreen extends StatefulWidget {
  const TwitterScreen({super.key});

  @override
  State<TwitterScreen> createState() => _TwitterScreenState();
}

class _TwitterScreenState extends State<TwitterScreen> with SingleTickerProviderStateMixin {
  final TwitterService _twitterService = TwitterService.instance;
  final TextEditingController _tweetController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  late TabController _tabController;

  List<Tweet> _homeTweets = [];
  List<Tweet> _userTweets = [];
  List<Tweet> _likedTweets = [];
  TwitterConnection? _connection;

  bool _isLoading = true;
  bool _isComposing = false;
  String? _error;
  String? _nextToken;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadConnection();
  }

  @override
  void dispose() {
    _tweetController.dispose();
    _scrollController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;

    switch (_tabController.index) {
      case 0:
        if (_homeTweets.isEmpty) _loadHomeTimeline();
        break;
      case 1:
        if (_userTweets.isEmpty && _connection != null) _loadUserTweets();
        break;
      case 2:
        if (_likedTweets.isEmpty && _connection != null) _loadLikedTweets();
        break;
    }
  }

  Future<void> _loadConnection() async {
    try {
      _connection = await _twitterService.getConnection();
      if (_connection != null) {
        _loadHomeTimeline();
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadHomeTimeline({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _homeTweets = [];
        _nextToken = null;
      });
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _twitterService.getHomeTimeline(
        maxResults: 25,
        paginationToken: refresh ? null : _nextToken,
      );
      setState(() {
        if (refresh) {
          _homeTweets = response.tweets;
        } else {
          _homeTweets.addAll(response.tweets);
        }
        _nextToken = response.nextToken;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadUserTweets() async {
    if (_connection?.twitterUserId == null) return;

    setState(() => _isLoading = true);

    try {
      final response = await _twitterService.getUserTweets(
        _connection!.twitterUserId!,
        maxResults: 25,
      );
      setState(() {
        _userTweets = response.tweets;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadLikedTweets() async {
    if (_connection?.twitterUserId == null) return;

    setState(() => _isLoading = true);

    try {
      final response = await _twitterService.getLikedTweets(
        _connection!.twitterUserId!,
        maxResults: 25,
      );
      setState(() {
        _likedTweets = response.tweets;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _postTweet() async {
    if (_tweetController.text.trim().isEmpty) return;

    setState(() => _isComposing = true);

    try {
      await _twitterService.createTweet(text: _tweetController.text.trim());
      _tweetController.clear();
      Navigator.of(context).pop();
      _loadHomeTimeline(refresh: true);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tweet posted!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to post: $e')),
        );
      }
    } finally {
      setState(() => _isComposing = false);
    }
  }

  Future<void> _likeTweet(Tweet tweet) async {
    try {
      await _twitterService.likeTweet(tweet.id);
      // Refresh current tab
      _onTabChanged();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to like: $e')),
        );
      }
    }
  }

  Future<void> _retweet(Tweet tweet) async {
    try {
      await _twitterService.retweet(tweet.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Retweeted!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to retweet: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const _TwitterLogo(size: 28),
            const SizedBox(width: 12),
            const Text('X / Twitter'),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Home'),
            Tab(text: 'My Tweets'),
            Tab(text: 'Liked'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: _showSearchDialog,
            tooltip: 'Search',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _loadHomeTimeline(refresh: true),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTweetList(_homeTweets),
          _buildTweetList(_userTweets),
          _buildTweetList(_likedTweets),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showComposeDialog,
        child: const Icon(Icons.edit),
      ),
    );
  }

  Widget _buildTweetList(List<Tweet> tweets) {
    if (_isLoading && tweets.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && tweets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Error: $_error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => _loadHomeTimeline(refresh: true),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (tweets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const _TwitterLogo(size: 64),
            const SizedBox(height: 16),
            Text(
              'No tweets yet',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadHomeTimeline(refresh: true),
      child: ListView.separated(
        controller: _scrollController,
        itemCount: tweets.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) => _buildTweetCard(tweets[index]),
      ),
    );
  }

  Widget _buildTweetCard(Tweet tweet) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat.yMMMd();
    final timeFormat = DateFormat.jm();

    return InkWell(
      onTap: () {
        // TODO: Open tweet detail
      },
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile image
            CircleAvatar(
              radius: 24,
              backgroundImage: tweet.authorProfileImage != null
                  ? NetworkImage(tweet.authorProfileImage!)
                  : null,
              child: tweet.authorProfileImage == null
                  ? Text(
                      (tweet.authorName ?? tweet.authorUsername ?? 'U')
                          .substring(0, 1)
                          .toUpperCase(),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            // Tweet content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Author info
                  Row(
                    children: [
                      Text(
                        tweet.authorName ?? tweet.authorUsername ?? 'Unknown',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 4),
                      if (tweet.authorUsername != null)
                        Text(
                          '@${tweet.authorUsername}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                      const Spacer(),
                      if (tweet.createdAtDateTime != null)
                        Text(
                          '${dateFormat.format(tweet.createdAtDateTime!)} ${timeFormat.format(tweet.createdAtDateTime!)}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.5),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Tweet text
                  Text(
                    tweet.text,
                    style: theme.textTheme.bodyMedium,
                  ),
                  // Media
                  if (tweet.media?.isNotEmpty ?? false) ...[
                    const SizedBox(height: 12),
                    _buildMediaGrid(tweet.media!),
                  ],
                  // Engagement metrics
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildMetricButton(
                        Icons.chat_bubble_outline,
                        tweet.publicMetrics?.replyCount ?? 0,
                        onTap: () {
                          // TODO: Reply
                        },
                      ),
                      const SizedBox(width: 24),
                      _buildMetricButton(
                        Icons.repeat,
                        tweet.publicMetrics?.retweetCount ?? 0,
                        onTap: () => _retweet(tweet),
                        color: tweet.isRetweet ? Colors.green : null,
                      ),
                      const SizedBox(width: 24),
                      _buildMetricButton(
                        Icons.favorite_border,
                        tweet.publicMetrics?.likeCount ?? 0,
                        onTap: () => _likeTweet(tweet),
                      ),
                      const SizedBox(width: 24),
                      _buildMetricButton(
                        Icons.share_outlined,
                        null,
                        onTap: () {
                          // TODO: Share
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricButton(IconData icon, int? count, {VoidCallback? onTap, Color? color}) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: color ?? theme.colorScheme.onSurface.withOpacity(0.6),
            ),
            if (count != null && count > 0) ...[
              const SizedBox(width: 4),
              Text(
                _formatCount(count),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: color ?? theme.colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMediaGrid(List<TweetMedia> media) {
    if (media.length == 1) {
      return _buildMediaItem(media[0]);
    }

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      children: media.take(4).map((m) => _buildMediaItem(m)).toList(),
    );
  }

  Widget _buildMediaItem(TweetMedia media) {
    final url = media.url ?? media.previewImageUrl;
    if (url == null) return const SizedBox.shrink();

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            url,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => Container(
              color: Colors.grey[300],
              child: const Icon(Icons.broken_image),
            ),
          ),
          if (media.isVideo || media.isGif)
            Center(
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  media.isGif ? Icons.gif : Icons.play_arrow,
                  color: Colors.white,
                  size: 32,
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showComposeDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                    const Spacer(),
                    const Text(
                      'Compose Tweet',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const Spacer(),
                    ElevatedButton(
                      onPressed: _isComposing ? null : _postTweet,
                      child: _isComposing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Post'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _tweetController,
                  maxLength: 280,
                  maxLines: 5,
                  autofocus: true,
                  decoration: const InputDecoration(
                    hintText: "What's happening?",
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showSearchDialog() {
    final searchController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Search Twitter'),
        content: TextField(
          controller: searchController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search tweets...',
            prefixIcon: Icon(Icons.search),
          ),
          onSubmitted: (query) async {
            Navigator.of(context).pop();
            if (query.trim().isEmpty) return;

            try {
              final results = await _twitterService.searchTweets(query: query);
              if (mounted) {
                _showSearchResults(results.tweets);
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Search failed: $e')),
                );
              }
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final query = searchController.text;
              Navigator.of(context).pop();
              if (query.trim().isEmpty) return;

              _twitterService.searchTweets(query: query).then((results) {
                if (mounted) {
                  _showSearchResults(results.tweets);
                }
              }).catchError((e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Search failed: $e')),
                  );
                }
              });
            },
            child: const Text('Search'),
          ),
        ],
      ),
    );
  }

  void _showSearchResults(List<Tweet> tweets) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            AppBar(
              title: const Text('Search Results'),
              automaticallyImplyLeading: false,
              actions: [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            Expanded(
              child: tweets.isEmpty
                  ? const Center(child: Text('No results found'))
                  : ListView.separated(
                      controller: scrollController,
                      itemCount: tweets.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) => _buildTweetCard(tweets[index]),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }
}

/// Twitter/X logo widget
class _TwitterLogo extends StatelessWidget {
  final double size;

  const _TwitterLogo({this.size = 24});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _TwitterLogoPainter(),
      ),
    );
  }
}

class _TwitterLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // X logo (simplified)
    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.12
      ..strokeCap = StrokeCap.round;

    final padding = size.width * 0.15;

    // Draw X
    canvas.drawLine(
      Offset(padding, padding),
      Offset(size.width - padding, size.height - padding),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - padding, padding),
      Offset(padding, size.height - padding),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
