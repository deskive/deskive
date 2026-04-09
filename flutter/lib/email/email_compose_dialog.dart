import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import '../api/services/email_api_service.dart';
import '../api/services/ai_api_service.dart';
import '../widgets/google_drive_file_picker.dart';
import 'models/email_account_state.dart';

class EmailComposeDialog extends StatefulWidget {
  final String workspaceId;
  final Email? replyTo;
  final String? provider; // 'gmail' or 'smtp_imap'
  final VoidCallback? onSent;
  final VoidCallback? onDraftSaved;
  final List<EmailAccountState>? accounts; // For multiple account support
  final int initialAccountIndex; // Initial account to select
  // Draft support - pass an existing draft to edit
  final String? editDraftId;
  final String? draftSubject;
  final String? draftBody;
  final String? draftTo;
  final String? draftCc;
  final String? draftBcc;

  const EmailComposeDialog({
    super.key,
    required this.workspaceId,
    this.replyTo,
    this.provider,
    this.onSent,
    this.onDraftSaved,
    this.accounts,
    this.initialAccountIndex = 0,
    this.editDraftId,
    this.draftSubject,
    this.draftBody,
    this.draftTo,
    this.draftCc,
    this.draftBcc,
  });

  @override
  State<EmailComposeDialog> createState() => _EmailComposeDialogState();
}

class _EmailComposeDialogState extends State<EmailComposeDialog> {
  final EmailApiService _emailService = EmailApiService();
  final AIApiService _aiService = AIApiService();
  final _formKey = GlobalKey<FormState>();

  final _toController = TextEditingController();
  final _ccController = TextEditingController();
  final _bccController = TextEditingController();
  final _subjectController = TextEditingController();
  final _bodyController = TextEditingController();

  bool _showCc = false;
  bool _showBcc = false;
  bool _isSending = false;
  bool _isSavingDraft = false;

  // Draft management
  String? _draftId; // ID of current draft (if editing or after saving)
  DateTime? _lastAutoSaveTime;
  Timer? _autoSaveTimer;

  // AI-related state
  bool _isAIProcessing = false;
  List<String> _aiSuggestions = [];
  bool _showAISuggestions = false;
  String _aiSuggestionType = ''; // 'help_me_write' or 'smart_replies'

  // Attachments
  final List<EmailAttachmentFile> _attachments = [];

  // Selected account index for multi-account support
  late int _selectedAccountIndex;

  /// Get the currently selected provider
  String? get _selectedProvider {
    if (widget.accounts != null && widget.accounts!.isNotEmpty) {
      final safeIndex = _selectedAccountIndex.clamp(0, widget.accounts!.length - 1);
      return widget.accounts![safeIndex].provider;
    }
    return widget.provider;
  }

  bool get _isSmtpImap => _selectedProvider == 'smtp_imap';

  /// Whether multiple accounts are available
  bool get _hasMultipleAccounts =>
      widget.accounts != null && widget.accounts!.length > 1;

