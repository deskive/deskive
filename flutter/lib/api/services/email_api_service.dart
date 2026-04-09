import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;
import '../base_api_client.dart';

// ==================== Types ====================

class EmailConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String provider;
  final String emailAddress;
  final String? displayName;
  final String? profilePicture;
  final bool isActive;
  final String? lastSyncedAt;
  final String createdAt;

  EmailConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    required this.provider,
    required this.emailAddress,
    this.displayName,
    this.profilePicture,
    required this.isActive,
    this.lastSyncedAt,
    required this.createdAt,
  });

  factory EmailConnection.fromJson(Map<String, dynamic> json) {
    return EmailConnection(
      id: json['id'] ?? '',
      workspaceId: json['workspaceId'] ?? json['workspace_id'] ?? '',
      userId: json['userId'] ?? json['user_id'] ?? '',
      provider: json['provider'] ?? '',
      emailAddress: json['emailAddress'] ?? json['email_address'] ?? '',
      displayName: json['displayName'] ?? json['display_name'],
      profilePicture: json['profilePicture'] ?? json['profile_picture'],
      isActive: json['isActive'] ?? json['is_active'] ?? false,
      lastSyncedAt: json['lastSyncedAt'] ?? json['last_synced_at'],
      createdAt: json['createdAt'] ?? json['created_at'] ?? '',
    );
  }
}

/// Connection settings for email notifications and auto-create events
/// Matching frontend: ConnectionSettings interface
class EmailConnectionSettings {
  final bool notificationsEnabled;
  final bool autoCreateEvents;

  EmailConnectionSettings({
    required this.notificationsEnabled,
    required this.autoCreateEvents,
  });

  factory EmailConnectionSettings.fromJson(Map<String, dynamic> json) {
    return EmailConnectionSettings(
      notificationsEnabled: json['notificationsEnabled'] ?? json['notifications_enabled'] ?? false,
      autoCreateEvents: json['autoCreateEvents'] ?? json['auto_create_events'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'notificationsEnabled': notificationsEnabled,
      'autoCreateEvents': autoCreateEvents,
    };
  }

  EmailConnectionSettings copyWith({
    bool? notificationsEnabled,
    bool? autoCreateEvents,
  }) {
    return EmailConnectionSettings(
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      autoCreateEvents: autoCreateEvents ?? this.autoCreateEvents,
    );
  }
}

/// Request to update connection settings
class UpdateEmailConnectionSettings {
  final bool? notificationsEnabled;
  final bool? autoCreateEvents;

  UpdateEmailConnectionSettings({
    this.notificationsEnabled,
    this.autoCreateEvents,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (notificationsEnabled != null) map['notificationsEnabled'] = notificationsEnabled;
    if (autoCreateEvents != null) map['autoCreateEvents'] = autoCreateEvents;
    return map;
  }
}

class EmailAddress {
  final String email;
  final String? name;

  EmailAddress({
    required this.email,
    this.name,
  });

  factory EmailAddress.fromJson(Map<String, dynamic> json) {
    return EmailAddress(
      email: json['email'] ?? '',
      name: json['name'],
    );
  }

  String get formatted {
    return name != null ? '$name <$email>' : email;
  }
}

class EmailAttachment {
  final String attachmentId;
  final String filename;
  final String mimeType;
  final int size;

  EmailAttachment({
    required this.attachmentId,
    required this.filename,
    required this.mimeType,
    required this.size,
  });

  factory EmailAttachment.fromJson(Map<String, dynamic> json) {
    return EmailAttachment(
      attachmentId: json['attachmentId'] ?? json['attachment_id'] ?? '',
      filename: json['filename'] ?? '',
      mimeType: json['mimeType'] ?? json['mime_type'] ?? '',
      size: json['size'] ?? 0,
    );
  }
}

class Email {
  final String id;
  final String threadId;
  final List<String> labelIds;
  final String snippet;
  final EmailAddress? from;
  final List<EmailAddress>? to;
  final List<EmailAddress>? cc;
  final List<EmailAddress>? bcc;
  final String? subject;
  final String? bodyText;
  final String? bodyHtml;
  final String? date;
  final String internalDate;
  final bool isRead;
  final bool isStarred;
  final List<EmailAttachment>? attachments;

  Email({
    required this.id,
    required this.threadId,
    required this.labelIds,
    required this.snippet,
    this.from,
    this.to,
    this.cc,
    this.bcc,
    this.subject,
    this.bodyText,
    this.bodyHtml,
    this.date,
    required this.internalDate,
    required this.isRead,
    required this.isStarred,
    this.attachments,
  });

  factory Email.fromJson(Map<String, dynamic> json) {
    return Email(
      id: json['id'] ?? '',
      threadId: json['threadId'] ?? json['thread_id'] ?? '',
      labelIds: (json['labelIds'] ?? json['label_ids'] ?? []).cast<String>(),
      snippet: json['snippet'] ?? '',
      from: json['from'] != null ? EmailAddress.fromJson(json['from']) : null,
      to: json['to'] != null
          ? (json['to'] as List).map((e) => EmailAddress.fromJson(e)).toList()
          : null,
      cc: json['cc'] != null
          ? (json['cc'] as List).map((e) => EmailAddress.fromJson(e)).toList()
          : null,
      bcc: json['bcc'] != null
          ? (json['bcc'] as List).map((e) => EmailAddress.fromJson(e)).toList()
          : null,
      subject: json['subject'],
      bodyText: json['bodyText'] ?? json['body_text'],
      bodyHtml: json['bodyHtml'] ?? json['body_html'],
      date: json['date'],
      internalDate: json['internalDate'] ?? json['internal_date'] ?? '',
      isRead: json['isRead'] ?? json['is_read'] ?? false,
      isStarred: json['isStarred'] ?? json['is_starred'] ?? false,
      attachments: json['attachments'] != null
          ? (json['attachments'] as List)
              .map((e) => EmailAttachment.fromJson(e))
              .toList()
          : null,
    );
  }
}

class EmailListItem {
  final String id;
  final String threadId;
  final List<String> labelIds;
  final String snippet;
  final EmailAddress? from;
  final String? subject;
  final String? date;
  final bool isRead;
  final bool isStarred;
  final bool hasAttachments;

  EmailListItem({
    required this.id,
    required this.threadId,
    required this.labelIds,
    required this.snippet,
    this.from,
    this.subject,
    this.date,
    required this.isRead,
    required this.isStarred,
    required this.hasAttachments,
  });

  factory EmailListItem.fromJson(Map<String, dynamic> json) {
    return EmailListItem(
      id: json['id'] ?? '',
      threadId: json['threadId'] ?? json['thread_id'] ?? '',
      labelIds: (json['labelIds'] ?? json['label_ids'] ?? []).cast<String>(),
      snippet: json['snippet'] ?? '',
      from: json['from'] != null ? EmailAddress.fromJson(json['from']) : null,
      subject: json['subject'],
      date: json['date'],
      isRead: json['isRead'] ?? json['is_read'] ?? false,
      isStarred: json['isStarred'] ?? json['is_starred'] ?? false,
      hasAttachments: json['hasAttachments'] ?? json['has_attachments'] ?? false,
    );
  }
}

class EmailListResponse {
  final List<EmailListItem> emails;
  final String? nextPageToken;
  final int? resultSizeEstimate;

  EmailListResponse({
    required this.emails,
    this.nextPageToken,
    this.resultSizeEstimate,
  });

  factory EmailListResponse.fromJson(Map<String, dynamic> json) {
    return EmailListResponse(
      emails: (json['emails'] ?? [])
          .map<EmailListItem>((e) => EmailListItem.fromJson(e))
          .toList(),
      nextPageToken: json['nextPageToken'] ?? json['next_page_token'],
      resultSizeEstimate: json['resultSizeEstimate'] ?? json['result_size_estimate'],
    );
  }
}

class EmailLabel {
  final String id;
  final String name;
  final String? type;
  final int? messagesTotal;
  final int? messagesUnread;
  final Map<String, String>? color;

