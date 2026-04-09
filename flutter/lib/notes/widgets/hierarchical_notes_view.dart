import 'package:flutter/material.dart';
import '../note.dart';
import '../notes_service.dart';
import 'share_note_dialog.dart';
import '../../config/app_config.dart';

class HierarchicalNotesView extends StatefulWidget {
  final List<Note> notes;
  final Function(Note)? onNoteTap;
  final Function(Note)? onNoteEdit;
  final Function(Note)? onNoteDelete;
  final Function(String? parentId)? onCreateNote;
  final Function(Note, Note)? onMoveNote;
  final bool showActions;

  const HierarchicalNotesView({
    Key? key,
    required this.notes,
    this.onNoteTap,
    this.onNoteEdit,
    this.onNoteDelete,
    this.onCreateNote,
    this.onMoveNote,
    this.showActions = true,
  }) : super(key: key);

  @override
  State<HierarchicalNotesView> createState() => _HierarchicalNotesViewState();
}

class _HierarchicalNotesViewState extends State<HierarchicalNotesView> {
  final NotesService _notesService = NotesService();
  final Set<String> _expandedNotes = <String>{};
  String _searchQuery = '';
  String? _selectedFolder;
  Map<String, List<String>> _folderStructure = {};

  @override
  void initState() {
    super.initState();
    _buildFolderStructure();
  }

  void _buildFolderStructure() {
    _folderStructure.clear();
    for (final note in widget.notes) {
      final category = note.categoryId;
      if (!_folderStructure.containsKey(category)) {
        _folderStructure[category] = [];
      }
      if (!_folderStructure[category]!.contains(note.subcategory)) {
        _folderStructure[category]!.add(note.subcategory);
      }
    }
  }

  List<Note> get _filteredNotes {
    List<Note> filtered = widget.notes;

    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((note) {
        return note.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               note.content.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               note.keywords.any((keyword) => 
                 keyword.toLowerCase().contains(_searchQuery.toLowerCase()));
      }).toList();
    }

    if (_selectedFolder != null) {
      filtered = filtered.where((note) => 
        note.categoryId == _selectedFolder || 
        note.subcategory == _selectedFolder
      ).toList();
    }

