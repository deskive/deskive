import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:pluto_grid/pluto_grid.dart';
import 'models/google_sheets_models.dart';
import 'services/google_sheets_service.dart';

/// Helper to format names for display (replace underscores with spaces)
String _formatDisplayName(String name) {
  return name.replaceAll('_', ' ');
}

/// Screen to edit Google Sheets data using PlutoGrid
class GoogleSheetsEditorScreen extends StatefulWidget {
  final String spreadsheetId;
  final String spreadsheetName;
  final GoogleSheet sheet;

  const GoogleSheetsEditorScreen({
    super.key,
    required this.spreadsheetId,
    required this.spreadsheetName,
    required this.sheet,
  });

  @override
  State<GoogleSheetsEditorScreen> createState() => _GoogleSheetsEditorScreenState();
}

class _GoogleSheetsEditorScreenState extends State<GoogleSheetsEditorScreen> {
  final GoogleSheetsService _sheetsService = GoogleSheetsService.instance;

  List<PlutoColumn> _columns = [];
  List<PlutoRow> _rows = [];
  PlutoGridStateManager? _stateManager;

  bool _isLoading = true;
  bool _isSaving = false;
  bool _hasChanges = false;
  String? _error;

  // Track headers for saving
  List<String> _headers = [];

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
      // Load sheet data (first 500 rows)
      final data = await _sheetsService.getSheetData(
        widget.spreadsheetId,
        '${widget.sheet.title}!A1:ZZ500',
      );

