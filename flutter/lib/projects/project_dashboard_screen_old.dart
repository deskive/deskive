import 'package:flutter/material.dart';
import '../services/project_service.dart';
import '../models/project.dart';
import '../models/task.dart';
import '../config/app_config.dart';
import 'create_project_screen.dart';
import 'project_details_screen.dart';
import '../videocalls/video_call_screen.dart' as call_screen;
import '../theme/app_theme.dart';

class ProjectDashboardScreen extends StatefulWidget {
  const ProjectDashboardScreen({super.key});

  @override
  State<ProjectDashboardScreen> createState() => _ProjectDashboardScreenState();
}

class _ProjectDashboardScreenState extends State<ProjectDashboardScreen> {
  final ProjectService _projectService = ProjectService();
  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = 'All types';
  String _searchQuery = '';
  
  // Expansion state for drawer projects
  final Map<String, bool> _expandedProjects = {
    'E-Commerce Platform': false,
    'Mobile App Development': false,
    'Bug Tracking System': false,
    'AI Research Initiative': false,
    'Feature Enhancement Pipel...': false,
  };
  
  // Team members storage
  final List<ProjectTeamMember> _teamMembers = [
    ProjectTeamMember(name: 'Sarah Doe', email: 'sarah@example.com', role: 'Manager', taskCount: 0),
    ProjectTeamMember(name: 'Jane Smith', email: 'jane@example.com', role: 'Member', taskCount: 0),
    ProjectTeamMember(name: 'Alex Johnson', email: 'alex@example.com', role: 'Member', taskCount: 0),
    ProjectTeamMember(name: 'Emily Davis', email: 'emily@example.com', role: 'Member', taskCount: 0),
  ];
  
