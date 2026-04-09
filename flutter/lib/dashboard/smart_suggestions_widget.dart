import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/dashboard_models.dart';
import '../api/services/dashboard_api_service.dart';
import '../services/workspace_service.dart';
import '../theme/app_theme.dart';
import '../utils/theme_notifier.dart';
import '../screens/main_screen.dart';
import '../message/chat_screen.dart';
import '../videocalls/video_call_screen.dart';
import '../calendar/calendar_screen.dart';
import '../files/files_screen.dart';
import '../team/team_screen.dart';

/// Smart Suggestions Widget for Dashboard
/// Displays AI-powered actionable suggestions based on workspace data
class SmartSuggestionsWidget extends StatefulWidget {
  final VoidCallback? onSuggestionTap;

  const SmartSuggestionsWidget({
    super.key,
    this.onSuggestionTap,
  });

  @override
  State<SmartSuggestionsWidget> createState() => _SmartSuggestionsWidgetState();
}

class _SmartSuggestionsWidgetState extends State<SmartSuggestionsWidget> {
  final DashboardApiService _dashboardApiService = DashboardApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  SuggestionsResponse? _suggestionsResponse;
  bool _isLoading = false;
  bool _isRefreshing = false; // For background refresh indicator
  String? _error;
  bool _showAll = false;

  @override
  void initState() {
    super.initState();
    _workspaceService.addListener(_onWorkspaceChanged);
    _fetchSuggestions();
  }

  @override
  void dispose() {
    _workspaceService.removeListener(_onWorkspaceChanged);
    super.dispose();
  }

  void _onWorkspaceChanged() {
    _fetchSuggestions();
  }

