import 'package:flutter/material.dart';
import '../services/workspace_service.dart';
import '../services/auth_service.dart';
import '../api/services/workspace_api_service.dart';
import '../theme/app_theme.dart';

class CreateChannelDialog extends StatefulWidget {
  final Function(String name, String description, bool isPublic, List<String> memberIds) onChannelCreated;

  const CreateChannelDialog({
    super.key,
    required this.onChannelCreated,
  });

  @override
  State<CreateChannelDialog> createState() => _CreateChannelDialogState();
}

class _CreateChannelDialogState extends State<CreateChannelDialog> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _memberSearchController = TextEditingController();
  bool _makePrivate = false;

  // Workspace members
  List<WorkspaceMember> _allMembers = [];
  List<WorkspaceMember> _filteredMembers = [];
  Set<String> _selectedMemberIds = {};
  bool _isLoadingMembers = false;

  @override
  void initState() {
    super.initState();
    _fetchWorkspaceMembers();
    _memberSearchController.addListener(_filterMembers);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _memberSearchController.dispose();
    super.dispose();
  }

  /// Fetch workspace members (excluding current user)
  Future<void> _fetchWorkspaceMembers() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    final currentUserId = AuthService.instance.currentUser?.id;

    if (workspaceId == null) return;

    setState(() {
      _isLoadingMembers = true;
    });

    try {
      final response = await WorkspaceApiService().getMembers(workspaceId);
      if (response.success && response.data != null) {
        // Filter out the current user from the member list
        final membersWithoutCurrentUser = response.data!
            .where((member) => member.userId != currentUserId)
            .toList();

        setState(() {
          _allMembers = membersWithoutCurrentUser;
          _filteredMembers = membersWithoutCurrentUser;
          _isLoadingMembers = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoadingMembers = false;
      });
    }
  }

  /// Filter members based on search query
  void _filterMembers() {
    final query = _memberSearchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredMembers = _allMembers;
      } else {
        _filteredMembers = _allMembers.where((member) {
          final name = (member.name ?? '').toLowerCase();
          final email = member.email.toLowerCase();
          return name.contains(query) || email.contains(query);
        }).toList();
      }
    });
  }

  void _createChannel() {
    if (_nameController.text.trim().isNotEmpty) {
      widget.onChannelCreated(
        _nameController.text.trim(),
        _descriptionController.text.trim(),
        !_makePrivate, // isPublic
        _selectedMemberIds.toList(), // selected member IDs for private channel
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;
    
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Container(
        width: double.infinity,
        constraints: BoxConstraints(
          maxWidth: 500,
          maxHeight: screenHeight * 0.9, // Limit height to 90% of screen
        ),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(5),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isDarkMode ? Colors.grey[800]! : Colors.grey[200]!,
                    width: 1,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Text(
                    '#',
                    style: TextStyle(
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                      fontSize: 24,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Create a channel',
                    style: TextStyle(
                      color: isDarkMode ? Colors.white : Colors.black87,
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(
                      Icons.close,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                      size: 20,
                    ),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
            
            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                  // Channel name
                  Text(
                    'Channel name',
                    style: TextStyle(
                      color: isDarkMode ? Colors.white : Colors.black87,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _nameController,
                    style: TextStyle(
                      color: isDarkMode ? Colors.white : Colors.black87,
                      fontSize: 14,
                    ),
                    decoration: InputDecoration(
                      hintText: 'e.g. marketing',
                      hintStyle: TextStyle(
                        color: isDarkMode ? Colors.grey[600] : Colors.grey[500],
                        fontSize: 14,
                      ),
                      filled: true,
                      fillColor: isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                          color: Color(0xFF7C5CFC),
                          width: 2,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onChanged: (value) => setState(() {}),
                  ),
                  const SizedBox(height: 16),
                  
                  // Description
                  Text(
                    'Description (optional)',
                    style: TextStyle(
                      color: isDarkMode ? Colors.white : Colors.black87,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descriptionController,
                    maxLines: 3,
                    style: TextStyle(
                      color: isDarkMode ? Colors.white : Colors.black87,
                      fontSize: 14,
                    ),
                    decoration: InputDecoration(
                      hintText: '',
                      filled: true,
                      fillColor: isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                          color: Color(0xFF7C5CFC),
                          width: 2,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Make private toggle
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Make private',
                              style: TextStyle(
                                color: isDarkMode ? Colors.white : Colors.black87,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (_makePrivate)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Select members to add to this private channel',
                                  style: TextStyle(
                                    color: isDarkMode ? Colors.grey[500] : Colors.grey[600],
                                    fontSize: 12,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Transform.scale(
                        scale: 0.8,
                        child: Switch(
                          value: _makePrivate,
                          onChanged: (value) {
                            setState(() {
                              _makePrivate = value;
                              if (!value) {
                                _selectedMemberIds.clear();
                              }
                            });
                          },
                          activeColor: context.primaryColor,
                          activeTrackColor: context.primaryColor.withValues(alpha: 0.5),
                          inactiveThumbColor: isDarkMode ? Colors.grey[600] : Colors.grey[400],
                          inactiveTrackColor: isDarkMode ? Colors.grey[800] : Colors.grey[300],
                        ),
                      ),
                    ],
                  ),

                  // Member selection (only visible when private)
                  if (_makePrivate) ...[
                    const SizedBox(height: 20),

                    // Search members
                    TextField(
                      controller: _memberSearchController,
                      style: TextStyle(
                        color: isDarkMode ? Colors.white : Colors.black87,
                        fontSize: 14,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Search members...',
                        hintStyle: TextStyle(
                          color: isDarkMode ? Colors.grey[600] : Colors.grey[500],
                          fontSize: 14,
                        ),
                        prefixIcon: Icon(
                          Icons.search,
                          color: isDarkMode ? Colors.grey[600] : Colors.grey[500],
                          size: 20,
                        ),
                        filled: true,
                        fillColor: isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(
                            color: isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(
                            color: isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(
                            color: Color(0xFF7C5CFC),
                            width: 2,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Selected members count
                    if (_selectedMemberIds.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          '${_selectedMemberIds.length} member${_selectedMemberIds.length == 1 ? '' : 's'} selected',
                          style: TextStyle(
                            color: context.primaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),

                    // Members list
                    Container(
                      height: 200,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: _isLoadingMembers
                          ? const Center(child: CircularProgressIndicator())
                          : _filteredMembers.isEmpty
                              ? Center(
                                  child: Text(
                                    'No members found',
                                    style: TextStyle(
                                      color: isDarkMode ? Colors.grey[600] : Colors.grey[500],
                                      fontSize: 14,
                                    ),
                                  ),
                                )
                              : ListView.builder(
                                  itemCount: _filteredMembers.length,
                                  itemBuilder: (context, index) {
                                    final member = _filteredMembers[index];
                                    final isSelected = _selectedMemberIds.contains(member.userId);
                                    final userName = member.name ?? member.email.split('@')[0];

                                    return CheckboxListTile(
                                      value: isSelected,
                                      onChanged: (value) {
                                        setState(() {
                                          if (value == true) {
                                            _selectedMemberIds.add(member.userId);
                                          } else {
                                            _selectedMemberIds.remove(member.userId);
                                          }
                                        });
                                      },
                                      title: Text(
                                        userName,
                                        style: TextStyle(
                                          color: isDarkMode ? Colors.white : Colors.black87,
                                          fontSize: 14,
                                        ),
                                      ),
                                      subtitle: Text(
                                        member.email,
                                        style: TextStyle(
                                          color: isDarkMode ? Colors.grey[600] : Colors.grey[500],
                                          fontSize: 12,
                                        ),
                                      ),
                                      secondary: CircleAvatar(
                                        radius: 18,
                                        backgroundColor: context.primaryColor,
                                        child: Text(
                                          userName[0].toUpperCase(),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      activeColor: context.primaryColor,
                                      checkColor: Colors.white,
                                      dense: true,
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                    );
                                  },
                                ),
                    ),
                  ],
                ],
              ),
            ),
          ),
            
            // Actions
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: isDarkMode ? Colors.grey[800]! : Colors.grey[200]!,
                    width: 1,
                  ),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _nameController.text.trim().isEmpty ? null : _createChannel,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7C5CFC),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor:
                        (isDarkMode ? Colors.grey[800] : Colors.grey[300])?.withValues(alpha: 0.5),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Create',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
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
}