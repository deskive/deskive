/// User Signature Model
/// Represents a saved signature for e-signature functionality

/// Signature type enum
enum SignatureType {
  drawn,
  typed,
  uploaded;

  String get displayName {
    switch (this) {
      case SignatureType.drawn:
        return 'Drawn';
      case SignatureType.typed:
        return 'Typed';
      case SignatureType.uploaded:
        return 'Uploaded';
    }
  }

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

/// User Signature model
class UserSignature {
  final String id;
  final String workspaceId;
  final String userId;
  final String name;
  final SignatureType signatureType;
  final String signatureData;
  final String? typedName;
  final String? fontFamily;
  final bool isDefault;
  final bool isDeleted;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserSignature({
    required this.id,
    required this.workspaceId,
    required this.userId,
    required this.name,
    required this.signatureType,
    required this.signatureData,
    this.typedName,
    this.fontFamily,
    this.isDefault = false,
    this.isDeleted = false,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserSignature.fromJson(Map<String, dynamic> json) {
    return UserSignature(
      id: json['id']?.toString() ?? '',
      workspaceId: json['workspaceId']?.toString() ?? json['workspace_id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? json['user_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      signatureType: SignatureType.fromString(
        json['signatureType']?.toString() ?? json['signature_type']?.toString() ?? 'drawn',
      ),
      signatureData: json['signatureData']?.toString() ?? json['signature_data']?.toString() ?? '',
      typedName: json['typedName']?.toString() ?? json['typed_name']?.toString(),
      fontFamily: json['fontFamily']?.toString() ?? json['font_family']?.toString(),
      isDefault: json['isDefault'] == true || json['is_default'] == true,
      isDeleted: json['isDeleted'] == true || json['is_deleted'] == true,
      deletedAt: json['deletedAt'] != null || json['deleted_at'] != null
          ? DateTime.tryParse(json['deletedAt']?.toString() ?? json['deleted_at']?.toString() ?? '')
          : null,
      createdAt: DateTime.tryParse(
              json['createdAt']?.toString() ?? json['created_at']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt: DateTime.tryParse(
              json['updatedAt']?.toString() ?? json['updated_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'userId': userId,
      'name': name,
      'signatureType': signatureType.name,
      'signatureData': signatureData,
      'typedName': typedName,
      'fontFamily': fontFamily,
      'isDefault': isDefault,
      'isDeleted': isDeleted,
      'deletedAt': deletedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  UserSignature copyWith({
    String? id,
    String? workspaceId,
    String? userId,
    String? name,
    SignatureType? signatureType,
    String? signatureData,
    String? typedName,
    String? fontFamily,
    bool? isDefault,
    bool? isDeleted,
    DateTime? deletedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserSignature(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      signatureType: signatureType ?? this.signatureType,
      signatureData: signatureData ?? this.signatureData,
      typedName: typedName ?? this.typedName,
      fontFamily: fontFamily ?? this.fontFamily,
      isDefault: isDefault ?? this.isDefault,
      isDeleted: isDeleted ?? this.isDeleted,
      deletedAt: deletedAt ?? this.deletedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Check if this is a drawn signature (has image data)
  bool get isDrawnSignature => signatureType == SignatureType.drawn;

  /// Check if this is a typed signature
  bool get isTypedSignature => signatureType == SignatureType.typed;

  /// Check if this is an uploaded signature
  bool get isUploadedSignature => signatureType == SignatureType.uploaded;
}
