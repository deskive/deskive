import 'package:flutter/material.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

class CategoryProgressBar extends StatelessWidget {
  final BudgetCategory category;
  final double spent;

  const CategoryProgressBar({
    super.key,
    required this.category,
    required this.spent,
  });

  double get _percentageUsed {
    if (category.allocatedAmount == 0) return 0;
    return (spent / category.allocatedAmount) * 100;
  }

  Color get _categoryColor {
    if (category.color != null) {
      try {
        return Color(int.parse(category.color!.replaceFirst('#', '0xFF')));
      } catch (_) {}
    }
    return CategoryTypes.defaultColors[category.categoryType] != null
        ? Color(int.parse(CategoryTypes.defaultColors[category.categoryType]!.replaceFirst('#', '0xFF')))
        : Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final remaining = category.allocatedAmount - spent;

    Color progressColor;
    if (_percentageUsed >= 100) {
      progressColor = Colors.red;
    } else if (_percentageUsed >= 80) {
      progressColor = Colors.orange;
    } else {
      progressColor = _categoryColor;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _categoryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    _getCategoryIcon(),
                    color: _categoryColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        category.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                      Text(
                        _getCategoryTypeLabel(),
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${_percentageUsed.toStringAsFixed(1)}%',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: progressColor,
                      ),
                    ),
                    if (_percentageUsed >= 100)
                      Text(
                        'Over budget',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.red,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: (_percentageUsed / 100).clamp(0.0, 1.0),
                backgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                minHeight: 8,
              ),
            ),
            const SizedBox(height: 12),

            // Amount details
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildAmountLabel(
                  'Allocated',
                  BudgetService.formatCurrency(category.allocatedAmount, 'USD'),
                  isDark,
                ),
                _buildAmountLabel(
                  'Spent',
                  BudgetService.formatCurrency(spent, 'USD'),
                  isDark,
                  color: progressColor,
                ),
                _buildAmountLabel(
                  'Remaining',
                  BudgetService.formatCurrency(remaining.abs(), 'USD'),
                  isDark,
                  color: remaining >= 0 ? Colors.green : Colors.red,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountLabel(String label, String amount, bool isDark, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          amount,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }

  IconData _getCategoryIcon() {
    switch (category.categoryType) {
      case 'labor':
        return Icons.people_outline;
      case 'materials':
        return Icons.inventory_2_outlined;
      case 'software':
        return Icons.code;
      case 'travel':
        return Icons.flight_outlined;
      case 'overhead':
        return Icons.business_outlined;
      default:
        return Icons.category_outlined;
    }
  }

  String _getCategoryTypeLabel() {
    switch (category.categoryType) {
      case 'labor':
        return 'Labor & Personnel';
      case 'materials':
        return 'Materials & Supplies';
      case 'software':
        return 'Software & Licenses';
      case 'travel':
        return 'Travel & Transportation';
      case 'overhead':
        return 'Overhead & Operations';
      default:
        return 'Other';
    }
  }
}
