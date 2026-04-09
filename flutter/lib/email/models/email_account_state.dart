import '../../api/services/email_api_service.dart';
import '../email_list_widget.dart' show parseEmailDate;

/// Sort mode for email priority
enum EmailPrioritySortMode {
  none,      // Default sorting by date
  highFirst, // Sort by priority score descending
  highOnly,  // Filter to show only high priority emails
}

/// Represents the state of a single email account (Gmail or SMTP/IMAP)
/// Each account has a unique ID that identifies it across the app
class EmailAccountState {
  /// Unique identifier for this account (usually the connection ID from backend)
  final String id;

  /// Provider type: 'gmail' or 'smtp_imap'
  final String provider;

  /// Connection details from the backend
  final EmailConnection? connection;

  /// Email labels/folders for this account
  final List<EmailLabel> labels;

  /// Current email list data
  final EmailListResponse? emailsData;

  /// Currently selected email for detail view
  final Email? selectedEmail;

  /// Current label/folder being viewed
  final String currentLabel;

  /// Loading state for email list
  final bool isLoadingEmails;

  /// Loading state for single email
  final bool isLoadingEmail;

  /// ID of the currently selected message
  final String? selectedMessageId;

  /// Current search input
  final String searchQuery;

  /// Active search filter applied
  final String activeSearch;

  /// Email priorities map (emailId -> priority)
  final Map<String, EmailPriority> emailPriorities;

  /// Loading state for priority analysis
  final bool isAnalyzingPriority;

  /// Current priority sort mode
  final EmailPrioritySortMode prioritySortMode;

  /// Loading state for fetching next page (pagination)
  final bool isFetchingNextPage;

  EmailAccountState({
    required this.id,
    required this.provider,
    this.connection,
    this.labels = const [],
    this.emailsData,
    this.selectedEmail,
    this.currentLabel = 'INBOX',
    this.isLoadingEmails = false,
    this.isLoadingEmail = false,
    this.selectedMessageId,
    this.searchQuery = '',
    this.activeSearch = '',
    this.emailPriorities = const {},
    this.isAnalyzingPriority = false,
    this.prioritySortMode = EmailPrioritySortMode.none,
    this.isFetchingNextPage = false,
  });

  /// Whether this account is connected
  bool get isConnected => connection != null;

  /// Display name for the account
  String get displayName => connection?.displayName ?? connection?.emailAddress ?? provider;

  /// Email address for the account
  String get emailAddress => connection?.emailAddress ?? '';

  /// Profile picture URL (only for Gmail)
  String? get profilePicture => connection?.profilePicture;

  /// Whether this is a Gmail account
  bool get isGmail => provider == 'gmail';

  /// Whether this is an SMTP/IMAP account
  bool get isSmtpImap => provider == 'smtp_imap';

  /// Whether there are more emails to load (pagination)
  bool get hasNextPage => emailsData?.nextPageToken != null && emailsData!.nextPageToken!.isNotEmpty;

  /// Factory constructor to create a new account from a connection
  factory EmailAccountState.fromConnection(EmailConnection connection) {
    return EmailAccountState(
      id: connection.id,
      provider: connection.provider,
      connection: connection,
    );
  }

  /// Get priority for a specific email
  EmailPriority? getPriorityForEmail(String emailId) {
    return emailPriorities[emailId];
  }

  /// Check if any priorities have been analyzed
  bool get hasPriorities => emailPriorities.isNotEmpty;

  /// Get count of high priority emails
  int get highPriorityCount {
    return emailPriorities.values
        .where((p) => p.level == EmailPriorityLevel.high)
        .length;
  }

