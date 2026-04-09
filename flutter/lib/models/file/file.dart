import 'file_metadata.dart';

/// File model representing a file entity
class File {
  final String id;
  final String workspaceId;
  final String name;
  final String storagePath;
  final String mimeType;
  final String size;
  final String uploadedBy;
  final String? folderId;
  final List<String> parentFolderIds;
  final int version;
  final String? previousVersionId;
  final String? fileHash;
  final String virusScanStatus;
  final DateTime? virusScanAt;
  final String? extractedText;
  final String? ocrStatus;
  final FileMetadata? metadata;
  final Map<String, dynamic>? collaborativeData;
  final bool? isDeleted;
  final DateTime? deletedAt;
  final String? deletedBy;
  final bool? starred;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? url; // Direct URL to the file (e.g., S3 URL)

  File({
    required this.id,
    required this.workspaceId,
    required this.name,
    required this.storagePath,
    required this.mimeType,
    required this.size,
    required this.uploadedBy,
    this.folderId,
    required this.parentFolderIds,
    required this.version,
    this.previousVersionId,
    this.fileHash,
    required this.virusScanStatus,
    this.virusScanAt,
    this.extractedText,
    this.ocrStatus,
    this.metadata,
    this.collaborativeData,
    this.isDeleted,
    this.deletedAt,
    this.deletedBy,
    this.starred,
    this.createdAt,
    this.updatedAt,
    this.url,
  });

  factory File.fromJson(Map<String, dynamic> json) {
    return File(
      id: json['id'] as String,
      workspaceId: json['workspace_id'] as String,
      name: json['name'] as String,
      storagePath: json['storage_path'] as String,
      mimeType: json['mime_type'] as String,
      size: json['size'] as String,
      uploadedBy: json['uploaded_by'] as String,
      folderId: json['folder_id'] as String?,
      parentFolderIds: json['parent_folder_ids'] != null
          ? (json['parent_folder_ids'] as List<dynamic>)
              .map((e) => e as String)
              .toList()
          : [],
      version: json['version'] as int,
      previousVersionId: json['previous_version_id'] as String?,
      fileHash: json['file_hash'] as String?,
      virusScanStatus: json['virus_scan_status'] as String,
      virusScanAt: json['virus_scan_at'] != null
          ? DateTime.parse(json['virus_scan_at'] as String)
          : null,
      extractedText: json['extracted_text'] as String?,
      ocrStatus: json['ocr_status'] as String?,
      metadata: json['metadata'] != null
          ? FileMetadata.fromJson(json['metadata'] as Map<String, dynamic>)
          : null,
      collaborativeData: json['collaborative_data'] as Map<String, dynamic>?,
      isDeleted: json['is_deleted'] as bool?,
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
      deletedBy: json['deleted_by'] as String?,
      starred: json['starred'] as bool?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      url: json['url'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspace_id': workspaceId,
      'name': name,
      'storage_path': storagePath,
      'mime_type': mimeType,
      'size': size,
      'uploaded_by': uploadedBy,
      'folder_id': folderId,
      'parent_folder_ids': parentFolderIds,
      'version': version,
      'previous_version_id': previousVersionId,
      'file_hash': fileHash,
      'virus_scan_status': virusScanStatus,
      'virus_scan_at': virusScanAt?.toIso8601String(),
      'extracted_text': extractedText,
      'ocr_status': ocrStatus,
      'metadata': metadata?.toJson(),
      'collaborative_data': collaborativeData,
      'is_deleted': isDeleted,
      'deleted_at': deletedAt?.toIso8601String(),
      'deleted_by': deletedBy,
      'starred': starred,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'url': url,
    };
  }

  /// Get file size in bytes as integer
  int get sizeInBytes => int.tryParse(size) ?? 0;

  /// Get file extension
  String get extension {
    final parts = name.split('.');
    return parts.length > 1 ? parts.last.toLowerCase() : '';
  }

  /// Check if file is an image
  bool get isImage => mimeType.startsWith('image/');

  /// Check if file is a video
  bool get isVideo => mimeType.startsWith('video/');

  /// Check if file is audio
  bool get isAudio => mimeType.startsWith('audio/');

  /// Check if file is a PDF
  bool get isPdf => mimeType == 'application/pdf';

  /// Check if file is a spreadsheet
  bool get isSpreadsheet =>
      mimeType.contains('spreadsheet') ||
      mimeType.contains('excel') ||
      mimeType == 'text/csv';

  /// Check if file is a document (anything that's NOT image, video, audio, pdf, or spreadsheet)
  /// This includes: .zip, .env, .json, .xml, word docs, text files, etc.
  bool get isDocument => !isImage && !isVideo && !isAudio && !isPdf && !isSpreadsheet;

  /// Create a copy of this File with updated fields
  File copyWith({
    String? id,
    String? workspaceId,
    String? name,
    String? storagePath,
    String? mimeType,
    String? size,
    String? uploadedBy,
    String? folderId,
    List<String>? parentFolderIds,
    int? version,
    String? previousVersionId,
    String? fileHash,
    String? virusScanStatus,
    DateTime? virusScanAt,
    String? extractedText,
    String? ocrStatus,
    FileMetadata? metadata,
    Map<String, dynamic>? collaborativeData,
    bool? isDeleted,
    DateTime? deletedAt,
    String? deletedBy,
    bool? starred,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? url,
  }) {
    return File(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      name: name ?? this.name,
      storagePath: storagePath ?? this.storagePath,
      mimeType: mimeType ?? this.mimeType,
      size: size ?? this.size,
      uploadedBy: uploadedBy ?? this.uploadedBy,
      folderId: folderId ?? this.folderId,
      parentFolderIds: parentFolderIds ?? this.parentFolderIds,
      version: version ?? this.version,
      previousVersionId: previousVersionId ?? this.previousVersionId,
      fileHash: fileHash ?? this.fileHash,
      virusScanStatus: virusScanStatus ?? this.virusScanStatus,
      virusScanAt: virusScanAt ?? this.virusScanAt,
      extractedText: extractedText ?? this.extractedText,
      ocrStatus: ocrStatus ?? this.ocrStatus,
      metadata: metadata ?? this.metadata,
      collaborativeData: collaborativeData ?? this.collaborativeData,
      isDeleted: isDeleted ?? this.isDeleted,
      deletedAt: deletedAt ?? this.deletedAt,
      deletedBy: deletedBy ?? this.deletedBy,
      starred: starred ?? this.starred,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      url: url ?? this.url,
    );
  }
}
