import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../models/approval.dart';
import '../../../theme/app_theme.dart';

class ApproverList extends StatelessWidget {
  final List<Approver> approvers;

  const ApproverList({
    super.key,
    required this.approvers,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: approvers.map((approver) => _buildApproverItem(context, approver, isDark)).toList(),
    );
  }

  Widget _buildApproverItem(BuildContext context, Approver approver, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          // Avatar
          CircleAvatar(
            radius: 18,
            backgroundColor: context.primaryColor.withOpacity(0.2),
            backgroundImage: approver.userAvatar != null
                ? NetworkImage(approver.userAvatar!)
                : null,
            child: approver.userAvatar == null
                ? Text(
                    (approver.userName ?? 'U')[0].toUpperCase(),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: context.primaryColor,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 12),

          // Name & Email
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  approver.userName ?? 'Unknown',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                if (approver.userEmail != null)
                  Text(
                    approver.userEmail!,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                    ),
                  ),
                if (approver.respondedAt != null)
                  Text(
                    DateFormat('MMM d, HH:mm').format(approver.respondedAt!),
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                    ),
                  ),
              ],
            ),
          ),

          // Status Badge
          _buildStatusBadge(approver.status),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(ApproverStatus status) {
    Color bgColor;
    Color textColor;
    IconData icon;

    switch (status) {
      case ApproverStatus.pending:
        bgColor = Colors.amber.withOpacity(0.15);
        textColor = Colors.amber[700]!;
        icon = Icons.schedule;
        break;
      case ApproverStatus.approved:
        bgColor = Colors.green.withOpacity(0.15);
        textColor = Colors.green[700]!;
        icon = Icons.check_circle;
        break;
      case ApproverStatus.rejected:
        bgColor = Colors.red.withOpacity(0.15);
        textColor = Colors.red[700]!;
        icon = Icons.cancel;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(
        icon,
        size: 18,
        color: textColor,
      ),
    );
  }
}
