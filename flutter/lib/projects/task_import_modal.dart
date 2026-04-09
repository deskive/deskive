import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:csv/csv.dart';
import '../services/workspace_service.dart';
import '../config/env_config.dart';
import '../widgets/google_drive_file_picker.dart';
import 'project_model.dart';
import 'project_service.dart';

/// Modal dialog for importing tasks
/// Supports:
/// - Import from CSV/Excel file
/// - Import from project template
class TaskImportModal extends StatefulWidget {
  final String? projectId;
  final Function()? onTasksImported;

  const TaskImportModal({
    super.key,
    this.projectId,
    this.onTasksImported,
  });

  @override
  State<TaskImportModal> createState() => _TaskImportModalState();
}

class _TaskImportModalState extends State<TaskImportModal> {
  final _workspaceService = WorkspaceService.instance;
  final _projectService = ProjectService();

  String? _importType; // 'csv' or 'template'
  PlatformFile? _selectedFile;
  bool _isProcessing = false;
  String? _errorMessage;
  double _importProgress = 0;
  int _importedCount = 0;
  List<Map<String, dynamic>> _previewData = [];

  // Project selection (when projectId is null)
  List<Project> _projects = [];
  String? _selectedProjectId;
  bool _isLoadingProjects = false;

  @override
  void initState() {
    super.initState();
    _selectedProjectId = widget.projectId;
    if (widget.projectId == null) {
      _loadProjects();
    }
  }

