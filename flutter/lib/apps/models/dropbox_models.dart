// Models for Dropbox integration

/// Dropbox connection status
class DropboxConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? accountId;
  final String? dropboxEmail;
  final String? dropboxName;
  final String? dropboxPicture;
  final bool isActive;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;

  DropboxConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.accountId,
    this.dropboxEmail,
    this.dropboxName,
    this.dropboxPicture,
    required this.isActive,
    this.lastSyncedAt,
    required this.createdAt,
  });

  factory DropboxConnection.fromJson(Map<String, dynamic> json) {
    return DropboxConnection(
      id: json['id'] as String,
      workspaceId: json['workspaceId'] as String,
      userId: json['userId'] as String,
      accountId: json['accountId'] as String?,
      dropboxEmail: json['dropboxEmail'] as String?,
      dropboxName: json['dropboxName'] as String?,
      dropboxPicture: json['dropboxPicture'] as String?,
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
      'accountId': accountId,
      'dropboxEmail': dropboxEmail,
      'dropboxName': dropboxName,
      'dropboxPicture': dropboxPicture,
      'isActive': isActive,
      'lastSyncedAt': lastSyncedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// File type enum for Dropbox files
enum DropboxFileType {
  file,
  folder,
  image,
  video,
  audio,
  document,
  pdf,
  archive,
}

extension DropboxFileTypeExtension on DropboxFileType {
  static DropboxFileType fromString(String value) {
    switch (value) {
      case 'folder':
        return DropboxFileType.folder;
      case 'image':
        return DropboxFileType.image;
      case 'video':
        return DropboxFileType.video;
      case 'audio':
        return DropboxFileType.audio;
      case 'document':
        return DropboxFileType.document;
      case 'pdf':
        return DropboxFileType.pdf;
      case 'archive':
        return DropboxFileType.archive;
      default:
        return DropboxFileType.file;
    }
  }
}

/// Dropbox file/folder model
class DropboxFile {
  final String id;
  final String name;
  final String pathLower;
  final String pathDisplay;
  final int? size;
  final DateTime? clientModified;
  final DateTime? serverModified;
  final String? rev;
  final String? contentHash;
  final String? temporaryLink;
  final String? thumbnailLink;
  final DropboxFileType fileType;
  final bool isDownloadable;

  DropboxFile({
    required this.id,
    required this.name,
    required this.pathLower,
    required this.pathDisplay,
    this.size,
    this.clientModified,
    this.serverModified,
    this.rev,
    this.contentHash,
    this.temporaryLink,
    this.thumbnailLink,
    required this.fileType,
    required this.isDownloadable,
  });

  bool get isFolder => fileType == DropboxFileType.folder;

  factory DropboxFile.fromJson(Map<String, dynamic> json) {
    return DropboxFile(
      id: json['id'] as String? ?? json['pathLower'] as String? ?? '',
      name: json['name'] as String? ?? '',
      pathLower: json['pathLower'] as String? ?? '',
      pathDisplay: json['pathDisplay'] as String? ?? json['pathLower'] as String? ?? '',
      size: json['size'] as int?,
      clientModified: json['clientModified'] != null
          ? DateTime.parse(json['clientModified'] as String)
          : null,
      serverModified: json['serverModified'] != null
          ? DateTime.parse(json['serverModified'] as String)
          : null,
      rev: json['rev'] as String?,
      contentHash: json['contentHash'] as String?,
      temporaryLink: json['temporaryLink'] as String?,
      thumbnailLink: json['thumbnailLink'] as String?,
      fileType: DropboxFileTypeExtension.fromString(
        json['fileType'] as String? ?? 'file',
      ),
      isDownloadable: json['isDownloadable'] as bool? ?? true,
    );
  }
}

/// Parameters for listing files
class DropboxListFilesParams {
  final String? path;
  final String? query;
  final String? cursor;
  final int? limit;
  final bool? includeDeleted;
  final bool? recursive;

  DropboxListFilesParams({
    this.path,
    this.query,
    this.cursor,
    this.limit,
    this.includeDeleted,
    this.recursive,
  });

  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};
    if (path != null && path!.isNotEmpty) params['path'] = path;
    if (query != null && query!.isNotEmpty) params['query'] = query;
    if (cursor != null) params['cursor'] = cursor;
    if (limit != null) params['limit'] = limit.toString();
    if (includeDeleted == true) params['includeDeleted'] = 'true';
    if (recursive == true) params['recursive'] = 'true';
    return params;
  }
}

