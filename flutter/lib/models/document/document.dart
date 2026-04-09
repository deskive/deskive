/// Document Model
/// Represents a document created from a template (proposal, contract, invoice, SOW)

import '../template/document_template.dart';

/// Document status
enum DocumentStatus {
  draft,
  pendingSignature,
  partiallySigned,
  signed,
  expired,
  declined,
  archived;

  String get displayName {
    switch (this) {
      case DocumentStatus.draft:
        return 'Draft';
      case DocumentStatus.pendingSignature:
        return 'Pending Signature';
      case DocumentStatus.partiallySigned:
        return 'Partially Signed';
      case DocumentStatus.signed:
        return 'Signed';
      case DocumentStatus.expired:
        return 'Expired';
      case DocumentStatus.declined:
        return 'Declined';
      case DocumentStatus.archived:
        return 'Archived';
    }
  }

  int get color {
    switch (this) {
      case DocumentStatus.draft:
        return 0xFF6B7280; // Gray
      case DocumentStatus.pendingSignature:
        return 0xFFF59E0B; // Amber
      case DocumentStatus.partiallySigned:
        return 0xFF3B82F6; // Blue
      case DocumentStatus.signed:
        return 0xFF10B981; // Green
      case DocumentStatus.expired:
        return 0xFFEF4444; // Red
      case DocumentStatus.declined:
        return 0xFFDC2626; // Red
      case DocumentStatus.archived:
        return 0xFF9CA3AF; // Gray
    }
  }

  static DocumentStatus fromString(String value) {
    switch (value.toLowerCase().replaceAll('_', '')) {
      case 'draft':
        return DocumentStatus.draft;
      case 'pendingsignature':
        return DocumentStatus.pendingSignature;
      case 'partiallysigned':
        return DocumentStatus.partiallySigned;
      case 'signed':
        return DocumentStatus.signed;
      case 'expired':
        return DocumentStatus.expired;
      case 'declined':
        return DocumentStatus.declined;
      case 'archived':
        return DocumentStatus.archived;
      default:
        return DocumentStatus.draft;
    }
  }
}

/// Recipient role
enum RecipientRole {
  signer,
  viewer,
  approver,
  cc;

  String get displayName {
    switch (this) {
      case RecipientRole.signer:
        return 'Signer';
      case RecipientRole.viewer:
        return 'Viewer';
      case RecipientRole.approver:
        return 'Approver';
      case RecipientRole.cc:
        return 'CC';
    }
  }

  static RecipientRole fromString(String value) {
    switch (value.toLowerCase()) {
      case 'signer':
        return RecipientRole.signer;
      case 'viewer':
        return RecipientRole.viewer;
      case 'approver':
        return RecipientRole.approver;
      case 'cc':
        return RecipientRole.cc;
      default:
        return RecipientRole.signer;
    }
  }
}

/// Recipient status
enum RecipientStatus {
  pending,
  viewed,
  signed,
  declined,
  expired;

  String get displayName {
    switch (this) {
      case RecipientStatus.pending:
        return 'Sent';
      case RecipientStatus.viewed:
        return 'Viewed';
      case RecipientStatus.signed:
        return 'Signed';
      case RecipientStatus.declined:
        return 'Declined';
      case RecipientStatus.expired:
        return 'Expired';
    }
  }

  int get color {
    switch (this) {
      case RecipientStatus.pending:
        return 0xFFFFA000; // Amber
      case RecipientStatus.viewed:
        return 0xFF2196F3; // Blue
      case RecipientStatus.signed:
        return 0xFF4CAF50; // Green
      case RecipientStatus.declined:
        return 0xFFF44336; // Red
      case RecipientStatus.expired:
        return 0xFF9E9E9E; // Grey
    }
  }

  static RecipientStatus fromString(String value) {
    switch (value.toLowerCase()) {
      case 'pending':
        return RecipientStatus.pending;
      case 'viewed':
        return RecipientStatus.viewed;
      case 'signed':
        return RecipientStatus.signed;
      case 'declined':
        return RecipientStatus.declined;
      case 'expired':
        return RecipientStatus.expired;
      default:
        return RecipientStatus.pending;
    }
  }
}