  Future<void> _loadProjects() async {
    setState(() => _isLoadingProjects = true);
    try {
      final projects = await _projectService.getAllProjects();
      setState(() {
        _projects = projects;
        _isLoadingProjects = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load projects: $e';
        _isLoadingProjects = false;
      });
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  /// Handle CSV file selection
  void _handleFileSelect() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv', 'xlsx', 'xls'],
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final fileName = file.name.toLowerCase();

        // Only support CSV for now
        if (!fileName.endsWith('.csv')) {
          setState(() {
            _errorMessage = 'Currently only CSV files are supported. Excel support coming soon.';
          });
          return;
        }

        setState(() {
          _selectedFile = file;
          _errorMessage = null;
        });

        // Preview the CSV data
        await _previewCsvData(file);
      }
    } catch (e) {
      debugPrint('File picker error: $e');
      setState(() {
        _errorMessage = 'Failed to select file: $e';
      });
    }
  }

  /// Handle Google Drive file selection
  Future<void> _handleGoogleDriveSelect() async {
    try {
      final result = await GoogleDriveFilePicker.show(
        context: context,
        allowedExtensions: ['csv'],
        title: 'tasks_import.select_csv_from_drive'.tr(),
      );

      if (result != null && result.localFile != null) {
        // Read the file content
        final content = await result.localFile!.readAsString();

        // Create a PlatformFile-like object for preview
        setState(() {
          _selectedFile = PlatformFile(
            name: result.file.name,
            size: result.file.size ?? 0,
            path: result.localFile!.path,
          );
          _importType = 'csv';
          _errorMessage = null;
        });

        // Preview the CSV data
        await _previewCsvDataFromContent(content);
      }
    } catch (e) {
      debugPrint('Google Drive file picker error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks_import.google_drive_error'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Preview CSV data from content string
  Future<void> _previewCsvDataFromContent(String content) async {
    try {
      final csvData = const CsvToListConverter().convert(content);

      if (csvData.isEmpty) {
        setState(() {
          _errorMessage = 'The CSV file appears to be empty.';
        });
        return;
      }

      // Get headers from first row
      final headers = csvData.first.map((e) => e.toString().toLowerCase()).toList();

      // Map columns
      final titleIndex = headers.indexWhere((h) => h.contains('title') || h.contains('name') || h.contains('task'));
      final descIndex = headers.indexWhere((h) => h.contains('desc') || h.contains('description'));
      final priorityIndex = headers.indexWhere((h) => h.contains('priority'));
      final typeIndex = headers.indexWhere((h) => h.contains('type'));
      final dueDateIndex = headers.indexWhere((h) => h.contains('due') || h.contains('date'));
      final labelsIndex = headers.indexWhere((h) => h.contains('label') || h.contains('tag'));

      if (titleIndex == -1) {
        setState(() {
          _errorMessage = 'Could not find a title column in the CSV. Please ensure your CSV has a "title" or "name" column.';
        });
        return;
      }

      // Parse preview data (up to 5 rows)
      final previewRows = csvData.skip(1).take(5).map((row) {
        return {
          'title': row.length > titleIndex ? row[titleIndex]?.toString() ?? '' : '',
          'description': descIndex >= 0 && row.length > descIndex ? row[descIndex]?.toString() : null,
          'priority': priorityIndex >= 0 && row.length > priorityIndex ? row[priorityIndex]?.toString() : null,
          'type': typeIndex >= 0 && row.length > typeIndex ? row[typeIndex]?.toString() : null,
          'dueDate': dueDateIndex >= 0 && row.length > dueDateIndex ? row[dueDateIndex]?.toString() : null,
          'labels': labelsIndex >= 0 && row.length > labelsIndex ? row[labelsIndex]?.toString() : null,
        };
      }).toList();

      setState(() {
        _previewData = previewRows;
        _errorMessage = null;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to parse CSV: $e';
      });
    }
  }

  /// Preview CSV data
  Future<void> _previewCsvData(PlatformFile file) async {
    try {
      String content;
      if (file.bytes != null) {
        content = utf8.decode(file.bytes!);
      } else if (file.path != null) {
        final fileOnDisk = File(file.path!);
        content = await fileOnDisk.readAsString();
      } else {
        throw Exception('Cannot read file content');
      }

      final csvData = const CsvToListConverter().convert(content);

      if (csvData.isEmpty) {
        setState(() {
          _errorMessage = 'CSV file is empty';
          _previewData = [];
        });
        return;
      }

      // First row is headers
      final headers = csvData.first.map((e) => e.toString().toLowerCase()).toList();

      // Check required columns
      final requiredColumns = ['title'];
      final missingColumns = requiredColumns.where((col) => !headers.contains(col)).toList();

      if (missingColumns.isNotEmpty) {
        setState(() {
          _errorMessage = 'Missing required columns: ${missingColumns.join(", ")}. CSV must have at least a "title" column.';
          _previewData = [];
        });
        return;
      }

      // Parse data rows (skip header)
      final dataRows = csvData.skip(1).take(5).map((row) {
        final map = <String, dynamic>{};
        for (int i = 0; i < headers.length && i < row.length; i++) {
          map[headers[i]] = row[i];
        }
        return map;
      }).toList();

      setState(() {
        _previewData = dataRows;
        _errorMessage = null;
      });
    } catch (e) {
      debugPrint('CSV parse error: $e');
      setState(() {
        _errorMessage = 'Failed to parse CSV: $e';
        _previewData = [];
      });
    }
  }

  /// Parse priority from string
  TaskPriority _parsePriority(String? value) {
    if (value == null) return TaskPriority.medium;
    switch (value.toLowerCase().trim()) {
      case 'highest':
      case 'critical':
        return TaskPriority.highest;
      case 'high':
        return TaskPriority.high;
      case 'low':
        return TaskPriority.low;
      case 'lowest':
        return TaskPriority.lowest;
      default:
        return TaskPriority.medium;
    }
  }

  /// Parse task type from string
  TaskType _parseTaskType(String? value) {
    if (value == null) return TaskType.task;
    switch (value.toLowerCase().trim()) {
      case 'bug':
        return TaskType.bug;
      case 'story':
        return TaskType.story;
      case 'epic':
        return TaskType.epic;
      case 'subtask':
        return TaskType.subtask;
      default:
        return TaskType.task;
    }
  }

  /// Handle the import process
  Future<void> _handleImport() async {
    if (_selectedFile == null) return;

    String? workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null || workspaceId.isEmpty) {
      workspaceId = EnvConfig.defaultWorkspaceId;
    }

    if (workspaceId == null || workspaceId.isEmpty) {
      setState(() {
        _errorMessage = 'No workspace selected';
      });
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
      _importProgress = 0;
      _importedCount = 0;
    });

    try {
      // Read CSV file
      String content;
      if (_selectedFile!.bytes != null) {
        content = utf8.decode(_selectedFile!.bytes!);
      } else if (_selectedFile!.path != null) {
        final fileOnDisk = File(_selectedFile!.path!);
        content = await fileOnDisk.readAsString();
      } else {
        throw Exception('Cannot read file content');
      }

      final csvData = const CsvToListConverter().convert(content);

      if (csvData.length < 2) {
        throw Exception('CSV file must have at least a header row and one data row');
      }

      // Parse headers
      final headers = csvData.first.map((e) => e.toString().toLowerCase()).toList();
      final titleIndex = headers.indexOf('title');
      final descriptionIndex = headers.indexOf('description');
      final priorityIndex = headers.indexOf('priority');
      final typeIndex = headers.indexOf('type');
      final dueDateIndex = headers.indexOf('due_date');
      final labelsIndex = headers.indexOf('labels');

      if (titleIndex == -1) {
        throw Exception('CSV must have a "title" column');
      }

      // Import tasks
      int successCount = 0;
      final dataRows = csvData.skip(1).toList();

      for (int i = 0; i < dataRows.length; i++) {
        final row = dataRows[i];

        try {
          final title = row.length > titleIndex ? row[titleIndex]?.toString().trim() : null;

          if (title == null || title.isEmpty) continue;

          final description = descriptionIndex != -1 && row.length > descriptionIndex
              ? row[descriptionIndex]?.toString().trim()
              : null;

          final priority = priorityIndex != -1 && row.length > priorityIndex
              ? _parsePriority(row[priorityIndex]?.toString())
              : TaskPriority.medium;

          final taskType = typeIndex != -1 && row.length > typeIndex
              ? _parseTaskType(row[typeIndex]?.toString())
              : TaskType.task;

          DateTime? dueDate;
          if (dueDateIndex != -1 && row.length > dueDateIndex) {
            final dueDateStr = row[dueDateIndex]?.toString().trim();
            if (dueDateStr != null && dueDateStr.isNotEmpty) {
              try {
                dueDate = DateTime.parse(dueDateStr);
              } catch (_) {
                // Try other date formats
                try {
                  dueDate = DateFormat('MM/dd/yyyy').parse(dueDateStr);
                } catch (_) {
                  try {
                    dueDate = DateFormat('dd/MM/yyyy').parse(dueDateStr);
                  } catch (_) {}
                }
              }
            }
          }

          List<String> labels = [];
          if (labelsIndex != -1 && row.length > labelsIndex) {
            final labelsStr = row[labelsIndex]?.toString().trim();
            if (labelsStr != null && labelsStr.isNotEmpty) {
              labels = labelsStr.split(',').map((l) => l.trim()).where((l) => l.isNotEmpty).toList();
            }
          }

          // Create the task using named parameters
          if (_selectedProjectId != null) {
            await _projectService.createTask(
              projectId: _selectedProjectId!,
              title: title,
              description: description,
              taskType: taskType,
              priority: priority,
              dueDate: dueDate,
              labels: labels.isNotEmpty ? labels : ['imported'],
            );
            successCount++;
          }

          setState(() {
            _importedCount = successCount;
            _importProgress = (i + 1) / dataRows.length;
          });
        } catch (e) {
          debugPrint('Failed to import row $i: $e');
        }
      }

      if (successCount > 0 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('tasks_import.success'.tr() + ' ($successCount tasks)'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
        widget.onTasksImported?.call();
      } else {
        throw Exception('No tasks were imported. Please check your CSV format.');
      }
    } catch (e) {
      debugPrint('Import error: $e');
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 650),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                children: [
                  if (_importType != null)
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () {
                        setState(() {
                          _importType = null;
                          _selectedFile = null;
                          _previewData = [];
                          _errorMessage = null;
                        });
                      },
                    ),
                  Expanded(
                    child: Text(
                      'tasks_import.title'.tr(),
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Content
              if (_importType == null) ...[
                Text(
                  'tasks_import.description'.tr(),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),

                // Project selection (when projectId is not provided)
                if (widget.projectId == null) ...[
                  if (_isLoadingProjects)
                    const Center(child: CircularProgressIndicator())
                  else if (_projects.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.warning, color: colorScheme.error),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'tasks_import.no_projects'.tr(),
                              style: TextStyle(color: colorScheme.onErrorContainer),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    DropdownButtonFormField<String>(
                      value: _selectedProjectId,
                      decoration: InputDecoration(
                        labelText: 'tasks_import.select_project'.tr(),
                        border: const OutlineInputBorder(),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      ),
                      items: _projects.map((project) {
                        return DropdownMenuItem<String>(
                          value: project.id,
                          child: Text(project.name),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedProjectId = value;
                        });
                      },
                    ),
                  const SizedBox(height: 16),
                ],

                // Import type selection
                _ImportTypeCard(
                  icon: Icons.table_chart,
                  label: 'tasks_import.from_csv'.tr(),
                  description: 'tasks_import.supported_formats'.tr(),
                  onTap: () {
                    setState(() {
                      _importType = 'csv';
                    });
                  },
                ),
                const SizedBox(height: 12),
                _ImportTypeCard(
                  icon: Icons.cloud,
                  label: 'tasks_import.from_google_drive'.tr(),
                  description: 'tasks_import.google_drive_hint'.tr(),
                  onTap: _handleGoogleDriveSelect,
                ),
              ] else if (_importType == 'csv') ...[
                // File selection area
                InkWell(
                  onTap: _handleFileSelect,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: colorScheme.outline,
                        style: BorderStyle.solid,
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          _selectedFile != null ? Icons.table_chart : Icons.upload_file,
                          size: 48,
                          color: colorScheme.primary,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _selectedFile?.name ?? 'tasks_import.select_file'.tr(),
                          style: theme.textTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                        if (_selectedFile == null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'tasks_import.supported_formats'.tr(),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),

                // CSV format hint
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: 16,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'CSV Format:',
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'tasks_import.csv_format_hint'.tr(),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),

                // Preview data
                if (_previewData.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(
                    'Preview (first ${_previewData.length} rows):',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 150),
                    child: SingleChildScrollView(
                      child: Column(
                        children: _previewData.map((row) {
                          return ListTile(
                            dense: true,
                            leading: Icon(
                              Icons.task_alt,
                              size: 20,
                              color: colorScheme.primary,
                            ),
                            title: Text(
                              row['title']?.toString() ?? 'No title',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: row['description'] != null
                                ? Text(
                                    row['description'].toString(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  )
                                : null,
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],

                // Progress indicator
                if (_isProcessing) ...[
                  const SizedBox(height: 16),
                  Column(
                    children: [
                      LinearProgressIndicator(value: _importProgress),
                      const SizedBox(height: 8),
                      Text(
                        'Imported $_importedCount tasks...',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],

                // Error message
                if (_errorMessage != null && _errorMessage!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          color: Colors.red.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.red.shade700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text('common.cancel'.tr()),
                    ),
                    const SizedBox(width: 12),
                    FilledButton.icon(
                      onPressed: _isProcessing || _selectedFile == null || _previewData.isEmpty
                          ? null
                          : _handleImport,
                      icon: _isProcessing
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.upload, size: 18),
                      label: Text(
                        _isProcessing
                            ? 'tasks_import.importing'.tr()
                            : 'tasks_import.import'.tr(),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Card widget for import type selection
class _ImportTypeCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final VoidCallback onTap;

  const _ImportTypeCard({
    required this.icon,
    required this.label,
    required this.description,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(color: colorScheme.outline),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 40,
              color: colorScheme.primary,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: 16,
              color: colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}

/// Show the task import modal dialog
/// Returns true on success, null on cancel
Future<bool?> showTaskImportModal({
  required BuildContext context,
  String? projectId,
  Function()? onTasksImported,
}) {
  return showDialog<bool>(
    context: context,
    builder: (context) => TaskImportModal(
      projectId: projectId,
      onTasksImported: onTasksImported,
    ),
  );
}
