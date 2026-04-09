import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../models/document/document.dart';
import '../../../models/template/document_template.dart';
import '../../../theme/app_theme.dart';
import '../../templates/document_template_constants.dart';
import 'document_status_badge.dart';

/// Card widget for displaying a document in the list
class DocumentCard extends StatelessWidget {
  final Document document;
  final VoidCallback? onTap;

  const DocumentCard({
    super.key,
    required this.document,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = DocumentTemplateConstants.getDocumentTypeColor(document.documentType);

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
            // Header row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    DocumentTemplateConstants.getDocumentTypeIcon(
                        document.documentType),
                    color: color,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        document.title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        document.documentNumber,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white54 : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                DocumentStatusBadge(status: document.status),
              ],
            ),

            // Description (if any)
            if (document.description != null &&
                document.description!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                document.description!,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.white70 : Colors.grey[700],
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            const SizedBox(height: 12),

            // Footer row
            Row(
              children: [
                // Type badge
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
                    document.documentType.singularName,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: color,
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Signature progress (if applicable)
                if (document.signerCount > 0) ...[
                  Icon(
                    Icons.draw_outlined,
                    size: 14,
                    color: isDark ? Colors.white38 : Colors.grey[500],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${document.signedCount}/${document.signerCount}',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                    ),
                  ),
                ],

                const Spacer(),

                // Date
                Icon(
                  Icons.access_time,
                  size: 14,
                  color: isDark ? Colors.white38 : Colors.grey[500],
                ),
                const SizedBox(width: 4),
                Text(
                  _formatDate(document.updatedAt),
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
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) {
      if (diff.inHours == 0) {
        return '${diff.inMinutes}m ago';
      }
      return '${diff.inHours}h ago';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return DateFormat('MMM d').format(date);
    }
  }
}
