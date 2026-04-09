import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter_html/flutter_html.dart';
import '../api/services/email_api_service.dart';
import '../api/services/ai_api_service.dart';
import '../calendar/create_event_screen.dart';
import 'email_list_widget.dart' show parseEmailDate;
import 'widgets/email_ai_actions.dart';
import 'widgets/email_ai_dropdown.dart';
import 'widgets/email_ai_result_modal.dart';
import 'widgets/travel_ticket_bottom_sheet.dart';

class EmailDetailWidget extends StatefulWidget {
  final Email? email;
  final bool isLoading;
  final VoidCallback onClose;
  final VoidCallback onReply;
  final VoidCallback onStar;
  final VoidCallback onDelete;
  final String workspaceId;
  final String? connectionId;

  const EmailDetailWidget({
    super.key,
    this.email,
    required this.isLoading,
    required this.onClose,
    required this.onReply,
    required this.onStar,
    required this.onDelete,
    required this.workspaceId,
    this.connectionId,
  });

  @override
  State<EmailDetailWidget> createState() => _EmailDetailWidgetState();
}

class _EmailDetailWidgetState extends State<EmailDetailWidget> {
  final AIApiService _aiService = AIApiService();
  final EmailApiService _emailApiService = EmailApiService();
  bool _isAIProcessing = false;

  /// Get email content for AI processing
  String get _emailContent {
    final email = widget.email;
    if (email == null) return '';

    final subject = email.subject ?? '';
    final body = email.bodyText ?? email.bodyHtml?.replaceAll(RegExp(r'<[^>]*>'), '') ?? '';
    final from = email.from?.formatted ?? '';

    return 'Subject: $subject\nFrom: $from\n\n$body';
  }

  /// Handle AI action selection
  Future<void> _handleAIAction(EmailAIAction action, {String? language}) async {
    if (widget.email == null) return;

    setState(() => _isAIProcessing = true);

    // Show loading modal
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => EmailAIResultModal(
        action: action,
        emailSubject: widget.email!.subject ?? '(no subject)',
        isLoading: true,
      ),
    );

