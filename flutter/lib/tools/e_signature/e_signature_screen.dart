import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import '../../theme/app_theme.dart';
import '../../api/services/signature_api_service.dart';
import '../../models/signature/user_signature.dart';
import '../../services/workspace_management_service.dart';
import 'create_signature_screen.dart';

/// E-Signature Tool - Main screen for managing user signatures
class ESignatureScreen extends StatefulWidget {
  const ESignatureScreen({super.key});

  @override
  State<ESignatureScreen> createState() => _ESignatureScreenState();
}

class _ESignatureScreenState extends State<ESignatureScreen> {
  final _apiService = SignatureApiService.instance;

  List<UserSignature> _signatures = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSignatures();
  }

  Future<void> _loadSignatures() async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final signatures = await _apiService.getSignatures(workspaceId: workspaceId);
      setState(() {
        _signatures = signatures;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _createSignature() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => const CreateSignatureScreen(),
      ),
    );

    if (result == true) {
      _loadSignatures();
    }
  }

  Future<void> _setAsDefault(UserSignature signature) async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      await _apiService.setDefaultSignature(
        workspaceId: workspaceId,
        signatureId: signature.id,
      );

      _loadSignatures();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Default signature updated'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _deleteSignature(UserSignature signature) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Signature'),
        content: Text('Are you sure you want to delete "${signature.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      await _apiService.deleteSignature(
        workspaceId: workspaceId,
        signatureId: signature.id,
      );

      _loadSignatures();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Signature deleted'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _editSignatureName(UserSignature signature) async {
    final controller = TextEditingController(text: signature.name);

    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename Signature'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Signature Name',
            hintText: 'Enter a name for this signature',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (newName == null || newName.isEmpty || newName == signature.name) return;

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      await _apiService.updateSignature(
        workspaceId: workspaceId,
        signatureId: signature.id,
        name: newName,
      );

      _loadSignatures();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('E-Signature'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSignatures,
          ),
        ],
      ),
      body: _buildContent(isDark),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createSignature,
        icon: const Icon(Icons.add),
        label: const Text('Add Signature'),
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              'Failed to load signatures',
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.white70 : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white54 : Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadSignatures,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_signatures.isEmpty) {
      return _buildEmptyState(isDark);
    }

    return RefreshIndicator(
      onRefresh: _loadSignatures,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _signatures.length,
        itemBuilder: (context, index) {
          final signature = _signatures[index];
          return _buildSignatureCard(signature, isDark);
        },
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.purple.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.draw_outlined,
              size: 48,
              color: Colors.purple[400],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'No Signatures Yet',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Create your first signature to use\nfor signing documents',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.white54 : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _createSignature,
            icon: const Icon(Icons.add),
            label: const Text('Create Signature'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSignatureCard(UserSignature signature, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: signature.isDefault
            ? BorderSide(color: Colors.purple[400]!, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: () => _showSignatureOptions(signature),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Text(
                          signature.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (signature.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.purple.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'Default',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Colors.purple[600],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      switch (value) {
                        case 'default':
                          _setAsDefault(signature);
                          break;
                        case 'rename':
                          _editSignatureName(signature);
                          break;
                        case 'delete':
                          _deleteSignature(signature);
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      if (!signature.isDefault)
                        const PopupMenuItem(
                          value: 'default',
                          child: Row(
                            children: [
                              Icon(Icons.star_outline, size: 20),
                              SizedBox(width: 8),
                              Text('Set as Default'),
                            ],
                          ),
                        ),
                      const PopupMenuItem(
                        value: 'rename',
                        child: Row(
                          children: [
                            Icon(Icons.edit_outlined, size: 20),
                            SizedBox(width: 8),
                            Text('Rename'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline, size: 20, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Delete', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Signature preview
              Container(
                width: double.infinity,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                  ),
                ),
                child: _buildSignaturePreview(signature),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    _getSignatureTypeIcon(signature.signatureType),
                    size: 14,
                    color: isDark ? Colors.white54 : Colors.grey[600],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    signature.signatureType.displayName,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white54 : Colors.grey[600],
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'Created ${_formatDate(signature.createdAt)}',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSignaturePreview(UserSignature signature) {
    if (signature.isTypedSignature) {
      return Center(
        child: Text(
          signature.typedName ?? signature.name,
          style: TextStyle(
            fontFamily: signature.fontFamily ?? 'cursive',
            fontSize: 28,
            color: Colors.black87,
          ),
        ),
      );
    }

    // For drawn/uploaded signatures, try to display the base64 image
    try {
      final data = signature.signatureData;
      if (data.startsWith('data:image')) {
        final base64Data = data.split(',').last;
        return Image.memory(
          base64Decode(base64Data),
          fit: BoxFit.contain,
        );
      }
    } catch (e) {
      // Fall through to placeholder
    }

    return Center(
      child: Icon(
        Icons.draw_outlined,
        size: 32,
        color: Colors.grey[400],
      ),
    );
  }

  IconData _getSignatureTypeIcon(SignatureType type) {
    switch (type) {
      case SignatureType.drawn:
        return Icons.draw_outlined;
      case SignatureType.typed:
        return Icons.keyboard_outlined;
      case SignatureType.uploaded:
        return Icons.upload_outlined;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) {
      return 'today';
    } else if (diff.inDays == 1) {
      return 'yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return DateFormat('MMM d, y').format(date);
    }
  }

  void _showSignatureOptions(UserSignature signature) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              signature.name,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            if (!signature.isDefault)
              ListTile(
                leading: const Icon(Icons.star_outline),
                title: const Text('Set as Default'),
                onTap: () {
                  Navigator.pop(context);
                  _setAsDefault(signature);
                },
              ),
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('Rename'),
              onTap: () {
                Navigator.pop(context);
                _editSignatureName(signature);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text('Delete', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                _deleteSignature(signature);
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
