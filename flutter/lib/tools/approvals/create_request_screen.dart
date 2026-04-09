import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/approval.dart';
import '../../api/services/approvals_api_service.dart';
import '../../api/services/workspace_api_service.dart';
import '../../api/services/storage_api_service.dart';
import '../../services/workspace_service.dart';
import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';

class CreateRequestScreen extends StatefulWidget {
  final String? preselectedTypeId;

  const CreateRequestScreen({super.key, this.preselectedTypeId});

  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

/// Model for storing attachment info before upload
class _AttachmentFile {
  final String name;
  final Uint8List bytes;
  final int size;
  final String? mimeType;

  _AttachmentFile({
    required this.name,
    required this.bytes,
    required this.size,
    this.mimeType,
  });
}

/// Dynamic field type enum
enum _DynamicFieldType { text, number, date, textarea }

/// Model for user-added dynamic fields
class _DynamicField {
  String key;
  dynamic value;
  _DynamicFieldType type;
  final TextEditingController keyController;
  final TextEditingController valueController;

  _DynamicField({
    this.key = '',
    this.value,
    this.type = _DynamicFieldType.text,
  }) : keyController = TextEditingController(text: ''),
       valueController = TextEditingController(text: '');

  void dispose() {
    keyController.dispose();
    valueController.dispose();
  }
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  final ApprovalsApiService _apiService = ApprovalsApiService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final StorageApiService _storageService = StorageApiService();
  final _formKey = GlobalKey<FormState>();

  // Form controllers
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  // State
  List<RequestType> _requestTypes = [];
  List<WorkspaceMember> _members = [];
  RequestType? _selectedType;
  RequestPriority _selectedPriority = RequestPriority.normal;
  DateTime? _dueDate;
  List<String> _selectedApproverIds = [];
  Map<String, dynamic> _customFieldValues = {};
  List<_AttachmentFile> _attachments = [];
  bool _isUploadingFiles = false;
  List<_DynamicField> _dynamicFields = [];

  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  int _currentStep = 0;

  // Get current user ID
  String? get _currentUserId => AuthService.instance.currentUser?.id;

  // Get available approvers (excluding current user) - matches frontend behavior
  List<WorkspaceMember> get _availableApprovers =>
      _members.where((m) => m.userId != _currentUserId).toList();

  // Get owners and admins (for fallback if no approvers selected)
  List<WorkspaceMember> get _ownersAndAdmins => _availableApprovers
      .where((m) => m.role == WorkspaceRole.owner || m.role == WorkspaceRole.admin)
      .toList();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  /// Select preselected type if provided
  void _selectPreselectedType() {
    if (widget.preselectedTypeId != null && _requestTypes.isNotEmpty) {
      final type = _requestTypes.firstWhere(
        (t) => t.id == widget.preselectedTypeId,
        orElse: () => _requestTypes.first,
      );
      if (type.isActive) {
        _onTypeSelected(type);
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    for (final field in _dynamicFields) {
      field.dispose();
    }
    super.dispose();
  }

  void _addDynamicField() {
    setState(() {
      _dynamicFields.add(_DynamicField());
    });
  }

  void _removeDynamicField(int index) {
    setState(() {
      _dynamicFields[index].dispose();
      _dynamicFields.removeAt(index);
    });
  }

  Map<String, dynamic> _getDynamicFieldsData() {
    final data = <String, dynamic>{};
    for (final field in _dynamicFields) {
      final key = field.keyController.text.trim();
      if (key.isNotEmpty) {
        switch (field.type) {
          case _DynamicFieldType.number:
            data[key] = num.tryParse(field.valueController.text) ?? 0;
            break;
          case _DynamicFieldType.date:
            data[key] = field.value ?? field.valueController.text;
            break;
          default:
            data[key] = field.valueController.text;
        }
      }
    }
    return data;
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

    try {
      final results = await Future.wait([
        _apiService.getRequestTypes(workspaceId),
        WorkspaceApiService().getMembers(workspaceId),
      ]);

      final typesResponse = results[0] as dynamic;
      final membersResponse = results[1] as dynamic;

      if (mounted) {
        setState(() {
          if (typesResponse.success) {
            _requestTypes = (typesResponse.data as List<RequestType>)
                .where((t) => t.isActive)
                .toList();
          }
          if (membersResponse.success) {
            _members = membersResponse.data as List<WorkspaceMember>;
            // Debug: Log loaded members
            print('[CreateRequestScreen] Loaded ${_members.length} members');
            for (final member in _members) {
              print('[CreateRequestScreen] Member: ${member.name ?? member.email}, userId: ${member.userId}, role: ${member.role}');
            }
            print('[CreateRequestScreen] Current user ID: $_currentUserId');
            print('[CreateRequestScreen] Available approvers: ${_availableApprovers.length}');
          }
          _isLoading = false;
        });
        // Auto-select preselected type if provided
        _selectPreselectedType();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load data: $e';
          _isLoading = false;
        });
      }
    }
  }