  Future<void> _fetchSuggestions({bool forceRefresh = false}) async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) return;

    // Step 1: Check in-memory cache first (fastest)
    final inMemoryCached = _dashboardApiService.getCachedSuggestions(currentWorkspace.id);
    if (inMemoryCached != null && !forceRefresh) {
      // Show cached data immediately
      if (_suggestionsResponse == null) {
        setState(() {
          _suggestionsResponse = inMemoryCached;
          _error = null;
        });
      }
      // Don't show loading if we have cached data, just refresh in background
      _refreshInBackground(currentWorkspace.id);
      return;
    }

    // Step 2: Check persistent cache (SharedPreferences) - survives app restart
    if (!forceRefresh && _suggestionsResponse == null) {
      final persistentCached = await _dashboardApiService.getPersistentCachedSuggestions(currentWorkspace.id);
      if (persistentCached != null) {
        debugPrint('[SmartSuggestions] Loaded from persistent cache instantly');
        setState(() {
          _suggestionsResponse = persistentCached;
          _error = null;
        });
        // Still refresh in background to get fresh data
        _refreshInBackground(currentWorkspace.id);
        return;
      }
    }

    // Step 3: No cache available - show loading state and fetch from API
    setState(() {
      _isLoading = _suggestionsResponse == null; // Only show loading if no data yet
      _isRefreshing = _suggestionsResponse != null; // Show refresh indicator if updating
      _error = null;
    });

    await _loadSuggestionsFromApi(currentWorkspace.id, forceRefresh: forceRefresh);
  }

  /// Refresh suggestions in background without blocking UI
  Future<void> _refreshInBackground(String workspaceId) async {
    // Check if cache is still valid - if so, no need to refresh
    final cachedData = _dashboardApiService.getCachedSuggestions(workspaceId);
    if (cachedData != null) {
      debugPrint('[SmartSuggestions] Cache still valid, skipping background refresh');
      return;
    }

    setState(() {
      _isRefreshing = true;
    });

    await _loadSuggestionsFromApi(workspaceId, forceRefresh: false);
  }

  Future<void> _loadSuggestionsFromApi(String workspaceId, {bool forceRefresh = false}) async {
    try {
      final response = await _dashboardApiService.getSuggestions(
        workspaceId,
        forceRefresh: forceRefresh,
      );

      if (mounted) {
        if (response.success && response.data != null) {
          setState(() {
            _suggestionsResponse = response.data;
            _isLoading = false;
            _isRefreshing = false;
          });
        } else {
          setState(() {
            // Only show error if we don't have any data
            if (_suggestionsResponse == null) {
              _error = response.message ?? 'dashboard.suggestions.error'.tr();
            }
            _isLoading = false;
            _isRefreshing = false;
          });
        }
      }
    } catch (e, stackTrace) {
      debugPrint('[SmartSuggestions] Error: $e');
      debugPrint('[SmartSuggestions] StackTrace: $stackTrace');
      if (mounted) {
        setState(() {
          // Only show error if we don't have any data
          if (_suggestionsResponse == null) {
            _error = 'dashboard.suggestions.error'.tr();
          }
          _isLoading = false;
          _isRefreshing = false;
        });
      }
    }
  }

  /// Force refresh suggestions (called from pull-to-refresh or refresh button)
  Future<void> _forceRefreshSuggestions() async {
    await _fetchSuggestions(forceRefresh: true);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.purple.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.auto_awesome,
                    color: Colors.purple,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'dashboard.suggestions.title'.tr(),
                    style: context.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (_suggestionsResponse != null && _suggestionsResponse!.totalCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: context.mutedColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_suggestionsResponse!.totalCount}',
                      style: context.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                // Refresh indicator (shows when refreshing in background)
                if (_isRefreshing)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                else
                  // Refresh button
                  IconButton(
                    icon: Icon(
                      Icons.refresh,
                      size: 20,
                      color: context.mutedForegroundColor,
                    ),
                    onPressed: _isLoading ? null : _forceRefreshSuggestions,
                    tooltip: 'common.refresh'.tr(),
                  ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Content
          if (_isLoading && _suggestionsResponse == null)
            _buildLoadingState()
          else if (_error != null && _suggestionsResponse == null)
            _buildErrorState()
          else if (_suggestionsResponse == null || _suggestionsResponse!.suggestions.isEmpty)
            _buildEmptyState()
          else
            _buildSuggestionsList(),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: List.generate(3, (index) => _buildSkeletonItem()),
      ),
    );
  }

  Widget _buildSkeletonItem() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: context.mutedColor,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 14,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: context.mutedColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  height: 12,
                  width: 150,
                  decoration: BoxDecoration(
                    color: context.mutedColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.warning_amber_rounded,
            size: 48,
            color: context.warningColor,
          ),
          const SizedBox(height: 12),
          Text(
            'dashboard.suggestions.error'.tr(),
            style: context.textTheme.bodyMedium?.copyWith(
              color: context.mutedForegroundColor,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: _fetchSuggestions,
            icon: const Icon(Icons.refresh, size: 18),
            label: Text('common.retry'.tr()),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.check_circle_outline,
            size: 48,
            color: context.successColor,
          ),
          const SizedBox(height: 12),
          Text(
            'dashboard.suggestions.allCaughtUp'.tr(),
            style: context.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'dashboard.suggestions.noSuggestions'.tr(),
            style: context.textTheme.bodySmall?.copyWith(
              color: context.mutedForegroundColor,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestionsList() {
    final suggestions = _suggestionsResponse!.suggestions;
    final displayCount = _showAll ? suggestions.length : (suggestions.length > 5 ? 5 : suggestions.length);
    final displayedSuggestions = suggestions.take(displayCount).toList();

    return Column(
      children: [
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.all(12),
          itemCount: displayedSuggestions.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            return _buildSuggestionItem(displayedSuggestions[index]);
          },
        ),
        if (suggestions.length > 5 && !_showAll)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: TextButton(
              onPressed: () {
                setState(() {
                  _showAll = true;
                });
              },
              child: Text(
                'dashboard.suggestions.showMore'.tr(args: ['${suggestions.length - 5}']),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildSuggestionItem(Suggestion suggestion) {
    final colors = _getSuggestionColors(suggestion.type, suggestion.priority);

    return InkWell(
      onTap: () => _handleSuggestionTap(suggestion),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colors.backgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colors.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: colors.iconBackgroundColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    _getSuggestionIcon(suggestion.type),
                    color: colors.iconColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              suggestion.title,
                              style: context.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (suggestion.priority == SuggestionPriority.high)
                            _buildPriorityBadge('dashboard.suggestions.highPriority'.tr(), Colors.red)
                          else if (suggestion.priority == SuggestionPriority.medium)
                            _buildPriorityBadge('dashboard.suggestions.medium'.tr(), Colors.amber),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        suggestion.description,
                        style: context.textTheme.bodySmall?.copyWith(
                          color: context.mutedForegroundColor,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Additional metadata
            if (_shouldShowMetadata(suggestion)) ...[
              const SizedBox(height: 12),
              _buildMetadata(suggestion),
            ],

            // AI Recommendation
            if (suggestion.metadata?.aiRecommendation != null) ...[
              const SizedBox(height: 12),
              _buildAiRecommendation(suggestion.metadata!.aiRecommendation!),
            ],

            // Action button
            if (suggestion.actionLabel != null) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: _buildActionButton(suggestion),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPriorityBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  bool _shouldShowMetadata(Suggestion suggestion) {
    final metadata = suggestion.metadata;
    if (metadata == null) return false;

    return suggestion.type == SuggestionType.taskBalance ||
        suggestion.type == SuggestionType.meeting ||
        suggestion.type == SuggestionType.unreadMessage ||
        suggestion.type == SuggestionType.overdueTask;
  }

  Widget _buildMetadata(Suggestion suggestion) {
    switch (suggestion.type) {
      case SuggestionType.taskBalance:
        return _buildTaskBalanceMetadata(suggestion);
      case SuggestionType.meeting:
        return _buildMeetingMetadata(suggestion);
      case SuggestionType.unreadMessage:
        return _buildUnreadMessageMetadata(suggestion);
      case SuggestionType.overdueTask:
        return _buildOverdueTaskMetadata(suggestion);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildTaskBalanceMetadata(Suggestion suggestion) {
    final overloaded = suggestion.metadata?.overloaded;
    final underloaded = suggestion.metadata?.underloaded;

    if (overloaded == null || underloaded == null) return const SizedBox.shrink();

    return Row(
      children: [
        _buildUserChip(
          overloaded.userName,
          overloaded.userAvatar,
          '${overloaded.taskCount} ${'dashboard.suggestions.tasks'.tr()}',
          Colors.red,
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 8),
          child: Icon(Icons.arrow_forward, size: 16),
        ),
        _buildUserChip(
          underloaded.userName,
          underloaded.userAvatar,
          '${underloaded.taskCount} ${'dashboard.suggestions.tasks'.tr()}',
          Colors.green,
        ),
      ],
    );
  }

  Widget _buildUserChip(String name, String? avatar, String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 12,
          backgroundColor: color.withValues(alpha: 0.1),
          backgroundImage: avatar != null && avatar.isNotEmpty ? NetworkImage(avatar) : null,
          child: avatar == null || avatar.isEmpty
              ? Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: TextStyle(
                    color: color,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                )
              : null,
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildMeetingMetadata(Suggestion suggestion) {
    final meeting = suggestion.metadata?.meeting;
    if (meeting == null) return const SizedBox.shrink();

    return Row(
      children: [
        Icon(Icons.schedule, size: 14, color: context.mutedForegroundColor),
        const SizedBox(width: 4),
        if (meeting.scheduledStartTime != null)
          Text(
            _formatTime(meeting.scheduledStartTime!),
            style: context.textTheme.bodySmall?.copyWith(
              color: context.mutedForegroundColor,
            ),
          ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: context.mutedColor,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            meeting.callType,
            style: context.textTheme.labelSmall,
          ),
        ),
      ],
    );
  }

  Widget _buildUnreadMessageMetadata(Suggestion suggestion) {
    final chat = suggestion.metadata?.chat;
    if (chat == null) return const SizedBox.shrink();

    return Row(
      children: [
        Icon(
          chat.type == 'channel' ? Icons.tag : Icons.person,
          size: 14,
          color: context.mutedForegroundColor,
        ),
        const SizedBox(width: 4),
        Text(
          chat.type == 'channel' ? 'Channel' : 'Direct Message',
          style: context.textTheme.bodySmall?.copyWith(
            color: context.mutedForegroundColor,
          ),
        ),
        if (chat.isPrivate == true) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: context.mutedColor,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              'Private',
              style: context.textTheme.labelSmall,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildOverdueTaskMetadata(Suggestion suggestion) {
    final dueDate = suggestion.metadata?.dueDate;
    final daysOverdue = suggestion.metadata?.daysOverdue;

    if (dueDate == null) return const SizedBox.shrink();

    return Row(
      children: [
        Icon(Icons.schedule, size: 14, color: context.mutedForegroundColor),
        const SizedBox(width: 4),
        Text(
          'Due: ${_formatDate(dueDate)}',
          style: context.textTheme.bodySmall?.copyWith(
            color: context.mutedForegroundColor,
          ),
        ),
        if (daysOverdue != null) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.red.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              '$daysOverdue ${daysOverdue == 1 ? 'day' : 'days'} overdue',
              style: const TextStyle(
                color: Colors.red,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAiRecommendation(String recommendation) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.purple.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.purple.withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.auto_awesome,
            size: 16,
            color: Colors.purple.shade400,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              recommendation,
              style: TextStyle(
                color: Colors.purple.shade700,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(Suggestion suggestion) {
    final isHighPriority = suggestion.priority == SuggestionPriority.high;
    final isMeeting = suggestion.type == SuggestionType.meeting;

    return ElevatedButton.icon(
      onPressed: () => _handleSuggestionTap(suggestion),
      icon: Icon(
        isMeeting ? Icons.open_in_new : Icons.arrow_forward,
        size: 16,
      ),
      label: Text(suggestion.actionLabel!),
      style: ElevatedButton.styleFrom(
        backgroundColor: isHighPriority ? context.primaryColor : context.mutedColor,
        foregroundColor: isHighPriority ? Colors.white : context.colorScheme.onSurface,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
      ),
    );
  }

  void _handleSuggestionTap(Suggestion suggestion) {
    widget.onSuggestionTap?.call();

    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    // Handle navigation based on suggestion type
    switch (suggestion.type) {
      // Meeting suggestions - navigate to video call
      case SuggestionType.meeting:
        if (suggestion.metadata?.meeting != null) {
          final meeting = suggestion.metadata!.meeting!;
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => VideoCallScreen(
                callId: meeting.id,
                channelName: meeting.title,
                isAudioOnly: meeting.callType.toLowerCase() == 'audio',
              ),
            ),
          );
        }
        break;

      // Unread message suggestions - navigate to chat
      case SuggestionType.unreadMessage:
        if (suggestion.metadata?.chat != null) {
          final chat = suggestion.metadata!.chat!;
          final isChannel = chat.type == 'channel';
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => ChatScreen(
                chatName: chat.name,
                isChannel: isChannel,
                isPrivateChannel: chat.isPrivate ?? false,
                channelId: isChannel ? chat.id : null,
                conversationId: !isChannel ? chat.id : null,
              ),
            ),
          );
        } else {
          // Navigate to messages tab
          _navigateToMainScreenTab(1);
        }
        break;

      // Task-related suggestions - navigate to projects tab
      case SuggestionType.taskBalance:
      case SuggestionType.overdueTask:
      case SuggestionType.upcomingDeadline:
        // Navigate to projects tab (tasks are within projects)
        _navigateToMainScreenTab(2);
        break;

      // Project suggestions - navigate to projects tab
      case SuggestionType.projectAtRisk:
      case SuggestionType.milestoneDeadline:
      case SuggestionType.inactiveProject:
      case SuggestionType.projectCompletion:
        // Navigate to projects tab
        _navigateToMainScreenTab(2);
        break;

      // Calendar/Event suggestions - navigate to calendar
      case SuggestionType.calendarConflict:
      case SuggestionType.upcomingEvent:
      case SuggestionType.missedEvent:
      case SuggestionType.eventReminder:
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const CalendarScreen(),
          ),
        );
        break;

      // Note suggestions - navigate to notes tab
      case SuggestionType.noteUpdate:
      case SuggestionType.staleNote:
      case SuggestionType.unorganizedNotes:
      case SuggestionType.noteTemplate:
        // Navigate to notes tab
        _navigateToMainScreenTab(3);
        break;

      // File/Storage suggestions - navigate to files
      case SuggestionType.storageWarning:
      case SuggestionType.fileSharing:
      case SuggestionType.orphanedFiles:
      case SuggestionType.largeFiles:
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const FilesScreen(),
          ),
        );
        break;

      // Team suggestions - navigate to team screen
      case SuggestionType.inactiveMember:
      case SuggestionType.engagementDrop:
      case SuggestionType.teamCelebration:
      case SuggestionType.teamAchievement:
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const TeamScreen(),
          ),
        );
        break;

      // Sprint/Agile suggestions - navigate to projects tab
      case SuggestionType.sprintEndingSoon:
      case SuggestionType.sprintNoTasks:
      case SuggestionType.sprintRetrospective:
      case SuggestionType.backlogGrooming:
        _navigateToMainScreenTab(2);
        break;

      // Billing/Subscription suggestions - stay on dashboard (settings in future)
      case SuggestionType.subscriptionExpiring:
      case SuggestionType.usageLimitApproaching:
      case SuggestionType.upgradeRecommendation:
        // TODO: Navigate to settings/billing when implemented
        break;

      // Chat/Mentions suggestions - navigate to messages tab
      case SuggestionType.unansweredMention:
      case SuggestionType.pendingDmResponse:
      case SuggestionType.inactiveChannel:
        _navigateToMainScreenTab(1);
        break;

      // Analytics suggestions - stay on dashboard
      case SuggestionType.weeklyReportReady:
      case SuggestionType.productivityMilestone:
      case SuggestionType.productivityTrendDown:
        // These are informational, stay on dashboard
        break;
    }
  }

  /// Navigate to a specific tab in MainScreen
  void _navigateToMainScreenTab(int tabIndex) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => MainScreen(
          themeNotifier: ThemeNotifier(),
          initialIndex: tabIndex,
        ),
      ),
    );
  }

  IconData _getSuggestionIcon(SuggestionType type) {
    switch (type) {
      case SuggestionType.taskBalance:
        return Icons.balance;
      case SuggestionType.meeting:
        return Icons.videocam;
      case SuggestionType.unreadMessage:
        return Icons.chat_bubble_outline;
      case SuggestionType.noteUpdate:
        return Icons.description_outlined;
      case SuggestionType.overdueTask:
        return Icons.warning_amber_rounded;
      case SuggestionType.upcomingDeadline:
        return Icons.schedule;
      case SuggestionType.storageWarning:
        return Icons.storage;
      case SuggestionType.fileSharing:
        return Icons.share;
      case SuggestionType.orphanedFiles:
        return Icons.folder_off;
      case SuggestionType.largeFiles:
        return Icons.file_present;
      case SuggestionType.calendarConflict:
        return Icons.event_busy;
      case SuggestionType.upcomingEvent:
        return Icons.event;
      case SuggestionType.missedEvent:
        return Icons.event_available;
      case SuggestionType.eventReminder:
        return Icons.notifications_active;
      case SuggestionType.staleNote:
        return Icons.history;
      case SuggestionType.unorganizedNotes:
        return Icons.folder_outlined;
      case SuggestionType.noteTemplate:
        return Icons.note_add;
      case SuggestionType.projectAtRisk:
        return Icons.report_problem;
      case SuggestionType.milestoneDeadline:
        return Icons.flag;
      case SuggestionType.inactiveProject:
        return Icons.pause_circle_outline;
      case SuggestionType.projectCompletion:
        return Icons.celebration;
      case SuggestionType.inactiveMember:
        return Icons.person_off;
      case SuggestionType.engagementDrop:
        return Icons.trending_down;
      case SuggestionType.teamCelebration:
        return Icons.emoji_events;
      case SuggestionType.teamAchievement:
        return Icons.military_tech;
      // Sprint/Agile suggestions
      case SuggestionType.sprintEndingSoon:
        return Icons.timer;
      case SuggestionType.sprintNoTasks:
        return Icons.assignment_late;
      case SuggestionType.sprintRetrospective:
        return Icons.rate_review;
      case SuggestionType.backlogGrooming:
        return Icons.list_alt;
      // Billing/Subscription suggestions
      case SuggestionType.subscriptionExpiring:
        return Icons.credit_card;
      case SuggestionType.usageLimitApproaching:
        return Icons.data_usage;
      case SuggestionType.upgradeRecommendation:
        return Icons.upgrade;
      // Chat/Mentions suggestions
      case SuggestionType.unansweredMention:
        return Icons.alternate_email;
      case SuggestionType.pendingDmResponse:
        return Icons.mark_chat_unread;
      case SuggestionType.inactiveChannel:
        return Icons.speaker_notes_off;
      // Analytics suggestions
      case SuggestionType.weeklyReportReady:
        return Icons.assessment;
      case SuggestionType.productivityMilestone:
        return Icons.emoji_events;
      case SuggestionType.productivityTrendDown:
        return Icons.trending_down;
    }
  }

  _SuggestionColors _getSuggestionColors(SuggestionType type, SuggestionPriority priority) {
    if (priority == SuggestionPriority.high) {
      return _SuggestionColors(
        backgroundColor: Colors.red.withValues(alpha: 0.05),
        borderColor: Colors.red.withValues(alpha: 0.2),
        iconBackgroundColor: Colors.red.withValues(alpha: 0.1),
        iconColor: Colors.red,
      );
    }

    switch (type) {
      case SuggestionType.taskBalance:
        return _SuggestionColors(
          backgroundColor: Colors.amber.withValues(alpha: 0.05),
          borderColor: Colors.amber.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.amber.withValues(alpha: 0.1),
          iconColor: Colors.amber.shade700,
        );
      case SuggestionType.meeting:
        return _SuggestionColors(
          backgroundColor: Colors.blue.withValues(alpha: 0.05),
          borderColor: Colors.blue.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.blue.withValues(alpha: 0.1),
          iconColor: Colors.blue,
        );
      case SuggestionType.unreadMessage:
        return _SuggestionColors(
          backgroundColor: Colors.purple.withValues(alpha: 0.05),
          borderColor: Colors.purple.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.purple.withValues(alpha: 0.1),
          iconColor: Colors.purple,
        );
      case SuggestionType.noteUpdate:
      case SuggestionType.projectCompletion:
      case SuggestionType.teamCelebration:
      case SuggestionType.teamAchievement:
      case SuggestionType.productivityMilestone:
        return _SuggestionColors(
          backgroundColor: Colors.green.withValues(alpha: 0.05),
          borderColor: Colors.green.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.green.withValues(alpha: 0.1),
          iconColor: Colors.green,
        );
      case SuggestionType.overdueTask:
      case SuggestionType.projectAtRisk:
      case SuggestionType.productivityTrendDown:
        return _SuggestionColors(
          backgroundColor: Colors.red.withValues(alpha: 0.05),
          borderColor: Colors.red.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.red.withValues(alpha: 0.1),
          iconColor: Colors.red,
        );
      // Sprint/Agile suggestions
      case SuggestionType.sprintEndingSoon:
      case SuggestionType.subscriptionExpiring:
        return _SuggestionColors(
          backgroundColor: Colors.orange.withValues(alpha: 0.05),
          borderColor: Colors.orange.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.orange.withValues(alpha: 0.1),
          iconColor: Colors.orange,
        );
      case SuggestionType.sprintNoTasks:
      case SuggestionType.usageLimitApproaching:
      case SuggestionType.backlogGrooming:
        return _SuggestionColors(
          backgroundColor: Colors.amber.withValues(alpha: 0.05),
          borderColor: Colors.amber.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.amber.withValues(alpha: 0.1),
          iconColor: Colors.amber.shade700,
        );
      case SuggestionType.sprintRetrospective:
      case SuggestionType.upgradeRecommendation:
        return _SuggestionColors(
          backgroundColor: Colors.indigo.withValues(alpha: 0.05),
          borderColor: Colors.indigo.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.indigo.withValues(alpha: 0.1),
          iconColor: Colors.indigo,
        );
      // Chat/Mentions suggestions
      case SuggestionType.unansweredMention:
      case SuggestionType.pendingDmResponse:
        return _SuggestionColors(
          backgroundColor: Colors.purple.withValues(alpha: 0.05),
          borderColor: Colors.purple.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.purple.withValues(alpha: 0.1),
          iconColor: Colors.purple,
        );
      case SuggestionType.inactiveChannel:
        return _SuggestionColors(
          backgroundColor: Colors.grey.withValues(alpha: 0.05),
          borderColor: Colors.grey.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.grey.withValues(alpha: 0.1),
          iconColor: Colors.grey,
        );
      // Analytics suggestions
      case SuggestionType.weeklyReportReady:
        return _SuggestionColors(
          backgroundColor: Colors.teal.withValues(alpha: 0.05),
          borderColor: Colors.teal.withValues(alpha: 0.2),
          iconBackgroundColor: Colors.teal.withValues(alpha: 0.1),
          iconColor: Colors.teal,
        );
      default:
        return _SuggestionColors(
          backgroundColor: context.mutedColor.withValues(alpha: 0.5),
          borderColor: context.borderColor,
          iconBackgroundColor: context.mutedColor,
          iconColor: context.mutedForegroundColor,
        );
    }
  }

  String _formatTime(String isoString) {
    try {
      final dateTime = DateTime.parse(isoString);
      return DateFormat.jm().format(dateTime);
    } catch (e) {
      return isoString;
    }
  }

  String _formatDate(String isoString) {
    try {
      final dateTime = DateTime.parse(isoString);
      return DateFormat.MMMd().format(dateTime);
    } catch (e) {
      return isoString;
    }
  }
}

class _SuggestionColors {
  final Color backgroundColor;
  final Color borderColor;
  final Color iconBackgroundColor;
  final Color iconColor;

  _SuggestionColors({
    required this.backgroundColor,
    required this.borderColor,
    required this.iconBackgroundColor,
    required this.iconColor,
  });
}
