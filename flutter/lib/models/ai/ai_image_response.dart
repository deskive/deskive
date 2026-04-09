/// AI Image Generation Response Model
class AIImageResponse {
  final List<String> imageUrls;
  final List<QueuedImageInfo> queuedImages;
  final bool isQueued;
  final ImageSpecifications? specifications;
  final GenerationParams? generationParams;
  final String timestamp;
  final String requestId;
  final UsageStats? usage;

  AIImageResponse({
    required this.imageUrls,
    required this.queuedImages,
    required this.isQueued,
    this.specifications,
    this.generationParams,
    required this.timestamp,
    required this.requestId,
    this.usage,
  });

  factory AIImageResponse.fromJson(Map<String, dynamic> json) {
    final List<String> urls = [];
    final List<QueuedImageInfo> queued = [];
    bool hasQueuedImages = false;

    // Parse image_urls which can be either strings or objects
    final imageUrlsData = json['image_urls'] as List?;
    if (imageUrlsData != null) {
      for (var item in imageUrlsData) {
        if (item is String) {
          // Direct URL string
          if (item.isNotEmpty) {
            urls.add(item);
          }
        } else if (item is Map<String, dynamic>) {
          // Object with url, queueJobId, queued properties
          final url = item['url'] as String?;
          final queueJobId = item['queueJobId'] as String?;
          final isQueued = item['queued'] as bool? ?? false;

          if (isQueued && queueJobId != null) {
            // This is a queued image
            queued.add(QueuedImageInfo(
              queueJobId: queueJobId,
              url: url ?? '',
            ));
            hasQueuedImages = true;
          } else if (url != null && url.isNotEmpty) {
            // This is a completed image
            urls.add(url);
          }
        }
      }
    }

    return AIImageResponse(
      imageUrls: urls,
      queuedImages: queued,
      isQueued: hasQueuedImages,
      specifications: json['specifications'] != null
          ? ImageSpecifications.fromJson(json['specifications'])
          : null,
      generationParams: json['generation_params'] != null
          ? GenerationParams.fromJson(json['generation_params'])
          : null,
      timestamp: json['timestamp'] ?? DateTime.now().toIso8601String(),
      requestId: json['request_id'] ?? '',
      usage: json['usage'] != null ? UsageStats.fromJson(json['usage']) : null,
    );
  }
}

/// Queued Image Information
class QueuedImageInfo {
  final String queueJobId;
  final String url;

  QueuedImageInfo({
    required this.queueJobId,
    required this.url,
  });
}

class ImageSpecifications {
  final int width;
  final int height;
  final String format;
  final String quality;

  ImageSpecifications({
    required this.width,
    required this.height,
    required this.format,
    required this.quality,
  });

  factory ImageSpecifications.fromJson(Map<String, dynamic> json) {
    return ImageSpecifications(
      width: json['width'] ?? 512,
      height: json['height'] ?? 512,
      format: json['format'] ?? 'png',
      quality: json['quality'] ?? 'standard',
    );
  }
}

class GenerationParams {
  final String? style;
  final int? steps;
  final double? guidanceScale;
  final int? seed;

  GenerationParams({
    this.style,
    this.steps,
    this.guidanceScale,
    this.seed,
  });

  factory GenerationParams.fromJson(Map<String, dynamic> json) {
    return GenerationParams(
      style: json['style'],
      steps: json['steps'],
      guidanceScale: json['guidance_scale']?.toDouble(),
      seed: json['seed'],
    );
  }
}

class UsageStats {
  final int imagesGenerated;
  final int processingTimeMs;

  UsageStats({
    required this.imagesGenerated,
    required this.processingTimeMs,
  });

  factory UsageStats.fromJson(Map<String, dynamic> json) {
    return UsageStats(
      imagesGenerated: json['images_generated'] ?? 0,
      processingTimeMs: json['processing_time_ms'] ?? 0,
    );
  }
}
