/// Document Template Model
/// Represents a template for documents (proposals, contracts, invoices, SOWs)

/// Document types
enum DocumentType {
  proposal,
  contract,
  invoice,
  sow;

  String get displayName {
    switch (this) {
      case DocumentType.proposal:
        return 'Proposals';
      case DocumentType.contract:
        return 'Contracts';
      case DocumentType.invoice:
        return 'Invoices';
      case DocumentType.sow:
        return 'Statements of Work';
    }
  }

  String get singularName {
    switch (this) {
      case DocumentType.proposal:
        return 'Proposal';
      case DocumentType.contract:
        return 'Contract';
      case DocumentType.invoice:
        return 'Invoice';
      case DocumentType.sow:
        return 'Statement of Work';
    }
  }

  String get iconName {
    switch (this) {
      case DocumentType.proposal:
        return 'description';
      case DocumentType.contract:
        return 'gavel';
      case DocumentType.invoice:
        return 'receipt';
      case DocumentType.sow:
        return 'assignment';
    }
  }

  static DocumentType fromString(String value) {
    switch (value.toLowerCase()) {
      case 'proposal':
        return DocumentType.proposal;
      case 'contract':
        return DocumentType.contract;
      case 'invoice':
        return DocumentType.invoice;
      case 'sow':
        return DocumentType.sow;
      default:
        return DocumentType.proposal;
    }
  }
}

/// Document Template Category
class DocumentTemplateCategory {
  final String id;
  final String name;
  final int count;

  const DocumentTemplateCategory({
    required this.id,
    required this.name,
    this.count = 0,
  });

  DocumentTemplateCategory copyWith({int? count}) {
    return DocumentTemplateCategory(
      id: id,
      name: name,
      count: count ?? this.count,
    );
  }

  static String getDisplayName(String categoryId) {
    switch (categoryId.toLowerCase()) {
      case 'sales':
        return 'Sales';
      case 'legal':
        return 'Legal';
      case 'freelance':
        return 'Freelance';
      case 'consulting':
        return 'Consulting';
      case 'general':
        return 'General';
      default:
        return categoryId;
    }
  }
}

/// Template Placeholder for dynamic content
class TemplatePlaceholder {
  final String key;
  final String label;
  final String type;
  final bool required;
  final String? defaultValue;
  final List<String>? options;
  final String? helpText;

  const TemplatePlaceholder({
    required this.key,
    required this.label,
    required this.type,
    this.required = true,
    this.defaultValue,
    this.options,
    this.helpText,
  });

  factory TemplatePlaceholder.fromJson(Map<String, dynamic> json) {
    return TemplatePlaceholder(
      key: json['key']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      type: json['type']?.toString() ?? 'text',
      required: json['required'] as bool? ?? true,
      defaultValue: json['defaultValue']?.toString(),
      options: (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      helpText: json['helpText']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'label': label,
      'type': type,
      'required': required,
      if (defaultValue != null) 'defaultValue': defaultValue,
      if (options != null) 'options': options,
      if (helpText != null) 'helpText': helpText,
    };
  }
}

/// Signature Field Definition
class SignatureField {
  final String id;
  final String label;
  final bool required;
  final String? signerRole;

  const SignatureField({
    required this.id,
    required this.label,
    this.required = true,
    this.signerRole,
  });

