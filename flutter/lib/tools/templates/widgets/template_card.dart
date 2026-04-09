import 'package:flutter/material.dart';
import '../../../models/template/project_template.dart';
import '../template_constants.dart';

/// Card widget for displaying a project template
class TemplateCard extends StatelessWidget {
  final ProjectTemplate template;
  final VoidCallback? onTap;
  final bool showCategory;
  final bool compact;

  const TemplateCard({
    super.key,
    required this.template,
    this.onTap,
    this.showCategory = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final categoryColor = TemplateConstants.getCategoryColor(template.category);
    final categoryIcon = TemplateConstants.getCategoryIcon(template.category);

    if (compact) {
      return _buildCompactCard(context, isDark, categoryColor, categoryIcon);
    }

    return _buildFullCard(context, isDark, categoryColor, categoryIcon);
  }

  Widget _buildFullCard(
    BuildContext context,
    bool isDark,
    Color categoryColor,
    IconData categoryIcon,
  ) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? Colors.white12 : Colors.grey.shade200,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header with icon and featured badge
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: categoryColor.withValues(alpha:0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      categoryIcon,
                      color: categoryColor,
                      size: 20,
                    ),
                  ),
                  const Spacer(),
                  if (template.isFeatured)
                    Icon(
                      Icons.star,
                      size: 18,
                      color: Colors.amber.shade600,
                    ),
                ],
              ),
              const SizedBox(height: 10),

              // Name
              Flexible(
                child: Text(
                  template.name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 4),

              // Description
              if (template.description != null && template.description!.isNotEmpty)
                Flexible(
                  child: Text(
                    template.description!,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white60 : Colors.grey.shade600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              const Spacer(),

              // Stats row - simplified
              Row(
                children: [
                  Icon(
                    Icons.layers_outlined,
                    size: 12,
                    color: isDark ? Colors.white54 : Colors.grey.shade600,
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      '${template.structure.sections.length}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.white54 : Colors.grey.shade600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.task_alt_outlined,
                    size: 12,
                    color: isDark ? Colors.white54 : Colors.grey.shade600,
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      '${template.structure.totalTaskCount}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.white54 : Colors.grey.shade600,
                      ),
                    ),
                  ),
                ],
              ),

              // Category label (optional) - simplified
              if (showCategory) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: categoryColor.withValues(alpha:0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    TemplateConstants.getCategoryName(template.category),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: categoryColor,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCompactCard(
    BuildContext context,
    bool isDark,
    Color categoryColor,
    IconData categoryIcon,
  ) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: isDark ? Colors.white12 : Colors.grey.shade200,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: categoryColor.withValues(alpha:0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  categoryIcon,
                  color: categoryColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      template.name,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${template.structure.sections.length} sections, ${template.structure.totalTaskCount} tasks',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white54 : Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              if (template.isFeatured)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Icon(
                    Icons.star,
                    size: 18,
                    color: Colors.amber.shade600,
                  ),
                ),
              const SizedBox(width: 4),
              Icon(
                Icons.arrow_forward_ios,
                size: 14,
                color: isDark ? Colors.white38 : Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatChip({
    required IconData icon,
    required String label,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? Colors.white10 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: isDark ? Colors.white54 : Colors.grey.shade600,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: isDark ? Colors.white54 : Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }
}
