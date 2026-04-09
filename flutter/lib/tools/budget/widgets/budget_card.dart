import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

class BudgetCard extends StatelessWidget {
  final Budget budget;
  final VoidCallback? onTap;
  final double? spent;
  final double? percentageUsed;

  const BudgetCard({
    super.key,
    required this.budget,
    this.onTap,
    this.spent,
    this.percentageUsed,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final usedPercent = percentageUsed ?? 0.0;
    final spentAmount = spent ?? 0.0;
    final remaining = budget.totalBudget - spentAmount;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          budget.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (budget.description != null && budget.description!.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              budget.description!,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  _buildStatusBadge(context),
                ],
              ),
              const SizedBox(height: 16),

              // Budget amount
              Row(
                children: [
                  Text(
                    BudgetService.formatCurrency(budget.totalBudget, budget.currency),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  _buildTypeBadge(context, isDark),
                ],
              ),
              const SizedBox(height: 12),

              // Progress bar
              _buildProgressBar(context, usedPercent, isDark),
              const SizedBox(height: 8),

              // Progress details
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${'budget.summary.spent'.tr()}: ${BudgetService.formatCurrency(spentAmount, budget.currency)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
                  Text(
                    '${'budget.summary.remaining'.tr()}: ${BudgetService.formatCurrency(remaining, budget.currency)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: remaining >= 0
                          ? (isDark ? Colors.green.shade400 : Colors.green.shade600)
                          : Colors.red,
                    ),
                  ),
                ],
              ),

              // Date range if available
              if (budget.startDate != null || budget.endDate != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      size: 14,
                      color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _formatDateRange(),
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    String label;

    switch (budget.status) {
      case 'active':
        backgroundColor = Colors.green.withValues(alpha: 0.1);
        textColor = Colors.green;
        label = 'budget.status.active'.tr();
        break;
      case 'exceeded':
        backgroundColor = Colors.red.withValues(alpha: 0.1);
        textColor = Colors.red;
        label = 'budget.status.exceeded'.tr();
        break;
      case 'completed':
        backgroundColor = Colors.blue.withValues(alpha: 0.1);
        textColor = Colors.blue;
        label = 'budget.status.completed'.tr();
        break;
      case 'archived':
        backgroundColor = Colors.grey.withValues(alpha: 0.1);
        textColor = Colors.grey;
        label = 'budget.status.archived'.tr();
        break;
      default:
        backgroundColor = Colors.grey.withValues(alpha: 0.1);
        textColor = Colors.grey;
        label = budget.status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildTypeBadge(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade800 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'budget.type_options.${budget.budgetType}'.tr(),
        style: TextStyle(
          fontSize: 11,
          color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
        ),
      ),
    );
  }

  Widget _buildProgressBar(BuildContext context, double percentage, bool isDark) {
    Color progressColor;
    if (percentage >= 100) {
      progressColor = Colors.red;
    } else if (percentage >= 80) {
      progressColor = Colors.orange;
    } else {
      progressColor = Colors.teal;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: (percentage / 100).clamp(0.0, 1.0),
            backgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(progressColor),
            minHeight: 8,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '${percentage.toStringAsFixed(1)}%',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: progressColor,
          ),
        ),
      ],
    );
  }

  String _formatDateRange() {
    final dateFormat = DateFormat('MMM d, y');
    if (budget.startDate != null && budget.endDate != null) {
      return '${dateFormat.format(budget.startDate!)} - ${dateFormat.format(budget.endDate!)}';
    } else if (budget.startDate != null) {
      return 'From ${dateFormat.format(budget.startDate!)}';
    } else if (budget.endDate != null) {
      return 'Until ${dateFormat.format(budget.endDate!)}';
    }
    return '';
  }
}