    try {
      String? result;
      String? error;

      switch (action) {
        case EmailAIAction.summarize:
          final response = await _aiService.summarizeContent(
            SummarizeContentDto(
              content: _emailContent,
              summaryType: 'abstractive',
              contentType: 'email',
              length: 'medium',
            ),
          );
          if (response.success) {
            result = response.data.summary;
          } else {
            error = response.error;
          }
          break;

        case EmailAIAction.translate:
          if (language == null) {
            error = 'No language selected';
            break;
          }
          final response = await _aiService.translateText(
            TranslateTextDto(
              text: _emailContent,
              targetLanguage: language,
              preserveFormatting: true,
            ),
          );
          if (response.success) {
            result = response.data.translatedText;
          } else {
            error = response.error;
          }
          break;

        case EmailAIAction.extractTasks:
          final response = await _aiService.generateText(
            GenerateTextDto(
              prompt: 'Extract all action items, tasks, and to-dos from this email. Format each task as a bullet point with clear, actionable language:\n\n$_emailContent',
              textType: 'general',
              maxTokens: 500,
            ),
          );
          if (response.success) {
            result = response.data.generatedText;
          } else {
            error = response.error;
          }
          break;

        case EmailAIAction.helpMeWrite:
        case EmailAIAction.smartReplies:
          // These are handled in the compose dialog
          break;

        case EmailAIAction.createEventFromTicket:
          // Handle travel info extraction
          await _handleCreateEventFromTicket();
          // Close loading modal without showing result modal
          if (mounted) {
            Navigator.of(context).pop();
          }
          return; // Early return, don't show result modal
      }

      // Close loading modal and show result
      if (mounted) {
        Navigator.of(context).pop();

        if (result != null || error != null) {
          showDialog(
            context: context,
            barrierDismissible: true,
            builder: (ctx) => EmailAIResultModal(
              action: action,
              emailSubject: widget.email!.subject ?? '(no subject)',
              initialResult: result,
              initialError: error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop();
        showDialog(
          context: context,
          barrierDismissible: true,
          builder: (ctx) => EmailAIResultModal(
            action: action,
            emailSubject: widget.email!.subject ?? '(no subject)',
            initialError: e.toString(),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isAIProcessing = false);
      }
    }
  }

  /// Handle create event from ticket action
  Future<void> _handleCreateEventFromTicket() async {
    if (widget.email == null) return;

    final email = widget.email!;

    // Find PDF attachment if any
    String? pdfAttachmentId;
    if (email.attachments != null) {
      for (final att in email.attachments!) {
        if (att.mimeType == 'application/pdf') {
          pdfAttachmentId = att.attachmentId;
          break;
        }
      }
    }

    // Get email body (prefer text, fallback to stripped HTML)
    final body = email.bodyText ??
        email.bodyHtml?.replaceAll(RegExp(r'<[^>]*>'), '') ?? '';

    try {
      final response = await _emailApiService.extractTravelInfo(
        widget.workspaceId,
        ExtractTravelInfoRequest(
          subject: email.subject ?? '',
          body: body,
          senderEmail: email.from?.email,
          messageId: email.id,
          attachmentId: pdfAttachmentId,
          connectionId: widget.connectionId,
        ),
      );

      if (!mounted) return;

      if (response.success && response.data != null) {
        final travelResponse = response.data!;

        if (travelResponse.ticketInfo.found) {
          // Show travel ticket bottom sheet
          TravelTicketBottomSheet.show(
            context,
            ticketInfo: travelResponse.ticketInfo,
            suggestedTitle: travelResponse.suggestedTitle,
            suggestedDescription: travelResponse.suggestedDescription,
            onCreateEvent: () => _navigateToCreateEventFromTravel(travelResponse),
          );
        } else {
          // No travel info found
          NoTravelInfoDialog.show(context);
        }
      } else {
        // API error
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to extract travel info'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Navigate to create event screen with pre-filled travel data
  void _navigateToCreateEventFromTravel(ExtractTravelInfoResponse travelResponse) {
    final ticket = travelResponse.ticketInfo;

    // Parse departure time for event start
    DateTime? startDateTime;
    DateTime? endDateTime;

    if (ticket.departureDateTime != null) {
      try {
        // Append timezone if available
        var departureDateStr = ticket.departureDateTime!;
        if (ticket.departureTimezone != null && !departureDateStr.contains('+') && !departureDateStr.contains('Z')) {
          departureDateStr = '$departureDateStr${ticket.departureTimezone}';
        }
        startDateTime = DateTime.parse(departureDateStr);
      } catch (e) {
        debugPrint('Could not parse departure time: ${ticket.departureDateTime}');
        // Try without timezone
        try {
          startDateTime = DateTime.parse(ticket.departureDateTime!);
        } catch (_) {}
      }
    }

    if (ticket.arrivalDateTime != null) {
      try {
        // Append timezone if available
        var arrivalDateStr = ticket.arrivalDateTime!;
        if (ticket.departureTimezone != null && !arrivalDateStr.contains('+') && !arrivalDateStr.contains('Z')) {
          arrivalDateStr = '$arrivalDateStr${ticket.departureTimezone}';
        }
        endDateTime = DateTime.parse(arrivalDateStr);
      } catch (e) {
        debugPrint('Could not parse arrival time: ${ticket.arrivalDateTime}');
        // Try without timezone
        try {
          endDateTime = DateTime.parse(ticket.arrivalDateTime!);
        } catch (_) {}
      }
    }

    // If no arrival time, default to 2 hours after departure
    if (endDateTime == null && startDateTime != null) {
      endDateTime = startDateTime.add(const Duration(hours: 2));
    }

    // Default to now if no times available
    startDateTime ??= DateTime.now();
    endDateTime ??= startDateTime.add(const Duration(hours: 2));

    // Navigate to create event screen
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => CreateEventScreen(
          onEventCreated: (event) {
            Navigator.of(context).pop();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Event created successfully!'),
                backgroundColor: Colors.green,
              ),
            );
          },
          initialTitle: travelResponse.suggestedTitle,
          initialDescription: travelResponse.suggestedDescription,
          initialStartDate: startDateTime,
          initialEndDate: endDateTime,
          initialLocation: ticket.departureLocation,
        ),
      ),
    );
  }

  /// Sanitize HTML to remove problematic CSS that causes rendering errors
  String _sanitizeHtml(String html) {
    // Remove font-feature-settings which can cause "Feature tag must be exactly four characters long" error
    String sanitized = html.replaceAll(
      RegExp(r'font-feature-settings\s*:\s*[^;}"]+[;]?', caseSensitive: false),
      '',
    );

    // Remove -webkit-font-feature-settings
    sanitized = sanitized.replaceAll(
      RegExp(r'-webkit-font-feature-settings\s*:\s*[^;}"]+[;]?', caseSensitive: false),
      '',
    );

    // Remove -moz-font-feature-settings
    sanitized = sanitized.replaceAll(
      RegExp(r'-moz-font-feature-settings\s*:\s*[^;}"]+[;]?', caseSensitive: false),
      '',
    );

    // Remove font-variation-settings which can also cause issues
    sanitized = sanitized.replaceAll(
      RegExp(r'font-variation-settings\s*:\s*[^;}"]+[;]?', caseSensitive: false),
      '',
    );

    return sanitized;
  }

  /// Build HTML body widget with error handling
  Widget _buildHtmlBody(BuildContext context, String htmlContent) {
    final sanitizedHtml = _sanitizeHtml(htmlContent);

    // For very large/complex HTML emails (marketing emails), flutter_html struggles
    // Use a size threshold to decide rendering strategy
    const maxHtmlSizeForRendering = 15000;

    if (sanitizedHtml.length > maxHtmlSizeForRendering) {
      // For complex emails, extract and show plain text
      final plainText = _extractPlainText(htmlContent);
      return SelectableText(
        plainText,
        style: Theme.of(context).textTheme.bodyMedium,
      );
    }

    // For simpler emails, render HTML
    return Html(
      data: sanitizedHtml,
      shrinkWrap: false,
      style: {
        "body": Style(
          margin: Margins.zero,
          padding: HtmlPaddings.zero,
          fontSize: FontSize(14),
        ),
        "p": Style(
          margin: Margins.only(bottom: 8),
        ),
        "div": Style(
          margin: Margins.zero,
          padding: HtmlPaddings.zero,
        ),
        "a": Style(
          color: Theme.of(context).colorScheme.primary,
        ),
        "img": Style(
          width: Width(100, Unit.percent),
        ),
      },
      onLinkTap: (url, attributes, element) {
        debugPrint('Link tapped: $url');
      },
    );
  }

  /// Extract plain text from HTML content
  String _extractPlainText(String html) {
    return html
        .replaceAll(RegExp(r'<style[^>]*>[\s\S]*?</style>', caseSensitive: false), '')
        .replaceAll(RegExp(r'<script[^>]*>[\s\S]*?</script>', caseSensitive: false), '')
        .replaceAll(RegExp(r'<br\s*/?\s*>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'</div>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll(RegExp(r'&nbsp;'), ' ')
        .replaceAll(RegExp(r'&amp;'), '&')
        .replaceAll(RegExp(r'&lt;'), '<')
        .replaceAll(RegExp(r'&gt;'), '>')
        .replaceAll(RegExp(r'&quot;'), '"')
        .replaceAll(RegExp(r'&#39;'), "'")
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .replaceAll(RegExp(r' {2,}'), ' ')
        .trim();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (widget.email == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.mail_outline,
              size: 64,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'Select an email to view',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
            ),
          ],
        ),
      );
    }

    final email = widget.email!;
    final fromName = email.from?.name ?? email.from?.email ?? 'Unknown';
    final fromInitial = fromName.isNotEmpty ? fromName[0].toUpperCase() : '?';
    final parsedDate = parseEmailDate(email.date);
    final formattedDate = parsedDate != null
        ? DateFormat('MMM d, yyyy h:mm a').format(parsedDate)
        : '';

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: Theme.of(context).dividerColor,
              ),
            ),
          ),
          child: Row(
            children: [
              // AI Actions Dropdown
              EmailAIDropdown(
                onAction: _handleAIAction,
                isProcessing: _isAIProcessing,
              ),
              // Push action buttons to the right
              const Spacer(),
              // Action buttons
              IconButton(
                icon: const Icon(Icons.reply),
                onPressed: widget.onReply,
                tooltip: 'Reply',
              ),
              IconButton(
                icon: const Icon(Icons.reply_all),
                onPressed: () {}, // TODO: Implement reply all
                tooltip: 'Reply All',
              ),
              IconButton(
                icon: const Icon(Icons.forward),
                onPressed: () {}, // TODO: Implement forward
                tooltip: 'Forward',
              ),
              IconButton(
                icon: Icon(
                  email.isStarred ? Icons.star : Icons.star_outline,
                  color: email.isStarred ? Colors.amber : null,
                ),
                onPressed: widget.onStar,
                tooltip: email.isStarred ? 'Unstar' : 'Star',
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline),
                onPressed: widget.onDelete,
                tooltip: 'Delete',
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                onSelected: (value) {
                  // Handle menu actions
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'unread',
                    child: Text('Mark as unread'),
                  ),
                  const PopupMenuItem(
                    value: 'label',
                    child: Text('Add label'),
                  ),
                  const PopupMenuItem(
                    value: 'delete_permanent',
                    child: Text('Delete permanently'),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Email content
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Subject
                Text(
                  email.subject ?? '(no subject)',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                // Sender info
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 20,
                      child: Text(fromInitial),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: RichText(
                                  text: TextSpan(
                                    style: Theme.of(context).textTheme.bodyMedium,
                                    children: [
                                      TextSpan(
                                        text: fromName,
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      if (email.from?.email != null) ...[
                                        TextSpan(
                                          text: ' <${email.from!.email}>',
                                          style: TextStyle(
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onSurface
                                                .withValues(alpha: 0.5),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                              Text(
                                formattedDate,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withValues(alpha: 0.5),
                                    ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'to ${parseEmailAddresses(email.to).isNotEmpty ? parseEmailAddresses(email.to) : "me"}${email.cc != null && email.cc!.isNotEmpty ? ", cc: ${parseEmailAddresses(email.cc)}" : ""}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withValues(alpha: 0.5),
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Attachments
                if (email.attachments != null && email.attachments!.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.attach_file, size: 18),
                            const SizedBox(width: 4),
                            Text(
                              '${email.attachments!.length} attachment${email.attachments!.length > 1 ? "s" : ""}',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: email.attachments!.map((attachment) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.surface,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: Theme.of(context).dividerColor,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.attach_file, size: 16),
                                  const SizedBox(width: 4),
                                  ConstrainedBox(
                                    constraints: const BoxConstraints(maxWidth: 150),
                                    child: Text(
                                      attachment.filename,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '(${(attachment.size / 1024).round()}KB)',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurface
                                              .withValues(alpha: 0.5),
                                        ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                // Body - try HTML first, then plain text
                if (email.bodyHtml != null && email.bodyHtml!.isNotEmpty)
                  _buildHtmlBody(context, email.bodyHtml!)
                else if (email.bodyText != null && email.bodyText!.isNotEmpty)
                  SelectableText(
                    email.bodyText!,
                    style: Theme.of(context).textTheme.bodyMedium,
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'No email content available',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        // Quick reply
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: Theme.of(context).dividerColor,
              ),
            ),
          ),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: widget.onReply,
              icon: const Icon(Icons.reply),
              label: const Text('Reply'),
            ),
          ),
        ),
      ],
    );
  }
}

