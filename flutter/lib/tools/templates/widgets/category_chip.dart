import 'package:flutter/material.dart';
import '../../../models/template/project_template.dart';
import '../template_constants.dart';

/// Category filter chip widget
class CategoryChip extends StatelessWidget {
  final TemplateCategory category;
  final bool isSelected;
  final VoidCallback? onTap;
  final bool showCount;

  const CategoryChip({
    super.key,
    required this.category,
    this.isSelected = false,
    this.onTap,
    this.showCount = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = Color(category.color);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withOpacity(0.2)
              : (isDark ? Colors.white10 : Colors.grey.shade100),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? color.withOpacity(0.5)
                : (isDark ? Colors.white12 : Colors.grey.shade200),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              TemplateConstants.getIconData(category.icon),
              size: 16,
              color: isSelected
                  ? color
                  : (isDark ? Colors.white70 : Colors.grey.shade700),
            ),
            const SizedBox(width: 6),
            Text(
              category.name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected
                    ? color
                    : (isDark ? Colors.white70 : Colors.grey.shade700),
              ),
            ),
            if (showCount && category.count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected
                      ? color.withOpacity(0.3)
                      : (isDark ? Colors.white12 : Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${category.count}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isSelected
                        ? color
                        : (isDark ? Colors.white60 : Colors.grey.shade600),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// "All" category chip for showing all templates
class AllCategoryChip extends StatelessWidget {
  final bool isSelected;
  final VoidCallback? onTap;
  final int totalCount;

  const AllCategoryChip({
    super.key,
    this.isSelected = true,
    this.onTap,
    this.totalCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).primaryColor.withOpacity(0.2)
              : (isDark ? Colors.white10 : Colors.grey.shade100),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? Theme.of(context).primaryColor.withOpacity(0.5)
                : (isDark ? Colors.white12 : Colors.grey.shade200),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.grid_view_rounded,
              size: 16,
              color: isSelected
                  ? Theme.of(context).primaryColor
                  : (isDark ? Colors.white70 : Colors.grey.shade700),
            ),
            const SizedBox(width: 6),
            Text(
              'All',
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected
                    ? Theme.of(context).primaryColor
                    : (isDark ? Colors.white70 : Colors.grey.shade700),
              ),
            ),
            if (totalCount > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Theme.of(context).primaryColor.withOpacity(0.3)
                      : (isDark ? Colors.white12 : Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$totalCount',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isSelected
                        ? Theme.of(context).primaryColor
                        : (isDark ? Colors.white60 : Colors.grey.shade600),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