/// Signature type
enum SignatureType {
  drawn,
  typed,
  uploaded;

  static SignatureType fromString(String value) {
    switch (value.toLowerCase()) {
      case 'drawn':
        return SignatureType.drawn;
      case 'typed':
        return SignatureType.typed;
      case 'uploaded':
        return SignatureType.uploaded;
      default:
        return SignatureType.drawn;
    }
  }
}

/// Document Recipient
class DocumentRecipient {
  final String id;
  final String documentId;
  final String? userId;
  final String email;
  final String name;
  final RecipientRole role;
  final int order;
  final RecipientStatus status;
  final String? message;
  final DateTime? viewedAt;
  final DateTime? signedAt;
  final DateTime? declinedAt;
  final String? declineReason;
  final DateTime createdAt;

  const DocumentRecipient({
    required this.id,
    required this.documentId,
    this.userId,
    required this.email,
    required this.name,
    required this.role,
    this.order = 0,
    this.status = RecipientStatus.pending,
    this.message,
    this.viewedAt,
    this.signedAt,
    this.declinedAt,
    this.declineReason,
    required this.createdAt,
  });

  factory DocumentRecipient.fromJson(Map<String, dynamic> json) {
    return DocumentRecipient(
      id: json['id']?.toString() ?? '',
      documentId: json['documentId']?.toString() ?? json['document_id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? json['user_id']?.toString(),
      email: json['email']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      role: RecipientRole.fromString(json['role']?.toString() ?? 'signer'),
      order: json['order'] as int? ?? 0,
      status: RecipientStatus.fromString(json['status']?.toString() ?? 'pending'),
      message: json['message']?.toString(),
      viewedAt: json['viewedAt'] != null || json['viewed_at'] != null
          ? DateTime.tryParse(json['viewedAt']?.toString() ?? json['viewed_at']?.toString() ?? '')
          : null,
      signedAt: json['signedAt'] != null || json['signed_at'] != null
          ? DateTime.tryParse(json['signedAt']?.toString() ?? json['signed_at']?.toString() ?? '')
          : null,
      declinedAt: json['declinedAt'] != null || json['declined_at'] != null
          ? DateTime.tryParse(json['declinedAt']?.toString() ?? json['declined_at']?.toString() ?? '')
          : null,
      declineReason: json['declineReason']?.toString() ?? json['decline_reason']?.toString(),
      createdAt: DateTime.tryParse(
              json['createdAt']?.toString() ?? json['created_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'documentId': documentId,
      'userId': userId,
      'email': email,
      'name': name,
      'role': role.name,
      'order': order,
      'status': status.name,
      'message': message,
      'viewedAt': viewedAt?.toIso8601String(),
      'signedAt': signedAt?.toIso8601String(),
      'declinedAt': declinedAt?.toIso8601String(),
      'declineReason': declineReason,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Document Signature
class DocumentSignature {
  final String id;
  final String documentId;
  final String recipientId;
  final String signatureFieldId;
  final SignatureType signatureType;
  final String signatureData;
  final String? typedName;
  final String? fontFamily;
  final DateTime signedAt;

  const DocumentSignature({
    required this.id,
    required this.documentId,
    required this.recipientId,
    required this.signatureFieldId,
    required this.signatureType,
    required this.signatureData,
    this.typedName,
    this.fontFamily,
    required this.signedAt,
  });

  factory DocumentSignature.fromJson(Map<String, dynamic> json) {
    return DocumentSignature(
      id: json['id']?.toString() ?? '',
      documentId: json['documentId']?.toString() ?? json['document_id']?.toString() ?? '',
      recipientId: json['recipientId']?.toString() ?? json['recipient_id']?.toString() ?? '',
      signatureFieldId:
          json['signatureFieldId']?.toString() ?? json['signature_field_id']?.toString() ?? '',
      signatureType:
          SignatureType.fromString(json['signatureType']?.toString() ?? json['signature_type']?.toString() ?? 'drawn'),
      signatureData: json['signatureData']?.toString() ?? json['signature_data']?.toString() ?? '',
      typedName: json['typedName']?.toString() ?? json['typed_name']?.toString(),
      fontFamily: json['fontFamily']?.toString() ?? json['font_family']?.toString(),
      signedAt: DateTime.tryParse(
              json['signedAt']?.toString() ?? json['signed_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

/// Document Activity Log
class DocumentActivityLog {
  final String id;
  final String documentId;
  final String? userId;
  final String? recipientId;
  final String action;
  final String? details;
  final DateTime createdAt;

  const DocumentActivityLog({
    required this.id,
    required this.documentId,
    this.userId,
    this.recipientId,
    required this.action,
    this.details,
    required this.createdAt,
  });

  factory DocumentActivityLog.fromJson(Map<String, dynamic> json) {
    return DocumentActivityLog(
      id: json['id']?.toString() ?? '',
      documentId: json['documentId']?.toString() ?? json['document_id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? json['user_id']?.toString(),
      recipientId: json['recipientId']?.toString() ?? json['recipient_id']?.toString(),
      action: json['action']?.toString() ?? '',
      details: json['details']?.toString(),
      createdAt: DateTime.tryParse(
              json['createdAt']?.toString() ?? json['created_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

/// Document Model
class Document {
  final String id;
  final String workspaceId;
  final String? templateId;
  final String documentNumber;
  final String title;
  final String? description;
  final DocumentType documentType;
  final Map<String, dynamic> content;
  final String? contentHtml;
  final Map<String, dynamic> placeholderValues;
  final DocumentStatus status;
  final int version;
  final DateTime? expiresAt;
  final DateTime? signedAt;
  final Map<String, dynamic> settings;
  final Map<String, dynamic> metadata;
  final String createdBy;
  final String? updatedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Optional related data
  final List<DocumentRecipient>? recipients;
  final List<DocumentSignature>? signatures;

  const Document({
    required this.id,
    required this.workspaceId,
    this.templateId,
    required this.documentNumber,
    required this.title,
    this.description,
    required this.documentType,
    required this.content,
    this.contentHtml,
    this.placeholderValues = const {},
    this.status = DocumentStatus.draft,
    this.version = 1,
    this.expiresAt,
    this.signedAt,
    this.settings = const {},
    this.metadata = const {},
    required this.createdBy,
    this.updatedBy,
    required this.createdAt,
    required this.updatedAt,
    this.recipients,
    this.signatures,
  });

  factory Document.fromJson(Map<String, dynamic> json) {
    // Handle nested document data
    final docData = json['document'] as Map<String, dynamic>? ?? json;

    return Document(
      id: docData['id']?.toString() ?? '',
      workspaceId: docData['workspaceId']?.toString() ?? docData['workspace_id']?.toString() ?? '',
      templateId: docData['templateId']?.toString() ?? docData['template_id']?.toString(),
      documentNumber:
          docData['documentNumber']?.toString() ?? docData['document_number']?.toString() ?? '',
      title: docData['title']?.toString() ?? 'Untitled Document',
      description: docData['description']?.toString(),
      documentType: DocumentType.fromString(
          docData['documentType']?.toString() ?? docData['document_type']?.toString() ?? 'proposal'),
      content: docData['content'] as Map<String, dynamic>? ?? {},
      contentHtml: docData['contentHtml']?.toString() ?? docData['content_html']?.toString(),
      placeholderValues: docData['placeholderValues'] as Map<String, dynamic>? ??
          docData['placeholder_values'] as Map<String, dynamic>? ??
          {},
      status: DocumentStatus.fromString(docData['status']?.toString() ?? 'draft'),
      version: docData['version'] as int? ?? 1,
      expiresAt: docData['expiresAt'] != null || docData['expires_at'] != null
          ? DateTime.tryParse(
              docData['expiresAt']?.toString() ?? docData['expires_at']?.toString() ?? '')
          : null,
      signedAt: docData['signedAt'] != null || docData['signed_at'] != null
          ? DateTime.tryParse(
              docData['signedAt']?.toString() ?? docData['signed_at']?.toString() ?? '')
          : null,
      settings: docData['settings'] as Map<String, dynamic>? ?? {},
      metadata: docData['metadata'] as Map<String, dynamic>? ?? {},
      createdBy: docData['createdBy']?.toString() ?? docData['created_by']?.toString() ?? '',
      updatedBy: docData['updatedBy']?.toString() ?? docData['updated_by']?.toString(),
      createdAt: DateTime.tryParse(
              docData['createdAt']?.toString() ?? docData['created_at']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt: DateTime.tryParse(
              docData['updatedAt']?.toString() ?? docData['updated_at']?.toString() ?? '') ??
          DateTime.now(),
      recipients: json['recipients'] != null
          ? (json['recipients'] as List<dynamic>)
              .map((e) => DocumentRecipient.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
      signatures: json['signatures'] != null
          ? (json['signatures'] as List<dynamic>)
              .map((e) => DocumentSignature.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'templateId': templateId,
      'documentNumber': documentNumber,
      'title': title,
      'description': description,
      'documentType': documentType.name,
      'content': content,
      'contentHtml': contentHtml,
      'placeholderValues': placeholderValues,
      'status': status.name,
      'version': version,
      'expiresAt': expiresAt?.toIso8601String(),
      'signedAt': signedAt?.toIso8601String(),
      'settings': settings,
      'metadata': metadata,
      'createdBy': createdBy,
      'updatedBy': updatedBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Document copyWith({
    String? id,
    String? workspaceId,
    String? templateId,
    String? documentNumber,
    String? title,
    String? description,
    DocumentType? documentType,
    Map<String, dynamic>? content,
    String? contentHtml,
    Map<String, dynamic>? placeholderValues,
    DocumentStatus? status,
    int? version,
    DateTime? expiresAt,
    DateTime? signedAt,
    Map<String, dynamic>? settings,
    Map<String, dynamic>? metadata,
    String? createdBy,
    String? updatedBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<DocumentRecipient>? recipients,
    List<DocumentSignature>? signatures,
  }) {
    return Document(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      templateId: templateId ?? this.templateId,
      documentNumber: documentNumber ?? this.documentNumber,
      title: title ?? this.title,
      description: description ?? this.description,
      documentType: documentType ?? this.documentType,
      content: content ?? this.content,
      contentHtml: contentHtml ?? this.contentHtml,
      placeholderValues: placeholderValues ?? this.placeholderValues,
      status: status ?? this.status,
      version: version ?? this.version,
      expiresAt: expiresAt ?? this.expiresAt,
      signedAt: signedAt ?? this.signedAt,
      settings: settings ?? this.settings,
      metadata: metadata ?? this.metadata,
      createdBy: createdBy ?? this.createdBy,
      updatedBy: updatedBy ?? this.updatedBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      recipients: recipients ?? this.recipients,
      signatures: signatures ?? this.signatures,
    );
  }

  /// Get signer count
  int get signerCount => recipients?.where((r) => r.role == RecipientRole.signer).length ?? 0;

  /// Get signed count
  int get signedCount =>
      recipients?.where((r) => r.role == RecipientRole.signer && r.status == RecipientStatus.signed).length ?? 0;

  /// Check if document is editable
  /// Documents can be edited if they are in draft or pending signature status
  /// and no recipients have signed yet
  bool get isEditable {
    // Not editable if signed, expired, or archived
    if (status == DocumentStatus.signed ||
        status == DocumentStatus.expired ||
        status == DocumentStatus.archived) {
      return false;
    }

    // Not editable if any recipient has signed
    if (recipients != null && recipients!.any((r) => r.status == RecipientStatus.signed)) {
      return false;
    }

    // Editable for draft, pending signature, and partially signed (before actual signatures)
    return true;
  }

  /// Check if document is fully signed
  bool get isFullySigned => status == DocumentStatus.signed;
}
