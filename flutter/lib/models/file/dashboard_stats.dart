/// Dashboard statistics model for files and storage
class DashboardStats {
  final int totalFiles;
  final int filesAddedToday;
  final int storageUsedBytes;
  final String storageUsedFormatted;
  final int storageTotalBytes;
  final String storageTotalFormatted;
  final double storagePercentageUsed;
  final int aiGenerationsThisMonth;
  final int uniqueFileTypes;
  final FileTypeBreakdown fileTypeBreakdown;

  DashboardStats({
    required this.totalFiles,
    required this.filesAddedToday,
    required this.storageUsedBytes,
    required this.storageUsedFormatted,
    required this.storageTotalBytes,
    required this.storageTotalFormatted,
    required this.storagePercentageUsed,
    required this.aiGenerationsThisMonth,
    required this.uniqueFileTypes,
    required this.fileTypeBreakdown,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalFiles: json['total_files'] as int? ?? 0,
      filesAddedToday: json['files_added_today'] as int? ?? 0,
      storageUsedBytes: json['storage_used_bytes'] as int? ?? 0,
      storageUsedFormatted: json['storage_used_formatted'] as String? ?? '0 B',
      storageTotalBytes: json['storage_total_bytes'] as int? ?? 0,
      storageTotalFormatted: json['storage_total_formatted'] as String? ?? '0 B',
      storagePercentageUsed: (json['storage_percentage_used'] as num?)?.toDouble() ?? 0.0,
      aiGenerationsThisMonth: json['ai_generations_this_month'] as int? ?? 0,
      uniqueFileTypes: json['unique_file_types'] as int? ?? 0,
      fileTypeBreakdown: FileTypeBreakdown.fromJson(
        json['file_type_breakdown'] as Map<String, dynamic>? ?? {},
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_files': totalFiles,
      'files_added_today': filesAddedToday,
      'storage_used_bytes': storageUsedBytes,
      'storage_used_formatted': storageUsedFormatted,
      'storage_total_bytes': storageTotalBytes,
      'storage_total_formatted': storageTotalFormatted,
      'storage_percentage_used': storagePercentageUsed,
      'ai_generations_this_month': aiGenerationsThisMonth,
      'unique_file_types': uniqueFileTypes,
      'file_type_breakdown': fileTypeBreakdown.toJson(),
    };
  }

  /// Get free storage in bytes
  int get storageFreeBytes => storageTotalBytes - storageUsedBytes;

  /// Get free storage formatted as human-readable string
  String get storageFreeFormatted {
    final bytes = storageFreeBytes;
    if (bytes < 0) return '0 B';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}

/// File type breakdown statistics
class FileTypeBreakdown {
  final int images;
  final int videos;
  final int audio;
  final int documents;
  final int spreadsheets;
  final int pdfs;

  FileTypeBreakdown({
    required this.images,
    required this.videos,
    required this.audio,
    required this.documents,
    required this.spreadsheets,
    required this.pdfs,
  });

  factory FileTypeBreakdown.fromJson(Map<String, dynamic> json) {
    return FileTypeBreakdown(
      images: json['images'] as int? ?? 0,
      videos: json['videos'] as int? ?? 0,
      audio: json['audio'] as int? ?? 0,
      documents: json['documents'] as int? ?? 0,
      spreadsheets: json['spreadsheets'] as int? ?? 0,
      pdfs: json['pdfs'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'images': images,
      'videos': videos,
      'audio': audio,
      'documents': documents,
      'spreadsheets': spreadsheets,
      'pdfs': pdfs,
    };
  }

  /// Get total count of all file types
  int get total => images + videos + audio + documents + spreadsheets + pdfs;

  /// Get list of non-zero file types with their counts
  List<MapEntry<String, int>> get nonZeroTypes {
    final types = <MapEntry<String, int>>[];
    if (images > 0) types.add(MapEntry('Images', images));
    if (videos > 0) types.add(MapEntry('Videos', videos));
    if (audio > 0) types.add(MapEntry('Audio', audio));
    if (documents > 0) types.add(MapEntry('Documents', documents));
    if (spreadsheets > 0) types.add(MapEntry('Spreadsheets', spreadsheets));
    if (pdfs > 0) types.add(MapEntry('PDFs', pdfs));
    return types;
  }
}
