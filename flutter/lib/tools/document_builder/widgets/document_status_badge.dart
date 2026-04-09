import 'package:flutter/material.dart';
import '../../../models/document/document.dart';

/// Badge widget for displaying document status
class DocumentStatusBadge extends StatelessWidget {
  final DocumentStatus status;
  final bool showIcon;
  final double fontSize;

  const DocumentStatusBadge({
    super.key,
    required this.status,
    this.showIcon = true,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    final color = Color(status.color);
    final icon = _getIcon();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(
              icon,
              size: fontSize + 2,
              color: color,
            ),
            const SizedBox(width: 4),
          ],
          Text(
            status.displayName,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIcon() {
    switch (status) {
      case DocumentStatus.draft:
        return Icons.edit_outlined;
      case DocumentStatus.pendingSignature:
        return Icons.pending_outlined;
      case DocumentStatus.partiallySigned:
        return Icons.timelapse;
      case DocumentStatus.signed:
        return Icons.check_circle_outline;
      case DocumentStatus.expired:
        return Icons.timer_off_outlined;
      case DocumentStatus.declined:
        return Icons.cancel_outlined;
      case DocumentStatus.archived:
        return Icons.archive_outlined;
    }
  }
}
