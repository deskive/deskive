import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/auth_service.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  bool _hasChanges = false;
  Map<String, dynamic>? _notificationSettings;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadNotificationSettings();
  }

  Future<void> _loadNotificationSettings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await AuthService.instance.dio.get('/settings/notifications');

      if (response.statusCode == 200) {
        setState(() {
          _notificationSettings = response.data;
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load notification settings');
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _updateCategorySetting(String categoryId, String settingType, bool value) async {
    setState(() {
      final categories = _notificationSettings!['categories'] as List;
      final categoryIndex = categories.indexWhere((c) => c['id'] == categoryId);
      if (categoryIndex != -1) {
        categories[categoryIndex]['settings'][settingType] = value;
      }
      _hasChanges = true;
    });
  }

  Future<void> _updateGeneralSetting(String key, dynamic value) async {
    setState(() {
      final generalSettings = _notificationSettings!['generalSettings'] as Map<String, dynamic>;
      if (key.contains('.')) {
        final parts = key.split('.');
        (generalSettings[parts[0]] as Map<String, dynamic>)[parts[1]] = value;
      } else {
        generalSettings[key] = value;
      }
      _hasChanges = true;
    });
  }

  Future<void> _saveSettings() async {
    setState(() {
      _isSaving = true;
    });

    try {
      final response = await AuthService.instance.dio.patch(
        '/settings/notifications',
        data: _notificationSettings,
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        setState(() {
          _isSaving = false;
          _hasChanges = false;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('notification_settings.settings_saved'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        throw Exception('Failed to save settings');
      }
    } catch (e) {
      setState(() {
        _isSaving = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('notification_settings.title'.tr()),
        actions: [
          if (_hasChanges)
            _isSaving
                ? Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ElevatedButton(
                      onPressed: _saveSettings,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Theme.of(context).colorScheme.primary,
                        elevation: 2,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: Text(
                        'notification_settings.save'.tr(),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'notification_settings.failed_to_load'.tr(),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          _errorMessage!,
                          style: Theme.of(context).textTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _loadNotificationSettings,
                        icon: const Icon(Icons.refresh),
                        label: Text('common.retry'.tr()),
                      ),
                    ],
                  ),
                )
              : SafeArea(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // General Settings
                        _buildSectionHeader('notification_settings.general_settings'.tr()),
                        const SizedBox(height: 8),
                        _buildGeneralSettingsCard(),
                        const SizedBox(height: 24),

                        // Categories
                        _buildSectionHeader('notification_settings.notification_categories'.tr()),
                        const SizedBox(height: 8),
                        ...(_notificationSettings!['categories'] as List).map((category) {
                          return _buildCategoryCard(category);
                        }).toList(),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
    );
  }

  String _getCategoryLabel(String categoryId) {
    switch (categoryId) {
      case 'messages':
        return 'notification_settings.category_messages'.tr();
      case 'tasks':
        return 'notification_settings.category_tasks'.tr();
      case 'calendar':
        return 'notification_settings.category_calendar'.tr();
      case 'workspace':
        return 'notification_settings.category_workspace'.tr();
      case 'files':
        return 'notification_settings.category_files'.tr();
      case 'projects':
        return 'notification_settings.category_projects'.tr();
      default:
        return categoryId;
    }
  }

  String _getCategoryDescription(String categoryId) {
    switch (categoryId) {
      case 'messages':
        return 'notification_settings.category_messages_desc'.tr();
      case 'tasks':
        return 'notification_settings.category_tasks_desc'.tr();
      case 'calendar':
        return 'notification_settings.category_calendar_desc'.tr();
      case 'workspace':
        return 'notification_settings.category_workspace_desc'.tr();
      case 'files':
        return 'notification_settings.category_files_desc'.tr();
      case 'projects':
        return 'notification_settings.category_projects_desc'.tr();
      default:
        return '';
    }
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.bold,
        color: Theme.of(context).colorScheme.primary,
      ),
    );
  }

  Widget _buildCategoryCard(Map<String, dynamic> category) {
    final settings = category['settings'] as Map<String, dynamic>;
    final categoryId = category['id'] as String;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getCategoryIcon(categoryId),
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getCategoryLabel(categoryId),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _getCategoryDescription(categoryId),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _updateCategorySetting(category['id'], 'push', !(settings['push'] ?? false)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Checkbox(
                          value: settings['push'] ?? false,
                          onChanged: (value) => _updateCategorySetting(category['id'], 'push', value!),
                          visualDensity: VisualDensity.compact,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        const SizedBox(width: 4),
                        Text('notification_settings.push'.tr(), style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  ),
                ),
                // TODO: Email notifications temporarily disabled
                // Expanded(
                //   child: InkWell(
                //     onTap: () => _updateCategorySetting(category['id'], 'email', !(settings['email'] ?? false)),
                //     child: Row(
                //       mainAxisSize: MainAxisSize.min,
                //       children: [
                //         Checkbox(
                //           value: settings['email'] ?? false,
                //           onChanged: (value) => _updateCategorySetting(category['id'], 'email', value!),
                //           visualDensity: VisualDensity.compact,
                //           materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                //         ),
                //         const SizedBox(width: 4),
                //         Text('notification_settings.email'.tr(), style: const TextStyle(fontSize: 13)),
                //       ],
                //     ),
                //   ),
                // ),
                Expanded(
                  child: InkWell(
                    onTap: () => _updateCategorySetting(category['id'], 'inApp', !(settings['inApp'] ?? false)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Checkbox(
                          value: settings['inApp'] ?? false,
                          onChanged: (value) => _updateCategorySetting(category['id'], 'inApp', value!),
                          visualDensity: VisualDensity.compact,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        const SizedBox(width: 4),
                        Text('notification_settings.in_app'.tr(), style: const TextStyle(fontSize: 13)),
                      ],
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

  Widget _buildGeneralSettingsCard() {
    final generalSettings = _notificationSettings!['generalSettings'] as Map<String, dynamic>;
    final quietHours = generalSettings['quietHours'] as Map<String, dynamic>;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SwitchListTile(
              title: Text('notification_settings.sound'.tr()),
              subtitle: Text('notification_settings.sound_description'.tr()),
              value: generalSettings['sound'] ?? false,
              onChanged: (value) => _updateGeneralSetting('sound', value),
              contentPadding: EdgeInsets.zero,
            ),
            const Divider(),
            SwitchListTile(
              title: Text('notification_settings.do_not_disturb'.tr()),
              subtitle: Text('notification_settings.do_not_disturb_description'.tr()),
              value: generalSettings['doNotDisturb'] ?? false,
              onChanged: (value) => _updateGeneralSetting('doNotDisturb', value),
              contentPadding: EdgeInsets.zero,
            ),
            const Divider(),
            // TODO: Notification frequency temporarily disabled
            // ListTile(
            //   title: const Text('Notification Frequency'),
            //   subtitle: Text(_getFrequencyLabel(generalSettings['frequency'] ?? 'immediate')),
            //   trailing: DropdownButton<String>(
            //     value: generalSettings['frequency'] ?? 'immediate',
            //     onChanged: (value) {
            //       if (value != null) {
            //         _updateGeneralSetting('frequency', value);
            //       }
            //     },
            //     items: const [
            //       DropdownMenuItem(value: 'immediate', child: Text('Immediate')),
            //       DropdownMenuItem(value: '5min', child: Text('5-minutes digest')),
            //       DropdownMenuItem(value: 'daily', child: Text('Daily digest')),
            //       DropdownMenuItem(value: 'weekly', child: Text('Weekly digest')),
            //     ],
            //   ),
            //   contentPadding: EdgeInsets.zero,
            // ),
            // const Divider(),
            SwitchListTile(
              title: Text('notification_settings.quiet_hours'.tr()),
              subtitle: Text(
                quietHours['enabled']
                    ? 'notification_settings.quiet_hours_range'.tr(args: [quietHours['startTime'], quietHours['endTime']])
                    : 'notification_settings.disabled'.tr(),
              ),
              value: quietHours['enabled'] ?? false,
              onChanged: (value) => _updateGeneralSetting('quietHours.enabled', value),
              contentPadding: EdgeInsets.zero,
            ),
            if (quietHours['enabled']) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'notification_settings.start_time'.tr(),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          OutlinedButton(
                            onPressed: () async {
                              final time = await showTimePicker(
                                context: context,
                                initialTime: TimeOfDay.now(),
                              );
                              if (time != null) {
                                _updateGeneralSetting(
                                  'quietHours.startTime',
                                  '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                                );
                              }
                            },
                            child: Text(quietHours['startTime']),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'notification_settings.end_time'.tr(),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          OutlinedButton(
                            onPressed: () async {
                              final time = await showTimePicker(
                                context: context,
                                initialTime: TimeOfDay.now(),
                              );
                              if (time != null) {
                                _updateGeneralSetting(
                                  'quietHours.endTime',
                                  '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                                );
                              }
                            },
                            child: Text(quietHours['endTime']),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String categoryId) {
    switch (categoryId) {
      case 'messages':
        return Icons.message;
      case 'tasks':
        return Icons.task_alt;
      case 'calendar':
        return Icons.calendar_today;
      case 'workspace':
        return Icons.work;
      default:
        return Icons.notifications;
    }
  }

  String _getFrequencyLabel(String frequency) {
    switch (frequency) {
      case 'immediate':
        return 'Immediate';
      case '5min':
        return '5-minutes digest';
      case 'daily':
        return 'Daily digest';
      case 'weekly':
        return 'Weekly digest';
      default:
        return frequency;
    }
  }
}
