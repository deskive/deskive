import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:webview_flutter/webview_flutter.dart';
import '../../theme/app_theme.dart';
import '../../api/services/document_api_service.dart';
import '../../api/services/document_template_api_service.dart';
import '../../api/services/workspace_api_service.dart';
import '../../api/services/email_api_service.dart';
import '../../api/services/signature_api_service.dart';
import '../../models/document/document.dart';
import '../../models/template/document_template.dart';
import '../../services/workspace_management_service.dart';
import '../templates/document_template_constants.dart';
import 'widgets/document_status_badge.dart';
import 'sign_document_screen.dart';
import '../e_signature/e_signature_screen.dart';
import '../e_signature/create_signature_screen.dart';

/// Document detail screen - shows document details, recipients, and actions
class DocumentDetailScreen extends StatefulWidget {
  final String documentId;

  const DocumentDetailScreen({
    super.key,
    required this.documentId,
  });

  @override
  State<DocumentDetailScreen> createState() => _DocumentDetailScreenState();
}

class _DocumentDetailScreenState extends State<DocumentDetailScreen> {
  final _apiService = DocumentApiService.instance;

  Document? _document;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDocument();
  }

  Future<void> _loadDocument() async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final document = await _apiService.getDocument(
        workspaceId: workspaceId,
        documentId: widget.documentId,
      );
      setState(() {
        _document = document;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _sendForSignature() async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null || _document == null) return;

    // Show send dialog
    final result = await showDialog<Map<String, dynamic>?>(
      context: context,
      builder: (context) => _SendForSignatureDialog(document: _document!),
    );

    if (result == null) return;

    try {
      await _apiService.sendForSignature(
        workspaceId: workspaceId,
        documentId: widget.documentId,
        subject: result['subject'],
        message: result['message'],
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('document_builder.sent_for_signature'.tr()),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.green,
          ),
        );
        _loadDocument();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _saveAsTemplate() async {
    if (_document == null) return;

    // Show save as template dialog
    final result = await showDialog<Map<String, dynamic>?>(
      context: context,
      builder: (context) => _SaveAsTemplateDialog(document: _document!),
    );

    if (result == null) return;

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      final templateApiService = DocumentTemplateApiService.instance;

      await templateApiService.createTemplate(
        workspaceId: workspaceId,
        name: result['name'] as String,
        slug: _generateSlug(result['name'] as String),
        documentType: _document!.documentType,
        content: _document!.content,
        description: result['description'] as String?,
        category: result['category'] as String?,
        contentHtml: _document!.contentHtml,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Template saved successfully'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        String errorMessage = 'Error saving template';
        final errorString = e.toString().toLowerCase();
        if (errorString.contains('409') || errorString.contains('conflict') || errorString.contains('already exists')) {
          errorMessage = 'A template with this name already exists. Please try a different name.';
        } else {
          errorMessage = 'Error saving template: $e';
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  String _generateSlug(String name) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final baseSlug = name
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .trim();
    return '$baseSlug-$timestamp';
  }

  Future<void> _deleteDocument() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('document_builder.delete_confirm_title'.tr()),
        content: Text('document_builder.delete_confirm_message'.tr()),
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

    if (confirm != true) return;

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      await _apiService.deleteDocument(
        workspaceId: workspaceId,
        documentId: widget.documentId,
      );

      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('document_builder.error_deleting'.tr()),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _previewDocument() async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      final html = await _apiService.getPreview(
        workspaceId: workspaceId,
        documentId: widget.documentId,
      );

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DocumentPreviewScreen(
              html: html,
              documentTitle: _document?.title ?? 'Document',
              document: _document,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('document_builder.error_preview'.tr()),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _editDocument() async {
    if (_document == null) return;

    // Check if document is editable
    if (!_document!.isEditable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This document cannot be edited because it has been signed or sent.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    // Navigate to edit screen
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => DocumentEditScreen(
          document: _document!,
          workspaceId: workspaceId,
        ),
      ),
    );

    // Reload document if it was edited
    if (result == true && mounted) {
      _loadDocument();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(_document?.title ?? 'document_builder.document'.tr()),
        actions: [
          if (_document != null) ...[
            IconButton(
              icon: const Icon(Icons.preview_outlined),
              onPressed: _previewDocument,
              tooltip: 'Preview',
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'save_as_template':
                    _saveAsTemplate();
                    break;
                  case 'delete':
                    _deleteDocument();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'save_as_template',
                  child: Row(
                    children: [
                      Icon(Icons.save_as_outlined, color: Colors.blue),
                      SizedBox(width: 8),
                      Text('Save as Template'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(Icons.delete_outline, color: Colors.red),
                      const SizedBox(width: 8),
                      Text(
                        'common.delete'.tr(),
                        style: const TextStyle(color: Colors.red),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      body: _buildContent(isDark),
      bottomNavigationBar: _document != null
          ? SafeArea(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: context.cardColor,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _document!.isEditable ? _editDocument : null,
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        label: Text('common.edit'.tr()),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _shareDocument,
                        icon: const Icon(Icons.share_outlined, size: 18),
                        label: const Text('Share'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildContent(bool isDark) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.red[300],
            ),
            const SizedBox(height: 16),
            Text(
              'document_builder.error_loading'.tr(),
              style: TextStyle(
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadDocument,
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_document == null) {
      return Center(
        child: Text('document_builder.document_not_found'.tr()),
      );
    }

    final color =
        DocumentTemplateConstants.getDocumentTypeColor(_document!.documentType);

    return RefreshIndicator(
      onRefresh: _loadDocument,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Document header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: context.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(
                          DocumentTemplateConstants.getDocumentTypeIcon(
                              _document!.documentType),
                          color: color,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _document!.title,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _document!.documentNumber,
                              style: TextStyle(
                                fontSize: 13,
                                color:
                                    isDark ? Colors.white54 : Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  DocumentStatusBadge(
                    status: _document!.status,
                    fontSize: 12,
                  ),
                  if (_document!.description != null) ...[
                    const SizedBox(height: 16),
                    Text(
                      _document!.description!,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white70 : Colors.grey[700],
                        height: 1.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Quick Actions
            _buildSectionHeader('Quick Actions', isDark),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildActionCard(
                    icon: Icons.visibility_outlined,
                    label: 'Preview',
                    onTap: _previewDocument,
                    color: Colors.blue,
                    isDark: isDark,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildActionCard(
                    icon: Icons.print_outlined,
                    label: 'Print',
                    onTap: () async {
                      final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
                      if (workspaceId == null) return;
                      try {
                        final html = await _apiService.getPreview(
                          workspaceId: workspaceId,
                          documentId: widget.documentId,
                        );
                        if (mounted) {
                          _printDocument(html);
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Error: $e')),
                          );
                        }
                      }
                    },
                    color: Colors.green,
                    isDark: isDark,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildActionCard(
                    icon: Icons.draw_outlined,
                    label: 'Signature',
                    onTap: () => _openSignatureFlow(),
                    color: Colors.purple,
                    isDark: isDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Recipients section
            if (_document!.recipients != null &&
                _document!.recipients!.isNotEmpty) ...[
              _buildSectionHeader('Recipients (${_document!.recipients!.length})', isDark),
              const SizedBox(height: 12),
              Container(
                constraints: const BoxConstraints(maxHeight: 250),
                decoration: BoxDecoration(
                  color: context.cardColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: context.borderColor),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: EdgeInsets.zero,
                  itemCount: _document!.recipients!.length,
                  separatorBuilder: (_, __) => Divider(
                    height: 1,
                    color: context.borderColor,
                  ),
                  itemBuilder: (context, index) {
                    final recipient = _document!.recipients![index];
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      leading: CircleAvatar(
                        backgroundColor: Color(recipient.status.color)
                            .withOpacity(0.2),
                        child: Icon(
                          _getRecipientIcon(recipient.role),
                          color: Color(recipient.status.color),
                          size: 20,
                        ),
                      ),
                      title: Text(
                        recipient.name,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(
                        recipient.email,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white54 : Colors.grey[600],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 100),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Color(recipient.status.color).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            recipient.status.displayName,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: Color(recipient.status.color),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Document info
            _buildSectionHeader('Details', isDark),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: context.borderColor),
              ),
              child: Column(
                children: [
                  _buildInfoRow(
                    Icons.category_outlined,
                    'Type',
                    _document!.documentType.singularName,
                    isDark,
                  ),
                  const Divider(height: 24),
                  _buildInfoRow(
                    Icons.calendar_today_outlined,
                    'Created',
                    DateFormat('MMM d, yyyy').format(_document!.createdAt),
                    isDark,
                  ),
                  const Divider(height: 24),
                  _buildInfoRow(
                    Icons.update_outlined,
                    'Updated',
                    DateFormat('MMM d, yyyy').format(_document!.updatedAt),
                    isDark,
                  ),
                  if (_document!.expiresAt != null) ...[
                    const Divider(height: 24),
                    _buildInfoRow(
                      Icons.event_outlined,
                      'Expires',
                      DateFormat('MMM d, yyyy').format(_document!.expiresAt!),
                      isDark,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.borderColor),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, bool isDark) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: isDark ? Colors.white : Colors.black87,
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, bool isDark) {
    return Row(
      children: [
        Icon(
          icon,
          size: 18,
          color: isDark ? Colors.white38 : Colors.grey[500],
        ),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: isDark ? Colors.white54 : Colors.grey[600],
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
      ],
    );
  }

  IconData _getRecipientIcon(RecipientRole role) {
    switch (role) {
      case RecipientRole.signer:
        return Icons.draw_outlined;
      case RecipientRole.viewer:
        return Icons.visibility_outlined;
      case RecipientRole.approver:
        return Icons.check_circle_outline;
      case RecipientRole.cc:
        return Icons.mail_outline;
    }
  }

  Future<void> _printDocument(String html) async {
    // Use Printing.convertHtml to properly convert HTML to PDF
    // This preserves CSS positioning including absolute positioned signatures
    try {
      final pdfBytes = await Printing.convertHtml(
        format: PdfPageFormat.a4,
        html: html,
      );

      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => pdfBytes,
      );
    } catch (e) {
      // Fallback to manual PDF generation if HTML conversion fails
      await _printDocumentFallback(html);
    }
  }

  Future<void> _printDocumentFallback(String html) async {
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async {
        final doc = pw.Document();

        // Extract signature info from HTML if present
        Uint8List? signatureImageBytes;
        String? signatureText;
        double signatureScale = 1.0;

        // Match the entire embedded-signature div with its style attributes
        final signatureDivMatch = RegExp(r'<div[^>]*class="embedded-signature"[^>]*style="([^"]*)"[^>]*>([\s\S]*?)</div>\s*</div>').firstMatch(html);

        if (signatureDivMatch != null) {
          final styleAttr = signatureDivMatch.group(1) ?? '';
          final signatureHtml = signatureDivMatch.group(2) ?? '';

          // Extract scale from style
          final scaleMatch = RegExp(r'scale\((\d+(?:\.\d+)?)\)').firstMatch(styleAttr);
          if (scaleMatch != null) signatureScale = double.tryParse(scaleMatch.group(1)!) ?? 1.0;

          // Extract base64 image
          final imgMatch = RegExp(r'<img[^>]*src="data:image/[^;]+;base64,([^"]+)"[^>]*>').firstMatch(signatureHtml);
          if (imgMatch != null) {
            try {
              signatureImageBytes = base64Decode(imgMatch.group(1)!);
            } catch (e) {
              // Ignore decode errors
            }
          }

          // Extract signature text info (Digitally signed by...)
          final textContent = signatureHtml
              .replaceAll(RegExp(r'<[^>]*>'), ' ')
              .replaceAll(RegExp(r'\s+'), ' ')
              .trim();
          if (textContent.contains('Digitally signed')) {
            signatureText = textContent;
          }
        }

        // Convert HTML content to plain text for PDF (excluding signature block)
        final plainText = _htmlToPlainText(html);

        // Split text into paragraphs for proper page handling
        final paragraphs = plainText.split('\n\n').where((p) => p.trim().isNotEmpty && !p.contains('--- SIGNATURE ---')).toList();

        // Create signature widget if we have signature data
        pw.Widget? signatureWidget;
        if (signatureImageBytes != null || signatureText != null) {
          signatureWidget = pw.Container(
            padding: const pw.EdgeInsets.all(8),
            decoration: pw.BoxDecoration(
              color: PdfColors.white,
              border: pw.Border.all(color: PdfColors.grey400, width: 0.5),
              borderRadius: pw.BorderRadius.circular(4),
            ),
            child: pw.Column(
              mainAxisSize: pw.MainAxisSize.min,
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                if (signatureImageBytes != null)
                  pw.Image(
                    pw.MemoryImage(signatureImageBytes),
                    height: 40 * signatureScale,
                    fit: pw.BoxFit.contain,
                  ),
                if (signatureText != null)
                  pw.Padding(
                    padding: const pw.EdgeInsets.only(top: 4),
                    child: pw.Text(
                      signatureText,
                      style: pw.TextStyle(
                        fontSize: 8 * signatureScale,
                        color: PdfColors.grey700,
                      ),
                    ),
                  ),
              ],
            ),
          );
        }

        doc.addPage(
          pw.MultiPage(
            pageFormat: PdfPageFormat.a4,
            margin: const pw.EdgeInsets.all(40),
            build: (pw.Context context) {
              final List<pw.Widget> widgets = [
                pw.Header(
                  level: 0,
                  child: pw.Text(
                    _document?.title ?? 'Document',
                    style: pw.TextStyle(
                      fontSize: 24,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.SizedBox(height: 20),
                // Add each paragraph separately for proper page breaks
                ...paragraphs.map((paragraph) => pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 12),
                  child: pw.Text(
                    paragraph.trim(),
                    style: const pw.TextStyle(
                      fontSize: 12,
                      lineSpacing: 1.5,
                    ),
                  ),
                )),
              ];

              // Add signature at the end of the document
              if (signatureWidget != null) {
                widgets.add(pw.SizedBox(height: 20));
                widgets.add(signatureWidget);
              }

              return widgets;
            },
          ),
        );

        return doc.save();
      },
    );
  }

  String _htmlToPlainText(String html) {
    // Remove style tags and their content
    String text = html.replaceAll(RegExp(r'<style[^>]*>[\s\S]*?</style>'), '');
    // Remove script tags and their content
    text = text.replaceAll(RegExp(r'<script[^>]*>[\s\S]*?</script>'), '');
    // Mark embedded signature block (will be handled separately)
    text = text.replaceAll(RegExp(r'<div[^>]*class="embedded-signature"[^>]*>[\s\S]*?</div>\s*</div>'), '\n\n--- SIGNATURE ---\n');
    // Replace br tags with newlines
    text = text.replaceAll(RegExp(r'<br\s*/?>'), '\n');
    // Replace p tags with double newlines
    text = text.replaceAll(RegExp(r'</p>'), '\n\n');
    // Replace heading tags with newlines
    text = text.replaceAll(RegExp(r'</h[1-6]>'), '\n\n');
    // Replace closing div with newline
    text = text.replaceAll(RegExp(r'</div>'), '\n');
    // Remove img tags
    text = text.replaceAll(RegExp(r'<img[^>]*>'), '');
    // Remove all remaining HTML tags
    text = text.replaceAll(RegExp(r'<[^>]*>'), '');
    // Decode HTML entities
    text = text.replaceAll('&nbsp;', ' ');
    text = text.replaceAll('&amp;', '&');
    text = text.replaceAll('&lt;', '<');
    text = text.replaceAll('&gt;', '>');
    text = text.replaceAll('&quot;', '"');
    // Clean up whitespace
    text = text.replaceAll(RegExp(r'\n{3,}'), '\n\n');
    return text.trim();
  }

  Future<void> _openSignatureFlow() async {
    if (_document == null) return;

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    // Check if user has any signatures
    final signatureApi = SignatureApiService.instance;

    try {
      final signatures = await signatureApi.getSignatures(workspaceId: workspaceId);

      if (!mounted) return;

      if (signatures.isNotEmpty) {
        // User has signatures - open sign document screen
        final result = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (context) => SignDocumentScreen(document: _document!),
          ),
        );

        if (result == true && mounted) {
          _loadDocument();
        }
        return;
      }
    } catch (e) {
      // If error, still show the dialog to create/manage signatures
    }

    if (!mounted) return;

    {
      // No signatures - ask user what to do
      final action = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('No Signatures Found'),
          content: const Text(
            'You need to create a signature first before you can sign documents. Would you like to create one now?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, 'manage'),
              child: const Text('Manage Signatures'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, 'create'),
              child: const Text('Create Signature'),
            ),
          ],
        ),
      );

      if (action == 'create' && mounted) {
        final created = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (context) => const CreateSignatureScreen(),
          ),
        );

        if (created == true && mounted) {
          // After creating signature, open sign document screen
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => SignDocumentScreen(document: _document!),
            ),
          );
        }
      } else if (action == 'manage' && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const ESignatureScreen(),
          ),
        );
      }
    }
  }

  Future<void> _shareDocument() async {
    if (_document == null) return;

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => _ShareDocumentDialog(
        document: _document!,
        workspaceId: workspaceId,
      ),
    );

    if (result == true) {
      _loadDocument();
    }
  }
}

/// Document Preview Screen with proper HTML rendering using WebView
class DocumentPreviewScreen extends StatefulWidget {
  final String html;
  final String documentTitle;
  final Document? document;

  const DocumentPreviewScreen({
    super.key,
    required this.html,
    required this.documentTitle,
    this.document,
  });

  @override
  State<DocumentPreviewScreen> createState() => _DocumentPreviewScreenState();
}

class _DocumentPreviewScreenState extends State<DocumentPreviewScreen> {
  late WebViewController _webViewController;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) {
            setState(() => _isLoading = false);
          },
        ),
      )
      ..loadHtmlString(widget.html);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1a1a1a) : const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(widget.documentTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.print_outlined),
            onPressed: () => _printDocument(context),
            tooltip: 'Print',
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              if (widget.document != null) {
                final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
                if (workspaceId != null) {
                  showDialog(
                    context: context,
                    builder: (context) => _ShareDocumentDialog(
                      document: widget.document!,
                      workspaceId: workspaceId,
                    ),
                  );
                }
              }
            },
            tooltip: 'Share',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Stack(
                children: [
                  WebViewWidget(controller: _webViewController),
                  if (_isLoading)
                    const Center(child: CircularProgressIndicator()),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _printDocument(BuildContext context) async {
    // Use Printing.convertHtml to properly convert HTML to PDF
    // This preserves CSS positioning including absolute positioned signatures
    try {
      final pdfBytes = await Printing.convertHtml(
        format: PdfPageFormat.a4,
        html: widget.html,
      );

      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => pdfBytes,
      );
    } catch (e) {
      // Show error message if conversion fails
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error printing: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _htmlToPlainText(String htmlContent) {
    // Remove style tags and their content
    String text = htmlContent.replaceAll(RegExp(r'<style[^>]*>[\s\S]*?</style>'), '');
    // Remove script tags and their content
    text = text.replaceAll(RegExp(r'<script[^>]*>[\s\S]*?</script>'), '');
    // Mark embedded signature block (will be handled separately)
    text = text.replaceAll(RegExp(r'<div[^>]*class="embedded-signature"[^>]*>[\s\S]*?</div>\s*</div>'), '\n\n--- SIGNATURE ---\n');
    // Replace br tags with newlines
    text = text.replaceAll(RegExp(r'<br\s*/?>'), '\n');
    // Replace p tags with double newlines
    text = text.replaceAll(RegExp(r'</p>'), '\n\n');
    // Replace heading tags with newlines
    text = text.replaceAll(RegExp(r'</h[1-6]>'), '\n\n');
    // Replace closing div with newline
    text = text.replaceAll(RegExp(r'</div>'), '\n');
    // Remove img tags
    text = text.replaceAll(RegExp(r'<img[^>]*>'), '');
    // Remove all remaining HTML tags
    text = text.replaceAll(RegExp(r'<[^>]*>'), '');
    // Decode HTML entities
    text = text.replaceAll('&nbsp;', ' ');
    text = text.replaceAll('&amp;', '&');
    text = text.replaceAll('&lt;', '<');
    text = text.replaceAll('&gt;', '>');
    text = text.replaceAll('&quot;', '"');
    // Clean up whitespace
    text = text.replaceAll(RegExp(r'\n{3,}'), '\n\n');
    return text.trim();
  }
}

/// Dialog for saving document as template
class _SaveAsTemplateDialog extends StatefulWidget {
  final Document document;

  const _SaveAsTemplateDialog({required this.document});

  @override
  State<_SaveAsTemplateDialog> createState() => _SaveAsTemplateDialogState();
}

class _SaveAsTemplateDialogState extends State<_SaveAsTemplateDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _selectedCategory;

  final List<String> _categories = [
    'Business',
    'Legal',
    'HR',
    'Sales',
    'Marketing',
    'Finance',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    _nameController.text = '${widget.document.title} Template';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      title: Row(
        children: [
          Icon(
            Icons.save_as_outlined,
            color: Theme.of(context).primaryColor,
          ),
          const SizedBox(width: 12),
          const Text('Save as Template'),
        ],
      ),
      content: SizedBox(
        width: MediaQuery.of(context).size.width * 0.8,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Info card
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Colors.blue.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: Colors.blue[600],
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'This document will be saved as a reusable template for future use.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.blue[700],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Template Name
                TextFormField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    labelText: 'Template Name *',
                    hintText: 'Enter a name for this template',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    prefixIcon: const Icon(Icons.title),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a template name';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Description
                TextFormField(
                  controller: _descriptionController,
                  decoration: InputDecoration(
                    labelText: 'Description (optional)',
                    hintText: 'Describe what this template is for',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    prefixIcon: const Icon(Icons.description_outlined),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),

                // Category
                DropdownButtonFormField<String>(
                  value: _selectedCategory,
                  decoration: InputDecoration(
                    labelText: 'Category (optional)',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    prefixIcon: const Icon(Icons.category_outlined),
                  ),
                  items: _categories.map((category) {
                    return DropdownMenuItem(
                      value: category.toLowerCase(),
                      child: Text(category),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() => _selectedCategory = value);
                  },
                ),
                const SizedBox(height: 16),

                // Document type info
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey[850] : Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        DocumentTemplateConstants.getDocumentTypeIcon(
                          widget.document.documentType,
                        ),
                        size: 20,
                        color: DocumentTemplateConstants.getDocumentTypeColor(
                          widget.document.documentType,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Type: ${widget.document.documentType.singularName}',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.white70 : Colors.grey[700],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton.icon(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              Navigator.pop(context, {
                'name': _nameController.text.trim(),
                'description': _descriptionController.text.trim().isNotEmpty
                    ? _descriptionController.text.trim()
                    : null,
                'category': _selectedCategory,
              });
            }
          },
          icon: const Icon(Icons.save),
          label: const Text('Save Template'),
        ),
      ],
    );
  }
}

/// Dialog for sending document for signature
class _SendForSignatureDialog extends StatefulWidget {
  final Document document;

  const _SendForSignatureDialog({required this.document});

  @override
  State<_SendForSignatureDialog> createState() => _SendForSignatureDialogState();
}

class _SendForSignatureDialogState extends State<_SendForSignatureDialog> {
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  final _emailController = TextEditingController();
  final _nameController = TextEditingController();
  final _documentApi = DocumentApiService.instance;
  final _workspaceApi = WorkspaceApiService();

  List<WorkspaceMember> _workspaceMembers = [];
  List<DocumentRecipient> _recipients = [];
  bool _isLoadingMembers = true;
  bool _isAddingRecipient = false;
  String? _workspaceId;

  @override
  void initState() {
    super.initState();
    _subjectController.text = 'Please sign: ${widget.document.title}';
    _messageController.text = 'You have been requested to sign the following document. Please review and sign at your earliest convenience.';
    _recipients = List.from(widget.document.recipients ?? []);
    _loadWorkspaceMembers();
  }

  Future<void> _loadWorkspaceMembers() async {
    // Get workspace ID from somewhere - we need to pass it or get it from context
    // For now, we'll try to get it from the document's workspace_id
    try {
      final response = await _workspaceApi.getMembers(widget.document.workspaceId);
      if (response.isSuccess && response.data != null) {
        setState(() {
          _workspaceMembers = response.data!;
          _workspaceId = widget.document.workspaceId;
          _isLoadingMembers = false;
        });
      } else {
        setState(() => _isLoadingMembers = false);
      }
    } catch (e) {
      setState(() => _isLoadingMembers = false);
    }
  }

  Future<void> _addRecipient({String? email, String? name}) async {
    final recipientEmail = email ?? _emailController.text.trim();
    final recipientName = name ?? _nameController.text.trim();

    if (recipientEmail.isEmpty) return;

    // Check if already added
    if (_recipients.any((r) => r.email.toLowerCase() == recipientEmail.toLowerCase())) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Recipient already added')),
      );
      return;
    }

    setState(() => _isAddingRecipient = true);

    try {
      final newRecipient = await _documentApi.addRecipient(
        workspaceId: widget.document.workspaceId,
        documentId: widget.document.id,
        email: recipientEmail,
        name: recipientName.isEmpty ? recipientEmail.split('@').first : recipientName,
        role: RecipientRole.signer,
      );

      setState(() {
        _recipients.add(newRecipient);
        _emailController.clear();
        _nameController.clear();
        _isAddingRecipient = false;
      });
    } catch (e) {
      setState(() => _isAddingRecipient = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add recipient: $e')),
        );
      }
    }
  }

  Future<void> _removeRecipient(DocumentRecipient recipient) async {
    try {
      await _documentApi.removeRecipient(
        workspaceId: widget.document.workspaceId,
        documentId: widget.document.id,
        recipientId: recipient.id,
      );
      setState(() {
        _recipients.removeWhere((r) => r.id == recipient.id);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to remove recipient: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    _emailController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 500,
        constraints: BoxConstraints(maxHeight: screenHeight * 0.85),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.send_outlined, color: Colors.blue),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Send for Signature',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Recipients will receive an email to sign',
                          style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Scrollable content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Email Subject
                    TextField(
                      controller: _subjectController,
                      decoration: InputDecoration(
                        labelText: 'Email Subject',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        prefixIcon: const Icon(Icons.subject, size: 20),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Message
                    TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        labelText: 'Message',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        alignLabelWithHint: true,
                      ),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 24),

                    // Add Recipient Section
                    Text(
                      'Add Recipients',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Quick add from workspace members
                    if (_isLoadingMembers)
                      const Center(child: CircularProgressIndicator(strokeWidth: 2))
                    else if (_workspaceMembers.isNotEmpty) ...[
                      Text(
                        'From Workspace',
                        style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : Colors.grey[600]),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 40,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _workspaceMembers.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final member = _workspaceMembers[index];
                            final isAdded = _recipients.any((r) => r.email.toLowerCase() == member.email.toLowerCase());
                            return ActionChip(
                              avatar: CircleAvatar(
                                radius: 12,
                                backgroundColor: isAdded ? Colors.green : Colors.grey[300],
                                child: Text(
                                  (member.name ?? member.email)[0].toUpperCase(),
                                  style: TextStyle(fontSize: 10, color: isAdded ? Colors.white : Colors.black87),
                                ),
                              ),
                              label: Text(
                                member.name ?? member.email.split('@').first,
                                style: TextStyle(fontSize: 12, color: isAdded ? Colors.green : null),
                              ),
                              onPressed: isAdded ? null : () => _addRecipient(email: member.email, name: member.name ?? member.email.split('@').first),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Manual email entry
                    Text(
                      'Or Enter Email',
                      style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : Colors.grey[600]),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              hintText: 'Email address',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              isDense: true,
                            ),
                            keyboardType: TextInputType.emailAddress,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _nameController,
                            decoration: InputDecoration(
                              hintText: 'Name',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 44,
                          child: ElevatedButton(
                            onPressed: _isAddingRecipient ? null : () => _addRecipient(),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                            ),
                            child: _isAddingRecipient
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Icon(Icons.add, size: 20),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Recipients List
                    Text(
                      'Signers (${_recipients.where((r) => r.role == RecipientRole.signer).length})',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_recipients.where((r) => r.role == RecipientRole.signer).isEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.orange.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.orange.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, size: 20, color: Colors.orange[700]),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Add at least one signer to send the document for signature',
                                style: TextStyle(fontSize: 13, color: Colors.orange[700]),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (_recipients.isNotEmpty)
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: isDark ? Colors.white12 : Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: _recipients.asMap().entries.map((entry) {
                            final index = entry.key;
                            final recipient = entry.value;
                            final isSigner = recipient.role == RecipientRole.signer;
                            return Column(
                              children: [
                                if (index > 0) Divider(height: 1, color: isDark ? Colors.white12 : Colors.grey[200]),
                                ListTile(
                                  dense: true,
                                  leading: CircleAvatar(
                                    radius: 16,
                                    backgroundColor: isSigner ? Colors.blue.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                                    child: Icon(
                                      isSigner ? Icons.draw_outlined : Icons.visibility_outlined,
                                      size: 16,
                                      color: isSigner ? Colors.blue : Colors.grey,
                                    ),
                                  ),
                                  title: Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          recipient.name,
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isSigner ? Colors.blue.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          isSigner ? 'Signer' : 'Viewer',
                                          style: TextStyle(fontSize: 10, color: isSigner ? Colors.blue : Colors.grey),
                                        ),
                                      ),
                                    ],
                                  ),
                                  subtitle: Text(
                                    recipient.email,
                                    style: TextStyle(fontSize: 11, color: isDark ? Colors.white54 : Colors.grey[600]),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  trailing: IconButton(
                                    icon: Icon(Icons.close, size: 18, color: Colors.red[400]),
                                    onPressed: () => _removeRecipient(recipient),
                                  ),
                                ),
                              ],
                            );
                          }).toList(),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // Footer
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _recipients.any((r) => r.role == RecipientRole.signer)
                        ? () {
                            Navigator.pop(context, {
                              'subject': _subjectController.text,
                              'message': _messageController.text,
                            });
                          }
                        : null,
                    icon: const Icon(Icons.send, size: 18),
                    label: const Text('Send'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Dialog for sharing document via email
class _ShareDocumentDialog extends StatefulWidget {
  final Document document;
  final String workspaceId;

  const _ShareDocumentDialog({
    required this.document,
    required this.workspaceId,
  });

  @override
  State<_ShareDocumentDialog> createState() => _ShareDocumentDialogState();
}

class _ShareDocumentDialogState extends State<_ShareDocumentDialog> {
  final _emailController = TextEditingController();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  final _workspaceApi = WorkspaceApiService();
  final _emailApi = EmailApiService();
  final _documentApi = DocumentApiService.instance;

  List<WorkspaceMember> _workspaceMembers = [];
  List<String> _selectedEmails = [];
  bool _isLoadingMembers = true;
  bool _isSending = false;
  bool _hasEmailConnection = false;
  String? _connectedEmailAddress;
  String? _previewHtml;
  bool _isLoadingPreview = true;
  String? _previewError;

  @override
  void initState() {
    super.initState();
    _subjectController.text = 'Document: ${widget.document.title}';
    _messageController.text = 'I would like to share the following document with you: "${widget.document.title}"\n\nPlease review at your convenience.';
    _loadData();
  }

  Future<void> _loadData() async {
    await Future.wait([
      _loadWorkspaceMembers(),
      _checkEmailConnection(),
      _loadPreviewHtml(),
    ]);
  }

  Future<void> _loadPreviewHtml() async {
    try {
      final html = await _documentApi.getPreview(
        workspaceId: widget.workspaceId,
        documentId: widget.document.id,
      );
      setState(() {
        _previewHtml = html;
        _isLoadingPreview = false;
        _previewError = null;
      });
    } catch (e) {
      setState(() {
        _isLoadingPreview = false;
        _previewError = e.toString();
      });
    }
  }

  Future<void> _loadWorkspaceMembers() async {
    try {
      final response = await _workspaceApi.getMembers(widget.workspaceId);
      if (response.isSuccess && response.data != null) {
        setState(() {
          _workspaceMembers = response.data!;
          _isLoadingMembers = false;
        });
      } else {
        setState(() => _isLoadingMembers = false);
      }
    } catch (e) {
      setState(() => _isLoadingMembers = false);
    }
  }

  Future<void> _checkEmailConnection() async {
    try {
      final response = await _emailApi.getAllConnections(widget.workspaceId);
      if (response.isSuccess && response.data != null) {
        final connections = response.data!;
        setState(() {
          _hasEmailConnection = connections.hasAnyConnection;
          if (connections.allAccounts.isNotEmpty) {
            _connectedEmailAddress = connections.allAccounts.first.emailAddress;
          }
        });
      }
    } catch (e) {
      // Silently fail - email connection is optional
    }
  }

  void _addEmail(String email) {
    final trimmed = email.trim().toLowerCase();
    if (trimmed.isEmpty || !trimmed.contains('@')) return;
    if (_selectedEmails.contains(trimmed)) return;

    setState(() {
      _selectedEmails.add(trimmed);
      _emailController.clear();
    });
  }

  void _removeEmail(String email) {
    setState(() {
      _selectedEmails.remove(email);
    });
  }

  void _toggleMember(WorkspaceMember member) {
    final email = member.email.toLowerCase();
    setState(() {
      if (_selectedEmails.contains(email)) {
        _selectedEmails.remove(email);
      } else {
        _selectedEmails.add(email);
      }
    });
  }

  Future<void> _shareDocument() async {
    if (_selectedEmails.isEmpty) return;

    setState(() => _isSending = true);

    try {
      // Ensure we have the preview HTML (retry if not loaded)
      if (_previewHtml == null) {
        try {
          final html = await _documentApi.getPreview(
            workspaceId: widget.workspaceId,
            documentId: widget.document.id,
          );
          _previewHtml = html;
        } catch (e) {
          // Continue without preview, will use fallback
        }
      }

      // Send email if connection exists
      if (_hasEmailConnection) {
        // Generate PDF attachment
        final pdfBytes = await _generatePdfBytes();

        final htmlBody = '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Document Shared</h2>
  <p>${_messageController.text.replaceAll('\n', '<br>')}</p>
  <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
    <strong>Document:</strong> ${widget.document.title}<br>
    <strong>Type:</strong> ${widget.document.documentType.singularName}<br>
    <strong>Status:</strong> ${widget.document.status.displayName}
  </div>
  <p style="color: #666; font-size: 12px;">This document was shared via Deskive Document Builder.</p>
</div>
''';

        // Create filename from document title
        final safeTitle = widget.document.title.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
        final filename = '${safeTitle}_${widget.document.documentNumber}.pdf';

        await _emailApi.sendEmail(
          widget.workspaceId,
          SendEmailRequest(
            to: _selectedEmails,
            subject: _subjectController.text,
            body: htmlBody,
            isHtml: true,
            attachments: [
              EmailAttachmentFile(
                fileName: filename,
                fileBytes: pdfBytes,
                mimeType: 'application/pdf',
              ),
            ],
          ),
        );
      }

      // Also add recipients to document for tracking
      for (final email in _selectedEmails) {
        try {
          await _documentApi.addRecipient(
            workspaceId: widget.workspaceId,
            documentId: widget.document.id,
            email: email,
            name: email.split('@').first,
            role: RecipientRole.viewer,
          );
        } catch (e) {
          // Recipient might already exist, continue
        }
      }

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_hasEmailConnection
                ? 'Document shared with ${_selectedEmails.length} recipient(s)'
                : 'Recipients added to document'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() => _isSending = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error sharing: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<List<int>> _generatePdfBytes() async {
    // Get HTML content from loaded preview
    final html = _previewHtml ?? widget.document.contentHtml ?? '';

    // Use Printing.convertHtml to properly convert HTML to PDF
    // This preserves CSS positioning including absolute positioned signatures
    try {
      final pdfBytes = await Printing.convertHtml(
        format: PdfPageFormat.a4,
        html: html,
      );
      return pdfBytes;
    } catch (e) {
      // Fallback to manual PDF generation if HTML conversion fails
      return _generatePdfBytesFallback(html);
    }
  }

  Future<List<int>> _generatePdfBytesFallback(String html) async {
    final doc = pw.Document();

    // Extract signature info from HTML if present
    Uint8List? signatureImageBytes;
    String? signatureText;
    double signatureScale = 1.0;

    // Match the entire embedded-signature div with its style attributes
    final signatureDivMatch = RegExp(r'<div[^>]*class="embedded-signature"[^>]*style="([^"]*)"[^>]*>([\s\S]*?)</div>\s*</div>').firstMatch(html);

    if (signatureDivMatch != null) {
      final styleAttr = signatureDivMatch.group(1) ?? '';
      final signatureHtml = signatureDivMatch.group(2) ?? '';

      // Extract scale from style
      final scaleMatch = RegExp(r'scale\((\d+(?:\.\d+)?)\)').firstMatch(styleAttr);
      if (scaleMatch != null) signatureScale = double.tryParse(scaleMatch.group(1)!) ?? 1.0;

      // Extract base64 image
      final imgMatch = RegExp(r'<img[^>]*src="data:image/[^;]+;base64,([^"]+)"[^>]*>').firstMatch(signatureHtml);
      if (imgMatch != null) {
        try {
          signatureImageBytes = base64Decode(imgMatch.group(1)!);
        } catch (e) {
          // Ignore decode errors
        }
      }

      // Extract signature text info (Digitally signed by...)
      final textContent = signatureHtml
          .replaceAll(RegExp(r'<[^>]*>'), ' ')
          .replaceAll(RegExp(r'\s+'), ' ')
          .trim();
      if (textContent.contains('Digitally signed')) {
        signatureText = textContent;
      }
    }

    // Convert HTML to plain text
    final plainText = _htmlToPlainText(html);

    // Split text into paragraphs for proper page handling
    final paragraphs = plainText.split('\n\n').where((p) => p.trim().isNotEmpty && !p.contains('--- SIGNATURE ---')).toList();

    // Create signature widget
    pw.Widget? signatureWidget;
    if (signatureImageBytes != null || signatureText != null) {
      signatureWidget = pw.Container(
        padding: const pw.EdgeInsets.all(8),
        decoration: pw.BoxDecoration(
          color: PdfColors.white,
          border: pw.Border.all(color: PdfColors.grey400, width: 0.5),
          borderRadius: pw.BorderRadius.circular(4),
        ),
        child: pw.Column(
          mainAxisSize: pw.MainAxisSize.min,
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            if (signatureImageBytes != null)
              pw.Image(
                pw.MemoryImage(signatureImageBytes),
                height: 40 * signatureScale,
                fit: pw.BoxFit.contain,
              ),
            if (signatureText != null)
              pw.Padding(
                padding: const pw.EdgeInsets.only(top: 4),
                child: pw.Text(
                  signatureText,
                  style: pw.TextStyle(
                    fontSize: 8 * signatureScale,
                    color: PdfColors.grey700,
                  ),
                ),
              ),
          ],
        ),
      );
    }

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          final List<pw.Widget> widgets = [
            pw.Header(
              level: 0,
              child: pw.Text(
                widget.document.title,
                style: pw.TextStyle(
                  fontSize: 24,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text(
              'Document #: ${widget.document.documentNumber}',
              style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
            ),
            pw.SizedBox(height: 20),
            ...paragraphs.map((paragraph) => pw.Padding(
              padding: const pw.EdgeInsets.only(bottom: 12),
              child: pw.Text(
                paragraph.trim(),
                style: const pw.TextStyle(
                  fontSize: 12,
                  lineSpacing: 1.5,
                ),
              ),
            )),
          ];

          // Add signature at the end of the document
          if (signatureWidget != null) {
            widgets.add(pw.SizedBox(height: 20));
            widgets.add(signatureWidget);
          }

          return widgets;
        },
      ),
    );

    return doc.save();
  }

  String _htmlToPlainText(String htmlContent) {
    String text = htmlContent.replaceAll(RegExp(r'<style[^>]*>[\s\S]*?</style>'), '');
    text = text.replaceAll(RegExp(r'<script[^>]*>[\s\S]*?</script>'), '');
    // Mark embedded signature block (will be handled separately)
    text = text.replaceAll(RegExp(r'<div[^>]*class="embedded-signature"[^>]*>[\s\S]*?</div>\s*</div>'), '\n\n--- SIGNATURE ---\n');
    text = text.replaceAll(RegExp(r'<br\s*/?>'), '\n');
    text = text.replaceAll(RegExp(r'</p>'), '\n\n');
    text = text.replaceAll(RegExp(r'</h[1-6]>'), '\n\n');
    text = text.replaceAll(RegExp(r'</div>'), '\n');
    // Remove img tags
    text = text.replaceAll(RegExp(r'<img[^>]*>'), '');
    text = text.replaceAll(RegExp(r'<[^>]*>'), '');
    text = text.replaceAll('&nbsp;', ' ');
    text = text.replaceAll('&amp;', '&');
    text = text.replaceAll('&lt;', '<');
    text = text.replaceAll('&gt;', '>');
    text = text.replaceAll('&quot;', '"');
    text = text.replaceAll(RegExp(r'\n{3,}'), '\n\n');
    return text.trim();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 500,
        constraints: BoxConstraints(maxHeight: screenHeight * 0.85),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.share_outlined, color: Colors.orange),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Share Document',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          widget.document.title,
                          style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : Colors.grey[600]),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Email connection status
            if (_hasEmailConnection && _connectedEmailAddress != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                color: Colors.green.withOpacity(0.1),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, size: 16, color: Colors.green),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Sending from: $_connectedEmailAddress',
                        style: const TextStyle(fontSize: 12, color: Colors.green),
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                color: Colors.orange.withOpacity(0.1),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, size: 16, color: Colors.orange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Connect email in Settings to send via email',
                        style: TextStyle(fontSize: 12, color: Colors.orange[700]),
                      ),
                    ),
                  ],
                ),
              ),

            // Scrollable content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Workspace members
                    if (_isLoadingMembers)
                      const Center(child: Padding(
                        padding: EdgeInsets.all(20),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ))
                    else if (_workspaceMembers.isNotEmpty) ...[
                      Text(
                        'Workspace Members',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        constraints: const BoxConstraints(maxHeight: 150),
                        decoration: BoxDecoration(
                          border: Border.all(color: isDark ? Colors.white12 : Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ListView.separated(
                          shrinkWrap: true,
                          itemCount: _workspaceMembers.length,
                          separatorBuilder: (_, __) => Divider(height: 1, color: isDark ? Colors.white12 : Colors.grey[200]),
                          itemBuilder: (context, index) {
                            final member = _workspaceMembers[index];
                            final isSelected = _selectedEmails.contains(member.email.toLowerCase());
                            return ListTile(
                              dense: true,
                              leading: CircleAvatar(
                                radius: 16,
                                backgroundColor: isSelected ? Colors.orange : Colors.grey[300],
                                child: Text(
                                  (member.name ?? member.email)[0].toUpperCase(),
                                  style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : Colors.black87),
                                ),
                              ),
                              title: Text(member.name ?? member.email, style: const TextStyle(fontSize: 13)),
                              subtitle: Text(member.email, style: TextStyle(fontSize: 11, color: isDark ? Colors.white54 : Colors.grey[600])),
                              trailing: Checkbox(
                                value: isSelected,
                                onChanged: (_) => _toggleMember(member),
                              ),
                              onTap: () => _toggleMember(member),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // External email
                    Text(
                      'Add External Email',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              hintText: 'Enter email address',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              isDense: true,
                              prefixIcon: const Icon(Icons.email_outlined, size: 20),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            onSubmitted: _addEmail,
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 44,
                          child: ElevatedButton(
                            onPressed: () => _addEmail(_emailController.text),
                            child: const Icon(Icons.add),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Selected emails
                    if (_selectedEmails.isNotEmpty) ...[
                      Text(
                        'Selected Recipients (${_selectedEmails.length})',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _selectedEmails.map((email) => Chip(
                          label: Text(email, style: const TextStyle(fontSize: 12)),
                          deleteIcon: const Icon(Icons.close, size: 16),
                          onDeleted: () => _removeEmail(email),
                          backgroundColor: Colors.orange.withOpacity(0.1),
                        )).toList(),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Email details (only if email connection exists)
                    if (_hasEmailConnection) ...[
                      const Divider(),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _subjectController,
                        decoration: InputDecoration(
                          labelText: 'Email Subject',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _messageController,
                        decoration: InputDecoration(
                          labelText: 'Message',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          alignLabelWithHint: true,
                        ),
                        maxLines: 4,
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Footer
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isSending ? null : () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _selectedEmails.isNotEmpty && !_isSending && !_isLoadingPreview
                        ? _shareDocument
                        : null,
                    icon: _isSending || _isLoadingPreview
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.share, size: 18),
                    label: Text(_isLoadingPreview ? 'Loading...' : (_hasEmailConnection ? 'Send Email' : 'Add Recipients')),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      backgroundColor: Colors.orange,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Document Edit Screen
class DocumentEditScreen extends StatefulWidget {
  final Document document;
  final String workspaceId;

  const DocumentEditScreen({
    super.key,
    required this.document,
    required this.workspaceId,
  });

  @override
  State<DocumentEditScreen> createState() => _DocumentEditScreenState();
}

class _DocumentEditScreenState extends State<DocumentEditScreen> {
  final _apiService = DocumentApiService.instance;
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  late Map<String, dynamic> _placeholderValues;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _titleController.text = widget.document.title;
    _descriptionController.text = widget.document.description ?? '';
    _placeholderValues = Map<String, dynamic>.from(widget.document.placeholderValues ?? {});
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _saveDocument() async {
    setState(() => _isSaving = true);

    try {
      await _apiService.updateDocument(
        workspaceId: widget.workspaceId,
        documentId: widget.document.id,
        title: _titleController.text,
        description: _descriptionController.text.isEmpty ? null : _descriptionController.text,
        placeholderValues: _placeholderValues,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Document saved successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Document'),
        actions: [
          TextButton.icon(
            onPressed: _isSaving ? null : _saveDocument,
            icon: _isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.save_outlined),
            label: const Text('Save'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'Document Title',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Description
            TextField(
              controller: _descriptionController,
              decoration: InputDecoration(
                labelText: 'Description (optional)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 24),

            // Placeholder Values
            if (_placeholderValues.isNotEmpty) ...[
              Text(
                'Document Fields',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              const SizedBox(height: 12),
              ..._placeholderValues.entries.map((entry) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TextField(
                    controller: TextEditingController(text: entry.value?.toString() ?? ''),
                    decoration: InputDecoration(
                      labelText: _formatPlaceholderKey(entry.key),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onChanged: (value) {
                      _placeholderValues[entry.key] = value;
                    },
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }

  String _formatPlaceholderKey(String key) {
    return key
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty
            ? '${word[0].toUpperCase()}${word.substring(1)}'
            : '')
        .join(' ');
  }
}
