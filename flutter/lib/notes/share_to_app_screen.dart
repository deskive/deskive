import 'package:flutter/material.dart';
import 'note.dart';

class ShareToAppScreen extends StatefulWidget {
  final Note note;

  const ShareToAppScreen({super.key, required this.note});

  @override
  State<ShareToAppScreen> createState() => _ShareToAppScreenState();
}

class _ShareToAppScreenState extends State<ShareToAppScreen> {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();
  int _selectedTab = 0; // 0: Channels, 1: Events, 2: Projects, 3: People
  final Set<String> _selectedDestinations = {};
  bool _includeFullContent = false;

  @override
  void initState() {
    super.initState();
    _messageController.text = 'Sharing note: "${widget.note.title}"';
  }

  @override
  void dispose() {
    _searchController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            const Icon(Icons.share, size: 20),
            const SizedBox(width: 8),
            const Text('Share Note to App'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Note preview card
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.description,
                  size: 24,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.note.title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '<p>${widget.note.content.length > 50 ? '${widget.note.content.substring(0, 50)}...' : widget.note.content}</p>',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Note',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '04/08/2025',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search channels, events, projects, or people...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Tab bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildTabButton(
                  icon: Icons.tag,
                  label: 'Channels',
                  index: 0,
                ),
                const SizedBox(width: 8),
                _buildTabButton(
                  icon: Icons.calendar_today,
                  label: 'Events',
                  index: 1,
                ),
                const SizedBox(width: 8),
                _buildTabButton(
                  icon: Icons.folder,
                  label: 'Projects',
                  index: 2,
                ),
                const SizedBox(width: 8),
                _buildTabButton(
                  icon: Icons.people,
                  label: 'People',
                  index: 3,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Content list
          Expanded(
            child: _buildTabContent(),
          ),

          // Bottom section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              border: Border(
                top: BorderSide(
                  color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                ),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Message (optional)',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Include full note content',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Switch(
                      value: _includeFullContent,
                      onChanged: (value) {
                        setState(() {
                          _includeFullContent = value;
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _selectedDestinations.isEmpty ? null : () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Shared to ${_selectedDestinations.length} destinations'),
                            ),
                          );
                        },
                        icon: const Icon(Icons.send, size: 18),
                        label: Text('Share to ${_selectedDestinations.length} destinations'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton({
    required IconData icon,
    required String label,
    required int index,
  }) {
    final isSelected = _selectedTab == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedTab = index;
          });
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected 
                ? Theme.of(context).colorScheme.primaryContainer
                : Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: isSelected
                    ? Theme.of(context).colorScheme.onPrimaryContainer
                    : Theme.of(context).colorScheme.onSurface,
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: isSelected
                      ? Theme.of(context).colorScheme.onPrimaryContainer
                      : Theme.of(context).colorScheme.onSurface,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent() {
    switch (_selectedTab) {
      case 0:
        return _buildChannelsList();
      case 1:
        return _buildEventsList();
      case 2:
        return _buildProjectsList();
      case 3:
        return _buildPeopleList();
      default:
        return const SizedBox();
    }
  }

  Widget _buildChannelsList() {
    final channels = [
      {'id': '1', 'name': 'general', 'members': 45, 'description': 'Company-wide announcements and discussions', 'private': false},
      {'id': '2', 'name': 'dev-team', 'members': 12, 'description': 'Development team coordination', 'private': true},
      {'id': '3', 'name': 'marketing', 'members': 8, 'description': 'Marketing campaigns and strategy', 'private': false},
      {'id': '4', 'name': 'design', 'members': 6, 'description': 'Design discussions and feedback', 'private': false},
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: channels.length,
      itemBuilder: (context, index) {
        final channel = channels[index];
        final isSelected = _selectedDestinations.contains(channel['id']);
        
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(
              color: isSelected 
                  ? Theme.of(context).colorScheme.primary
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: ListTile(
            onTap: () {
              setState(() {
                if (isSelected) {
                  _selectedDestinations.remove(channel['id']);
                } else {
                  _selectedDestinations.add(channel['id'] as String);
                }
              });
            },
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.tag,
                color: isSelected
                    ? Colors.white
                    : Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),
            title: Row(
              children: [
                Text(
                  '#${channel['name']}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                if (channel['private'] as bool) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Private',
                      style: TextStyle(
                        fontSize: 10,
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            subtitle: Text(
              '${channel['members']} members • ${channel['description']}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            trailing: isSelected
                ? Icon(
                    Icons.check_circle,
                    color: Theme.of(context).colorScheme.primary,
                  )
                : null,
          ),
        );
      },
    );
  }

  Widget _buildEventsList() {
    final events = [
      {
        'id': '1',
        'name': 'Team Standup',
        'date': '15/01/2024',
        'attendees': 8,
        'location': 'Conference Room A',
        'icon': Icons.people,
      },
      {
        'id': '2',
        'name': 'Project Review',
        'date': '16/01/2024',
        'attendees': 12,
        'location': 'Zoom Meeting',
        'icon': Icons.video_call,
      },
      {
        'id': '3',
        'name': 'Client Presentation',
        'date': '17/01/2024',
        'attendees': 6,
        'location': 'Board Room',
        'icon': Icons.business_center,
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        final isSelected = _selectedDestinations.contains(event['id']);
        
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(
              color: isSelected 
                  ? Theme.of(context).colorScheme.primary
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: ListTile(
            onTap: () {
              setState(() {
                if (isSelected) {
                  _selectedDestinations.remove(event['id']);
                } else {
                  _selectedDestinations.add(event['id'] as String);
                }
              });
            },
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Colors.green.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.calendar_today,
                color: isSelected
                    ? Colors.white
                    : Colors.green,
                size: 20,
              ),
            ),
            title: Text(
              event['name'] as String,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Row(
              children: [
                Icon(
                  Icons.calendar_today,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  event['date'] as String,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(width: 12),
                Icon(
                  Icons.people,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  '${event['attendees']} attendees',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(width: 12),
                Icon(
                  Icons.location_on,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    event['location'] as String,
                    style: Theme.of(context).textTheme.bodySmall,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            trailing: isSelected
                ? Icon(
                    Icons.check_circle,
                    color: Theme.of(context).colorScheme.primary,
                  )
                : null,
          ),
        );
      },
    );
  }

  Widget _buildProjectsList() {
    final projects = [
      {
        'id': '1',
        'name': 'Website Redesign',
        'status': 'active',
        'teamMembers': 8,
        'completion': 65,
      },
      {
        'id': '2',
        'name': 'Mobile App',
        'status': 'planning',
        'teamMembers': 5,
        'completion': 15,
      },
      {
        'id': '3',
        'name': 'Data Migration',
        'status': 'active',
        'teamMembers': 4,
        'completion': 80,
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: projects.length,
      itemBuilder: (context, index) {
        final project = projects[index];
        final isSelected = _selectedDestinations.contains(project['id']);
        
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(
              color: isSelected 
                  ? Theme.of(context).colorScheme.primary
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: ListTile(
            onTap: () {
              setState(() {
                if (isSelected) {
                  _selectedDestinations.remove(project['id']);
                } else {
                  _selectedDestinations.add(project['id'] as String);
                }
              });
            },
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Colors.purple.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.folder,
                color: isSelected
                    ? Colors.white
                    : Colors.purple,
                size: 20,
              ),
            ),
            title: Row(
              children: [
                Expanded(
                  child: Text(
                    project['name'] as String,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: project['status'] == 'active'
                        ? Colors.blue
                        : Colors.orange,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    project['status'] as String,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            subtitle: Row(
              children: [
                Icon(
                  Icons.people,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  '${project['teamMembers']} team members',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(width: 12),
                Text(
                  '• ${project['completion']}% complete',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            trailing: isSelected
                ? Icon(
                    Icons.check_circle,
                    color: Theme.of(context).colorScheme.primary,
                  )
                : null,
          ),
        );
      },
    );
  }

  Widget _buildPeopleList() {
    final people = [
      {
        'id': '1',
        'name': 'John Doe',
        'email': 'john.doe@company.com',
        'avatar': '👨',
        'isOnline': true,
      },
      {
        'id': '2',
        'name': 'Jane Smith',
        'email': 'jane.smith@company.com',
        'avatar': '👩',
        'isOnline': true,
      },
      {
        'id': '3',
        'name': 'Bob Wilson',
        'email': 'bob.wilson@company.com',
        'avatar': '🧑‍🦰',
        'isOnline': false,
      },
      {
        'id': '4',
        'name': 'Alice Brown',
        'email': 'alice.brown@company.com',
        'avatar': '👩‍💼',
        'isOnline': true,
      },
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: people.length,
      itemBuilder: (context, index) {
        final person = people[index];
        final isSelected = _selectedDestinations.contains(person['id']);
        
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(
              color: isSelected 
                  ? Theme.of(context).colorScheme.primary
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: ListTile(
            onTap: () {
              setState(() {
                if (isSelected) {
                  _selectedDestinations.remove(person['id']);
                } else {
                  _selectedDestinations.add(person['id'] as String);
                }
              });
            },
            leading: Stack(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      person['avatar'] as String,
                      style: const TextStyle(fontSize: 20),
                    ),
                  ),
                ),
                if (person['isOnline'] as bool)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Theme.of(context).colorScheme.surface,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            title: Text(
              person['name'] as String,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Text(
              person['email'] as String,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            trailing: isSelected
                ? Icon(
                    Icons.check_circle,
                    color: Theme.of(context).colorScheme.primary,
                  )
                : null,
          ),
        );
      },
    );
  }
}