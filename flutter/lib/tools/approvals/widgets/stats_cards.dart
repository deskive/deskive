import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../models/approval.dart';
import '../../../theme/app_theme.dart';

class ApprovalStatsCards extends StatelessWidget {
  final ApprovalStats stats;

  const ApprovalStatsCards({
    super.key,
    required this.stats,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
              context: context,
              icon: Icons.description_outlined,
              value: stats.totalRequests.toString(),
              label: 'approvals.stats_total'.tr(),
              color: Colors.blue,
              isDark: isDark,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard(
              context: context,
              icon: Icons.pending_outlined,
              value: stats.pendingRequests.toString(),
              label: 'approvals.stats_pending'.tr(),
              color: Colors.amber,
              isDark: isDark,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard(
              context: context,
              icon: Icons.assignment_ind_outlined,
              value: stats.pendingMyApproval.toString(),
              label: 'approvals.stats_awaiting'.tr(),
              color: Colors.orange,
              isDark: isDark,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard(
              context: context,
              icon: Icons.check_circle_outline,
              value: stats.approvedRequests.toString(),
              label: 'approvals.stats_approved'.tr(),
              color: Colors.green,
              isDark: isDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required BuildContext context,
    required IconData icon,
    required String value,
    required String label,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: color,
            size: 20,
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              color: isDark ? Colors.white38 : Colors.grey[600],
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