  /// Get emails sorted/filtered by current priority mode
  /// Default sorting is by date (newest first)
  List<EmailListItem> get sortedEmails {
    final emails = emailsData?.emails ?? [];
    if (emails.isEmpty) {
      return emails;
    }

    switch (prioritySortMode) {
      case EmailPrioritySortMode.none:
        // Sort by date (newest first) as default
        final sorted = List<EmailListItem>.from(emails);
        sorted.sort((a, b) {
          final dateA = parseEmailDate(a.date) ?? DateTime(1970);
          final dateB = parseEmailDate(b.date) ?? DateTime(1970);
          return dateB.compareTo(dateA); // Descending order (newest first)
        });
        return sorted;

      case EmailPrioritySortMode.highFirst:
        final sorted = List<EmailListItem>.from(emails);
        sorted.sort((a, b) {
          final priorityA = emailPriorities[a.id]?.score ?? 0;
          final priorityB = emailPriorities[b.id]?.score ?? 0;
          final priorityComparison = priorityB.compareTo(priorityA); // Descending order
          if (priorityComparison != 0) return priorityComparison;
          // Secondary sort by date (newest first) when priorities are equal
          final dateA = parseEmailDate(a.date) ?? DateTime(1970);
          final dateB = parseEmailDate(b.date) ?? DateTime(1970);
          return dateB.compareTo(dateA);
        });
        return sorted;

      case EmailPrioritySortMode.highOnly:
        final filtered = emails.where((email) {
          final priority = emailPriorities[email.id];
          return priority != null && priority.level == EmailPriorityLevel.high;
        }).toList();
        // Sort filtered emails by date (newest first)
        filtered.sort((a, b) {
          final dateA = parseEmailDate(a.date) ?? DateTime(1970);
          final dateB = parseEmailDate(b.date) ?? DateTime(1970);
          return dateB.compareTo(dateA);
        });
        return filtered;
    }
  }

  /// Create a copy with updated values
  EmailAccountState copyWith({
    String? id,
    String? provider,
    EmailConnection? connection,
    List<EmailLabel>? labels,
    EmailListResponse? emailsData,
    Email? selectedEmail,
    String? currentLabel,
    bool? isLoadingEmails,
    bool? isLoadingEmail,
    String? selectedMessageId,
    String? searchQuery,
    String? activeSearch,
    Map<String, EmailPriority>? emailPriorities,
    bool? isAnalyzingPriority,
    EmailPrioritySortMode? prioritySortMode,
    bool? isFetchingNextPage,
    bool clearSelectedEmail = false,
    bool clearSelectedMessageId = false,
    bool clearConnection = false,
    bool clearPriorities = false,
  }) {
    return EmailAccountState(
      id: id ?? this.id,
      provider: provider ?? this.provider,
      connection: clearConnection ? null : (connection ?? this.connection),
      labels: labels ?? this.labels,
      emailsData: emailsData ?? this.emailsData,
      selectedEmail: clearSelectedEmail ? null : (selectedEmail ?? this.selectedEmail),
      currentLabel: currentLabel ?? this.currentLabel,
      isLoadingEmails: isLoadingEmails ?? this.isLoadingEmails,
      isLoadingEmail: isLoadingEmail ?? this.isLoadingEmail,
      selectedMessageId: clearSelectedMessageId ? null : (selectedMessageId ?? this.selectedMessageId),
      searchQuery: searchQuery ?? this.searchQuery,
      activeSearch: activeSearch ?? this.activeSearch,
      emailPriorities: clearPriorities ? {} : (emailPriorities ?? this.emailPriorities),
      isAnalyzingPriority: isAnalyzingPriority ?? this.isAnalyzingPriority,
      prioritySortMode: prioritySortMode ?? this.prioritySortMode,
      isFetchingNextPage: isFetchingNextPage ?? this.isFetchingNextPage,
    );
  }

  /// Reset state when disconnecting
  EmailAccountState reset() {
    return EmailAccountState(
      id: id,
      provider: provider,
      connection: null,
      labels: [],
      emailsData: null,
      selectedEmail: null,
      currentLabel: 'INBOX',
      isLoadingEmails: false,
      isLoadingEmail: false,
      selectedMessageId: null,
      searchQuery: '',
      activeSearch: '',
      emailPriorities: {},
      isAnalyzingPriority: false,
      prioritySortMode: EmailPrioritySortMode.none,
      isFetchingNextPage: false,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmailAccountState &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}
