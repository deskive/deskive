import 'package:flutter/material.dart';
import '../../api/services/email_api_service.dart';

/// Widget to display email priority level - matching frontend UI exactly
/// Shows icon + score with color-coded background and tooltip
class EmailPriorityIndicator extends StatelessWidget {
  final EmailPriority priority;
  final double iconSize;

  const EmailPriorityIndicator({
    super.key,
    required this.priority,
    this.iconSize = 12,
  });

  @override
  Widget build(BuildContext context) {
    // Don't show anything for 'none' priority
    if (priority.level == EmailPriorityLevel.none) {
      return const SizedBox.shrink();
    }

    final config = _getPriorityConfig(priority.level);

    return Tooltip(
      richMessage: _buildTooltipSpan(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: config.backgroundColor,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: config.borderColor, width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              config.icon,
              size: iconSize,
              color: config.iconColor,
            ),
            const SizedBox(width: 3),
            Text(
              priority.score.toString(),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: config.iconColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  TextSpan _buildTooltipSpan(BuildContext context) {
    final config = _getPriorityConfig(priority.level);

    return TextSpan(
      children: [
        TextSpan(
          text: '${config.label} (Score: ${priority.score}/10)\n',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
        TextSpan(
          text: priority.reason,
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey.shade300,
          ),
        ),
        if (priority.factors.isNotEmpty) ...[
          const TextSpan(text: '\n\nFactors: '),
          TextSpan(
            text: priority.factors.join(', '),
            style: TextStyle(
              fontSize: 10,
              color: Colors.grey.shade400,
            ),
          ),
        ],
      ],
    );
  }

  _PriorityConfig _getPriorityConfig(EmailPriorityLevel level) {
    switch (level) {
      case EmailPriorityLevel.high:
        return _PriorityConfig(
          icon: Icons.error_outline, // Similar to AlertCircle
          iconColor: Colors.red.shade500,
          backgroundColor: Colors.red.shade50,
          borderColor: Colors.red.shade200,
          label: 'High Priority',
        );
      case EmailPriorityLevel.medium:
        return _PriorityConfig(
          icon: Icons.warning_amber_outlined, // Similar to AlertTriangle
          iconColor: Colors.amber.shade700,
          backgroundColor: Colors.amber.shade50,
          borderColor: Colors.amber.shade200,
          label: 'Medium Priority',
        );
      case EmailPriorityLevel.low:
        return _PriorityConfig(
          icon: Icons.arrow_downward, // Similar to ArrowDown
          iconColor: Colors.blue.shade500,
          backgroundColor: Colors.blue.shade50,
          borderColor: Colors.blue.shade200,
          label: 'Low Priority',
        );
      case EmailPriorityLevel.none:
        return _PriorityConfig(
          icon: Icons.remove,
          iconColor: Colors.grey.shade400,
          backgroundColor: Colors.grey.shade50,
          borderColor: Colors.grey.shade200,
          label: 'No Priority',
        );
    }
  }
}

class _PriorityConfig {
  final IconData icon;
  final Color iconColor;
  final Color backgroundColor;
  final Color borderColor;
  final String label;

  _PriorityConfig({
    required this.icon,
    required this.iconColor,
    required this.backgroundColor,
    required this.borderColor,
    required this.label,
  });
}

/// Get border color for email list items based on priority
/// Returns color for left border to indicate priority visually
Color? getEmailPriorityBorderColor(EmailPriority? priority) {
  if (priority == null) return null;

  switch (priority.level) {
    case EmailPriorityLevel.high:
      return Colors.red.shade500;
    case EmailPriorityLevel.medium:
      return Colors.amber.shade700;
    case EmailPriorityLevel.low:
      return Colors.blue.shade500;
    case EmailPriorityLevel.none:
      return null;
  }
}
