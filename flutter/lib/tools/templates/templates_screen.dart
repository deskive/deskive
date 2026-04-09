import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../theme/app_theme.dart';
import '../../config/app_config.dart';
import '../../api/services/template_api_service.dart';
import '../../api/services/document_template_api_service.dart';
import 'template_gallery_screen.dart';
import 'document_template_gallery_screen.dart';

/// Templates screen with 2 cards: Project Templates and Document Templates
class TemplatesScreen extends StatefulWidget {
  const TemplatesScreen({super.key});

  @override
  State<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends State<TemplatesScreen> {
  int _projectTemplateCount = 0;
  int _documentTemplateCount = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTemplateCounts();
  }

  Future<void> _loadTemplateCounts() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null || workspaceId.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      // Fetch counts in parallel
      final projectResult = TemplateApiService.instance.getTemplatesPaginated(
        workspaceId: workspaceId,
        page: 1,
        limit: 1,
      );
      final documentResult = DocumentTemplateApiService.instance.getTemplatesPaginated(
        workspaceId: workspaceId,
        page: 1,
        limit: 1,
      );

      final results = await Future.wait([projectResult, documentResult]);

      if (mounted) {
        setState(() {
          _projectTemplateCount = (results[0] as PaginatedTemplatesResponse).pagination.total;
          _documentTemplateCount = (results[1] as PaginatedDocumentTemplatesResponse).pagination.total;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('tools.templates'.tr()),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'templates.choose_type'.tr(),
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildTemplateTypeCard(
                    context: context,
                    icon: Icons.dashboard_customize_outlined,
                    title: 'templates.project_templates'.tr(),
                    subtitle: _isLoading
                        ? 'templates.project_templates_subtitle'.tr()
                        : '$_projectTemplateCount ${'templates.templates_available'.tr()}',
                    color: Colors.teal,
                    isDark: isDark,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const TemplateGalleryScreen(),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildTemplateTypeCard(
                    context: context,
                    icon: Icons.description_outlined,
                    title: 'templates.document_templates'.tr(),
                    subtitle: _isLoading
                        ? 'templates.document_templates_subtitle'.tr()
                        : '$_documentTemplateCount ${'templates.templates_available'.tr()}',
                    color: Colors.orange,
                    isDark: isDark,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const DocumentTemplateGalleryScreen(),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTemplateTypeCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: context.borderColor,
          ),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: color,
                size: 28,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white54 : Colors.grey[600],
                height: 1.4,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Text(
                  'common.explore'.tr(),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: color,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.arrow_forward_rounded,
                  size: 16,
                  color: color,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
