import 'package:flutter/material.dart';
import '../api/services/email_api_service.dart';

/// Email Settings Dialog matching frontend EmailSettingsDialog.tsx
/// Shows toggles for:
/// - Email Notifications: Receive notifications when new emails arrive
/// - Auto-Create Events: Automatically create calendar events from travel tickets,
///   appointments, and bookings
class EmailSettingsDialog extends StatefulWidget {
  final String workspaceId;
  final EmailConnection connection;

  const EmailSettingsDialog({
    super.key,
    required this.workspaceId,
    required this.connection,
  });

  /// Show the dialog and return true if settings were changed
  static Future<bool?> show(
    BuildContext context, {
    required String workspaceId,
    required EmailConnection connection,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => EmailSettingsDialog(
        workspaceId: workspaceId,
        connection: connection,
      ),
    );
  }

  @override
  State<EmailSettingsDialog> createState() => _EmailSettingsDialogState();
}

class _EmailSettingsDialogState extends State<EmailSettingsDialog> {
  final EmailApiService _emailService = EmailApiService();

  bool _isLoading = true;
  bool _isUpdating = false;
  String? _error;
  EmailConnectionSettings? _settings;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _emailService.getConnectionSettings(
        widget.workspaceId,
        widget.connection.id,
      );

      if (mounted) {
        if (response.isSuccess && response.data != null) {
          setState(() {
            _settings = response.data;
            _isLoading = false;
          });
        } else {
          setState(() {
            _error = response.message ?? 'Failed to load settings';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load settings: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleToggleNotifications(bool enabled) async {
    if (_isUpdating) return;

    setState(() => _isUpdating = true);

    try {
      final response = await _emailService.updateConnectionSettings(
        widget.workspaceId,
        widget.connection.id,
        UpdateEmailConnectionSettings(notificationsEnabled: enabled),
      );

      if (mounted) {
        if (response.isSuccess && response.data != null) {
          setState(() {
            _settings = response.data;
            _isUpdating = false;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                enabled
                    ? 'Notifications enabled. You will receive notifications for new emails.'
                    : 'Notifications disabled. You will no longer receive notifications for new emails.',
              ),
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else {
          setState(() => _isUpdating = false);
          _showErrorSnackBar('Failed to update notification settings');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUpdating = false);
        _showErrorSnackBar('Failed to update notification settings');
      }
    }
  }

  Future<void> _handleToggleAutoCreateEvents(bool enabled) async {
    if (_isUpdating) return;

    setState(() => _isUpdating = true);

    try {
      final response = await _emailService.updateConnectionSettings(
        widget.workspaceId,
        widget.connection.id,
        UpdateEmailConnectionSettings(autoCreateEvents: enabled),
      );

      if (mounted) {
        if (response.isSuccess && response.data != null) {
          setState(() {
            _settings = response.data;
            _isUpdating = false;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                enabled
                    ? 'Auto-create events enabled. Events will be automatically created from emails containing travel tickets, appointments, and bookings.'
                    : 'Auto-create events disabled. Automatic event creation from emails has been disabled.',
              ),
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else {
          setState(() => _isUpdating = false);
          _showErrorSnackBar('Failed to update auto-create events settings');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUpdating = false);
        _showErrorSnackBar('Failed to update auto-create events settings');
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Email Settings'),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Subtitle with email address
            Text(
              'Configure settings for ${widget.connection.emailAddress}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),

            // Content
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_error != null)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Icon(
                        Icons.error_outline,
                        color: Theme.of(context).colorScheme.error,
                        size: 48,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Failed to load settings',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _loadSettings,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              )
            else ...[
              // Email Notifications Toggle
              _buildSettingTile(
                icon: Icons.notifications_outlined,
                title: 'Email Notifications',
                description: 'Receive notifications when new emails arrive',
                value: _settings?.notificationsEnabled ?? false,
                onChanged: _isUpdating ? null : _handleToggleNotifications,
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              // Auto-Create Events Toggle
              _buildSettingTile(
                icon: Icons.event_available_outlined,
                title: 'Auto-Create Events',
                description:
                    'Automatically create calendar events from travel tickets, appointments, and bookings',
                value: _settings?.autoCreateEvents ?? false,
                onChanged: _isUpdating ? null : _handleToggleAutoCreateEvents,
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Close'),
        ),
      ],
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    required String description,
    required bool value,
    required void Function(bool)? onChanged,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Icon
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            size: 20,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        const SizedBox(width: 12),
        // Title and Description
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        // Switch
        Switch(
          value: value,
          onChanged: onChanged,
        ),
      ],
    );
  }
}
