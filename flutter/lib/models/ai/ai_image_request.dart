/// AI Image Generation Request Model
class AIImageRequest {
  final String prompt;
  final String imageType;
  final String? style;
  final String? size;
  final String? quality;
  final int? count;
  final String? negativePrompt;
  final List<String>? colorPalette;
  final List<String>? mood;
  final String? lighting;
  final String? perspective;
  final String? medium;
  final String? artistReference;
  final int? seed;
  final int? steps;
  final double? guidanceScale;
  final bool? upscale;
  final bool? enhanceFace;

  AIImageRequest({
    required this.prompt,
    required this.imageType,
    this.style,
    this.size,
    this.quality,
    this.count,
    this.negativePrompt,
    this.colorPalette,
    this.mood,
    this.lighting,
    this.perspective,
    this.medium,
    this.artistReference,
    this.seed,
    this.steps,
    this.guidanceScale,
    this.upscale,
    this.enhanceFace,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'prompt': prompt,
      'image_type': imageType,
    };

    if (style != null) map['style'] = style;
    if (size != null) map['size'] = size;
    if (quality != null) map['quality'] = quality;
    if (count != null) map['count'] = count;
    if (negativePrompt != null) map['negative_prompt'] = negativePrompt;
    if (colorPalette != null && colorPalette!.isNotEmpty) {
      map['color_palette'] = colorPalette;
    }
    if (mood != null && mood!.isNotEmpty) map['mood'] = mood;
    if (lighting != null) map['lighting'] = lighting;
    if (perspective != null) map['perspective'] = perspective;
    if (medium != null) map['medium'] = medium;
    if (artistReference != null) map['artist_reference'] = artistReference;
    if (seed != null) map['seed'] = seed;
    if (steps != null) map['steps'] = steps;
    if (guidanceScale != null) map['guidance_scale'] = guidanceScale;
    if (upscale != null) map['upscale'] = upscale;
    if (enhanceFace != null) map['enhance_face'] = enhanceFace;

    return map;
  }
}
