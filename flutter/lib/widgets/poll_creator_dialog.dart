import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:uuid/uuid.dart';
import '../api/services/chat_api_service.dart';
import '../theme/app_theme.dart';

/// Dialog for creating a new poll
class PollCreatorDialog extends StatefulWidget {
  final String creatorId;
  final Function(Map<String, dynamic> linkedContent) onCreatePoll;

  const PollCreatorDialog({
    super.key,
    required this.creatorId,
    required this.onCreatePoll,
  });

  /// Show the poll creator dialog
  static Future<void> show({
    required BuildContext context,
    required String creatorId,
    required Function(Map<String, dynamic> linkedContent) onCreatePoll,
  }) async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PollCreatorDialog(
        creatorId: creatorId,
        onCreatePoll: onCreatePoll,
      ),
    );
  }

  @override
  State<PollCreatorDialog> createState() => _PollCreatorDialogState();
}

class _PollCreatorDialogState extends State<PollCreatorDialog> {
  final TextEditingController _questionController = TextEditingController();
  final List<TextEditingController> _optionControllers = [];
  final List<String> _optionIds = [];
  bool _showResultsBeforeVoting = false;

  static const int _minOptions = 2;
  static const int _maxOptions = 10;
  final _uuid = const Uuid();

  @override
  void initState() {
    super.initState();
    // Start with 2 empty options
    _addOption();
    _addOption();
  }

  @override
  void dispose() {
    _questionController.dispose();
    for (final controller in _optionControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _addOption() {
    if (_optionControllers.length < _maxOptions) {
      setState(() {
        _optionControllers.add(TextEditingController());
        _optionIds.add(_uuid.v4());
      });
    }
  }

  void _removeOption(int index) {
    if (_optionControllers.length > _minOptions) {
      setState(() {
        _optionControllers[index].dispose();
        _optionControllers.removeAt(index);
        _optionIds.removeAt(index);
      });
    }
  }

  bool get _isValid {
    final hasQuestion = _questionController.text.trim().isNotEmpty;
    final validOptions = _optionControllers
        .where((c) => c.text.trim().isNotEmpty)
        .length;
    return hasQuestion && validOptions >= _minOptions;
  }

  void _createPoll() {
    if (!_isValid) return;

    final pollId = _uuid.v4();
    final question = _questionController.text.trim();

    // Build options list with only non-empty options
    final options = <PollOption>[];
    for (int i = 0; i < _optionControllers.length; i++) {
      final text = _optionControllers[i].text.trim();
      if (text.isNotEmpty) {
        options.add(PollOption(
          id: _optionIds[i],
          text: text,
          voteCount: 0,
        ));
      }
    }

    // Create linked content for the poll
    final linkedContent = {
      'id': pollId,
      'title': question,
      'type': 'poll',
      'poll': {
        'id': pollId,
        'question': question,
        'options': options.map((o) => o.toJson()).toList(),
        'isOpen': true,
        'showResultsBeforeVoting': _showResultsBeforeVoting,
        'createdBy': widget.creatorId,
        'totalVotes': 0,
      },
    };

    widget.onCreatePoll(linkedContent);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDarkMode ? AppTheme.cardDark : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                border: Border(
                  bottom: BorderSide(
                    color: isDarkMode ? Colors.grey[800]! : Colors.grey[200]!,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryLight.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.poll,
                      color: AppTheme.primaryLight,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'poll.create_title'.tr(),
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDarkMode ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.close,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Question input
                    Text(
                      'poll.question'.tr(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDarkMode ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _questionController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'poll.question_placeholder'.tr(),
                        filled: true,
                        fillColor: isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 20),

                    // Options
                    Text(
                      'poll.options'.tr(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDarkMode ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ..._optionControllers.asMap().entries.map((entry) {
                      final index = entry.key;
                      final controller = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: controller,
                                decoration: InputDecoration(
                                  hintText: 'poll.option_placeholder'.tr(args: [(index + 1).toString()]),
                                  filled: true,
                                  fillColor: isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: BorderSide.none,
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                ),
                                onChanged: (_) => setState(() {}),
                              ),
                            ),
                            if (_optionControllers.length > _minOptions)
                              IconButton(
                                icon: Icon(
                                  Icons.delete_outline,
                                  color: Colors.red[400],
                                  size: 20,
                                ),
                                onPressed: () => _removeOption(index),
                                tooltip: 'poll.remove_option'.tr(),
                              ),
                          ],
                        ),
                      );
                    }),

                    // Add option button
                    if (_optionControllers.length < _maxOptions)
                      TextButton.icon(
                        onPressed: _addOption,
                        icon: const Icon(Icons.add, size: 18),
                        label: Text('poll.add_option'.tr()),
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.primaryLight,
                        ),
                      ),

                    Text(
                      'poll.options_hint'.tr(args: [_minOptions.toString(), _maxOptions.toString()]),
                      style: TextStyle(
                        fontSize: 12,
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Show results before voting toggle
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'poll.show_results'.tr(),
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: isDarkMode ? Colors.white : Colors.black87,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _showResultsBeforeVoting
                                      ? 'poll.results_visible'.tr()
                                      : 'poll.results_hidden'.tr(),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: _showResultsBeforeVoting,
                            onChanged: (value) {
                              setState(() {
                                _showResultsBeforeVoting = value;
                              });
                            },
                            activeColor: AppTheme.primaryLight,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDarkMode ? AppTheme.cardDark : Colors.white,
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                border: Border(
                  top: BorderSide(
                    color: isDarkMode ? Colors.grey[800]! : Colors.grey[200]!,
                  ),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(
                      'poll.cancel'.tr(),
                      style: TextStyle(
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _isValid ? _createPoll : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryLight,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                    child: Text('poll.create'.tr()),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