    return filtered;
  }

  List<Note> get _rootNotes {
    return _filteredNotes.where((note) => note.parentId == null).toList();
  }

  List<Note> _getChildNotes(String parentId) {
    return _filteredNotes.where((note) => note.parentId == parentId).toList();
  }

  @override
  Widget build(BuildContext context) {
    _buildFolderStructure();
    
    return Column(
      children: [
        _buildSearchAndFilters(),
        _buildFolderView(),
        Expanded(child: _buildNotesTree()),
      ],
    );
  }

  Widget _buildSearchAndFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            decoration: InputDecoration(
              hintText: 'Search notes, tags, or content...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onChanged: (value) {
              setState(() => _searchQuery = value);
            },
          ),
          const SizedBox(height: 8),
          if (_selectedFolder != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: Theme.of(context).primaryColor.withOpacity(0.3),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.folder,
                    size: 16,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Filter: $_selectedFolder',
                    style: TextStyle(
                      color: Theme.of(context).primaryColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => setState(() => _selectedFolder = null),
                    child: Icon(
                      Icons.close,
                      size: 16,
                      color: Theme.of(context).primaryColor,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFolderView() {
    return Container(
      height: 120,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _buildFolderCard('All Notes', Icons.notes, null, widget.notes.length),
          ..._folderStructure.entries.map((entry) {
            final categoryIcon = _getCategoryIcon(entry.key);
            final categoryNotes = widget.notes.where((n) => n.categoryId == entry.key).length;
            return _buildFolderCard(entry.key, categoryIcon, entry.key, categoryNotes);
          }),
        ],
      ),
    );
  }

  Widget _buildFolderCard(String title, IconData icon, String? folderId, int count) {
    final isSelected = _selectedFolder == folderId;
    
    return Container(
      width: 100,
      margin: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedFolder = _selectedFolder == folderId ? null : folderId;
          });
        },
        child: Card(
          elevation: isSelected ? 4 : 1,
          color: isSelected ? Theme.of(context).primaryColor.withOpacity(0.1) : null,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 32,
                  color: isSelected ? Theme.of(context).primaryColor : Colors.grey[600],
                ),
                const SizedBox(height: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? Theme.of(context).primaryColor : null,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNotesTree() {
    final rootNotes = _rootNotes;
    
    if (rootNotes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.note_add,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty ? 'No notes found' : 'No notes yet',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            if (widget.onCreateNote != null && _searchQuery.isEmpty)
              ElevatedButton.icon(
                onPressed: () => widget.onCreateNote!(null),
                icon: const Icon(Icons.add),
                label: const Text('Create Note'),
              ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: rootNotes.length,
      itemBuilder: (context, index) {
        final note = rootNotes[index];
        return _buildNoteItem(note, 0);
      },
    );
  }

  Widget _buildNoteItem(Note note, int level) {
    final hasChildren = _getChildNotes(note.id).isNotEmpty;
    final isExpanded = _expandedNotes.contains(note.id);
    final children = isExpanded ? _getChildNotes(note.id) : <Note>[];

    return Column(
      children: [
        Card(
          margin: EdgeInsets.only(
            left: level * 20.0,
            bottom: 4,
          ),
          child: InkWell(
            onTap: () => widget.onNoteTap?.call(note),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  // Expand/collapse button
                  if (hasChildren)
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          if (isExpanded) {
                            _expandedNotes.remove(note.id);
                          } else {
                            _expandedNotes.add(note.id);
                          }
                        });
                      },
                      child: Icon(
                        isExpanded ? Icons.expand_less : Icons.expand_more,
                        size: 20,
                      ),
                    )
                  else
                    const SizedBox(width: 20),
                  
                  // Note icon
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: _getCategoryColor(note.categoryId).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        note.icon,
                        style: const TextStyle(fontSize: 16),
                      ),
                    ),
                  ),
                  
                  const SizedBox(width: 12),
                  
                  // Note content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                note.title,
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (note.isFavorite)
                              Icon(
                                Icons.favorite,
                                size: 16,
                                color: Colors.red[300],
                              ),
                          ],
                        ),
                        if (note.description.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            note.description,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: _getCategoryColor(note.categoryId).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                note.subcategory,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: _getCategoryColor(note.categoryId),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              _notesService.formatDateTime(note.updatedAt),
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.grey[500],
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                        if (note.keywords.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 4,
                            runSpacing: 2,
                            children: note.keywords.take(3).map((keyword) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.grey.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '#$keyword',
                                  style: TextStyle(
                                    fontSize: 9,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                  
                  // Action buttons
                  if (widget.showActions)
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert, size: 18),
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit, size: 16),
                              SizedBox(width: 8),
                              Text('Edit'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'add_child',
                          child: Row(
                            children: [
                              Icon(Icons.add, size: 16),
                              SizedBox(width: 8),
                              Text('Add Sub-note'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'favorite',
                          child: Row(
                            children: [
                              Icon(Icons.favorite_border, size: 16),
                              SizedBox(width: 8),
                              Text('Toggle Favorite'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'share',
                          child: Row(
                            children: [
                              Icon(Icons.share, size: 16),
                              SizedBox(width: 8),
                              Text('Share'),
                            ],
                          ),
                        ),
                        const PopupMenuDivider(),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, size: 16, color: Colors.red),
                              SizedBox(width: 8),
                              Text('Delete', style: TextStyle(color: Colors.red)),
                            ],
                          ),
                        ),
                      ],
                      onSelected: (value) => _handleNoteAction(value, note),
                    ),
                ],
              ),
            ),
          ),
        ),
        // Child notes
        if (isExpanded)
          ...children.map((child) => _buildNoteItem(child, level + 1)),
      ],
    );
  }

  void _handleNoteAction(String action, Note note) {
    switch (action) {
      case 'edit':
        widget.onNoteEdit?.call(note);
        break;
      case 'add_child':
        widget.onCreateNote?.call(note.id);
        break;
      case 'favorite':
        _notesService.toggleFavorite(note.id);
        setState(() {});
        break;
      case 'share':
        _showShareDialog(note);
        break;
      case 'delete':
        _showDeleteConfirmation(note);
        break;
    }
  }

  Future<void> _showShareDialog(Note note) async {
    try {
      final workspaceId = await AppConfig.getCurrentWorkspaceId();
      if (workspaceId == null || workspaceId.isEmpty) {
        _showMessage('Workspace not found');
        return;
      }

      final result = await showDialog<bool>(
        context: context,
        builder: (context) => ShareNoteDialog(
          noteId: note.id,
          noteTitle: note.title,
          workspaceId: workspaceId,
          createdBy: note.createdBy,
        ),
      );

      // If sharing was successful, show success message
      if (result == true) {
        _showMessage('Note shared successfully');
      }
    } catch (e) {
      _showMessage('Error: $e');
    }
  }

  void _showDeleteConfirmation(Note note) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Note'),
        content: Text('Are you sure you want to delete "${note.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              widget.onNoteDelete?.call(note);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'work':
        return Icons.work;
      case 'personal':
        return Icons.person;
      case 'study':
        return Icons.school;
      case 'project':
        return Icons.folder_special;
      case 'meeting':
        return Icons.meeting_room;
      default:
        return Icons.note;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'work':
        return Colors.blue;
      case 'personal':
        return Colors.green;
      case 'study':
        return Colors.purple;
      case 'project':
        return Colors.orange;
      case 'meeting':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}