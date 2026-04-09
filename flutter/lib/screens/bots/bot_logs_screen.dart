import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../api/services/bot_api_service.dart';
import '../../services/workspace_service.dart';

/// Screen for viewing bot execution logs
class BotLogsScreen extends StatefulWidget {
  final Bot bot;

  const BotLogsScreen({super.key, required this.bot});

  @override
  State<BotLogsScreen> createState() => _BotLogsScreenState();
}

class _BotLogsScreenState extends State<BotLogsScreen> {
  final BotApiService _botService = BotApiService();
  List<BotExecutionLog> _logs = [];
  ExecutionLogStats? _stats;
  bool _isLoading = true;
  ExecutionStatus? _statusFilter;

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isLoading = true);

    try {
      final logsResponse = await _botService.getLogs(
        workspaceId,
        widget.bot.id,
        status: _statusFilter,
        limit: 100,
      );

      final statsResponse = await _botService.getLogStats(
        workspaceId,
        widget.bot.id,
      );

      if (mounted) {
        setState(() {
          if (logsResponse.success) _logs = logsResponse.data ?? [];
          if (statsResponse.success) _stats = statsResponse.data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showLogDetails(BotExecutionLog log) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => LogDetailsSheet(log: log),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('bots.logs_for'.tr(args: [widget.bot.name])),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadLogs,
          ),
          PopupMenuButton<ExecutionStatus?>(
            icon: const Icon(Icons.filter_list),
            onSelected: (status) {
              setState(() => _statusFilter = status);
              _loadLogs();
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: null,
                child: Row(
                  children: [
                    Icon(
                      Icons.all_inclusive,
                      size: 18,
                      color: _statusFilter == null ? Colors.teal : null,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'bots.all_statuses'.tr(),
                      style: TextStyle(
                        fontWeight: _statusFilter == null ? FontWeight.bold : null,
                      ),
                    ),
                  ],
                ),
              ),
              ...ExecutionStatus.values.map((status) {
                return PopupMenuItem(
                  value: status,
                  child: Row(
                    children: [
                      Icon(
                        _getStatusIcon(status),
                        size: 18,
                        color: _statusFilter == status
                            ? _getStatusColor(status)
                            : null,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        status.displayName,
                        style: TextStyle(
                          fontWeight: _statusFilter == status
                              ? FontWeight.bold
                              : null,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Stats cards
          if (_stats != null) _buildStatsRow(isDark),
          // Logs list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _logs.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.history,
                              size: 64,
                              color: isDark
                                  ? Colors.grey.shade700
                                  : Colors.grey.shade300,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'bots.no_logs'.tr(),
                              style: TextStyle(
                                color: isDark
                                    ? Colors.grey.shade400
                                    : Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadLogs,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _logs.length,
                          itemBuilder: (context, index) {
                            final log = _logs[index];
                            return _buildLogCard(log, isDark);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
              'bots.total'.tr(),
              _stats!.total.toString(),
              Icons.timeline,
              Colors.blue,
              isDark,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard(
              'bots.success'.tr(),
              _stats!.success.toString(),
              Icons.check_circle,
              Colors.green,
              isDark,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard(
              'bots.failed'.tr(),
              _stats!.failed.toString(),
              Icons.error,
              Colors.red,
              isDark,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard(
              'bots.avg_time'.tr(),
              '${_stats!.avgExecutionTime.toStringAsFixed(0)}ms',
              Icons.timer,
              Colors.orange,
              isDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogCard(BotExecutionLog log, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => _showLogDetails(log),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Status icon
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: _getStatusColor(log.status).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getStatusIcon(log.status),
                  color: _getStatusColor(log.status),
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              // Log info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (log.triggerType != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.orange.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              log.triggerType!,
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.orange,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        if (log.triggerType != null && log.actionType != null)
                          const SizedBox(width: 4),
                        if (log.actionType != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.blue.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              log.actionType!,
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.blue,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          timeago.format(log.createdAt),
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? Colors.grey.shade400
                                : Colors.grey.shade600,
                          ),
                        ),
                        if (log.executionTimeMs != null) ...[
                          const SizedBox(width: 8),
                          Icon(
                            Icons.timer_outlined,
                            size: 12,
                            color: isDark
                                ? Colors.grey.shade400
                                : Colors.grey.shade600,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            '${log.executionTimeMs}ms',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark
                                  ? Colors.grey.shade400
                                  : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (log.errorMessage != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        log.errorMessage!,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.red.shade400,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getStatusIcon(ExecutionStatus status) {
    switch (status) {
      case ExecutionStatus.pending:
        return Icons.hourglass_empty;
      case ExecutionStatus.running:
        return Icons.sync;
      case ExecutionStatus.success:
        return Icons.check_circle;
      case ExecutionStatus.failed:
        return Icons.error;
      case ExecutionStatus.skipped:
        return Icons.skip_next;
    }
  }

  Color _getStatusColor(ExecutionStatus status) {
    switch (status) {
      case ExecutionStatus.pending:
        return Colors.grey;
      case ExecutionStatus.running:
        return Colors.blue;
      case ExecutionStatus.success:
        return Colors.green;
      case ExecutionStatus.failed:
        return Colors.red;
      case ExecutionStatus.skipped:
        return Colors.orange;
    }
  }
}

/// Sheet for viewing log details
class LogDetailsSheet extends StatelessWidget {
  final BotExecutionLog log;

  const LogDetailsSheet({super.key, required this.log});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return DefaultTabController(
          length: 4,
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade300),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _getStatusColor(log.status).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getStatusIcon(log.status),
                        color: _getStatusColor(log.status),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            log.status.displayName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            DateFormat('MMM d, yyyy h:mm a').format(log.createdAt),
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark
                                  ? Colors.grey.shade400
                                  : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              // Tabs
              TabBar(
                labelColor: Colors.teal,
                unselectedLabelColor:
                    isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                indicatorColor: Colors.teal,
                tabs: [
                  Tab(text: 'bots.overview'.tr()),
                  Tab(text: 'bots.input'.tr()),
                  Tab(text: 'bots.output'.tr()),
                  Tab(text: 'bots.error'.tr()),
                ],
              ),
              // Tab content
              Expanded(
                child: TabBarView(
                  children: [
                    _buildOverviewTab(isDark),
                    _buildJsonTab(log.triggerData, isDark),
                    _buildJsonTab(log.actionOutput, isDark),
                    _buildErrorTab(isDark),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOverviewTab(bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildInfoRow('bots.status'.tr(), log.status.displayName, isDark),
        if (log.triggerType != null)
          _buildInfoRow('bots.trigger_type'.tr(), log.triggerType!, isDark),
        if (log.actionType != null)
          _buildInfoRow('bots.action_type'.tr(), log.actionType!, isDark),
        if (log.executionTimeMs != null)
          _buildInfoRow(
            'bots.execution_time'.tr(),
            '${log.executionTimeMs}ms',
            isDark,
          ),
        if (log.channelId != null)
          _buildInfoRow('bots.channel_id'.tr(), log.channelId!, isDark),
        if (log.conversationId != null)
          _buildInfoRow('bots.conversation_id'.tr(), log.conversationId!, isDark),
        if (log.messageId != null)
          _buildInfoRow('bots.message_id'.tr(), log.messageId!, isDark),
        if (log.triggeredByUser != null)
          _buildInfoRow('bots.triggered_by'.tr(), log.triggeredByUser!, isDark),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildJsonTab(Map<String, dynamic> data, bool isDark) {
    if (data.isEmpty) {
      return Center(
        child: Text(
          'bots.no_data'.tr(),
          style: TextStyle(
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: SelectableText(
          _prettyJson(data),
          style: TextStyle(
            fontFamily: 'monospace',
            fontSize: 12,
            color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
          ),
        ),
      ),
    );
  }

  Widget _buildErrorTab(bool isDark) {
    if (log.errorMessage == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle,
              size: 48,
              color: Colors.green.shade300,
            ),
            const SizedBox(height: 8),
            Text(
              'bots.no_errors'.tr(),
              style: TextStyle(
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.red.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
        ),
        child: SelectableText(
          log.errorMessage!,
          style: TextStyle(
            fontSize: 13,
            color: Colors.red.shade700,
          ),
        ),
      ),
    );
  }

  String _prettyJson(Map<String, dynamic> json) {
    const encoder = JsonEncoder.withIndent('  ');
    return encoder.convert(json);
  }

  IconData _getStatusIcon(ExecutionStatus status) {
    switch (status) {
      case ExecutionStatus.pending:
        return Icons.hourglass_empty;
      case ExecutionStatus.running:
        return Icons.sync;
      case ExecutionStatus.success:
        return Icons.check_circle;
      case ExecutionStatus.failed:
        return Icons.error;
      case ExecutionStatus.skipped:
        return Icons.skip_next;
    }
  }

  Color _getStatusColor(ExecutionStatus status) {
    switch (status) {
      case ExecutionStatus.pending:
        return Colors.grey;
      case ExecutionStatus.running:
        return Colors.blue;
      case ExecutionStatus.success:
        return Colors.green;
      case ExecutionStatus.failed:
        return Colors.red;
      case ExecutionStatus.skipped:
        return Colors.orange;
    }
  }
}

class JsonEncoder {
  final String? indent;
  const JsonEncoder.withIndent(this.indent);

  String convert(Map<String, dynamic> json) {
    return _encode(json, 0);
  }

  String _encode(dynamic value, int depth) {
    final indentStr = indent ?? '';
    final currentIndent = indentStr * depth;
    final nextIndent = indentStr * (depth + 1);

    if (value == null) return 'null';
    if (value is bool) return value.toString();
    if (value is num) return value.toString();
    if (value is String) return '"${_escapeString(value)}"';

    if (value is List) {
      if (value.isEmpty) return '[]';
      final items = value.map((e) => '$nextIndent${_encode(e, depth + 1)}').join(',\n');
      return '[\n$items\n$currentIndent]';
    }

    if (value is Map) {
      if (value.isEmpty) return '{}';
      final entries = value.entries.map((e) {
        return '$nextIndent"${e.key}": ${_encode(e.value, depth + 1)}';
      }).join(',\n');
      return '{\n$entries\n$currentIndent}';
    }

    return value.toString();
  }

  String _escapeString(String s) {
    return s
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r')
        .replaceAll('\t', '\\t');
  }
}