/// Response for listing files
class DropboxListFilesResponse {
  final List<DropboxFile> files;
  final String? cursor;
  final bool hasMore;

  DropboxListFilesResponse({
    required this.files,
    this.cursor,
    required this.hasMore,
  });

  factory DropboxListFilesResponse.fromJson(Map<String, dynamic> json) {
    return DropboxListFilesResponse(
      files: (json['files'] as List<dynamic>?)
              ?.map((e) => DropboxFile.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      cursor: json['cursor'] as String?,
      hasMore: json['hasMore'] as bool? ?? false,
    );
  }
}

/// Response for importing a file
class DropboxImportFileResponse {
  final bool success;
  final String deskiveFileId;
  final String fileName;
  final int fileSize;
  final String mimeType;
  final String url;

  DropboxImportFileResponse({
    required this.success,
    required this.deskiveFileId,
    required this.fileName,
    required this.fileSize,
    required this.mimeType,
    required this.url,
  });

  factory DropboxImportFileResponse.fromJson(Map<String, dynamic> json) {
    return DropboxImportFileResponse(
      success: json['success'] as bool? ?? false,
      deskiveFileId: json['deskiveFileId'] as String? ?? '',
      fileName: json['fileName'] as String? ?? '',
      fileSize: json['fileSize'] as int? ?? 0,
      mimeType: json['mimeType'] as String? ?? '',
      url: json['url'] as String? ?? '',
    );
  }
}

/// Response for exporting a file to Dropbox
class DropboxExportFileResponse {
  final bool success;
  final String dropboxPath;
  final String fileName;

  DropboxExportFileResponse({
    required this.success,
    required this.dropboxPath,
    required this.fileName,
  });

  factory DropboxExportFileResponse.fromJson(Map<String, dynamic> json) {
    return DropboxExportFileResponse(
      success: json['success'] as bool? ?? false,
      dropboxPath: json['dropboxPath'] as String? ?? '',
      fileName: json['fileName'] as String? ?? '',
    );
  }
}

/// Storage quota information
class DropboxStorageQuota {
  final int allocated;
  final int used;
  final String allocatedFormatted;
  final String usedFormatted;
  final int usagePercent;

  DropboxStorageQuota({
    required this.allocated,
    required this.used,
    required this.allocatedFormatted,
    required this.usedFormatted,
    required this.usagePercent,
  });

  factory DropboxStorageQuota.fromJson(Map<String, dynamic> json) {
    return DropboxStorageQuota(
      allocated: json['allocated'] as int? ?? 0,
      used: json['used'] as int? ?? 0,
      allocatedFormatted: json['allocatedFormatted'] as String? ?? '0 B',
      usedFormatted: json['usedFormatted'] as String? ?? '0 B',
      usagePercent: json['usagePercent'] as int? ?? 0,
    );
  }
}

/// Shared link response
class DropboxShareLinkResponse {
  final String url;
  final String name;
  final String pathLower;
  final String? expires;

  DropboxShareLinkResponse({
    required this.url,
    required this.name,
    required this.pathLower,
    this.expires,
  });

  factory DropboxShareLinkResponse.fromJson(Map<String, dynamic> json) {
    return DropboxShareLinkResponse(
      url: json['url'] as String? ?? '',
      name: json['name'] as String? ?? '',
      pathLower: json['pathLower'] as String? ?? '',
      expires: json['expires'] as String?,
    );
  }
}
