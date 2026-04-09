import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'dart:io';
import 'dart:convert';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:easy_localization/easy_localization.dart';
import '../models/calendar_event.dart';
import '../api/services/calendar_api_service.dart' as api;
import '../services/workspace_service.dart';
import '../theme/app_theme.dart';

class CalendarAnalyticsScreen extends StatefulWidget {
  final List<CalendarEvent> events;

  const CalendarAnalyticsScreen({
    super.key,
    required this.events,
  });

  @override
  State<CalendarAnalyticsScreen> createState() => _CalendarAnalyticsScreenState();
}

class _CalendarAnalyticsScreenState extends State<CalendarAnalyticsScreen> {
  late String _selectedPeriod;
  late String _selectedTab;

  // API Services
  final api.CalendarApiService _calendarApi = api.CalendarApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  // Data
  api.DashboardStats? _dashboardStats;
  bool _isLoading = false;
  String? _error;
  
  // Theme-aware color getters
  Color get backgroundColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF0F1419) 
      : Colors.grey[50]!;
      
  Color get surfaceColor => Theme.of(context).brightness == Brightness.dark 
      ? const Color(0xFF1A1F2A) 
      : Colors.white;
      
  Color get textColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.white 
      : Colors.black87;
      
  Color get subtitleColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[400]! 
      : Colors.grey[600]!;
      
  Color get borderColor => Theme.of(context).brightness == Brightness.dark 
      ? Colors.grey[800]! 
      : Colors.grey[300]!;
      
  Color get cardColor => Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF252B37)
      : Colors.grey[100]!;

  @override
  void initState() {
    super.initState();
    _selectedPeriod = 'calendar.today'.tr();
    _selectedTab = 'calendar.time_patterns'.tr();
    _loadDashboardStats();
  }

  Future<void> _loadDashboardStats() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      final period = _selectedPeriod == 'calendar.today'.tr() ? 'today'
          : _selectedPeriod == 'calendar.this_week'.tr() ? 'week'
          : _selectedPeriod == 'calendar.this_month'.tr() ? 'month'
          : _selectedPeriod == 'calendar.last_3_months'.tr() ? '3months'
          : 'year';

      final response = await _calendarApi.getDashboardStats(
        currentWorkspace.id,
        period: period,
      );

      if (response.isSuccess && response.data != null) {
        if (mounted) {
          setState(() {
            _dashboardStats = response.data;
            _isLoading = false;
          });
        }
      } else {
        throw Exception(response.message);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load dashboard stats: $e';
          _isLoading = false;
        });
      }
    }
  }

  String _translateSubtitle(String subtitle) {
    // Translate common API response strings
    final translations = {
      'Today': 'calendar.today'.tr(),
      'Yesterday': 'calendar.yesterday'.tr(),
      'This week': 'calendar.this_week'.tr(),
      'This month': 'calendar.this_month'.tr(),
      'Schedule is quite busy': 'calendar.schedule_quite_busy'.tr(),
      'Schedule is moderately busy': 'calendar.schedule_moderately_busy'.tr(),
      'Schedule is light': 'calendar.schedule_light'.tr(),
      'Schedule is free': 'calendar.schedule_free'.tr(),
    };

    // Check for exact match
    if (translations.containsKey(subtitle)) {
      return translations[subtitle]!;
    }

    // Handle patterns like "Across X work day(s)"
    final workDayMatch = RegExp(r'Across (\d+) work days?').firstMatch(subtitle);
    if (workDayMatch != null) {
      final days = workDayMatch.group(1);
      return 'calendar.across_work_days'.tr(args: [days!]);
    }

    // Handle patterns like "+X% vs yesterday"
    final vsYesterdayMatch = RegExp(r'([+-]?\d+)% vs yesterday').firstMatch(subtitle);
    if (vsYesterdayMatch != null) {
      final percentage = vsYesterdayMatch.group(1);
      return 'calendar.vs_yesterday'.tr(args: [percentage!]);
    }

    // Handle patterns like "+X% vs last week"
    final vsLastWeekMatch = RegExp(r'([+-]?\d+)% vs last week').firstMatch(subtitle);
    if (vsLastWeekMatch != null) {
      final percentage = vsLastWeekMatch.group(1);
      return 'calendar.vs_last_week'.tr(args: [percentage!]);
    }

    return subtitle;
  }

  Future<void> _handleExport(String format) async {
    try {
      // Request storage permission
      if (!await _requestStoragePermission()) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.storage_permission_required'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Show loading dialog
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            backgroundColor: surfaceColor,
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: AppTheme.infoLight),
                const SizedBox(height: 16),
                Text(
                  'calendar.exporting_analytics'.tr(),
                  style: TextStyle(color: textColor),
                ),
              ],
            ),
          ),
        );
      }

      final directory = await _getDownloadDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      String? filePath;

      switch (format) {
        case 'csv':
          filePath = await _exportAsCsv(directory, timestamp);
          break;
        case 'json':
          filePath = await _exportAsJson(directory, timestamp);
          break;
        case 'pdf':
          filePath = await _exportAsPdf(directory, timestamp);
          break;
      }

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (filePath != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.analytics_export_success'.tr(args: [directory.path])),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted) Navigator.pop(context);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('calendar.analytics_export_failed'.tr(args: ['$e'])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<String> _exportAsCsv(Directory directory, int timestamp) async {
    if (_dashboardStats == null) throw Exception('No data to export');

    final StringBuffer csv = StringBuffer();

    // Overview stats
    csv.writeln('Calendar Analytics Report');
    csv.writeln('Period,${_selectedPeriod}');
    csv.writeln('Generated,${DateTime.now().toIso8601String()}');
    csv.writeln('');

    // Overview section
    csv.writeln('OVERVIEW');
    csv.writeln('Metric,Value');
    csv.writeln('Total Events,${_dashboardStats!.overview.totalEvents}');
    csv.writeln('Total Event Time,${_dashboardStats!.overview.totalEventTime}h');
    csv.writeln('Time Utilization,${_dashboardStats!.overview.timeUtilization}%');
    csv.writeln('Unscheduled Time,${_dashboardStats!.overview.unscheduledTime}h');
    csv.writeln('');

    // Category stats
    csv.writeln('CATEGORY BREAKDOWN');
    csv.writeln('Category,Total Time (hours),Event Count,Percentage');
    for (final category in _dashboardStats!.categoryStats) {
      csv.writeln('${category.name},${category.totalTime},${category.eventCount},${category.percentage}%');
    }
    csv.writeln('');

    // Weekly activity
    csv.writeln('WEEKLY ACTIVITY');
    csv.writeln('Day,Hours,Events');
    final days = [
      'calendar.day_sunday'.tr(),
      'calendar.day_monday'.tr(),
      'calendar.day_tuesday'.tr(),
      'calendar.day_wednesday'.tr(),
      'calendar.day_thursday'.tr(),
      'calendar.day_friday'.tr(),
      'calendar.day_saturday'.tr()
    ];
    for (int i = 0; i < _dashboardStats!.weeklyActivity.length; i++) {
      final activity = _dashboardStats!.weeklyActivity[i];
      csv.writeln('${days[i]},${activity.hours},${activity.events}');
    }
    csv.writeln('');

    // Priority stats
    csv.writeln('PRIORITY DISTRIBUTION');
    csv.writeln('Priority,Event Count');
    for (final priority in _dashboardStats!.priorityStats) {
      csv.writeln('${priority.priority},${priority.eventCount}');
    }

    final filePath = '${directory.path}/calendar_analytics_$timestamp.csv';
    final file = File(filePath);
    await file.writeAsString(csv.toString());
    return filePath;
  }

  Future<String> _exportAsJson(Directory directory, int timestamp) async {
    if (_dashboardStats == null) throw Exception('No data to export');

    final data = {
      'report': {
        'title': 'Calendar Analytics Report',
        'period': _selectedPeriod,
        'generated_at': DateTime.now().toIso8601String(),
      },
      'overview': {
        'total_events': _dashboardStats!.overview.totalEvents,
        'total_event_time_hours': _dashboardStats!.overview.totalEventTime,
        'time_utilization_percentage': _dashboardStats!.overview.timeUtilization,
        'unscheduled_time_hours': _dashboardStats!.overview.unscheduledTime,
        'time_range': _dashboardStats!.overview.timeRange,
      },
      'category_stats': _dashboardStats!.categoryStats.map((cat) => {
        'name': cat.name,
        'total_time_hours': cat.totalTime,
        'event_count': cat.eventCount,
        'percentage': cat.percentage,
        'color': cat.color,
      }).toList(),
      'weekly_activity': _dashboardStats!.weeklyActivity.map((activity) => {
        'day': activity.day,
        'hours': activity.hours,
        'events': activity.events,
      }).toList(),
      'hourly_distribution': _dashboardStats!.hourlyDistribution.map((dist) => {
        'hour': dist.hour,
        'event_count': dist.eventCount,
      }).toList(),
      'priority_stats': _dashboardStats!.priorityStats.map((priority) => {
        'priority': priority.priority,
        'event_count': priority.eventCount,
        'color': priority.color,
      }).toList(),
    };

    final jsonString = const JsonEncoder.withIndent('  ').convert(data);
    final filePath = '${directory.path}/calendar_analytics_$timestamp.json';
    final file = File(filePath);
    await file.writeAsString(jsonString);
    return filePath;
  }

  Future<String> _exportAsPdf(Directory directory, int timestamp) async {
    if (_dashboardStats == null) throw Exception('No data to export');

    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            // Header
            pw.Header(
              level: 0,
              child: pw.Text(
                'Calendar Analytics Report',
                style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text('Period: $_selectedPeriod', style: const pw.TextStyle(fontSize: 12)),
            pw.Text('Generated: ${DateTime.now().toString()}', style: const pw.TextStyle(fontSize: 12)),
            pw.SizedBox(height: 20),

            // Overview
            pw.Header(level: 1, child: pw.Text('Overview')),
            pw.SizedBox(height: 10),
            pw.Table.fromTextArray(
              headers: ['Metric', 'Value'],
              data: [
                ['Total Events', '${_dashboardStats!.overview.totalEvents}'],
                ['Total Event Time', '${_dashboardStats!.overview.totalEventTime}h'],
                ['Time Utilization', '${_dashboardStats!.overview.timeUtilization}%'],
                ['Unscheduled Time', '${_dashboardStats!.overview.unscheduledTime}h'],
              ],
              border: pw.TableBorder.all(),
              cellAlignment: pw.Alignment.centerLeft,
            ),
            pw.SizedBox(height: 20),

            // Category Breakdown
            pw.Header(level: 1, child: pw.Text('Category Breakdown')),
            pw.SizedBox(height: 10),
            pw.Table.fromTextArray(
              headers: ['Category', 'Time (hrs)', 'Events', 'Percentage'],
              data: _dashboardStats!.categoryStats.map((cat) => [
                cat.name,
                '${cat.totalTime}',
                '${cat.eventCount}',
                '${cat.percentage}%',
              ]).toList(),
              border: pw.TableBorder.all(),
              cellAlignment: pw.Alignment.centerLeft,
            ),
            pw.SizedBox(height: 20),

            // Weekly Activity
            pw.Header(level: 1, child: pw.Text('Weekly Activity')),
            pw.SizedBox(height: 10),
            pw.Table.fromTextArray(
              headers: ['Day', 'Hours', 'Events'],
              data: _dashboardStats!.weeklyActivity.map((activity) => [
                activity.day,
                '${activity.hours}',
                '${activity.events}',
              ]).toList(),
              border: pw.TableBorder.all(),
              cellAlignment: pw.Alignment.centerLeft,
            ),
            pw.SizedBox(height: 20),

            // Priority Distribution
            pw.Header(level: 1, child: pw.Text('Priority Distribution')),
            pw.SizedBox(height: 10),
            pw.Table.fromTextArray(
              headers: ['Priority', 'Event Count'],
              data: _dashboardStats!.priorityStats.map((priority) => [
                priority.priority,
                '${priority.eventCount}',
              ]).toList(),
              border: pw.TableBorder.all(),
              cellAlignment: pw.Alignment.centerLeft,
            ),
          ];
        },
      ),
    );

    final filePath = '${directory.path}/calendar_analytics_$timestamp.pdf';
    final file = File(filePath);
    await file.writeAsBytes(await pdf.save());
    return filePath;
  }

  Future<bool> _requestStoragePermission() async {
    if (Platform.isAndroid) {
      final androidInfo = await DeviceInfoPlugin().androidInfo;
      if (androidInfo.version.sdkInt >= 33) {
        return true;
      } else if (androidInfo.version.sdkInt >= 30) {
        if (await Permission.manageExternalStorage.isGranted) {
          return true;
        }
        final status = await Permission.manageExternalStorage.request();
        return status.isGranted;
      } else {
        if (await Permission.storage.isGranted) {
          return true;
        }
        final status = await Permission.storage.request();
        return status.isGranted;
      }
    }
    return true;
  }

  Future<Directory> _getDownloadDirectory() async {
    if (Platform.isAndroid) {
      try {
        final directory = Directory('/storage/emulated/0/Download/CalendarExports');
        if (!await directory.exists()) {
          await directory.create(recursive: true);
        }
        return directory;
      } catch (e) {
        return await getApplicationDocumentsDirectory();
      }
    } else {
      return await getApplicationDocumentsDirectory();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeader(),
            _buildStatsCards(),
            _buildTabBar(),
            _buildTabContent(),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return PreferredSize(
      preferredSize: const Size.fromHeight(kToolbarHeight),
      child: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: textColor),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'calendar.calendar_analytics'.tr(),
              style: TextStyle(color: textColor, fontSize: 18, fontWeight: FontWeight.w600),
            ),
            Text(
              'calendar.analytics_subtitle'.tr(),
              style: TextStyle(color: subtitleColor, fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: borderColor),
        ),
      ),
      child: SizedBox(
        height: 36,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
                  // Period selector
                  Container(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.infoLight.withValues(alpha: 0.1),
                      border: Border.all(color: AppTheme.infoLight.withValues(alpha: 0.3)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedPeriod,
                        icon: Icon(Icons.arrow_drop_down, color: AppTheme.infoLight, size: 20),
                        items: [
                          'calendar.today'.tr(),
                          'calendar.this_week'.tr(),
                          'calendar.this_month'.tr(),
                          'calendar.last_3_months'.tr(),
                          'calendar.this_year'.tr()
                        ]
                            .map((period) => DropdownMenuItem(
                                  value: period,
                                  child: Text(
                                    period,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      color: AppTheme.infoLight,
                                    ),
                                  ),
                                ))
                            .toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedPeriod = value!;
                          });
                          _loadDashboardStats();
                        },
                        style: TextStyle(color: AppTheme.infoLight, fontSize: 13),
                        dropdownColor: surfaceColor,
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Refresh button
                  InkWell(
                    onTap: () {
                      _loadDashboardStats();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('calendar.analytics_refreshed'.tr()),
                          duration: Duration(seconds: 2),
                          backgroundColor: AppTheme.infoLight,
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      height: 36,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: borderColor),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.refresh, color: textColor, size: 18),
                          const SizedBox(width: 6),
                          Text(
                            'calendar.refresh'.tr(),
                            style: TextStyle(
                              color: textColor,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Export button
                  Container(
                    height: 36,
                    decoration: BoxDecoration(
                      border: Border.all(color: borderColor),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: PopupMenuButton<String>(
                      onSelected: _handleExport,
                      offset: const Offset(0, 36),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        height: 36,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.file_download, color: textColor, size: 18),
                            const SizedBox(width: 6),
                            Text(
                              'calendar.export'.tr(),
                              style: TextStyle(
                                color: textColor,
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(Icons.arrow_drop_down, color: textColor, size: 18),
                          ],
                        ),
                      ),
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          value: 'csv',
                          child: Row(
                            children: [
                              Icon(Icons.table_chart, color: textColor, size: 18),
                              const SizedBox(width: 8),
                              Text('calendar.export_csv'.tr(), style: TextStyle(color: textColor, fontSize: 13)),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'json',
                          child: Row(
                            children: [
                              Icon(Icons.code, color: textColor, size: 18),
                              const SizedBox(width: 8),
                              Text('calendar.export_json'.tr(), style: TextStyle(color: textColor, fontSize: 13)),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'pdf',
                          child: Row(
                            children: [
                              Icon(Icons.picture_as_pdf, color: textColor, size: 18),
                              const SizedBox(width: 8),
                              Text('calendar.export_pdf'.tr(), style: TextStyle(color: textColor, fontSize: 13)),
                            ],
                          ),
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

  Widget _buildStatsCards() {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: CircularProgressIndicator(color: AppTheme.infoLight),
        ),
      );
    }

    if (_error != null || _dashboardStats == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Text(
            _error ?? 'No data available',
            style: TextStyle(color: subtitleColor),
          ),
        ),
      );
    }

    final overview = _dashboardStats!.overview;

    return Container(
      padding: const EdgeInsets.all(16),
      child: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < 800) {
            // For smaller screens, use a wrap layout
            return Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                SizedBox(
                  width: (constraints.maxWidth - 16) / 2 - 8,
                  child: _buildStatCard(
                    'calendar.total_events'.tr(),
                    '${overview.totalEvents}',
                    _translateSubtitle(overview.period),
                    Icons.calendar_today,
                    Colors.blue,
                  ),
                ),
                SizedBox(
                  width: (constraints.maxWidth - 16) / 2 - 8,
                  child: _buildStatCard(
                    'calendar.total_event_time'.tr(),
                    '${overview.totalEventTime}h',
                    _translateSubtitle(overview.timeRange),
                    Icons.schedule,
                    Colors.orange,
                  ),
                ),
                SizedBox(
                  width: (constraints.maxWidth - 16) / 2 - 8,
                  child: _buildStatCard(
                    'calendar.time_utilization'.tr(),
                    '${overview.timeUtilization}%',
                    _translateSubtitle(overview.utilizationComparison),
                    Icons.trending_up,
                    Colors.green,
                  ),
                ),
                SizedBox(
                  width: (constraints.maxWidth - 16) / 2 - 8,
                  child: _buildStatCard(
                    'calendar.unscheduled_time'.tr(),
                    '${overview.unscheduledTime}h',
                    _translateSubtitle(overview.availabilityNote),
                    Icons.adjust,
                    Colors.purple,
                  ),
                ),
              ],
            );
          } else {
            // For larger screens, use row layout
            return Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    'calendar.total_events'.tr(),
                    '${overview.totalEvents}',
                    _translateSubtitle(overview.period),
                    Icons.calendar_today,
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatCard(
                    'calendar.total_event_time'.tr(),
                    '${overview.totalEventTime}h',
                    _translateSubtitle(overview.timeRange),
                    Icons.schedule,
                    Colors.orange,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatCard(
                    'calendar.time_utilization'.tr(),
                    '${overview.timeUtilization}%',
                    _translateSubtitle(overview.utilizationComparison),
                    Icons.trending_up,
                    Colors.green,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatCard(
                    'calendar.unscheduled_time'.tr(),
                    '${overview.unscheduledTime}h',
                    _translateSubtitle(overview.availabilityNote),
                    Icons.adjust,
                    Colors.purple,
                  ),
                ),
              ],
            );
          }
        },
      ),
    );
  }

  Widget _buildStatCard(String title, String value, String subtitle, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Flexible(
                child: Text(
                  title,
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(
                icon,
                color: subtitleColor.withValues(alpha: 0.6),
                size: 28,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            value,
            style: TextStyle(
              color: textColor,
              fontSize: 36,
              fontWeight: FontWeight.bold,
              height: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(
              color: subtitleColor,
              fontSize: 13,
              fontWeight: FontWeight.w400,
            ),
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: borderColor),
        ),
      ),
      child: Row(
        children: [
          _buildTab('calendar.time_patterns'.tr(), _selectedTab == 'calendar.time_patterns'.tr()),
          const SizedBox(width: 24),
          _buildTab('calendar.categories'.tr(), _selectedTab == 'calendar.categories'.tr()),
          const SizedBox(width: 24),
          _buildTab('calendar.insights'.tr(), _selectedTab == 'calendar.insights'.tr()),
        ],
      ),
    );
  }

  Widget _buildTab(String title, bool isSelected) {
    return InkWell(
      onTap: () {
        setState(() {
          _selectedTab = title;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? context.primaryColor : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          title,
          style: TextStyle(
            color: isSelected ? context.primaryColor : subtitleColor,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent() {
    final timePatterns = 'calendar.time_patterns'.tr();
    final categories = 'calendar.categories'.tr();
    final insights = 'calendar.insights'.tr();

    switch (_selectedTab) {
      case String _ when _selectedTab == timePatterns:
        return _buildTimePatternsTab();
      case String _ when _selectedTab == categories:
        return _buildCategoriesTab();
      case String _ when _selectedTab == insights:
        return _buildInsightsTab();
      default:
        return _buildTimePatternsTab();
    }
  }

  Widget _buildTimePatternsTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Weekly Activity Chart
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor.withValues(alpha: 0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'calendar.weekly_activity'.tr(),
                  style: TextStyle(
                    color: textColor,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  height: 240,
                  constraints: const BoxConstraints(minHeight: 240),
                  child: Builder(
                    builder: (context) {
                      // Calculate max value from weekly activity
                      double maxHours = 0;
                      double maxEvents = 0;
                      if (_dashboardStats != null) {
                        for (var activity in _dashboardStats!.weeklyActivity) {
                          if (activity.hours > maxHours) {
                            maxHours = activity.hours.toDouble();
                          }
                          if (activity.events > maxEvents) {
                            maxEvents = activity.events.toDouble();
                          }
                        }
                      }
                      // Set maxY as highest value + 5
                      final maxValue = maxHours > maxEvents ? maxHours : maxEvents;
                      final double maxY = maxValue > 0 ? (maxValue + 5).toDouble() : 10.0;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Legend
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _buildSimpleLegendItem('calendar.hours'.tr(), AppTheme.infoLight),
                              const SizedBox(width: 24),
                              _buildSimpleLegendItem('calendar.events'.tr(), AppTheme.successLight),
                            ],
                          ),
                          const SizedBox(height: 16),
                          // Chart
                          SizedBox(
                            height: 170,
                            child: BarChart(
                              BarChartData(
                                alignment: BarChartAlignment.spaceAround,
                                maxY: maxY,
                                minY: 0,
                                barTouchData: BarTouchData(enabled: false),
                                titlesData: FlTitlesData(
                                  show: true,
                                  bottomTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      getTitlesWidget: (value, meta) {
                                        final days = [
                                          'calendar.day_sun'.tr(),
                                          'calendar.day_mon'.tr(),
                                          'calendar.day_tue'.tr(),
                                          'calendar.day_wed'.tr(),
                                          'calendar.day_thu'.tr(),
                                          'calendar.day_fri'.tr(),
                                          'calendar.day_sat'.tr(),
                                        ];
                                        if (value.toInt() >= 0 && value.toInt() < days.length) {
                                          return Padding(
                                            padding: const EdgeInsets.only(top: 8.0),
                                            child: Text(
                                              days[value.toInt()],
                                              style: TextStyle(
                                                color: subtitleColor,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          );
                                        }
                                        return const SizedBox();
                                      },
                                    ),
                                  ),
                                  leftTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      reservedSize: 40,
                                      getTitlesWidget: (value, meta) {
                                        if (value % 1 == 0) {
                                          return Text(
                                            '${value.toInt()}',
                                            style: TextStyle(
                                              color: subtitleColor,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w400,
                                            ),
                                          );
                                        }
                                        return const SizedBox();
                                      },
                                    ),
                                  ),
                                  topTitles: const AxisTitles(
                                    sideTitles: SideTitles(showTitles: false),
                                  ),
                                  rightTitles: const AxisTitles(
                                    sideTitles: SideTitles(showTitles: false),
                                  ),
                                ),
                                borderData: FlBorderData(show: false),
                                barGroups: _dashboardStats != null
                                    ? _dashboardStats!.weeklyActivity.asMap().entries.map((entry) {
                                        final index = entry.key;
                                        final activity = entry.value;
                                        return BarChartGroupData(
                                          x: index,
                                          groupVertically: false,
                                          barRods: [
                                            // Hours bar
                                            BarChartRodData(
                                              toY: activity.hours.toDouble(),
                                              color: activity.hours > 0
                                                  ? AppTheme.infoLight
                                                  : Colors.grey.shade300,
                                              width: 12,
                                              borderRadius: const BorderRadius.only(
                                                topLeft: Radius.circular(3),
                                                topRight: Radius.circular(3),
                                              ),
                                            ),
                                            // Events bar
                                            BarChartRodData(
                                              toY: activity.events.toDouble(),
                                              color: activity.events > 0
                                                  ? AppTheme.successLight
                                                  : Colors.grey.shade300,
                                              width: 12,
                                              borderRadius: const BorderRadius.only(
                                                topLeft: Radius.circular(3),
                                                topRight: Radius.circular(3),
                                              ),
                                            ),
                                          ],
                                        );
                                      }).toList()
                                    : [],
                                gridData: FlGridData(
                                  show: true,
                                  drawVerticalLine: false,
                                  getDrawingHorizontalLine: (value) {
                                    return FlLine(
                                      color: borderColor.withValues(alpha: 0.3),
                                      strokeWidth: 1,
                                      dashArray: [5, 5],
                                    );
                                  },
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Hourly Distribution Chart
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor.withValues(alpha: 0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'calendar.hourly_distribution'.tr(),
                  style: TextStyle(
                    color: textColor,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  height: 200,
                  constraints: const BoxConstraints(minHeight: 200),
                  child: Builder(
                    builder: (context) {
                      // Calculate max event count
                      double maxEventCount = 0;
                      if (_dashboardStats != null) {
                        for (var dist in _dashboardStats!.hourlyDistribution) {
                          if (dist.eventCount > maxEventCount) {
                            maxEventCount = dist.eventCount.toDouble();
                          }
                        }
                      }
                      // Use percentage scale (0-100) or event count scale, whichever is larger
                      final double maxY = maxEventCount > 10 ? (maxEventCount + 2).toDouble() : 10.0;

                      return LineChart(
                        LineChartData(
                          minX: 0,
                          maxX: 23,
                          minY: 0,
                          maxY: maxY,
                          titlesData: FlTitlesData(
                            show: true,
                            bottomTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                interval: 2,
                                getTitlesWidget: (value, meta) {
                                  return Text(
                                    '${value.toInt().toString().padLeft(2, '0')}:00',
                                    style: TextStyle(color: subtitleColor, fontSize: 10),
                                  );
                                },
                              ),
                            ),
                            leftTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 35,
                                getTitlesWidget: (value, meta) {
                                  final intValue = value.toInt();
                                  if (intValue == 0 || intValue == 2 || intValue == 4 ||
                                      intValue == 6 || intValue == 8 || intValue == 10) {
                                    return Text(
                                      intValue.toString(),
                                      style: TextStyle(color: subtitleColor, fontSize: 11),
                                    );
                                  }
                                  return const SizedBox();
                                },
                              ),
                            ),
                            topTitles: const AxisTitles(
                              sideTitles: SideTitles(showTitles: false),
                            ),
                            rightTitles: const AxisTitles(
                              sideTitles: SideTitles(showTitles: false),
                            ),
                          ),
                          borderData: FlBorderData(show: false),
                          gridData: FlGridData(
                            show: true,
                            drawVerticalLine: false,
                            getDrawingHorizontalLine: (value) {
                              return FlLine(
                                color: borderColor.withValues(alpha: 0.3),
                                strokeWidth: 1,
                                dashArray: [5, 5],
                              );
                            },
                          ),
                          lineBarsData: [
                            // Single hours distribution curve
                            LineChartBarData(
                              spots: _dashboardStats != null
                                  ? _dashboardStats!.hourlyDistribution
                                      .map((dist) => FlSpot(
                                            dist.hour.toDouble(),
                                            dist.eventCount.toDouble(),
                                          ))
                                      .toList()
                                  : [],
                              isCurved: true,
                              color: AppTheme.infoLight,
                              barWidth: 3,
                              isStrokeCapRound: true,
                              dotData: FlDotData(
                                show: true,
                                getDotPainter: (spot, percent, barData, index) {
                                  return FlDotCirclePainter(
                                    radius: 3,
                                    color: AppTheme.infoLight,
                                    strokeWidth: 0,
                                  );
                                },
                              ),
                              belowBarData: BarAreaData(
                                show: true,
                                color: AppTheme.infoLight.withValues(alpha: 0.1),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoriesTab() {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: CircularProgressIndicator(color: AppTheme.infoLight),
        ),
      );
    }

    if (_error != null || _dashboardStats == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Text(
            _error ?? 'No data available',
            style: TextStyle(color: subtitleColor),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Time by Category and Priority Distribution (First)
          LayoutBuilder(
            builder: (context, constraints) {
              // Use column layout for narrow screens
              if (constraints.maxWidth < 900) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTimeByCategorySection(),
                    const SizedBox(height: 24),
                    _buildPriorityDistributionSection(),
                  ],
                );
              }

              // Use row layout for wider screens
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _buildTimeByCategorySection(),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: _buildPriorityDistributionSection(),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          // Category Breakdown Section (Last)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor.withValues(alpha: 0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'calendar.category_breakdown'.tr(),
                  style: TextStyle(
                    color: textColor,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 32),
                ..._dashboardStats!.categoryStats.map((category) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 32),
                    child: _buildCategoryItem(
                      category.name,
                      category.totalTime,
                      category.eventCount,
                      _getCategoryColor(category.color),
                    ),
                  );
                }).toList(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryItem(String categoryName, int totalHours, int events, Color color) {
    // totalHours is already in hours from the API
    final int displayHours = totalHours;
    final int displayMinutes = 0; // API provides hours only

    return Row(
      children: [
        // Color indicator
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 16),
        // Category name
        Expanded(
          child: Text(
            categoryName,
            style: TextStyle(
              color: textColor,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        // Time and events info
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${displayHours}h ${displayMinutes}m',
              style: TextStyle(
                color: textColor,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'calendar.events_count'.tr(args: ['$events']),
              style: TextStyle(
                color: subtitleColor,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Color _getCategoryColor(String colorString) {
    // Parse color string (e.g., "#2196F3" or "blue")
    if (colorString.startsWith('#')) {
      return Color(int.parse(colorString.substring(1), radix: 16) + 0xFF000000);
    }

    // Default colors for common color names
    switch (colorString.toLowerCase()) {
      case 'red':
        return const Color(0xFFEF5350);
      case 'orange':
        return AppTheme.warningLight;
      case 'yellow':
        return const Color(0xFFFFC107);
      case 'blue':
        return AppTheme.infoLight;
      case 'green':
        return AppTheme.successLight;
      case 'purple':
        return AppTheme.infoLight;
      case 'pink':
        return const Color(0xFFE91E63);
      case 'teal':
        return const Color(0xFF009688);
      default:
        return AppTheme.infoLight; // Default to blue
    }
  }

  Widget _buildTimeByCategorySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'calendar.time_by_category'.tr(),
          style: TextStyle(
            color: textColor,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 24),
        Container(
          height: 300,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor.withValues(alpha: 0.5)),
          ),
          child: _dashboardStats != null && _dashboardStats!.categoryStats.isNotEmpty
              ? PieChart(
                  PieChartData(
                    sectionsSpace: 2,
                    centerSpaceRadius: 50,
                    sections: _dashboardStats!.categoryStats.map((category) {
                      return PieChartSectionData(
                        color: _getCategoryColor(category.color),
                        value: category.percentage.toDouble(),
                        title: '${category.percentage}%',
                        radius: 80,
                        titleStyle: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      );
                    }).toList(),
                  ),
                )
              : Center(
                  child: Text(
                    'calendar.no_category_data'.tr(),
                    style: TextStyle(color: subtitleColor),
                  ),
                ),
        ),
        const SizedBox(height: 20),
        // Legend
        if (_dashboardStats != null && _dashboardStats!.categoryStats.isNotEmpty)
          Wrap(
            spacing: 20,
            runSpacing: 12,
            children: _dashboardStats!.categoryStats.map((category) {
              // totalTime is already in hours from the API
              final hours = category.totalTime;
              final minutes = 0; // API provides hours only
              return _buildLegendItem(
                category.name,
                _getCategoryColor(category.color),
                '${hours}h ${minutes}m',
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildPriorityDistributionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'calendar.priority_distribution'.tr(),
          style: TextStyle(
            color: textColor,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 24),
        Container(
          height: 300,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor.withValues(alpha: 0.5)),
          ),
          child: _dashboardStats != null && _dashboardStats!.priorityStats.isNotEmpty
              ? BarChart(
                  BarChartData(
                    alignment: BarChartAlignment.spaceAround,
                    maxY: _dashboardStats!.priorityStats
                        .map((p) => p.eventCount.toDouble())
                        .reduce((a, b) => a > b ? a : b) + 2,
                    barTouchData: BarTouchData(enabled: false),
                    titlesData: FlTitlesData(
                      show: true,
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (value, meta) {
                            final index = value.toInt();
                            if (index >= 0 && index < _dashboardStats!.priorityStats.length) {
                              final priority = _dashboardStats!.priorityStats[index].priority;
                              return Padding(
                                padding: const EdgeInsets.only(top: 8.0),
                                child: Text(
                                  priority[0].toUpperCase() + priority.substring(1),
                                  style: TextStyle(
                                    color: subtitleColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              );
                            }
                            return const SizedBox();
                          },
                        ),
                      ),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 30,
                          getTitlesWidget: (value, meta) {
                            if (value % 1 == 0) {
                              return Text(
                                value.toInt().toString(),
                                style: TextStyle(color: subtitleColor, fontSize: 11),
                              );
                            }
                            return const SizedBox();
                          },
                        ),
                      ),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    ),
                    borderData: FlBorderData(show: false),
                    barGroups: _dashboardStats!.priorityStats.asMap().entries.map((entry) {
                      return BarChartGroupData(
                        x: entry.key,
                        barRods: [
                          BarChartRodData(
                            toY: entry.value.eventCount.toDouble(),
                            color: _getCategoryColor(entry.value.color),
                            width: 40,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(6),
                              topRight: Radius.circular(6),
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      getDrawingHorizontalLine: (value) {
                        return FlLine(
                          color: borderColor.withValues(alpha: 0.3),
                          strokeWidth: 1,
                          dashArray: [5, 5],
                        );
                      },
                    ),
                  ),
                )
              : Center(
                  child: Text(
                    'calendar.no_priority_data'.tr(),
                    style: TextStyle(color: subtitleColor),
                  ),
                ),
        ),
        const SizedBox(height: 20),
        // Priority Statistics
        if (_dashboardStats != null && _dashboardStats!.priorityStats.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardColor.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: _dashboardStats!.priorityStats.asMap().entries.map((entry) {
                final priority = entry.value;
                final isLast = entry.key == _dashboardStats!.priorityStats.length - 1;
                return Column(
                  children: [
                    _buildPriorityStatRow(
                      'calendar.priority_label'.tr(args: [priority.priority[0].toUpperCase() + priority.priority.substring(1)]),
                      'calendar.events_count'.tr(args: ['${priority.eventCount}']),
                      _getCategoryColor(priority.color),
                    ),
                    if (!isLast) const SizedBox(height: 12),
                  ],
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildSimpleLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: textColor,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem(String label, Color color, String value) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            color: textColor,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          value,
          style: TextStyle(
            color: subtitleColor,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildPriorityStatRow(String label, String value, Color indicatorColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: indicatorColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: textColor,
                fontSize: 14,
              ),
            ),
          ],
        ),
        Text(
          value,
          style: TextStyle(
            color: subtitleColor,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildInsightsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: LayoutBuilder(
        builder: (context, constraints) {
          // Use column layout for narrow screens
          if (constraints.maxWidth < 900) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // AI Insights Section
                _buildAIInsightsSection(),
                const SizedBox(height: 32),
                // Recommendations Section
                _buildRecommendationsSection(),
              ],
            );
          }
          
          // Use row layout for wider screens
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // AI Insights Section
              Expanded(
                flex: 5,
                child: _buildAIInsightsSection(),
              ),
              const SizedBox(width: 24),
              // Recommendations Section
              Expanded(
                flex: 4,
                child: _buildRecommendationsSection(),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildAIInsightsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'calendar.ai_insights'.tr(),
          style: TextStyle(
            color: textColor,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        _buildInsightCard(
          icon: Icons.trending_up,
          iconColor: AppTheme.infoLight,
          title: 'calendar.productivity_tip'.tr(),
          content: 'calendar.productivity_tip_content'.tr(),
          backgroundColor: const Color(0xFFE3F2FD),
          textColor: const Color(0xFF1976D2),
        ),
        const SizedBox(height: 16),
        _buildInsightCard(
          icon: Icons.calendar_today,
          iconColor: AppTheme.warningLight,
          title: 'calendar.schedule_optimization'.tr(),
          content: 'calendar.schedule_optimization_content'.tr(),
          backgroundColor: const Color(0xFFFFF3E0),
          textColor: const Color(0xFFF57C00),
        ),
        const SizedBox(height: 16),
        _buildInsightCard(
          icon: Icons.check_circle,
          iconColor: AppTheme.successLight,
          title: 'calendar.goal_progress'.tr(),
          content: 'calendar.goal_progress_content'.tr(),
          backgroundColor: const Color(0xFFE8F5E9),
          textColor: const Color(0xFF388E3C),
        ),
      ],
    );
  }

  Widget _buildRecommendationsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'calendar.recommendations'.tr(),
          style: TextStyle(
            color: textColor,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        _buildRecommendation(
          title: 'calendar.block_focus_time'.tr(),
          subtitle: 'calendar.block_focus_time_desc'.tr(),
          dotColor: AppTheme.infoLight,
        ),
        const SizedBox(height: 16),
        _buildRecommendation(
          title: 'calendar.consolidate_meetings'.tr(),
          subtitle: 'calendar.consolidate_meetings_desc'.tr(),
          dotColor: AppTheme.warningLight,
        ),
        const SizedBox(height: 16),
        _buildRecommendation(
          title: 'calendar.meeting_free_fridays'.tr(),
          subtitle: 'calendar.meeting_free_fridays_desc'.tr(),
          dotColor: AppTheme.successLight,
        ),
      ],
    );
  }

  Widget _buildInsightCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String content,
    required Color backgroundColor,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark 
            ? backgroundColor.withValues(alpha: 0.1)
            : backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).brightness == Brightness.dark 
              ? backgroundColor.withValues(alpha: 0.2)
              : backgroundColor.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 24),
              const SizedBox(width: 12),
              Text(
                title,
                style: TextStyle(
                  color: Theme.of(context).brightness == Brightness.dark 
                      ? textColor
                      : textColor.withValues(alpha: 0.9),
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            content,
            style: TextStyle(
              color: Theme.of(context).brightness == Brightness.dark 
                  ? textColor.withValues(alpha: 0.8)
                  : textColor.withValues(alpha: 0.8),
              fontSize: 16,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendation({
    required String title,
    required String subtitle,
    required Color dotColor,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 12,
          height: 12,
          margin: const EdgeInsets.only(top: 4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: dotColor,
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
                  color: textColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  color: subtitleColor,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}