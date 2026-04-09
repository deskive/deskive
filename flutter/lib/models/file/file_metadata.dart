/// File metadata model
class FileMetadata {
  final List<String>? tags;
  final String? description;
  final String? originalName;

  FileMetadata({
    this.tags,
    this.description,
    this.originalName,
  });

  factory FileMetadata.fromJson(Map<String, dynamic> json) {
    return FileMetadata(
      tags: json['tags'] != null
          ? (json['tags'] as List<dynamic>).map((e) => e as String).toList()
          : null,
      description: json['description'] as String?,
      originalName: json['original_name'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tags': tags,
      'description': description,
      'original_name': originalName,
    };
  }
}
