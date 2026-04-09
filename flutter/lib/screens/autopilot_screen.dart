import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:intl/intl.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../services/autopilot_service.dart';
import '../services/auth_service.dart';
import '../services/workspace_service.dart';
import '../config/app_config.dart';
import '../config/autopilot_suggestions.dart';
import '../utils/typing_effect.dart';
import '../api/services/project_api_service.dart';
import '../api/services/calendar_api_service.dart';
import '../api/services/notes_api_service.dart' hide ConversationMessage;
import '../api/services/file_api_service.dart';
import '../widgets/autopilot/suggestion_sheet.dart';
import '../widgets/autopilot/suggestion_trigger.dart';
import '../api/services/workflow_api_service.dart';
import '../api/base_api_client.dart' show ApiResponse;
import '../models/workflow.dart';

/// AutoPilot Screen - Full screen AI assistant interface with SSE streaming
class AutoPilotScreen extends StatefulWidget {
  final String? initialModule;

  const AutoPilotScreen({super.key, this.initialModule});

  @override
  State<AutoPilotScreen> createState() => _AutoPilotScreenState();
}

class _AutoPilotScreenState extends State<AutoPilotScreen>
    with TickerProviderStateMixin {
  final AutoPilotService _autoPilotService = AutoPilotService();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  bool _isLoading = false;
  bool _isInitialized = false;
  bool _isStreaming = false;
  String? _workspaceId;
  String _currentModule = 'dashboard';
  String _currentStatus = '';

  // Tabs
  int _selectedTabIndex = 0; // 0 = Chat, 1 = History

  // Session history
  List<AutoPilotSession> _sessions = [];
  bool _isLoadingSessions = false;

  // Typing effect controller for streaming
  final TypingEffectController _typingController = TypingEffectController();

  // Attachments
  final List<AttachedFile> _attachedFiles = [];
  final List<ReferencedItem> _referencedItems = [];

  // Smart suggestions
  int _smartSuggestionCount = 0;
  bool _isSuggestionTriggerCollapsed = false;

  // Workflows and Scheduled Actions
  List<PendingWorkflow> _pendingWorkflows = [];
  List<ScheduledAction> _scheduledActions = [];
  bool _isLoadingWorkflows = false;

  // User data for avatar (fetched from API like dashboard screen)
  Map<String, dynamic>? _userData;

  // Animation controllers
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _currentModule = widget.initialModule ?? 'dashboard';

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _initialize();
  }

  Future<void> _initialize() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('autopilot.select_workspace_first'.tr())),
        );
      }
      return;
    }

    _workspaceId = workspaceId;
    await _autoPilotService.initialize();

    if (mounted) {
      setState(() => _isInitialized = true);
    }

    try {
      final result = await _autoPilotService.resumeOrCreateSession(workspaceId);
      debugPrint('AutoPilot session ${result.isNew ? "created" : "resumed"}: ${result.sessionId}');

      // Scroll to bottom after loading history
      if (!result.isNew) {
        _scrollToBottom();
      }

      // Load smart suggestions, workflows, and user data for avatar
      _loadSmartSuggestions();
      _loadWorkflows();
      _loadUserData();
    } catch (e) {
      debugPrint('AutoPilot session error: $e');
      try {
        await _autoPilotService.createSession(workspaceId);
      } catch (e2) {
        debugPrint('AutoPilot fallback session creation error: $e2');
      }
    }
  }

  Future<void> _loadSmartSuggestions() async {
    if (_workspaceId == null) return;

    try {
      final response = await _autoPilotService.getSmartSuggestions(
        workspaceId: _workspaceId!,
      );
      if (mounted) {
        setState(() {
          _smartSuggestionCount = response.suggestions.length;
        });
      }
    } catch (e) {
      debugPrint('Failed to load smart suggestions: $e');
    }
  }

  /// Load user data from API for avatar display (same as dashboard screen)
  Future<void> _loadUserData() async {
    try {
      final response = await AuthService.instance.dio.get('/auth/me');

      if (response.statusCode == 200) {
        final userData = response.data['user'] ?? response.data;

        if (mounted) {
          setState(() {
            _userData = userData;
          });
        }
      }
    } catch (e) {
      debugPrint('Failed to load user data: $e');
    }
  }

  void _showSuggestionSheet() {
    if (_workspaceId == null) return;

    SuggestionBottomSheet.show(
      context: context,
      workspaceId: _workspaceId!,
      currentModule: _currentModule,
      onSuggestionTap: (command) {
        _textController.text = command;
        _sendCommand(command);
      },
    );
  }

  Future<void> _loadWorkflows({VoidCallback? onStateChanged}) async {
    if (_workspaceId == null) {
      debugPrint('[AutoPilot] Cannot load workflows - workspaceId is null');
      return;
    }

    debugPrint('[AutoPilot] Loading workflows and scheduled actions for workspace: $_workspaceId');
    setState(() => _isLoadingWorkflows = true);
    onStateChanged?.call();

    try {
      // Load both pending workflows and scheduled actions in parallel
      final results = await Future.wait([
        WorkflowApiService.instance.getPendingWorkflows(_workspaceId!),
        _autoPilotService.getScheduledActions(workspaceId: _workspaceId!),
      ]);

      final workflowResponse = results[0] as ApiResponse<List<PendingWorkflow>>;
      final scheduledActions = results[1] as List<ScheduledAction>;

      debugPrint('[AutoPilot] Loaded ${workflowResponse.data?.length ?? 0} workflows and ${scheduledActions.length} scheduled actions');

      if (mounted) {
        setState(() {
          if (workflowResponse.success && workflowResponse.data != null) {
            _pendingWorkflows = workflowResponse.data!;
          }
          _scheduledActions = scheduledActions;
          _isLoadingWorkflows = false;
        });
        onStateChanged?.call();
      }
    } catch (e) {
      debugPrint('[AutoPilot] Failed to load pending workflows: $e');
      if (mounted) {
        setState(() => _isLoadingWorkflows = false);
        onStateChanged?.call();
      }
    }
  }

  void _showWorkflowsSheet() {
    if (_workspaceId == null) return;

    // Reset state before showing sheet
    _pendingWorkflows = [];
    _scheduledActions = [];
    _isLoadingWorkflows = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildWorkflowsSheet(),
    );
  }

  Widget _buildWorkflowsSheet() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final theme = Theme.of(context);
    bool hasInitiatedLoad = false;

    return StatefulBuilder(
      builder: (context, setSheetState) {
        // Trigger load on first build
        if (!hasInitiatedLoad) {
          hasInitiatedLoad = true;
          // Use addPostFrameCallback to avoid calling setState during build
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _loadWorkflows(onStateChanged: () {
              if (context.mounted) setSheetState(() {});
            });
          });
        }

        return Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: BoxDecoration(
            color: isDark ? Colors.grey.shade900 : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade400,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'autopilot.workflows'.tr(),
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'autopilot.workflows_description'.tr(),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh),
                      onPressed: () {
                        _loadWorkflows(onStateChanged: () => setSheetState(() {}));
                      },
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Workflows and Scheduled Actions list
              Expanded(
                child: _isLoadingWorkflows
                    ? const Center(child: CircularProgressIndicator())
                    : (_pendingWorkflows.isEmpty && _scheduledActions.isEmpty)
                        ? _buildEmptyWorkflowsState(theme)
                        : ListView(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            children: [
                              // Scheduled Actions Section
                              if (_scheduledActions.isNotEmpty) ...[
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.schedule,
                                        size: 16,
                                        color: Colors.orange,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'autopilot.scheduled_actions'.tr(),
                                        style: theme.textTheme.labelLarge?.copyWith(
                                          color: Colors.orange,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                ..._scheduledActions.map((action) =>
                                    _buildScheduledActionTile(action, theme, isDark)),
                              ],
                              // Workflows Section
                              if (_pendingWorkflows.isNotEmpty) ...[
                                if (_scheduledActions.isNotEmpty)
                                  const Divider(height: 24),
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.auto_awesome,
                                        size: 16,
                                        color: theme.colorScheme.primary,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'autopilot.recurring_workflows'.tr(),
                                        style: theme.textTheme.labelLarge?.copyWith(
                                          color: theme.colorScheme.primary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                ..._pendingWorkflows.map((pendingWorkflow) =>
                                    _buildPendingWorkflowTile(pendingWorkflow, theme, isDark)),
                              ],
                            ],
                          ),
              ),
              // Create workflow hint
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.lightbulb_outline,
                          color: theme.colorScheme.primary,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'autopilot.workflow_hint'.tr(),
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyWorkflowsState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.auto_awesome_outlined,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'autopilot.no_workflows'.tr(),
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'autopilot.no_workflows_hint'.tr(),
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPendingWorkflowTile(PendingWorkflow pendingWorkflow, ThemeData theme, bool isDark) {
    final workflow = pendingWorkflow.workflow;

    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: _parseColor(workflow.color) ?? theme.colorScheme.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          _parseIcon(workflow.icon) ?? Icons.auto_awesome,
          color: theme.colorScheme.primary,
          size: 20,
        ),
      ),
      title: Text(
        workflow.name,
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Row(
        children: [
          Icon(
            pendingWorkflow.isScheduled ? Icons.schedule : Icons.hourglass_empty,
            size: 12,
            color: pendingWorkflow.isScheduled ? Colors.blue : Colors.orange,
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              pendingWorkflow.statusDescription,
              style: theme.textTheme.bodySmall?.copyWith(
                color: pendingWorkflow.isScheduled ? Colors.blue : Colors.orange,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: pendingWorkflow.isScheduled
              ? Colors.blue.withValues(alpha: 0.1)
              : Colors.orange.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          pendingWorkflow.isScheduled ? 'autopilot.trigger_schedule'.tr() : 'autopilot.pending'.tr(),
          style: theme.textTheme.labelSmall?.copyWith(
            color: pendingWorkflow.isScheduled ? Colors.blue : Colors.orange,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      onTap: () => _showWorkflowDetails(workflow),
    );
  }

  Widget _buildScheduledActionTile(ScheduledAction action, ThemeData theme, bool isDark) {
    // Get appropriate icon for action type
    IconData actionIcon;
    switch (action.actionType) {
      case 'send_email':
        actionIcon = Icons.email;
        break;
      case 'send_notification':
        actionIcon = Icons.notifications;
        break;
      default:
        actionIcon = Icons.schedule;
    }

    // Determine status color and label
    Color statusColor;
    String statusLabel;
    IconData statusIcon;
    switch (action.status) {
      case 'pending':
        statusColor = Colors.orange;
        statusLabel = 'autopilot.pending'.tr();
        statusIcon = Icons.access_time;
        break;
      case 'executing':
        statusColor = Colors.blue;
        statusLabel = 'autopilot.executing'.tr();
        statusIcon = Icons.sync;
        break;
      case 'completed':
        statusColor = Colors.green;
        statusLabel = 'autopilot.completed'.tr();
        statusIcon = Icons.check_circle;
        break;
      case 'failed':
        statusColor = Colors.red;
        statusLabel = 'autopilot.failed'.tr();
        statusIcon = Icons.error;
        break;
      case 'cancelled':
        statusColor = Colors.grey;
        statusLabel = 'autopilot.cancelled'.tr();
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = Colors.orange;
        statusLabel = action.status;
        statusIcon = Icons.access_time;
    }

    // Format the scheduled time
    final now = DateTime.now();
    final scheduledAt = action.scheduledAt;
    String timeDescription;
    if (action.status == 'completed' && action.executedAt != null) {
      // Show executed time for completed actions
      final executedAt = action.executedAt!;
      if (executedAt.day == now.day &&
          executedAt.month == now.month &&
          executedAt.year == now.year) {
        timeDescription = 'autopilot.executed_today'.tr(args: [
          DateFormat('h:mm a').format(executedAt),
        ]);
      } else {
        timeDescription = 'autopilot.executed_at'.tr(args: [
          DateFormat('MMM d, h:mm a').format(executedAt),
        ]);
      }
    } else if (scheduledAt.day == now.day &&
        scheduledAt.month == now.month &&
        scheduledAt.year == now.year) {
      timeDescription = 'autopilot.scheduled_for_today'.tr(args: [
        DateFormat('h:mm a').format(scheduledAt),
      ]);
    } else if (scheduledAt.difference(now).inDays == 1) {
      timeDescription = 'autopilot.scheduled_for_tomorrow'.tr(args: [
        DateFormat('h:mm a').format(scheduledAt),
      ]);
    } else {
      timeDescription = 'autopilot.scheduled_for'.tr(args: [
        DateFormat('MMM d, h:mm a').format(scheduledAt),
      ]);
    }

    // Only allow dismissal for pending actions
    final canCancel = action.status == 'pending';

    final tile = ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: statusColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          actionIcon,
          color: statusColor,
          size: 20,
        ),
      ),
      title: Text(
        action.description ?? action.actionType.replaceAll('_', ' '),
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
          decoration: action.status == 'cancelled' ? TextDecoration.lineThrough : null,
        ),
      ),
      subtitle: Row(
        children: [
          Icon(
            statusIcon,
            size: 12,
            color: statusColor,
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              timeDescription,
              style: theme.textTheme.bodySmall?.copyWith(
                color: statusColor,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: statusColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          statusLabel,
          style: theme.textTheme.labelSmall?.copyWith(
            color: statusColor,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );

    if (!canCancel) {
      return tile;
    }

    return Dismissible(
      key: Key(action.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: Colors.red,
        child: const Icon(Icons.cancel, color: Colors.white),
      ),
      confirmDismiss: (direction) async {
        return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('autopilot.cancel_action'.tr()),
            content: Text('autopilot.cancel_action_confirm'.tr()),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('common.no'.tr()),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                child: Text('common.yes'.tr()),
              ),
            ],
          ),
        ) ?? false;
      },
      onDismissed: (direction) async {
        final success = await _autoPilotService.cancelScheduledAction(action.id);
        if (success && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('autopilot.action_cancelled'.tr())),
          );
          _loadWorkflows();
        }
      },
      child: tile,
    );
  }

  Color? _parseColor(String? colorStr) {
    if (colorStr == null || colorStr.isEmpty) return null;
    try {
      if (colorStr.startsWith('#')) {
        return Color(int.parse(colorStr.substring(1), radix: 16) + 0xFF000000);
      }
    } catch (_) {}
    return null;
  }

  IconData? _parseIcon(String? iconStr) {
    if (iconStr == null || iconStr.isEmpty) return null;
    // Map common icon names to IconData
    final iconMap = {
      'task': Icons.task_alt,
      'email': Icons.email,
      'notification': Icons.notifications,
      'calendar': Icons.calendar_today,
      'note': Icons.note,
      'video': Icons.videocam,
      'message': Icons.message,
    };
    return iconMap[iconStr.toLowerCase()];
  }

  void _showWorkflowDetails(Workflow workflow) {
    Navigator.pop(context); // Close bottom sheet
    // Send command to AutoPilot to show workflow details
    _textController.text = 'Show me the "${workflow.name}" workflow details';
    _sendCommand(_textController.text);
  }

  void _showMessageOptions(BuildContext context, String content) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.copy),
              title: Text('common.copy'.tr()),
              onTap: () {
                Clipboard.setData(ClipboardData(text: content));
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('common.copied'.tr()),
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadSessions() async {
    if (_workspaceId == null) return;

    setState(() => _isLoadingSessions = true);

    try {
      final sessions = await _autoPilotService.listSessions(
        workspaceId: _workspaceId!,
      );
      if (mounted) {
        setState(() {
          _sessions = sessions;
          _isLoadingSessions = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingSessions = false);
      }
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    _pulseController.dispose();
    _typingController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  Future<void> _sendCommand(String command) async {
    if (command.trim().isEmpty || _workspaceId == null) return;

    // Build command with references context if any
    String fullCommand = command;
    if (_referencedItems.isNotEmpty) {
      final refContext = _referencedItems.map((ref) =>
        '[${ref.type}: ${ref.title} (id: ${ref.id})]'
      ).join(', ');
      fullCommand = '$command\n\nContext references: $refContext';
    }

    // Copy attachments before clearing
    final attachmentsToSend = List<AttachedFile>.from(_attachedFiles);
    final referencesToSend = List<ReferencedItem>.from(_referencedItems);

    _textController.clear();
    setState(() {
      _isLoading = true;
      _isStreaming = true;
      _currentStatus = 'autopilot.thinking'.tr();
      _attachedFiles.clear();
      _referencedItems.clear();
    });
    _scrollToBottom();

    // Reset typing controller for new response
    _typingController.reset();

    try {
      // Use non-streaming API for mobile (more reliable)
      await _autoPilotService.executeCommand(
        command: fullCommand,
        workspaceId: _workspaceId!,
        attachments: attachmentsToSend.isNotEmpty ? attachmentsToSend : null,
        references: referencesToSend.isNotEmpty ? referencesToSend : null,
      );
    } catch (e) {
      debugPrint('AutoPilot error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('autopilot.error_occurred'.tr())),
        );
      }
    }

    // Clear loading state
    if (mounted) {
      setState(() {
        _isLoading = false;
        _isStreaming = false;
        _currentStatus = '';
      });
    }
    _scrollToBottom();
  }

  Future<void> _pickImage() async {
    // Show bottom sheet to choose camera or gallery
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.teal),
              title: Text('autopilot.take_photo'.tr()),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.teal),
              title: Text('autopilot.choose_from_gallery'.tr()),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (source == null) return;

    final picker = ImagePicker();
    final image = await picker.pickImage(source: source);

    if (image != null) {
      final bytes = await image.readAsBytes();
      final base64 = base64Encode(bytes);
      final file = File(image.path);

      setState(() {
        _attachedFiles.add(AttachedFile(
          name: image.name,
          path: image.path,
          mimeType: 'image/${image.path.split('.').last}',
          size: file.lengthSync(),
          base64Content: base64,
        ));
      });
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'txt', 'json', 'md', 'doc', 'docx', 'csv', 'xml', 'html'],
    );

    if (result != null && result.files.single.path != null) {
      final file = File(result.files.single.path!);
      final bytes = await file.readAsBytes();
      final extension = result.files.single.extension?.toLowerCase() ?? '';

      String? content;
      if (extension == 'pdf') {
        // Extract PDF text using backend
        final extracted = await _autoPilotService.extractPdfText(file);
        if (extracted != null) {
          content = extracted.text;
        }
      } else if (['txt', 'json', 'md', 'csv', 'xml', 'html'].contains(extension)) {
        // For text-based files, read directly
        try {
          content = utf8.decode(bytes);
        } catch (e) {
          debugPrint('Error decoding file: $e');
        }
      }

      setState(() {
        _attachedFiles.add(AttachedFile(
          name: result.files.single.name,
          path: result.files.single.path!,
          mimeType: _getMimeType(extension),
          size: result.files.single.size,
          base64Content: content != null ? base64Encode(utf8.encode(content)) : null,
        ));
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('autopilot.file_attached'.tr(args: [result.files.single.name])),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  String _getMimeType(String extension) {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      case 'json':
        return 'application/json';
      case 'md':
        return 'text/markdown';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'csv':
        return 'text/csv';
      case 'xml':
        return 'application/xml';
      case 'html':
        return 'text/html';
      default:
        return 'application/octet-stream';
    }
  }

  void _removeAttachment(int index) {
    setState(() {
      _attachedFiles.removeAt(index);
    });
  }

  void _removeReference(int index) {
    setState(() {
      _referencedItems.removeAt(index);
    });
  }

  Future<void> _switchSession(AutoPilotSession session) async {
    setState(() => _isLoadingSessions = true);

    final success = await _autoPilotService.switchSession(session.sessionId);

    if (success && mounted) {
      setState(() {
        _selectedTabIndex = 0;
        _isLoadingSessions = false;
      });
      // Scroll to bottom to show last message
      _scrollToBottom();
    } else if (mounted) {
      setState(() => _isLoadingSessions = false);
    }
  }

  Future<void> _deleteSession(AutoPilotSession session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('autopilot.delete_conversation'.tr()),
        content: Text('autopilot.delete_conversation_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _autoPilotService.deleteSession(session.sessionId);
      _loadSessions();
    }
  }

  void _createNewSession() async {
    if (_workspaceId == null) return;

    _autoPilotService.clearLocalHistory();
    await _autoPilotService.createSession(_workspaceId!);
    setState(() {
      _selectedTabIndex = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final theme = Theme.of(context);

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        _dismissKeyboard();
      },
      child: Scaffold(
        appBar: AppBar(
          centerTitle: true,
          title: Text('autopilot.title'.tr()),
          automaticallyImplyLeading: false,
          actions: [
            // Workflows button with badge
            Stack(
              children: [
                IconButton(
                  icon: const Icon(Icons.auto_awesome_outlined),
                  onPressed: _showWorkflowsSheet,
                  tooltip: 'autopilot.workflows'.tr(),
                ),
                if (_pendingWorkflows.isNotEmpty || _scheduledActions.isNotEmpty)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: _scheduledActions.isNotEmpty
                            ? Colors.orange
                            : Theme.of(context).colorScheme.primary,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        '${_pendingWorkflows.length + _scheduledActions.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: _createNewSession,
              tooltip: 'autopilot.new_conversation'.tr(),
            ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(36),
            child: Container(
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildTab(0, 'autopilot.chat'.tr(), Icons.chat_outlined),
                  ),
                  Expanded(
                    child: _buildTab(1, 'autopilot.history'.tr(), Icons.history_outlined),
                  ),
                ],
              ),
            ),
          ),
        ),
        body: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.opaque,
          child: Column(
            children: [
              Expanded(
                child: Stack(
                  children: [
                    _selectedTabIndex == 0
                        ? _buildChatTab(isDark, theme)
                        : _buildHistoryTab(isDark, theme),
                    // Quick Actions FAB
                    if (_selectedTabIndex == 0 && _isInitialized && !_isLoading)
                      Positioned(
                        right: 16,
                        bottom: 16,
                        child: SuggestionTrigger(
                          onTap: _showSuggestionSheet,
                          smartSuggestionCount: _smartSuggestionCount,
                          initiallyCollapsed: _isSuggestionTriggerCollapsed,
                          onCollapseChanged: (collapsed) {
                            setState(() => _isSuggestionTriggerCollapsed = collapsed);
                          },
                        ),
                      ),
                  ],
                ),
              ),
              if (_selectedTabIndex == 0) _buildInputArea(isDark, theme),
            ],
          ),
        ),
      ),
    );
  }

  void _dismissKeyboard() {
    FocusScope.of(context).unfocus();
  }

  Widget _buildTab(int index, String label, IconData icon) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSelected = _selectedTabIndex == index;

    return GestureDetector(
      onTap: () {
        _dismissKeyboard();
        setState(() => _selectedTabIndex = index);
        if (index == 1) {
          _loadSessions();
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? Colors.teal : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected
                  ? Colors.teal
                  : isDark
                      ? Colors.grey.shade400
                      : Colors.grey.shade600,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: isSelected
                    ? Colors.teal
                    : isDark
                        ? Colors.grey.shade400
                        : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatTab(bool isDark, ThemeData theme) {
    if (!_isInitialized) {
      return _buildLoadingState(isDark);
    }

    return StreamBuilder<List<ConversationMessage>>(
      stream: _autoPilotService.historyStream,
      initialData: _autoPilotService.conversationHistory,
      builder: (context, snapshot) {
        final messages = snapshot.data ?? _autoPilotService.conversationHistory;

        if (messages.isEmpty && !_isStreaming) {
          return _buildWelcomeScreen(isDark, theme);
        }

        return ListView.builder(
          controller: _scrollController,
          padding: const EdgeInsets.all(16),
          itemCount: messages.length + (_isStreaming ? 1 : 0),
          itemBuilder: (context, index) {
            if (_isStreaming && index == messages.length) {
              return _buildStreamingIndicator(isDark, theme);
            }
            return _buildMessageBubble(messages[index], isDark, theme);
          },
        );
      },
    );
  }

  Widget _buildHistoryTab(bool isDark, ThemeData theme) {
    if (_isLoadingSessions) {
      return const Center(child: CircularProgressIndicator(color: Colors.teal));
    }

    if (_sessions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history_outlined,
              size: 64,
              color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              'autopilot.no_conversations'.tr(),
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _sessions.length,
      itemBuilder: (context, index) {
        final session = _sessions[index];
        final isCurrentSession =
            session.sessionId == _autoPilotService.currentSessionId;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: isCurrentSession
                ? Colors.teal.withValues(alpha: 0.1)
                : isDark
                    ? Colors.grey.shade900
                    : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isCurrentSession
                  ? Colors.teal.withValues(alpha: 0.5)
                  : isDark
                      ? Colors.grey.shade800
                      : Colors.grey.shade200,
            ),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.teal.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.chat_outlined,
                color: Colors.teal.shade600,
              ),
            ),
            title: Text(
              session.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontWeight: isCurrentSession ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
            subtitle: Text(
              '${session.messageCount} ${'autopilot.messages'.tr()} - ${timeago.format(session.updatedAt)}',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            trailing: PopupMenuButton<String>(
              icon: Icon(
                Icons.more_vert,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
              onSelected: (value) {
                if (value == 'open') {
                  _switchSession(session);
                } else if (value == 'delete') {
                  _deleteSession(session);
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'open',
                  child: Row(
                    children: [
                      const Icon(Icons.open_in_new, size: 18),
                      const SizedBox(width: 8),
                      Text('autopilot.open'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                      const SizedBox(width: 8),
                      Text('autopilot.delete'.tr(), style: const TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
            onTap: () => _switchSession(session),
          ),
        );
      },
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _pulseAnimation.value,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Colors.teal.shade400, Colors.green.shade400],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.teal.withValues(alpha: 0.3),
                        blurRadius: 20,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.auto_fix_high, color: Colors.white, size: 40),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          Text(
            'autopilot.initializing'.tr(),
            style: TextStyle(
              fontSize: 16,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeScreen(bool isDark, ThemeData theme) {
    final config = AutoPilotSuggestions.getConfigForView(_currentModule);
    final suggestions = AutoPilotSuggestions.getSuggestionsForView(_currentModule);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Center(
            child: AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (context, child) {
                return Transform.scale(
                  scale: _pulseAnimation.value,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [Colors.teal.shade400, Colors.green.shade400],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.teal.withValues(alpha: 0.3),
                          blurRadius: 30,
                          spreadRadius: 10,
                        ),
                      ],
                    ),
                    child: const Icon(Icons.auto_fix_high, color: Colors.white, size: 50),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 32),
          Center(
            child: Text(
              'autopilot.welcome'.tr(),
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: MarkdownBody(
                data: config.welcomeDefault,
                styleSheet: MarkdownStyleSheet(
                  p: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    height: 1.5,
                  ),
                  textAlign: WrapAlignment.center,
                ),
              ),
            ),
          ),
          const SizedBox(height: 40),
          Text(
            'autopilot.suggestions'.tr(),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: suggestions.map((suggestion) {
              return GestureDetector(
                onTap: () => _sendCommand(suggestion.defaultText),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(suggestion.icon, size: 18, color: Colors.teal.shade600),
                      const SizedBox(width: 8),
                      Text(
                        suggestion.defaultText,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ConversationMessage message, bool isDark, ThemeData theme) {
    final isUser = message.isUser;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [Colors.teal.shade500, Colors.green.shade500],
                ),
              ),
              child: const Icon(Icons.auto_fix_high, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isUser
                        ? Colors.teal.shade600
                        : isDark
                            ? Colors.grey.shade800
                            : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(18).copyWith(
                      bottomRight: isUser ? const Radius.circular(4) : null,
                      bottomLeft: !isUser ? const Radius.circular(4) : null,
                    ),
                  ),
                  child: GestureDetector(
                    onLongPress: () => _showMessageOptions(context, message.content),
                    child: isUser
                        ? SelectableText(
                            message.content,
                            style: const TextStyle(color: Colors.white, fontSize: 15),
                          )
                        : MarkdownBody(
                            data: message.content,
                            selectable: true,
                            styleSheet: MarkdownStyleSheet(
                              p: TextStyle(
                                color: isDark ? Colors.white : Colors.black87,
                                fontSize: 15,
                                height: 1.4,
                              ),
                              code: TextStyle(
                                backgroundColor: isDark
                                    ? Colors.grey.shade900
                                    : Colors.grey.shade200,
                                fontSize: 13,
                              ),
                              codeblockDecoration: BoxDecoration(
                                color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                  ),
                ),
                if (message.actions != null && message.actions!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  // Filter actions to show only final results (hide failed retries)
                  ..._filterActionsForDisplay(message.actions!).map((action) => _buildActionBadge(action)),
                ],
              ],
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 10),
            _buildUserAvatar(isDark),
          ],
        ],
      ),
    );
  }

  Widget _buildStreamingIndicator(bool isDark, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [Colors.teal.shade500, Colors.green.shade500],
              ),
            ),
            child: const Icon(Icons.auto_fix_high, color: Colors.white, size: 18),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status indicator
                if (_currentStatus.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.teal.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.teal.shade600),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _currentStatus,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.teal.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                // Typing content
                ListenableBuilder(
                  listenable: _typingController,
                  builder: (context, _) {
                    final content = _typingController.displayedContent;
                    if (content.isEmpty && _currentStatus.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.grey.shade800 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(18).copyWith(
                            bottomLeft: const Radius.circular(4),
                          ),
                        ),
                        child: const _TypingDots(),
                      );
                    }
                    if (content.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey.shade800 : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(18).copyWith(
                          bottomLeft: const Radius.circular(4),
                        ),
                      ),
                      child: MarkdownBody(
                        data: content,
                        styleSheet: MarkdownStyleSheet(
                          p: TextStyle(
                            color: isDark ? Colors.white : Colors.black87,
                            fontSize: 15,
                            height: 1.4,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserAvatar(bool isDark) {
    // Use _userData from API if available (same as dashboard screen), otherwise fallback to AuthService
    String? avatarUrl;
    String initials = '';

    if (_userData != null) {
      // Get avatar from multiple possible field names (same as dashboard)
      avatarUrl = _userData!['profileImage']?.toString() ??
                  _userData!['avatar_url']?.toString() ??
                  _userData!['avatar']?.toString() ??
                  _userData!['profile_image']?.toString();

      // Get initials from user name
      final userName = _userData!['name']?.toString() ??
                       _userData!['metadata']?['full_name']?.toString() ??
                       '';
      if (userName.isNotEmpty) {
        final nameParts = userName.trim().split(' ');
        if (nameParts.length == 1) {
          initials = nameParts[0].isNotEmpty ? nameParts[0][0].toUpperCase() : '';
        } else if (nameParts.length > 1) {
          initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        }
      }
    } else {
      // Fallback to AuthService.currentUser
      final user = AuthService.instance.currentUser;
      avatarUrl = user?.avatarUrl;
      initials = user?.initials ?? '';
    }

    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isDark ? Colors.blue.shade700 : Colors.blue.shade500,
      ),
      child: avatarUrl != null && avatarUrl.isNotEmpty
          ? ClipOval(
              child: Image.network(
                avatarUrl,
                width: 36,
                height: 36,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) =>
                    _buildAvatarFallback(initials, isDark),
              ),
            )
          : _buildAvatarFallback(initials, isDark),
    );
  }

  Widget _buildAvatarFallback(String initials, bool isDark) {
    if (initials.isNotEmpty) {
      return Center(
        child: Text(
          initials,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }
    return Icon(Icons.person, color: Colors.white.withValues(alpha: 0.9), size: 20);
  }

  /// Filter actions to show only the final result for each tool.
  /// If a tool has both failed and successful executions, only show the success.
  /// If all executions failed, show only the last failure.
  List<ExecutedAction> _filterActionsForDisplay(List<ExecutedAction> actions) {
    final Map<String, ExecutedAction> toolResults = {};

    for (final action in actions) {
      final existing = toolResults[action.tool];
      if (existing == null) {
        // First occurrence of this tool
        toolResults[action.tool] = action;
      } else if (action.success && !existing.success) {
        // New success overrides previous failure
        toolResults[action.tool] = action;
      } else if (!existing.success && !action.success) {
        // Both failed, keep the latest
        toolResults[action.tool] = action;
      }
      // If existing is success, don't override with failure
    }

    return toolResults.values.toList();
  }

  Widget _buildActionBadge(ExecutedAction action) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: action.success ? Colors.green.shade50 : Colors.red.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: action.success ? Colors.green.shade200 : Colors.red.shade200,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            action.success ? Icons.check_circle : Icons.error,
            size: 16,
            color: action.success ? Colors.green.shade600 : Colors.red.shade600,
          ),
          const SizedBox(width: 8),
          Text(
            action.tool.replaceAll('_', ' ').toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              color: action.success ? Colors.green.shade700 : Colors.red.shade700,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea(bool isDark, ThemeData theme) {
    return Container(
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Attachments preview
          if (_attachedFiles.isNotEmpty || _referencedItems.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ..._attachedFiles.asMap().entries.map((entry) {
                    final index = entry.key;
                    final file = entry.value;
                    return _buildAttachmentChip(file, () => _removeAttachment(index));
                  }),
                  ..._referencedItems.asMap().entries.map((entry) {
                    final index = entry.key;
                    final ref = entry.value;
                    return _buildReferenceChip(ref, () => _removeReference(index));
                  }),
                ],
              ),
            ),
          ],
          // Input row
          Padding(
            padding: EdgeInsets.fromLTRB(
              8,
              12,
              16,
              12 + MediaQuery.of(context).padding.bottom,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // + button for attachments (like message module)
                IconButton(
                  icon: const Icon(Icons.add_circle_outline),
                  iconSize: 28,
                  padding: const EdgeInsets.all(4),
                  constraints: const BoxConstraints(),
                  onPressed: _showAttachmentOptions,
                  color: Colors.teal,
                ),
                const SizedBox(width: 8),
                // Text field (matching chat screen style exactly)
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(2),
                      border: Border.all(
                        color: isDark
                            ? Colors.grey.shade700
                            : Colors.grey.shade300,
                        width: 1,
                      ),
                    ),
                    child: Container(
                      constraints: const BoxConstraints(
                        minHeight: 40,
                        maxHeight: 120,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: TextField(
                        controller: _textController,
                        focusNode: _focusNode,
                        decoration: InputDecoration(
                          hintText: 'autopilot.placeholder'.tr(),
                          hintStyle: TextStyle(
                            color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                          isDense: true,
                        ),
                        textInputAction: TextInputAction.send,
                        onSubmitted: _sendCommand,
                        enabled: !_isLoading && _isInitialized,
                        maxLines: 4,
                        minLines: 1,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                // Send button
                GestureDetector(
                  onTap: (_isLoading || !_isInitialized)
                      ? null
                      : () => _sendCommand(_textController.text),
                  child: _isLoading
                      ? _buildLoadingButton()
                      : Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: _isInitialized
                                ? LinearGradient(
                                    colors: [Colors.teal.shade500, Colors.green.shade500],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  )
                                : LinearGradient(
                                    colors: [Colors.grey.shade400, Colors.grey.shade500],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                            boxShadow: _isInitialized
                                ? [
                                    BoxShadow(
                                      color: Colors.teal.withValues(alpha: 0.4),
                                      blurRadius: 12,
                                      spreadRadius: 2,
                                    ),
                                  ]
                                : null,
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.send_rounded,
                              color: Colors.white,
                              size: 22,
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingButton() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [
                Color.lerp(Colors.teal.shade500, Colors.teal.shade400, _pulseAnimation.value)!,
                Color.lerp(Colors.green.shade500, Colors.green.shade400, _pulseAnimation.value)!,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.teal.withValues(alpha: 0.3 + (_pulseAnimation.value * 0.2)),
                blurRadius: 12 + (_pulseAnimation.value * 6),
                spreadRadius: 1 + (_pulseAnimation.value * 2),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Rotating outer ring
              SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ),
              // Pulsing center dot
              Transform.scale(
                scale: 0.8 + (_pulseAnimation.value * 0.2),
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.white.withValues(alpha: 0.5),
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Text(
              'autopilot.add_attachment'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildAttachmentOption(
                  context,
                  Icons.image,
                  'autopilot.image'.tr(),
                  Colors.orange,
                  () {
                    Navigator.pop(context);
                    _pickImage();
                  },
                ),
                _buildAttachmentOption(
                  context,
                  Icons.insert_drive_file,
                  'autopilot.file'.tr(),
                  Colors.blue,
                  () {
                    Navigator.pop(context);
                    _pickFile();
                  },
                ),
                _buildAttachmentOption(
                  context,
                  Icons.link,
                  'autopilot.reference'.tr(),
                  Colors.purple,
                  () {
                    Navigator.pop(context);
                    _showReferencePicker();
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachmentOption(
    BuildContext context,
    IconData icon,
    String label,
    Color color,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).textTheme.bodyMedium?.color,
            ),
          ),
        ],
      ),
    );
  }

  void _showReferencePicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                'autopilot.select_reference'.tr(),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    _buildReferenceCategory(
                      'autopilot.tasks'.tr(),
                      Icons.check_circle_outline,
                      Colors.green,
                      'task',
                    ),
                    _buildReferenceCategory(
                      'autopilot.notes'.tr(),
                      Icons.note_outlined,
                      Colors.amber,
                      'note',
                    ),
                    _buildReferenceCategory(
                      'autopilot.events'.tr(),
                      Icons.event_outlined,
                      Colors.blue,
                      'event',
                    ),
                    _buildReferenceCategory(
                      'autopilot.projects'.tr(),
                      Icons.folder_outlined,
                      Colors.purple,
                      'project',
                    ),
                    _buildReferenceCategory(
                      'autopilot.files_category'.tr(),
                      Icons.description_outlined,
                      Colors.orange,
                      'file',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReferenceCategory(
    String title,
    IconData icon,
    Color color,
    String type,
  ) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: color),
      ),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        Navigator.pop(context);
        _showReferenceItemsPicker(type, title, icon, color);
      },
    );
  }

  void _showReferenceItemsPicker(String type, String title, IconData icon, Color color) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => _ReferenceItemsList(
          type: type,
          title: title,
          icon: icon,
          color: color,
          workspaceId: workspaceId,
          scrollController: scrollController,
          onItemSelected: (id, itemTitle) {
            Navigator.pop(context);
            setState(() {
              _referencedItems.add(ReferencedItem(
                type: type,
                id: id,
                title: itemTitle,
              ));
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('autopilot.reference_added'.tr()),
                duration: const Duration(seconds: 2),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildAttachmentChip(AttachedFile file, VoidCallback onRemove) {
    IconData icon;
    if (file.isImage) {
      icon = Icons.image_outlined;
    } else if (file.isPdf) {
      icon = Icons.picture_as_pdf_outlined;
    } else {
      icon = Icons.description_outlined;
    }

    return Chip(
      avatar: Icon(icon, size: 18, color: Colors.teal.shade600),
      label: Text(
        file.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 12),
      ),
      deleteIcon: const Icon(Icons.close, size: 16),
      onDeleted: onRemove,
      backgroundColor: Colors.teal.withValues(alpha: 0.1),
      side: BorderSide(color: Colors.teal.withValues(alpha: 0.3)),
    );
  }

  Widget _buildReferenceChip(ReferencedItem ref, VoidCallback onRemove) {
    IconData icon;
    switch (ref.type) {
      case 'task':
        icon = Icons.check_circle_outline;
        break;
      case 'note':
        icon = Icons.note_outlined;
        break;
      case 'event':
        icon = Icons.event_outlined;
        break;
      case 'project':
        icon = Icons.folder_outlined;
        break;
      case 'file':
        icon = Icons.description_outlined;
        break;
      default:
        icon = Icons.link;
    }

    return Chip(
      avatar: Icon(icon, size: 18, color: Colors.blue.shade600),
      label: Text(
        ref.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 12),
      ),
      deleteIcon: const Icon(Icons.close, size: 16),
      onDeleted: onRemove,
      backgroundColor: Colors.blue.withValues(alpha: 0.1),
      side: BorderSide(color: Colors.blue.withValues(alpha: 0.3)),
    );
  }
}

/// Animated typing dots indicator
class _TypingDots extends StatefulWidget {
  const _TypingDots();

  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final delay = index * 0.2;
            final value = (_controller.value + delay) % 1.0;
            final bounce = value < 0.5
                ? Curves.easeOut.transform(value * 2)
                : Curves.easeIn.transform((1 - value) * 2);

            return Container(
              margin: EdgeInsets.only(right: index < 2 ? 6 : 0),
              child: Transform.translate(
                offset: Offset(0, -6 * bounce),
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.teal.shade400.withValues(alpha: 0.5 + (0.5 * bounce)),
                  ),
                ),
              ),
            );
          },
        );
      }),
    );
  }
}

/// Widget to display list of reference items fetched from API
class _ReferenceItemsList extends StatefulWidget {
  final String type;
  final String title;
  final IconData icon;
  final Color color;
  final String workspaceId;
  final ScrollController scrollController;
  final Function(String id, String title) onItemSelected;

  const _ReferenceItemsList({
    required this.type,
    required this.title,
    required this.icon,
    required this.color,
    required this.workspaceId,
    required this.scrollController,
    required this.onItemSelected,
  });

  @override
  State<_ReferenceItemsList> createState() => _ReferenceItemsListState();
}

class _ReferenceItemsListState extends State<_ReferenceItemsList> {
  List<Map<String, dynamic>> _items = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  Future<void> _loadItems() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      switch (widget.type) {
        case 'task':
          await _loadTasks();
          break;
        case 'note':
          await _loadNotes();
          break;
        case 'event':
          await _loadEvents();
          break;
        case 'project':
          await _loadProjects();
          break;
        case 'file':
          await _loadFiles();
          break;
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadTasks() async {
    final projectService = ProjectApiService();
    // First get projects, then get tasks from each
    final projectsResponse = await projectService.getAllProjects(widget.workspaceId);
    if (projectsResponse.success && projectsResponse.data != null) {
      final allTasks = <Map<String, dynamic>>[];
      for (final project in projectsResponse.data!) {
        final tasksResponse = await projectService.getProjectTasks(
          widget.workspaceId,
          project.id,
        );
        if (tasksResponse.success && tasksResponse.data != null) {
          for (final task in tasksResponse.data!) {
            allTasks.add({
              'id': task.id,
              'title': task.title,
              'subtitle': project.name,
            });
          }
        }
      }
      _items = allTasks;
    }
  }

  Future<void> _loadNotes() async {
    final notesService = NotesApiService();
    final response = await notesService.getNotes(widget.workspaceId);
    if (response.success && response.data != null) {
      _items = response.data!.map((note) => {
        'id': note.id,
        'title': note.title,
        'subtitle': timeago.format(note.updatedAt),
      }).toList();
    }
  }

  Future<void> _loadEvents() async {
    final calendarService = CalendarApiService();
    final now = DateTime.now();
    final response = await calendarService.getEvents(
      widget.workspaceId,
      startDate: now.subtract(const Duration(days: 30)).toIso8601String(),
      endDate: now.add(const Duration(days: 90)).toIso8601String(),
    );
    if (response.success && response.data != null) {
      _items = response.data!.map((event) => {
        'id': event.id,
        'title': event.title,
        'subtitle': DateFormat('MMM d, yyyy').format(event.startTime),
      }).toList();
    }
  }

  Future<void> _loadProjects() async {
    final projectService = ProjectApiService();
    final response = await projectService.getAllProjects(widget.workspaceId);
    if (response.success && response.data != null) {
      _items = response.data!.map((project) => {
        'id': project.id,
        'title': project.name,
        'subtitle': project.description ?? '',
      }).toList();
    }
  }

  Future<void> _loadFiles() async {
    final fileService = FileApiService();
    final response = await fileService.getFiles(widget.workspaceId);
    if (response.success && response.data != null) {
      _items = response.data!.data.map((file) => {
        'id': file.id,
        'title': file.name,
        'subtitle': _formatFileSize(file.size),
      }).toList();
    }
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.pop(context),
              ),
              Icon(widget.icon, color: widget.color),
              const SizedBox(width: 8),
              Text(
                widget.title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.teal))
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error_outline, size: 48, color: Colors.red.shade300),
                            const SizedBox(height: 8),
                            Text('autopilot.error_loading'.tr()),
                            TextButton(
                              onPressed: _loadItems,
                              child: Text('common.retry'.tr()),
                            ),
                          ],
                        ),
                      )
                    : _items.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(widget.icon, size: 48, color: Colors.grey.shade400),
                                const SizedBox(height: 8),
                                Text(
                                  'autopilot.no_items'.tr(),
                                  style: TextStyle(color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: widget.scrollController,
                            itemCount: _items.length,
                            itemBuilder: (context, index) {
                              final item = _items[index];
                              return ListTile(
                                leading: Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: widget.color.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(widget.icon, color: widget.color, size: 20),
                                ),
                                title: Text(
                                  item['title'] ?? '',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                subtitle: item['subtitle']?.isNotEmpty == true
                                    ? Text(
                                        item['subtitle'],
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade600,
                                        ),
                                      )
                                    : null,
                                onTap: () => widget.onItemSelected(
                                  item['id'],
                                  item['title'] ?? '',
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
