import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../config/autopilot_suggestions.dart';
import '../../config/complex_commands.dart';
import '../../models/smart_suggestion.dart';
import '../../services/autopilot_service.dart';
import '../../config/app_config.dart';

/// Bottom sheet showing quick action suggestions for Autopilot
/// with Simple and Complex tabs
class SuggestionBottomSheet extends StatefulWidget {
  final String workspaceId;
  final String? currentModule;
  final Function(String command) onSuggestionTap;

  const SuggestionBottomSheet({
    super.key,
    required this.workspaceId,
    this.currentModule,
    required this.onSuggestionTap,
  });

  /// Show the suggestion bottom sheet
  static Future<void> show({
    required BuildContext context,
    required String workspaceId,
    String? currentModule,
    required Function(String command) onSuggestionTap,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SuggestionBottomSheet(
        workspaceId: workspaceId,
        currentModule: currentModule,
        onSuggestionTap: onSuggestionTap,
      ),
    );
  }

  @override
  State<SuggestionBottomSheet> createState() => _SuggestionBottomSheetState();
}

class _SuggestionBottomSheetState extends State<SuggestionBottomSheet>
    with SingleTickerProviderStateMixin {
  final AutoPilotService _autopilotService = AutoPilotService();
  List<SmartSuggestion> _smartSuggestions = [];
  bool _isLoadingSmart = true;
  late TabController _tabController;
  bool _isExecuting = false;
  String? _executingCommandId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadSmartSuggestions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSmartSuggestions() async {
    setState(() => _isLoadingSmart = true);
    try {
      final response = await _autopilotService.getSmartSuggestions(
        workspaceId: widget.workspaceId,
      );
      if (mounted) {
        setState(() {
          _smartSuggestions = response.suggestions;
          _isLoadingSmart = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingSmart = false);
      }
    }
  }

  void _handleSuggestionTap(String command) {
    Navigator.of(context).pop();
    widget.onSuggestionTap(command);
  }

  Future<void> _executeComplexCommand(String command, String commandId) async {
    if (_isExecuting) return;

    setState(() {
      _isExecuting = true;
      _executingCommandId = commandId;
    });

    try {
      // Initialize service and get workspace
      await _autopilotService.initialize();
      final workspaceId = await AppConfig.getCurrentWorkspaceId();

      if (workspaceId == null) {
        throw Exception('No workspace selected');
      }

      // Resume or create session
      await _autopilotService.resumeOrCreateSession(workspaceId);

      // Execute the command
      final response = await _autopilotService.executeCommand(
        command: command,
        workspaceId: workspaceId,
      );

      if (mounted) {
        Navigator.of(context).pop();

        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      response.message.length > 100
                          ? '${response.message.substring(0, 100)}...'
                          : response.message,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      response.error ?? 'quick_actions.command_failed'.tr(),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('quick_actions.error_occurred'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isExecuting = false;
          _executingCommandId = null;
        });
      }
    }
  }

  IconData _getIconForSuggestion(String icon) {
    switch (icon) {
      case 'warning':
        return Icons.warning_amber_outlined;
      case 'event':
        return Icons.event_outlined;
      case 'approval':
        return Icons.verified_outlined;
      case 'sun':
        return Icons.wb_sunny_outlined;
      case 'evening':
        return Icons.nights_stay_outlined;
      case 'week':
        return Icons.date_range_outlined;
      case 'task':
        return Icons.check_circle_outline;
      default:
        return Icons.lightbulb_outline;
    }
  }

  Color _getColorForSuggestion(String icon) {
    switch (icon) {
      case 'warning':
        return Colors.orange;
      case 'event':
        return Colors.blue;
      case 'approval':
        return Colors.purple;
      case 'sun':
        return Colors.amber;
      case 'evening':
        return Colors.indigo;
      case 'week':
        return Colors.teal;
      case 'task':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  IconData _getToolIcon(String tool) {
    switch (tool) {
      case 'create_project':
        return Icons.folder_outlined;
      case 'batch_create_tasks':
      case 'create_task':
      case 'list_tasks':
      case 'update_task':
      case 'complete_task':
        return Icons.check_circle_outline;
      case 'create_calendar_event':
      case 'list_calendar_events':
        return Icons.event_outlined;
      case 'create_note':
      case 'write_meeting_notes':
        return Icons.note_outlined;
      case 'send_channel_message':
      case 'send_notification':
        return Icons.chat_outlined;
      case 'send_email':
      case 'generate_email_draft':
        return Icons.email_outlined;
      case 'create_video_meeting':
      case 'schedule_video_meeting':
        return Icons.videocam_outlined;
      case 'create_budget':
      case 'get_budget_summary':
      case 'list_expenses':
        return Icons.account_balance_wallet_outlined;
      case 'create_approval_request':
      case 'list_approval_requests':
        return Icons.verified_outlined;
      case 'get_daily_summary':
      case 'get_weekly_summary':
        return Icons.analytics_outlined;
      case 'get_overdue_tasks':
        return Icons.warning_amber_outlined;
      case 'list_workspace_members':
      case 'get_project_details':
        return Icons.people_outlined;
      case 'analyze_document':
      case 'create_document':
        return Icons.description_outlined;
      case 'extract_action_items':
        return Icons.list_alt_outlined;
      case 'summarize_text':
        return Icons.summarize_outlined;
      case 'schedule_notification':
        return Icons.notifications_outlined;
      case 'link_to_resource':
        return Icons.link_outlined;
      case 'batch_update_tasks':
        return Icons.edit_outlined;
      case 'get_current_date_time':
        return Icons.schedule_outlined;
      case 'get_upcoming_events':
        return Icons.upcoming_outlined;
      default:
        return Icons.auto_awesome;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.3,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // "For You" section - always visible above tabs
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    _buildSectionHeader(
                      context,
                      'For You',
                      Icons.auto_awesome,
                      onRefresh: _loadSmartSuggestions,
                      isLoading: _isLoadingSmart,
                    ),
                    const SizedBox(height: 8),
                    if (_isLoadingSmart)
                      _buildLoadingCard()
                    else if (_smartSuggestions.isNotEmpty)
                      _buildSmartSuggestionsCard()
                    else
                      _buildEmptySuggestionsCard(isDark),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
              // Tab bar - below "For You" with reduced height
              Container(
                height: 40,
                margin: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[900] : Colors.grey[100],
                  borderRadius: BorderRadius.circular(10),
                ),
                child: TabBar(
                  controller: _tabController,
                  labelColor: Colors.white,
                  unselectedLabelColor: isDark ? Colors.grey[400] : Colors.grey[600],
                  indicator: BoxDecoration(
                    color: Colors.teal,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: Colors.transparent,
                  padding: const EdgeInsets.all(3),
                  labelPadding: EdgeInsets.zero,
                  tabs: [
                    Tab(
                      height: 34,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.flash_on, size: 16),
                          const SizedBox(width: 5),
                          Text('quick_actions.simple'.tr(), style: const TextStyle(fontSize: 13)),
                        ],
                      ),
                    ),
                    Tab(
                      height: 34,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.auto_awesome, size: 16),
                          const SizedBox(width: 5),
                          Text('quick_actions.complex'.tr(), style: const TextStyle(fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              // Tab content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildSimpleTab(scrollController, isDark),
                    _buildComplexTab(scrollController, isDark),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSimpleTab(ScrollController scrollController, bool isDark) {
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        const SizedBox(height: 8),
        // Static categories (For You is now above the tabs)
        ...AutoPilotSuggestions.categories.map(
          (category) => _buildCategorySection(category, isDark),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildComplexTab(ScrollController scrollController, bool isDark) {
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        const SizedBox(height: 8),
        // Complex command categories
        ...ComplexCommands.categories.map(
          (category) => _buildComplexCategorySection(category, isDark),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildSectionHeader(
    BuildContext context,
    String title,
    IconData icon, {
    VoidCallback? onRefresh,
    bool isLoading = false,
  }) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.amber),
        const SizedBox(width: 8),
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const Spacer(),
        if (onRefresh != null)
          IconButton(
            icon: isLoading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh, size: 20),
            onPressed: isLoading ? null : onRefresh,
            tooltip: 'Refresh',
          ),
      ],
    );
  }

  Widget _buildLoadingCard() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[900] : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      child: const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: CircularProgressIndicator(),
        ),
      ),
    );
  }

  Widget _buildEmptySuggestionsCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[900] : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.amber.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.wb_sunny_outlined,
              color: Colors.amber,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'No personalized suggestions right now',
              style: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSmartSuggestionsCard() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[900] : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      child: Column(
        children: _smartSuggestions.map((suggestion) {
          final isLast = suggestion == _smartSuggestions.last;
          return Column(
            children: [
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _getColorForSuggestion(suggestion.icon).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    _getIconForSuggestion(suggestion.icon),
                    color: _getColorForSuggestion(suggestion.icon),
                    size: 20,
                  ),
                ),
                title: Text(
                  suggestion.text,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () => _handleSuggestionTap(suggestion.command),
              ),
              if (!isLast)
                Divider(
                  height: 1,
                  indent: 56,
                  color: isDark ? Colors.grey[800] : Colors.grey[200],
                ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCategorySection(SuggestionCategory category, bool isDark) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category header
          Row(
            children: [
              Icon(category.icon, size: 18, color: category.color),
              const SizedBox(width: 8),
              Text(
                category.titleDefault,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.grey[300] : Colors.grey[700],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Suggestion chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: category.suggestions.map((suggestion) {
              return ActionChip(
                avatar: Icon(
                  suggestion.icon,
                  size: 16,
                  color: category.color,
                ),
                label: Text(suggestion.defaultText),
                labelStyle: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey[200] : Colors.grey[800],
                ),
                backgroundColor: isDark
                    ? category.color.withValues(alpha: 0.15)
                    : category.color.withValues(alpha: 0.08),
                side: BorderSide(
                  color: category.color.withValues(alpha: 0.3),
                ),
                onPressed: () => _handleSuggestionTap(suggestion.commandText),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildComplexCategorySection(ComplexCommandCategory category, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      category.color,
                      category.color.withValues(alpha: 0.7),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  category.icon,
                  size: 16,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                category.titleDefault,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Command cards
          ...category.commands.map((command) {
            final isExecuting = _isExecuting && _executingCommandId == command.id;
            return _buildComplexCommandCard(command, isDark, isExecuting);
          }),
        ],
      ),
    );
  }

  Widget _buildComplexCommandCard(ComplexCommand command, bool isDark, bool isExecuting) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[900] : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isExecuting || _isExecuting
              ? null
              : () => _executeComplexCommand(command.command, command.id),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: command.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        command.icon,
                        size: 20,
                        color: command.color,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            command.titleDefault,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white : Colors.black,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            command.descriptionDefault,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (isExecuting)
                      SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(command.color),
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: command.color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(
                          Icons.play_arrow_rounded,
                          size: 18,
                          color: command.color,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                // Tool chain preview
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey[850] : Colors.grey[50],
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.route_outlined,
                        size: 12,
                        color: isDark ? Colors.grey[500] : Colors.grey[600],
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${command.estimatedSteps} ${'quick_actions.steps'.tr()}',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.grey[500] : Colors.grey[600],
                        ),
                      ),
                      const Spacer(),
                      // Tool icons
                      ...command.toolChain.take(4).map((tool) {
                        return Padding(
                          padding: const EdgeInsets.only(left: 3),
                          child: Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              color: command.color.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Icon(
                              _getToolIcon(tool),
                              size: 10,
                              color: command.color,
                            ),
                          ),
                        );
                      }),
                      if (command.toolChain.length > 4)
                        Padding(
                          padding: const EdgeInsets.only(left: 3),
                          child: Text(
                            '+${command.toolChain.length - 4}',
                            style: TextStyle(
                              fontSize: 10,
                              color: command.color,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
