import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'email_ai_actions.dart';

/// Dropdown widget for AI actions on emails
class EmailAIDropdown extends StatefulWidget {
  final Function(EmailAIAction action, {String? language}) onAction;
  final bool isProcessing;

  const EmailAIDropdown({
    super.key,
    required this.onAction,
    this.isProcessing = false,
  });

  @override
  State<EmailAIDropdown> createState() => _EmailAIDropdownState();
}

class _EmailAIDropdownState extends State<EmailAIDropdown>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ),
    );

    _rotationAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.linear,
      ),
    );

    if (widget.isProcessing) {
      _animationController.repeat();
    }
  }

  @override
  void didUpdateWidget(EmailAIDropdown oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isProcessing && !oldWidget.isProcessing) {
      _animationController.repeat();
    } else if (!widget.isProcessing && oldWidget.isProcessing) {
      _animationController.stop();
      _animationController.reset();
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return PopupMenuButton<dynamic>(
      enabled: !widget.isProcessing,
      offset: const Offset(0, 40),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      color: isDarkMode ? Colors.grey.shade900 : Colors.white,
      child: widget.isProcessing
          ? AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                return Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    gradient: SweepGradient(
                      center: Alignment.center,
                      startAngle: 0,
                      endAngle: math.pi * 2,
                      transform: GradientRotation(_rotationAnimation.value * math.pi * 2),
                      colors: [
                        Colors.teal.shade500,
                        Colors.teal.shade400,
                        Colors.cyan.shade400,
                        Colors.green.shade400,
                        Colors.green.shade500,
                        Colors.teal.shade500,
                      ],
                      stops: const [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.teal.shade800.withValues(alpha: 0.7),
                        blurRadius: 8,
                        spreadRadius: 0,
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(2),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.teal.shade700,
                          Colors.teal.shade600,
                          Colors.green.shade600,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: child,
                  ),
                );
              },
              child: _buildButtonContent(),
            )
          : Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.teal.shade500, Colors.green.shade500],
                ),
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.teal.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: _buildButtonContent(),
            ),
      itemBuilder: (context) => [
        // Summarize
        _buildActionItem(context, EmailAIAction.summarize, isDarkMode),

        // Extract Tasks
        _buildActionItem(context, EmailAIAction.extractTasks, isDarkMode),

        // Create Event from Ticket
        _buildActionItem(context, EmailAIAction.createEventFromTicket, isDarkMode),

        const PopupMenuDivider(),

        // Translate (with submenu)
        _buildTranslateItem(context, isDarkMode),
      ],
      onSelected: (value) {
        if (value is EmailAIAction) {
          widget.onAction(value);
        } else if (value is Map<String, dynamic>) {
          widget.onAction(EmailAIAction.translate, language: value['language'] as String);
        }
      },
    );
  }

  Widget _buildButtonContent() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        widget.isProcessing
            ? _buildProcessingIcon()
            : const Icon(
                Icons.auto_awesome,
                size: 16,
                color: Colors.white,
              ),
        const SizedBox(width: 6),
        Text(
          widget.isProcessing ? 'Processing...' : 'AI',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
        const SizedBox(width: 2),
        const Icon(
          Icons.arrow_drop_down,
          size: 16,
          color: Colors.white,
        ),
      ],
    );
  }

  Widget _buildProcessingIcon() {
    return SizedBox(
      width: 16,
      height: 16,
      child: Stack(
        alignment: Alignment.center,
        children: [
          ScaleTransition(
            scale: _pulseAnimation,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Colors.white.withValues(alpha: 0.4),
                    Colors.white.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),
          ),
          RotationTransition(
            turns: _rotationAnimation,
            child: const Icon(
              Icons.auto_awesome,
              size: 14,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  PopupMenuItem<EmailAIAction> _buildActionItem(
    BuildContext context,
    EmailAIAction action,
    bool isDarkMode,
  ) {
    final config = getEmailAIActionConfig(action);

    return PopupMenuItem<EmailAIAction>(
      value: action,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: config.color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(
              config.icon,
              size: 18,
              color: config.color,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  config.label,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: isDarkMode ? Colors.white : Colors.black87,
                  ),
                ),
                Text(
                  config.description,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  PopupMenuItem<dynamic> _buildTranslateItem(BuildContext context, bool isDarkMode) {
    final config = getEmailAIActionConfig(EmailAIAction.translate);

    return PopupMenuItem<dynamic>(
      enabled: false,
      child: PopupMenuButton<Map<String, dynamic>>(
        offset: const Offset(200, 0),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        color: isDarkMode ? Colors.grey.shade900 : Colors.white,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: config.color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(
                config.icon,
                size: 18,
                color: config.color,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    config.label,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: isDarkMode ? Colors.white : Colors.black87,
                    ),
                  ),
                  Text(
                    config.description,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              size: 18,
              color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ],
        ),
        itemBuilder: (context) => emailTranslationLanguages.map((lang) {
          return PopupMenuItem<Map<String, dynamic>>(
            value: {'action': 'translate', 'language': lang['code']},
            child: Row(
              children: [
                Text(
                  lang['flag']!,
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(width: 12),
                Text(
                  lang['name']!,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDarkMode ? Colors.white : Colors.black87,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
        onSelected: (value) {
          Navigator.of(context).pop();
          widget.onAction(EmailAIAction.translate, language: value['language'] as String);
        },
      ),
    );
  }
}