  EmailLabel({
    required this.id,
    required this.name,
    this.type,
    this.messagesTotal,
    this.messagesUnread,
    this.color,
  });

  factory EmailLabel.fromJson(Map<String, dynamic> json) {
    return EmailLabel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: json['type'],
      messagesTotal: json['messagesTotal'] ?? json['messages_total'],
      messagesUnread: json['messagesUnread'] ?? json['messages_unread'],
      color: json['color'] != null
          ? Map<String, String>.from(json['color'])
          : null,
    );
  }
}

/// Model for email attachment to be sent
class EmailAttachmentFile {
  final String? filePath; // Used on mobile
  final String fileName;
  final String? mimeType;
  final int? fileSize;
  final bool isFromGoogleDrive;
  final String? googleDriveFileId;
  final List<int>? fileBytes; // Used on web

  EmailAttachmentFile({
    this.filePath,
    required this.fileName,
    this.mimeType,
    this.fileSize,
    this.isFromGoogleDrive = false,
    this.googleDriveFileId,
    this.fileBytes,
  });

  /// Check if this attachment has valid data (either file path or bytes)
  bool get hasData => (filePath != null && filePath!.isNotEmpty) || (fileBytes != null && fileBytes!.isNotEmpty);
}

class SendEmailRequest {
  final List<String> to;
  final List<String>? cc;
  final List<String>? bcc;
  final String subject;
  final String body;
  final bool? isHtml;
  final List<EmailAttachmentFile>? attachments;

  SendEmailRequest({
    required this.to,
    this.cc,
    this.bcc,
    required this.subject,
    required this.body,
    this.isHtml,
    this.attachments,
  });

  Map<String, dynamic> toJson() => {
    'to': to,
    if (cc != null) 'cc': cc,
    if (bcc != null) 'bcc': bcc,
    'subject': subject,
    'body': body,
    if (isHtml != null) 'isHtml': isHtml,
  };
}

class ReplyEmailRequest {
  final String body;
  final bool? isHtml;
  final bool? replyAll;

  ReplyEmailRequest({
    required this.body,
    this.isHtml,
    this.replyAll,
  });

  Map<String, dynamic> toJson() => {
    'body': body,
    if (isHtml != null) 'isHtml': isHtml,
    if (replyAll != null) 'replyAll': replyAll,
  };
}

class CreateDraftRequest {
  final List<String>? to;
  final List<String>? cc;
  final List<String>? bcc;
  final String? subject;
  final String? body;
  final bool? isHtml;
  final String? threadId;
  final String? replyToMessageId;

  CreateDraftRequest({
    this.to,
    this.cc,
    this.bcc,
    this.subject,
    this.body,
    this.isHtml,
    this.threadId,
    this.replyToMessageId,
  });

  Map<String, dynamic> toJson() => {
    if (to != null) 'to': to,
    if (cc != null) 'cc': cc,
    if (bcc != null) 'bcc': bcc,
    if (subject != null) 'subject': subject,
    if (body != null) 'body': body,
    if (isHtml != null) 'isHtml': isHtml,
    if (threadId != null) 'threadId': threadId,
    if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
  };
}

class SendEmailResponse {
  final String messageId;
  final String threadId;
  final List<String> labelIds;

  SendEmailResponse({
    required this.messageId,
    required this.threadId,
    required this.labelIds,
  });

  factory SendEmailResponse.fromJson(Map<String, dynamic> json) {
    return SendEmailResponse(
      messageId: json['messageId'] ?? json['message_id'] ?? '',
      threadId: json['threadId'] ?? json['thread_id'] ?? '',
      labelIds: (json['labelIds'] ?? json['label_ids'] ?? []).cast<String>(),
    );
  }
}

class DraftResponse {
  final String draftId;
  final String messageId;
  final String? threadId;

  DraftResponse({
    required this.draftId,
    required this.messageId,
    this.threadId,
  });

  factory DraftResponse.fromJson(Map<String, dynamic> json) {
    return DraftResponse(
      draftId: json['draftId'] ?? json['draft_id'] ?? '',
      messageId: json['messageId'] ?? json['message_id'] ?? '',
      threadId: json['threadId'] ?? json['thread_id'],
    );
  }
}

// ==================== SMTP/IMAP Types ====================

class SmtpConfig {
  final String host;
  final int port;
  final bool? secure;
  final String user;
  final String password;

  SmtpConfig({
    required this.host,
    required this.port,
    this.secure,
    required this.user,
    required this.password,
  });

  Map<String, dynamic> toJson() => {
    'host': host,
    'port': port,
    if (secure != null) 'secure': secure,
    'user': user,
    'password': password,
  };
}

class ImapConfig {
  final String host;
  final int port;
  final bool? secure;
  final String user;
  final String password;

  ImapConfig({
    required this.host,
    required this.port,
    this.secure,
    required this.user,
    required this.password,
  });

  Map<String, dynamic> toJson() => {
    'host': host,
    'port': port,
    if (secure != null) 'secure': secure,
    'user': user,
    'password': password,
  };
}

class ConnectSmtpImapRequest {
  final String emailAddress;
  final String? displayName;
  final SmtpConfig smtp;
  final ImapConfig imap;

  ConnectSmtpImapRequest({
    required this.emailAddress,
    this.displayName,
    required this.smtp,
    required this.imap,
  });

  Map<String, dynamic> toJson() => {
    'emailAddress': emailAddress,
    if (displayName != null) 'displayName': displayName,
    'smtp': smtp.toJson(),
    'imap': imap.toJson(),
  };
}

class TestSmtpImapRequest {
  final SmtpConfig smtp;
  final ImapConfig imap;

  TestSmtpImapRequest({
    required this.smtp,
    required this.imap,
  });

  Map<String, dynamic> toJson() => {
    'smtp': smtp.toJson(),
    'imap': imap.toJson(),
  };
}

class TestConnectionResult {
  final bool success;
  final SmtpTestResult smtp;
  final ImapTestResult imap;

  TestConnectionResult({
    required this.success,
    required this.smtp,
    required this.imap,
  });

  factory TestConnectionResult.fromJson(Map<String, dynamic> json) {
    return TestConnectionResult(
      success: json['success'] ?? false,
      smtp: SmtpTestResult.fromJson(json['smtp'] ?? {}),
      imap: ImapTestResult.fromJson(json['imap'] ?? {}),
    );
  }
}

class SmtpTestResult {
  final bool success;
  final String message;

  SmtpTestResult({
    required this.success,
    required this.message,
  });

  factory SmtpTestResult.fromJson(Map<String, dynamic> json) {
    return SmtpTestResult(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
    );
  }
}

class ImapTestResult {
  final bool success;
  final String message;

  ImapTestResult({
    required this.success,
    required this.message,
  });

  factory ImapTestResult.fromJson(Map<String, dynamic> json) {
    return ImapTestResult(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
    );
  }
}

class AllConnectionsResponse {
  /// First Gmail connection (for backwards compatibility)
  final EmailConnection? gmail;

  /// First SMTP/IMAP connection (for backwards compatibility)
  final EmailConnection? smtpImap;

  /// All Gmail accounts
  final List<EmailConnection> gmailAccounts;

  /// All SMTP/IMAP accounts
  final List<EmailConnection> smtpImapAccounts;

  /// All accounts combined
  final List<EmailConnection> allAccounts;

  AllConnectionsResponse({
    this.gmail,
    this.smtpImap,
    this.gmailAccounts = const [],
    this.smtpImapAccounts = const [],
    this.allAccounts = const [],
  });

