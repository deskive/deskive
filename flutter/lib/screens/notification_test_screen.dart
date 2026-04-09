import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import '../services/notification_integration_service.dart';
import '../services/push_notification_service.dart';
import '../models/notification.dart' as models;
import '../config/app_config.dart';

class NotificationTestScreen extends StatefulWidget {
  const NotificationTestScreen({super.key});

  @override
  State<NotificationTestScreen> createState() => _NotificationTestScreenState();
}

class _NotificationTestScreenState extends State<NotificationTestScreen> {
  final NotificationService _notificationService = NotificationService.instance;
  final NotificationIntegrationService _integrationService = NotificationIntegrationService.instance;
  final PushNotificationService _pushService = PushNotificationService.instance;
  
  bool _isLoading = false;
  String _statusMessage = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification System Test'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildStatusCard(),
            const SizedBox(height: 20),
            _buildServiceStatusSection(),
            const SizedBox(height: 20),
            _buildTestActionsSection(),
            const SizedBox(height: 20),
            _buildNotificationCountsSection(),
            const SizedBox(height: 20),
            _buildLocalNotificationTestSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _isLoading ? Icons.hourglass_empty : Icons.info,
                  color: _isLoading ? Colors.orange : Colors.blue,
                ),
                const SizedBox(width: 8),
                Text(
                  'Status',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_isLoading)
              const LinearProgressIndicator()
            else
              Text(
                _statusMessage.isNotEmpty ? _statusMessage : 'Ready to test notifications',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceStatusSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Service Status',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildStatusRow('Notification Service', _notificationService.isInitialized),
            _buildStatusRow('Push Service', _pushService.isInitialized),
            _buildStatusRow('Local Notifications', _pushService.isInitialized),
            _buildStatusRow('AppAtOnce Service', _notificationService.isInitialized),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, bool isOk) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            isOk ? Icons.check_circle : Icons.error,
            color: isOk ? Colors.green : Colors.red,
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label),
          ),
          Text(
            isOk ? 'OK' : 'Error',
            style: TextStyle(
              color: isOk ? Colors.green : Colors.red,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTestActionsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Test Notifications',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildTestButton(
              'Test Task Notification',
              Icons.task_alt,
              Colors.blue,
              _testTaskNotification,
            ),
            const SizedBox(height: 8),
            _buildTestButton(
              'Test Project Notification',
              Icons.folder,
              Colors.green,
              _testProjectNotification,
            ),
            const SizedBox(height: 8),
            _buildTestButton(
              'Test Calendar Notification',
              Icons.event,
              Colors.orange,
              _testCalendarNotification,
            ),
            const SizedBox(height: 8),
            _buildTestButton(
              'Test Chat Notification',
              Icons.chat,
              Colors.purple,
              _testChatNotification,
            ),
            const SizedBox(height: 8),
            _buildTestButton(
              'Test File Notification',
              Icons.attach_file,
              Colors.teal,
              _testFileNotification,
            ),
            const SizedBox(height: 8),
            _buildTestButton(
              'Test System Notification',
              Icons.settings,
              Colors.grey,
              _testSystemNotification,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTestButton(String label, IconData icon, Color color, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isLoading ? null : onPressed,
        icon: Icon(icon),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 12),
        ),
      ),
    );
  }

  Widget _buildNotificationCountsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Notification Counts',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Spacer(),
                StreamBuilder<int>(
                  stream: _notificationService.unreadCountStream,
                  builder: (context, snapshot) {
                    final count = snapshot.data ?? 0;
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: count > 0 ? Colors.red : Colors.grey,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$count unread',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            StreamBuilder<List<models.NotificationModel>>(
              stream: _notificationService.notificationsListStream,
              builder: (context, snapshot) {
                final notifications = snapshot.data ?? [];
                final categoryCounts = <models.NotificationCategory, int>{};
                
                for (final notification in notifications) {
                  categoryCounts[notification.category] = 
                      (categoryCounts[notification.category] ?? 0) + 1;
                }

                return Column(
                  children: models.NotificationCategory.values.map((category) {
                    final count = categoryCounts[category] ?? 0;
                    return _buildCountRow(
                      category.name.toUpperCase(),
                      count,
                      _getCategoryColor(category),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCountRow(String label, int count, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(label)),
          Text(
            '$count',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildLocalNotificationTestSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Local Notification Tests',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildTestButton(
              'Test Local Notification',
              Icons.notifications_active,
              Colors.indigo,
              _testLocalNotification,
            ),
            const SizedBox(height: 8),
            _buildTestButton(
              'Test Scheduled Notification',
              Icons.schedule,
              Colors.deepOrange,
              _testScheduledNotification,
            ),
          ],
        ),
      ),
    );
  }

  Color _getCategoryColor(models.NotificationCategory category) {
    switch (category) {
      case models.NotificationCategory.task:
        return Colors.blue;
      case models.NotificationCategory.project:
        return Colors.green;
      case models.NotificationCategory.calendar:
        return Colors.orange;
      case models.NotificationCategory.chat:
        return Colors.purple;
      case models.NotificationCategory.file:
        return Colors.teal;
      case models.NotificationCategory.workspace:
        return Colors.indigo;
      case models.NotificationCategory.system:
        return Colors.grey;
      case models.NotificationCategory.reminder:
        return Colors.amber;
      case models.NotificationCategory.mention:
        return Colors.pink;
      default:
        return Colors.blueGrey;
    }
  }

  Future<void> _updateStatus(String message) async {
    setState(() {
      _statusMessage = message;
    });
    await Future.delayed(const Duration(milliseconds: 100));
  }

  Future<void> _testTaskNotification() async {
    setState(() { _isLoading = true; });
    
    try {
      await _updateStatus('Creating task notification...');

      final userId = await AppConfig.getCurrentUserId() ?? '';
      if (userId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User ID not available')),
        );
        return;
      }

      await _integrationService.sendTaskNotification(
        taskId: 'task-${DateTime.now().millisecondsSinceEpoch}',
        taskTitle: 'Complete quarterly review',
        recipientUserId: userId,
        senderName: 'Test User',
        type: TaskNotificationType.assigned,
        projectId: 'project-123',
        projectName: 'Q4 Planning',
      );
      
      await _updateStatus('Task notification created successfully!');
    } catch (e) {
      await _updateStatus('Error creating task notification: $e');
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  Future<void> _testProjectNotification() async {
    setState(() { _isLoading = true; });

    try {
      await _updateStatus('Creating project notification...');

      final userId = await AppConfig.getCurrentUserId() ?? "";
      if (userId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User ID not available')),
        );
        return;
      }

      await _integrationService.sendProjectNotification(
        projectId: 'project-${DateTime.now().millisecondsSinceEpoch}',
        projectName: 'Mobile App Redesign',
        recipientUserId: userId,
        senderName: 'Project Manager',
        type: ProjectNotificationType.invited,
      );

      await _updateStatus('Project notification created successfully!');
    } catch (e) {
      await _updateStatus('Error creating project notification: $e');
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  Future<void> _testCalendarNotification() async {
    setState(() { _isLoading = true; });

    try {
      await _updateStatus('Creating calendar notification...');

      final userId = await AppConfig.getCurrentUserId() ?? "";
      if (userId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User ID not available')),
        );
        return;
      }

      await _integrationService.sendCalendarNotification(
        eventId: 'event-${DateTime.now().millisecondsSinceEpoch}',
        eventTitle: 'Weekly Team Standup',
        recipientUserId: userId,
        senderName: 'Calendar System',
        type: CalendarNotificationType.reminder,
        eventDateTime: DateTime.now().add(const Duration(minutes: 15)),
      );

      await _updateStatus('Calendar notification created successfully!');
    } catch (e) {
      await _updateStatus('Error creating calendar notification: $e');
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  Future<void> _testChatNotification() async {
    setState(() { _isLoading = true; });

    try {
      await _updateStatus('Creating chat notification...');

      final userId = await AppConfig.getCurrentUserId() ?? "";
      if (userId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User ID not available')),
        );
        return;
      }

      await _integrationService.sendChatNotification(
        channelId: 'channel-${DateTime.now().millisecondsSinceEpoch}',
        channelName: 'general',
        messageId: 'msg-${DateTime.now().millisecondsSinceEpoch}',
        messagePreview: 'Hey team, the new feature is ready for testing!',
        recipientUserId: userId,
        senderName: 'Alice Johnson',
        type: ChatNotificationType.mention,
      );

      await _updateStatus('Chat notification created successfully!');
    } catch (e) {
      await _updateStatus('Error creating chat notification: $e');
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  Future<void> _testFileNotification() async {
    setState(() { _isLoading = true; });

    try {
      await _updateStatus('Creating file notification...');

      final userId = await AppConfig.getCurrentUserId() ?? "";
      if (userId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User ID not available')),
        );
        return;
      }

      await _integrationService.sendFileNotification(
        fileId: 'file-${DateTime.now().millisecondsSinceEpoch}',
        fileName: 'project_requirements.pdf',
        recipientUserId: userId,
        senderName: 'Bob Smith',
        type: FileNotificationType.shared,
        projectId: 'project-123',
      );

      await _updateStatus('File notification created successfully!');
    } catch (e) {
      await _updateStatus('Error creating file notification: $e');
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  Future<void> _testSystemNotification() async {
    setState(() { _isLoading = true; });

    try {
      await _updateStatus('Creating system notification...');

      final userId = await AppConfig.getCurrentUserId() ?? "";
      if (userId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User ID not available')),
        );
        return;
      }

      await _integrationService.sendSystemNotification(
        title: 'System Maintenance',
        body: 'Scheduled maintenance will begin at 2:00 AM UTC. Expected downtime: 30 minutes.',
        recipientUserId: userId,
        priority: models.NotificationPriority.high,
      );

      await _updateStatus('System notification created successfully!');
    } catch (e) {
      await _updateStatus('Error creating system notification: $e');
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  Future<void> _testLocalNotification() async {
    setState(() { _isLoading = true; });
    
    try {
      await _updateStatus('Showing local notification...');
      
      await _pushService.showLocalNotification(
        title: 'Test Local Notification',
        body: 'This is a test local notification from the Flutter app!',
        data: {'test': 'true', 'timestamp': DateTime.now().toIso8601String()},
      );
      
      await _updateStatus('Local notification shown successfully!');
    } catch (e) {
      await _updateStatus('Error showing local notification: $e');
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  Future<void> _testScheduledNotification() async {
    setState(() { _isLoading = true; });
    
    try {
      await _updateStatus('Scheduling notification for 10 seconds...');

      // Scheduled notifications removed - using local notifications only
      await _pushService.showLocalNotification(
        title: 'Test Notification',
        body: 'This is a test notification from push notification service!',
        data: {'test': 'true', 'timestamp': DateTime.now().toIso8601String()},
        priority: NotificationPriority.high,
      );

      await _updateStatus('Notification shown successfully!');
    } catch (e) {
      await _updateStatus('Error scheduling notification: $e');
    } finally {
      setState(() { _isLoading = false; });
    }
  }
}