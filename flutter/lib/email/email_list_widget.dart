import 'dart:io';
import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../api/services/email_api_service.dart';
import 'widgets/email_priority_indicator.dart';

/// Parse email date string which can be in various formats:
/// - RFC 2822: "Tue, 23 Dec 2025 08:11:27 GMT"
/// - ISO 8601: "2025-12-23T08:11:27.000Z"
DateTime? parseEmailDate(String? dateString) {
  if (dateString == null || dateString.isEmpty) return null;

  try {
    // Try ISO 8601 first (most common in APIs)
    return DateTime.parse(dateString);
  } catch (_) {
    try {
      // Try RFC 2822 format (used by Gmail)
      return HttpDate.parse(dateString);
    } catch (_) {
      // Try parsing with intl package format or other common formats
      try {
        // Handle format like "23 Dec 2025 08:11:27"
        final cleanedDate = dateString
            .replaceAll(RegExp(r'^[A-Za-z]+,\s*'), '') // Remove day name
            .replaceAll(' GMT', '')
            .replaceAll(' UTC', '')
            .trim();

        // Parse manually
        final parts = cleanedDate.split(' ');
        if (parts.length >= 4) {
          final day = int.parse(parts[0]);
          final month = _parseMonth(parts[1]);
          final year = int.parse(parts[2]);
          final timeParts = parts[3].split(':');
          final hour = int.parse(timeParts[0]);
          final minute = int.parse(timeParts[1]);
          final second = timeParts.length > 2 ? int.parse(timeParts[2]) : 0;

          return DateTime.utc(year, month, day, hour, minute, second);
        }
      } catch (_) {}
    }
  }
  return null;
}

int _parseMonth(String month) {
  const months = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
    'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
    'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
  };
  return months[month] ?? 1;
}

class EmailListWidget extends StatefulWidget {
  final List<EmailListItem> emails;
  final bool isLoading;
  final String? selectedId;
  final Function(String) onSelectEmail;
  final VoidCallback onRefresh;
  final Map<String, EmailPriority> emailPriorities;
  // Pagination props - matching frontend EmailList.tsx
  final bool hasNextPage;
  final bool isFetchingNextPage;
  final VoidCallback? onLoadMore;

  const EmailListWidget({
    super.key,
    required this.emails,
    required this.isLoading,
    this.selectedId,
    required this.onSelectEmail,
    required this.onRefresh,
    this.emailPriorities = const {},
    this.hasNextPage = false,
    this.isFetchingNextPage = false,
    this.onLoadMore,
  });

  @override
  State<EmailListWidget> createState() => _EmailListWidgetState();
}

class _EmailListWidgetState extends State<EmailListWidget> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  /// Load more when user scrolls to within 200px of the bottom
  /// Matching frontend behavior in EmailList.tsx
  void _onScroll() {
    if (!widget.hasNextPage || widget.isFetchingNextPage || widget.onLoadMore == null) {
      return;
    }

    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;

    // Load more when within 200px of the bottom
    if (maxScroll - currentScroll < 200) {
      widget.onLoadMore!();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading && widget.emails.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (widget.emails.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'No emails found',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
            ),
          ],
        ),
      );
    }

    // Calculate item count: emails + loading indicator or end indicator
    final showBottomIndicator = widget.isFetchingNextPage || (!widget.hasNextPage && widget.emails.isNotEmpty);
    final itemCount = widget.emails.length + (showBottomIndicator ? 1 : 0);

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: ListView.separated(
        controller: _scrollController,
        itemCount: itemCount,
        separatorBuilder: (context, index) {
          // No separator for the last item (loading/end indicator)
          if (index >= widget.emails.length - 1) {
            return const SizedBox.shrink();
          }
          return const Divider(height: 1);
        },
        itemBuilder: (context, index) {
          // Bottom indicator (loading or "no more emails")
          if (index >= widget.emails.length) {
            if (widget.isFetchingNextPage) {
              // Loading indicator at bottom - matching frontend
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Loading more...',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                    ),
                  ],
                ),
              );
            } else {
              // End of list indicator - matching frontend
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'No more emails',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                ),
              );
            }
          }

          final email = widget.emails[index];
          return EmailListItemWidget(
            email: email,
            isSelected: email.id == widget.selectedId,
            onTap: () => widget.onSelectEmail(email.id),
            priority: widget.emailPriorities[email.id],
          );
        },
      ),
    );
  }
}

class EmailListItemWidget extends StatelessWidget {
  final EmailListItem email;
  final bool isSelected;
  final VoidCallback onTap;
  final EmailPriority? priority;

  const EmailListItemWidget({
    super.key,
    required this.email,
    required this.isSelected,
    required this.onTap,
    this.priority,
  });

  @override
  Widget build(BuildContext context) {
    final fromName = email.from?.name ?? email.from?.email ?? 'Unknown';
    final parsedDate = parseEmailDate(email.date);
    final formattedDate = parsedDate != null
        ? timeago.format(parsedDate)
        : '';

    // Get priority border color if priority is set
    final priorityBorderColor = getEmailPriorityBorderColor(priority);

    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3)
              : !email.isRead
                  ? Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.1)
                  : null,
          border: Border(
            left: BorderSide(
              color: isSelected
                  ? Theme.of(context).colorScheme.primary
                  : priorityBorderColor ?? Colors.transparent,
              width: isSelected || priorityBorderColor != null ? 3 : 0,
            ),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Star indicator
            Icon(
              email.isStarred ? Icons.star : Icons.star_outline,
              size: 20,
              color: email.isStarred
                  ? Colors.amber
                  : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Sender, priority, and date
                  Row(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(
                                fromName,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: !email.isRead ? FontWeight.w600 : FontWeight.normal,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            // Priority indicator
                            if (priority != null && priority!.level != EmailPriorityLevel.none) ...[
                              const SizedBox(width: 6),
                              EmailPriorityIndicator(
                                priority: priority!,
                                iconSize: 14,
                              ),
                            ],
                          ],
                        ),
                      ),
                      Text(
                        formattedDate,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Subject
                  Text(
                    email.subject ?? '(no subject)',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: !email.isRead ? FontWeight.w500 : FontWeight.normal,
                      color: !email.isRead
                          ? Theme.of(context).colorScheme.onSurface
                          : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  // Snippet
                  Text(
                    email.snippet,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  // Attachment indicator
                  if (email.hasAttachments) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.attach_file,
                          size: 14,
                          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
