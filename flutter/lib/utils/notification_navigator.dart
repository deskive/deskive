import 'package:flutter/material.dart';
import '../models/notification.dart';
import '../models/calendar_event.dart' as local_calendar;
import '../message/chat_screen.dart';
import '../calendar/calendar_screen.dart';
import '../calendar/edit_event_screen.dart';
import '../files/files_screen.dart';
import '../projects/project_dashboard_screen.dart';
import '../projects/project_details_screen.dart';
import '../projects/edit_task_screen.dart';
import '../email/email_screen.dart';
import '../services/workspace_service.dart';
import '../services/project_service.dart';
import '../api/services/calendar_api_service.dart' as calendar_api;

/// Utility class to handle navigation from notifications to their source screens
class NotificationNavigator {
  NotificationNavigator._();

  /// Navigate to the source screen based on notification data
  static Future<void> navigateToSource(
    BuildContext context,
    NotificationModel notification,
  ) async {
    final metadata = notification.metadata;
    final data = metadata?.additionalData ?? {};

    // Get workspace ID from notification or current workspace
    final workspaceId = metadata?.workspaceId ??
                        data['workspace_id'] as String? ??
                        WorkspaceService.instance.currentWorkspace?.id;

    debugPrint('🔔 NotificationNavigator: Navigating for category=${notification.category}');
    debugPrint('🔔 NotificationNavigator: additionalData=$data');
    debugPrint('🔔 NotificationNavigator: workspaceId=$workspaceId');

    // If we have direct metadata fields (channelId, projectId, etc.), use them
    // This handles cases where category might be 'other' but we have navigation data
    if (metadata?.channelId != null) {
      debugPrint('🔔 NotificationNavigator: Found channelId in metadata, navigating to chat');
      await _navigateToChat(context, {
        ...data,
        'channel_id': metadata!.channelId,
      }, workspaceId ?? '');
      return;
    }

    if (metadata?.projectId != null) {
      debugPrint('🔔 NotificationNavigator: Found projectId in metadata, navigating to project');
      await _navigateToProject(context, {
        ...data,
        'project_id': metadata!.projectId,
      }, workspaceId ?? '');
      return;
    }

    // Try to navigate based on entity_type from additionalData
    final entityType = data['entity_type'] as String?;
    if (entityType != null) {
      debugPrint('🔔 NotificationNavigator: Found entity_type=$entityType');
      switch (entityType.toLowerCase()) {
        case 'channel':
        case 'conversation':
        case 'message':
        case 'chat':
          await _navigateToChat(context, data, workspaceId ?? '');
          return;
        case 'event':
        case 'calendar':
          await _navigateToCalendar(context, data, workspaceId ?? '');
          return;
        case 'file':
        case 'drive':
          await _navigateToFiles(context, data, workspaceId ?? '');
          return;
        case 'project':
          await _navigateToProject(context, data, workspaceId ?? '');
          return;
        case 'task':
          await _navigateToTask(context, data, workspaceId ?? '');
          return;
      }
    }

    // If still no navigation, try based on category
    switch (notification.category) {
      case NotificationCategory.chat:
      case NotificationCategory.mention:
        await _navigateToChat(context, data, workspaceId ?? '');
        break;

      case NotificationCategory.calendar:
        await _navigateToCalendar(context, data, workspaceId ?? '');
        break;

      case NotificationCategory.file:
        await _navigateToFiles(context, data, workspaceId ?? '');
        break;

      case NotificationCategory.project:
        await _navigateToProject(context, data, workspaceId ?? '');
        break;

      case NotificationCategory.task:
        await _navigateToTask(context, data, workspaceId ?? '');
        break;

      case NotificationCategory.workspace:
        // For workspace notifications, just show a message - user is already in the workspace
        _showSnackBar(context, 'Workspace notification');
        break;

      case NotificationCategory.reminder:
        await _navigateFromReminder(context, data, workspaceId ?? '');
        break;

      case NotificationCategory.system:
      case NotificationCategory.other:
        // For system/other notifications, try to parse action_url or show message
        await _navigateFromActionUrl(context, data, workspaceId ?? '');
        break;
    }
  }

