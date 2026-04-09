import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:math' as math;
import '../chat_screen.dart';

/// Available AI actions for selected messages
enum AIAction {
  summarize,
  createNote,
  translate,
  extractTasks,
  createEmail,
  copyFormatted,
  saveBookmark,
  customPrompt,
}

/// Configuration for each AI action
class AIActionConfig {
  final String label;
  final String description;
  final IconData icon;
  final Color color;

  const AIActionConfig({
    required this.label,
    required this.description,
    required this.icon,
    required this.color,
  });
}

/// Get translated AI action config
AIActionConfig getAIActionConfig(AIAction action) {
  switch (action) {
    case AIAction.summarize:
      return AIActionConfig(
        label: 'messages.summarize'.tr(),
        description: 'messages.summarize_desc'.tr(),
        icon: Icons.summarize,
        color: Colors.green,
      );
    case AIAction.createNote:
      return AIActionConfig(
        label: 'messages.create_note'.tr(),
        description: 'messages.create_note_desc'.tr(),
        icon: Icons.note_add,
        color: Colors.blue,
      );
    case AIAction.translate:
      return AIActionConfig(
        label: 'messages.translate'.tr(),
        description: 'messages.translate_desc'.tr(),
        icon: Icons.translate,
        color: Colors.orange,
      );
    case AIAction.extractTasks:
      return AIActionConfig(
        label: 'messages.extract_tasks'.tr(),
        description: 'messages.extract_tasks_desc'.tr(),
        icon: Icons.task_alt,
        color: Colors.purple,
      );
    case AIAction.createEmail:
      return AIActionConfig(
        label: 'messages.create_email'.tr(),
        description: 'messages.create_email_desc'.tr(),
        icon: Icons.email,
        color: Colors.red,
      );
    case AIAction.copyFormatted:
      return AIActionConfig(
        label: 'messages.copy_formatted'.tr(),
        description: 'messages.copy_formatted_desc'.tr(),
        icon: Icons.copy,
        color: Colors.grey,
      );
    case AIAction.saveBookmark:
      return AIActionConfig(
        label: 'messages.save_all'.tr(),
        description: 'messages.save_all_desc'.tr(),
        icon: Icons.bookmark_add,
        color: Colors.amber,
      );
    case AIAction.customPrompt:
      return AIActionConfig(
        label: 'messages.custom_ai_prompt'.tr(),
        description: 'messages.custom_ai_prompt_desc'.tr(),
        icon: Icons.auto_awesome,
        color: Colors.indigo,
      );
  }
}

/// Map of AI actions to their configurations (kept for icon/color references)
final Map<AIAction, AIActionConfig> aiActionConfigs = {
  AIAction.summarize: AIActionConfig(
    label: 'Summarize',
    description: 'Get a concise summary',
    icon: Icons.summarize,
    color: Colors.green,
  ),
  AIAction.createNote: AIActionConfig(
    label: 'Create Note',
    description: 'Turn into formatted note',
    icon: Icons.note_add,
    color: Colors.blue,
  ),
  AIAction.translate: AIActionConfig(
    label: 'Translate',
    description: 'Translate to another language',
    icon: Icons.translate,
    color: Colors.orange,
  ),
  AIAction.extractTasks: AIActionConfig(
    label: 'Extract Tasks',
    description: 'Find action items',
    icon: Icons.task_alt,
    color: Colors.purple,
  ),
  AIAction.createEmail: AIActionConfig(
    label: 'Create Email',
    description: 'Draft email from messages',
    icon: Icons.email,
    color: Colors.red,
  ),
  AIAction.copyFormatted: AIActionConfig(
    label: 'Copy Formatted',
    description: 'Copy with formatting',
    icon: Icons.copy,
    color: Colors.grey,
  ),
  AIAction.saveBookmark: AIActionConfig(
    label: 'Save All',
    description: 'Bookmark all messages',
    icon: Icons.bookmark_add,
    color: Colors.amber,
  ),
  AIAction.customPrompt: AIActionConfig(
    label: 'Custom AI Prompt',
    description: 'Ask AI anything',
    icon: Icons.auto_awesome,
    color: Colors.indigo,
  ),
};

/// Languages available for translation
const List<Map<String, String>> translationLanguages = [
  {'code': 'en', 'name': 'English'},
  {'code': 'es', 'name': 'Spanish'},
  {'code': 'fr', 'name': 'French'},
  {'code': 'de', 'name': 'German'},
  {'code': 'it', 'name': 'Italian'},
  {'code': 'pt', 'name': 'Portuguese'},
  {'code': 'zh', 'name': 'Chinese'},
  {'code': 'ja', 'name': 'Japanese'},
  {'code': 'ko', 'name': 'Korean'},
  {'code': 'ar', 'name': 'Arabic'},
  {'code': 'hi', 'name': 'Hindi'},
  {'code': 'ru', 'name': 'Russian'},
  {'code': 'bn', 'name': 'Bengali'},
];

