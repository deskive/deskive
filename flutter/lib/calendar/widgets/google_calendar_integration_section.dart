import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../api/services/google_calendar_service.dart';
import '../../models/google_calendar_connection.dart';
import '../../models/google_calendar_info.dart';
import '../../services/workspace_service.dart';
import '../../theme/app_theme.dart';

/// Widget for managing Google Calendar sync settings in the App Integration section
class GoogleCalendarIntegrationSection extends StatefulWidget {
  final VoidCallback? onConnectionChanged;

  const GoogleCalendarIntegrationSection({
    super.key,
    this.onConnectionChanged,
  });

  @override
  State<GoogleCalendarIntegrationSection> createState() =>
      GoogleCalendarIntegrationSectionState();
}

class GoogleCalendarIntegrationSectionState
    extends State<GoogleCalendarIntegrationSection> {
  final GoogleCalendarService _service = GoogleCalendarService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  GoogleCalendarConnection? _connection;
  bool _isLoading = true;
  bool _isSyncing = false;
  bool _isRefreshing = false;
  bool _isSavingCalendars = false;
  bool _isDisconnecting = false;
  String? _error;

  // Selected calendar IDs for tracking changes
  Set<String> _selectedCalendarIds = {};
  bool _hasChanges = false;

  // Expansion state for calendar list
  bool _isCalendarListExpanded = true;

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
          // Initialize selected calendars from connection
          if (_connection != null) {
            _selectedCalendarIds = _connection!.selectedCalendarIds.toSet();
          }
          _hasChanges = false;
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

  Future<void> _refreshCalendars() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() {
      _isRefreshing = true;
      _error = null;
    });

    try {
      final response = await _service.refreshAvailableCalendars(workspaceId);

      if (mounted) {
        if (response.isSuccess && response.data != null) {
          setState(() {
            _connection = response.data;
            _selectedCalendarIds = _connection!.selectedCalendarIds.toSet();
            _hasChanges = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('google_calendar.calendars_refreshed'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          setState(() {
            _error = response.message ?? 'Failed to refresh calendars';
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
          _isRefreshing = false;
        });
      }
    }
  }

  Future<void> _saveSelectedCalendars() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    if (_selectedCalendarIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('google_calendar.at_least_one'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isSavingCalendars = true;
      _error = null;
    });

    try {
      final response = await _service.updateSelectedCalendars(
        workspaceId,
        _selectedCalendarIds.toList(),
      );

      if (mounted) {
        if (response.isSuccess && response.data != null) {
          setState(() {
            _connection = response.data;
            _hasChanges = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('google_calendar.calendars_updated'.tr()),
              backgroundColor: Colors.green,
            ),
          );
          // Trigger sync after saving calendars
          await _syncCalendar();
          widget.onConnectionChanged?.call();
        } else {
          setState(() {
            _error = response.message ?? 'Failed to update calendars';
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
          _isSavingCalendars = false;
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
            _selectedCalendarIds.clear();
            _hasChanges = false;
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

  void _toggleCalendarSelection(String calendarId) {
    setState(() {
      if (_selectedCalendarIds.contains(calendarId)) {
        _selectedCalendarIds.remove(calendarId);
      } else {
        _selectedCalendarIds.add(calendarId);
      }
      // Check if there are changes from the original selection
      final originalIds = _connection?.selectedCalendarIds.toSet() ?? {};
      _hasChanges = !_setEquals(_selectedCalendarIds, originalIds);
    });
  }

  bool _setEquals(Set<String> a, Set<String> b) {
    if (a.length != b.length) return false;
    return a.every((element) => b.contains(element));
  }

  void _navigateToAppsForConnect() {
    // Pop back to main app and navigate to Apps screen
    Navigator.of(context).popUntil((route) => route.isFirst);
    // The user should then navigate to Apps module manually
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('google_calendar.connect_from_apps'.tr()),
        backgroundColor: AppTheme.infoLight,
      ),
    );
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
          _buildHeader(textColor, subtitleColor, borderColor),

          // Content
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(24),
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

  Widget _buildHeader(Color textColor, Color subtitleColor, Color borderColor) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // Google Calendar Icon
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: borderColor),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Center(
              child: CustomPaint(
                size: const Size(28, 28),
                painter: _GoogleCalendarLogoPainter(),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'google_calendar.title'.tr(),
                  style: TextStyle(
                    color: textColor,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
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
                      Expanded(
                        child: Text(
                          _connection!.googleEmail,
                          style: TextStyle(
                            color: Colors.green[600],
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  )
                else
                  Text(
                    'google_calendar.not_connected'.tr(),
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
    );
  }

  Widget _buildConnectedState(
    Color textColor,
    Color subtitleColor,
    Color borderColor,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Divider
        Container(
          height: 1,
          color: borderColor,
        ),

        // Calendar Selection Section
        _buildCalendarSelectionSection(textColor, subtitleColor, borderColor),

        // Divider
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          height: 1,
          color: borderColor,
        ),

        // Sync Status Section
        _buildSyncStatusSection(textColor, subtitleColor),

        // Action Buttons
        _buildActionButtons(borderColor),
      ],
    );
  }

  Widget _buildCalendarSelectionSection(
    Color textColor,
    Color subtitleColor,
    Color borderColor,
  ) {
    final availableCalendars = _connection?.availableCalendars ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section header with expand/collapse
        InkWell(
          onTap: () {
            setState(() {
              _isCalendarListExpanded = !_isCalendarListExpanded;
            });
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  Icons.calendar_month,
                  size: 20,
                  color: textColor,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'google_calendar.select_calendars'.tr(),
                        style: TextStyle(
                          color: textColor,
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        '${_selectedCalendarIds.length} ${'google_calendar.of'.tr()} ${availableCalendars.length} ${'google_calendar.selected'.tr()}',
                        style: TextStyle(
                          color: subtitleColor,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _isCalendarListExpanded
                      ? Icons.expand_less
                      : Icons.expand_more,
                  color: subtitleColor,
                ),
              ],
            ),
          ),
        ),

        // Calendar list (expandable)
        if (_isCalendarListExpanded) ...[
          if (availableCalendars.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: subtitleColor, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'google_calendar.no_calendars'.tr(),
                        style: TextStyle(color: subtitleColor, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ...availableCalendars.map((calendar) => _buildCalendarTile(
                  calendar,
                  textColor,
                  subtitleColor,
                )),

          // Refresh calendars button
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Row(
              children: [
                // Refresh button
                TextButton.icon(
                  onPressed: _isRefreshing ? null : _refreshCalendars,
                  icon: _isRefreshing
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.infoLight,
                          ),
                        )
                      : Icon(Icons.refresh, size: 18, color: AppTheme.infoLight),
                  label: Text(
                    _isRefreshing
                        ? 'google_calendar.refreshing'.tr()
                        : 'google_calendar.refresh_calendars'.tr(),
                    style: TextStyle(color: AppTheme.infoLight, fontSize: 13),
                  ),
                ),
                const Spacer(),
                // Save & Sync button (only show if there are changes)
                if (_hasChanges)
                  ElevatedButton.icon(
                    onPressed: _isSavingCalendars ? null : _saveSelectedCalendars,
                    icon: _isSavingCalendars
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.save, size: 18),
                    label: Text('google_calendar.save_and_sync'.tr()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.infoLight,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCalendarTile(
    GoogleCalendarInfo calendar,
    Color textColor,
    Color subtitleColor,
  ) {
    final isSelected = _selectedCalendarIds.contains(calendar.id);
    final calendarColor = calendar.color != null
        ? _parseColor(calendar.color!)
        : Colors.blue;

    return InkWell(
      onTap: () => _toggleCalendarSelection(calendar.id),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            // Checkbox
            Checkbox(
              value: isSelected,
              onChanged: (_) => _toggleCalendarSelection(calendar.id),
              activeColor: AppTheme.infoLight,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            // Color indicator
            Container(
              width: 12,
              height: 12,
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: calendarColor,
                shape: BoxShape.circle,
              ),
            ),
            // Calendar name
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          calendar.name,
                          style: TextStyle(
                            color: textColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (calendar.primary) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.infoLight.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'google_calendar.primary'.tr(),
                            style: TextStyle(
                              color: AppTheme.infoLight,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (calendar.description != null &&
                      calendar.description!.isNotEmpty)
                    Text(
                      calendar.description!,
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncStatusSection(Color textColor, Color subtitleColor) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(Icons.sync, size: 18, color: subtitleColor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'google_calendar.last_synced'.tr(
                    args: [_connection?.lastSyncedAgo ?? 'Never'],
                  ),
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          // Auto-sync badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppTheme.infoLight.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.autorenew,
                  size: 14,
                  color: AppTheme.infoLight,
                ),
                const SizedBox(width: 4),
                Text(
                  'google_calendar.auto_sync'.tr(),
                  style: TextStyle(
                    color: AppTheme.infoLight,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(Color borderColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Row(
        children: [
          // Sync Now button
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
          // Disconnect button
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
            child: OutlinedButton.icon(
              onPressed: _navigateToAppsForConnect,
              icon: const Icon(Icons.open_in_new, size: 18),
              label: Text('google_calendar.connect_from_apps'.tr()),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: BorderSide(color: AppTheme.infoLight),
                foregroundColor: AppTheme.infoLight,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'google_calendar.connect_from_apps_hint'.tr(),
            style: TextStyle(
              color: subtitleColor,
              fontSize: 12,
              fontStyle: FontStyle.italic,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Color _parseColor(String colorString) {
    try {
      // Handle hex color format
      if (colorString.startsWith('#')) {
        final hex = colorString.replaceFirst('#', '');
        if (hex.length == 6) {
          return Color(int.parse('FF$hex', radix: 16));
        }
      }
      return Colors.blue;
    } catch (e) {
      return Colors.blue;
    }
  }

  /// Refresh connection status (can be called from parent)
  Future<void> refresh() => _loadConnection();
}

/// Custom painter for Google Calendar logo
class _GoogleCalendarLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;

    // Calendar base (light gray/white)
    paint.color = const Color(0xFFF1F3F4);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, size.height * 0.15, size.width, size.height * 0.85),
        const Radius.circular(2),
      ),
      paint,
    );

    // Top bar (blue header)
    paint.color = const Color(0xFF4285F4);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height * 0.25),
        const Radius.circular(2),
      ),
      paint,
    );

    // Calendar rings (simplified)
    paint.color = const Color(0xFF5F6368);
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = 2;

    // Left ring
    canvas.drawLine(
      Offset(size.width * 0.25, 0),
      Offset(size.width * 0.25, size.height * 0.15),
      paint,
    );

    // Right ring
    canvas.drawLine(
      Offset(size.width * 0.75, 0),
      Offset(size.width * 0.75, size.height * 0.15),
      paint,
    );

    // Grid lines
    paint.color = const Color(0xFFDADCE0);
    paint.strokeWidth = 1;

    // Horizontal lines
    for (int i = 1; i <= 3; i++) {
      final y = size.height * (0.3 + i * 0.175);
      canvas.drawLine(
        Offset(size.width * 0.1, y),
        Offset(size.width * 0.9, y),
        paint,
      );
    }

    // Vertical lines
    for (int i = 1; i <= 4; i++) {
      final x = size.width * (0.1 + i * 0.16);
      canvas.drawLine(
        Offset(x, size.height * 0.3),
        Offset(x, size.height * 0.85),
        paint,
      );
    }

    // Colored dot (event indicator)
    paint.style = PaintingStyle.fill;
    paint.color = const Color(0xFF34A853); // Google green
    canvas.drawCircle(
      Offset(size.width * 0.35, size.height * 0.55),
      size.width * 0.08,
      paint,
    );

    paint.color = const Color(0xFFEA4335); // Google red
    canvas.drawCircle(
      Offset(size.width * 0.65, size.height * 0.72),
      size.width * 0.08,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
