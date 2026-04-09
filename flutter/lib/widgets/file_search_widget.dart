import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/file_service.dart';
import '../api/services/file_api_service.dart';

/// Widget for searching and filtering files
class FileSearchWidget extends StatefulWidget {
  final Function(List<FileModel>) onResults;
  final VoidCallback? onClearSearch;
  final String? initialQuery;

  const FileSearchWidget({
    super.key,
    required this.onResults,
    this.onClearSearch,
    this.initialQuery,
  });

  @override
  State<FileSearchWidget> createState() => _FileSearchWidgetState();
}

class _FileSearchWidgetState extends State<FileSearchWidget> {
  late TextEditingController _searchController;
  final FocusNode _searchFocusNode = FocusNode();
  
  bool _isSearching = false;
  bool _hasSearched = false;
  String _currentQuery = '';
  
  // Filters
  String? _selectedMimeType;
  DateTime? _dateFrom;
  DateTime? _dateTo;
  String? _uploadedBy;
  
  final List<String> _commonMimeTypes = [
    'image/jpeg',
    'image/png', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4',
    'audio/mpeg',
  ];

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.initialQuery ?? '');
    if (widget.initialQuery?.isNotEmpty == true) {
      _currentQuery = widget.initialQuery!;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _performSearch();
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Search bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              // Search input
              TextField(
                controller: _searchController,
                focusNode: _searchFocusNode,
                decoration: InputDecoration(
                  hintText: 'Search files...',
                  prefixIcon: _isSearching
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : const Icon(Icons.search),
                  suffixIcon: _currentQuery.isNotEmpty
                      ? IconButton(
                          onPressed: _clearSearch,
                          icon: const Icon(Icons.clear),
                          tooltip: 'Clear search',
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                textInputAction: TextInputAction.search,
                onChanged: (value) {
                  setState(() {
                    _currentQuery = value;
                  });
                },
                onSubmitted: (value) {
                  if (value.trim().isNotEmpty) {
                    _performSearch();
                  }
                },
              ),
              
              const SizedBox(height: 12),
              
              // Filter controls
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _currentQuery.trim().isEmpty ? null : _performSearch,
                      icon: const Icon(Icons.search, size: 16),
                      label: const Text('Search'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: _showFiltersDialog,
                    icon: const Icon(Icons.filter_list, size: 16),
                    label: Text(_getFilterCount() > 0 ? 'Filters (${_getFilterCount()})' : 'Filters'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _getFilterCount() > 0 
                          ? Theme.of(context).primaryColor.withOpacity(0.1)
                          : null,
                    ),
                  ),
                  if (_hasSearched) ...[
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: _clearSearch,
                      icon: const Icon(Icons.clear),
                      tooltip: 'Clear all',
                    ),
                  ],
                ],
              ),
              
              // Active filters display
              if (_getFilterCount() > 0) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: _buildFilterChips(),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _buildFilterChips() {
    List<Widget> chips = [];
    
    if (_selectedMimeType != null) {
      chips.add(
        FilterChip(
          label: Text(_getMimeTypeDisplayName(_selectedMimeType!)),
          onDeleted: () {
            setState(() {
              _selectedMimeType = null;
            });
            if (_hasSearched) _performSearch();
          },
        ),
      );
    }
    
    if (_dateFrom != null) {
      chips.add(
        FilterChip(
          label: Text('From: ${_formatDate(_dateFrom!)}'),
          onDeleted: () {
            setState(() {
              _dateFrom = null;
            });
            if (_hasSearched) _performSearch();
          },
        ),
      );
    }
    
    if (_dateTo != null) {
      chips.add(
        FilterChip(
          label: Text('To: ${_formatDate(_dateTo!)}'),
          onDeleted: () {
            setState(() {
              _dateTo = null;
            });
            if (_hasSearched) _performSearch();
          },
        ),
      );
    }
    
    if (_uploadedBy != null) {
      chips.add(
        FilterChip(
          label: Text('By: $_uploadedBy'),
          onDeleted: () {
            setState(() {
              _uploadedBy = null;
            });
            if (_hasSearched) _performSearch();
          },
        ),
      );
    }
    
    return chips;
  }

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _isSearching = true;
    });

    try {
      final fileService = Provider.of<FileService>(context, listen: false);
      final response = await fileService.searchFiles(
        query: query,
        mimeType: _selectedMimeType,
        uploadedBy: _uploadedBy,
        dateFrom: _dateFrom,
        dateTo: _dateTo,
      );

      if (mounted) {
        setState(() {
          _isSearching = false;
          _hasSearched = true;
        });

        if (response.success && response.data != null) {
          widget.onResults(response.data!.data);
          
          // Show search results info
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Found ${response.data!.totalItems} files'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 2),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Search failed: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
          widget.onResults([]);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Search error: $e'),
            backgroundColor: Colors.red,
          ),
        );
        widget.onResults([]);
      }
    }
  }

  void _clearSearch() {
    setState(() {
      _searchController.clear();
      _currentQuery = '';
      _hasSearched = false;
      _selectedMimeType = null;
      _dateFrom = null;
      _dateTo = null;
      _uploadedBy = null;
    });
    
    widget.onClearSearch?.call();
  }

  void _showFiltersDialog() {
    showDialog(
      context: context,
      builder: (context) => SearchFiltersDialog(
        selectedMimeType: _selectedMimeType,
        dateFrom: _dateFrom,
        dateTo: _dateTo,
        uploadedBy: _uploadedBy,
        mimeTypes: _commonMimeTypes,
        onFiltersChanged: (mimeType, dateFrom, dateTo, uploadedBy) {
          setState(() {
            _selectedMimeType = mimeType;
            _dateFrom = dateFrom;
            _dateTo = dateTo;
            _uploadedBy = uploadedBy;
          });
          if (_hasSearched) {
            _performSearch();
          }
        },
      ),
    );
  }

  int _getFilterCount() {
    int count = 0;
    if (_selectedMimeType != null) count++;
    if (_dateFrom != null) count++;
    if (_dateTo != null) count++;
    if (_uploadedBy != null) count++;
    return count;
  }

  String _getMimeTypeDisplayName(String mimeType) {
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'JPEG Images';
      case 'image/png':
        return 'PNG Images';
      case 'application/pdf':
        return 'PDF Documents';
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'Word Documents';
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 'Excel Spreadsheets';
      case 'text/plain':
        return 'Text Files';
      case 'video/mp4':
        return 'MP4 Videos';
      case 'audio/mpeg':
        return 'MP3 Audio';
      default:
        return mimeType.split('/').last.toUpperCase();
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}

