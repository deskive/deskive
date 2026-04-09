import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/approval.dart';
import '../../api/services/approvals_api_service.dart';
import '../../services/workspace_service.dart';
import '../../theme/app_theme.dart';

class RequestTypesScreen extends StatefulWidget {
  const RequestTypesScreen({super.key});

  @override
  State<RequestTypesScreen> createState() => _RequestTypesScreenState();
}

class _RequestTypesScreenState extends State<RequestTypesScreen> {
  final ApprovalsApiService _apiService = ApprovalsApiService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  List<RequestType> _types = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _error = 'No workspace selected';
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final response = await _apiService.getRequestTypes(workspaceId);

    if (mounted) {
      setState(() {
        if (response.success) {
          _types = response.data!;
        } else {
          _error = response.message;
        }
        _isLoading = false;
      });
    }
  }

  Future<void> _createType() async {
    final result = await _showTypeDialog();
    if (result == null) return;

    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await _apiService.createRequestType(
      workspaceId,
      name: result['name'],
      description: result['description'],
      color: result['color'],
      fieldsConfig: result['fieldsConfig'],
    );

    if (mounted) {
      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('approvals.type_created'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to create type'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _toggleTypeStatus(RequestType type) async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await _apiService.updateRequestType(
      workspaceId,
      type.id,
      isActive: !type.isActive,
    );

    if (mounted) {
      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(type.isActive
                ? 'approvals.type_deactivated'.tr()
                : 'approvals.type_activated'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to update type'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteType(RequestType type) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('approvals.delete_type'.tr()),
        content: Text('approvals.delete_type_confirm'.tr(args: [type.name])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await _apiService.deleteRequestType(workspaceId, type.id);

    if (mounted) {
      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('approvals.type_deleted'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to delete type'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<Map<String, dynamic>?> _showTypeDialog({RequestType? existingType}) async {
    final nameController = TextEditingController(text: existingType?.name ?? '');
    final descController = TextEditingController(text: existingType?.description ?? '');
    String selectedColor = existingType?.color ?? '#2196F3';
    List<Map<String, dynamic>> fields = existingType?.fields
            .map((f) => {
                  'id': f.id,
                  'label': f.label,
                  'type': f.type.value,
                  'required': f.required,
                  'placeholder': f.placeholder,
                  'options': f.options,
                })
            .toList() ??
        [];

    final colors = [
      '#2196F3', // Blue
      '#4CAF50', // Green
      '#FF9800', // Orange
      '#F44336', // Red
      '#9C27B0', // Purple
      '#00BCD4', // Cyan
      '#795548', // Brown
      '#607D8B', // Blue Grey
    ];

    return showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: Text(existingType != null
                ? 'approvals.edit_type'.tr()
                : 'approvals.create_type'.tr()),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name
                    TextField(
                      controller: nameController,
                      decoration: InputDecoration(
                        labelText: 'approvals.type_name'.tr(),
                        border: const OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Description
                    TextField(
                      controller: descController,
                      decoration: InputDecoration(
                        labelText: 'approvals.type_description'.tr(),
                        border: const OutlineInputBorder(),
                      ),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 16),

                    // Color
                    Text(
                      'approvals.type_color'.tr(),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: colors.map((color) {
                        final isSelected = selectedColor == color;
                        return InkWell(
                          onTap: () {
                            setDialogState(() => selectedColor = color);
                          },
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: _parseColor(color),
                              borderRadius: BorderRadius.circular(8),
                              border: isSelected
                                  ? Border.all(color: Colors.black, width: 2)
                                  : null,
                            ),
                            child: isSelected
                                ? const Icon(Icons.check, color: Colors.white, size: 18)
                                : null,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),

                    // Fields Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'approvals.custom_fields'.tr(),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            setDialogState(() {
                              fields.add({
                                'id': DateTime.now().millisecondsSinceEpoch.toString(),
                                'label': '',
                                'type': 'TEXT',
                                'required': false,
                              });
                            });
                          },
                          icon: const Icon(Icons.add, size: 18),
                          label: Text('common.add'.tr()),
                        ),
                      ],
                    ),
                    ...fields.asMap().entries.map((entry) {
                      final index = entry.key;
                      final field = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: TextField(
                                decoration: InputDecoration(
                                  hintText: 'approvals.field_name'.tr(),
                                  isDense: true,
                                  border: const OutlineInputBorder(),
                                ),
                                onChanged: (value) {
                                  fields[index]['label'] = value;
                                },
                                controller: TextEditingController(text: field['label']),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: field['type'],
                                isDense: true,
                                decoration: const InputDecoration(
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(horizontal: 8),
                                ),
                                items: ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'CHECKBOX']
                                    .map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 12))))
                                    .toList(),
                                onChanged: (value) {
                                  setDialogState(() {
                                    fields[index]['type'] = value;
                                  });
                                },
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete, size: 20, color: Colors.red),
                              onPressed: () {
                                setDialogState(() {
                                  fields.removeAt(index);
                                });
                              },
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.cancel'.tr()),
              ),
              ElevatedButton(
                onPressed: () {
                  if (nameController.text.trim().isEmpty) {
                    return;
                  }
                  Navigator.pop(context, {
                    'name': nameController.text.trim(),
                    'description': descController.text.trim().isNotEmpty
                        ? descController.text.trim()
                        : null,
                    'color': selectedColor,
                    'fieldsConfig': fields.where((f) => f['label']?.isNotEmpty == true).toList(),
                  });
                },
                child: Text(existingType != null ? 'common.save'.tr() : 'common.create'.tr()),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('approvals.manage_types'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _buildTypesList(),
      floatingActionButton: FloatingActionButton(
        onPressed: _createType,
        backgroundColor: context.primaryColor,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _error ?? 'An error occurred',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: Text('common.retry'.tr()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypesList() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_types.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.category_outlined, size: 64, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                'approvals.no_types'.tr(),
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white70 : Colors.grey[700],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'approvals.create_type_hint'.tr(),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isDark ? Colors.white38 : Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _types.length,
      itemBuilder: (context, index) {
        final type = _types[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _buildTypeCard(type, isDark),
        );
      },
    );
  }

  Widget _buildTypeCard(RequestType type, bool isDark) {
    final color = _parseColor(type.color ?? '#2196F3');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
        boxShadow: !type.isActive
            ? null
            : [
                BoxShadow(
                  color: color.withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Color indicator
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: type.isActive ? color.withOpacity(0.15) : Colors.grey.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.description_outlined,
                  color: type.isActive ? color : Colors.grey,
                ),
              ),
              const SizedBox(width: 12),

              // Name & Description
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            type.name,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: type.isActive
                                  ? (isDark ? Colors.white : Colors.black87)
                                  : Colors.grey,
                            ),
                          ),
                        ),
                        if (!type.isActive)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.grey.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'approvals.inactive'.tr(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[600],
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (type.description != null && type.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        type.description!,
                        style: TextStyle(
                          fontSize: 13,
                          color: type.isActive
                              ? (isDark ? Colors.white60 : Colors.grey[600])
                              : Colors.grey,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Fields count & Actions
          Row(
            children: [
              // Fields count
              if (type.fields.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${type.fields.length} ${'approvals.fields'.tr()}',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.blue[700],
                    ),
                  ),
                ),
              const Spacer(),

              // Toggle Active
              TextButton.icon(
                onPressed: () => _toggleTypeStatus(type),
                icon: Icon(
                  type.isActive ? Icons.visibility_off : Icons.visibility,
                  size: 18,
                ),
                label: Text(
                  type.isActive
                      ? 'approvals.deactivate'.tr()
                      : 'approvals.activate'.tr(),
                ),
                style: TextButton.styleFrom(
                  foregroundColor: type.isActive ? Colors.orange : Colors.green,
                ),
              ),

              // Delete
              IconButton(
                onPressed: () => _deleteType(type),
                icon: const Icon(Icons.delete_outline, size: 20),
                color: Colors.red,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _parseColor(String colorStr) {
    try {
      if (colorStr.startsWith('#')) {
        return Color(int.parse(colorStr.substring(1), radix: 16) + 0xFF000000);
      }
      return Colors.blue;
    } catch (e) {
      return Colors.blue;
    }
  }
}