      if (mounted) {
        _buildGrid(data);
        setState(() {
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

  void _buildGrid(GoogleSheetData data) {
    if (data.values.isEmpty) {
      // Empty sheet - create default columns
      _headers = ['A', 'B', 'C', 'D', 'E'];
      _columns = _headers.map((header) => _createColumn(header)).toList();
      _rows = [];
      return;
    }

    // First row as headers, rest as data
    final allValues = data.values;
    _headers = allValues.isNotEmpty
        ? allValues[0].map((e) => e?.toString() ?? '').toList()
        : [];

    // Ensure we have at least one column
    if (_headers.isEmpty) {
      _headers = ['A'];
    }

    // Create columns from headers
    _columns = [];
    for (int i = 0; i < _headers.length; i++) {
      final header = _headers[i].isEmpty ? _getColumnLetter(i) : _headers[i];
      _columns.add(_createColumn(header, field: 'col_$i'));
    }

    // Create rows from data (skip header row)
    _rows = [];
    final dataRows = allValues.length > 1 ? allValues.sublist(1) : <List<dynamic>>[];

    for (int rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
      final rowData = dataRows[rowIndex];
      final cells = <String, PlutoCell>{};

      for (int colIndex = 0; colIndex < _columns.length; colIndex++) {
        final value = colIndex < rowData.length ? rowData[colIndex]?.toString() ?? '' : '';
        cells['col_$colIndex'] = PlutoCell(value: value);
      }

      _rows.add(PlutoRow(cells: cells));
    }
  }

  PlutoColumn _createColumn(String title, {String? field}) {
    final columnField = field ?? title;
    return PlutoColumn(
      title: title,
      field: columnField,
      type: PlutoColumnType.text(),
      enableEditingMode: true,
      width: 120,
      minWidth: 80,
      enableSorting: true,
      enableFilterMenuItem: true,
      enableContextMenu: true,
    );
  }

  String _getColumnLetter(int index) {
    String letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = (index ~/ 26) - 1;
    }
    return letter;
  }

  void _onChanged(PlutoGridOnChangedEvent event) {
    setState(() {
      _hasChanges = true;
    });
  }

  void _onLoaded(PlutoGridOnLoadedEvent event) {
    _stateManager = event.stateManager;
  }

  Future<void> _saveChanges() async {
    if (_stateManager == null || !_hasChanges) return;

    setState(() {
      _isSaving = true;
    });

    try {
      // Build the values array including headers
      final values = <List<dynamic>>[];

      // Add header row
      values.add(_headers);

      // Add data rows
      for (final row in _stateManager!.refRows) {
        final rowValues = <dynamic>[];
        for (int i = 0; i < _columns.length; i++) {
          final cell = row.cells['col_$i'];
          rowValues.add(cell?.value?.toString() ?? '');
        }
        values.add(rowValues);
      }

      // Calculate the range
      final lastColumn = _getColumnLetter(_columns.length - 1);
      final lastRow = values.length;
      final range = 'A1:$lastColumn$lastRow';

      // Update the sheet
      await _sheetsService.updateSheetData(
        widget.spreadsheetId,
        '${widget.sheet.title}!$range',
        values,
      );

      if (mounted) {
        setState(() {
          _hasChanges = false;
          _isSaving = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_sheets.editor.saved'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.google_sheets.editor.save_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _addRow() {
    if (_stateManager == null) return;

    final cells = <String, PlutoCell>{};
    for (int i = 0; i < _columns.length; i++) {
      cells['col_$i'] = PlutoCell(value: '');
    }

    _stateManager!.appendRows([PlutoRow(cells: cells)]);

    setState(() {
      _hasChanges = true;
    });
  }

  void _addColumn() {
    if (_stateManager == null) return;

    final newColIndex = _columns.length;
    final newColLetter = _getColumnLetter(newColIndex);
    final newColumn = _createColumn(newColLetter, field: 'col_$newColIndex');

    _stateManager!.insertColumns(newColIndex, [newColumn]);

    // Add empty cell to all existing rows
    for (final row in _stateManager!.refRows) {
      row.cells['col_$newColIndex'] = PlutoCell(value: '');
    }

    _headers.add(newColLetter);
    _columns.add(newColumn);

    setState(() {
      _hasChanges = true;
    });
  }

  Future<bool> _onWillPop() async {
    if (!_hasChanges) return true;

    final dialogContext = context;
    final result = await showDialog<bool>(
      context: dialogContext,
      builder: (ctx) => AlertDialog(
        title: Text('apps.google_sheets.editor.unsaved_changes'.tr()),
        content: Text('apps.google_sheets.editor.unsaved_changes_message'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('apps.google_sheets.editor.discard'.tr()),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx, false);
              await _saveChanges();
            },
            child: Text('common.save'.tr()),
          ),
        ],
      ),
    );

    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final navigator = Navigator.of(context);
    return PopScope(
      canPop: !_hasChanges,
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop) {
          final shouldPop = await _onWillPop();
          if (shouldPop && mounted) {
            navigator.pop();
          }
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _formatDisplayName(widget.sheet.title),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 16),
              ),
              Text(
                _formatDisplayName(widget.spreadsheetName),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          actions: [
            if (_hasChanges)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Chip(
                  label: Text(
                    'apps.google_sheets.editor.unsaved'.tr(),
                    style: const TextStyle(fontSize: 10),
                  ),
                  backgroundColor: Colors.orange.withValues(alpha: 0.2),
                  side: BorderSide.none,
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                ),
              ),
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _isLoading || _isSaving ? null : _loadData,
              tooltip: 'common.refresh'.tr(),
            ),
            IconButton(
              icon: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save),
              onPressed: _isSaving || !_hasChanges ? null : _saveChanges,
              tooltip: 'common.save'.tr(),
            ),
          ],
        ),
        body: _buildContent(),
        floatingActionButton: !_isLoading && _error == null
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FloatingActionButton.small(
                    heroTag: 'add_column',
                    onPressed: _addColumn,
                    tooltip: 'apps.google_sheets.editor.add_column'.tr(),
                    child: const Icon(Icons.view_column_outlined),
                  ),
                  const SizedBox(height: 8),
                  FloatingActionButton(
                    heroTag: 'add_row',
                    onPressed: _addRow,
                    tooltip: 'apps.google_sheets.editor.add_row'.tr(),
                    child: const Icon(Icons.add),
                  ),
                ],
              )
            : null,
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
                Icons.error_outline,
                size: 64,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(
                'apps.google_sheets.editor.error_loading'.tr(),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _loadData,
                icon: const Icon(Icons.refresh),
                label: Text('common.retry'.tr()),
              ),
            ],
          ),
        ),
      );
    }

    if (_columns.isEmpty) {
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
              'apps.google_sheets.editor.empty_sheet'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'apps.google_sheets.editor.empty_sheet_hint'.tr(),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return PlutoGrid(
      columns: _columns,
      rows: _rows,
      onChanged: _onChanged,
      onLoaded: _onLoaded,
      configuration: PlutoGridConfiguration(
        style: PlutoGridStyleConfig(
          enableGridBorderShadow: false,
          gridBorderColor: Theme.of(context).dividerColor,
          activatedBorderColor: Theme.of(context).colorScheme.primary,
          activatedColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
          cellColorInEditState: Theme.of(context).colorScheme.surface,
          cellColorInReadOnlyState: Theme.of(context).colorScheme.surfaceContainerHighest,
          gridBackgroundColor: Theme.of(context).colorScheme.surface,
          rowColor: Theme.of(context).colorScheme.surface,
          oddRowColor: isDarkMode
              ? Theme.of(context).colorScheme.surfaceContainerLow
              : Theme.of(context).colorScheme.surfaceContainerLowest,
          evenRowColor: Theme.of(context).colorScheme.surface,
          columnTextStyle: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
          cellTextStyle: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 13,
          ),
          iconColor: Theme.of(context).colorScheme.onSurface,
          menuBackgroundColor: Theme.of(context).colorScheme.surface,
          borderColor: Theme.of(context).dividerColor,
        ),
        columnSize: const PlutoGridColumnSizeConfig(
          autoSizeMode: PlutoAutoSizeMode.scale,
        ),
        scrollbar: const PlutoGridScrollbarConfig(
          isAlwaysShown: true,
          scrollbarThickness: 8,
          scrollbarThicknessWhileDragging: 10,
        ),
      ),
      mode: PlutoGridMode.normal,
    );
  }
}
