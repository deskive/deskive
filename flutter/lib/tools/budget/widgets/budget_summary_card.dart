import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

class BudgetSummaryCard extends StatelessWidget {
  final Budget budget;
  final double totalSpent;
  final double percentageUsed;

  const BudgetSummaryCard({
    super.key,
    required this.budget,
    required this.totalSpent,
    required this.percentageUsed,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final remaining = budget.totalBudget - totalSpent;

    Color progressColor;
    if (percentageUsed >= 100) {
      progressColor = Colors.red;
    } else if (percentageUsed >= budget.alertThreshold) {
      progressColor = Colors.orange;
    } else {
      progressColor = Colors.teal;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [Colors.grey.shade900, Colors.grey.shade800]
              : [Colors.teal.shade50, Colors.teal.shade100],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.grey.shade700 : Colors.teal.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'budget.summary.total_budget'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.grey.shade400 : Colors.teal.shade700,
                ),
              ),
              _buildStatusBadge(),
            ],
          ),
          const SizedBox(height: 8),

          // Total Budget
          Text(
            BudgetService.formatCurrency(budget.totalBudget, budget.currency),
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.teal.shade900,
            ),
          ),
          const SizedBox(height: 20),

          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: (percentageUsed / 100).clamp(0.0, 1.0),
              backgroundColor: isDark ? Colors.grey.shade700 : Colors.white,
              valueColor: AlwaysStoppedAnimation<Color>(progressColor),
              minHeight: 12,
            ),
          ),
          const SizedBox(height: 8),

          // Percentage
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${percentageUsed.toStringAsFixed(1)}% used',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: progressColor,
                ),
              ),
              if (percentageUsed >= budget.alertThreshold && percentageUsed < 100)
                Row(
                  children: [
                    Icon(Icons.warning_amber, size: 16, color: Colors.orange),
                    const SizedBox(width: 4),
                    Text(
                      'Near limit',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.orange,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 20),

          // Spent and Remaining
          Row(
            children: [
              Expanded(
                child: _buildAmountBox(
                  label: 'budget.summary.spent'.tr(),
                  amount: totalSpent,
                  color: Colors.orange,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildAmountBox(
                  label: 'budget.summary.remaining'.tr(),
                  amount: remaining,
                  color: remaining >= 0 ? Colors.green : Colors.red,
                  isDark: isDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge() {
    Color backgroundColor;
    Color textColor;
    String label;

    switch (budget.status) {
      case 'active':
        backgroundColor = Colors.green.withValues(alpha: 0.2);
        textColor = Colors.green;
        label = 'budget.status.active'.tr();
        break;
      case 'exceeded':
        backgroundColor = Colors.red.withValues(alpha: 0.2);
        textColor = Colors.red;
        label = 'budget.status.exceeded'.tr();
        break;
      case 'completed':
        backgroundColor = Colors.blue.withValues(alpha: 0.2);
        textColor = Colors.blue;
        label = 'budget.status.completed'.tr();
        break;
      case 'archived':
        backgroundColor = Colors.grey.withValues(alpha: 0.2);
        textColor = Colors.grey;
        label = 'budget.status.archived'.tr();
        break;
      default:
        backgroundColor = Colors.grey.withValues(alpha: 0.2);
        textColor = Colors.grey;
        label = budget.status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildAmountBox({
    required String label,
    required double amount,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade800 : Colors.white,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            BudgetService.formatCurrency(amount.abs(), budget.currency),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
