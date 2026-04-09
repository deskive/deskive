import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../api/services/google_calendar_service.dart';
import '../../models/google_calendar_connection.dart';
import '../../services/workspace_service.dart';
import '../../theme/app_theme.dart';

/// Widget for connecting and managing Google Calendar integration
class GoogleCalendarConnectWidget extends StatefulWidget {
  final VoidCallback? onConnectionChanged;

  const GoogleCalendarConnectWidget({
    super.key,
    this.onConnectionChanged,
  });

  @override
  State<GoogleCalendarConnectWidget> createState() =>
      _GoogleCalendarConnectWidgetState();
}

class _GoogleCalendarConnectWidgetState
    extends State<GoogleCalendarConnectWidget> {
  final GoogleCalendarService _service = GoogleCalendarService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  GoogleCalendarConnection? _connection;
  bool _isLoading = true;
  bool _isSyncing = false;
  bool _isConnecting = false;
  bool _isDisconnecting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadConnection();
  }

  Future<void> _loadConnection() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _isLoading = false;
        _error = 'No workspace selected';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _service.getConnection(workspaceId);
      if (mounted) {
        setState(() {
          _connection = response.data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _connectGoogleCalendar() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() {
      _isConnecting = true;
      _error = null;
    });

    try {
      // Get the authorization URL with mobile deep link as return URL
      final response = await _service.getAuthUrl(
        workspaceId,
        returnUrl: 'deskive://calendar',
      );

      if (!response.isSuccess || response.data == null) {
        setState(() {
          _isConnecting = false;
          _error = response.message ?? 'Failed to get authorization URL';
        });
        return;
      }

      // Open the authorization URL in external browser
      final url = Uri.parse(response.data!);
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        setState(() {
          _error = 'Could not open authorization URL';
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isConnecting = false;
        });
      }
    }
  }

  Future<void> _syncCalendar() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() {
      _isSyncing = true;
      _error = null;
    });

    try {
      final response = await _service.syncCalendar(workspaceId);

      if (mounted) {
        if (response.isSuccess) {
          final result = response.data!;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'google_calendar.sync_complete'.tr(args: [
                  result.synced.toString(),
                  result.deleted.toString(),
                ]),
              ),
              backgroundColor: Colors.green,
            ),
          );
          // Reload connection to update last synced time
          await _loadConnection();
          widget.onConnectionChanged?.call();
        } else {
          setState(() {
            _error = response.message;
          });
        }
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
          _isSyncing = false;
        });
      }
    }
  }

  Future<void> _disconnectCalendar() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('google_calendar.disconnect_title'.tr()),
        content: Text('google_calendar.disconnect_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('google_calendar.disconnect'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isDisconnecting = true;
      _error = null;
    });

    try {
      final response = await _service.disconnect(workspaceId);

      if (mounted) {
        if (response.isSuccess) {
          setState(() {
            _connection = null;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('google_calendar.disconnected'.tr()),
              backgroundColor: Colors.orange,
            ),
          );
          widget.onConnectionChanged?.call();
        } else {
          setState(() {
            _error = response.message;
          });
        }
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
          _isDisconnecting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? const Color(0xFF161B22) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black87;
    final subtitleColor = isDark ? const Color(0xFF8B949E) : Colors.grey[600]!;
    final borderColor = isDark ? const Color(0xFF30363D) : Colors.grey[300]!;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
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
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: borderColor),
                  ),
                  child: Center(
                    child: Image.network(
                      'https://www.gstatic.com/images/branding/product/1x/calendar_48dp.png',
                      width: 24,
                      height: 24,
                      errorBuilder: (context, error, stackTrace) => Icon(
                        Icons.calendar_month,
                        color: Colors.blue[700],
                        size: 24,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'google_calendar.title'.tr(),
                        style: TextStyle(
                          color: textColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (_connection != null)
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Colors.green,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'google_calendar.connected'.tr(),
                              style: TextStyle(
                                color: Colors.green[600],
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Content
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_connection != null)
            _buildConnectedState(textColor, subtitleColor, borderColor)
          else
            _buildDisconnectedState(textColor, subtitleColor),

          // Error message
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildConnectedState(
    Color textColor,
    Color subtitleColor,
    Color borderColor,
  ) {
    return Column(
      children: [
        // Account info
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundImage: _connection!.googlePicture != null
                    ? NetworkImage(_connection!.googlePicture!)
                    : null,
                child: _connection!.googlePicture == null
                    ? Text(
                        _connection!.googleEmail[0].toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _connection!.googleName ?? _connection!.googleEmail,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      _connection!.googleEmail,
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Sync info
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Icon(Icons.sync, size: 16, color: subtitleColor),
              const SizedBox(width: 8),
              Text(
                'google_calendar.last_synced'.tr(
                  args: [_connection!.lastSyncedAgo],
                ),
                style: TextStyle(color: subtitleColor, fontSize: 13),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.infoLight.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'google_calendar.auto_sync'.tr(),
                  style: TextStyle(
                    color: AppTheme.infoLight,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Action buttons
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isSyncing ? null : _syncCalendar,
                  icon: _isSyncing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.sync, size: 18),
                  label: Text(
                    _isSyncing
                        ? 'google_calendar.syncing'.tr()
                        : 'google_calendar.sync_now'.tr(),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: _isDisconnecting ? null : _disconnectCalendar,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
                child: _isDisconnecting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.red,
                        ),
                      )
                    : Text('google_calendar.disconnect'.tr()),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDisconnectedState(Color textColor, Color subtitleColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'google_calendar.description'.tr(),
            style: TextStyle(color: subtitleColor, fontSize: 14),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isConnecting ? null : _connectGoogleCalendar,
              icon: _isConnecting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.add, size: 18),
              label: Text(
                _isConnecting
                    ? 'google_calendar.connecting'.tr()
                    : 'google_calendar.connect'.tr(),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.infoLight,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Refresh connection status (can be called from parent)
  Future<void> refresh() => _loadConnection();
}
