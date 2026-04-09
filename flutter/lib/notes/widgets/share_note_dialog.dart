import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../api/services/workspace_api_service.dart';
import '../../api/services/notes_api_service.dart' as notes_api;
import '../../services/workspace_service.dart';
import '../../providers/auth_provider.dart';

class ShareNoteDialog extends StatefulWidget {
  final String noteId;
  final String noteTitle;
  final String workspaceId;
  final String createdBy;

  const ShareNoteDialog({
    super.key,
    required this.noteId,
    required this.noteTitle,
    required this.workspaceId,
    required this.createdBy,
  });

  @override
  State<ShareNoteDialog> createState() => _ShareNoteDialogState();
}

class _ShareNoteDialogState extends State<ShareNoteDialog> {
  final TextEditingController _searchController = TextEditingController();
  final WorkspaceApiService _workspaceApi = WorkspaceApiService();
  final notes_api.NotesApiService _notesApi = notes_api.NotesApiService();

  List<WorkspaceMember> _allMembers = [];
  List<WorkspaceMember> _filteredMembers = [];
  Set<String> _selectedUserIds = {};
  bool _isLoading = true;
  bool _isSharing = false;

  @override
  void initState() {
    super.initState();
    _loadWorkspaceMembers();
    _searchController.addListener(_filterMembers);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadWorkspaceMembers() async {
    setState(() => _isLoading = true);

    try {
      final response = await _workspaceApi.getMembers(widget.workspaceId);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _allMembers = response.data!;
          _filteredMembers = _allMembers;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('notes_editor.failed_to_load_members'.tr(args: [response.message ?? '']))),
          );
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('notes_editor.error_loading_members'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  void _filterMembers() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredMembers = _allMembers;
      } else {
        _filteredMembers = _allMembers.where((member) {
          final name = (member.name ?? '').toLowerCase();
          final email = (member.email ?? '').toLowerCase();
          return name.contains(query) || email.contains(query);
        }).toList();
      }
    });
  }

  Future<void> _shareNote() async {
    if (_selectedUserIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('notes_editor.select_member'.tr())),
      );
      return;
    }

    setState(() => _isSharing = true);

    try {
      final dto = notes_api.ShareNoteDto(userIds: _selectedUserIds.toList());
      final response = await _notesApi.shareNote(
        widget.workspaceId,
        widget.noteId,
        dto,
      );

      setState(() => _isSharing = false);

      if (mounted) {
        if (response.isSuccess) {
          Navigator.pop(context, true); // Return true to indicate success
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('notes_editor.note_shared'.tr(args: [_selectedUserIds.length.toString()])),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('notes_editor.failed_to_share'.tr(args: [response.message ?? ''])),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      setState(() => _isSharing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes_editor.error_sharing'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getInitials(String? name) {
    if (name == null || name.isEmpty) return '?';
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }

  bool get _isOwner {
    final currentUser = AuthProvider.instance.currentUser;
    // If createdBy is empty or not set, allow sharing (no owner information available)
    if (widget.createdBy.isEmpty) return true;
    // If user is not logged in, don't allow sharing
    if (currentUser == null || currentUser.id == null) return false;
    // Check if current user is the owner
    return currentUser.id == widget.createdBy;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 500,
        constraints: const BoxConstraints(maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'notes_editor.share_title'.tr(args: [widget.noteTitle]),
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'notes_editor.share_description'.tr(),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // Show content based on ownership
            if (!_isOwner)
              // Not owner message
              Expanded(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.lock_outline,
                          size: 64,
                          color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'notes_editor.owner_only_title'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'notes_editor.owner_only_description'.tr(),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else ...[
              // Search bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'notes_editor.search_members'.tr(),
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                ),
              ),

              // Members list
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _filteredMembers.isEmpty
                        ? Center(
                            child: Text(
                              _searchController.text.isEmpty
                                  ? 'notes_editor.no_members_found'.tr()
                                  : 'notes_editor.no_members_match'.tr(),
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                            ),
                          )
                        : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredMembers.length,
                          itemBuilder: (context, index) {
                            final member = _filteredMembers[index];
                            final isSelected = _selectedUserIds.contains(member.userId);

                            return InkWell(
                              onTap: () {
                                setState(() {
                                  if (isSelected) {
                                    _selectedUserIds.remove(member.userId);
                                  } else {
                                    _selectedUserIds.add(member.userId);
                                  }
                                });
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    // Checkbox
                                    Checkbox(
                                      value: isSelected,
                                      onChanged: (value) {
                                        setState(() {
                                          if (value == true) {
                                            _selectedUserIds.add(member.userId);
                                          } else {
                                            _selectedUserIds.remove(member.userId);
                                          }
                                        });
                                      },
                                    ),
                                    const SizedBox(width: 12),
                                    // Avatar
                                    CircleAvatar(
                                      radius: 20,
                                      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                                      child: Text(
                                        _getInitials(member.name),
                                        style: TextStyle(
                                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    // Name and email
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            member.name ?? 'notes_editor.unknown'.tr(),
                                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            member.email,
                                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    // Role badge
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        member.role.value,
                                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
              ),

              const Divider(height: 1),

              // Footer buttons
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _isSharing ? null : () => Navigator.pop(context),
                      child: Text('common.cancel'.tr()),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      onPressed: _isSharing ? null : _shareNote,
                      icon: _isSharing
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.share),
                      label: Text(_isSharing ? 'notes_editor.sharing'.tr() : 'common.share'.tr()),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Close button for non-owners
            if (!_isOwner)
              Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text('common.close'.tr()),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
