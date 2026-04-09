import 'package:flutter/material.dart';
import '../api/services/notes_api_service.dart' as notes_api;
import '../models/calendar_event.dart';
import '../models/file/file.dart' as file_model;
import '../theme/app_theme.dart';

/// A reusable widget for showing mention suggestions (notes, events, files)
/// Triggered by typing "/" in text fields
class MentionSuggestionWidget extends StatefulWidget {
  final List<notes_api.Note> notes;
  final List<CalendarEvent> events;
  final List<file_model.File> files;
  final Function(notes_api.Note) onNoteSelected;
  final Function(CalendarEvent) onEventSelected;
  final Function(file_model.File) onFileSelected;
  final VoidCallback onClose;
  final String? searchHint;

  const MentionSuggestionWidget({
    super.key,
    required this.notes,
    required this.events,
    required this.files,
    required this.onNoteSelected,
    required this.onEventSelected,
    required this.onFileSelected,
    required this.onClose,
    this.searchHint,
  });

  @override
  State<MentionSuggestionWidget> createState() => _MentionSuggestionWidgetState();
}

class _MentionSuggestionWidgetState extends State<MentionSuggestionWidget> {
  int _selectedTab = 0; // 0 = Notes, 1 = Events, 2 = Files
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  bool _isKeyboardVisible = false;

  List<notes_api.Note> _filteredNotes = [];
  List<CalendarEvent> _filteredEvents = [];
  List<file_model.File> _filteredFiles = [];

  @override
  void initState() {
    super.initState();
    _filteredNotes = List.from(widget.notes);
    _filteredEvents = List.from(widget.events);
    _filteredFiles = List.from(widget.files);
    _searchController.addListener(_onSearchChanged);
    _searchFocusNode.addListener(_onFocusChanged);
  }

  void _onFocusChanged() {
    setState(() {
      _isKeyboardVisible = _searchFocusNode.hasFocus;
    });
  }