/// Dialog for advanced search filters
class SearchFiltersDialog extends StatefulWidget {
  final String? selectedMimeType;
  final DateTime? dateFrom;
  final DateTime? dateTo;
  final String? uploadedBy;
  final List<String> mimeTypes;
  final Function(String?, DateTime?, DateTime?, String?) onFiltersChanged;

  const SearchFiltersDialog({
    super.key,
    this.selectedMimeType,
    this.dateFrom,
    this.dateTo,
    this.uploadedBy,
    required this.mimeTypes,
    required this.onFiltersChanged,
  });

  @override
  State<SearchFiltersDialog> createState() => _SearchFiltersDialogState();
}

class _SearchFiltersDialogState extends State<SearchFiltersDialog> {
  late String? _selectedMimeType;
  late DateTime? _dateFrom;
  late DateTime? _dateTo;
  late TextEditingController _uploadedByController;

  @override
  void initState() {
    super.initState();
    _selectedMimeType = widget.selectedMimeType;
    _dateFrom = widget.dateFrom;
    _dateTo = widget.dateTo;
    _uploadedByController = TextEditingController(text: widget.uploadedBy ?? '');
  }

  @override
  void dispose() {
    _uploadedByController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(
                  Icons.filter_list,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Search Filters',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // File type filter
                    Text(
                      'File Type',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String?>(
                      value: _selectedMimeType,
                      decoration: const InputDecoration(
                        hintText: 'All file types',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text('All file types'),
                        ),
                        ...widget.mimeTypes.map((mimeType) => DropdownMenuItem(
                              value: mimeType,
                              child: Row(
                                children: [
                                  Icon(_getMimeTypeIcon(mimeType), size: 16),
                                  const SizedBox(width: 8),
                                  Text(_getMimeTypeDisplayName(mimeType)),
                                ],
                              ),
                            )),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedMimeType = value;
                        });
                      },
                    ),
                    
                    const SizedBox(height: 24),
                    
