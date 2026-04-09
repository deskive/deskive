// Models for Google Drive integration

/// Google Drive connection status
class GoogleDriveConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? googleEmail;
  final String? googleName;
  final String? googlePicture;
  final bool isActive;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;

  GoogleDriveConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.googleEmail,
    this.googleName,
    this.googlePicture,
    required this.isActive,
    this.lastSyncedAt,
    required this.createdAt,
  });

  factory GoogleDriveConnection.fromJson(Map<String, dynamic> json) {
    return GoogleDriveConnection(
      id: json['id'] as String,
      workspaceId: json['workspaceId'] as String,
      userId: json['userId'] as String,
      googleEmail: json['googleEmail'] as String?,
      googleName: json['googleName'] as String?,
      googlePicture: json['googlePicture'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'userId': userId,
      'googleEmail': googleEmail,
      'googleName': googleName,
      'googlePicture': googlePicture,
      'isActive': isActive,
      'lastSyncedAt': lastSyncedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Google Drive drive (My Drive or Shared Drive)
class GoogleDriveDrive {
  final String id;
  final String name;
  final String? kind;

  GoogleDriveDrive({
    required this.id,
    required this.name,
    this.kind,
  });

  factory GoogleDriveDrive.fromJson(Map<String, dynamic> json) {
    return GoogleDriveDrive(
      id: json['id'] as String,
      name: json['name'] as String,
      kind: json['kind'] as String?,
    );
  }
}

/// File type enum for Google Drive files
enum GoogleDriveFileType {
  file,
  folder,
  document,
  spreadsheet,
  presentation,
  image,
  video,
  pdf,
}

extension GoogleDriveFileTypeExtension on GoogleDriveFileType {
  static GoogleDriveFileType fromString(String value) {
    switch (value) {
      case 'folder':
        return GoogleDriveFileType.folder;
      case 'document':
        return GoogleDriveFileType.document;
      case 'spreadsheet':
        return GoogleDriveFileType.spreadsheet;
      case 'presentation':
        return GoogleDriveFileType.presentation;
      case 'image':
        return GoogleDriveFileType.image;
      case 'video':
        return GoogleDriveFileType.video;
      case 'pdf':
        return GoogleDriveFileType.pdf;
      default:
        return GoogleDriveFileType.file;
    }
  }
}

/// Google Drive file/folder model
class GoogleDriveFile {
  final String id;
  final String name;
  final String mimeType;
  final int? size;
  final DateTime? createdTime;
  final DateTime? modifiedTime;
  final String? webViewLink;
  final String? webContentLink;
  final String? thumbnailLink;
  final String? iconLink;
  final GoogleDriveFileType fileType;
  final String? parentId;

  GoogleDriveFile({
    required this.id,
    required this.name,
    required this.mimeType,
    this.size,
    this.createdTime,
    this.modifiedTime,
    this.webViewLink,
    this.webContentLink,
    this.thumbnailLink,
    this.iconLink,
    required this.fileType,
    this.parentId,
  });

  bool get isFolder => fileType == GoogleDriveFileType.folder;

  factory GoogleDriveFile.fromJson(Map<String, dynamic> json) {
    return GoogleDriveFile(
      id: json['id'] as String,
      name: json['name'] as String,
      mimeType: json['mimeType'] as String? ?? '',
      size: json['size'] as int?,
      createdTime: json['createdTime'] != null
          ? DateTime.parse(json['createdTime'] as String)
          : null,
      modifiedTime: json['modifiedTime'] != null
          ? DateTime.parse(json['modifiedTime'] as String)
          : null,
      webViewLink: json['webViewLink'] as String?,
      webContentLink: json['webContentLink'] as String?,
      thumbnailLink: json['thumbnailLink'] as String?,
      iconLink: json['iconLink'] as String?,
      fileType: GoogleDriveFileTypeExtension.fromString(
        json['fileType'] as String? ?? 'file',
      ),
      parentId: json['parentId'] as String?,
    );
  }
}

/// Parameters for listing files
class ListFilesParams {
  final String? folderId;
  final String? driveId;
  final String? query;
  final String? fileType;
  final String? pageToken;
  final int? pageSize;
  final bool? includeTrashed;
  final String? view; // 'recent' | 'starred' | 'trash' | 'shared'

  ListFilesParams({
    this.folderId,
    this.driveId,
    this.query,
    this.fileType,
    this.pageToken,
    this.pageSize,
    this.includeTrashed,
    this.view,
  });

  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};
    if (folderId != null) params['folderId'] = folderId;
    if (driveId != null) params['driveId'] = driveId;
    if (query != null) params['query'] = query;
    if (fileType != null) params['fileType'] = fileType;
    if (pageToken != null) params['pageToken'] = pageToken;
    if (pageSize != null) params['pageSize'] = pageSize.toString();
    if (includeTrashed == true) params['includeTrashed'] = 'true';
    if (view != null) params['view'] = view;
    return params;
  }
}

/// Response for listing files
class ListFilesResponse {
  final List<GoogleDriveFile> files;
  final String? nextPageToken;

  ListFilesResponse({
    required this.files,
    this.nextPageToken,
  });

  factory ListFilesResponse.fromJson(Map<String, dynamic> json) {
    return ListFilesResponse(
      files: (json['files'] as List<dynamic>?)
              ?.map((e) => GoogleDriveFile.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      nextPageToken: json['nextPageToken'] as String?,
    );
  }
}

/// Response for importing a file
class ImportFileResponse {
  final bool success;
  final String deskiveFileId;
  final String fileName;
  final int fileSize;
  final String mimeType;
  final String url;

  ImportFileResponse({
    required this.success,
    required this.deskiveFileId,
    required this.fileName,
    required this.fileSize,
    required this.mimeType,
    required this.url,
  });

  factory ImportFileResponse.fromJson(Map<String, dynamic> json) {
    return ImportFileResponse(
      success: json['success'] as bool? ?? false,
      deskiveFileId: json['deskiveFileId'] as String? ?? '',
      fileName: json['fileName'] as String? ?? '',
      fileSize: json['fileSize'] as int? ?? 0,
      mimeType: json['mimeType'] as String? ?? '',
      url: json['url'] as String? ?? '',
    );
  }
}

/// Response for exporting a file to Google Drive
class ExportFileResponse {
  final bool success;
  final String driveFileId;
  final String fileName;
  final String? webViewLink;
  final String? message;

  ExportFileResponse({
    required this.success,
    required this.driveFileId,
    required this.fileName,
    this.webViewLink,
    this.message,
  });

  factory ExportFileResponse.fromJson(Map<String, dynamic> json) {
    return ExportFileResponse(
      success: json['success'] as bool? ?? false,
      driveFileId: json['driveFileId'] as String? ?? json['fileId'] as String? ?? '',
      fileName: json['fileName'] as String? ?? json['name'] as String? ?? '',
      webViewLink: json['webViewLink'] as String? ?? json['link'] as String?,
      message: json['message'] as String?,
    );
  }
}
