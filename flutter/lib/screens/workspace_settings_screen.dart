import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:io';
import '../services/workspace_service.dart';
import '../models/workspace/workspace.dart';
import '../api/services/file_api_service.dart';
import '../api/services/workspace_api_service.dart' show WorkspaceApiService, UpdateWorkspaceDto;
import '../theme/app_theme.dart';

class WorkspaceSettingsScreen extends StatefulWidget {
  final Workspace workspace;

  const WorkspaceSettingsScreen({
    super.key,
    required this.workspace,
  });

  @override
  State<WorkspaceSettingsScreen> createState() => _WorkspaceSettingsScreenState();
}

class _WorkspaceSettingsScreenState extends State<WorkspaceSettingsScreen> {
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  final FileApiService _fileApiService = FileApiService();
  final ImagePicker _imagePicker = ImagePicker();

  late TextEditingController _nameController;
  late TextEditingController _descriptionController;

  String? _currentLogoUrl;
  File? _newLogoFile;
  bool _isSaving = false;
  bool _isDeleting = false;
  bool _hasChanges = false;

  /// Check if current user can manage workspace settings
  bool get _canManageWorkspace {
    final membership = widget.workspace.membership;
    if (membership == null) return false;
    return membership.canManageWorkspace();
  }

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.workspace.name);
    _descriptionController = TextEditingController(text: widget.workspace.description ?? '');
    _currentLogoUrl = widget.workspace.logo;

    _nameController.addListener(_onDataChanged);
    _descriptionController.addListener(_onDataChanged);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _onDataChanged() {
    setState(() {
      _hasChanges = _nameController.text != widget.workspace.name ||
          _descriptionController.text != (widget.workspace.description ?? '') ||
          _newLogoFile != null;
    });
  }

  Future<void> _pickLogo() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 256,
        maxHeight: 256,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _newLogoFile = File(image.path);
          _hasChanges = true;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('workspace.error_picking_image'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _saveChanges() async {
    final name = _nameController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('workspace.name_cannot_be_empty'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      String? logoUrl = _currentLogoUrl;

      // Upload new logo if selected
      if (_newLogoFile != null) {
        final uploadResponse = await _fileApiService.uploadFile(
          widget.workspace.id,
          _newLogoFile!,
          UploadFileDto(
            description: 'Workspace logo for $name',
            isPublic: true,
          ),
        );

        if (uploadResponse.isSuccess && uploadResponse.data != null) {
          logoUrl = uploadResponse.data!.url;
        } else {
        }
      }

      // Update workspace
      final response = await _workspaceApiService.updateWorkspace(
        widget.workspace.id,
        UpdateWorkspaceDto(
          name: name,
          description: _descriptionController.text.trim(),
          logo: logoUrl,
        ),
      );

      if (response.success) {
        // Refresh workspaces
        await _workspaceService.fetchWorkspaces();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('workspace.updated_successfully'.tr()),
              backgroundColor: Colors.green,
            ),
          );
          setState(() {
            _hasChanges = false;
            _newLogoFile = null;
            _currentLogoUrl = logoUrl;
          });
        }
      } else {
        throw Exception(response.message ?? 'Failed to update workspace');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('workspace.error_saving_changes'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  void _showDeleteConfirmation() {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
            const SizedBox(width: 8),
            Text('workspace.delete_workspace_title'.tr()),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'workspace.delete_workspace_confirm'.tr(args: [widget.workspace.name]),
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.red, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'workspace.delete_workspace_warning'.tr(),
                      style: TextStyle(
                        color: Colors.red,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dialogContext);
              await _deleteWorkspace(scaffoldMessenger, navigator);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteWorkspace(
    ScaffoldMessengerState scaffoldMessenger,
    NavigatorState navigator,
  ) async {
    setState(() {
      _isDeleting = true;
    });

    try {
      final response = await _workspaceApiService.deleteWorkspace(widget.workspace.id);

      if (response.success) {
        // Refresh workspaces
        await _workspaceService.fetchWorkspaces();

        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('workspace.workspace_deleted'.tr(args: [widget.workspace.name])),
            backgroundColor: Colors.green,
          ),
        );

        // Navigate back
        navigator.pop({'deleted': true});
      } else {
        throw Exception(response.message ?? 'Failed to delete workspace');
      }
    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('workspace.error_deleting_workspace'.tr(args: [e.toString()])),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isDeleting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0D1117) : const Color(0xFFF6F8FA),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF161B22) : Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('workspace.workspace_settings'.tr()),
      ),
      body: SafeArea(
        child: !_canManageWorkspace
            ? _buildRestrictedAccessMessage(isDark)
            : _isDeleting
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('workspace.deleting_workspace'.tr()),
                      ],
                    ),
                  )
                : SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Workspace Settings Card
                  Container(
                    margin: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF161B22) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? const Color(0xFF30363D) : const Color(0xFFD0D7DE),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Row(
                            children: [
                              Icon(
                                Icons.business,
                                color: isDark ? Colors.white70 : Colors.grey[700],
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'workspace.workspace_settings'.tr(),
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? Colors.white : Colors.black,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'workspace.settings_description'.tr(),
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: isDark ? Colors.white54 : Colors.grey[600],
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 2,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Divider(
                          height: 1,
                          color: isDark ? const Color(0xFF30363D) : const Color(0xFFD0D7DE),
                        ),

                        // Logo Section
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'workspace.workspace_logo'.tr(),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  // Logo Preview
                                  Container(
                                    width: 64,
                                    height: 64,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isDark
                                            ? const Color(0xFF30363D)
                                            : const Color(0xFFD0D7DE),
                                      ),
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(11),
                                      child: _newLogoFile != null
                                          ? Image.file(
                                              _newLogoFile!,
                                              fit: BoxFit.cover,
                                            )
                                          : (_currentLogoUrl != null &&
                                                  _currentLogoUrl!.isNotEmpty &&
                                                  !_currentLogoUrl!.contains('example.com'))
                                              ? Image.network(
                                                  _currentLogoUrl!,
                                                  fit: BoxFit.cover,
                                                  errorBuilder: (_, __, ___) =>
                                                      _buildLogoPlaceholder(isDark),
                                                )
                                              : _buildLogoPlaceholder(isDark),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      OutlinedButton.icon(
                                        onPressed: _pickLogo,
                                        icon: const Icon(Icons.upload, size: 18),
                                        label: Text('workspace.upload_logo'.tr()),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: context.primaryColor,
                                          side: BorderSide(color: context.primaryColor),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'workspace.logo_recommendation'.tr(),
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? Colors.white38 : Colors.grey[500],
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Divider(
                          height: 1,
                          color: isDark ? const Color(0xFF30363D) : const Color(0xFFD0D7DE),
                        ),

                        // Name Field
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'workspace.workspace_name'.tr(),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextField(
                                controller: _nameController,
                                decoration: InputDecoration(
                                  hintText: 'workspace.enter_workspace_name'.tr(),
                                  filled: true,
                                  fillColor: isDark
                                      ? const Color(0xFF0D1117)
                                      : const Color(0xFFF6F8FA),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(
                                      color: isDark
                                          ? const Color(0xFF30363D)
                                          : const Color(0xFFD0D7DE),
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(
                                      color: isDark
                                          ? const Color(0xFF30363D)
                                          : const Color(0xFFD0D7DE),
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(
                                      color: context.primaryColor,
                                    ),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Description Field
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'workspace.description'.tr(),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextField(
                                controller: _descriptionController,
                                maxLines: 3,
                                decoration: InputDecoration(
                                  hintText: 'workspace.enter_description'.tr(),
                                  filled: true,
                                  fillColor: isDark
                                      ? const Color(0xFF0D1117)
                                      : const Color(0xFFF6F8FA),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(
                                      color: isDark
                                          ? const Color(0xFF30363D)
                                          : const Color(0xFFD0D7DE),
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(
                                      color: isDark
                                          ? const Color(0xFF30363D)
                                          : const Color(0xFFD0D7DE),
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide(
                                      color: context.primaryColor,
                                    ),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Divider(
                          height: 1,
                          color: isDark ? const Color(0xFF30363D) : const Color(0xFFD0D7DE),
                        ),

                        // Save Button
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton.icon(
                              onPressed: (_hasChanges && !_isSaving) ? _saveChanges : null,
                              icon: _isSaving
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(Icons.save, size: 18),
                              label: Text(_isSaving ? 'workspace.saving'.tr() : 'workspace.save_changes'.tr()),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: context.primaryColor,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                  vertical: 12,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Danger Zone Card
                  Container(
                    margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF161B22) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.red.withOpacity(0.5),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Row(
                            children: [
                              Icon(
                                Icons.warning_amber_rounded,
                                color: Colors.red,
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'common.danger_zone'.tr(),
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.red,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'workspace.danger_zone_description'.tr(),
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: isDark ? Colors.white54 : Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Divider(
                          height: 1,
                          color: Colors.red.withOpacity(0.3),
                        ),

                        // Delete Workspace
                        Container(
                          margin: const EdgeInsets.all(16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: Colors.red.withOpacity(0.2),
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'workspace.delete_workspace'.tr(),
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.red,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'workspace.delete_workspace_description'.tr(),
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: isDark ? Colors.white54 : Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              ElevatedButton.icon(
                                onPressed: _showDeleteConfirmation,
                                icon: const Icon(Icons.delete_outline, size: 18),
                                label: Text('common.delete'.tr()),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 10,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
      ),
    );
  }

  Widget _buildLogoPlaceholder(bool isDark) {
    return Container(
      color: isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8),
      child: Center(
        child: Text(
          widget.workspace.name.isNotEmpty
              ? widget.workspace.name[0].toUpperCase()
              : 'W',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white54 : Colors.grey[600],
          ),
        ),
      ),
    );
  }

  Widget _buildRestrictedAccessMessage(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.orange.withOpacity(0.1)
                    : Colors.orange.withOpacity(0.05),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.lock_outline,
                size: 64,
                color: Colors.orange,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'workspace.access_restricted'.tr(),
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'workspace.admin_only_settings'.tr(),
              style: TextStyle(
                fontSize: 15,
                color: isDark ? Colors.white60 : Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back),
              label: Text('common.back'.tr()),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
