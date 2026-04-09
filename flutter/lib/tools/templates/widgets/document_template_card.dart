import 'package:flutter/material.dart';
import '../../../models/template/document_template.dart';
import '../../../theme/app_theme.dart';
import '../document_template_constants.dart';

/// Card widget for displaying a document template
class DocumentTemplateCard extends StatelessWidget {
  final DocumentTemplate template;
  final VoidCallback? onTap;

  const DocumentTemplateCard({
    super.key,
    required this.template,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = template.color != null
        ? DocumentTemplateConstants.parseColor(template.color)
        : DocumentTemplateConstants.getDocumentTypeColor(template.documentType);
    final icon = template.icon != null
        ? DocumentTemplateConstants.getIconFromName(template.icon)
        : DocumentTemplateConstants.getDocumentTypeIcon(template.documentType);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: context.borderColor,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon and badges row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    icon,
                    color: color,
                    size: 22,
                  ),
                ),
                const Spacer(),
                if (template.isFeatured)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.star_rounded,
                          size: 12,
                          color: Colors.amber[700],
                        ),
                        const SizedBox(width: 2),
                        Text(
                          'Featured',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: Colors.amber[700],
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 14),

            // Title
            Text(
              template.name,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black87,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),

            // Description
            if (template.description != null)
              Expanded(
                child: Text(
                  template.description!,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white54 : Colors.grey[600],
                    height: 1.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              )
            else
              const Spacer(),

            const SizedBox(height: 8),

            // Footer with type badge and signature indicator
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    template.documentType.singularName,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: color,
                    ),
                  ),
                ),
                const Spacer(),
                if (template.requiresSignature)
                  Icon(
                    Icons.draw_outlined,
                    size: 16,
                    color: isDark ? Colors.white38 : Colors.grey[500],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