  factory SignatureField.fromJson(Map<String, dynamic> json) {
    return SignatureField(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      required: json['required'] as bool? ?? true,
      signerRole: json['signerRole']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'required': required,
      if (signerRole != null) 'signerRole': signerRole,
    };
  }
}

/// Document Template Model
class DocumentTemplate {
  final String id;
  final String? workspaceId;
  final String name;
  final String slug;
  final String? description;
  final DocumentType documentType;
  final String? category;
  final String? icon;
  final String? color;
  final Map<String, dynamic> content;
  final String? contentHtml;
  final List<TemplatePlaceholder> placeholders;
  final List<SignatureField> signatureFields;
  final Map<String, dynamic> settings;
  final bool isSystem;
  final bool isFeatured;
  final int usageCount;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const DocumentTemplate({
    required this.id,
    this.workspaceId,
    required this.name,
    required this.slug,
    this.description,
    required this.documentType,
    this.category,
    this.icon,
    this.color,
    required this.content,
    this.contentHtml,
    this.placeholders = const [],
    this.signatureFields = const [],
    this.settings = const {},
    this.isSystem = true,
    this.isFeatured = false,
    this.usageCount = 0,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DocumentTemplate.fromJson(Map<String, dynamic> json) {
    final createdAtStr = json['createdAt']?.toString() ?? json['created_at']?.toString();
    final updatedAtStr = json['updatedAt']?.toString() ?? json['updated_at']?.toString();

    return DocumentTemplate(
      id: json['id']?.toString() ?? '',
      workspaceId: json['workspaceId']?.toString() ?? json['workspace_id']?.toString(),
      name: json['name']?.toString() ?? 'Untitled Template',
      slug: json['slug']?.toString() ?? '',
      description: json['description']?.toString(),
      documentType: DocumentType.fromString(
        json['documentType']?.toString() ?? json['document_type']?.toString() ?? 'proposal',
      ),
      category: json['category']?.toString(),
      icon: json['icon']?.toString(),
      color: json['color']?.toString(),
      content: json['content'] as Map<String, dynamic>? ?? {},
      contentHtml: json['contentHtml']?.toString() ?? json['content_html']?.toString(),
      placeholders: (json['placeholders'] as List<dynamic>?)
              ?.map((e) => TemplatePlaceholder.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      signatureFields: (json['signatureFields'] as List<dynamic>? ??
              json['signature_fields'] as List<dynamic>?)
              ?.map((e) => SignatureField.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      settings: json['settings'] as Map<String, dynamic>? ?? {},
      isSystem: json['isSystem'] as bool? ?? json['is_system'] as bool? ?? true,
      isFeatured: json['isFeatured'] as bool? ?? json['is_featured'] as bool? ?? false,
      usageCount: json['usageCount'] as int? ?? json['usage_count'] as int? ?? 0,
      createdBy: json['createdBy']?.toString() ?? json['created_by']?.toString(),
      createdAt: createdAtStr != null
          ? DateTime.tryParse(createdAtStr) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: updatedAtStr != null
          ? DateTime.tryParse(updatedAtStr) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'name': name,
      'slug': slug,
      'description': description,
      'documentType': documentType.name,
      'category': category,
      'icon': icon,
      'color': color,
      'content': content,
      'contentHtml': contentHtml,
      'placeholders': placeholders.map((e) => e.toJson()).toList(),
      'signatureFields': signatureFields.map((e) => e.toJson()).toList(),
      'settings': settings,
      'isSystem': isSystem,
      'isFeatured': isFeatured,
      'usageCount': usageCount,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  DocumentTemplate copyWith({
    String? id,
    String? workspaceId,
    String? name,
    String? slug,
    String? description,
    DocumentType? documentType,
    String? category,
    String? icon,
    String? color,
    Map<String, dynamic>? content,
    String? contentHtml,
    List<TemplatePlaceholder>? placeholders,
    List<SignatureField>? signatureFields,
    Map<String, dynamic>? settings,
    bool? isSystem,
    bool? isFeatured,
    int? usageCount,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return DocumentTemplate(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      description: description ?? this.description,
      documentType: documentType ?? this.documentType,
      category: category ?? this.category,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      content: content ?? this.content,
      contentHtml: contentHtml ?? this.contentHtml,
      placeholders: placeholders ?? this.placeholders,
      signatureFields: signatureFields ?? this.signatureFields,
      settings: settings ?? this.settings,
      isSystem: isSystem ?? this.isSystem,
      isFeatured: isFeatured ?? this.isFeatured,
      usageCount: usageCount ?? this.usageCount,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Check if this template requires signatures
  bool get requiresSignature => signatureFields.isNotEmpty;

  /// Get total required placeholders
  int get requiredPlaceholdersCount => placeholders.where((p) => p.required).length;
}