  void _onTypeSelected(RequestType type) {
    setState(() {
      _selectedType = type;
      _customFieldValues = {};
      // Pre-select default approvers
      if (type.defaultApprovers != null && type.defaultApprovers!.isNotEmpty) {
        _selectedApproverIds = List.from(type.defaultApprovers!);
      }
      _currentStep = 1;
    });
  }

  Future<void> _pickFiles() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.any,
        withData: true,
      );

      if (result != null) {
        setState(() {
          for (final file in result.files) {
            if (file.bytes != null) {
              _attachments.add(_AttachmentFile(
                name: file.name,
                bytes: file.bytes!,
                size: file.size,
                mimeType: _getMimeType(file.name),
              ));
            }
          }
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to pick files: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _getMimeType(String fileName) {
    final ext = fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'txt': return 'text/plain';
      case 'csv': return 'text/csv';
      default: return 'application/octet-stream';
    }
  }

  void _removeAttachment(int index) {
    setState(() {
      _attachments.removeAt(index);
    });
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  Future<List<String>> _uploadAttachments() async {
    if (_attachments.isEmpty) return [];

    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return [];

    final uploadedUrls = <String>[];

    for (final attachment in _attachments) {
      final response = await _storageService.uploadFile(
        workspaceId: workspaceId,
        fileName: attachment.name,
        fileBytes: attachment.bytes,
        mimeType: attachment.mimeType,
      );

      if (response.success && response.data != null) {
        uploadedUrls.add(response.data!.url);
      } else {
        // If upload fails, show error but continue with other files
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to upload ${attachment.name}'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    }

    return uploadedUrls;
  }

  Future<void> _submitRequest() async {
    // Validate form state
    final formState = _formKey.currentState;
    if (formState == null || !formState.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('approvals.title_required'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_selectedType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('approvals.select_type'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No workspace selected'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Upload attachments first
      List<String>? attachmentUrls;
      if (_attachments.isNotEmpty) {
        setState(() => _isUploadingFiles = true);
        attachmentUrls = await _uploadAttachments();
        if (mounted) setState(() => _isUploadingFiles = false);
      }

      // Combine custom field values with dynamic fields
      final allData = <String, dynamic>{};
      if (_customFieldValues.isNotEmpty) {
        allData.addAll(_customFieldValues);
      }
      final dynamicData = _getDynamicFieldsData();
      if (dynamicData.isNotEmpty) {
        allData.addAll(dynamicData);
      }

      // Determine approvers - use selected or fall back to owners/admins (like frontend)
      print('[CreateRequestScreen] _selectedApproverIds: $_selectedApproverIds');
      print('[CreateRequestScreen] _ownersAndAdmins count: ${_ownersAndAdmins.length}');
      for (final admin in _ownersAndAdmins) {
        print('[CreateRequestScreen] Owner/Admin: ${admin.name ?? admin.email}, userId: ${admin.userId}');
      }

      final approverIds = _selectedApproverIds.isNotEmpty
          ? _selectedApproverIds
          : _ownersAndAdmins.map((m) => m.userId).toList();

      print('[CreateRequestScreen] Final approverIds to send: $approverIds');

      // Ensure at least one approver is available
      if (approverIds.isEmpty) {
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('approvals.no_approvers_available'.tr()),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      final response = await _apiService.createRequest(
        workspaceId,
        typeId: _selectedType!.id,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim().isNotEmpty
            ? _descriptionController.text.trim()
            : null,
        priority: _selectedPriority,
        approverIds: approverIds,
        data: allData.isNotEmpty ? allData : null,
        attachments: attachmentUrls?.isNotEmpty == true ? attachmentUrls : null,
        dueDate: _dueDate,
      );

      if (mounted) {
        setState(() => _isSubmitting = false);
        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('approvals.request_created'.tr()),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context, true);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to create request'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _isUploadingFiles = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit request: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _selectDueDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      setState(() => _dueDate = date);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_currentStep == 0
            ? 'approvals.select_type'.tr()
            : 'approvals.new_request'.tr()),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_currentStep > 0) {
              setState(() => _currentStep = 0);
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _currentStep == 0
                  ? _buildTypeSelection()
                  : _buildRequestForm(),
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

  Widget _buildTypeSelection() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_requestTypes.isEmpty) {
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
                'approvals.no_types_hint'.tr(),
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
      itemCount: _requestTypes.length,
      itemBuilder: (context, index) {
        final type = _requestTypes[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: InkWell(
            onTap: () => _onTypeSelected(type),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.borderColor),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: _parseColor(type.color ?? '#2196F3').withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.description_outlined,
                      color: _parseColor(type.color ?? '#2196F3'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          type.name,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        if (type.description != null && type.description!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            type.description!,
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? Colors.white60 : Colors.grey[600],
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                        if (type.fields.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            '${type.fields.length} ${'approvals.fields'.tr()}',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? Colors.white38 : Colors.grey[500],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Icon(
                    Icons.chevron_right,
                    color: isDark ? Colors.white38 : Colors.grey[400],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildRequestForm() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Selected Type Indicator
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _parseColor(_selectedType?.color ?? '#2196F3').withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: _parseColor(_selectedType?.color ?? '#2196F3').withOpacity(0.3),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.description_outlined,
                  color: _parseColor(_selectedType?.color ?? '#2196F3'),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  _selectedType?.name ?? '',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: _parseColor(_selectedType?.color ?? '#2196F3'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Title
          TextFormField(
            controller: _titleController,
            decoration: InputDecoration(
              labelText: 'approvals.request_title'.tr(),
              border: const OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'approvals.title_required'.tr();
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Description
          TextFormField(
            controller: _descriptionController,
            decoration: InputDecoration(
              labelText: 'approvals.description'.tr(),
              border: const OutlineInputBorder(),
            ),
            maxLines: 3,
          ),
          const SizedBox(height: 16),

          // Priority
          DropdownButtonFormField<RequestPriority>(
            value: _selectedPriority,
            decoration: InputDecoration(
              labelText: 'approvals.priority'.tr(),
              border: const OutlineInputBorder(),
            ),
            items: RequestPriority.values.map((priority) {
              return DropdownMenuItem(
                value: priority,
                child: Text(_getPriorityLabel(priority)),
              );
            }).toList(),
            onChanged: (value) {
              if (value != null) {
                setState(() => _selectedPriority = value);
              }
            },
          ),
          const SizedBox(height: 16),

          // Due Date
          InkWell(
            onTap: _selectDueDate,
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: 'approvals.due_date'.tr(),
                border: const OutlineInputBorder(),
                suffixIcon: const Icon(Icons.calendar_today),
              ),
              child: Text(
                _dueDate != null
                    ? DateFormat('MMM d, yyyy').format(_dueDate!)
                    : 'approvals.select_date'.tr(),
                style: TextStyle(
                  color: _dueDate != null
                      ? (isDark ? Colors.white : Colors.black87)
                      : (isDark ? Colors.white38 : Colors.grey[500]),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Approvers Section
          Text(
            'approvals.select_approvers'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white70 : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          _buildApproversList(isDark),
          const SizedBox(height: 24),

          // Custom Fields from Request Type
          if (_selectedType != null && _selectedType!.fields.isNotEmpty) ...[
            Text(
              'approvals.additional_info'.tr(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
            const SizedBox(height: 12),
            ..._selectedType!.fields.map((field) => _buildCustomField(field, isDark)),
          ],

          const SizedBox(height: 24),

          // Dynamic Fields Section
          Row(
            children: [
              Expanded(
                child: Text(
                  'approvals.additional_fields'.tr(),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : Colors.grey[700],
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: _addDynamicField,
                icon: const Icon(Icons.add, size: 18),
                label: Text('approvals.add_field'.tr()),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_dynamicFields.isNotEmpty)
            _buildDynamicFieldsSection(isDark),
          if (_dynamicFields.isEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: context.borderColor),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: isDark ? Colors.white38 : Colors.grey[400],
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'approvals.no_additional_fields'.tr(),
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.white38 : Colors.grey[500],
                      ),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 24),

          // Attachments Section
          Text(
            'approvals.attachments'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white70 : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          _buildAttachmentsSection(isDark),

          const SizedBox(height: 24),

          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _submitRequest,
              style: ElevatedButton.styleFrom(
                backgroundColor: context.primaryColor,
                foregroundColor: Colors.white,
              ),
              child: _isSubmitting
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(_isUploadingFiles
                          ? 'approvals.uploading_files'.tr()
                          : 'approvals.submitting'.tr()),
                      ],
                    )
                  : Text('approvals.submit_request'.tr()),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildApproversList(bool isDark) {
    // Use available approvers (excludes current user)
    final approvers = _availableApprovers;

    if (approvers.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: context.borderColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Text(
            'approvals.no_approvers_available'.tr(),
            style: TextStyle(
              color: isDark ? Colors.white38 : Colors.grey[500],
            ),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: context.borderColor),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: approvers.map((member) {
          final isSelected = _selectedApproverIds.contains(member.userId);
          final isOwnerOrAdmin = member.role == WorkspaceRole.owner || member.role == WorkspaceRole.admin;
          return CheckboxListTile(
            value: isSelected,
            onChanged: (value) {
              setState(() {
                if (value == true) {
                  _selectedApproverIds.add(member.userId);
                } else {
                  _selectedApproverIds.remove(member.userId);
                }
              });
            },
            title: Row(
              children: [
                Expanded(
                  child: Text(
                    member.name ?? member.email,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
                if (isOwnerOrAdmin)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      member.role == WorkspaceRole.owner ? 'Owner' : 'Admin',
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                    ),
                  ),
              ],
            ),
            subtitle: member.name != null
                ? Text(
                    member.email,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                    ),
                  )
                : null,
            secondary: CircleAvatar(
              radius: 18,
              backgroundColor: context.primaryColor.withOpacity(0.2),
              backgroundImage: member.avatar != null
                  ? NetworkImage(member.avatar!)
                  : null,
              child: member.avatar == null
                  ? Text(
                      (member.name ?? member.email)[0].toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: context.primaryColor,
                      ),
                    )
                  : null,
            ),
            controlAffinity: ListTileControlAffinity.trailing,
          );
        }).toList(),
      ),
    );
  }

  Widget _buildDynamicFieldsSection(bool isDark) {
    return Column(
      children: _dynamicFields.asMap().entries.map((entry) {
        final index = entry.key;
        final field = entry.value;
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: context.borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Field type dropdown
                    Container(
                      width: 110,
                      height: 40,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: context.borderColor),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<_DynamicFieldType>(
                          value: field.type,
                          isExpanded: true,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                          items: [
                            DropdownMenuItem(
                              value: _DynamicFieldType.text,
                              child: Text('approvals.field_type_text'.tr()),
                            ),
                            DropdownMenuItem(
                              value: _DynamicFieldType.number,
                              child: Text('approvals.field_type_number'.tr()),
                            ),
                            DropdownMenuItem(
                              value: _DynamicFieldType.date,
                              child: Text('approvals.field_type_date'.tr()),
                            ),
                            DropdownMenuItem(
                              value: _DynamicFieldType.textarea,
                              child: Text('approvals.field_type_textarea'.tr()),
                            ),
                          ],
                          onChanged: (value) {
                            if (value != null) {
                              setState(() {
                                field.type = value;
                                field.value = null;
                                field.valueController.clear();
                              });
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Key/label input
                    Expanded(
                      child: SizedBox(
                        height: 40,
                        child: TextFormField(
                          controller: field.keyController,
                          style: const TextStyle(fontSize: 13),
                          decoration: InputDecoration(
                            hintText: 'approvals.field_name'.tr(),
                            hintStyle: TextStyle(
                              fontSize: 13,
                              color: isDark ? Colors.white38 : Colors.grey[400],
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                            border: const OutlineInputBorder(),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Delete button
                    IconButton(
                      icon: Icon(
                        Icons.close,
                        size: 18,
                        color: isDark ? Colors.white38 : Colors.grey[500],
                      ),
                      onPressed: () => _removeDynamicField(index),
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Value input based on type
                _buildDynamicFieldValueInput(field, isDark),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDynamicFieldValueInput(_DynamicField field, bool isDark) {
    switch (field.type) {
      case _DynamicFieldType.number:
        return TextFormField(
          controller: field.valueController,
          keyboardType: TextInputType.number,
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: 'approvals.enter_number'.tr(),
            hintStyle: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white38 : Colors.grey[400],
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            border: const OutlineInputBorder(),
          ),
        );

      case _DynamicFieldType.date:
        return InkWell(
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
            );
            if (date != null) {
              setState(() {
                field.value = date.toIso8601String().split('T')[0];
                field.valueController.text = DateFormat('MMM d, yyyy').format(date);
              });
            }
          },
          child: InputDecorator(
            decoration: InputDecoration(
              hintText: 'approvals.select_date'.tr(),
              border: const OutlineInputBorder(),
              suffixIcon: const Icon(Icons.calendar_today, size: 18),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            ),
            child: Text(
              field.valueController.text.isEmpty
                  ? 'approvals.select_date'.tr()
                  : field.valueController.text,
              style: TextStyle(
                fontSize: 13,
                color: field.valueController.text.isEmpty
                    ? (isDark ? Colors.white38 : Colors.grey[400])
                    : (isDark ? Colors.white : Colors.black87),
              ),
            ),
          ),
        );

      case _DynamicFieldType.textarea:
        return TextFormField(
          controller: field.valueController,
          maxLines: 3,
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: 'approvals.enter_text'.tr(),
            hintStyle: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white38 : Colors.grey[400],
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            border: const OutlineInputBorder(),
          ),
        );

      default: // text
        return TextFormField(
          controller: field.valueController,
          style: const TextStyle(fontSize: 13),
          decoration: InputDecoration(
            hintText: 'approvals.enter_value'.tr(),
            hintStyle: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white38 : Colors.grey[400],
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            border: const OutlineInputBorder(),
          ),
        );
    }
  }

  Widget _buildAttachmentsSection(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: context.borderColor),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Add file button
          InkWell(
            onTap: _pickFiles,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(8),
              topRight: Radius.circular(8),
            ),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
              decoration: BoxDecoration(
                color: context.primaryColor.withOpacity(0.05),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(8),
                  topRight: const Radius.circular(8),
                  bottomLeft: Radius.circular(_attachments.isEmpty ? 8 : 0),
                  bottomRight: Radius.circular(_attachments.isEmpty ? 8 : 0),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.attach_file,
                    size: 20,
                    color: context.primaryColor,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'approvals.add_attachments'.tr(),
                    style: TextStyle(
                      color: context.primaryColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Attachment list
          if (_attachments.isNotEmpty)
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _attachments.length,
              separatorBuilder: (_, __) => Divider(height: 1, color: context.borderColor),
              itemBuilder: (context, index) {
                final attachment = _attachments[index];
                return ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.insert_drive_file, color: Colors.blue, size: 20),
                  ),
                  title: Text(
                    attachment.name,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    _formatFileSize(attachment.size),
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                    ),
                  ),
                  trailing: IconButton(
                    icon: Icon(
                      Icons.close,
                      size: 18,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                    ),
                    onPressed: () => _removeAttachment(index),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildCustomField(CustomFieldConfig field, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: _buildFieldInput(field, isDark),
    );
  }

  Widget _buildFieldInput(CustomFieldConfig field, bool isDark) {
    switch (field.type) {
      case CustomFieldType.textarea:
        return TextFormField(
          decoration: InputDecoration(
            labelText: field.label + (field.required ? ' *' : ''),
            hintText: field.placeholder,
            border: const OutlineInputBorder(),
          ),
          maxLines: 4,
          onChanged: (value) {
            _customFieldValues[field.label] = value;
          },
          validator: field.required
              ? (value) {
                  if (value == null || value.isEmpty) {
                    return '${field.label} is required';
                  }
                  return null;
                }
              : null,
        );

      case CustomFieldType.number:
        return TextFormField(
          decoration: InputDecoration(
            labelText: field.label + (field.required ? ' *' : ''),
            hintText: field.placeholder,
            border: const OutlineInputBorder(),
          ),
          keyboardType: TextInputType.number,
          onChanged: (value) {
            _customFieldValues[field.label] = num.tryParse(value);
          },
          validator: field.required
              ? (value) {
                  if (value == null || value.isEmpty) {
                    return '${field.label} is required';
                  }
                  return null;
                }
              : null,
        );

      case CustomFieldType.date:
        return InkWell(
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
            );
            if (date != null) {
              setState(() {
                _customFieldValues[field.label] = date.toIso8601String().split('T')[0];
              });
            }
          },
          child: InputDecorator(
            decoration: InputDecoration(
              labelText: field.label + (field.required ? ' *' : ''),
              border: const OutlineInputBorder(),
              suffixIcon: const Icon(Icons.calendar_today),
            ),
            child: Text(
              _customFieldValues[field.label] ?? 'Select date',
              style: TextStyle(
                color: _customFieldValues[field.label] != null
                    ? (isDark ? Colors.white : Colors.black87)
                    : (isDark ? Colors.white38 : Colors.grey[500]),
              ),
            ),
          ),
        );

      case CustomFieldType.select:
        return DropdownButtonFormField<String>(
          decoration: InputDecoration(
            labelText: field.label + (field.required ? ' *' : ''),
            border: const OutlineInputBorder(),
          ),
          items: (field.options ?? []).map((option) {
            return DropdownMenuItem(value: option, child: Text(option));
          }).toList(),
          onChanged: (value) {
            setState(() {
              _customFieldValues[field.label] = value;
            });
          },
          validator: field.required
              ? (value) {
                  if (value == null || value.isEmpty) {
                    return '${field.label} is required';
                  }
                  return null;
                }
              : null,
        );

      case CustomFieldType.checkbox:
        return CheckboxListTile(
          value: _customFieldValues[field.label] == true,
          onChanged: (value) {
            setState(() {
              _customFieldValues[field.label] = value;
            });
          },
          title: Text(field.label),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
        );

      default: // TEXT
        return TextFormField(
          decoration: InputDecoration(
            labelText: field.label + (field.required ? ' *' : ''),
            hintText: field.placeholder,
            border: const OutlineInputBorder(),
          ),
          onChanged: (value) {
            _customFieldValues[field.label] = value;
          },
          validator: field.required
              ? (value) {
                  if (value == null || value.isEmpty) {
                    return '${field.label} is required';
                  }
                  return null;
                }
              : null,
        );
    }
  }

  String _getPriorityLabel(RequestPriority priority) {
    switch (priority) {
      case RequestPriority.low:
        return 'approvals.priority_low'.tr();
      case RequestPriority.normal:
        return 'approvals.priority_normal'.tr();
      case RequestPriority.high:
        return 'approvals.priority_high'.tr();
      case RequestPriority.urgent:
        return 'approvals.priority_urgent'.tr();
    }
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