                    // Date range filter
                    Text(
                      'Date Range',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ListTile(
                            leading: const Icon(Icons.calendar_today),
                            title: Text(_dateFrom?.toString().split(' ')[0] ?? 'From date'),
                            subtitle: _dateFrom != null ? null : const Text('Select start date'),
                            onTap: () => _selectDate(true),
                            shape: RoundedRectangleBorder(
                              side: BorderSide(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ListTile(
                            leading: const Icon(Icons.calendar_today),
                            title: Text(_dateTo?.toString().split(' ')[0] ?? 'To date'),
                            subtitle: _dateTo != null ? null : const Text('Select end date'),
                            onTap: () => _selectDate(false),
                            shape: RoundedRectangleBorder(
                              side: BorderSide(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                      ],
                    ),
                    
                    if (_dateFrom != null || _dateTo != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          if (_dateFrom != null)
                            TextButton(
                              onPressed: () => setState(() => _dateFrom = null),
                              child: const Text('Clear from date'),
                            ),
                          if (_dateTo != null)
                            TextButton(
                              onPressed: () => setState(() => _dateTo = null),
                              child: const Text('Clear to date'),
                            ),
                        ],
                      ),
                    ],
                    
                    const SizedBox(height: 24),
                    
                    // Uploaded by filter
                    Text(
                      'Uploaded By',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _uploadedByController,
                      decoration: const InputDecoration(
                        hintText: 'Username or user ID',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Actions
            Row(
              children: [
                TextButton(
                  onPressed: _clearAllFilters,
                  child: const Text('Clear All'),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _applyFilters,
                  child: const Text('Apply Filters'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectDate(bool isFromDate) async {
    final date = await showDatePicker(
      context: context,
      initialDate: isFromDate 
          ? (_dateFrom ?? DateTime.now())
          : (_dateTo ?? DateTime.now()),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    
    if (date != null) {
      setState(() {
        if (isFromDate) {
          _dateFrom = date;
        } else {
          _dateTo = date;
        }
      });
    }
  }

  void _clearAllFilters() {
    setState(() {
      _selectedMimeType = null;
      _dateFrom = null;
      _dateTo = null;
      _uploadedByController.clear();
    });
  }

  void _applyFilters() {
    widget.onFiltersChanged(
      _selectedMimeType,
      _dateFrom,
      _dateTo,
      _uploadedByController.text.trim().isEmpty ? null : _uploadedByController.text.trim(),
    );
    Navigator.of(context).pop();
  }

  IconData _getMimeTypeIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.video_file;
    if (mimeType.startsWith('audio/')) return Icons.audio_file;
    if (mimeType == 'application/pdf') return Icons.picture_as_pdf;
    if (mimeType.contains('word') || mimeType.contains('document')) return Icons.description;
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) return Icons.table_chart;
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) return Icons.slideshow;
    if (mimeType.startsWith('text/')) return Icons.text_fields;
    if (mimeType.contains('zip') || mimeType.contains('archive')) return Icons.archive;
    return Icons.insert_drive_file;
  }

  String _getMimeTypeDisplayName(String mimeType) {
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'JPEG Images';
      case 'image/png':
        return 'PNG Images';
      case 'application/pdf':
        return 'PDF Documents';
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'Word Documents';
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 'Excel Spreadsheets';
      case 'text/plain':
        return 'Text Files';
      case 'video/mp4':
        return 'MP4 Videos';
      case 'audio/mpeg':
        return 'MP3 Audio';
      default:
        return mimeType.split('/').last.toUpperCase();
    }
  }
}

/// Quick search bar widget for embedding in app bars
class QuickSearchBar extends StatefulWidget {
  final Function(String) onSearch;
  final VoidCallback? onClear;
  final String? hintText;

  const QuickSearchBar({
    super.key,
    required this.onSearch,
    this.onClear,
    this.hintText,
  });

  @override
  State<QuickSearchBar> createState() => _QuickSearchBarState();
}

class _QuickSearchBarState extends State<QuickSearchBar> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 40,
      constraints: const BoxConstraints(maxWidth: 300),
      child: TextField(
        controller: _controller,
        focusNode: _focusNode,
        decoration: InputDecoration(
          hintText: widget.hintText ?? 'Search...',
          prefixIcon: const Icon(Icons.search, size: 20),
          suffixIcon: _controller.text.isNotEmpty
              ? IconButton(
                  onPressed: () {
                    _controller.clear();
                    widget.onClear?.call();
                    setState(() {});
                  },
                  icon: const Icon(Icons.clear, size: 20),
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.grey.shade100,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
        ),
        textInputAction: TextInputAction.search,
        onChanged: (value) => setState(() {}),
        onSubmitted: widget.onSearch,
      ),
    );
  }
}