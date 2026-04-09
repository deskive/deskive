import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:io';
import '../services/workspace_service.dart';
import '../models/workspace/workspace.dart';
import '../api/services/file_api_service.dart';
import '../theme/app_theme.dart';
import 'workspace_settings_screen.dart';

class WorkspaceScreen extends StatefulWidget {
  const WorkspaceScreen({super.key});

  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final FileApiService _fileApiService = FileApiService();
  bool _isLoading = false;

  // Controllers for create workspace dialog
  final TextEditingController _nameController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  File? _selectedIcon;

  @override
  void initState() {
    super.initState();
    _initializeWorkspaces();

    // Listen to workspace service changes
    _workspaceService.addListener(_onWorkspaceChanged);
  }

  @override
  void dispose() {
    _workspaceService.removeListener(_onWorkspaceChanged);
    _nameController.dispose();
    super.dispose();
  }

  void _onWorkspaceChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _initializeWorkspaces() async {
    setState(() {
      _isLoading = true;
    });

    try {
      _workspaceService.initialize();
      await _workspaceService.fetchWorkspaces();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('workspace.error_loading'.tr(args: [e.toString()]))),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _refreshWorkspaces() async {
    await _workspaceService.fetchWorkspaces();
  }

  /// Build workspace avatar with logo or fallback letter
  Widget _buildWorkspaceAvatar(String? logoUrl, String name, double size, double fontSize) {
    if (logoUrl != null && logoUrl.isNotEmpty && !logoUrl.contains('example.com')) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.2),
            width: 1,
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            logoUrl,
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return _buildFallbackAvatar(name, size, fontSize);
            },
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return _buildFallbackAvatar(name, size, fontSize);
            },
          ),
        ),
      );
    }
    return _buildFallbackAvatar(name, size, fontSize);
  }

  Widget _buildFallbackAvatar(String name, double size, double fontSize) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            context.primaryColor,
            Color(0xFF1E56D8),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : 'W',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: fontSize,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentWorkspace = _workspaceService.currentWorkspace;
    final workspaces = _workspaceService.workspaces;
    final isLoadingService = _workspaceService.isLoading;

    return Scaffold(
      backgroundColor: context.backgroundColor,
      appBar: AppBar(
        backgroundColor: context.backgroundColor,
        elevation: 0,
        title: Text(
          'workspace.workspaces'.tr(),
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _isLoading || isLoadingService ? null : _refreshWorkspaces,
            tooltip: 'common.refresh'.tr(),
          ),
          IconButton(
            icon: Icon(Icons.add),
            onPressed: () {
              _showCreateWorkspaceDialog();
            },
            tooltip: 'workspace.create_workspace'.tr(),
          ),
        ],
      ),
      body: _isLoading || isLoadingService
          ? Center(child: CircularProgressIndicator())
          : SafeArea(
              child: RefreshIndicator(
                onRefresh: _refreshWorkspaces,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Current Workspace Section
                    if (currentWorkspace != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF161B22)
                              : Colors.white,
                          border: Border(
                            bottom: BorderSide(
                              color: isDark
                                  ? const Color(0xFF30363D)
                                  : const Color(0xFFD0D7DE),
                            ),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'workspace.current_workspace'.tr(),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white60 : Colors.grey[600],
                                letterSpacing: 0.5,
                              ),
                            ),
                            SizedBox(height: 12),
                            _buildWorkspaceCard(
                              context,
                              currentWorkspace,
                              isSelected: true,
                              isDark: isDark,
                            ),
                          ],
                        ),
                      ),

                    // All Workspaces Section
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'workspace.all_workspaces'.tr(),
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : Colors.black,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? const Color(0xFF161B22)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: isDark
                                        ? const Color(0xFF30363D)
                                        : const Color(0xFFD0D7DE),
                                  ),
                                ),
                                child: Text(
                                  'workspace.workspace_count'.plural(workspaces.length),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? Colors.white70 : Colors.grey[700],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 16),

                          if (workspaces.isEmpty)
                            _buildEmptyState(context, isDark)
                          else
                            ...workspaces.map((workspace) {
                              final isSelected = workspace.id == currentWorkspace?.id;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _buildWorkspaceCard(
                                  context,
                                  workspace,
                                  isSelected: isSelected,
                                  isDark: isDark,
                                  onTap: () => _selectWorkspace(workspace),
                                ),
                              );
                            }),
                        ],
                      ),
                    ),
                  ],
                  ),
                ),
              ),
            ),
    );
  }

  String _translateSubscriptionTier(String tier) {
    switch (tier.toLowerCase()) {
      case 'free':
        return 'workspace.tier_free'.tr();
      case 'basic':
        return 'workspace.tier_basic'.tr();
      case 'pro':
        return 'workspace.tier_pro'.tr();
      case 'enterprise':
        return 'workspace.tier_enterprise'.tr();
      case 'premium':
        return 'workspace.tier_premium'.tr();
      default:
        return tier.toUpperCase();
    }
  }

  String _translateRole(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'workspace.role_owner'.tr();
      case 'admin':
        return 'workspace.role_admin'.tr();
      case 'member':
        return 'workspace.role_member'.tr();
      case 'viewer':
        return 'workspace.role_viewer'.tr();
      case 'guest':
        return 'workspace.role_guest'.tr();
      default:
        return role;
    }
  }

  Widget _buildWorkspaceCard(
    BuildContext context,
    Workspace workspace, {
    required bool isSelected,
    required bool isDark,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? context.primaryColor
                : (context.borderColor),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: context.primaryColor.withValues(alpha: 0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            // Workspace Avatar
            _buildWorkspaceAvatar(
              workspace.logo,
              workspace.name,
              56,
              24,
            ),
            SizedBox(width: 16),

            // Workspace Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          workspace.name,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isSelected)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: context.primaryColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.check_circle,
                                color: context.primaryColor,
                                size: 14,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'workspace.active'.tr(),
                                style: TextStyle(
                                  color: context.primaryColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  if (workspace.description != null) ...[
                    SizedBox(height: 4),
                    Text(
                      workspace.description!,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  SizedBox(height: 8),
                  Wrap(
                    spacing: 12,
                    runSpacing: 4,
                    children: [
                      _buildInfoChip(
                        Icons.card_membership,
                        _translateSubscriptionTier(workspace.subscriptionTier),
                        isDark,
                      ),
                      if (workspace.membership?.role != null)
                        _buildInfoChip(
                          Icons.badge,
                          _translateRole(workspace.membership!.role),
                          isDark,
                        ),
                      _buildInfoChip(
                        workspace.isActive ? Icons.check_circle : Icons.cancel,
                        workspace.isActive ? 'workspace.active'.tr() : 'workspace.inactive'.tr(),
                        isDark,
                        color: workspace.isActive ? Colors.green : Colors.red,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Settings button for current workspace
            if (isSelected)
              Container(
                margin: const EdgeInsets.only(left: 8),
                child: IconButton(
                  icon: Icon(
                    Icons.settings,
                    size: 22,
                    color: context.primaryColor,
                  ),
                  onPressed: () => _openWorkspaceSettings(workspace),
                  tooltip: 'workspace.workspace_settings'.tr(),
                  padding: const EdgeInsets.all(8),
                  constraints: const BoxConstraints(),
                ),
              ),

            // Arrow for non-selected workspaces
            if (!isSelected && onTap != null)
              Container(
                margin: const EdgeInsets.only(left: 8),
                child: Icon(
                  Icons.arrow_forward_ios,
                  size: 16,
                  color: isDark ? Colors.white38 : Colors.grey[500],
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _openWorkspaceSettings(Workspace workspace) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => WorkspaceSettingsScreen(workspace: workspace),
      ),
    );

    // If workspace was deleted, refresh the list
    if (result != null && result['deleted'] == true) {
      _refreshWorkspaces();
    }
  }

  Widget _buildInfoChip(IconData icon, String label, bool isDark, {Color? color}) {
    final chipColor = color ?? (isDark ? Colors.white60 : Colors.grey[600]);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 12,
          color: chipColor,
        ),
        SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: chipColor,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isDark) {
    return Center(
      child: Container(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.workspaces_outline,
              size: 80,
              color: isDark ? Colors.white24 : Colors.grey[300],
            ),
            SizedBox(height: 16),
            Text(
              'workspace.no_workspaces'.tr(),
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white60 : Colors.grey[700],
              ),
            ),
            SizedBox(height: 8),
            Text(
              'workspace.no_workspaces_get_started'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white38 : Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _showCreateWorkspaceDialog,
              icon: Icon(Icons.add),
              label: Text('workspace.create_workspace'.tr()),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectWorkspace(Workspace workspace) async {
    try {
      await _workspaceService.setCurrentWorkspace(workspace.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('workspace.switched_to_workspace'.tr(args: [workspace.name])),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('workspace.error_switching_workspace'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showCreateWorkspaceDialog() {
    _nameController.clear();
    _selectedIcon = null;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: Text('workspace.create_new_workspace'.tr()),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon Upload Section
                GestureDetector(
                  onTap: () async {
                    await _pickIcon(setDialogState);
                  },
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: _selectedIcon != null
                          ? Colors.transparent
                          : Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.grey[300]!,
                        width: 2,
                      ),
                    ),
                    child: _selectedIcon != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.file(
                              _selectedIcon!,
                              fit: BoxFit.cover,
                            ),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.add_photo_alternate,
                                size: 40,
                                color: Colors.grey[600],
                              ),
                              SizedBox(height: 8),
                              Text(
                                'workspace.upload_icon'.tr(),
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                'workspace.optional'.tr(),
                                style: TextStyle(
                                  color: Colors.grey[500],
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
                SizedBox(height: 24),
                TextField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    labelText: 'workspace.workspace_name_required'.tr(),
                    hintText: 'workspace.workspace_name_hint'.tr(),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    prefixIcon: Icon(Icons.business),
                  ),
                  textCapitalization: TextCapitalization.words,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text('common.cancel'.tr()),
            ),
            ElevatedButton(
              onPressed: () => _createWorkspace(dialogContext),
              child: Text('common.create'.tr()),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickIcon(StateSetter setDialogState) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (image != null) {
        setDialogState(() {
          _selectedIcon = File(image.path);
        });
        setState(() {
          _selectedIcon = File(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('workspace.error_picking_icon'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _createWorkspace(BuildContext dialogContext) async {
    final name = _nameController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('workspace.enter_workspace_name'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('workspace.no_active_workspace'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    Navigator.pop(dialogContext);

    setState(() {
      _isLoading = true;
    });

    String? logoUrl;

    try {
      // Step 1: Upload icon to current workspace if one is selected
      if (_selectedIcon != null) {
        final uploadResponse = await _fileApiService.uploadFile(
          currentWorkspace.id,
          _selectedIcon!,
          UploadFileDto(
            description: 'Workspace icon for $name',
            isPublic: true,
          ),
        );

        if (uploadResponse.isSuccess && uploadResponse.data != null) {
          logoUrl = uploadResponse.data!.url;
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('workspace.icon_upload_failed'.tr(args: [uploadResponse.message ?? ''])),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 2),
              ),
            );
          }
        }
      }

      // Step 2: Create workspace with the uploaded logo URL
      final workspace = await _workspaceService.createWorkspace(
        name: name,
        logo: logoUrl,
      );

      if (workspace != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('workspace.workspace_created'.tr(args: [workspace.name])),
            backgroundColor: Colors.green,
          ),
        );
      } else if (mounted) {
        final error = _workspaceService.error ?? 'Unknown error';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('workspace.workspace_create_failed'.tr(args: [error])),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('workspace.error_creating_workspace'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}
