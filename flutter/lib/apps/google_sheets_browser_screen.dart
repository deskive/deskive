import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import 'models/google_sheets_models.dart';
import 'services/google_sheets_service.dart';
import 'google_sheets_editor_screen.dart';

/// Helper to format names for display (replace underscores with spaces)
String _formatDisplayName(String name) {
  return name.replaceAll('_', ' ');
}

/// Screen to browse and manage Google Sheets spreadsheets
class GoogleSheetsBrowserScreen extends StatefulWidget {
  const GoogleSheetsBrowserScreen({super.key});

  @override
  State<GoogleSheetsBrowserScreen> createState() => _GoogleSheetsBrowserScreenState();
}

class _GoogleSheetsBrowserScreenState extends State<GoogleSheetsBrowserScreen> {
  final GoogleSheetsService _sheetsService = GoogleSheetsService.instance;
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<GoogleSpreadsheet> _spreadsheets = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _currentPage = 1;
  String? _error;
  String _searchQuery = '';
  bool _isTokenError = false;
  bool _isReconnecting = false;

  @override
  void initState() {
    super.initState();
    _loadSpreadsheets();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _hasMore) {
      _loadMoreSpreadsheets();
    }
  }

  /// Check if error message indicates token expiration/revocation
  bool _isTokenExpiredError(String error) {
    final lowerError = error.toLowerCase();
    return lowerError.contains('token') &&
        (lowerError.contains('expired') ||
            lowerError.contains('revoked') ||
            lowerError.contains('invalid'));
  }

  Future<void> _loadSpreadsheets() async {
    setState(() {
      _isLoading = true;
      _error = null;
      _isTokenError = false;
      _currentPage = 1;
    });

    try {
      final response = await _sheetsService.listSpreadsheets(
        page: 1,
        limit: 20,
        query: _searchQuery.isNotEmpty ? _searchQuery : null,
      );

      if (mounted) {
        setState(() {
          _spreadsheets = response.spreadsheets;
          _hasMore = response.hasMore;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        final errorStr = e.toString();
        setState(() {
          _error = errorStr;
          _isTokenError = _isTokenExpiredError(errorStr);
          _isLoading = false;
        });
      }
    }
  }

  /// Reconnect Google Sheets using native sign-in
  Future<void> _reconnect() async {
    setState(() => _isReconnecting = true);

    try {
      final connection = await _sheetsService.connect();
      if (connection != null && mounted) {
        // Successfully reconnected, reload spreadsheets
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_sheets.reconnected'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        await _loadSpreadsheets();
      }
    } catch (e) {
      if (mounted) {
        // Don't show error for user cancellation
        if (!e.toString().contains('cancelled') &&
            !e.toString().contains('canceled')) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('apps.google_sheets.reconnect_failed'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isReconnecting = false);
      }
    }
  }

  Future<void> _loadMoreSpreadsheets() async {
    if (_isLoadingMore || !_hasMore) return;

    setState(() => _isLoadingMore = true);

    try {
      final response = await _sheetsService.listSpreadsheets(
        page: _currentPage + 1,
        limit: 20,
        query: _searchQuery.isNotEmpty ? _searchQuery : null,
      );

      if (mounted) {
        setState(() {
          _spreadsheets.addAll(response.spreadsheets);
          _currentPage++;
          _hasMore = response.hasMore;
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingMore = false);
      }
    }
  }

  void _onSearch(String query) {
    setState(() => _searchQuery = query);
    _loadSpreadsheets();
  }

  Future<void> _openSpreadsheet(GoogleSpreadsheet spreadsheet) async {
    if (spreadsheet.url != null) {
      final uri = Uri.parse(spreadsheet.url!);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } else {
      // Open in Google Sheets using the spreadsheet ID
      final uri = Uri.parse('https://docs.google.com/spreadsheets/d/${spreadsheet.id}/edit');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }

  void _showSpreadsheetDetails(GoogleSpreadsheet spreadsheet) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _SpreadsheetDetailScreen(spreadsheet: spreadsheet),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('apps.google_sheets.browser_title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSpreadsheets,
            tooltip: 'common.refresh'.tr(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'apps.google_sheets.search_hint'.tr(),
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onSubmitted: _onSearch,
            ),
          ),

          // Content
          Expanded(
            child: _buildContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                _isTokenError ? Icons.link_off : Icons.error_outline,
                size: 64,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(
                _isTokenError
                    ? 'apps.google_sheets.session_expired'.tr()
                    : 'apps.google_sheets.error_loading'.tr(),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _isTokenError
                    ? 'apps.google_sheets.session_expired_message'.tr()
                    : _error!,
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              if (_isTokenError)
                FilledButton.icon(
                  onPressed: _isReconnecting ? null : _reconnect,
                  icon: _isReconnecting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.link),
                  label: Text(_isReconnecting
                      ? 'apps.google_sheets.reconnecting'.tr()
                      : 'apps.google_sheets.reconnect'.tr()),
                )
              else
                FilledButton.icon(
                  onPressed: _loadSpreadsheets,
                  icon: const Icon(Icons.refresh),
                  label: Text('common.retry'.tr()),
                ),
            ],
          ),
        ),
      );
    }

    if (_spreadsheets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.table_chart_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                  ? 'apps.google_sheets.no_results'.tr()
                  : 'apps.google_sheets.no_spreadsheets'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'apps.google_sheets.no_spreadsheets_subtitle'.tr(),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadSpreadsheets,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _spreadsheets.length + (_isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _spreadsheets.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final spreadsheet = _spreadsheets[index];
          return _SpreadsheetListTile(
            spreadsheet: spreadsheet,
            onTap: () => _showSpreadsheetDetails(spreadsheet),
            onOpen: () => _openSpreadsheet(spreadsheet),
          );
        },
      ),
    );
  }
}