  final List<String> _filterOptions = [
    'All types',
    'KANBAN',
    'SCRUM',
    'BUG TRACKING',
    'FEATURE',
    'RESEARCH',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Update projects progress based on actual task completion
    _projectService.updateProjectsProgress();
    
    final allProjects = _projectService.getAllProjects();
    final projects = _filterProjects(allProjects);
    final activeProjects = _projectService.getActiveProjects();
    final allTasks = _projectService.getAllTasks();
    final inProgressTasks = allTasks.where((t) => t.status == TaskStatus.inProgress).length;
    final overdueTasks = allTasks.where((t) => 
      t.dueDate != null && t.dueDate!.isBefore(DateTime.now()) && t.status != TaskStatus.completed
    ).length;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            onPressed: () => Scaffold.of(context).openDrawer(),
            icon: const Icon(Icons.menu),
          ),
        ),
        title: const Text('Projects'),
        actions: [
          IconButton(
            onPressed: () => _showCreateProjectDialog(),
            icon: const Icon(Icons.add),
          ),
          PopupMenuButton<String>(
            onSelected: _handleMenuSelection,
            itemBuilder: (BuildContext context) => [
              PopupMenuItem<String>(
                value: 'project_overview',
                child: Row(
                  children: [
                    Icon(Icons.dashboard_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    const Text('Project Overview'),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'team_members',
                child: Row(
                  children: [
                    Icon(Icons.people_outline, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    const Text('Team Members'),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'upcoming_deadlines',
                child: Row(
                  children: [
                    Icon(Icons.schedule_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    const Text('Upcoming Deadlines'),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'quick_actions',
                child: Row(
                  children: [
                    Icon(Icons.flash_on_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    const Text('Quick Actions'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: Theme.of(context).drawerTheme.backgroundColor ?? 
                        (Theme.of(context).brightness == Brightness.dark 
                          ? const Color(0xFF1A1D29) 
                          : Theme.of(context).colorScheme.surface),
        width: 280,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drawer Header
              Container(
                padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
                child: Text(
                  'Projects',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              
              // Projects List
              _buildExpandableProjectCard(
                name: 'E-Commerce Platform',
                progress: _projectService.calculateProjectProgress('1'),
                color: const Color(0xFF3B82F6),
                icon: Icons.shopping_cart,
                taskCount: _projectService.getTasksForProject('1').length,
                daysLeft: 5,
                tasks: [
                  {'title': 'Implement user authentica...', 'priority': TaskPriority.high},
                  {'title': 'Design product catalog UI', 'priority': TaskPriority.low},
                  {'title': 'Implement shopping cart f...', 'priority': TaskPriority.high},
                ],
                teamAvatars: ['A', 'B', 'C', 'D'],
                dueDate: 'Feb 15',
              ),
              const SizedBox(height: 6),
              
              _buildExpandableProjectCard(
                name: 'Mobile App Development',
                progress: _projectService.calculateProjectProgress('2'),
                color: const Color(0xFFF59E0B),
                icon: Icons.phone_iphone,
                taskCount: _projectService.getTasksForProject('2').length,
                daysLeft: 30,
                tasks: [],
                teamAvatars: ['M', 'N', 'O'],
                dueDate: 'Mar 30',
              ),
              const SizedBox(height: 6),
              
              _buildExpandableProjectCard(
                name: 'Bug Tracking System',
                progress: _projectService.calculateProjectProgress('3'),
                color: const Color(0xFF06B6D4),
                icon: Icons.bug_report,
                taskCount: _projectService.getTasksForProject('3').length,
                daysLeft: 45,
                tasks: [],
                teamAvatars: ['P', 'Q'],
                dueDate: 'Apr 15',
              ),
              const SizedBox(height: 6),
              
              _buildExpandableProjectCard(
                name: 'AI Research Initiative',
                progress: _projectService.calculateProjectProgress('4'),
                color: const Color(0xFF8B5CF6),
                icon: Icons.psychology,
                taskCount: _projectService.getTasksForProject('4').length,
                daysLeft: 60,
                tasks: [],
                teamAvatars: ['R', 'S', 'T', 'U'],
                dueDate: 'May 1',
              ),
              const SizedBox(height: 6),
              
              _buildExpandableProjectCard(
                name: 'Feature Enhancement Pipel...',
                progress: _projectService.calculateProjectProgress('5'),
                color: const Color(0xFF10B981),
                icon: Icons.rocket_launch,
                taskCount: _projectService.getTasksForProject('5').length,
                daysLeft: 0,
                tasks: [],
                teamAvatars: ['V', 'W'],
                dueDate: 'Completed',
                isCompleted: true,
              ),
              
              const SizedBox(height: 24),
              
              // My Tasks Section
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'My Tasks',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Task items
                    ...allTasks.take(8).map((task) => _buildDrawerTaskItem(task)),
                  ],
                ),
              ),
              
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar and Filter
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(context).dividerColor.withOpacity(0.1),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: (value) {
                        setState(() {
                          _searchQuery = value;
                        });
                      },
                      decoration: InputDecoration(
                        hintText: 'Search projects...',
                        hintStyle: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                        ),
                        prefixIcon: Icon(
                          Icons.search,
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                        ),
                        filled: true,
                        fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
                      ),
                    ),
                    child: DropdownButton<String>(
                      value: _selectedFilter,
                      onChanged: (String? newValue) {
                        if (newValue != null) {
                          setState(() {
                            _selectedFilter = newValue;
                          });
                        }
                      },
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                      ),
                      underline: Container(),
                      isDense: true,
                      icon: Icon(
                        Icons.arrow_drop_down,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                      ),
                      items: _filterOptions.map<DropdownMenuItem<String>>((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
            
            // Statistics Cards - Horizontal Scroll
            const SizedBox(height: 16),
            SizedBox(
              height: 80,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                children: [
                  SizedBox(
                    width: 160,
                    child: _buildStatCard(
                      'Total Projects',
                      projects.length.toString(),
                      Icons.folder_outlined,
                      Colors.blue,
                    ),
                  ),
                  const SizedBox(width: 16),
                  SizedBox(
                    width: 160,
                    child: _buildStatCard(
                      'Total Tasks',
                      allTasks.length.toString(),
                      Icons.check_circle_outline,
                      Colors.green,
                    ),
                  ),
                  const SizedBox(width: 16),
                  SizedBox(
                    width: 160,
                    child: _buildStatCard(
                      'In Progress',
                      inProgressTasks.toString(),
                      Icons.schedule,
                      Colors.orange,
                    ),
                  ),
                  const SizedBox(width: 16),
                  SizedBox(
                    width: 160,
                    child: _buildStatCard(
                      'Overdue',
                      overdueTasks.toString(),
                      Icons.warning_outlined,
                      Colors.red,
                    ),
                  ),
                ],
              ),
            ),
            
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
            
            // Projects List or Empty State
            projects.isEmpty
                ? Center(
                    child: Column(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            Icons.folder_outlined,
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                            size: 40,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No projects found',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Get started by creating your first project',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: () => _showCreateProjectDialog(),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          child: const Text('Create Project'),
                        ),
                      ],
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Overall Completion Rate Section
                      _buildOverallCompletionRate(),
                      
                      // All Projects Section
                      Text(
                        'All Projects',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...projects.map((project) => _buildProjectCard(project)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Icon in top-right
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
          ),
          // Text content
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                title,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getProjectColor(ProjectType type) {
    switch (type) {
      case ProjectType.development:
        return Colors.blue;
      case ProjectType.design:
        return Colors.blue[600]!;
      case ProjectType.research:
        return Colors.green;
      case ProjectType.task:
        return Colors.orange;
    }
  }

  void _handleMenuSelection(String value) {
    switch (value) {
      case 'project_overview':
        _showProjectOverviewSheet();
        break;
      case 'team_members':
        _showTeamMembersSheet();
        break;
      case 'upcoming_deadlines':
        _showUpcomingDeadlinesSheet();
        break;
      case 'quick_actions':
        _showQuickActionsSheet();
        break;
    }
  }

  void _showProjectOverviewSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.dashboard_outlined, color: Colors.blue),
                const SizedBox(width: 12),
                Text(
                  'Project Overview',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text(
              'Progress',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  '0%',
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 14),
                ),
                const Spacer(),
                Text(
                  '0/0 done',
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 14),
                ),
                const SizedBox(width: 12),
                Text(
                  '0.0%',
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildProgressIndicator(Colors.green, 0),
                const SizedBox(width: 8),
                _buildProgressIndicator(Colors.orange, 0),
                const SizedBox(width: 8),
                _buildProgressIndicator(Colors.red, 0),
              ],
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _showTeamMembersSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.people_outline, color: Colors.blue),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Team Members',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _showAddTeamMemberDialog();
                  },
                  icon: Icon(
                    Icons.add,
                    color: Colors.blue,
                  ),
                  tooltip: 'Add team member',
                ),
              ],
            ),
            const SizedBox(height: 24),
            ..._teamMembers.map((member) => _buildTeamMember(member.name, '${member.taskCount} tasks')),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showAddTeamMemberDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return _AddTeamMemberDialog();
      },
    ).then((_) {
      // Reopen the team members sheet after dialog closes
      _showTeamMembersSheet();
    });
  }

  void _showUpcomingDeadlinesSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.schedule_outlined, color: Colors.blue),
                const SizedBox(width: 12),
                Text(
                  'Upcoming Deadlines',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildDeadlineIndicator(Colors.red, '0', 'Overdue'),
                _buildDeadlineIndicator(Colors.orange, '0', 'Today'),
                _buildDeadlineIndicator(Colors.blue, '0', 'This Week'),
              ],
            ),
            const SizedBox(height: 24),
            Center(
              child: Text(
                'No upcoming deadlines',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _showQuickActionsSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(5)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.flash_on_outlined, color: Colors.blue),
                const SizedBox(width: 12),
                Text(
                  'Quick Actions',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            InkWell(
              onTap: () {
                Navigator.pop(context);
                _showCreateProjectDialog();
              },
              child: _buildQuickAction(Icons.add, 'Create Project'),
            ),
            InkWell(
              onTap: () {
                Navigator.pop(context);
                // TODO: Add task functionality
              },
              child: _buildQuickAction(Icons.add_task, 'Add Task'),
            ),
            InkWell(
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const call_screen.VideoCallScreen(
                      participants: ['John Doe', 'Jane Smith', 'Alex Johnson'],
                      isIncoming: false,
                    ),
                  ),
                );
              },
              child: _buildQuickAction(Icons.people, 'Quick Meeting'),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }


  double _calculateOverallProgress(List<Project> projects) {
    if (projects.isEmpty) return 0.0;
    double totalProgress = projects.fold(0.0, (sum, project) => sum + project.progress);
    return totalProgress / projects.length;
  }
  
  int _getCompletedProjectsCount(List<Project> projects) {
    return projects.where((project) => project.progress >= 1.0).length;
  }

  Widget _buildOverallCompletionRate() {
    final allProjects = _projectService.getAllProjects();
    final projects = _filterProjects(allProjects);
    final overallProgress = _calculateOverallProgress(projects);
    final completedCount = _getCompletedProjectsCount(projects);
    final totalCount = projects.length;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.donut_large_outlined, color: Colors.blue),
              const SizedBox(width: 12),
              Text(
                'Overall Completion Rate',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Text(
                'Progress',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 14,
                ),
              ),
              const Spacer(),
              Text(
                '${(overallProgress * 100).toInt()}%',
                style: TextStyle(
                  color: Colors.blue,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: overallProgress,
              backgroundColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                '$completedCount completed',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                  fontSize: 12,
                ),
              ),
              const Spacer(),
              Text(
                '$totalCount total',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator(Color color, int value) {
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Center(
        child: Text(
          value.toString(),
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildTeamMember(String name, String taskCount) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: Colors.blue.withValues(alpha: 0.2),
            child: Text(
              name[0],
              style: TextStyle(color: Colors.blue, fontSize: 14),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 16,
                  ),
                ),
                Text(
                  taskCount,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
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

  Widget _buildDeadlineIndicator(Color color, String count, String label) {
    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              count,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickAction(IconData icon, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: Colors.blue, size: 20),
          ),
          const SizedBox(width: 16),
          Text(
            title,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  void _showCreateProjectDialog() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const CreateProjectScreen(),
      ),
    );
    
    if (result != null && mounted) {
      // Refresh the UI if a project was created
      setState(() {});
    }
  }

  Widget _buildProjectCard(Project project) {
    return InkWell(
      onTap: () async {
        final result = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (context) => ProjectDetailsScreen(project: project),
          ),
        );

        // If the project was deleted, reload the project list
        if (result == true) {
          _loadProjects();
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
          ),
        ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _getProjectColor(project.type).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getProjectIcon(project.type),
                  color: _getProjectColor(project.type),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      project.name,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      project.description.isEmpty ? 'No description' : project.description,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _getStatusColor(project.status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  project.status.name.toUpperCase(),
                  style: TextStyle(
                    color: _getStatusColor(project.status),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(
                Icons.task_alt,
                size: 16,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
              ),
              const SizedBox(width: 4),
              Text(
                '${project.taskCount} tasks',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                  fontSize: 13,
                ),
              ),
              const SizedBox(width: 16),
              Icon(
                Icons.people_outline,
                size: 16,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
              ),
              const SizedBox(width: 4),
              Text(
                '${project.memberCount} members',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              Text(
                '${(project.progress * 100).toInt()}%',
                style: TextStyle(
                  color: Colors.blue,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: project.progress,
              backgroundColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
              minHeight: 6,
            ),
          ),
        ],
      ),
      ),
    );
  }

  IconData _getProjectIcon(ProjectType type) {
    switch (type) {
      case ProjectType.development:
        return Icons.code;
      case ProjectType.design:
        return Icons.palette;
      case ProjectType.research:
        return Icons.science;
      case ProjectType.task:
        return Icons.task_alt;
    }
  }

  Color _getStatusColor(ProjectStatus status) {
    switch (status) {
      case ProjectStatus.active:
        return Colors.green;
      case ProjectStatus.paused:
        return Colors.orange;
      case ProjectStatus.completed:
        return Colors.blue;
      case ProjectStatus.cancelled:
        return Colors.red;
    }
  }

  // Method to add team members
  void _addTeamMembers(List<ProjectTeamMember> newMembers) {
    setState(() {
      _teamMembers.addAll(newMembers);
    });
  }

  List<Project> _filterProjects(List<Project> projects) {
    var filteredProjects = projects;
    
    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filteredProjects = filteredProjects.where((project) {
        return project.name.toLowerCase().contains(query) ||
               project.description.toLowerCase().contains(query);
      }).toList();
    }
    
    // Filter by project type
    if (_selectedFilter != 'All types') {
      final filterTypeMap = {
        'KANBAN': ProjectType.development,
        'SCRUM': ProjectType.development,
        'BUG TRACKING': ProjectType.development,
        'FEATURE': ProjectType.design,
        'RESEARCH': ProjectType.research,
      };
      
      final filterType = filterTypeMap[_selectedFilter];
      if (filterType != null) {
        filteredProjects = filteredProjects.where((project) => project.type == filterType).toList();
      }
    }
    
    return filteredProjects;
  }
}

class _AddTeamMemberDialog extends StatefulWidget {
  @override
  _AddTeamMemberDialogState createState() => _AddTeamMemberDialogState();
}

class _AddTeamMemberDialogState extends State<_AddTeamMemberDialog> {
  int _selectedTab = 0;
  List<Map<String, String>> get _existingMembers {
    // Get the parent state to access team members
    final parentState = context.findAncestorStateOfType<_ProjectDashboardScreenState>();
    final currentMemberNames = parentState?._teamMembers.map((m) => m.name).toSet() ?? <String>{};
    
    // Return available members that aren't already in the project
    return [
      {'name': 'Michael Wilson', 'email': 'michael@example.com'},
      {'name': 'David Brown', 'email': 'david@example.com'},
      {'name': 'Lisa Anderson', 'email': 'lisa@example.com'},
      {'name': 'Chris Taylor', 'email': 'chris@example.com'},
    ].where((member) => !currentMemberNames.contains(member['name'])).toList();
  }
  final Set<int> _selectedMembers = {};
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  String _selectedRole = 'Member';

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
      ),
      backgroundColor: Theme.of(context).colorScheme.surface,
      child: Container(
        width: 400,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.8,
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Add Team Member',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                IconButton(
                  icon: Icon(
                    Icons.close,
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 24),
            
            // Tab buttons
            Row(
              children: [
                Expanded(
                  child: _TabButton(
                    title: 'Existing Member',
                    isSelected: _selectedTab == 0,
                    onTap: () => setState(() => _selectedTab = 0),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _TabButton(
                    title: 'New Member',
                    isSelected: _selectedTab == 1,
                    onTap: () => setState(() => _selectedTab = 1),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            
            // Tab content
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_selectedTab == 0) ...[
              Text(
                'Select Members to Add',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                constraints: const BoxConstraints(maxHeight: 200),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: _existingMembers.length,
                  itemBuilder: (context, index) {
                    final member = _existingMembers[index];
                    return InkWell(
                      onTap: () {
                        setState(() {
                          if (_selectedMembers.contains(index)) {
                            _selectedMembers.remove(index);
                          } else {
                            _selectedMembers.add(index);
                          }
                        });
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Checkbox(
                              value: _selectedMembers.contains(index),
                              onChanged: (value) {
                                setState(() {
                                  if (value == true) {
                                    _selectedMembers.add(index);
                                  } else {
                                    _selectedMembers.remove(index);
                                  }
                                });
                              },
                              activeColor: Colors.blue,
                              checkColor: Colors.white,
                            ),
                            const SizedBox(width: 12),
                            CircleAvatar(
                              radius: 16,
                              backgroundColor: Colors.blue.withValues(alpha: 0.1),
                              child: Text(
                                member['name']![0],
                                style: TextStyle(
                                  color: Colors.blue,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    member['name']!,
                                    style: TextStyle(
                                      color: Theme.of(context).colorScheme.onSurface,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  Text(
                                    member['email']!,
                                    style: TextStyle(
                                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ] else ...[
              // Full Name field
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Full Name',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _nameController,
                    decoration: InputDecoration(
                      hintText: 'John Doe',
                      hintStyle: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                      ),
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                        borderSide: BorderSide(
                          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                        borderSide: BorderSide(
                          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                        borderSide: BorderSide(
                          color: Colors.blue,
                          width: 2,
                        ),
                      ),
                    ),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // Email Address field
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Email Address',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _emailController,
                    decoration: InputDecoration(
                      hintText: 'john@company.com',
                      hintStyle: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                      ),
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                        borderSide: BorderSide(
                          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                        borderSide: BorderSide(
                          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                        borderSide: BorderSide(
                          color: Colors.blue,
                          width: 2,
                        ),
                      ),
                    ),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // Role dropdown
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Role',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(5),
                      border: Border.all(
                        color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                      ),
                    ),
                    child: DropdownButtonFormField<String>(
                      value: _selectedRole,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: InputBorder.none,
                      ),
                      dropdownColor: Theme.of(context).colorScheme.surface,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                      ),
                      icon: Icon(
                        Icons.arrow_drop_down,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      ),
                      items: ['Member', 'Admin', 'Viewer', 'Manager'].map((String role) {
                        return DropdownMenuItem<String>(
                          value: role,
                          child: Text(role),
                        );
                      }).toList(),
                      onChanged: (String? newValue) {
                        setState(() {
                          _selectedRole = newValue ?? 'Member';
                        });
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // Profile Picture upload
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Profile Picture (Optional)',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () {
                      // TODO: Implement image picker
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('Image picker not implemented'),
                          backgroundColor: Theme.of(context).colorScheme.error,
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(5),
                    child: Container(
                      height: 120,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                          style: BorderStyle.solid,
                          width: 2,
                        ),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.upload,
                              size: 32,
                              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Click to upload profile picture',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'PNG, JPG up to 5MB',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Action buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (_selectedTab == 0) ...[
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _selectedMembers.isNotEmpty
                          ? () {
                              // Get parent state to add members
                              final parentState = context.findAncestorStateOfType<_ProjectDashboardScreenState>();
                              if (parentState != null) {
                                // Add selected members to team
                                final selectedMembersList = _selectedMembers.map((index) {
                                  final member = _existingMembers[index];
                                  return ProjectTeamMember(
                                    name: member['name']!,
                                    email: member['email']!,
                                    role: 'Member',
                                    taskCount: 0,
                                  );
                                }).toList();
                                
                                parentState._addTeamMembers(selectedMembersList);
                              }
                              
                              Navigator.of(context).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Added ${_selectedMembers.length} member(s)'),
                                  backgroundColor: Colors.blue,
                                ),
                              );
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: Colors.blue.withValues(alpha: 0.5),
                        disabledForegroundColor: Colors.white.withOpacity(0.7),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                      child: const Text('Add Selected Members'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ),
                ],
                if (_selectedTab == 1) ...[
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        // Validate inputs
                        if (_nameController.text.trim().isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Please enter a name'),
                              backgroundColor: Theme.of(context).colorScheme.error,
                            ),
                          );
                          return;
                        }
                        
                        if (_emailController.text.trim().isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Please enter an email address'),
                              backgroundColor: Theme.of(context).colorScheme.error,
                            ),
                          );
                          return;
                        }
                        
                        // Basic email validation
                        final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
                        if (!emailRegex.hasMatch(_emailController.text.trim())) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Please enter a valid email address'),
                              backgroundColor: Theme.of(context).colorScheme.error,
                            ),
                          );
                          return;
                        }
                        
                        // All validations passed - create the team member
                        final parentState = context.findAncestorStateOfType<_ProjectDashboardScreenState>();
                        if (parentState != null) {
                          final newMember = ProjectTeamMember(
                            name: _nameController.text.trim(),
                            email: _emailController.text.trim(),
                            role: _selectedRole,
                            taskCount: 0,
                          );
                          parentState._addTeamMembers([newMember]);
                        }
                        
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Team member created: ${_nameController.text.trim()} ($_selectedRole)'),
                            backgroundColor: Colors.blue,
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                      child: const Text('New Member'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: BorderSide(
                            color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
                          ),
                        ),
                      ),
                      child: Text(
                        'Cancel',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }
}

class _TabButton extends StatelessWidget {
  final String title;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabButton({
    required this.title,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(5),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? Colors.transparent
              : Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
          borderRadius: BorderRadius.circular(5),
          border: Border.all(
            color: isSelected
                ? Colors.blue
                : Colors.transparent,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Center(
          child: Text(
            title,
            style: TextStyle(
              color: isSelected
                  ? Colors.blue
                  : Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}

// ProjectTeamMember model for storing team member information
class ProjectTeamMember {
  final String name;
  final String email;
  final String role;
  final int taskCount;
  
  ProjectTeamMember({
    required this.name,
    required this.email,
    required this.role,
    required this.taskCount,
  });
}

extension _ProjectDashboardScreenExtension on _ProjectDashboardScreenState {
  Widget _buildExpandableProjectCard({
    required String name,
    required double progress,
    required Color color,
    required IconData icon,
    required int taskCount,
    required int daysLeft,
    required List<Map<String, dynamic>> tasks,
    required List<String> teamAvatars,
    required String dueDate,
    bool isCompleted = false,
  }) {
    return StatefulBuilder(
      builder: (context, setLocalState) {
        final isExpanded = _expandedProjects[name] ?? false;
        
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF252837)
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(5),
          ),
          child: Column(
            children: [
              // Collapsible header
              InkWell(
                onTap: () {
                  // Update the main state
                  _expandedProjects[name] = !isExpanded;
                  // Update local state to trigger rebuild
                  setLocalState(() {});
                },
            borderRadius: BorderRadius.circular(5),
            child: Container(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      icon,
                      color: Colors.white,
                      size: 14,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 3),
                        // Progress bar
                        Container(
                          height: 3,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(1.5),
                          ),
                          child: FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: progress,
                            child: Container(
                              decoration: BoxDecoration(
                                color: color,
                                borderRadius: BorderRadius.circular(1.5),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${(progress * 100).toInt()}%',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
          
          // Expandable content
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 200),
            crossFadeState: isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            firstChild: const SizedBox.shrink(),
            secondChild: Container(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Task stats
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.check_circle, color: Colors.white, size: 10),
                            const SizedBox(width: 3),
                            Text(
                              taskCount.toString(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        'Tasks',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontSize: 11,
                        ),
                      ),
                      const Spacer(),
                      if (!isCompleted) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: daysLeft <= 7 ? const Color(0xFFDC2626) : const Color(0xFF1E40AF),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.schedule, color: Colors.white, size: 10),
                              const SizedBox(width: 3),
                              Text(
                                '${daysLeft}d',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          'Left',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ],
                  ),
                  
                  // Recent Tasks (only if tasks exist)
                  if (tasks.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Recent Tasks',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Column(
                      children: tasks.map((task) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: _buildTaskItem(
                            task['title'] as String,
                            task['priority'] as TaskPriority,
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                  
                  const SizedBox(height: 12),
                  
                  // Team section
                  Row(
                    children: [
                      Icon(
                        Icons.people,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        size: 14,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Team (${teamAvatars.length})',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        'Due',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        dueDate,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  
                  // Team avatars
                  Row(
                    children: teamAvatars.asMap().entries.map((entry) {
                      final index = entry.key;
                      final avatar = entry.value;
                      final colors = [
                        const Color(0xFF3B82F6),
                        const Color(0xFF10B981), 
                        const Color(0xFFF59E0B),
                        const Color(0xFFEF4444),
                        const Color(0xFF8B5CF6),
                        const Color(0xFF06B6D4),
                      ];
                      return Padding(
                        padding: EdgeInsets.only(right: index < teamAvatars.length - 1 ? 8 : 0),
                        child: _buildAvatar(avatar, colors[index % colors.length]),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  });
  }

  Widget _buildTaskItem(String title, TaskPriority priority) {
    return Row(
      children: [
        CustomPaint(
          size: const Size(6, 6),
          painter: _TrianglePainter(_getPriorityColor(priority)),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 11,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildAvatar(String letter, Color color) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          letter,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }


  Color _getPriorityColor(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.high:
        return const Color(0xFFDC2626);
      case TaskPriority.medium:
        return const Color(0xFFF59E0B);
      case TaskPriority.low:
        return const Color(0xFF10B981);
    }
  }

  Widget _buildDrawerTaskItem(Task task) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF1A1D2B)
            : Colors.grey[100],
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        children: [
          // Checkbox indicator
          Container(
            width: 16,
            height: 16,
            margin: const EdgeInsets.only(right: 10),
            decoration: BoxDecoration(
              border: Border.all(
                color: task.status == TaskStatus.completed
                    ? AppTheme.infoLight
                    : Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
                width: 2,
              ),
              borderRadius: BorderRadius.circular(3),
              color: task.status == TaskStatus.completed
                  ? AppTheme.infoLight
                  : Colors.transparent,
            ),
            child: task.status == TaskStatus.completed
                ? const Icon(
                    Icons.check,
                    size: 12,
                    color: Colors.white,
                  )
                : null,
          ),
          // Task title
          Expanded(
            child: Text(
              task.title,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                decoration: task.status == TaskStatus.completed
                    ? TextDecoration.lineThrough
                    : null,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.todo:
        return const Color(0xFF6366F1);
      case TaskStatus.inProgress:
        return const Color(0xFFF59E0B);
      case TaskStatus.completed:
        return const Color(0xFF10B981);
      case TaskStatus.cancelled:
        return const Color(0xFFEF4444);
    }
  }

  String _getStatusText(TaskStatus status) {
    switch (status) {
      case TaskStatus.todo:
        return 'TO DO';
      case TaskStatus.inProgress:
        return 'IN PROGRESS';
      case TaskStatus.completed:
        return 'DONE';
      case TaskStatus.cancelled:
        return 'CANCELLED';
    }
  }
}

class _TrianglePainter extends CustomPainter {
  final Color color;
  
  _TrianglePainter(this.color);
  
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
      
    final path = Path();
    path.moveTo(0, size.height);
    path.lineTo(size.width / 2, 0);
    path.lineTo(size.width, size.height);
    path.close();
    
    canvas.drawPath(path, paint);
  }
  
  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}