  /// Navigate to chat/message screen
  static Future<void> _navigateToChat(
    BuildContext context,
    Map<String, dynamic> data,
    String workspaceId,
  ) async {
    final channelId = data['channel_id'] as String?;
    final conversationId = data['conversation_id'] as String?;
    final channelName = data['channel_name'] as String?;
    final senderName = data['sender_name'] as String?;

    if (channelId != null) {
      // Navigate to channel chat
      debugPrint('🔔 Navigating to channel: $channelId ($channelName)');
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => ChatScreen(
            chatName: channelName ?? 'Channel',
            channelId: channelId,
            isChannel: true,
            isPrivateChannel: false,
          ),
        ),
      );
    } else if (conversationId != null) {
      // Navigate to direct message conversation
      debugPrint('🔔 Navigating to conversation: $conversationId');
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => ChatScreen(
            chatName: senderName ?? 'Direct Message',
            conversationId: conversationId,
            isChannel: false,
            isPrivateChannel: false,
          ),
        ),
      );
    } else {
      debugPrint('🔔 No channel or conversation ID found in notification');
      _showSnackBar(context, 'Unable to open chat: missing conversation data');
    }
  }

  /// Navigate to calendar screen with specific event
  static Future<void> _navigateToCalendar(
    BuildContext context,
    Map<String, dynamic> data,
    String workspaceId,
  ) async {
    final eventId = data['entity_id'] as String? ?? data['event_id'] as String?;
    final eventTitle = data['event_title'] as String?;

    debugPrint('🔔 Navigating to calendar, eventId: $eventId, title: $eventTitle');

    // If we have an event ID, try to fetch and open the specific event
    if (eventId != null && eventId.isNotEmpty && workspaceId.isNotEmpty) {
      try {
        // Show loading indicator
        _showLoadingDialog(context);

        // Fetch event from CalendarApiService
        final calendarApi = calendar_api.CalendarApiService();
        final response = await calendarApi.getEvent(workspaceId, eventId);

        // Close loading indicator
        if (context.mounted) Navigator.pop(context);

        if (response.isSuccess && response.data != null) {
          final apiEvent = response.data!;

          // Convert to local CalendarEvent model
          final localEvent = local_calendar.CalendarEvent(
            id: apiEvent.id,
            workspaceId: apiEvent.workspaceId,
            userId: apiEvent.organizerId,
            title: apiEvent.title,
            description: apiEvent.description,
            startTime: apiEvent.startTime,
            endTime: apiEvent.endTime,
            allDay: apiEvent.isAllDay,
            location: apiEvent.location,
            organizerId: apiEvent.organizerId,
            categoryId: apiEvent.categoryId,
            attendees: apiEvent.attendees?.map((a) => {
              'user_id': a.id,
              'name': a.name,
              'email': a.email,
              'status': a.status,
            }).toList() ?? [],
            attachments: apiEvent.attachments != null
                ? local_calendar.CalendarEventAttachments(
                    fileAttachment: apiEvent.attachments!.fileAttachment,
                    noteAttachment: apiEvent.attachments!.noteAttachment,
                    eventAttachment: apiEvent.attachments!.eventAttachment,
                  )
                : null,
            isRecurring: apiEvent.isRecurring,
            meetingUrl: apiEvent.meetingUrl,
            roomId: apiEvent.meetingRoomId,
            createdAt: apiEvent.createdAt,
            updatedAt: apiEvent.updatedAt,
          );

          if (context.mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => EditEventScreen(
                  event: localEvent,
                  onEventUpdated: (updatedEvent) {},
                  onEventDeleted: () {},
                ),
              ),
            );
          }
          return;
        }
      } catch (e) {
        debugPrint('🔔 Failed to fetch event: $e');
        // Close loading if still showing
        if (context.mounted) Navigator.pop(context);
      }
    }

    // Fallback: Navigate to calendar screen
    if (context.mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const CalendarScreen(),
        ),
      );

      if (eventTitle != null) {
        _showSnackBar(context, 'Event: $eventTitle');
      }
    }
  }

  /// Navigate to files screen
  static Future<void> _navigateToFiles(
    BuildContext context,
    Map<String, dynamic> data,
    String workspaceId,
  ) async {
    final fileId = data['entity_id'] as String? ?? data['file_id'] as String?;
    final fileName = data['file_name'] as String?;

    debugPrint('🔔 Navigating to files, fileId: $fileId');

    // TODO: Implement deep linking to specific file when file preview supports it
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const FilesScreen(),
      ),
    );

    // Show a hint about which file was mentioned
    if (fileName != null) {
      _showSnackBar(context, 'File: $fileName');
    }
  }

  /// Navigate to project details screen
  static Future<void> _navigateToProject(
    BuildContext context,
    Map<String, dynamic> data,
    String workspaceId,
  ) async {
    final projectId = data['project_id'] as String? ?? data['entity_id'] as String?;
    final projectName = data['project_name'] as String?;

    debugPrint('🔔 Navigating to project, projectId: $projectId');

    // If we have a project ID, try to fetch and open the specific project
    if (projectId != null && projectId.isNotEmpty) {
      try {
        // Show loading indicator
        _showLoadingDialog(context);

        // Fetch project from ProjectService
        final projectService = ProjectService.instance;
        final project = await projectService.getProject(projectId, workspaceId: workspaceId);

        // Close loading indicator
        if (context.mounted) Navigator.pop(context);

        if (project != null) {
          if (context.mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ProjectDetailsScreen(project: project),
              ),
            );
          }
          return;
        }
      } catch (e) {
        debugPrint('🔔 Failed to fetch project: $e');
        // Close loading if still showing
        if (context.mounted) Navigator.pop(context);
      }
    }

    // Fallback: Navigate to project dashboard
    if (context.mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const ProjectDashboardScreen(),
        ),
      );

      if (projectName != null) {
        _showSnackBar(context, 'Project: $projectName');
      }
    }
  }

  /// Navigate to task details screen
  static Future<void> _navigateToTask(
    BuildContext context,
    Map<String, dynamic> data,
    String workspaceId,
  ) async {
    final taskId = data['task_id'] as String? ?? data['entity_id'] as String?;
    final taskName = data['task_name'] as String?;

    debugPrint('🔔 Navigating to task, taskId: $taskId');

    // If we have a task ID, try to fetch and open the specific task
    if (taskId != null && taskId.isNotEmpty) {
      try {
        // Show loading indicator
        _showLoadingDialog(context);

        // Fetch task from ProjectService
        final projectService = ProjectService.instance;
        final task = await projectService.getTask(taskId, workspaceId: workspaceId);

        // Close loading indicator
        if (context.mounted) Navigator.pop(context);

        if (task != null) {
          if (context.mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => EditTaskScreen(task: task),
              ),
            );
          }
          return;
        }
      } catch (e) {
        debugPrint('🔔 Failed to fetch task: $e');
        // Close loading if still showing
        if (context.mounted) Navigator.pop(context);
      }
    }

    // Fallback: Navigate to project dashboard
    if (context.mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const ProjectDashboardScreen(),
        ),
      );

      if (taskName != null) {
        _showSnackBar(context, 'Task: $taskName');
      }
    }
  }

  /// Navigate from reminder notification based on entity type
  static Future<void> _navigateFromReminder(
    BuildContext context,
    Map<String, dynamic> data,
    String workspaceId,
  ) async {
    final entityType = data['entity_type'] as String?;

    switch (entityType) {
      case 'event':
        await _navigateToCalendar(context, data, workspaceId);
        break;
      case 'task':
        await _navigateToTask(context, data, workspaceId);
        break;
      case 'project':
        await _navigateToProject(context, data, workspaceId);
        break;
      default:
        _showSnackBar(context, 'Reminder notification');
        break;
    }
  }

  /// Navigate based on action_url if available
  static Future<void> _navigateFromActionUrl(
    BuildContext context,
    Map<String, dynamic> data,
    String workspaceId,
  ) async {
    final actionUrl = data['action_url'] as String?;

    if (actionUrl == null || actionUrl.isEmpty) {
      debugPrint('🔔 No action_url found in notification');
      return;
    }

    debugPrint('🔔 Parsing action_url: $actionUrl');

    try {
      final uri = Uri.parse(actionUrl);
      final segments = uri.pathSegments;

      // Parse paths like: /workspaces/{wsId}/chat/{id} or /workspaces/{wsId}/calendar
      if (segments.length >= 3 && segments[0] == 'workspaces') {
        final module = segments.length > 2 ? segments[2] : '';

        switch (module) {
          case 'chat':
            final chatId = segments.length > 3 ? segments[3] : uri.queryParameters['channel'];
            if (chatId != null) {
              data['channel_id'] = chatId;
              await _navigateToChat(context, data, workspaceId);
            }
            break;

          case 'calendar':
            final eventId = segments.length > 3 ? segments[3] : uri.queryParameters['eventId'];
            if (eventId != null) {
              data['entity_id'] = eventId;
            }
            await _navigateToCalendar(context, data, workspaceId);
            break;

          case 'files':
          case 'drive':
            final fileId = segments.length > 3 ? segments[3] : null;
            if (fileId != null) {
              data['entity_id'] = fileId;
            }
            await _navigateToFiles(context, data, workspaceId);
            break;

          case 'projects':
            final projectId = segments.length > 3 ? segments[3] : null;
            if (projectId != null) {
              data['project_id'] = projectId;
            }
            await _navigateToProject(context, data, workspaceId);
            break;

          case 'tasks':
            final taskId = segments.length > 3 ? segments[3] : null;
            if (taskId != null) {
              data['task_id'] = taskId;
            }
            await _navigateToTask(context, data, workspaceId);
            break;

          case 'email':
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => const EmailScreen(),
              ),
            );
            break;

          default:
            debugPrint('🔔 Unknown module in action_url: $module');
            break;
        }
      }
    } catch (e) {
      debugPrint('🔔 Failed to parse action_url: $e');
    }
  }

  /// Show a loading dialog
  static void _showLoadingDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );
  }

  /// Show a snackbar message
  static void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
