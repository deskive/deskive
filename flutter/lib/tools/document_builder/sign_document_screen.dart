import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import '../../theme/app_theme.dart';
import '../../api/services/signature_api_service.dart';
import '../../api/services/document_api_service.dart';
import '../../models/signature/user_signature.dart';
import '../../models/document/document.dart';
import '../../services/workspace_management_service.dart';
import '../e_signature/create_signature_screen.dart';
import 'position_signature_screen.dart';

/// Sign Document Screen - Select a signature and sign a document
class SignDocumentScreen extends StatefulWidget {
  final Document document;

  const SignDocumentScreen({
    super.key,
    required this.document,
  });

  @override
  State<SignDocumentScreen> createState() => _SignDocumentScreenState();
}

class _SignDocumentScreenState extends State<SignDocumentScreen> {
  final _signatureApi = SignatureApiService.instance;
  final _documentApi = DocumentApiService.instance;

  List<UserSignature> _signatures = [];
  UserSignature? _selectedSignature;
  bool _isLoading = true;
  bool _isSigning = false;
  bool _agreedToSign = false;
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
      final signatures = await _signatureApi.getSignatures(workspaceId: workspaceId);
      setState(() {
        _signatures = signatures;
        // Auto-select default signature if available
        if (signatures.isNotEmpty) {
          _selectedSignature = signatures.firstWhere(
            (s) => s.isDefault,
            orElse: () => signatures.first,
          );
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _createNewSignature() async {
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

  Future<void> _signDocument() async {
    if (_selectedSignature == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a signature'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (!_agreedToSign) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please agree to sign the document'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isSigning = true);

    try {
      // Get document preview HTML
      final previewHtml = await _documentApi.getPreview(
        workspaceId: workspaceId,
        documentId: widget.document.id,
      );

      if (!mounted) return;

      // Navigate to position signature screen
      final positionResult = await Navigator.push<SignaturePositionResult>(
        context,
        MaterialPageRoute(
          builder: (context) => PositionSignatureScreen(
            document: widget.document,
            signature: _selectedSignature!,
            previewHtml: previewHtml,
          ),
        ),
      );

      if (positionResult == null) {
        // User cancelled positioning
        setState(() => _isSigning = false);
        return;
      }

      // Call API to embed signature at position
      await _documentApi.signDocument(
        workspaceId: workspaceId,
        documentId: widget.document.id,
        signatureId: _selectedSignature!.id,
        xPercent: positionResult.xPercent,
        yPercent: positionResult.yPercent,
        scale: positionResult.scale,
        topPx: positionResult.topPx,
        documentHeight: positionResult.documentHeight,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Document signed successfully'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error signing document: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSigning = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sign Document'),
      ),
      body: _buildContent(isDark),
      bottomNavigationBar: _buildBottomBar(isDark),
    );
  }

  Widget _buildContent(bool isDark) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Document info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[850] : Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.description_outlined,
                    color: Colors.blue[600],
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.document.title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Document #: ${widget.document.documentNumber}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white54 : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Select signature section
          Text(
            'Select Signature',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 12),

          if (_signatures.isEmpty)
            _buildNoSignaturesCard(isDark)
          else
            ..._signatures.map((signature) => _buildSignatureOption(signature, isDark)),

          const SizedBox(height: 8),
          // Add new signature button
          OutlinedButton.icon(
            onPressed: _createNewSignature,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Create New Signature'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Selected signature preview
          if (_selectedSignature != null) ...[
            Text(
              'Signature Preview',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                ),
              ),
              child: _buildSignaturePreview(_selectedSignature!),
            ),
            const SizedBox(height: 24),
          ],

          // Agreement checkbox
          CheckboxListTile(
            value: _agreedToSign,
            onChanged: (value) {
              setState(() => _agreedToSign = value ?? false);
            },
            title: const Text(
              'I agree to sign this document',
              style: TextStyle(fontSize: 14),
            ),
            subtitle: Text(
              'By checking this box, I confirm that I am authorized to sign this document and that my electronic signature is legally binding.',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white54 : Colors.grey[600],
              ),
            ),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }

  Widget _buildNoSignaturesCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[850] : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.draw_outlined,
            size: 48,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 12),
          Text(
            'No Signatures Found',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Create a signature to sign this document',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white54 : Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSignatureOption(UserSignature signature, bool isDark) {
    final isSelected = _selectedSignature?.id == signature.id;

    return GestureDetector(
      onTap: () {
        setState(() => _selectedSignature = signature);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).primaryColor.withOpacity(0.1)
              : (isDark ? Colors.grey[850] : Colors.white),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? Theme.of(context).primaryColor
                : (isDark ? Colors.grey[700]! : Colors.grey[300]!),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Radio<String>(
              value: signature.id,
              groupValue: _selectedSignature?.id,
              onChanged: (value) {
                setState(() => _selectedSignature = signature);
              },
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        signature.name,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      if (signature.isDefault) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.purple.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Default',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.purple[600],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    signature.signatureType.displayName,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.white54 : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            // Mini preview
            Container(
              width: 80,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(5),
                child: _buildMiniPreview(signature),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniPreview(UserSignature signature) {
    if (signature.isTypedSignature) {
      return Center(
        child: Text(
          signature.typedName ?? signature.name,
          style: TextStyle(
            fontFamily: signature.fontFamily ?? 'cursive',
            fontSize: 12,
            color: Colors.black87,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      );
    }

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
        size: 16,
        color: Colors.grey[400],
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
            fontSize: 32,
            color: Colors.black87,
          ),
        ),
      );
    }

    try {
      final data = signature.signatureData;
      if (data.startsWith('data:image')) {
        final base64Data = data.split(',').last;
        return Center(
          child: Image.memory(
            base64Decode(base64Data),
            fit: BoxFit.contain,
          ),
        );
      }
    } catch (e) {
      // Fall through to placeholder
    }

    return Center(
      child: Icon(
        Icons.draw_outlined,
        size: 48,
        color: Colors.grey[400],
      ),
    );
  }

  Widget _buildBottomBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[900] : Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: ElevatedButton(
          onPressed: _selectedSignature != null && _agreedToSign && !_isSigning
              ? _signDocument
              : null,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            backgroundColor: Colors.green,
          ),
          child: _isSigning
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.draw_outlined, size: 20),
                    SizedBox(width: 8),
                    Text('Sign Document'),
                  ],
                ),
        ),
      ),
    );
  }
}
