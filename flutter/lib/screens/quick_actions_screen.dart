import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../config/autopilot_suggestions.dart';
import '../config/complex_commands.dart';
import '../config/app_config.dart';
import '../services/autopilot_service.dart';
import '../theme/app_theme.dart';

class QuickActionsScreen extends StatefulWidget {
  const QuickActionsScreen({super.key});

  @override
  State<QuickActionsScreen> createState() => _QuickActionsScreenState();
}

class _QuickActionsScreenState extends State<QuickActionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final AutoPilotService _autoPilotService = AutoPilotService();
  String? _workspaceId;
  bool _isExecuting = false;
  String? _executingCommandId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _initialize();
  }

  Future<void> _initialize() async {
    await _autoPilotService.initialize();
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (mounted) {
      setState(() {
        _workspaceId = workspaceId;
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _executeCommand(String command, {String? commandId}) async {
    if (_workspaceId == null || _isExecuting) return;

    setState(() {
      _isExecuting = true;
      _executingCommandId = commandId;
    });

    try {
      // Resume or create session
      await _autoPilotService.resumeOrCreateSession(_workspaceId!);

      // Execute the command
      final response = await _autoPilotService.executeCommand(
        command: command,
        workspaceId: _workspaceId!,
      );

      if (mounted) {
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: context.backgroundColor,
      appBar: AppBar(
        backgroundColor: context.backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: isDark ? Colors.white : Colors.black,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'quick_actions.title'.tr(),
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.teal,
          unselectedLabelColor: isDark ? Colors.white60 : Colors.grey[600],
          indicatorColor: Colors.teal,
          indicatorWeight: 3,
          tabs: [
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.flash_on, size: 18),
                  const SizedBox(width: 6),
                  Text('quick_actions.simple'.tr()),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.auto_awesome, size: 18),
                  const SizedBox(width: 6),
                  Text('quick_actions.complex'.tr()),
                ],
              ),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSimpleTab(isDark),
          _buildComplexTab(isDark),
        ],
      ),
    );
  }

  Widget _buildSimpleTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          _buildHeaderCard(
            isDark,
            icon: Icons.flash_on,
            title: 'quick_actions.simple_actions'.tr(),
            subtitle: 'quick_actions.simple_description'.tr(),
            color: AppTheme.infoLight,
          ),
          const SizedBox(height: 24),
          // Simple action categories from autopilot_suggestions
          ...AutoPilotSuggestions.categories.map(
            (category) => _buildSimpleCategorySection(category, isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildComplexTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          _buildHeaderCard(
            isDark,
            icon: Icons.auto_awesome,
            title: 'quick_actions.complex_actions'.tr(),
            subtitle: 'quick_actions.complex_description'.tr(),
            color: const Color(0xFF8B5CF6),
          ),
          const SizedBox(height: 24),
          // Complex command categories
          ...ComplexCommands.categories.map(
            (category) => _buildComplexCategorySection(category, isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderCard(
    bool isDark, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.1),
            color.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              size: 24,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white60 : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleCategorySection(SuggestionCategory category, bool isDark) {
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
                  color: category.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  category.icon,
                  size: 18,
                  color: category.color,
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
          const SizedBox(height: 12),
          // Command chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: category.suggestions.map((suggestion) {
              final isExecuting = _isExecuting &&
                  _executingCommandId == 'simple_${suggestion.action}';
              return _buildSimpleCommandChip(
                suggestion,
                category.color,
                isDark,
                isExecuting,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleCommandChip(
    CommandSuggestion suggestion,
    Color categoryColor,
    bool isDark,
    bool isExecuting,
  ) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isExecuting || _isExecuting
            ? null
            : () => _executeCommand(
                  suggestion.commandText,
                  commandId: 'simple_${suggestion.action}',
                ),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isDark
                ? categoryColor.withValues(alpha: 0.15)
                : categoryColor.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: categoryColor.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isExecuting)
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(categoryColor),
                  ),
                )
              else
                Icon(
                  suggestion.icon,
                  size: 16,
                  color: categoryColor,
                ),
              const SizedBox(width: 8),
              Text(
                suggestion.defaultText,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey[200] : Colors.grey[800],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildComplexCategorySection(
      ComplexCommandCategory category, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      category.color,
                      category.color.withValues(alpha: 0.7),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  category.icon,
                  size: 20,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                category.titleDefault,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Command cards
          ...category.commands.map((command) {
            final isExecuting =
                _isExecuting && _executingCommandId == command.id;
            return _buildComplexCommandCard(command, isDark, isExecuting);
          }),
        ],
      ),
    );
  }

  Widget _buildComplexCommandCard(
      ComplexCommand command, bool isDark, bool isExecuting) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isExecuting || _isExecuting
              ? null
              : () => _executeCommand(command.command, commandId: command.id),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: command.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        command.icon,
                        size: 22,
                        color: command.color,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            command.titleDefault,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white : Colors.black,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            command.descriptionDefault,
                            style: TextStyle(
                              fontSize: 13,
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
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(command.color),
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: command.color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.play_arrow_rounded,
                          size: 20,
                          color: command.color,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                // Tool chain preview
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.grey.shade900
                        : Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.route_outlined,
                        size: 14,
                        color: isDark ? Colors.grey[500] : Colors.grey[600],
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${command.estimatedSteps} ${'quick_actions.steps'.tr()}',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[500] : Colors.grey[600],
                          ),
                        ),
                      ),
                      // Tool icons
                      ...command.toolChain.take(4).map((tool) {
                        return Padding(
                          padding: const EdgeInsets.only(left: 4),
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: command.color.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Icon(
                              _getToolIcon(tool),
                              size: 12,
                              color: command.color,
                            ),
                          ),
                        );
                      }),
                      if (command.toolChain.length > 4)
                        Padding(
                          padding: const EdgeInsets.only(left: 4),
                          child: Text(
                            '+${command.toolChain.length - 4}',
                            style: TextStyle(
                              fontSize: 11,
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
}
