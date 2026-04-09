import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:easy_localization/easy_localization.dart';
import 'project_model.dart';
import 'project_service.dart';

class ProjectAnalyticsScreen extends StatefulWidget {
  final String? projectId;
  
  const ProjectAnalyticsScreen({
    super.key,
    this.projectId,
  });

  @override
  State<ProjectAnalyticsScreen> createState() => _ProjectAnalyticsScreenState();
}

class _ProjectAnalyticsScreenState extends State<ProjectAnalyticsScreen>
    with SingleTickerProviderStateMixin {
  final ProjectService _projectService = ProjectService();
  late TabController _tabController;
  
  Map<String, dynamic>? _analyticsData;
  bool _isLoading = true;
  String _selectedTimeRange = '30'; // Days
  
  final List<String> _timeRanges = ['7', '30', '90', '365'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: widget.projectId != null ? 2 : 3,
      vsync: this,
    );
    _loadAnalytics();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAnalytics() async {
    setState(() => _isLoading = true);
    
    try {
      Map<String, dynamic> data;
      if (widget.projectId != null) {
        data = await _projectService.getProjectAnalytics(widget.projectId!);
      } else {
        data = await _projectService.getWorkspaceAnalytics();
      }
      
      setState(() {
        _analyticsData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading analytics: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.projectId != null 
              ? 'analytics.project_analytics'.tr()
              : 'analytics.workspace_analytics'.tr()
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.date_range),
            tooltip: 'analytics.time_range'.tr(),
            onSelected: (value) {
              setState(() => _selectedTimeRange = value);
              _loadAnalytics();
            },
            itemBuilder: (context) => _timeRanges.map((range) => PopupMenuItem(
              value: range,
              child: Text('Last $range days'),
            )).toList(),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAnalytics,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(icon: const Icon(Icons.dashboard), text: 'analytics.overview'.tr()),
            Tab(icon: const Icon(Icons.bar_chart), text: 'analytics.charts'.tr()),
            if (widget.projectId == null)
              Tab(icon: const Icon(Icons.insights), text: 'analytics.insights'.tr()),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _analyticsData == null
              ? const Center(child: Text('No data available'))
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(),
                    _buildChartsTab(),
                    if (widget.projectId == null) _buildInsightsTab(),
                  ],
                ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary Cards
          _buildSummaryCards(),
          
          const SizedBox(height: 24),
          
          // Progress Overview
          if (widget.projectId != null) _buildProgressOverview(),
          
          // Recent Activity or Task Status
          if (widget.projectId != null) ...[
            const SizedBox(height: 24),
            _buildTaskStatusOverview(),
          ] else ...[
            const SizedBox(height: 24),
            _buildProjectStatusOverview(),
          ],
          
          const SizedBox(height: 24),
          
          // Time-sensitive Items
          _buildTimeSensitiveItems(),
        ],
      ),
    );
  }

  Widget _buildChartsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.projectId != null) ...[
            // Task Status Distribution
            _buildTaskStatusChart(),
            
            const SizedBox(height: 24),
            
            // Task Priority Distribution
            _buildTaskPriorityChart(),
            
            const SizedBox(height: 24),
            
            // Task Type Distribution
            _buildTaskTypeChart(),
          ] else ...[
            // Project Status Distribution
            _buildProjectStatusChart(),
            
            const SizedBox(height: 24),
            
            // Project Type Distribution
            _buildProjectTypeChart(),
            
            const SizedBox(height: 24),
            
            // Monthly Progress Chart
            _buildProgressTrendChart(),
          ],
        ],
      ),
    );
  }

  Widget _buildInsightsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Key Insights',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 16),
          
          _buildInsightCard(
            title: 'Productivity Trend',
            content: _getProductivityInsight(),
            icon: Icons.trending_up,
            color: Colors.green,
          ),
          
          const SizedBox(height: 16),
          
          _buildInsightCard(
            title: 'Resource Allocation',
            content: _getResourceInsight(),
            icon: Icons.people,
            color: Colors.blue,
          ),
          
          const SizedBox(height: 16),
          
          _buildInsightCard(
            title: 'Timeline Management',
            content: _getTimelineInsight(),
            icon: Icons.schedule,
            color: Colors.orange,
          ),
          
          const SizedBox(height: 16),
          
          _buildInsightCard(
            title: 'Quality Metrics',
            content: _getQualityInsight(),
            icon: Icons.verified,
            color: Colors.purple,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    if (widget.projectId != null) {
      // Project-specific summary
      return Row(
        children: [
          Expanded(
            child: _buildSummaryCard(
              'Total Tasks',
              '${_analyticsData!['totalTasks'] ?? 0}',
              Icons.task,
              Colors.blue,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildSummaryCard(
              'Completed',
              '${(_analyticsData!['tasksByStatus'] as Map<String, dynamic>?)?.values.firstWhere((v) => v.toString().contains('Done'), orElse: () => 0) ?? 0}',
              Icons.check_circle,
              Colors.green,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildSummaryCard(
              'Overdue',
              '${_analyticsData!['overdueTasks'] ?? 0}',
              Icons.warning,
              Colors.red,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildSummaryCard(
              'Progress',
              '${((_analyticsData!['progress'] ?? 0) * 100).toStringAsFixed(0)}%',
              Icons.trending_up,
              Colors.orange,
            ),
          ),
        ],
      );
    } else {
      // Workspace summary
      return Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Projects',
                  '${_analyticsData!['totalProjects'] ?? 0}',
                  Icons.folder,
                  Colors.blue,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Active',
                  '${_analyticsData!['activeProjects'] ?? 0}',
                  Icons.play_circle,
                  Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Tasks',
                  '${_analyticsData!['totalTasks'] ?? 0}',
                  Icons.task,
                  Colors.orange,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Overdue',
                  '${_analyticsData!['overdueTasks'] ?? 0}',
                  Icons.warning,
                  Colors.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  'Avg Progress',
                  '${((_analyticsData!['averageProgress'] ?? 0) * 100).toStringAsFixed(0)}%',
                  Icons.trending_up,
                  Colors.purple,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  'Due This Week',
                  '${_analyticsData!['projectsDueThisWeek'] ?? 0}',
                  Icons.event,
                  Colors.indigo,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Container()), // Empty spacer
              const SizedBox(width: 12),
              Expanded(child: Container()), // Empty spacer
            ],
          ),
        ],
      );
    }
  }

  Widget _buildSummaryCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8.0),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                  child: Icon(
                    icon,
                    color: color,
                    size: 20,
                  ),
                ),
                const Spacer(),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressOverview() {
    final progress = (_analyticsData!['progress'] ?? 0.0) as double;
    final daysRemaining = _analyticsData!['daysRemaining'] as int?;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Project Progress',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.grey[300],
              valueColor: AlwaysStoppedAnimation<Color>(
                progress >= 0.8 ? Colors.green :
                progress >= 0.5 ? Colors.orange : Colors.red,
              ),
            ),
            
            const SizedBox(height: 8),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${(progress * 100).toStringAsFixed(1)}% Complete'),
                if (daysRemaining != null)
                  Text(
                    daysRemaining > 0 
                        ? '$daysRemaining days remaining' 
                        : daysRemaining == 0 
                            ? 'Due today' 
                            : '${-daysRemaining} days overdue',
                    style: TextStyle(
                      color: daysRemaining <= 0 ? Colors.red : null,
                      fontWeight: daysRemaining <= 0 ? FontWeight.bold : null,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskStatusOverview() {
    final tasksByStatus = _analyticsData!['tasksByStatus'] as Map<String, dynamic>? ?? {};
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Task Status Breakdown',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            ...tasksByStatus.entries.map((entry) => Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: _getStatusColor(entry.key),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(entry.key)),
                  Text(
                    '${entry.value}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildProjectStatusOverview() {
    final projectsByStatus = _analyticsData!['projectsByStatus'] as Map<String, dynamic>? ?? {};
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Project Status Breakdown',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            ...projectsByStatus.entries.map((entry) => Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: _getStatusColor(entry.key),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(entry.key)),
                  Text(
                    '${entry.value}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeSensitiveItems() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Time-Sensitive Items',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            if (widget.projectId != null) ...[
              _buildTimeSensitiveItem(
                'Overdue Tasks',
                '${_analyticsData!['overdueTasks'] ?? 0}',
                Icons.warning,
                Colors.red,
              ),
              _buildTimeSensitiveItem(
                'Due This Week',
                'Check individual tasks',
                Icons.schedule,
                Colors.orange,
              ),
            ] else ...[
              _buildTimeSensitiveItem(
                'Projects Due This Week',
                '${_analyticsData!['projectsDueThisWeek'] ?? 0}',
                Icons.event,
                Colors.orange,
              ),
              _buildTimeSensitiveItem(
                'Overdue Tasks (All Projects)',
                '${_analyticsData!['overdueTasks'] ?? 0}',
                Icons.warning,
                Colors.red,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTimeSensitiveItem(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(title)),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskStatusChart() {
    final tasksByStatus = _analyticsData!['tasksByStatus'] as Map<String, dynamic>? ?? {};
    
    if (tasksByStatus.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: Center(child: Text('No task data available')),
        ),
      );
    }
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Task Status Distribution',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sections: tasksByStatus.entries.map((entry) {
                    final index = tasksByStatus.keys.toList().indexOf(entry.key);
                    return PieChartSectionData(
                      value: (entry.value as num).toDouble(),
                      title: '${entry.value}',
                      color: _getStatusColor(entry.key),
                      radius: 50,
                      titleStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    );
                  }).toList(),
                  centerSpaceRadius: 40,
                  sectionsSpace: 2,
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Legend
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: tasksByStatus.entries.map((entry) => Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: _getStatusColor(entry.key),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(entry.key, style: const TextStyle(fontSize: 12)),
                ],
              )).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskPriorityChart() {
    final tasksByPriority = _analyticsData!['tasksByPriority'] as Map<String, dynamic>? ?? {};
    
    if (tasksByPriority.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: Center(child: Text('No priority data available')),
        ),
      );
    }
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Task Priority Distribution',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: tasksByPriority.values.map((v) => (v as num).toDouble()).reduce((a, b) => a > b ? a : b),
                  barGroups: tasksByPriority.entries.map((entry) {
                    final index = tasksByPriority.keys.toList().indexOf(entry.key);
                    return BarChartGroupData(
                      x: index,
                      barRods: [
                        BarChartRodData(
                          toY: (entry.value as num).toDouble(),
                          color: _getPriorityColor(entry.key),
                          width: 16,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                      ],
                    );
                  }).toList(),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final keys = tasksByPriority.keys.toList();
                          if (value.toInt() < keys.length) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 8.0),
                              child: Text(
                                keys[value.toInt()],
                                style: const TextStyle(fontSize: 12),
                              ),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  gridData: const FlGridData(show: false),
                  borderData: FlBorderData(show: false),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskTypeChart() {
    final tasksByType = _analyticsData!['tasksByType'] as Map<String, dynamic>? ?? {};
    
    if (tasksByType.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: Center(child: Text('No type data available')),
        ),
      );
    }
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Task Type Distribution',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            ...tasksByType.entries.map((entry) => Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: _getTypeColor(entry.key),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(entry.key)),
                  Container(
                    width: 100,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: (entry.value as num) / tasksByType.values.map((v) => v as num).reduce((a, b) => a > b ? a : b),
                      child: Container(
                        decoration: BoxDecoration(
                          color: _getTypeColor(entry.key),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${entry.value}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildProjectStatusChart() {
    final projectsByStatus = _analyticsData!['projectsByStatus'] as Map<String, dynamic>? ?? {};
    
    return _buildGenericPieChart(
      'Project Status Distribution',
      projectsByStatus,
      (key) => _getStatusColor(key),
    );
  }

  Widget _buildProjectTypeChart() {
    final projectsByType = _analyticsData!['projectsByType'] as Map<String, dynamic>? ?? {};
    
    return _buildGenericPieChart(
      'Project Type Distribution',
      projectsByType,
      (key) => _getTypeColor(key),
    );
  }

  Widget _buildGenericPieChart(
    String title,
    Map<String, dynamic> data,
    Color Function(String) getColor,
  ) {
    if (data.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Center(child: Text('No $title data available')),
        ),
      );
    }
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sections: data.entries.map((entry) {
                    return PieChartSectionData(
                      value: (entry.value as num).toDouble(),
                      title: '${entry.value}',
                      color: getColor(entry.key),
                      radius: 50,
                      titleStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    );
                  }).toList(),
                  centerSpaceRadius: 40,
                  sectionsSpace: 2,
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Legend
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: data.entries.map((entry) => Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: getColor(entry.key),
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(entry.key, style: const TextStyle(fontSize: 12)),
                ],
              )).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressTrendChart() {
    // This would typically come from historical data
    // For now, we'll create sample data
    final sampleData = List.generate(12, (index) => 
      FlSpot(index.toDouble(), (index * 5 + 20).toDouble()));
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Progress Trend (Last 12 Months)',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: true,
                    horizontalInterval: 20,
                    verticalInterval: 2,
                    getDrawingHorizontalLine: (value) {
                      return FlLine(
                        color: Colors.grey[300]!,
                        strokeWidth: 1,
                      );
                    },
                    getDrawingVerticalLine: (value) {
                      return FlLine(
                        color: Colors.grey[300]!,
                        strokeWidth: 1,
                      );
                    },
                  ),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 30,
                        interval: 2,
                        getTitlesWidget: (value, meta) {
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          if (value.toInt() < months.length) {
                            return Text(
                              months[value.toInt()],
                              style: const TextStyle(fontSize: 12),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        interval: 20,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            '${value.toInt()}%',
                            style: const TextStyle(fontSize: 12),
                          );
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
                  borderData: FlBorderData(
                    show: true,
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  minX: 0,
                  maxX: 11,
                  minY: 0,
                  maxY: 100,
                  lineBarsData: [
                    LineChartBarData(
                      spots: sampleData,
                      isCurved: true,
                      gradient: LinearGradient(
                        colors: [
                          Colors.blue,
                          Colors.blue.withOpacity(0.5),
                        ],
                      ),
                      barWidth: 3,
                      isStrokeCapRound: true,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(
                        show: true,
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.blue.withOpacity(0.3),
                            Colors.blue.withOpacity(0.1),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInsightCard({
    required String title,
    required String content,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12.0),
              ),
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    content,
                    style: TextStyle(
                      color: Colors.grey[600],
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'to do':
      case 'todo':
        return Colors.grey;
      case 'in progress':
      case 'inprogress':
        return Colors.blue;
      case 'review':
        return Colors.orange;
      case 'testing':
        return Colors.purple;
      case 'done':
      case 'completed':
        return Colors.green;
      case 'active':
        return Colors.green;
      case 'on hold':
      case 'paused':
        return Colors.orange;
      case 'archived':
        return Colors.grey;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.blue;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'lowest':
        return Colors.grey;
      case 'low':
        return Colors.blue;
      case 'medium':
        return Colors.orange;
      case 'high':
        return Colors.red;
      case 'highest':
      case 'critical':
        return Colors.purple;
      default:
        return Colors.orange;
    }
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'task':
        return Colors.blue;
      case 'story':
        return Colors.green;
      case 'bug':
        return Colors.red;
      case 'epic':
        return Colors.purple;
      case 'subtask':
        return Colors.orange;
      case 'kanban':
        return Colors.blue;
      case 'scrum':
        return Colors.green;
      case 'waterfall':
        return Colors.indigo;
      case 'development':
        return Colors.teal;
      case 'design':
        return Colors.pink;
      case 'research':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }

  String _getProductivityInsight() {
    final avgProgress = (_analyticsData!['averageProgress'] ?? 0.0) as double;
    
    if (avgProgress >= 0.8) {
      return 'Excellent productivity! Projects are progressing well with an average completion rate of ${(avgProgress * 100).toStringAsFixed(0)}%. Keep up the great work!';
    } else if (avgProgress >= 0.6) {
      return 'Good productivity levels. Projects are making steady progress with ${(avgProgress * 100).toStringAsFixed(0)}% average completion. Consider identifying bottlenecks to improve further.';
    } else {
      return 'There\'s room for improvement in productivity. With ${(avgProgress * 100).toStringAsFixed(0)}% average completion, consider reviewing project scope, resources, and timelines.';
    }
  }

  String _getResourceInsight() {
    final activeProjects = (_analyticsData!['activeProjects'] ?? 0) as int;
    final totalTasks = (_analyticsData!['totalTasks'] ?? 0) as int;
    
    if (activeProjects > 0 && totalTasks > 0) {
      final tasksPerProject = totalTasks / activeProjects;
      if (tasksPerProject > 20) {
        return 'High task density detected with ${tasksPerProject.toStringAsFixed(1)} tasks per project. Consider breaking down large projects or redistributing workload.';
      } else {
        return 'Good resource distribution with ${tasksPerProject.toStringAsFixed(1)} tasks per project on average. Resources appear well-allocated.';
      }
    }
    
    return 'Insufficient data to analyze resource allocation. Consider tracking more project and task metrics.';
  }

  String _getTimelineInsight() {
    final overdueTasks = (_analyticsData!['overdueTasks'] ?? 0) as int;
    final projectsDueThisWeek = (_analyticsData!['projectsDueThisWeek'] ?? 0) as int;
    
    if (overdueTasks > 0) {
      return 'Timeline management needs attention. $overdueTasks overdue tasks detected. Review task prioritization and consider adjusting deadlines or resources.';
    } else if (projectsDueThisWeek > 2) {
      return 'Heavy upcoming deadlines with $projectsDueThisWeek projects due this week. Ensure adequate resource allocation and consider timeline adjustments if needed.';
    } else {
      return 'Good timeline management. No overdue tasks and manageable upcoming deadlines. Continue monitoring progress regularly.';
    }
  }

  String _getQualityInsight() {
    // This would typically analyze bug rates, review cycles, etc.
    // For now, provide generic insight based on task types
    final tasksByType = _analyticsData!['tasksByType'] as Map<String, dynamic>? ?? {};
    final bugCount = tasksByType['Bug'] ?? 0;
    final totalTasks = (_analyticsData!['totalTasks'] ?? 0) as int;
    
    if (totalTasks > 0) {
      final bugRatio = bugCount / totalTasks;
      if (bugRatio > 0.2) {
        return 'High bug ratio detected (${(bugRatio * 100).toStringAsFixed(1)}%). Consider improving testing processes and code review practices.';
      } else if (bugRatio > 0.1) {
        return 'Moderate bug levels (${(bugRatio * 100).toStringAsFixed(1)}%). Quality is reasonable but could be improved with better testing.';
      } else {
        return 'Good quality metrics with low bug ratio (${(bugRatio * 100).toStringAsFixed(1)}%). Testing and review processes appear effective.';
      }
    }
    
    return 'Quality analysis requires more task type data. Consider categorizing tasks better for improved insights.';
  }
}