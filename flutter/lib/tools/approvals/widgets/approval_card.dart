import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../models/approval.dart';
import '../../../theme/app_theme.dart';

class ApprovalCard extends StatelessWidget {
  final ApprovalRequest request;
  final VoidCallback onTap;

  const ApprovalCard({
    super.key,
    required this.request,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Title + Priority + Status
            Row(
              children: [
                // Type indicator
                if (request.typeColor != null)
                  Container(
                    width: 4,
                    height: 40,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: _parseColor(request.typeColor!),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              request.title,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _buildPriorityBadge(request.priority),
                        ],
                      ),
                      if (request.typeName != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          request.typeName!,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.white38 : Colors.grey[600],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),

            // Description
            if (request.description != null && request.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                request.description!,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.white60 : Colors.grey[700],
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            const SizedBox(height: 12),

            // Footer: Requester + Date + Status
            Row(
              children: [
                // Requester avatar
                CircleAvatar(
                  radius: 12,
                  backgroundColor: context.primaryColor.withOpacity(0.2),
                  backgroundImage: request.requesterAvatar != null
                      ? NetworkImage(request.requesterAvatar!)
                      : null,
                  child: request.requesterAvatar == null
                      ? Text(
                          (request.requesterName ?? 'U')[0].toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: context.primaryColor,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        request.requesterName ?? 'Unknown',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? Colors.white70 : Colors.grey[800],
                        ),
                      ),
                      Text(
                        _formatDate(request.createdAt),
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.white38 : Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
                // Approvers count
                Row(
                  children: [
                    Icon(
                      Icons.people_outline,
                      size: 14,
                      color: isDark ? Colors.white38 : Colors.grey[500],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${request.approvers.length}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white38 : Colors.grey[500],
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                _buildStatusBadge(request.status),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(RequestStatus status) {
    Color bgColor;
    Color textColor;
    String text;

    switch (status) {
      case RequestStatus.pending:
        bgColor = Colors.amber.withOpacity(0.15);
        textColor = Colors.amber[700]!;
        text = 'approvals.status_pending'.tr();
        break;
      case RequestStatus.approved:
        bgColor = Colors.green.withOpacity(0.15);
        textColor = Colors.green[700]!;
        text = 'approvals.status_approved'.tr();
        break;
      case RequestStatus.rejected:
        bgColor = Colors.red.withOpacity(0.15);
        textColor = Colors.red[700]!;
        text = 'approvals.status_rejected'.tr();
        break;
      case RequestStatus.cancelled:
        bgColor = Colors.grey.withOpacity(0.15);
        textColor = Colors.grey[700]!;
        text = 'approvals.status_cancelled'.tr();
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildPriorityBadge(RequestPriority priority) {
    if (priority == RequestPriority.normal || priority == RequestPriority.low) {
      return const SizedBox.shrink();
    }

    Color bgColor;
    Color textColor;
    String text;

    switch (priority) {
      case RequestPriority.high:
        bgColor = Colors.orange.withOpacity(0.15);
        textColor = Colors.orange[700]!;
        text = 'approvals.priority_high'.tr();
        break;
      case RequestPriority.urgent:
        bgColor = Colors.red.withOpacity(0.15);
        textColor = Colors.red[700]!;
        text = 'approvals.priority_urgent'.tr();
        break;
      default:
        return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) {
      return 'approvals.just_now'.tr();
    } else if (diff.inHours < 1) {
      return 'approvals.minutes_ago'.tr(args: ['${diff.inMinutes}']);
    } else if (diff.inDays < 1) {
      return 'approvals.hours_ago'.tr(args: ['${diff.inHours}']);
    } else if (diff.inDays < 7) {
      return 'approvals.days_ago'.tr(args: ['${diff.inDays}']);
    } else {
      return DateFormat('MMM d, yyyy').format(date);
    }
  }

  Color _parseColor(String colorStr) {
    try {
      if (colorStr.startsWith('#')) {
        return Color(int.parse(colorStr.substring(1), radix: 16) + 0xFF000000);
      }
      return Colors.blue;
    } catch (e) {
      return Colors.blue;
    }
  }
}
