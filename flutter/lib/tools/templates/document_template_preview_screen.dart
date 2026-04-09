import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../models/template/document_template.dart';
import '../../api/services/document_template_api_service.dart';
import '../../services/workspace_management_service.dart';
import '../document_builder/create_document_screen.dart';
import 'document_template_constants.dart';

/// Document Template Preview Screen
/// Shows template details and allows user to create a document from it
class DocumentTemplatePreviewScreen extends StatefulWidget {
  final DocumentTemplate template;

  const DocumentTemplatePreviewScreen({
    super.key,
    required this.template,
  });

  @override
  State<DocumentTemplatePreviewScreen> createState() =>
      _DocumentTemplatePreviewScreenState();
}

class _DocumentTemplatePreviewScreenState
    extends State<DocumentTemplatePreviewScreen> {
  final _apiService = DocumentTemplateApiService.instance;
  DocumentTemplate? _fullTemplate;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFullTemplate();
  }

  Future<void> _loadFullTemplate() async {
    final workspaceId =
        context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _fullTemplate = widget.template;
        _isLoading = false;
      });
      return;
    }

    try {
      final template = await _apiService.getTemplateById(
        workspaceId: workspaceId,
        idOrSlug: widget.template.id,
      );
      if (mounted) {
        setState(() {
          _fullTemplate = template;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _fullTemplate = widget.template;
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  DocumentTemplate get template => _fullTemplate ?? widget.template;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = template.color != null
        ? DocumentTemplateConstants.parseColor(template.color)
        : DocumentTemplateConstants.getDocumentTypeColor(template.documentType);

    return Scaffold(
      appBar: AppBar(
        title: Text('document_templates.preview'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              // Share template
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    color.withValues(alpha: 0.15),
                    color.withValues(alpha: 0.05),
                  ],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icon
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha:0.2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      template.icon != null
                          ? DocumentTemplateConstants.getIconFromName(template.icon)
                          : DocumentTemplateConstants.getDocumentTypeIcon(
                              template.documentType),
                      color: color,
                      size: 36,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Title
                  Text(
                    template.name,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Description
                  if (template.description != null)
                    Text(
                      template.description!,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white70 : Colors.grey[700],
                        height: 1.5,
                      ),
                    ),
                  const SizedBox(height: 16),

                  // Tags
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildTag(
                        template.documentType.singularName,
                        color,
                        Icons.description_outlined,
                      ),
                      if (template.category != null)
                        _buildTag(
                          DocumentTemplateCategory.getDisplayName(template.category!),
                          Colors.grey,
                          Icons.category_outlined,
                        ),
                      if (template.requiresSignature)
                        _buildTag(
                          'document_templates.requires_signature'.tr(),
                          Colors.purple,
                          Icons.draw_outlined,
                        ),
                      if (template.isSystem)
                        _buildTag(
                          'document_templates.system_template'.tr(),
                          Colors.blue,
                          Icons.verified_outlined,
                        ),
                    ],
                  ),
                ],
              ),
            ),

            // Details section
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Placeholders section
                  if (template.placeholders.isNotEmpty) ...[
                    _buildSectionHeader(
                      'document_templates.placeholders'.tr(),
                      Icons.edit_note,
                      '${template.placeholders.length} fields',
                      isDark,
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: context.cardColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: context.borderColor),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: template.placeholders.length,
                        separatorBuilder: (_, __) => Divider(
                          height: 1,
                          color: context.borderColor,
                        ),
                        itemBuilder: (context, index) {
                          final placeholder = template.placeholders[index];
                          return ListTile(
                            leading: Icon(
                              DocumentTemplateConstants.getPlaceholderTypeIcon(
                                  placeholder.type),
                              color: isDark ? Colors.white54 : Colors.grey[600],
                              size: 20,
                            ),
                            title: Text(
                              placeholder.label,
                              style: const TextStyle(fontSize: 14),
                            ),
                            subtitle: placeholder.helpText != null
                                ? Text(
                                    placeholder.helpText!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark
                                          ? Colors.white38
                                          : Colors.grey[500],
                                    ),
                                  )
                                : null,
                            trailing: placeholder.required
                                ? Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.red.withValues(alpha:0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'Required',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.red[400],
                                      ),
                                    ),
                                  )
                                : null,
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Signature fields section
                  if (template.signatureFields.isNotEmpty) ...[
                    _buildSectionHeader(
                      'document_templates.signature_fields'.tr(),
                      Icons.draw_outlined,
                      '${template.signatureFields.length} signatures',
                      isDark,
                    ),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: context.cardColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: context.borderColor),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: template.signatureFields.length,
                        separatorBuilder: (_, __) => Divider(
                          height: 1,
                          color: context.borderColor,
                        ),
                        itemBuilder: (context, index) {
                          final field = template.signatureFields[index];
                          return ListTile(
                            leading: Icon(
                              Icons.gesture,
                              color: Colors.purple[400],
                              size: 20,
                            ),
                            title: Text(
                              field.label,
                              style: const TextStyle(fontSize: 14),
                            ),
                            subtitle: field.signerRole != null
                                ? Text(
                                    'Role: ${field.signerRole}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark
                                          ? Colors.white38
                                          : Colors.grey[500],
                                    ),
                                  )
                                : null,
                            trailing: field.required
                                ? Icon(
                                    Icons.check_circle,
                                    size: 18,
                                    color: Colors.green[400],
                                  )
                                : null,
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Usage stats
                  _buildSectionHeader(
                    'document_templates.usage'.tr(),
                    Icons.analytics_outlined,
                    '',
                    isDark,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: context.cardColor,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: context.borderColor),
                    ),
                    child: Row(
                      children: [
                        _buildStatItem(
                          'Times used',
                          template.usageCount.toString(),
                          Icons.trending_up,
                          isDark,
                        ),
                        const SizedBox(width: 24),
                        _buildStatItem(
                          'Fields',
                          template.placeholders.length.toString(),
                          Icons.edit_note,
                          isDark,
                        ),
                        const SizedBox(width: 24),
                        _buildStatItem(
                          'Signatures',
                          template.signatureFields.length.toString(),
                          Icons.draw,
                          isDark,
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
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: () => _createDocument(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.add),
                const SizedBox(width: 8),
                Text(
                  'document_templates.use_template'.tr(),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTag(String label, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha:0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(
    String title,
    IconData icon,
    String trailing,
    bool isDark,
  ) {
    return Row(
      children: [
        Icon(
          icon,
          size: 18,
          color: isDark ? Colors.white54 : Colors.grey[600],
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        if (trailing.isNotEmpty) ...[
          const Spacer(),
          Text(
            trailing,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white38 : Colors.grey[500],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    bool isDark,
  ) {
    return Expanded(
      child: Column(
        children: [
          Icon(
            icon,
            size: 20,
            color: isDark ? Colors.white38 : Colors.grey[500],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: isDark ? Colors.white38 : Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  void _createDocument(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FillTemplateScreen(template: template),
      ),
    );
  }
}
