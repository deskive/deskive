import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/bookmark_service.dart';
import '../api/services/chat_api_service.dart';
import '../services/workspace_service.dart';
import 'chat_screen.dart';

class SavedMessagesScreen extends StatefulWidget {
  final String? channelId;
  final String? conversationId;
  final String? chatName;

  const SavedMessagesScreen({
    super.key,
    this.channelId,
    this.conversationId,
    this.chatName,
  });

  @override
  State<SavedMessagesScreen> createState() => _SavedMessagesScreenState();
}

class _SavedMessagesScreenState extends State<SavedMessagesScreen> {
  final BookmarkService _bookmarkService = BookmarkService();
  final ChatApiService _chatApiService = ChatApiService();

  List<Message> _apiBookmarks = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _bookmarkService.addListener(_onBookmarksChanged);
    _fetchBookmarksFromApi();
  }

  @override
  void dispose() {
    _bookmarkService.removeListener(_onBookmarksChanged);
    super.dispose();
  }

  void _onBookmarksChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _fetchBookmarksFromApi() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (widget.channelId != null) {
        final response = await _chatApiService.getChannelBookmarks(
          workspaceId,
          widget.channelId!,
        );
        if (response.success && response.data != null) {
          setState(() {
            _apiBookmarks = response.data!;
            _isLoading = false;
          });
        } else {
          setState(() {
            _error = response.message ?? 'Failed to fetch bookmarks';
            _isLoading = false;
          });
        }
      } else if (widget.conversationId != null) {
        final response = await _chatApiService.getConversationBookmarks(
          workspaceId,
          widget.conversationId!,
        );
        if (response.success && response.data != null) {
          setState(() {
            _apiBookmarks = response.data!;
            _isLoading = false;
          });
        } else {
          setState(() {
            _error = response.message ?? 'Failed to fetch bookmarks';
            _isLoading = false;
          });
        }
      } else {
        // No channel or conversation specified - show empty state
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _removeBookmark(String messageId) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    // Optimistic update
    setState(() {
      _apiBookmarks.removeWhere((m) => m.id == messageId);
    });

    try {
      final response = await _chatApiService.removeBookmark(workspaceId, messageId);
      if (!response.success) {
        // Revert on failure
        _fetchBookmarksFromApi();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to remove bookmark'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } else {
        // Also update local bookmark service
        _bookmarkService.removeBookmark(messageId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Bookmark removed'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      _fetchBookmarksFromApi();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final hasContext = widget.channelId != null || widget.conversationId != null;
    final title = widget.chatName != null
        ? 'messages.saved_in'.tr(args: [widget.chatName!])
        : 'messages.saved_messages'.tr();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          hasContext ? '$title (${_apiBookmarks.length})' : title,
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        actions: [
          if (hasContext)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _fetchBookmarksFromApi,
              tooltip: 'messages.refresh'.tr(),
            ),
        ],
      ),
      body: _buildBody(isDarkMode, hasContext),
    );
  }

  Widget _buildBody(bool isDarkMode, bool hasContext) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load bookmarks',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _fetchBookmarksFromApi,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (!hasContext) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.bookmark_outline,
              size: 80,
              color: isDarkMode ? Colors.grey[600] : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'View Bookmarks',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                'Open a channel or conversation and tap the bookmark icon to view saved messages',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      );
    }

    if (_apiBookmarks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.bookmark_outline,
              size: 80,
              color: isDarkMode ? Colors.grey[600] : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'messages.no_saved_messages'.tr(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'messages.messages_bookmark_appear'.tr(),
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchBookmarksFromApi,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _apiBookmarks.length,
        itemBuilder: (context, index) {
          final message = _apiBookmarks[index];
          return _buildBookmarkCard(message, isDarkMode);
        },
      ),
    );
  }

  Widget _buildBookmarkCard(Message message, bool isDarkMode) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isDarkMode ? 0 : 2,
      color: isDarkMode ? Colors.grey[850] : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isDarkMode
            ? BorderSide(color: Colors.grey[700]!)
            : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Avatar
                CircleAvatar(
                  radius: 18,
                  backgroundColor: Colors.primaries[
                    (message.senderName ?? 'U').hashCode % Colors.primaries.length
                  ],
                  backgroundImage: message.senderAvatar != null &&
                      message.senderAvatar!.isNotEmpty
                      ? NetworkImage(message.senderAvatar!)
                      : null,
                  child: message.senderAvatar == null || message.senderAvatar!.isEmpty
                      ? Text(
                          (message.senderName ?? 'U')[0].toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.senderName ?? 'Unknown',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: isDarkMode ? Colors.white : Colors.black87,
                        ),
                      ),
                      Text(
                        _formatTime(message.createdAt),
                        style: TextStyle(
                          color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                // Bookmark icon
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.bookmark,
                        size: 14,
                        color: Colors.blue[700],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Saved',
                        style: TextStyle(
                          color: Colors.blue[700],
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Message content with HTML rendering
            // Use formatMentionsForHtml to handle web's mention-blot format
            Html(
              data: MessageBubble.formatMentionsForHtml(message.content),
              onLinkTap: (url, attributes, element) async {
                if (url != null) {
                  final uri = Uri.tryParse(url);
                  if (uri != null) {
                    try {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    } catch (e) {
                      debugPrint('Could not launch $url: $e');
                    }
                  }
                }
              },
              style: {
                "body": Style(
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                  color: isDarkMode ? Colors.grey[200] : Colors.grey[800],
                  fontSize: FontSize(15),
                  fontWeight: FontWeight.w400,
                  lineHeight: LineHeight(1.4),
                ),
                "p": Style(
                  margin: Margins.zero,
                  padding: HtmlPaddings.zero,
                ),
                "a": Style(
                  color: Colors.blue,
                  textDecoration: TextDecoration.none,
                  fontWeight: FontWeight.w500,
                ),
                "strong": Style(
                  fontWeight: FontWeight.bold,
                ),
                "em": Style(
                  fontStyle: FontStyle.italic,
                ),
                ".mention": Style(
                  color: Colors.blue,
                  fontWeight: FontWeight.w500,
                ),
                "code": Style(
                  backgroundColor: isDarkMode ? Colors.grey[800] : Colors.grey[200],
                  padding: HtmlPaddings.symmetric(horizontal: 4, vertical: 2),
                  fontFamily: 'monospace',
                ),
                "pre": Style(
                  backgroundColor: isDarkMode ? Colors.grey[800] : Colors.grey[200],
                  padding: HtmlPaddings.all(8),
                ),
              },
            ),
            // Bookmark timestamp
            if (message.bookmarkedAt != null) ...[
              const SizedBox(height: 8),
              Text(
                'Bookmarked ${_formatTimeAgo(message.bookmarkedAt!)}',
                style: TextStyle(
                  color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
            const SizedBox(height: 12),
            // Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () => _removeBookmark(message.id),
                  icon: Icon(
                    Icons.bookmark_remove,
                    size: 16,
                    color: Colors.red[400],
                  ),
                  label: Text(
                    'Remove',
                    style: TextStyle(
                      color: Colors.red[400],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final messageDay = DateTime(time.year, time.month, time.day);

    if (messageDay == today) {
      return 'Today at ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    } else if (messageDay == today.subtract(const Duration(days: 1))) {
      return 'Yesterday at ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    } else {
      return '${time.day}/${time.month}/${time.year} at ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    }
  }

  String _formatTimeAgo(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inDays > 0) {
      return '${difference.inDays} ${difference.inDays == 1 ? 'day' : 'days'} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} ${difference.inHours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} ${difference.inMinutes == 1 ? 'minute' : 'minutes'} ago';
    } else {
      return 'just now';
    }
  }
}