/// Dropdown widget for AI actions on selected messages
class AIActionsDropdown extends StatefulWidget {
  final List<ChatMessage> selectedMessages;
  final Function(AIAction action, {String? language, String? customPrompt}) onAction;
  final bool isProcessing;

  const AIActionsDropdown({
    super.key,
    required this.selectedMessages,
    required this.onAction,
    this.isProcessing = false,
  });

  @override
  State<AIActionsDropdown> createState() => _AIActionsDropdownState();
}

class _AIActionsDropdownState extends State<AIActionsDropdown>
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
  void didUpdateWidget(AIActionsDropdown oldWidget) {
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
                    // Running border gradient effect
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
                        color: Colors.teal.shade800.withOpacity(0.7),
                        blurRadius: 8,
                        spreadRadius: 0,
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(2), // Border thickness
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.teal.shade500, Colors.green.shade500],
                ),
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.teal.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: _buildButtonContent(),
            ),
      itemBuilder: (context) => [
        // Create Note
        _buildActionItem(context, AIAction.createNote, isDarkMode),

        // Summarize
        _buildActionItem(context, AIAction.summarize, isDarkMode),

        // Extract Tasks
        _buildActionItem(context, AIAction.extractTasks, isDarkMode),

        const PopupMenuDivider(),

        // Translate (with submenu)
        _buildTranslateItem(context, isDarkMode),

        const PopupMenuDivider(),

        // Custom Prompt
        _buildActionItem(context, AIAction.customPrompt, isDarkMode),
      ],
      onSelected: (value) {
        if (value is AIAction) {
          widget.onAction(value);
        } else if (value is Map<String, dynamic>) {
          // Translation with language
          widget.onAction(AIAction.translate, language: value['language'] as String);
        }
      },
    );
  }

  /// Build the button content (icon + text + arrow)
  Widget _buildButtonContent() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        widget.isProcessing
            ? _buildProcessingIcon()
            : const Icon(
                Icons.auto_awesome,
                size: 18,
                color: Colors.white,
              ),
        const SizedBox(width: 8),
        Text(
          widget.isProcessing ? 'messages.processing'.tr() : 'messages.ai_actions'.tr(),
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
        const SizedBox(width: 4),
        const Icon(
          Icons.arrow_drop_down,
          size: 18,
          color: Colors.white,
        ),
      ],
    );
  }

  /// Build animated processing icon with sparkles effect
  Widget _buildProcessingIcon() {
    return SizedBox(
      width: 18,
      height: 18,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Pulsing glow effect (behind icon)
          ScaleTransition(
            scale: _pulseAnimation,
            child: Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Colors.white.withOpacity(0.4),
                    Colors.white.withOpacity(0.0),
                  ],
                ),
              ),
            ),
          ),
          // Rotating sparkle icon
          RotationTransition(
            turns: _rotationAnimation,
            child: const Icon(
              Icons.auto_awesome,
              size: 16,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  PopupMenuItem<AIAction> _buildActionItem(
    BuildContext context,
    AIAction action,
    bool isDarkMode,
  ) {
    final config = getAIActionConfig(action);

    return PopupMenuItem<AIAction>(
      value: action,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: config.color.withOpacity(0.1),
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
    final config = getAIActionConfig(AIAction.translate);

    return PopupMenuItem<dynamic>(
      enabled: false, // Disable direct selection, use submenu
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
                color: config.color.withOpacity(0.1),
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
        itemBuilder: (context) => translationLanguages.map((lang) {
          return PopupMenuItem<Map<String, dynamic>>(
            value: {'action': 'translate', 'language': lang['code']},
            child: Row(
              children: [
                Text(
                  _getLanguageFlag(lang['code']!),
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
          Navigator.of(context).pop(); // Close the parent menu
          widget.onAction(AIAction.translate, language: value['language'] as String);
        },
      ),
    );
  }

  String _getLanguageFlag(String code) {
    const flags = {
      'en': '🇺🇸',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'zh': '🇨🇳',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'ar': '🇸🇦',
      'hi': '🇮🇳',
      'ru': '🇷🇺',
      'bn': '🇧🇩',
    };
    return flags[code] ?? '🌐';
  }
}