/// List tile for a spreadsheet
class _SpreadsheetListTile extends StatelessWidget {
  final GoogleSpreadsheet spreadsheet;
  final VoidCallback onTap;
  final VoidCallback onOpen;

  const _SpreadsheetListTile({
    required this.spreadsheet,
    required this.onTap,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFF0F9D58).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.table_chart,
            color: Color(0xFF0F9D58),
          ),
        ),
        title: Text(
          _formatDisplayName(spreadsheet.name),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          spreadsheet.modifiedTimeAgo,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (spreadsheet.sheets.isNotEmpty)
              Chip(
                label: Text(
                  '${spreadsheet.sheets.length} sheets',
                  style: const TextStyle(fontSize: 10),
                ),
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              ),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.open_in_new, size: 20),
              onPressed: onOpen,
              tooltip: 'apps.google_sheets.open_in_sheets'.tr(),
            ),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}

/// Detail screen for a spreadsheet
class _SpreadsheetDetailScreen extends StatefulWidget {
  final GoogleSpreadsheet spreadsheet;

  const _SpreadsheetDetailScreen({required this.spreadsheet});

  @override
  State<_SpreadsheetDetailScreen> createState() => _SpreadsheetDetailScreenState();
}

class _SpreadsheetDetailScreenState extends State<_SpreadsheetDetailScreen> {
  final GoogleSheetsService _sheetsService = GoogleSheetsService.instance;