  @override
  void initState() {
    super.initState();
    _selectedAccountIndex = widget.initialAccountIndex;
    if (widget.replyTo != null) {
      _initializeReply();
    } else if (widget.editDraftId != null) {
      _initializeDraft();
    }
    // Set up auto-save listeners
    _setupAutoSave();
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();
    _toController.dispose();
    _ccController.dispose();
    _bccController.dispose();
    _subjectController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  /// Initialize from an existing draft
  void _initializeDraft() {
    _draftId = widget.editDraftId;
    if (widget.draftTo != null) {
      _toController.text = widget.draftTo!;
    }
    if (widget.draftSubject != null) {
      _subjectController.text = widget.draftSubject!;
    }
    if (widget.draftBody != null) {
      _bodyController.text = widget.draftBody!;
    }
    if (widget.draftCc != null && widget.draftCc!.isNotEmpty) {
      _ccController.text = widget.draftCc!;
      _showCc = true;
    }
    if (widget.draftBcc != null && widget.draftBcc!.isNotEmpty) {
      _bccController.text = widget.draftBcc!;
      _showBcc = true;
    }
  }

  /// Set up auto-save with debounce
  void _setupAutoSave() {
    // Add listeners to trigger auto-save on changes
    void onContentChanged() {
      _autoSaveTimer?.cancel();
      _autoSaveTimer = Timer(const Duration(seconds: 3), () {
        if (_hasContent && mounted) {
          _saveDraft(showSnackbar: false);
        }
      });
    }

    _toController.addListener(onContentChanged);
    _subjectController.addListener(onContentChanged);
    _bodyController.addListener(onContentChanged);
    _ccController.addListener(onContentChanged);
    _bccController.addListener(onContentChanged);
  }

  /// Check if there's any content to save
  bool get _hasContent =>
      _toController.text.isNotEmpty ||
      _subjectController.text.isNotEmpty ||
      _bodyController.text.isNotEmpty;

  /// Save as draft
  Future<void> _saveDraft({bool showSnackbar = true}) async {
    if (_isSavingDraft || _isSending) return;
    if (!_hasContent) return;

    setState(() => _isSavingDraft = true);

    try {
      final toList = _toController.text.trim().isEmpty
          ? null
          : _toController.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
      final ccList = _ccController.text.trim().isEmpty
          ? null
          : _ccController.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
      final bccList = _bccController.text.trim().isEmpty
          ? null
          : _bccController.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();

      final request = CreateDraftRequest(
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: _subjectController.text.trim(),
        body: _bodyController.text,
      );

      if (_draftId != null) {
        // Update existing draft
        final response = await _emailService.updateDraft(
          widget.workspaceId,
          _draftId!,
          request,
        );
        if (response.isSuccess && response.data != null) {
          _lastAutoSaveTime = DateTime.now();
          if (showSnackbar && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('email.draft_saved'.tr())),
            );
          }
        }
      } else {
        // Create new draft
        final response = await _emailService.createDraft(
          widget.workspaceId,
          request,
        );
        if (response.isSuccess && response.data != null) {
          setState(() {
            _draftId = response.data!.draftId;
          });
          _lastAutoSaveTime = DateTime.now();
          if (showSnackbar && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('email.draft_saved'.tr())),
            );
          }
        }
      }

      widget.onDraftSaved?.call();
    } catch (e) {
      debugPrint('Error saving draft: $e');
      if (showSnackbar && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('email.failed_to_save_draft'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSavingDraft = false);
      }
    }
  }

  void _initializeReply() {
    final replyTo = widget.replyTo!;

    // Set "To" field to the original sender
    if (replyTo.from != null) {
      _toController.text = replyTo.from!.email;
    }

    // Set subject with Re: prefix
    final subject = replyTo.subject ?? '';
    if (!subject.toLowerCase().startsWith('re:')) {
      _subjectController.text = 'Re: $subject';
    } else {
      _subjectController.text = subject;
    }

    // Set body with quote
    final originalFrom = replyTo.from?.formatted ?? 'Unknown';
    final originalDate = replyTo.date ?? '';
    final originalBody = replyTo.bodyText ?? '';

    _bodyController.text = '\n\n\nOn $originalDate, $originalFrom wrote:\n> ${originalBody.split('\n').join('\n> ')}';
  }

  /// Generate Help Me Write suggestions
  Future<void> _generateHelpMeWrite() async {
    debugPrint('🤖 Help Me Write: Starting...');
    final subject = _subjectController.text.trim();
    final currentBody = _bodyController.text.trim();

    if (subject.isEmpty) {
      debugPrint('🤖 Help Me Write: Subject is empty, showing snackbar');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a subject first')),
      );
      return;
    }

    debugPrint('🤖 Help Me Write: Subject = "$subject"');
    setState(() {
      _isAIProcessing = true;
      _aiSuggestionType = 'help_me_write';
      _aiSuggestions = [];
      _showAISuggestions = false;
    });

    try {
      final prompt = currentBody.isNotEmpty
          ? '''Complete this email draft for subject: "$subject"

Current draft:
$currentBody

Provide 3 different ways to complete this email. Each completion should be professional and appropriate.

IMPORTANT RULES:
- Do NOT include "Subject:" line in the body
- Start with a proper greeting (Dear..., Hi..., Hello...)
- Add blank lines between greeting, body paragraphs, and closing
- End with a professional closing (Best regards, Sincerely, etc.) and signature placeholder
- Format: Separate each suggestion with "---" on its own line
- Only provide the email body text, no labels or numbers'''
          : '''Write a professional email body for subject: "$subject"

Provide 3 different draft suggestions for this email.

IMPORTANT RULES:
- Do NOT include "Subject:" line in the body
- Start with a proper greeting (Dear..., Hi..., Hello...)
- Add blank lines between greeting, body paragraphs, and closing
- End with a professional closing (Best regards, Sincerely, etc.) and signature placeholder
- Format: Separate each suggestion with "---" on its own line
- Only provide the email body text, no labels or numbers''';

      debugPrint('🤖 Help Me Write: Calling AI service...');
      final response = await _aiService.generateText(
        GenerateTextDto(
          prompt: prompt,
          textType: 'email',
          tone: 'professional',
          maxTokens: 1000,
        ),
      );

      debugPrint('🤖 Help Me Write: Response received - success: ${response.success}');
      if (response.success && mounted) {
        final text = response.data.generatedText;
        debugPrint('🤖 Help Me Write: Generated text length: ${text.length}');
        debugPrint('🤖 Help Me Write: Generated text preview: ${text.substring(0, text.length > 100 ? 100 : text.length)}...');

        // Split by --- separator
        final suggestions = text
            .split(RegExp(r'\n---\n|\n-{3,}\n'))
            .map((s) => _cleanEmailSuggestion(s))
            .where((s) => s.isNotEmpty)
            .toList();

        debugPrint('🤖 Help Me Write: Found ${suggestions.length} suggestions');

        setState(() {
          _aiSuggestions = suggestions.isNotEmpty ? suggestions : [_cleanEmailSuggestion(text)];
          _showAISuggestions = true;
          debugPrint('🤖 Help Me Write: _showAISuggestions = $_showAISuggestions, _aiSuggestions.length = ${_aiSuggestions.length}');
        });
      } else if (mounted) {
        debugPrint('🤖 Help Me Write: Error - ${response.error}');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.error ?? 'Failed to generate suggestions')),
        );
      }
    } catch (e, stackTrace) {
      debugPrint('🤖 Help Me Write: Exception - $e');
      debugPrint('🤖 Help Me Write: Stack trace - $stackTrace');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isAIProcessing = false);
      }
    }
  }

  /// Clean up AI-generated email suggestion
  String _cleanEmailSuggestion(String text) {
    String cleaned = text.trim();

    // Remove "Subject:" line if present at the start
    cleaned = cleaned.replaceFirst(RegExp(r'^Subject:\s*[^\n]*\n*', caseSensitive: false), '');

    // Remove option labels like "Option 1:", "1.", "Draft 1:", etc.
    cleaned = cleaned.replaceFirst(RegExp(r'^(Option\s*\d+[:\.]?\s*|Draft\s*\d+[:\.]?\s*|\d+[\.:\)]\s*)', caseSensitive: false), '');

    // Ensure proper line breaks after greeting
    cleaned = cleaned.replaceAllMapped(
      RegExp(r'(Dear\s+[^,\n]+,|Hi\s+[^,\n]*,|Hello\s*[^,\n]*,|Good\s+(morning|afternoon|evening)[^,\n]*,)(\s*)([A-Z])'),
      (match) => '${match.group(1)}\n\n${match.group(4)}',
    );

    // Ensure line break before closing
    cleaned = cleaned.replaceAllMapped(
      RegExp(r'([.!?])(\s*)(Best regards|Sincerely|Kind regards|Thank you|Thanks|Regards|Warm regards|Yours truly|Respectfully)', caseSensitive: false),
      (match) => '${match.group(1)}\n\n${match.group(3)}',
    );

    return cleaned.trim();
  }

  /// Generate Smart Reply suggestions
  Future<void> _generateSmartReplies() async {
    if (widget.replyTo == null) return;

    final originalEmail = widget.replyTo!;
    final originalBody = originalEmail.bodyText ?? originalEmail.bodyHtml?.replaceAll(RegExp(r'<[^>]*>'), '') ?? '';
    final originalSubject = originalEmail.subject ?? '';
    final originalFrom = originalEmail.from?.formatted ?? '';

    setState(() {
      _isAIProcessing = true;
      _aiSuggestionType = 'smart_replies';
      _aiSuggestions = [];
      _showAISuggestions = false;
    });

    try {
      final prompt = '''Generate 3 quick reply suggestions for this email.

Original email:
From: $originalFrom
Subject: $originalSubject
Body: $originalBody

Provide 3 different reply options:
1. A brief, positive response
2. A more detailed professional response
3. A polite acknowledgment or follow-up

Format: Separate each suggestion with "---" on its own line. Only provide the reply text, no labels or numbers.''';

      final response = await _aiService.generateText(
        GenerateTextDto(
          prompt: prompt,
          textType: 'email',
          tone: 'professional',
          maxTokens: 800,
        ),
      );

      if (response.success && mounted) {
        final text = response.data.generatedText;
        // Split by --- separator
        final suggestions = text
            .split(RegExp(r'\n---\n|\n-{3,}\n'))
            .map((s) => _cleanEmailSuggestion(s))
            .where((s) => s.isNotEmpty)
            .toList();

        setState(() {
          _aiSuggestions = suggestions.isNotEmpty ? suggestions : [_cleanEmailSuggestion(text)];
          _showAISuggestions = true;
        });
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.error ?? 'Failed to generate replies')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isAIProcessing = false);
      }
    }
  }

  /// Apply an AI suggestion to the body
  void _applySuggestion(String suggestion) {
    setState(() {
      if (_aiSuggestionType == 'smart_replies' && widget.replyTo != null) {
        // For smart replies, prepend to the existing quoted content
        final existingBody = _bodyController.text;
        final quoteStart = existingBody.indexOf('\n\nOn ');
        if (quoteStart != -1) {
          _bodyController.text = '$suggestion${existingBody.substring(quoteStart)}';
        } else {
          _bodyController.text = suggestion;
        }
      } else {
        _bodyController.text = suggestion;
      }
      _showAISuggestions = false;
      _aiSuggestions = [];
    });
  }

  /// Build the AI suggestions panel
  Widget _buildAISuggestionsPanel() {
    debugPrint('🤖 Building AI Panel: _showAISuggestions=$_showAISuggestions, suggestions=${_aiSuggestions.length}');
    if (!_showAISuggestions || _aiSuggestions.isEmpty) {
      return const SizedBox.shrink();
    }

    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final title = _aiSuggestionType == 'smart_replies' ? 'Smart Replies' : 'Draft Suggestions';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey.shade900 : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.teal.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.teal.shade500, Colors.green.shade500],
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome, size: 16, color: Colors.white),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                InkWell(
                  onTap: () => setState(() {
                    _showAISuggestions = false;
                    _aiSuggestions = [];
                  }),
                  child: const Icon(Icons.close, size: 18, color: Colors.white),
                ),
              ],
            ),
          ),
          // Suggestions
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              children: _aiSuggestions.asMap().entries.map((entry) {
                final index = entry.key;
                final suggestion = entry.value;
                return Container(
                  margin: EdgeInsets.only(top: index > 0 ? 8 : 0),
                  child: InkWell(
                    onTap: () => _applySuggestion(suggestion),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDarkMode ? Colors.grey.shade800 : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isDarkMode ? Colors.grey.shade700 : Colors.grey.shade200,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.teal.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Option ${index + 1}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.teal.shade700,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              Text(
                                'Tap to use',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isDarkMode ? Colors.grey.shade400 : Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            suggestion.length > 200 ? '${suggestion.substring(0, 200)}...' : suggestion,
                            style: TextStyle(
                              fontSize: 13,
                              color: isDarkMode ? Colors.grey.shade300 : Colors.grey.shade700,
                              height: 1.4,
                            ),
                            maxLines: 4,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _send() async {
    if (!_formKey.currentState!.validate()) return;

    debugPrint('📧 Starting email send...');
    debugPrint('📧 Attachments count: ${_attachments.length}');
    for (final attachment in _attachments) {
      debugPrint('📧 Attachment: ${attachment.fileName} (${attachment.filePath})');
    }

    setState(() => _isSending = true);

    try {
      if (widget.replyTo != null) {
        // Send as reply
        final request = ReplyEmailRequest(
          body: _bodyController.text,
          replyAll: false,
        );

        final response = _isSmtpImap
            ? await _emailService.replySmtpImapEmail(
                widget.workspaceId,
                widget.replyTo!.id,
                request,
              )
            : await _emailService.replyToEmail(
                widget.workspaceId,
                widget.replyTo!.id,
                request,
              );

        if (response.success) {
          widget.onSent?.call();
          if (mounted) {
            Navigator.pop(context);
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(response.message ?? 'Failed to send reply')),
            );
          }
        }
      } else {
        // Send new email
        final to = _toController.text
            .split(',')
            .map((e) => e.trim())
            .where((e) => e.isNotEmpty)
            .toList();

        final cc = _showCc
            ? _ccController.text
                .split(',')
                .map((e) => e.trim())
                .where((e) => e.isNotEmpty)
                .toList()
            : null;

        final bcc = _showBcc
            ? _bccController.text
                .split(',')
                .map((e) => e.trim())
                .where((e) => e.isNotEmpty)
                .toList()
            : null;

        final request = SendEmailRequest(
          to: to,
          cc: cc,
          bcc: bcc,
          subject: _subjectController.text,
          body: _bodyController.text,
          attachments: _attachments.isNotEmpty ? _attachments : null,
        );

        debugPrint('📧 Compose: Calling sendEmail API...');
        final response = _isSmtpImap
            ? await _emailService.sendSmtpImapEmail(widget.workspaceId, request)
            : await _emailService.sendEmail(widget.workspaceId, request);

        debugPrint('📧 Compose: Response received - success: ${response.success}, message: ${response.message}');

        if (response.success) {
          debugPrint('✅ Compose: Email sent successfully!');
          widget.onSent?.call();
          if (mounted) {
            Navigator.pop(context);
          }
        } else {
          debugPrint('❌ Compose: Email send failed - ${response.message}');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(response.message ?? 'Failed to send email')),
            );
          }
        }
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Compose: Exception during send - $e');
      debugPrint('Stack trace: $stackTrace');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.folder_outlined),
              title: Text('email.attach_from_device'.tr()),
              onTap: () {
                Navigator.pop(context);
                _pickLocalFile();
              },
            ),
            ListTile(
              leading: const Icon(Icons.cloud_outlined, color: Color(0xFF4285F4)),
              title: Text('email.attach_from_google_drive'.tr()),
              onTap: () {
                Navigator.pop(context);
                _pickFromGoogleDrive();
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickLocalFile() async {
    debugPrint('📎 Starting local file picker... (isWeb: $kIsWeb)');
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.any,
        withData: true, // Important: Get bytes for web platform
      );

      debugPrint('📎 FilePicker result: ${result != null ? "${result.files.length} files selected" : "null/cancelled"}');

      if (result != null && result.files.isNotEmpty) {
        for (final platformFile in result.files) {
          debugPrint('📎 Processing file: ${platformFile.name}');
          debugPrint('📎 Has bytes: ${platformFile.bytes != null}, bytes length: ${platformFile.bytes?.length ?? 0}');
          debugPrint('📎 Has path: ${platformFile.path != null}, path: ${platformFile.path}');

          // On web, use bytes; on mobile, use file path
          if (kIsWeb) {
            // Web platform - use bytes
            if (platformFile.bytes != null && platformFile.bytes!.isNotEmpty) {
              final fileSize = platformFile.bytes!.length;
              debugPrint('📎 File size (from bytes): ${_formatFileSize(fileSize)}');

              // Check file size (max 25MB for email attachments)
              if (fileSize > 25 * 1024 * 1024) {
                debugPrint('⚠️ File too large: ${platformFile.name}');
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('email.attachment_too_large'.tr(args: [platformFile.name])),
                      backgroundColor: Colors.orange,
                    ),
                  );
                }
                continue;
              }

              setState(() {
                _attachments.add(EmailAttachmentFile(
                  fileName: platformFile.name,
                  mimeType: _getMimeType(platformFile.name),
                  fileSize: fileSize,
                  isFromGoogleDrive: false,
                  fileBytes: platformFile.bytes,
                ));
              });
              debugPrint('✅ Attachment added (web): ${platformFile.name}');
            } else {
              debugPrint('⚠️ No bytes available for: ${platformFile.name}');
            }
          } else {
            // Mobile platform - use file path
            if (platformFile.path != null) {
              final file = File(platformFile.path!);
              final fileExists = await file.exists();
              debugPrint('📎 File exists: $fileExists');

              if (!fileExists) {
                debugPrint('❌ File does not exist at path: ${platformFile.path}');
                continue;
              }

              final fileSize = await file.length();
              debugPrint('📎 File size: ${_formatFileSize(fileSize.toInt())}');

              // Check file size (max 25MB for email attachments)
              if (fileSize > 25 * 1024 * 1024) {
                debugPrint('⚠️ File too large: ${platformFile.name}');
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('email.attachment_too_large'.tr(args: [platformFile.name])),
                      backgroundColor: Colors.orange,
                    ),
                  );
                }
                continue;
              }

              setState(() {
                _attachments.add(EmailAttachmentFile(
                  filePath: platformFile.path!,
                  fileName: platformFile.name,
                  mimeType: _getMimeType(platformFile.name),
                  fileSize: fileSize.toInt(),
                  isFromGoogleDrive: false,
                ));
              });
              debugPrint('✅ Attachment added (mobile): ${platformFile.name}');
            } else {
              debugPrint('⚠️ File path is null for: ${platformFile.name}');
            }
          }
        }
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error picking local file: $e');
      debugPrint('Stack trace: $stackTrace');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('email.failed_to_pick_file'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pickFromGoogleDrive() async {
    debugPrint('☁️ Starting Google Drive file picker... (isWeb: $kIsWeb)');
    try {
      final result = await GoogleDriveFilePicker.show(
        context: context,
        downloadFile: true,
        title: 'email.select_file_from_drive'.tr(),
      );

      debugPrint('☁️ Google Drive picker result: ${result != null ? "file selected: ${result.file.name}" : "null/cancelled"}');
      if (result != null) {
        debugPrint('☁️ Has localFile: ${result.localFile != null}');
        debugPrint('☁️ Has fileBytes: ${result.fileBytes != null}, length: ${result.fileBytes?.length ?? 0}');
      }

      if (result == null) {
        debugPrint('☁️ User cancelled or no file selected');
        return;
      }

      // On web, use fileBytes; on mobile, use localFile
      if (kIsWeb) {
        // Web platform - use fileBytes
        if (result.fileBytes != null && result.fileBytes!.isNotEmpty) {
          final fileSize = result.fileBytes!.length;
          debugPrint('☁️ File size (from bytes): ${_formatFileSize(fileSize)}');

          // Check file size (max 25MB for email attachments)
          if (fileSize > 25 * 1024 * 1024) {
            debugPrint('⚠️ File too large: ${result.file.name}');
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('email.attachment_too_large'.tr(args: [result.file.name])),
                  backgroundColor: Colors.orange,
                ),
              );
            }
            return;
          }

          setState(() {
            _attachments.add(EmailAttachmentFile(
              fileName: result.file.name,
              mimeType: result.file.mimeType,
              fileSize: fileSize,
              isFromGoogleDrive: true,
              googleDriveFileId: result.file.id,
              fileBytes: result.fileBytes,
            ));
          });
          debugPrint('✅ Google Drive attachment added (web): ${result.file.name}');
        } else {
          debugPrint('⚠️ No bytes available for Google Drive file');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('email.failed_to_pick_file'.tr()),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      } else {
        // Mobile platform - use localFile
        if (result.localFile != null) {
          final file = result.localFile as File;
          debugPrint('☁️ Local file path: ${file.path}');

          final fileExists = await file.exists();
          debugPrint('☁️ File exists: $fileExists');

          if (!fileExists) {
            debugPrint('❌ Downloaded file does not exist at path: ${file.path}');
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('email.failed_to_pick_file'.tr()),
                  backgroundColor: Colors.red,
                ),
              );
            }
            return;
          }

          final fileSize = await file.length();
          debugPrint('☁️ File size: ${_formatFileSize(fileSize.toInt())}');

          // Check file size (max 25MB for email attachments)
          if (fileSize > 25 * 1024 * 1024) {
            debugPrint('⚠️ File too large: ${result.file.name}');
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('email.attachment_too_large'.tr(args: [result.file.name])),
                  backgroundColor: Colors.orange,
                ),
              );
            }
            return;
          }

          setState(() {
            _attachments.add(EmailAttachmentFile(
              filePath: file.path,
              fileName: result.file.name,
              mimeType: result.file.mimeType,
              fileSize: fileSize.toInt(),
              isFromGoogleDrive: true,
              googleDriveFileId: result.file.id,
            ));
          });
          debugPrint('✅ Google Drive attachment added (mobile): ${result.file.name}');
        } else {
          debugPrint('⚠️ File selected but localFile is null - download may have failed');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('email.failed_to_pick_file'.tr()),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error picking from Google Drive: $e');
      debugPrint('Stack trace: $stackTrace');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('email.failed_to_pick_file'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _removeAttachment(int index) {
    setState(() {
      _attachments.removeAt(index);
    });
  }

  String? _getMimeType(String fileName) {
    final extension = fileName.split('.').last.toLowerCase();
    final mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'html': 'text/html',
      'zip': 'application/zip',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
    };
    return mimeTypes[extension];
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  IconData _getFileIcon(String fileName) {
    final extension = fileName.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart;
      case 'ppt':
      case 'pptx':
        return Icons.slideshow;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return Icons.image;
      case 'mp4':
      case 'mov':
      case 'avi':
        return Icons.video_file;
      case 'mp3':
      case 'wav':
        return Icons.audio_file;
      case 'zip':
      case 'rar':
        return Icons.archive;
      default:
        return Icons.insert_drive_file;
    }
  }

  /// Build the account selector dropdown for multi-account support
  Widget _buildAccountSelector() {
    final accounts = widget.accounts!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: colorScheme.outline),
        borderRadius: BorderRadius.circular(4),
      ),
      child: DropdownButtonFormField<int>(
        value: _selectedAccountIndex.clamp(0, accounts.length - 1),
        decoration: const InputDecoration(
          labelText: 'From',
          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          border: InputBorder.none,
        ),
        items: accounts.asMap().entries.map((entry) {
          final index = entry.key;
          final account = entry.value;
          final isGmail = account.provider == 'gmail';
          final providerColor = isGmail ? Colors.red : Colors.blue;

          return DropdownMenuItem<int>(
            value: index,
            child: Row(
              children: [
                // Provider icon
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: providerColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Icon(
                    isGmail ? Icons.mail : Icons.dns,
                    size: 16,
                    color: providerColor,
                  ),
                ),
                const SizedBox(width: 12),
                // Email address
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        account.emailAddress.isNotEmpty
                            ? account.emailAddress
                            : (isGmail ? 'Gmail' : 'SMTP/IMAP'),
                        style: theme.textTheme.bodyMedium,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                // Provider badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: providerColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    isGmail ? 'Gmail' : 'SMTP',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: providerColor,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
        onChanged: (value) {
          if (value != null) {
            setState(() {
              _selectedAccountIndex = value;
            });
          }
        },
        isExpanded: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isReply = widget.replyTo != null;

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                    Expanded(
                      child: Text(
                        isReply ? 'Reply' : 'Compose',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    // Save Draft button
                    if (_hasContent) ...[
                      OutlinedButton.icon(
                        onPressed: (_isSending || _isSavingDraft) ? null : () => _saveDraft(showSnackbar: true),
                        icon: _isSavingDraft
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.save_outlined, size: 18),
                        label: Text('email.save_draft'.tr()),
                      ),
                      const SizedBox(width: 8),
                    ],
                    // Auto-save indicator
                    if (_lastAutoSaveTime != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Text(
                          'email.auto_saved'.tr(),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.green,
                          ),
                        ),
                      ),
                    FilledButton(
                      onPressed: (_isSending || _isSavingDraft) ? null : _send,
                      child: _isSending
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Send'),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Form
              Expanded(
                child: Form(
                  key: _formKey,
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(16),
                    children: [
                      // From field (account selector) - only show when multiple accounts
                      if (_hasMultipleAccounts) ...[
                        _buildAccountSelector(),
                        const SizedBox(height: 12),
                      ],
                      // To field
                      TextFormField(
                        controller: _toController,
                        decoration: InputDecoration(
                          labelText: 'To',
                          hintText: 'recipient@example.com',
                          border: const OutlineInputBorder(),
                          suffixIcon: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (!_showCc)
                                TextButton(
                                  onPressed: () => setState(() => _showCc = true),
                                  child: const Text('Cc'),
                                ),
                              if (!_showBcc)
                                TextButton(
                                  onPressed: () => setState(() => _showBcc = true),
                                  child: const Text('Bcc'),
                                ),
                            ],
                          ),
                        ),
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter a recipient';
                          }
                          return null;
                        },
                      ),
                      if (_showCc) ...[
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _ccController,
                          decoration: InputDecoration(
                            labelText: 'Cc',
                            hintText: 'cc@example.com',
                            border: const OutlineInputBorder(),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () => setState(() => _showCc = false),
                            ),
                          ),
                          keyboardType: TextInputType.emailAddress,
                        ),
                      ],
                      if (_showBcc) ...[
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _bccController,
                          decoration: InputDecoration(
                            labelText: 'Bcc',
                            hintText: 'bcc@example.com',
                            border: const OutlineInputBorder(),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () => setState(() => _showBcc = false),
                            ),
                          ),
                          keyboardType: TextInputType.emailAddress,
                        ),
                      ],
                      const SizedBox(height: 12),
                      // Subject field
                      TextFormField(
                        controller: _subjectController,
                        decoration: const InputDecoration(
                          labelText: 'Subject',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter a subject';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      // AI Suggestions Panel
                      _buildAISuggestionsPanel(),
                      // AI Actions Row
                      Row(
                        children: [
                          // Help Me Write button
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _isAIProcessing ? null : _generateHelpMeWrite,
                              icon: _isAIProcessing && _aiSuggestionType == 'help_me_write'
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.edit_note, size: 18),
                              label: const Text('Help Me Write'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.blue,
                                side: const BorderSide(color: Colors.blue),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Smart Replies button (only for replies)
                          if (widget.replyTo != null)
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _isAIProcessing ? null : _generateSmartReplies,
                                icon: _isAIProcessing && _aiSuggestionType == 'smart_replies'
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : const Icon(Icons.quickreply, size: 18),
                                label: const Text('Smart Replies'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.teal,
                                  side: const BorderSide(color: Colors.teal),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Body field
                      TextFormField(
                        controller: _bodyController,
                        decoration: const InputDecoration(
                          labelText: 'Message',
                          alignLabelWithHint: true,
                          border: OutlineInputBorder(),
                        ),
                        maxLines: null,
                        minLines: 10,
                        keyboardType: TextInputType.multiline,
                      ),
                      const SizedBox(height: 16),
                      // Attachment button
                      OutlinedButton.icon(
                        onPressed: _showAttachmentOptions,
                        icon: const Icon(Icons.attach_file),
                        label: Text('email.add_attachment'.tr()),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                      ),
                      // Attachments list
                      if (_attachments.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.attachment,
                                    size: 16,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'email.attachments_count'.tr(args: [_attachments.length.toString()]),
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: Theme.of(context).colorScheme.primary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              ...List.generate(_attachments.length, (index) {
                                final attachment = _attachments[index];
                                return Container(
                                  margin: EdgeInsets.only(top: index > 0 ? 8 : 0),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.surface,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        _getFileIcon(attachment.fileName),
                                        size: 20,
                                        color: attachment.isFromGoogleDrive
                                            ? const Color(0xFF4285F4)
                                            : Theme.of(context).colorScheme.primary,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              attachment.fileName,
                                              style: const TextStyle(fontSize: 13),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            Row(
                                              children: [
                                                Text(
                                                  attachment.fileSize != null
                                                      ? _formatFileSize(attachment.fileSize!)
                                                      : '',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                                  ),
                                                ),
                                                if (attachment.isFromGoogleDrive) ...[
                                                  const SizedBox(width: 8),
                                                  Icon(
                                                    Icons.cloud_outlined,
                                                    size: 12,
                                                    color: const Color(0xFF4285F4),
                                                  ),
                                                  const SizedBox(width: 2),
                                                  Text(
                                                    'Drive',
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      color: const Color(0xFF4285F4),
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.close, size: 18),
                                        onPressed: () => _removeAttachment(index),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(
                                          minWidth: 32,
                                          minHeight: 32,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