  factory AllConnectionsResponse.fromJson(Map<String, dynamic> json) {
    // Parse all accounts array
    final allAccountsList = json['allAccounts'] != null
        ? (json['allAccounts'] as List)
            .map((e) => EmailConnection.fromJson(e))
            .toList()
        : <EmailConnection>[];

    // Parse gmail accounts array
    final gmailAccountsList = json['gmailAccounts'] != null
        ? (json['gmailAccounts'] as List)
            .map((e) => EmailConnection.fromJson(e))
            .toList()
        : <EmailConnection>[];

    // Parse smtp/imap accounts array
    final smtpImapAccountsList = json['smtpImapAccounts'] != null
        ? (json['smtpImapAccounts'] as List)
            .map((e) => EmailConnection.fromJson(e))
            .toList()
        : <EmailConnection>[];

    return AllConnectionsResponse(
      gmail: json['gmail'] != null ? EmailConnection.fromJson(json['gmail']) : null,
      smtpImap: json['smtpImap'] != null ? EmailConnection.fromJson(json['smtpImap']) : null,
      gmailAccounts: gmailAccountsList,
      smtpImapAccounts: smtpImapAccountsList,
      allAccounts: allAccountsList,
    );
  }

  bool get hasAnyConnection => gmail != null || smtpImap != null || allAccounts.isNotEmpty;

  int get totalAccountCount => allAccounts.length;

  String? get activeProvider {
    if (smtpImap != null) return 'smtp_imap';
    if (gmail != null) return 'gmail';
    return null;
  }
}

/// Email provider presets for SMTP/IMAP configuration
class EmailProviderPreset {
  final String name;
  final String smtpHost;
  final int smtpPort;
  final bool smtpSecure;
  final String imapHost;
  final int imapPort;
  final bool imapSecure;

  const EmailProviderPreset({
    required this.name,
    required this.smtpHost,
    required this.smtpPort,
    required this.smtpSecure,
    required this.imapHost,
    required this.imapPort,
    required this.imapSecure,
  });

  static const gmail = EmailProviderPreset(
    name: 'Gmail',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSecure: true,
  );

  static const outlook = EmailProviderPreset(
    name: 'Outlook',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: false,
    imapHost: 'imap.outlook.com',
    imapPort: 993,
    imapSecure: true,
  );

  static const yahoo = EmailProviderPreset(
    name: 'Yahoo',
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
    smtpSecure: false,
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    imapSecure: true,
  );

  static const List<EmailProviderPreset> presets = [gmail, outlook, yahoo];
}

// ==================== Email Priority Types ====================

/// Priority level for emails
enum EmailPriorityLevel {
  high,
  medium,
  low,
  none;

  static EmailPriorityLevel fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'high':
        return EmailPriorityLevel.high;
      case 'medium':
        return EmailPriorityLevel.medium;
      case 'low':
        return EmailPriorityLevel.low;
      default:
        return EmailPriorityLevel.none;
    }
  }

  String get displayName {
    switch (this) {
      case EmailPriorityLevel.high:
        return 'High';
      case EmailPriorityLevel.medium:
        return 'Medium';
      case EmailPriorityLevel.low:
        return 'Low';
      case EmailPriorityLevel.none:
        return 'None';
    }
  }
}

/// Priority information for an email
class EmailPriority {
  final EmailPriorityLevel level;
  final int score; // 0-10 scale
  final String reason;
  final List<String> factors;

  EmailPriority({
    required this.level,
    required this.score,
    required this.reason,
    required this.factors,
  });