  @override
  void didUpdateWidget(MentionSuggestionWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.notes != widget.notes ||
        oldWidget.events != widget.events ||
        oldWidget.files != widget.files) {
      _filterItems();
    }
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _searchFocusNode.removeListener(_onFocusChanged);
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _filterItems();
  }

  void _filterItems() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredNotes = widget.notes
          .where((note) => note.title.toLowerCase().contains(query))
          .toList();
      _filteredEvents = widget.events
          .where((event) => event.title.toLowerCase().contains(query))
          .toList();
      _filteredFiles = widget.files
          .where((file) => file.name.toLowerCase().contains(query))
          .toList();
    });
  }

  String _getSearchPlaceholder() {
    switch (_selectedTab) {
      case 0:
        return 'Type after / to search notes...';
      case 1:
        return 'Type after / to search events...';
      case 2:
        return 'Type after / to search files...';
      default:
        return 'Type after / to search...';
    }
  }

  String _getRecentLabel() {
    switch (_selectedTab) {
      case 0:
        return 'Recent notes';
      case 1:
        return 'Recent events';
      case 2:
        return 'Recent files';
      default:
        return 'Recent items';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.zero,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Tab Header with close button
          _buildTabHeader(context),

          // Search Field
          _buildSearchField(context),

          // Recent label
          _buildRecentLabel(context),

          // Content based on selected tab
          Expanded(
            child: _buildTabContent(context),
          ),
        ],
      ),
    );
  }

  Widget _buildTabHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
          ),
        ),
      ),
      child: Row(
        children: [
          // Notes Tab
          _buildTabButton(
            context,
            icon: Icons.description_outlined,
            label: 'Notes',
            isSelected: _selectedTab == 0,
            onTap: () => setState(() => _selectedTab = 0),
          ),
          const SizedBox(width: 2),

          // Events Tab
          _buildTabButton(
            context,
            icon: Icons.event_outlined,
            label: 'Events',
            isSelected: _selectedTab == 1,
            onTap: () => setState(() => _selectedTab = 1),
          ),
          const SizedBox(width: 2),

          // Files Tab
          _buildTabButton(
            context,
            icon: Icons.folder_outlined,
            label: 'Files',
            isSelected: _selectedTab == 2,
            onTap: () => setState(() => _selectedTab = 2),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? context.primaryColor : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected
                  ? Colors.white
                  : Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected
                    ? Colors.white
                    : Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchField(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: SizedBox(
        height: 32,
        child: TextField(
          controller: _searchController,
          focusNode: _searchFocusNode,
          autofocus: false, // Don't auto-focus to prevent keyboard from opening automatically
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: 'Search...',
            hintStyle: TextStyle(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              fontSize: 12,
            ),
            prefixIcon: Padding(
              padding: const EdgeInsets.only(left: 8, right: 4),
              child: Icon(
                Icons.search,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                size: 16,
              ),
            ),
            prefixIconConstraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            suffixIcon: _buildSearchSuffixIcon(context),
            suffixIconConstraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            filled: true,
            fillColor: Theme.of(context).colorScheme.onSurface.withOpacity(0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
            isDense: true,
          ),
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 12,
          ),
          onSubmitted: (_) {
            _searchFocusNode.unfocus();
          },
        ),
      ),
    );
  }

  Widget? _buildSearchSuffixIcon(BuildContext context) {
    // Show keyboard dismiss button when keyboard is visible
    if (_isKeyboardVisible) {
      return GestureDetector(
        onTap: () {
          _searchFocusNode.unfocus();
        },
        child: Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Icon(
            Icons.keyboard_hide,
            size: 18,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      );
    }
    // Show clear button when there's text
    if (_searchController.text.isNotEmpty) {
      return GestureDetector(
        onTap: () {
          _searchController.clear();
        },
        child: Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Icon(
            Icons.clear,
            size: 16,
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
          ),
        ),
      );
    }
    return null;
  }

  Widget _buildRecentLabel(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          _getRecentLabel(),
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
            fontSize: 10,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent(BuildContext context) {
    switch (_selectedTab) {
      case 0:
        return _buildNotesList(context);
      case 1:
        return _buildEventsList(context);
      case 2:
        return _buildFilesList(context);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildNotesList(BuildContext context) {
    if (_filteredNotes.isEmpty) {
      return _buildEmptyState(context, 'No notes found');
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 2),
      itemCount: _filteredNotes.length,
      itemBuilder: (context, index) {
        final note = _filteredNotes[index];
        return _buildNoteItem(context, note);
      },
    );
  }

  Widget _buildNoteItem(BuildContext context, notes_api.Note note) {
    return InkWell(
      onTap: () => widget.onNoteSelected(note),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          children: [
            Icon(
              Icons.description_outlined,
              size: 16,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                note.title,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventsList(BuildContext context) {
    if (_filteredEvents.isEmpty) {
      return _buildEmptyState(context, 'No events found');
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 2),
      itemCount: _filteredEvents.length,
      itemBuilder: (context, index) {
        final event = _filteredEvents[index];
        return _buildEventItem(context, event);
      },
    );
  }

  Widget _buildEventItem(BuildContext context, CalendarEvent event) {
    return InkWell(
      onTap: () => widget.onEventSelected(event),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Row(
          children: [
            Icon(
              Icons.event_outlined,
              size: 16,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      event.title,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${event.startTime.day}/${event.startTime.month}',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                      fontSize: 10,
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

  Widget _buildFilesList(BuildContext context) {
    if (_filteredFiles.isEmpty) {
      return _buildEmptyState(context, 'No files found');
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 2),
      itemCount: _filteredFiles.length,
      itemBuilder: (context, index) {
        final file = _filteredFiles[index];
        return _buildFileItem(context, file);
      },
    );
  }

  Widget _buildFileItem(BuildContext context, file_model.File file) {
    return InkWell(
      onTap: () => widget.onFileSelected(file),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Row(
          children: [
            Icon(
              Icons.insert_drive_file_outlined,
              size: 16,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      file.name,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _formatFileSize(file.size),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                      fontSize: 10,
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

  Widget _buildEmptyState(BuildContext context, String message) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.search_off,
              size: 28,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
            ),
            const SizedBox(height: 4),
            Text(
              message,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatFileSize(String sizeStr) {
    try {
      final bytes = int.tryParse(sizeStr) ?? 0;
      if (bytes < 1024) return '$bytes B';
      if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
      if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    } catch (e) {
      return sizeStr;
    }
  }
}
