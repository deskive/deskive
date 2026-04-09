// Models for SendGrid integration

/// SendGrid connection status
class SendGridConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? apiKey; // Masked API key
  final String senderEmail;
  final String senderName;
  final bool isActive;
  final DateTime createdAt;

  SendGridConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.apiKey,
    required this.senderEmail,
    required this.senderName,
    required this.isActive,
    required this.createdAt,
  });

  factory SendGridConnection.fromJson(Map<String, dynamic> json) {
    return SendGridConnection(
      id: json['id'] as String,
      workspaceId: json['workspaceId'] as String,
      userId: json['userId'] as String,
      apiKey: json['apiKey'] as String?,
      senderEmail: json['senderEmail'] as String,
      senderName: json['senderName'] as String,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'userId': userId,
      if (apiKey != null) 'apiKey': apiKey,
      'senderEmail': senderEmail,
      'senderName': senderName,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Email attachment model
class SendGridAttachment {
  final String content; // Base64 encoded content
  final String filename;
  final String? type; // MIME type
  final String? disposition; // 'attachment' or 'inline'
  final String? contentId; // For inline attachments

  SendGridAttachment({
    required this.content,
    required this.filename,
    this.type,
    this.disposition,
    this.contentId,
  });

  factory SendGridAttachment.fromJson(Map<String, dynamic> json) {
    return SendGridAttachment(
      content: json['content'] as String,
      filename: json['filename'] as String,
      type: json['type'] as String?,
      disposition: json['disposition'] as String?,
      contentId: json['contentId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'content': content,
      'filename': filename,
      if (type != null) 'type': type,
      if (disposition != null) 'disposition': disposition,
      if (contentId != null) 'contentId': contentId,
    };
  }
}

/// Request model for sending a single email
class SendEmailRequest {
  final String to;
  final String subject;
  final String? htmlContent;
  final String? textContent;
  final List<String>? cc;
  final List<String>? bcc;
  final List<SendGridAttachment>? attachments;

  SendEmailRequest({
    required this.to,
    required this.subject,
    this.htmlContent,
    this.textContent,
    this.cc,
    this.bcc,
    this.attachments,
  });

  factory SendEmailRequest.fromJson(Map<String, dynamic> json) {
    return SendEmailRequest(
      to: json['to'] as String,
      subject: json['subject'] as String,
      htmlContent: json['htmlContent'] as String?,
      textContent: json['textContent'] as String?,
      cc: (json['cc'] as List<dynamic>?)?.map((e) => e as String).toList(),
      bcc: (json['bcc'] as List<dynamic>?)?.map((e) => e as String).toList(),
      attachments: (json['attachments'] as List<dynamic>?)
          ?.map((e) => SendGridAttachment.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'to': to,
      'subject': subject,
      if (htmlContent != null) 'htmlContent': htmlContent,
      if (textContent != null) 'textContent': textContent,
      if (cc != null && cc!.isNotEmpty) 'cc': cc,
      if (bcc != null && bcc!.isNotEmpty) 'bcc': bcc,
      if (attachments != null && attachments!.isNotEmpty)
        'attachments': attachments!.map((a) => a.toJson()).toList(),
    };
  }
}

/// Response model for sent email
class SendEmailResponse {
  final String? messageId;
  final String status;

  SendEmailResponse({
    this.messageId,
    required this.status,
  });

  factory SendEmailResponse.fromJson(Map<String, dynamic> json) {
    return SendEmailResponse(
      messageId: json['messageId'] as String?,
      status: json['status'] as String? ?? 'unknown',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (messageId != null) 'messageId': messageId,
      'status': status,
    };
  }
}

/// SendGrid contact model
class SendGridContact {
  final String email;
  final String? firstName;
  final String? lastName;
  final Map<String, dynamic>? metadata;

  SendGridContact({
    required this.email,
    this.firstName,
    this.lastName,
    this.metadata,
  });

  factory SendGridContact.fromJson(Map<String, dynamic> json) {
    return SendGridContact(
      email: json['email'] as String,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (metadata != null) 'metadata': metadata,
    };
  }

  String get fullName {
    final parts = <String>[];
    if (firstName != null && firstName!.isNotEmpty) parts.add(firstName!);
    if (lastName != null && lastName!.isNotEmpty) parts.add(lastName!);
    return parts.isNotEmpty ? parts.join(' ') : email;
  }
}

/// SendGrid email template model
class SendGridTemplate {
  final String id;
  final String name;
  final String? htmlContent;

  SendGridTemplate({
    required this.id,
    required this.name,
    this.htmlContent,
  });

  factory SendGridTemplate.fromJson(Map<String, dynamic> json) {
    return SendGridTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      htmlContent: json['htmlContent'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (htmlContent != null) 'htmlContent': htmlContent,
    };
  }
}

/// SendGrid email statistics model
class SendGridStats {
  final DateTime date;
  final int requests;
  final int delivered;
  final int opens;
  final int clicks;
  final int bounces;
  final int? uniqueOpens;
  final int? uniqueClicks;
  final int? spamReports;
  final int? blocked;
  final int? deferred;

  SendGridStats({
    required this.date,
    required this.requests,
    required this.delivered,
    required this.opens,
    required this.clicks,
    required this.bounces,
    this.uniqueOpens,
    this.uniqueClicks,
    this.spamReports,
    this.blocked,
    this.deferred,
  });

  factory SendGridStats.fromJson(Map<String, dynamic> json) {
    return SendGridStats(
      date: DateTime.parse(json['date'] as String),
      requests: json['requests'] as int? ?? 0,
      delivered: json['delivered'] as int? ?? 0,
      opens: json['opens'] as int? ?? 0,
      clicks: json['clicks'] as int? ?? 0,
      bounces: json['bounces'] as int? ?? 0,
      uniqueOpens: json['uniqueOpens'] as int?,
      uniqueClicks: json['uniqueClicks'] as int?,
      spamReports: json['spamReports'] as int?,
      blocked: json['blocked'] as int?,
      deferred: json['deferred'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'date': date.toIso8601String(),
      'requests': requests,
      'delivered': delivered,
      'opens': opens,
      'clicks': clicks,
      'bounces': bounces,
      if (uniqueOpens != null) 'uniqueOpens': uniqueOpens,
      if (uniqueClicks != null) 'uniqueClicks': uniqueClicks,
      if (spamReports != null) 'spamReports': spamReports,
      if (blocked != null) 'blocked': blocked,
      if (deferred != null) 'deferred': deferred,
    };
  }

  /// Calculate delivery rate as a percentage
  double get deliveryRate {
    if (requests == 0) return 0.0;
    return (delivered / requests) * 100;
  }

  /// Calculate open rate as a percentage
  double get openRate {
    if (delivered == 0) return 0.0;
    return (opens / delivered) * 100;
  }

  /// Calculate click rate as a percentage
  double get clickRate {
    if (delivered == 0) return 0.0;
    return (clicks / delivered) * 100;
  }

  /// Calculate bounce rate as a percentage
  double get bounceRate {
    if (requests == 0) return 0.0;
    return (bounces / requests) * 100;
  }
}

/// Bulk email recipient model
class BulkEmailRecipient {
  final String email;
  final Map<String, dynamic>? templateData;

  BulkEmailRecipient({
    required this.email,
    this.templateData,
  });

  factory BulkEmailRecipient.fromJson(Map<String, dynamic> json) {
    return BulkEmailRecipient(
      email: json['email'] as String,
      templateData: json['templateData'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      if (templateData != null) 'templateData': templateData,
    };
  }
}

/// Bulk email response model
class BulkEmailResponse {
  final String? jobId;
  final String status;
  final int totalRecipients;
  final int? successCount;
  final int? failureCount;

  BulkEmailResponse({
    this.jobId,
    required this.status,
    required this.totalRecipients,
    this.successCount,
    this.failureCount,
  });

  factory BulkEmailResponse.fromJson(Map<String, dynamic> json) {
    return BulkEmailResponse(
      jobId: json['jobId'] as String?,
      status: json['status'] as String? ?? 'unknown',
      totalRecipients: json['totalRecipients'] as int? ?? 0,
      successCount: json['successCount'] as int?,
      failureCount: json['failureCount'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (jobId != null) 'jobId': jobId,
      'status': status,
      'totalRecipients': totalRecipients,
      if (successCount != null) 'successCount': successCount,
      if (failureCount != null) 'failureCount': failureCount,
    };
  }
}

/// List templates response
class SendGridListTemplatesResponse {
  final List<SendGridTemplate> templates;
  final String? nextCursor;

  SendGridListTemplatesResponse({
    required this.templates,
    this.nextCursor,
  });

  factory SendGridListTemplatesResponse.fromJson(Map<String, dynamic> json) {
    return SendGridListTemplatesResponse(
      templates: (json['templates'] as List<dynamic>?)
              ?.map((e) => SendGridTemplate.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

/// Test connection response
class SendGridTestConnectionResponse {
  final bool success;
  final String? message;
  final String? senderEmail;
  final String? senderName;

  SendGridTestConnectionResponse({
    required this.success,
    this.message,
    this.senderEmail,
    this.senderName,
  });

  factory SendGridTestConnectionResponse.fromJson(Map<String, dynamic> json) {
    return SendGridTestConnectionResponse(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String?,
      senderEmail: json['senderEmail'] as String?,
      senderName: json['senderName'] as String?,
    );
  }
}
