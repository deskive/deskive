import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

class ExpenseListItem extends StatelessWidget {
  final BudgetExpense expense;
  final List<BudgetCategory> categories;
  final VoidCallback? onTap;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;
  final bool showActions;

  const ExpenseListItem({
    super.key,
    required this.expense,
    this.categories = const [],
    this.onTap,
    this.onApprove,
    this.onReject,
    this.showActions = false,
  });

  BudgetCategory? get _category {
    if (expense.categoryId == null) return null;
    try {
      return categories.firstWhere((c) => c.id == expense.categoryId);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final category = _category;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: expense.rejected ? 0 : 1,
      color: expense.rejected
          ? (isDark ? Colors.grey.shade900.withOpacity(0.5) : Colors.grey.shade100)
          : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _getBorderColor(isDark),
          width: expense.approved || expense.rejected ? 1 : 0,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Main content row
              Row(
                children: [
                  // Icon
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: _getTypeColor().withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      _getTypeIcon(),
                      color: _getTypeColor(),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                expense.title,
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  decoration: expense.rejected
                                      ? TextDecoration.lineThrough
                                      : null,
                                  color: expense.rejected
                                      ? Colors.grey
                                      : null,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            _buildStatusBadge(isDark),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            if (category != null)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _getCategoryColor(category.color)
                                      .withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  category.name,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                    color: _getCategoryColor(category.color),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.calendar_today_outlined,
                                  size: 12,
                                  color: isDark
                                      ? Colors.grey.shade500
                                      : Colors.grey.shade600,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  DateFormat('MMM d, y').format(expense.expenseDate),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark
                                        ? Colors.grey.shade500
                                        : Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                            if (expense.billable)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 4, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.green.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.attach_money,
                                      size: 12,
                                      color: Colors.green,
                                    ),
                                    Text(
                                      'Billable',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.green,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Amount
                  Text(
                    BudgetService.formatCurrency(expense.amount, expense.currency),
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: expense.rejected
                          ? Colors.grey
                          : (expense.approved ? Colors.green : null),
                      decoration:
                          expense.rejected ? TextDecoration.lineThrough : null,
                    ),
                  ),
                ],
              ),

              // Approval/Rejection info section
              if (expense.approved && expense.approvedAt != null) ...[
                const SizedBox(height: 8),
                _buildApprovalInfo(isDark),
              ],

              if (expense.rejected && expense.rejectionReason != null) ...[
                const SizedBox(height: 8),
                _buildRejectionInfo(isDark),
              ],

              // Action buttons
              if (showActions && !expense.approved && !expense.rejected) ...[
                const SizedBox(height: 12),
                _buildActionButtons(context),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _getBorderColor(bool isDark) {
    if (expense.rejected) {
      return Colors.red.withOpacity(0.3);
    } else if (expense.approved) {
      return Colors.green.withOpacity(0.3);
    }
    return isDark ? Colors.grey.shade800 : Colors.grey.shade200;
  }

  Widget _buildStatusBadge(bool isDark) {
    IconData icon;
    String label;
    Color color;

    if (expense.rejected) {
      icon = Icons.cancel;
      label = 'Rejected';
      color = Colors.red;
    } else if (expense.approved) {
      icon = Icons.check_circle;
      label = 'Approved';
      color = Colors.green;
    } else {
      icon = Icons.pending;
      label = 'Pending';
      color = Colors.orange;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildApprovalInfo(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.verified,
            size: 14,
            color: Colors.green.shade600,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Approved',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.green.shade700,
                  ),
                ),
                if (expense.approvedAt != null)
                  Text(
                    DateFormat('MMM d, y h:mm a').format(expense.approvedAt!),
                    style: TextStyle(
                      fontSize: 10,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRejectionInfo(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.withOpacity(0.1)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.error_outline,
            size: 14,
            color: Colors.red.shade600,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Rejected',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.red.shade700,
                  ),
                ),
                if (expense.rejectionReason != null &&
                    expense.rejectionReason!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    expense.rejectionReason!,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                      fontStyle: FontStyle.italic,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (expense.rejectedAt != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      DateFormat('MMM d, y h:mm a').format(expense.rejectedAt!),
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (onReject != null)
          TextButton.icon(
            onPressed: onReject,
            icon: const Icon(Icons.close, size: 16),
            label: const Text('Reject'),
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          ),
        const SizedBox(width: 8),
        if (onApprove != null)
          ElevatedButton.icon(
            onPressed: onApprove,
            icon: const Icon(Icons.check, size: 16),
            label: const Text('Approve'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          ),
      ],
    );
  }

  IconData _getTypeIcon() {
    switch (expense.expenseType) {
      case 'invoice':
        return Icons.description_outlined;
      case 'purchase':
        return Icons.shopping_cart_outlined;
      case 'time_tracked':
        return Icons.timer_outlined;
      default:
        return Icons.receipt_long_outlined;
    }
  }

  Color _getTypeColor() {
    switch (expense.expenseType) {
      case 'invoice':
        return Colors.blue;
      case 'purchase':
        return Colors.purple;
      case 'time_tracked':
        return Colors.orange;
      default:
        return Colors.teal;
    }
  }

  Color _getCategoryColor(String? hexColor) {
    if (hexColor == null) return Colors.grey;
    try {
      return Color(int.parse(hexColor.replaceFirst('#', '0xFF')));
    } catch (_) {
      return Colors.grey;
    }
  }
}

/// Compact version for use in summaries
class ExpenseListItemCompact extends StatelessWidget {
  final BudgetExpense expense;
  final String? categoryName;
  final VoidCallback? onTap;

  const ExpenseListItemCompact({
    super.key,
    required this.expense,
    this.categoryName,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            // Status indicator dot
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: expense.rejected
                    ? Colors.red
                    : (expense.approved ? Colors.green : Colors.orange),
              ),
            ),
            const SizedBox(width: 12),

            // Title and category
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    expense.title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: expense.rejected ? Colors.grey : null,
                      decoration:
                          expense.rejected ? TextDecoration.lineThrough : null,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (categoryName != null)
                    Text(
                      categoryName!,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
                      ),
                    ),
                ],
              ),
            ),

            // Amount
            Text(
              BudgetService.formatCurrency(expense.amount, expense.currency),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: expense.rejected
                    ? Colors.grey
                    : (expense.approved ? Colors.green : null),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