  factory EmailPriority.fromJson(Map<String, dynamic> json) {
    return EmailPriority(
      level: EmailPriorityLevel.fromString(json['level'] as String?),
      score: (json['score'] as num?)?.toInt() ?? 0,
      reason: json['reason'] as String? ?? '',
      factors: (json['factors'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  /// Default priority (none)
  factory EmailPriority.none() {
    return EmailPriority(
      level: EmailPriorityLevel.none,
      score: 0,
      reason: 'Not analyzed',
      factors: [],
    );
  }
}

/// Request item for priority analysis
class EmailPriorityRequestItem {
  final String id;
  final EmailAddress? from;
  final String? subject;
  final String snippet;
  final String? date;
  final bool isRead;
  final bool hasAttachments;

  EmailPriorityRequestItem({
    required this.id,
    this.from,
    this.subject,
    required this.snippet,
    this.date,
    required this.isRead,
    required this.hasAttachments,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        if (from != null)
          'from': {
            'email': from!.email,
            if (from!.name != null) 'name': from!.name,
          },
        if (subject != null) 'subject': subject,
        'snippet': snippet,
        if (date != null) 'date': date,
        'isRead': isRead,
        'hasAttachments': hasAttachments,
      };

  /// Create from EmailListItem
  factory EmailPriorityRequestItem.fromEmailListItem(EmailListItem email) {
    return EmailPriorityRequestItem(
      id: email.id,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      date: email.date,
      isRead: email.isRead,
      hasAttachments: email.hasAttachments,
    );
  }
}

/// Request for priority analysis
class EmailPriorityRequest {
  final List<EmailPriorityRequestItem> emails;
  final String? connectionId;

  EmailPriorityRequest({required this.emails, this.connectionId});

  Map<String, dynamic> toJson() => {
        'emails': emails.map((e) => e.toJson()).toList(),
        if (connectionId != null) 'connectionId': connectionId,
      };
}

/// Request to get stored priorities
class GetStoredPrioritiesRequest {
  final List<String> emailIds;

  GetStoredPrioritiesRequest({required this.emailIds});

  Map<String, dynamic> toJson() => {
        'emailIds': emailIds,
      };
}

/// Single priority result
class EmailPriorityResult {
  final String emailId;
  final EmailPriority priority;

  EmailPriorityResult({
    required this.emailId,
    required this.priority,
  });

  factory EmailPriorityResult.fromJson(Map<String, dynamic> json) {
    return EmailPriorityResult(
      emailId: json['emailId'] as String? ?? '',
      priority: EmailPriority.fromJson(
          json['priority'] as Map<String, dynamic>? ?? {}),
    );
  }
}

/// Response from priority analysis
class EmailPriorityResponse {
  final List<EmailPriorityResult> priorities;

  EmailPriorityResponse({required this.priorities});

  factory EmailPriorityResponse.fromJson(Map<String, dynamic> json) {
    return EmailPriorityResponse(
      priorities: (json['priorities'] as List<dynamic>?)
              ?.map((e) => EmailPriorityResult.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  /// Convert to a map for easy lookup by emailId
  Map<String, EmailPriority> toMap() {
    return {for (var p in priorities) p.emailId: p.priority};
  }
}

// ==================== Travel Ticket Types ====================

/// Type of travel/transportation
enum TravelType {
  flight,
  train,
  bus,
  other;

  static TravelType fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'flight':
        return TravelType.flight;
      case 'train':
        return TravelType.train;
      case 'bus':
        return TravelType.bus;
      default:
        return TravelType.other;
    }
  }

  String get displayName {
    switch (this) {
      case TravelType.flight:
        return 'Flight';
      case TravelType.train:
        return 'Train';
      case TravelType.bus:
        return 'Bus';
      case TravelType.other:
        return 'Travel';
    }
  }

  String get icon {
    switch (this) {
      case TravelType.flight:
        return 'flight';
      case TravelType.train:
        return 'train';
      case TravelType.bus:
        return 'directions_bus';
      case TravelType.other:
        return 'commute';
    }
  }
}

/// Travel ticket information extracted from email
class TravelTicketInfo {
  final TravelType travelType;
  final bool found;
  final String? bookingReference;
  final String? passengerName;
  final String? departureLocation;
  final String? arrivalLocation;
  final String? departureDateTime;
  final String? arrivalDateTime;
  final String? departureTimezone;
  final String? vehicleNumber;
  final String? seatInfo;
  final String? carrier;
  final String? notes;

  TravelTicketInfo({
    required this.travelType,
    required this.found,
    this.bookingReference,
    this.passengerName,
    this.departureLocation,
    this.arrivalLocation,
    this.departureDateTime,
    this.arrivalDateTime,
    this.departureTimezone,
    this.vehicleNumber,
    this.seatInfo,
    this.carrier,
    this.notes,
  });

  factory TravelTicketInfo.fromJson(Map<String, dynamic> json) {
    return TravelTicketInfo(
      travelType: TravelType.fromString(json['travelType'] as String?),
      found: json['found'] as bool? ?? false,
      bookingReference: json['bookingReference'] as String?,
      passengerName: json['passengerName'] as String?,
      departureLocation: json['departureLocation'] as String?,
      arrivalLocation: json['arrivalLocation'] as String?,
      departureDateTime: json['departureDateTime'] as String?,
      arrivalDateTime: json['arrivalDateTime'] as String?,
      departureTimezone: json['departureTimezone'] as String?,
      vehicleNumber: json['vehicleNumber'] as String?,
      seatInfo: json['seatInfo'] as String?,
      carrier: json['carrier'] as String?,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'travelType': travelType.name,
    'found': found,
    if (bookingReference != null) 'bookingReference': bookingReference,
    if (passengerName != null) 'passengerName': passengerName,
    if (departureLocation != null) 'departureLocation': departureLocation,
    if (arrivalLocation != null) 'arrivalLocation': arrivalLocation,
    if (departureDateTime != null) 'departureDateTime': departureDateTime,
    if (arrivalDateTime != null) 'arrivalDateTime': arrivalDateTime,
    if (departureTimezone != null) 'departureTimezone': departureTimezone,
    if (vehicleNumber != null) 'vehicleNumber': vehicleNumber,
    if (seatInfo != null) 'seatInfo': seatInfo,
    if (carrier != null) 'carrier': carrier,
    if (notes != null) 'notes': notes,
  };
}

/// Request to extract travel info from email
class ExtractTravelInfoRequest {
  final String subject;
  final String body;
  final String? senderEmail;
  final String? messageId;
  final String? attachmentId;
  final String? provider;
  final String? connectionId;
  final String? mailbox;

  ExtractTravelInfoRequest({
    required this.subject,
    required this.body,
    this.senderEmail,
    this.messageId,
    this.attachmentId,
    this.provider,
    this.connectionId,
    this.mailbox,
  });

  Map<String, dynamic> toJson() => {
    'subject': subject,
    'body': body,
    if (senderEmail != null) 'senderEmail': senderEmail,
    if (messageId != null) 'messageId': messageId,
    if (attachmentId != null) 'attachmentId': attachmentId,
    if (provider != null) 'provider': provider,
    if (connectionId != null) 'connectionId': connectionId,
    if (mailbox != null) 'mailbox': mailbox,
  };
}

/// Response from travel info extraction
class ExtractTravelInfoResponse {
  final TravelTicketInfo ticketInfo;
  final String suggestedTitle;
  final String suggestedDescription;

  ExtractTravelInfoResponse({
    required this.ticketInfo,
    required this.suggestedTitle,
    required this.suggestedDescription,
  });

  factory ExtractTravelInfoResponse.fromJson(Map<String, dynamic> json) {
    return ExtractTravelInfoResponse(
      ticketInfo: TravelTicketInfo.fromJson(json['ticketInfo'] as Map<String, dynamic>? ?? {}),
      suggestedTitle: json['suggestedTitle'] as String? ?? '',
      suggestedDescription: json['suggestedDescription'] as String? ?? '',
    );
  }
}

// ==================== System Labels ====================

class SystemLabels {
  static const String inbox = 'INBOX';
  static const String sent = 'SENT';
  static const String draft = 'DRAFT';
  static const String starred = 'STARRED';
  static const String trash = 'TRASH';
  static const String spam = 'SPAM';
  static const String important = 'IMPORTANT';
  static const String unread = 'UNREAD';
}

// ==================== Utility Functions ====================

String getLabelDisplayName(String labelId) {
  const displayNames = {
    'INBOX': 'Inbox',
    'SENT': 'Sent',
    'DRAFT': 'Drafts',
    'STARRED': 'Starred',
    'TRASH': 'Trash',
    'SPAM': 'Spam',
    'IMPORTANT': 'Important',
    'CATEGORY_PERSONAL': 'Personal',
    'CATEGORY_SOCIAL': 'Social',
    'CATEGORY_PROMOTIONS': 'Promotions',
    'CATEGORY_UPDATES': 'Updates',
    'CATEGORY_FORUMS': 'Forums',
  };
  return displayNames[labelId] ?? labelId;
}

String formatEmailAddress(EmailAddress? address) {
  if (address == null) return '';
  return address.name != null ? '${address.name} <${address.email}>' : address.email;
}

String parseEmailAddresses(List<EmailAddress>? addresses) {
  if (addresses == null || addresses.isEmpty) return '';
  return addresses.map((a) => formatEmailAddress(a)).join(', ');
}

// ==================== API Service ====================

class EmailApiService {
  final BaseApiClient _apiClient;

  EmailApiService({BaseApiClient? apiClient})
      : _apiClient = apiClient ?? BaseApiClient.instance;

  // ==================== Connection ====================

  /// Get OAuth URL for Gmail connection
  Future<ApiResponse<String>> getAuthUrl(String workspaceId, String? returnUrl) async {
    try {
      final params = returnUrl != null ? '?returnUrl=${Uri.encodeComponent(returnUrl)}' : '';
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/auth/url$params',
      );

      final data = response.data;
      return ApiResponse.success(
        data['authorizationUrl'] ?? data['authorization_url'] ?? '',
        message: 'Auth URL retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get auth URL',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get email connection status
  Future<ApiResponse<Map<String, dynamic>>> getConnection(String workspaceId) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/connection',
      );

      return ApiResponse.success(
        response.data as Map<String, dynamic>,
        message: 'Connection retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get connection',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Disconnect email account (legacy - disconnects first Gmail connection)
  Future<ApiResponse<void>> disconnect(String workspaceId) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/email/connection',
      );

      return ApiResponse.success(
        null,
        message: 'Disconnected successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to disconnect',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Disconnect a specific email connection by ID
  /// This supports multi-account disconnect for Gmail accounts
  Future<ApiResponse<void>> disconnectById(String workspaceId, String connectionId) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/email/connections/$connectionId',
      );

      return ApiResponse.success(
        null,
        message: 'Disconnected successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to disconnect',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== Connection Settings ====================

  /// Get connection settings (notifications, auto-create events)
  /// Matching frontend: GET /workspaces/{workspaceId}/email/connections/{connectionId}/settings
  Future<ApiResponse<EmailConnectionSettings>> getConnectionSettings(
    String workspaceId,
    String connectionId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/connections/$connectionId/settings',
      );

      final data = response.data;
      // Handle wrapped response {data: {...}} or direct response
      final settingsData = data is Map && data.containsKey('data')
          ? data['data'] as Map<String, dynamic>
          : data as Map<String, dynamic>;

      return ApiResponse.success(
        EmailConnectionSettings.fromJson(settingsData),
        message: 'Settings retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get connection settings',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Update connection settings (notifications, auto-create events)
  /// Matching frontend: PATCH /workspaces/{workspaceId}/email/connections/{connectionId}/settings
  Future<ApiResponse<EmailConnectionSettings>> updateConnectionSettings(
    String workspaceId,
    String connectionId,
    UpdateEmailConnectionSettings settings,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/email/connections/$connectionId/settings',
        data: settings.toJson(),
      );

      final data = response.data;
      // Handle wrapped response {data: {...}} or direct response
      final settingsData = data is Map && data.containsKey('data')
          ? data['data'] as Map<String, dynamic>
          : data as Map<String, dynamic>;

      return ApiResponse.success(
        EmailConnectionSettings.fromJson(settingsData),
        message: 'Settings updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update connection settings',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== Messages ====================

  /// Get email messages
  Future<ApiResponse<EmailListResponse>> getMessages(
    String workspaceId, {
    String? labelId,
    String? query,
    String? pageToken,
    int? maxResults,
    String? connectionId,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (labelId != null) queryParameters['labelId'] = labelId;
      if (query != null) queryParameters['query'] = query;
      if (pageToken != null) queryParameters['pageToken'] = pageToken;
      if (maxResults != null) queryParameters['maxResults'] = maxResults;
      if (connectionId != null) queryParameters['connectionId'] = connectionId;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/messages',
        queryParameters: queryParameters,
      );

      final data = response.data;
      final emailData = data['data'] ?? data;

      return ApiResponse.success(
        EmailListResponse.fromJson(emailData),
        message: 'Messages retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get messages',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get a single email message
  Future<ApiResponse<Email>> getMessage(String workspaceId, String messageId, {String? connectionId}) async {
    try {
      debugPrint('📧 getMessage: Fetching message $messageId from workspace $workspaceId');
      final queryParameters = <String, dynamic>{};
      if (connectionId != null) queryParameters['connectionId'] = connectionId;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/messages/$messageId',
        queryParameters: queryParameters.isNotEmpty ? queryParameters : null,
      );

      final data = response.data;
      debugPrint('📧 getMessage: Response keys: ${data is Map ? data.keys.toList() : "not a map"}');

      final emailData = data['data'] ?? data;
      debugPrint('📧 getMessage: emailData keys: ${emailData is Map ? emailData.keys.toList() : "not a map"}');
      debugPrint('📧 getMessage: bodyText: ${emailData['bodyText']?.toString().length ?? 0} chars');
      debugPrint('📧 getMessage: bodyHtml: ${emailData['bodyHtml']?.toString().length ?? 0} chars');

      final email = Email.fromJson(emailData);
      debugPrint('📧 getMessage: Parsed email bodyText: ${email.bodyText?.length ?? 0} chars');
      debugPrint('📧 getMessage: Parsed email bodyHtml: ${email.bodyHtml?.length ?? 0} chars');

      return ApiResponse.success(
        email,
        message: 'Message retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('📧 getMessage: Error - ${e.message}');
      debugPrint('📧 getMessage: Response data - ${e.response?.data}');
      return ApiResponse.error(
        e.message ?? 'Failed to get message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Send a new email
  Future<ApiResponse<SendEmailResponse>> sendEmail(
    String workspaceId,
    SendEmailRequest request,
  ) async {
    try {
      Response response;

      debugPrint('📧 sendEmail: Starting to send email');
      debugPrint('📧 sendEmail: To: ${request.to.join(", ")}');
      debugPrint('📧 sendEmail: Subject: ${request.subject}');
      debugPrint('📧 sendEmail: Attachments: ${request.attachments?.length ?? 0}');
      debugPrint('📧 sendEmail: Running on web: $kIsWeb');

      // If there are attachments, use multipart form data
      if (request.attachments != null && request.attachments!.isNotEmpty) {
        debugPrint('📧 sendEmail: Using multipart form data for attachments');

        // Check if all attachments are bytes-based (no file paths)
        final allBytesOnly = request.attachments!.every((a) =>
          a.fileBytes != null && a.fileBytes!.isNotEmpty &&
          (a.filePath == null || a.filePath!.isEmpty));

        if (kIsWeb || allBytesOnly) {
          // On web platform, send attachments as base64-encoded JSON
          // This avoids Dio FormData issues on web
          debugPrint('📧 sendEmail: Using base64 JSON approach for web');

          final List<Map<String, dynamic>> attachmentData = [];
          for (final attachment in request.attachments!) {
            if (attachment.fileBytes != null && attachment.fileBytes!.isNotEmpty) {
              final base64Content = base64Encode(Uint8List.fromList(attachment.fileBytes!));
              attachmentData.add({
                'filename': attachment.fileName,
                'content': base64Content,
                'mimeType': attachment.mimeType ?? 'application/octet-stream',
              });
              debugPrint('📧 sendEmail: Added base64 attachment: ${attachment.fileName}');
            }
          }

          final jsonData = {
            'to': request.to,
            if (request.cc != null) 'cc': request.cc,
            if (request.bcc != null) 'bcc': request.bcc,
            'subject': request.subject,
            'body': request.body,
            if (request.isHtml != null) 'isHtml': request.isHtml,
            'attachments': attachmentData,
          };

          debugPrint('📧 sendEmail: Sending JSON with ${attachmentData.length} base64 attachments');
          response = await _apiClient.post(
            '/workspaces/$workspaceId/email/messages',
            data: jsonData,
          );
        } else {
          // On mobile platform, use FormData with files
          final formData = FormData();

          // Add fields manually
          formData.fields.add(MapEntry('subject', request.subject));
          formData.fields.add(MapEntry('body', request.body));

          // Add 'to' as array
          for (final recipient in request.to) {
            formData.fields.add(MapEntry('to', recipient));
          }

          // Add 'cc' as array if present
          if (request.cc != null) {
            for (final cc in request.cc!) {
              formData.fields.add(MapEntry('cc', cc));
            }
          }

          // Add 'bcc' as array if present
          if (request.bcc != null) {
            for (final bcc in request.bcc!) {
              formData.fields.add(MapEntry('bcc', bcc));
            }
          }

          if (request.isHtml != null) {
            formData.fields.add(MapEntry('isHtml', request.isHtml.toString()));
          }

          // Add attachments from file paths
          for (final attachment in request.attachments!) {
            debugPrint('📧 sendEmail: Processing attachment: ${attachment.fileName}');

            if (attachment.filePath != null && attachment.filePath!.isNotEmpty) {
              debugPrint('📧 sendEmail: Attachment path: ${attachment.filePath}');
              final file = File(attachment.filePath!);
              final fileExists = await file.exists();
              debugPrint('📧 sendEmail: File exists: $fileExists');
              if (fileExists) {
                final fileSize = await file.length();
                debugPrint('📧 sendEmail: File size: $fileSize bytes');
                formData.files.add(MapEntry(
                  'attachments',
                  await MultipartFile.fromFile(
                    attachment.filePath!,
                    filename: attachment.fileName,
                    contentType: attachment.mimeType != null
                        ? DioMediaType.parse(attachment.mimeType!)
                        : null,
                  ),
                ));
                debugPrint('📧 sendEmail: Attachment added to form data');
              } else {
                debugPrint('⚠️ sendEmail: File does not exist, skipping');
              }
            } else if (attachment.fileBytes != null && attachment.fileBytes!.isNotEmpty) {
              // Fallback for bytes on mobile (shouldn't happen normally)
              formData.files.add(MapEntry(
                'attachments',
                MultipartFile.fromBytes(
                  attachment.fileBytes!,
                  filename: attachment.fileName,
                  contentType: attachment.mimeType != null
                      ? DioMediaType.parse(attachment.mimeType!)
                      : null,
                ),
              ));
              debugPrint('📧 sendEmail: Attachment added from bytes');
            } else {
              debugPrint('⚠️ sendEmail: No valid data for attachment, skipping');
            }
          }

          debugPrint('📧 sendEmail: Sending FormData with ${formData.files.length} attachments');
          response = await _apiClient.post(
            '/workspaces/$workspaceId/email/messages',
            data: formData,
            options: Options(
              contentType: 'multipart/form-data',
            ),
          );
        }
        debugPrint('📧 sendEmail: Response received - status: ${response.statusCode}');
      } else {
        debugPrint('📧 sendEmail: Sending as JSON (no attachments)');
        response = await _apiClient.post(
          '/workspaces/$workspaceId/email/messages',
          data: request.toJson(),
        );
        debugPrint('📧 sendEmail: Response received - status: ${response.statusCode}');
      }

      debugPrint('📧 sendEmail: Response data: ${response.data}');
      final data = response.data;
      final emailData = data['data'] ?? data;
      debugPrint('📧 sendEmail: Parsed email data: $emailData');

      return ApiResponse.success(
        SendEmailResponse.fromJson(emailData),
        message: 'Email sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('❌ sendEmail: DioException - ${e.type}: ${e.message}');
      debugPrint('❌ sendEmail: Error object: ${e.error}');
      debugPrint('❌ sendEmail: Response status: ${e.response?.statusCode}');
      debugPrint('❌ sendEmail: Response data: ${e.response?.data}');
      debugPrint('❌ sendEmail: Request path: ${e.requestOptions.path}');
      debugPrint('❌ sendEmail: Request data type: ${e.requestOptions.data?.runtimeType}');

      String errorMessage = e.message ?? 'Failed to send email';
      if (e.error != null) {
        errorMessage = '$errorMessage: ${e.error}';
      }

      return ApiResponse.error(
        errorMessage,
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e, stackTrace) {
      debugPrint('❌ sendEmail: Unexpected error - $e');
      debugPrint('❌ sendEmail: Error type: ${e.runtimeType}');
      debugPrint('❌ sendEmail: Stack trace: $stackTrace');
      return ApiResponse.error(
        'Failed to send email: $e',
      );
    }
  }

  /// Reply to an email
  Future<ApiResponse<SendEmailResponse>> replyToEmail(
    String workspaceId,
    String messageId,
    ReplyEmailRequest request,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/messages/$messageId/reply',
        data: request.toJson(),
      );

      final data = response.data;
      final emailData = data['data'] ?? data;

      return ApiResponse.success(
        SendEmailResponse.fromJson(emailData),
        message: 'Reply sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to send reply',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete an email
  Future<ApiResponse<void>> deleteEmail(
    String workspaceId,
    String messageId, {
    bool permanent = false,
    String? connectionId,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (permanent) queryParams['permanent'] = 'true';
      if (connectionId != null) queryParams['connectionId'] = connectionId;
      final queryString = queryParams.isNotEmpty ? '?${queryParams.entries.map((e) => '${e.key}=${e.value}').join('&')}' : '';

      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/email/messages/$messageId$queryString',
      );

      return ApiResponse.success(
        null,
        message: 'Email deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete email',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Mark email as read/unread
  Future<ApiResponse<void>> markAsRead(
    String workspaceId,
    String messageId,
    bool isRead, {
    String? connectionId,
  }) async {
    try {
      final queryString = connectionId != null ? '?connectionId=$connectionId' : '';
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/email/messages/$messageId/read$queryString',
        data: {'isRead': isRead},
      );

      return ApiResponse.success(
        null,
        message: isRead ? 'Marked as read' : 'Marked as unread',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update read status',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Star/unstar an email
  Future<ApiResponse<void>> starEmail(
    String workspaceId,
    String messageId,
    bool isStarred, {
    String? connectionId,
  }) async {
    try {
      final queryString = connectionId != null ? '?connectionId=$connectionId' : '';
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/email/messages/$messageId/star$queryString',
        data: {'isStarred': isStarred},
      );

      return ApiResponse.success(
        null,
        message: isStarred ? 'Starred' : 'Unstarred',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update star status',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Update email labels
  Future<ApiResponse<void>> updateLabels(
    String workspaceId,
    String messageId, {
    List<String>? addLabelIds,
    List<String>? removeLabelIds,
  }) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/email/messages/$messageId/labels',
        data: {
          if (addLabelIds != null) 'addLabelIds': addLabelIds,
          if (removeLabelIds != null) 'removeLabelIds': removeLabelIds,
        },
      );

      return ApiResponse.success(
        null,
        message: 'Labels updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update labels',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== Labels ====================

  /// Get all labels
  Future<ApiResponse<List<EmailLabel>>> getLabels(String workspaceId, {String? connectionId}) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (connectionId != null) queryParameters['connectionId'] = connectionId;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/labels',
        queryParameters: queryParameters.isNotEmpty ? queryParameters : null,
      );

      final data = response.data;
      final labelsData = data['data'] ?? data;

      final labels = (labelsData as List)
          .map((e) => EmailLabel.fromJson(e))
          .toList();

      return ApiResponse.success(
        labels,
        message: 'Labels retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get labels',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Create a new label
  Future<ApiResponse<EmailLabel>> createLabel(
    String workspaceId,
    String name, {
    Map<String, String>? color,
  }) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/labels',
        data: {
          'name': name,
          if (color != null) 'color': color,
        },
      );

      final data = response.data;
      final labelData = data['data'] ?? data;

      return ApiResponse.success(
        EmailLabel.fromJson(labelData),
        message: 'Label created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create label',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== Drafts ====================

  /// Get all drafts
  Future<ApiResponse<List<DraftResponse>>> getDrafts(
    String workspaceId, {
    String? pageToken,
  }) async {
    try {
      final params = pageToken != null ? '?pageToken=$pageToken' : '';
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/drafts$params',
      );

      final data = response.data;
      final draftsData = data['data'] ?? data;

      final drafts = (draftsData as List)
          .map((e) => DraftResponse.fromJson(e))
          .toList();

      return ApiResponse.success(
        drafts,
        message: 'Drafts retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get drafts',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Create a new draft
  Future<ApiResponse<DraftResponse>> createDraft(
    String workspaceId,
    CreateDraftRequest request,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/drafts',
        data: request.toJson(),
      );

      final data = response.data;
      final draftData = data['data'] ?? data;

      return ApiResponse.success(
        DraftResponse.fromJson(draftData),
        message: 'Draft created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create draft',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Update a draft
  Future<ApiResponse<DraftResponse>> updateDraft(
    String workspaceId,
    String draftId,
    CreateDraftRequest request,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/email/drafts/$draftId',
        data: request.toJson(),
      );

      final data = response.data;
      final draftData = data['data'] ?? data;

      return ApiResponse.success(
        DraftResponse.fromJson(draftData),
        message: 'Draft updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update draft',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete a draft
  Future<ApiResponse<void>> deleteDraft(String workspaceId, String draftId) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/email/drafts/$draftId',
      );

      return ApiResponse.success(
        null,
        message: 'Draft deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete draft',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== SMTP/IMAP ====================

  /// Get all email connections (both Gmail and SMTP/IMAP)
  Future<ApiResponse<AllConnectionsResponse>> getAllConnections(String workspaceId) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/connections',
      );

      final data = response.data;
      final connectionsData = data['data'] ?? data;

      return ApiResponse.success(
        AllConnectionsResponse.fromJson(connectionsData),
        message: 'Connections retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get connections',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Test SMTP/IMAP connection
  Future<ApiResponse<TestConnectionResult>> testSmtpImapConnection(
    String workspaceId,
    TestSmtpImapRequest request,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/smtp-imap/test',
        data: request.toJson(),
      );

      final data = response.data;
      final resultData = data['data'] ?? data;

      return ApiResponse.success(
        TestConnectionResult.fromJson(resultData),
        message: 'Connection test completed',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to test connection',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Connect SMTP/IMAP account
  Future<ApiResponse<EmailConnection>> connectSmtpImap(
    String workspaceId,
    ConnectSmtpImapRequest request,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/smtp-imap/connect',
        data: request.toJson(),
      );

      final data = response.data;
      final connectionData = data['data'] ?? data;

      return ApiResponse.success(
        EmailConnection.fromJson(connectionData),
        message: 'Connected successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to connect',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get SMTP/IMAP connection status
  Future<ApiResponse<Map<String, dynamic>>> getSmtpImapConnection(String workspaceId) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/smtp-imap/connection',
      );

      return ApiResponse.success(
        response.data as Map<String, dynamic>,
        message: 'Connection retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get SMTP/IMAP connection',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Disconnect SMTP/IMAP account
  Future<ApiResponse<void>> disconnectSmtpImap(String workspaceId) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/email/smtp-imap/connection',
      );

      return ApiResponse.success(
        null,
        message: 'Disconnected successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to disconnect',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get SMTP/IMAP messages
  Future<ApiResponse<EmailListResponse>> getSmtpImapMessages(
    String workspaceId, {
    String? labelId,
    String? query,
    String? pageToken,
    int? maxResults,
    String? connectionId,
  }) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (labelId != null) queryParameters['labelId'] = labelId;
      if (query != null) queryParameters['query'] = query;
      if (pageToken != null) queryParameters['pageToken'] = pageToken;
      if (maxResults != null) queryParameters['maxResults'] = maxResults;
      if (connectionId != null) queryParameters['connectionId'] = connectionId;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/smtp-imap/messages',
        queryParameters: queryParameters,
      );

      final data = response.data;
      final emailData = data['data'] ?? data;

      return ApiResponse.success(
        EmailListResponse.fromJson(emailData),
        message: 'Messages retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get messages',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get a single SMTP/IMAP message
  Future<ApiResponse<Email>> getSmtpImapMessage(String workspaceId, String messageId, {String? connectionId}) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (connectionId != null) queryParameters['connectionId'] = connectionId;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/smtp-imap/messages/$messageId',
        queryParameters: queryParameters.isNotEmpty ? queryParameters : null,
      );

      final data = response.data;
      final emailData = data['data'] ?? data;

      return ApiResponse.success(
        Email.fromJson(emailData),
        message: 'Message retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Send email via SMTP/IMAP
  Future<ApiResponse<SendEmailResponse>> sendSmtpImapEmail(
    String workspaceId,
    SendEmailRequest request,
  ) async {
    try {
      Response response;

      debugPrint('📧 sendSmtpImapEmail: Starting to send email');
      debugPrint('📧 sendSmtpImapEmail: To: ${request.to.join(", ")}');
      debugPrint('📧 sendSmtpImapEmail: Subject: ${request.subject}');
      debugPrint('📧 sendSmtpImapEmail: Attachments: ${request.attachments?.length ?? 0}');
      debugPrint('📧 sendSmtpImapEmail: Running on web: $kIsWeb');

      // If there are attachments, use multipart form data
      if (request.attachments != null && request.attachments!.isNotEmpty) {
        debugPrint('📧 sendSmtpImapEmail: Using multipart form data for attachments');

        if (kIsWeb) {
          // On web platform, send attachments as base64-encoded JSON
          // This avoids Dio FormData issues on web
          debugPrint('📧 sendSmtpImapEmail: Using base64 JSON approach for web');

          final List<Map<String, dynamic>> attachmentData = [];
          for (final attachment in request.attachments!) {
            if (attachment.fileBytes != null && attachment.fileBytes!.isNotEmpty) {
              final base64Content = base64Encode(Uint8List.fromList(attachment.fileBytes!));
              attachmentData.add({
                'filename': attachment.fileName,
                'content': base64Content,
                'mimeType': attachment.mimeType ?? 'application/octet-stream',
              });
              debugPrint('📧 sendSmtpImapEmail: Added base64 attachment: ${attachment.fileName}');
            }
          }

          final jsonData = {
            'to': request.to,
            if (request.cc != null) 'cc': request.cc,
            if (request.bcc != null) 'bcc': request.bcc,
            'subject': request.subject,
            'body': request.body,
            if (request.isHtml != null) 'isHtml': request.isHtml,
            'attachments': attachmentData,
          };

          debugPrint('📧 sendSmtpImapEmail: Sending JSON with ${attachmentData.length} base64 attachments');
          response = await _apiClient.post(
            '/workspaces/$workspaceId/email/smtp-imap/messages',
            data: jsonData,
          );
        } else {
          // On mobile platform, use FormData with files
          final formData = FormData();

          // Add fields manually
          formData.fields.add(MapEntry('subject', request.subject));
          formData.fields.add(MapEntry('body', request.body));

          // Add 'to' as array
          for (final recipient in request.to) {
            formData.fields.add(MapEntry('to', recipient));
          }

          // Add 'cc' as array if present
          if (request.cc != null) {
            for (final cc in request.cc!) {
              formData.fields.add(MapEntry('cc', cc));
            }
          }

          // Add 'bcc' as array if present
          if (request.bcc != null) {
            for (final bcc in request.bcc!) {
              formData.fields.add(MapEntry('bcc', bcc));
            }
          }

          if (request.isHtml != null) {
            formData.fields.add(MapEntry('isHtml', request.isHtml.toString()));
          }

          // Add attachments from file paths
          for (final attachment in request.attachments!) {
            debugPrint('📧 sendSmtpImapEmail: Processing attachment: ${attachment.fileName}');

            if (attachment.filePath != null && attachment.filePath!.isNotEmpty) {
              debugPrint('📧 sendSmtpImapEmail: Attachment path: ${attachment.filePath}');
              final file = File(attachment.filePath!);
              final fileExists = await file.exists();
              debugPrint('📧 sendSmtpImapEmail: File exists: $fileExists');
              if (fileExists) {
                final fileSize = await file.length();
                debugPrint('📧 sendSmtpImapEmail: File size: $fileSize bytes');
                formData.files.add(MapEntry(
                  'attachments',
                  await MultipartFile.fromFile(
                    attachment.filePath!,
                    filename: attachment.fileName,
                    contentType: attachment.mimeType != null
                        ? DioMediaType.parse(attachment.mimeType!)
                        : null,
                  ),
                ));
                debugPrint('📧 sendSmtpImapEmail: Attachment added to form data');
              } else {
                debugPrint('⚠️ sendSmtpImapEmail: File does not exist, skipping');
              }
            } else if (attachment.fileBytes != null && attachment.fileBytes!.isNotEmpty) {
              // Fallback for bytes on mobile (shouldn't happen normally)
              formData.files.add(MapEntry(
                'attachments',
                MultipartFile.fromBytes(
                  attachment.fileBytes!,
                  filename: attachment.fileName,
                  contentType: attachment.mimeType != null
                      ? DioMediaType.parse(attachment.mimeType!)
                      : null,
                ),
              ));
              debugPrint('📧 sendSmtpImapEmail: Attachment added from bytes');
            } else {
              debugPrint('⚠️ sendSmtpImapEmail: No valid data for attachment, skipping');
            }
          }

          debugPrint('📧 sendSmtpImapEmail: Sending FormData with ${formData.files.length} attachments');
          response = await _apiClient.post(
            '/workspaces/$workspaceId/email/smtp-imap/messages',
            data: formData,
            options: Options(
              contentType: 'multipart/form-data',
            ),
          );
        }
        debugPrint('📧 sendSmtpImapEmail: Response received - status: ${response.statusCode}');
      } else {
        debugPrint('📧 sendSmtpImapEmail: Sending as JSON (no attachments)');
        response = await _apiClient.post(
          '/workspaces/$workspaceId/email/smtp-imap/messages',
          data: request.toJson(),
        );
        debugPrint('📧 sendSmtpImapEmail: Response received - status: ${response.statusCode}');
      }

      final data = response.data;
      final emailData = data['data'] ?? data;

      return ApiResponse.success(
        SendEmailResponse.fromJson(emailData),
        message: 'Email sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('❌ sendSmtpImapEmail: DioException - ${e.type}: ${e.message}');
      debugPrint('❌ sendSmtpImapEmail: Error object: ${e.error}');
      debugPrint('❌ sendSmtpImapEmail: Response status: ${e.response?.statusCode}');
      debugPrint('❌ sendSmtpImapEmail: Response data: ${e.response?.data}');
      return ApiResponse.error(
        e.message ?? 'Failed to send email',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    } catch (e, stackTrace) {
      debugPrint('❌ sendSmtpImapEmail: Unexpected error - $e');
      debugPrint('❌ sendSmtpImapEmail: Stack trace: $stackTrace');
      return ApiResponse.error(
        'Failed to send email: $e',
      );
    }
  }

  /// Reply to email via SMTP/IMAP
  Future<ApiResponse<SendEmailResponse>> replySmtpImapEmail(
    String workspaceId,
    String messageId,
    ReplyEmailRequest request,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/smtp-imap/messages/$messageId/reply',
        data: request.toJson(),
      );

      final data = response.data;
      final emailData = data['data'] ?? data;

      return ApiResponse.success(
        SendEmailResponse.fromJson(emailData),
        message: 'Reply sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to send reply',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete SMTP/IMAP message
  Future<ApiResponse<void>> deleteSmtpImapEmail(
    String workspaceId,
    String messageId, {
    String? connectionId,
  }) async {
    try {
      final queryString = connectionId != null ? '?connectionId=$connectionId' : '';
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/email/smtp-imap/messages/$messageId$queryString',
      );

      return ApiResponse.success(
        null,
        message: 'Email deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete email',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Mark SMTP/IMAP email as read/unread
  Future<ApiResponse<void>> markSmtpImapAsRead(
    String workspaceId,
    String messageId,
    bool isRead, {
    String? connectionId,
  }) async {
    try {
      final queryString = connectionId != null ? '?connectionId=$connectionId' : '';
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/email/smtp-imap/messages/$messageId/read$queryString',
        data: {'isRead': isRead},
      );

      return ApiResponse.success(
        null,
        message: isRead ? 'Marked as read' : 'Marked as unread',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update read status',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Star/unstar SMTP/IMAP email
  Future<ApiResponse<void>> starSmtpImapEmail(
    String workspaceId,
    String messageId,
    bool isStarred, {
    String? connectionId,
  }) async {
    try {
      final queryString = connectionId != null ? '?connectionId=$connectionId' : '';
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/email/smtp-imap/messages/$messageId/star$queryString',
        data: {'isStarred': isStarred},
      );

      return ApiResponse.success(
        null,
        message: isStarred ? 'Starred' : 'Unstarred',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update star status',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get SMTP/IMAP labels
  Future<ApiResponse<List<EmailLabel>>> getSmtpImapLabels(String workspaceId, {String? connectionId}) async {
    try {
      final queryParameters = <String, dynamic>{};
      if (connectionId != null) queryParameters['connectionId'] = connectionId;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/smtp-imap/labels',
        queryParameters: queryParameters.isNotEmpty ? queryParameters : null,
      );

      final data = response.data;
      final labelsData = data['data'] ?? data;

      final labels = (labelsData as List)
          .map((e) => EmailLabel.fromJson(e))
          .toList();

      return ApiResponse.success(
        labels,
        message: 'Labels retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get labels',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== Priority Analysis ====================

  /// Analyze email priorities using AI
  /// Takes a list of emails and returns priority scores for each
  Future<ApiResponse<EmailPriorityResponse>> analyzePriority(
    String workspaceId,
    EmailPriorityRequest request,
  ) async {
    try {
      debugPrint('🔍 analyzePriority: Analyzing ${request.emails.length} emails');

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/analyze-priority',
        data: request.toJson(),
      );

      final data = response.data;
      final priorityData = data['data'] ?? data;

      debugPrint('🔍 analyzePriority: Response received');

      return ApiResponse.success(
        EmailPriorityResponse.fromJson(priorityData),
        message: 'Priorities analyzed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('❌ analyzePriority: Error - ${e.message}');
      return ApiResponse.error(
        e.message ?? 'Failed to analyze priorities',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Analyze priorities for a list of EmailListItem
  /// Convenience method that converts EmailListItem to request format
  Future<ApiResponse<EmailPriorityResponse>> analyzePriorityForEmails(
    String workspaceId,
    List<EmailListItem> emails, {
    String? connectionId,
    int maxEmails = 10,
    bool unreadOnly = true,
  }) async {
    // Filter and limit emails
    var emailsToAnalyze = emails;

    if (unreadOnly) {
      emailsToAnalyze = emails.where((e) => !e.isRead).toList();
      // If no unread emails, use all emails
      if (emailsToAnalyze.isEmpty) {
        emailsToAnalyze = emails;
      }
    }

    // Limit to maxEmails
    if (emailsToAnalyze.length > maxEmails) {
      emailsToAnalyze = emailsToAnalyze.sublist(0, maxEmails);
    }

    final request = EmailPriorityRequest(
      emails: emailsToAnalyze
          .map((e) => EmailPriorityRequestItem.fromEmailListItem(e))
          .toList(),
      connectionId: connectionId,
    );

    return analyzePriority(workspaceId, request);
  }

  /// Get stored priorities for a list of email IDs
  Future<ApiResponse<EmailPriorityResponse>> getStoredPriorities(
    String workspaceId,
    List<String> emailIds,
  ) async {
    try {
      if (emailIds.isEmpty) {
        return ApiResponse.success(
          EmailPriorityResponse(priorities: []),
          message: 'No email IDs provided',
        );
      }

      debugPrint('🔍 getStoredPriorities: Fetching priorities for ${emailIds.length} emails');

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/priorities/get',
        data: GetStoredPrioritiesRequest(emailIds: emailIds).toJson(),
      );

      final data = response.data;
      final priorityData = data['data'] ?? data;

      return ApiResponse.success(
        EmailPriorityResponse.fromJson(priorityData),
        message: 'Stored priorities retrieved',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('❌ getStoredPriorities: Error - ${e.message}');
      return ApiResponse.error(
        e.message ?? 'Failed to get stored priorities',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get all stored priorities for a connection
  Future<ApiResponse<EmailPriorityResponse>> getPrioritiesForConnection(
    String workspaceId,
    String connectionId,
  ) async {
    try {
      debugPrint('🔍 getPrioritiesForConnection: Fetching priorities for connection $connectionId');

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/email/priorities/$connectionId',
      );

      final data = response.data;
      final priorityData = data['data'] ?? data;

      return ApiResponse.success(
        EmailPriorityResponse.fromJson(priorityData),
        message: 'Connection priorities retrieved',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('❌ getPrioritiesForConnection: Error - ${e.message}');
      return ApiResponse.error(
        e.message ?? 'Failed to get connection priorities',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== Travel Info Extraction ====================

  /// Extract travel ticket information from an email
  /// Uses AI to parse email content and attachments for travel details
  Future<ApiResponse<ExtractTravelInfoResponse>> extractTravelInfo(
    String workspaceId,
    ExtractTravelInfoRequest request,
  ) async {
    try {
      debugPrint('✈️ extractTravelInfo: Extracting travel info from message ${request.messageId}');

      final response = await _apiClient.post(
        '/workspaces/$workspaceId/email/extract-travel-info',
        data: request.toJson(),
      );

      final data = response.data;
      final travelData = data['data'] ?? data;

      debugPrint('✈️ extractTravelInfo: Response received');

      return ApiResponse.success(
        ExtractTravelInfoResponse.fromJson(travelData),
        message: 'Travel info extracted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('❌ extractTravelInfo: Error - ${e.message}');
      return ApiResponse.error(
        e.message ?? 'Failed to extract travel info',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
}