  List<GoogleSheet> _sheets = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSpreadsheetDetails();
  }

  Future<void> _loadSpreadsheetDetails() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Load spreadsheet details and sheets
      await _sheetsService.getSpreadsheet(widget.spreadsheet.id);
      final sheets = await _sheetsService.getSheets(widget.spreadsheet.id);

      if (mounted) {
        setState(() {
          _sheets = sheets;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _openInBrowser() async {
    final url = widget.spreadsheet.url ??
        'https://docs.google.com/spreadsheets/d/${widget.spreadsheet.id}/edit';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _viewSheetData(GoogleSheet sheet) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _SheetDataScreen(
          spreadsheetId: widget.spreadsheet.id,
          spreadsheetName: widget.spreadsheet.name,
          sheet: sheet,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _formatDisplayName(widget.spreadsheet.name),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_new),
            onPressed: _openInBrowser,
            tooltip: 'apps.google_sheets.open_in_sheets'.tr(),
          ),
        ],
      ),
      body: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(_error!),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadSpreadsheetDetails,
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadSpreadsheetDetails,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Spreadsheet info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F9D58).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.table_chart,
                          color: Color(0xFF0F9D58),
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _formatDisplayName(widget.spreadsheet.name),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'apps.google_sheets.modified'.tr(args: [
                                widget.spreadsheet.modifiedTimeAgo,
                              ]),
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Sheets section
          Text(
            'apps.google_sheets.sheets_title'.tr(args: ['${_sheets.length}']),
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),

          if (_sheets.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Center(
                  child: Text(
                    'apps.google_sheets.no_sheets'.tr(),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ),
            )
          else
            ...List.generate(_sheets.length, (index) {
              final sheet = _sheets[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFF0F9D58).withValues(alpha: 0.1),
                    child: Text(
                      '${index + 1}',
                      style: const TextStyle(
                        color: Color(0xFF0F9D58),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  title: Text(
                    _formatDisplayName(sheet.title),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: sheet.rowCount != null && sheet.columnCount != null
                      ? Text(
                          '${sheet.rowCount} rows x ${sheet.columnCount} columns',
                          style: Theme.of(context).textTheme.bodySmall,
                        )
                      : null,
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _viewSheetData(sheet),
                ),
              );
            }),
        ],
      ),
    );
  }
}

/// Screen to view sheet data
class _SheetDataScreen extends StatefulWidget {
  final String spreadsheetId;
  final String spreadsheetName;
  final GoogleSheet sheet;

  const _SheetDataScreen({
    required this.spreadsheetId,
    required this.spreadsheetName,
    required this.sheet,
  });

  @override
  State<_SheetDataScreen> createState() => _SheetDataScreenState();
}

class _SheetDataScreenState extends State<_SheetDataScreen> {
  final GoogleSheetsService _sheetsService = GoogleSheetsService.instance;

  GoogleSheetData? _data;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Load first 100 rows
      final data = await _sheetsService.getSheetData(
        widget.spreadsheetId,
        '${widget.sheet.title}!A1:Z100',
      );

      if (mounted) {
        setState(() {
          _data = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _openEditor() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => GoogleSheetsEditorScreen(
          spreadsheetId: widget.spreadsheetId,
          spreadsheetName: widget.spreadsheetName,
          sheet: widget.sheet,
        ),
      ),
    ).then((_) {
      // Refresh data when returning from editor
      _loadData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _formatDisplayName(widget.sheet.title),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
            tooltip: 'common.refresh'.tr(),
          ),
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: _openEditor,
            tooltip: 'apps.google_sheets.editor.edit'.tr(),
          ),
        ],
      ),
      body: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(_error!),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadData,
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_data == null || _data!.values.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.table_chart_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'apps.google_sheets.no_data'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      );
    }

    // Build a data table
    final headers = _data!.headers;
    final dataRows = _data!.dataRows;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SingleChildScrollView(
        child: DataTable(
          columns: List.generate(
            headers.length,
            (index) => DataColumn(
              label: Text(
                headers[index]?.toString() ?? '',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
          rows: List.generate(
            dataRows.length,
            (rowIndex) => DataRow(
              cells: List.generate(
                headers.length,
                (colIndex) => DataCell(
                  Text(
                    colIndex < dataRows[rowIndex].length
                        ? dataRows[rowIndex][colIndex]?.toString() ?? ''
                        : '',
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
