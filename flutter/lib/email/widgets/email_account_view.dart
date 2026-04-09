import 'package:flutter/material.dart';
import '../models/email_account_state.dart';
import '../email_list_widget.dart';
import '../email_detail_widget.dart';

/// Widget that displays email list or detail for a single account
class EmailAccountView extends StatelessWidget {
  final EmailAccountState account;
  final String workspaceId;
  final String? connectionId;
  final Function(String messageId) onSelectEmail;
  final VoidCallback onCloseDetail;
  final VoidCallback onRefresh;
  final VoidCallback onReply;
  final Function(String messageId, bool isStarred) onStar;
  final Function(String messageId) onDelete;
  final bool isAllMailMode;
  // Pagination callback - matching frontend infinite scroll
  final VoidCallback? onLoadMore;

  const EmailAccountView({
    super.key,
    required this.account,
    required this.workspaceId,
    this.connectionId,
    required this.onSelectEmail,
    required this.onCloseDetail,
    required this.onRefresh,
    required this.onReply,
    required this.onStar,
    required this.onDelete,
    this.isAllMailMode = false,
    this.onLoadMore,
  });

  @override
  Widget build(BuildContext context) {
    // Show email detail if a message is selected
    if (account.selectedMessageId != null) {
      return EmailDetailWidget(
        email: account.selectedEmail,
        isLoading: account.isLoadingEmail,
        onClose: onCloseDetail,
        onReply: onReply,
        onStar: () {
          if (account.selectedEmail != null) {
            onStar(account.selectedEmail!.id, account.selectedEmail!.isStarred);
          }
        },
        onDelete: () {
          if (account.selectedEmail != null) {
            onDelete(account.selectedEmail!.id);
          }
        },
        workspaceId: workspaceId,
        connectionId: connectionId,
      );
    }

    // Show email list with priority data
    // Use sortedEmails which applies priority-based sorting/filtering
    return EmailListWidget(
      emails: account.sortedEmails,
      isLoading: account.isLoadingEmails,
      selectedId: account.selectedMessageId,
      onSelectEmail: onSelectEmail,
      onRefresh: onRefresh,
      emailPriorities: account.emailPriorities,
      // Pagination props - matching frontend infinite scroll
      hasNextPage: account.hasNextPage,
      isFetchingNextPage: account.isFetchingNextPage,
      onLoadMore: onLoadMore,
    );
  }
}
