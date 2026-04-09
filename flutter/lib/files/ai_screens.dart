import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:dio/dio.dart';
import 'package:gal/gal.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../theme/app_theme.dart';
import '../services/ai_service.dart';
import '../models/ai/ai_image_request.dart';
import '../models/ai/ai_image_response.dart';

class AIImageScreen extends StatefulWidget {
  const AIImageScreen({super.key});

  @override
  State<AIImageScreen> createState() => _AIImageScreenState();
}

class _AIImageScreenState extends State<AIImageScreen> {
  final TextEditingController _promptController = TextEditingController();
  final AIService _aiService = AIService();

  bool _isGenerating = false;
  bool _isCancelled = false;
  String _selectedStyle = 'realistic';
  String _selectedSize = '1024x1024';
  String _selectedFormat = 'PNG';
  String _selectedUseCase = 'general';

  // Generated images state
  List<String> _generatedImageUrls = [];
  List<QueuedImageInfo> _queuedImages = [];
  String? _generationError;

  // Retry status tracking
  int _currentRetryAttempt = 0;
  int _maxRetryAttempts = 30; // Max 30 attempts = 90 seconds
  String _generationStatus = '';

  final List<String> _styleKeys = [
    'realistic', 'cartoon', 'abstract', 'oil_painting', 'watercolor',
    'digital_art', 'sketch', 'photographic', 'anime', 'vintage'
  ];

  final List<String> _sizes = [
    '512x512', '1024x1024', '1024x768', '768x1024', '1920x1080', '1080x1920'
  ];

  final List<String> _formats = ['PNG', 'JPEG', 'WEBP'];

  final List<String> _useCaseKeys = [
    'general', 'social_media', 'marketing', 'presentation',
    'website', 'print', 'logo_design', 'illustration'
  ];

  String _getStyleTranslation(String key) => 'ai.style_$key'.tr();
  String _getUseCaseTranslation(String key) => 'ai.use_case_$key'.tr();

  List<String> get _illustrationPrompts => [
    'ai.prompt_mountain_sunset'.tr(),
    'ai.prompt_geometric_shapes'.tr(),
    'ai.prompt_coffee_shop'.tr(),
    'ai.prompt_futuristic_city'.tr(),
    'ai.prompt_underwater_coral'.tr(),
    'ai.prompt_fantasy_forest'.tr(),
    'ai.prompt_minimalist_workspace'.tr(),
    'ai.prompt_vintage_car'.tr(),
  ];

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('files.ai_image'.tr()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Main Generation Card
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ai.generate_ai_images'.tr(),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Prompt Input
                    TextField(
                      controller: _promptController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'ai.image_prompt_hint'.tr(),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // Style and Size Row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ai.style'.tr(),
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                value: _selectedStyle,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: _styleKeys.map((styleKey) {
                                  return DropdownMenuItem(
                                    value: styleKey,
                                    child: Text(_getStyleTranslation(styleKey)),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setState(() {
                                    _selectedStyle = value!;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ai.size'.tr(),
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                value: _selectedSize,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: _sizes.map((size) {
                                  return DropdownMenuItem(
                                    value: size,
                                    child: Text(size),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setState(() {
                                    _selectedSize = value!;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    
                    // Format and Use Case Row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ai.format'.tr(),
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                value: _selectedFormat,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: _formats.map((format) {
                                  return DropdownMenuItem(
                                    value: format,
                                    child: Text(format),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setState(() {
                                    _selectedFormat = value!;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ai.use_case'.tr(),
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                value: _selectedUseCase,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: _useCaseKeys.map((useCaseKey) {
                                  return DropdownMenuItem(
                                    value: useCaseKey,
                                    child: Text(_getUseCaseTranslation(useCaseKey)),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setState(() {
                                    _selectedUseCase = value!;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    
                    // Generate Button
                    SizedBox(
                      width: double.infinity,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: _isGenerating
                                ? [Colors.red, Colors.redAccent]
                                : [context.primaryColor, Color(0xFF8B6BFF)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ElevatedButton.icon(
                          onPressed: _isGenerating ? _cancelGeneration : _generateImage,
                          icon: _isGenerating
                              ? const Icon(Icons.stop)
                              : const Icon(Icons.auto_awesome),
                          label: Text(_isGenerating ? 'ai.cancel_generation'.tr() : 'ai.generate_image'.tr()),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            foregroundColor: Colors.white,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ).copyWith(
                            elevation: WidgetStateProperty.all(0),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Progress Indicator (only show when generating)
            if (_isGenerating && _currentRetryAttempt > 0) ...[
              Card(
                color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _generationStatus,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const LinearProgressIndicator(),
                      const SizedBox(height: 8),
                      Text(
                        'Please wait while your image is being generated...',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Generated Images Display
            if (_generatedImageUrls.isNotEmpty) ...[
              Text(
                'ai.generated_images'.tr(),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ...(_generatedImageUrls.map((url) => Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(5),
                              child: Image.network(
                                url,
                                fit: BoxFit.cover,
                                loadingBuilder: (context, child, loadingProgress) {
                                  if (loadingProgress == null) return child;
                                  return Container(
                                    height: 200,
                                    alignment: Alignment.center,
                                    child: CircularProgressIndicator(
                                      value: loadingProgress.expectedTotalBytes != null
                                          ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                          : null,
                                    ),
                                  );
                                },
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    height: 200,
                                    color: Colors.grey.withValues(alpha: 0.2),
                                    alignment: Alignment.center,
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.error, size: 48, color: Colors.red),
                                        const SizedBox(height: 8),
                                        Text('ai.failed_to_load_image'.tr()),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(height: 8),
                            ElevatedButton.icon(
                              onPressed: () => _showFullScreenImage(url),
                              icon: const Icon(Icons.fullscreen),
                              label: Text('ai.view_full_screen'.tr()),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).colorScheme.primary,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      )).toList()),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Error Display
            if (_generationError != null) ...[
              Card(
                color: Colors.red.withValues(alpha: 0.1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(5),
                  side: BorderSide(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.error, color: Colors.red),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'ai.generation_error'.tr(),
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Colors.red,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _generationError!,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Suggested Prompts Section
            Text(
              'ai.suggested_prompts'.tr(args: ['files.ai_image'.tr()]),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ai.click_to_use_prompt'.tr(),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _illustrationPrompts.map((prompt) {
                        return InkWell(
                          onTap: () {
                            setState(() {
                              _promptController.text = prompt;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(
                                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Text(
                              prompt,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Image Generation Tips Section
            Text(
              'ai.image_generation_tips'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTipItem(
                      context,
                      '🎯 Be Specific',
                      'ai.tip_details'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '🎨 Choose the Right Style',
                      'ai.tip_match_style'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '📏 Size Matters',
                      'ai.tip_dimensions'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '🔄 Iterate and Refine',
                      'ai.tip_variations'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '💡 Use Keywords',
                      'ai.tip_artistic_terms'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '🚀 Start Simple',
                      'ai.tip_basic_prompts'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '🎭 Experiment with Styles',
                      'ai.tip_different_styles'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '📝 Use Descriptive Language',
                      'ai.tip_specific_descriptions'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '🔍 Consider Context',
                      'ai.tip_think_about_use'.tr(),
                    ),
                    _buildTipItem(
                      context,
                      '⚡ Save Your Best Prompts',
                      'Keep track of successful prompts and settings for future reference.',
                    ),
                    _buildTipItem(
                      context,
                      '🎪 Mix and Match',
                      'Combine different concepts, styles, and elements to create unique images.',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildTipItem(BuildContext context, String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _generateImage() async {
    if (_promptController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a prompt')),
      );
      return;
    }

    setState(() {
      _isGenerating = true;
      _isCancelled = false;
      _generationError = null;
      _generatedImageUrls = [];
      _queuedImages = [];
      _currentRetryAttempt = 0;
      _generationStatus = 'Starting generation...';
    });

    try {
      await _aiService.initialize();

      // Map UI selections to backend expected values
      String imageType;
      switch (_selectedUseCase) {
        case 'Social Media':
          imageType = 'social_media';
          break;
        case 'Marketing':
          imageType = 'banner';
          break;
        case 'Presentation':
          imageType = 'illustration';
          break;
        case 'Website':
          imageType = 'photo';
          break;
        case 'Print':
          imageType = 'artwork';
          break;
        case 'Logo Design':
          imageType = 'logo';
          break;
        case 'Illustration':
          imageType = 'illustration';
          break;
        default:
          imageType = 'photo'; // General -> photo
      }

      // Map style to backend values (natural or vivid)
      String style = (_selectedStyle.toLowerCase() == 'realistic' ||
                      _selectedStyle.toLowerCase() == 'photographic')
          ? 'natural'
          : 'vivid';

      // Map format to quality (standard or hd)
      String quality = (_selectedFormat == 'PNG' || _selectedFormat == 'JPEG')
          ? 'standard'
          : 'hd';

      final request = AIImageRequest(
        prompt: _promptController.text.trim(),
        imageType: imageType,
        style: style,
        size: _selectedSize,
        quality: quality,
        count: 1,
      );


      final response = await _aiService.generateImageWithRetry(
        request,
        delayBetweenAttempts: const Duration(seconds: 3),
        onRetry: (attempt) {
          // Check if user cancelled generation
          if (_isCancelled) {
            throw Exception('Image generation cancelled by user');
          }

          // Check if max attempts reached
          if (attempt > _maxRetryAttempts) {
            throw Exception('Image generation timed out after $_maxRetryAttempts attempts (${_maxRetryAttempts * 3} seconds). The AI service may be busy. Please try again later.');
          }

          if (mounted) {
            setState(() {
              _currentRetryAttempt = attempt;
              final elapsedSeconds = attempt * 3;
              _generationStatus = 'Waiting for image... (Attempt $attempt/$_maxRetryAttempts - ${elapsedSeconds}s elapsed)';
            });
          }
        },
      );

      if (mounted) {
        setState(() {
          _generatedImageUrls = response.imageUrls;
          _queuedImages = response.queuedImages;
          _isGenerating = false;
          _generationStatus = 'Image generated successfully!';
        });

        if (_generatedImageUrls.isNotEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ Image generated successfully! (${_generatedImageUrls.length} image(s))'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {

      // Skip error display if user cancelled (already handled by _cancelGeneration)
      if (e.toString().contains('cancelled by user')) {
        return;
      }

      // Extract meaningful error message
      String errorMessage = 'Failed to generate image';
      if (e.toString().contains('Exception:')) {
        errorMessage = e.toString().replaceAll('Exception:', '').trim();
      } else if (e.toString().contains('DioException')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = e.toString();
      }

      if (mounted) {
        setState(() {
          _isGenerating = false;
          _generationError = errorMessage;
          _generationStatus = 'Generation failed';
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ $errorMessage'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  void _cancelGeneration() {
    if (mounted) {
      setState(() {
        _isCancelled = true;
        _isGenerating = false;
        _generationStatus = 'Generation cancelled by user';
        _generationError = 'Image generation was cancelled';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ Image generation cancelled'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _downloadImage(String imageUrl, BuildContext dialogContext) async {
    try {
      // Show downloading indicator
      ScaffoldMessenger.of(dialogContext).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
              SizedBox(width: 16),
              Text('Downloading image...'),
            ],
          ),
          duration: Duration(seconds: 2),
        ),
      );

      // Request storage permission on Android
      if (Platform.isAndroid) {
        final status = await Permission.storage.request();
        if (!status.isGranted) {
          // Try photos permission for Android 13+
          final photosStatus = await Permission.photos.request();
          if (!photosStatus.isGranted) {
            if (dialogContext.mounted) {
              ScaffoldMessenger.of(dialogContext).showSnackBar(
                const SnackBar(
                  content: Text('Storage permission is required to save images'),
                  backgroundColor: Colors.red,
                ),
              );
            }
            return;
          }
        }
      }

      // Download the image using Dio
      final dio = Dio();
      final response = await dio.get(
        imageUrl,
        options: Options(responseType: ResponseType.bytes),
      );

      if (response.statusCode == 200) {
        final bytes = response.data as List<int>;

        // Get temporary directory to save the file first
        final tempDir = await getTemporaryDirectory();
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final fileName = 'ai_image_$timestamp.png';
        final tempFile = File('${tempDir.path}/$fileName');

        // Write bytes to temp file
        await tempFile.writeAsBytes(Uint8List.fromList(bytes));

        // Save to gallery using gal package
        await Gal.putImage(tempFile.path, album: 'Deskive AI');

        // Delete temp file
        await tempFile.delete();

        if (dialogContext.mounted) {
          ScaffoldMessenger.of(dialogContext).clearSnackBars();
          ScaffoldMessenger.of(dialogContext).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 16),
                  Text('Image saved to gallery!'),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else {
        throw Exception('Failed to download image');
      }
    } catch (e) {
      debugPrint('Download error: $e');
      if (dialogContext.mounted) {
        ScaffoldMessenger.of(dialogContext).clearSnackBars();
        ScaffoldMessenger.of(dialogContext).showSnackBar(
          SnackBar(
            content: Text('Failed to download image: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showFullScreenImage(String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (dialogContext) => Scaffold(
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.of(dialogContext).pop(),
            ),
            title: const Text('Generated Image', style: TextStyle(color: Colors.white)),
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
            actions: [
              IconButton(
                icon: const Icon(Icons.download, color: Colors.white),
                onPressed: () => _downloadImage(imageUrl, dialogContext),
              ),
            ],
          ),
          backgroundColor: Colors.black,
          body: Center(
            child: InteractiveViewer(
              minScale: 0.5,
              maxScale: 4.0,
              child: Image.network(
                imageUrl,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Center(
                    child: CircularProgressIndicator(
                      value: loadingProgress.expectedTotalBytes != null
                          ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                          : null,
                    ),
                  );
                },
                errorBuilder: (context, error, stackTrace) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error, size: 48, color: Colors.red),
                        const SizedBox(height: 8),
                        Text('ai.failed_to_load_image'.tr(), style: const TextStyle(color: Colors.white)),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AIVideoScreen extends StatefulWidget {
  const AIVideoScreen({super.key});

  @override
  State<AIVideoScreen> createState() => _AIVideoScreenState();
}

class _AIVideoScreenState extends State<AIVideoScreen> {
  String _selectedVideoType = 'Screen Record';
  String _selectedResolution = '1080p';
  String _selectedFrameRate = '30fps';
  String _selectedQuality = 'High';
  double _maxDurationMinutes = 1.0; // Duration in minutes (1-60)
  bool _recordAudio = true;
  bool _showCursor = false;
  String _selectedPreset = 'Tutorial/Demo';

  final List<String> _resolutions = [
    '720p',
    '1080p',
    '1440p',
    '4K',
  ];

  final List<String> _frameRates = [
    '24fps',
    '30fps',
    '60fps',
    '120fps',
  ];

  final List<String> _qualities = [
    'Low',
    'Medium',
    'High',
    'Ultra',
  ];

  final List<Map<String, dynamic>> _presets = [
    {
      'name': 'Tutorial/Demo',
      'icon': Icons.school,
      'description': 'Step-by-step guides',
      'color': Colors.blue,
    },
    {
      'name': 'Presentation',
      'icon': Icons.present_to_all,
      'description': 'Professional presentations',
      'color': Colors.green,
    },
    {
      'name': 'Gaming/Action',
      'icon': Icons.sports_esports,
      'description': 'High-FPS gameplay',
      'color': Colors.orange,
    },
    {
      'name': 'Quick Capture',
      'icon': Icons.camera_alt,
      'description': 'Fast screen recording',
      'color': Colors.purple,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('files.ai_video'.tr()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Card
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.videocam,
                          size: 32,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'AI Video Creation',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Create professional videos with AI technology',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Video Creation Type
            Text(
              'Video Creation Type',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 140,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildVideoTypeCard(
                    type: 'Screen Record',
                    icon: Icons.screen_share,
                    description: 'Record your screen',
                    color: Colors.blue,
                  ),
                  _buildVideoTypeCard(
                    type: 'Video Editing',
                    icon: Icons.movie_edit,
                    description: 'Edit and enhance videos',
                    color: Colors.green,
                  ),
                  _buildVideoTypeCard(
                    type: 'Thumbnail Creation',
                    icon: Icons.photo_size_select_actual,
                    description: 'Create eye-catching thumbnails',
                    color: Colors.purple,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Content based on selected video type
            if (_selectedVideoType == 'Screen Record') ...[
              // Quick Presets Section
              Text(
                'Quick Presets',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            const SizedBox(height: 16),
            SizedBox(
              height: 140,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _presets.length,
                itemBuilder: (context, index) {
                  final preset = _presets[index];
                  final isSelected = _selectedPreset == preset['name'];
                  return Container(
                    width: 160,
                    margin: const EdgeInsets.only(right: 12),
                    child: Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(5),
                        side: BorderSide(
                          color: isSelected ? Theme.of(context).colorScheme.primary : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _selectedPreset = preset['name'];
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                preset['icon'],
                                size: 28,
                                color: preset['color'],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                preset['name'],
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                preset['description'],
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontSize: 11,
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 24),

            // Video Settings Card
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Video Settings',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Resolution and Frame Rate Row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Resolution',
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                value: _selectedResolution,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: _resolutions.map((resolution) {
                                  return DropdownMenuItem(
                                    value: resolution,
                                    child: Text(resolution),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setState(() {
                                    _selectedResolution = value!;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Frame Rate',
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                value: _selectedFrameRate,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: _frameRates.map((frameRate) {
                                  return DropdownMenuItem(
                                    value: frameRate,
                                    child: Text(frameRate),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setState(() {
                                    _selectedFrameRate = value!;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Quality Dropdown
                    Text(
                      'Quality',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedQuality,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: _qualities.map((quality) {
                        return DropdownMenuItem(
                          value: quality,
                          child: Text(quality),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedQuality = value!;
                        });
                      },
                    ),
                    const SizedBox(height: 16),

                    // Maximum Duration
                    Text(
                      'Maximum Duration',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Column(
                      children: [
                        SliderTheme(
                          data: SliderTheme.of(context).copyWith(
                            activeTrackColor: Theme.of(context).colorScheme.primary,
                            inactiveTrackColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
                            thumbColor: Theme.of(context).colorScheme.primary,
                            overlayColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
                            trackHeight: 4.0,
                            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                            showValueIndicator: ShowValueIndicator.always,
                          ),
                          child: Slider(
                            value: _maxDurationMinutes,
                            min: 1.0,
                            max: 60.0,
                            divisions: 59,
                            label: '${_maxDurationMinutes.round()} min',
                            onChanged: (value) {
                              setState(() {
                                _maxDurationMinutes = value;
                              });
                            },
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '1 min',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                              Text(
                                '30 min',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                              Text(
                                '60 min',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(
                                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.timer,
                                  size: 16,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Selected: ${_maxDurationMinutes.round()} minutes',
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Switch Options
                    Row(
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Icon(
                                Icons.mic,
                                size: 20,
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Record Audio',
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const Spacer(),
                              Switch(
                                value: _recordAudio,
                                onChanged: (value) {
                                  setState(() {
                                    _recordAudio = value;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Icon(
                                Icons.mouse,
                                size: 20,
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Show Cursor',
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const Spacer(),
                              Switch(
                                value: _showCursor,
                                onChanged: (value) {
                                  setState(() {
                                    _showCursor = value;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Generate Button
                    SizedBox(
                      width: double.infinity,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [context.primaryColor, Color(0xFF8B6BFF)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: ElevatedButton.icon(
                          onPressed: _generateVideo,
                          icon: const Icon(Icons.play_circle_fill),
                          label: const Text('Generate Video'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            foregroundColor: Colors.white,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ).copyWith(
                            elevation: WidgetStateProperty.all(0),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            ] else if (_selectedVideoType == 'Video Editing') ...[
              _buildVideoEditingContent(),
            ] else if (_selectedVideoType == 'Thumbnail Creation') ...[
              _buildThumbnailCreationContent(),
            ],
            const SizedBox(height: 24),
            
            // Video Creation Tips
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.tips_and_updates,
                          size: 24,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Video Creation Tips',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildTipItem(context, '• Choose appropriate resolution based on your target platform'),
                    _buildTipItem(context, '• Higher frame rates provide smoother motion'),
                    _buildTipItem(context, '• Balance quality with file size for optimal sharing'),
                    _buildTipItem(context, '• Enable audio recording for tutorials and presentations'),
                    _buildTipItem(context, '• Show cursor for better user guidance in demos'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // AI Creation Tips
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.auto_awesome,
                          size: 24,
                          color: Theme.of(context).colorScheme.secondary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'AI Creation Tips',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildTipItem(context, '• Use quick presets for common video types'),
                    _buildTipItem(context, '• AI optimizes encoding based on content type'),
                    _buildTipItem(context, '• Longer videos may take more processing time'),
                    _buildTipItem(context, '• Consider your audience when selecting quality'),
                    _buildTipItem(context, '• Preview settings before final generation'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
  
  Widget _buildTipItem(BuildContext context, String tip) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        tip,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          height: 1.5,
        ),
      ),
    );
  }

  Widget _buildVideoTypeCard({
    required String type,
    required IconData icon,
    required String description,
    required Color color,
  }) {
    final isSelected = _selectedVideoType == type;
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
          side: BorderSide(
            color: isSelected ? Theme.of(context).colorScheme.primary : Colors.transparent,
            width: 2,
          ),
        ),
        child: InkWell(
          onTap: () {
            setState(() {
              _selectedVideoType = type;
            });
          },
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 28,
                  color: color,
                ),
                const SizedBox(height: 6),
                Text(
                  type,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontSize: 9,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVideoEditingContent() {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.movie_edit,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Video Editing',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Coming soon! Edit and enhance your videos with AI-powered tools.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildThumbnailCreationContent() {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.photo_size_select_actual,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Thumbnail Creation',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Coming soon! Create eye-catching thumbnails with AI assistance.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }

  void _generateVideo() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Video generation started!\n'
          'Preset: $_selectedPreset | Resolution: $_selectedResolution | Frame Rate: $_selectedFrameRate\n'
          'Quality: $_selectedQuality | Duration: ${_maxDurationMinutes.round()} min | Audio: $_recordAudio | Cursor: $_showCursor',
        ),
        duration: const Duration(seconds: 5),
      ),
    );
  }
}

class AIAudioScreen extends StatefulWidget {
  const AIAudioScreen({super.key});

  @override
  State<AIAudioScreen> createState() => _AIAudioScreenState();
}

class _AIAudioScreenState extends State<AIAudioScreen> {
  String _selectedType = 'Text to Speech';
  
  // Text to Speech variables
  String _textToConvert = '';
  String _selectedTemplate = '';
  String _selectedVoice = 'Professional';
  String _selectedLanguage = 'English';
  String _selectedOutputFormat = 'MP3';
  double _speechSpeed = 1.0;
  
  // Audio Enhancement variables
  String? _selectedAudioFile;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('files.ai_audio'.tr()),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.audiotrack,
                        size: 32,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'AI Audio Tools',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Generate and edit audio using AI',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          
          // Audio Creation Type
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Audio Creation Type',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _selectedType = 'Text to Speech';
                            });
                          },
                          borderRadius: BorderRadius.circular(5),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                            decoration: BoxDecoration(
                              color: _selectedType == 'Text to Speech'
                                  ? Theme.of(context).colorScheme.primary
                                  : Colors.transparent,
                              border: Border.all(
                                color: _selectedType == 'Text to Speech'
                                    ? Theme.of(context).colorScheme.primary
                                    : Theme.of(context).colorScheme.outline,
                              ),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.record_voice_over,
                                  size: 20,
                                  color: _selectedType == 'Text to Speech'
                                      ? Theme.of(context).colorScheme.onPrimary
                                      : Theme.of(context).colorScheme.onSurface,
                                ),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    'Text to Speech',
                                    style: TextStyle(
                                      color: _selectedType == 'Text to Speech'
                                          ? Theme.of(context).colorScheme.onPrimary
                                          : Theme.of(context).colorScheme.onSurface,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _selectedType = 'Audio Enhancement';
                            });
                          },
                          borderRadius: BorderRadius.circular(5),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                            decoration: BoxDecoration(
                              color: _selectedType == 'Audio Enhancement'
                                  ? Theme.of(context).colorScheme.primary
                                  : Colors.transparent,
                              border: Border.all(
                                color: _selectedType == 'Audio Enhancement'
                                    ? Theme.of(context).colorScheme.primary
                                    : Theme.of(context).colorScheme.outline,
                              ),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.hearing,
                                  size: 20,
                                  color: _selectedType == 'Audio Enhancement'
                                      ? Theme.of(context).colorScheme.onPrimary
                                      : Theme.of(context).colorScheme.onSurface,
                                ),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    'Audio Enhancement',
                                    style: TextStyle(
                                      color: _selectedType == 'Audio Enhancement'
                                          ? Theme.of(context).colorScheme.onPrimary
                                          : Theme.of(context).colorScheme.onSurface,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Content based on selected type
          if (_selectedType == 'Text to Speech')
            _buildTextToSpeechContent()
          else
            _buildAudioEnhancementContent(),
          const SizedBox(height: 24),
          
          // Audio Creation Tips
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.tips_and_updates,
                        size: 24,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Audio Creation Tips',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildTipItem(context, '• Choose the right voice to match your content tone'),
                  _buildTipItem(context, '• Adjust speech speed for better comprehension'),
                  _buildTipItem(context, '• Use templates for consistent messaging'),
                  _buildTipItem(context, '• Select appropriate output format for your platform'),
                  _buildTipItem(context, '• Preview before finalizing your audio'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // AI Creation Tips
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.auto_awesome,
                        size: 24,
                        color: Theme.of(context).colorScheme.secondary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'AI Creation Tips',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildTipItem(context, '• AI can enhance audio quality automatically'),
                  _buildTipItem(context, '• Noise reduction works best with consistent background noise'),
                  _buildTipItem(context, '• Text-to-speech supports multiple languages and accents'),
                  _buildTipItem(context, '• Enhancement preserves original audio characteristics'),
                  _buildTipItem(context, '• Longer texts may require processing time'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
  
  Widget _buildTextToSpeechContent() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Text to Convert
            Text(
              'Text to Convert',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              maxLines: 5,
              decoration: InputDecoration(
                hintText: 'Enter the text you want to convert to speech...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
              onChanged: (value) {
                setState(() {
                  _textToConvert = value;
                });
              },
            ),
            const SizedBox(height: 16),
            
            // Quick Templates
            Text(
              'Quick Templates',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildTemplateChip('Welcome Message'),
                  _buildTemplateChip('Announcement'),
                  _buildTemplateChip('Tutorial Intro'),
                  _buildTemplateChip('Closing Remarks'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            
            // Voice Dropdown
            DropdownButtonFormField<String>(
              value: _selectedVoice,
              decoration: InputDecoration(
                labelText: 'Voice',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                prefixIcon: const Icon(Icons.mic),
              ),
              items: const [
                DropdownMenuItem(value: 'Professional', child: Text('Professional')),
                DropdownMenuItem(value: 'Casual', child: Text('Casual')),
                DropdownMenuItem(value: 'Energetic', child: Text('Energetic')),
                DropdownMenuItem(value: 'Calm', child: Text('Calm')),
                DropdownMenuItem(value: 'Storyteller', child: Text('Storyteller')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedVoice = value!;
                });
              },
            ),
            const SizedBox(height: 16),
            
            // Language Dropdown
            DropdownButtonFormField<String>(
              value: _selectedLanguage,
              decoration: InputDecoration(
                labelText: 'Language',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                prefixIcon: const Icon(Icons.language),
              ),
              items: const [
                DropdownMenuItem(value: 'English', child: Text('English')),
                DropdownMenuItem(value: 'Spanish', child: Text('Spanish')),
                DropdownMenuItem(value: 'French', child: Text('French')),
                DropdownMenuItem(value: 'German', child: Text('German')),
                DropdownMenuItem(value: 'Chinese', child: Text('Chinese')),
                DropdownMenuItem(value: 'Japanese', child: Text('Japanese')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedLanguage = value!;
                });
              },
            ),
            const SizedBox(height: 16),
            
            // Output Format Dropdown
            DropdownButtonFormField<String>(
              value: _selectedOutputFormat,
              decoration: InputDecoration(
                labelText: 'Output Format',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                prefixIcon: const Icon(Icons.audiotrack),
              ),
              items: const [
                DropdownMenuItem(value: 'MP3', child: Text('MP3')),
                DropdownMenuItem(value: 'WAV', child: Text('WAV')),
                DropdownMenuItem(value: 'M4A', child: Text('M4A')),
                DropdownMenuItem(value: 'FLAC', child: Text('FLAC')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedOutputFormat = value!;
                });
              },
            ),
            const SizedBox(height: 16),
            
            // Speech Speed
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.speed,
                      size: 20,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Speech Speed',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        '${_speechSpeed.toStringAsFixed(1)}x',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: Theme.of(context).colorScheme.primary,
                    inactiveTrackColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
                    thumbColor: Theme.of(context).colorScheme.primary,
                    overlayColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
                    trackHeight: 4.0,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                    showValueIndicator: ShowValueIndicator.always,
                  ),
                  child: Slider(
                    value: _speechSpeed,
                    min: 0.5,
                    max: 2.0,
                    divisions: 15,
                    label: '${_speechSpeed.toStringAsFixed(1)}x',
                    onChanged: (value) {
                      setState(() {
                        _speechSpeed = value;
                      });
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '0.5x',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        'Normal',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        '2.0x',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            
            // Generate Button
            SizedBox(
              width: double.infinity,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [context.primaryColor, Color(0xFF8B6BFF)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ElevatedButton.icon(
                  onPressed: _generateTextToSpeech,
                  icon: const Icon(Icons.record_voice_over),
                  label: const Text('Generate Speech'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ).copyWith(
                    elevation: WidgetStateProperty.all(0),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildAudioEnhancementContent() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Choose Audio File',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            InkWell(
              onTap: _selectAudioFile,
              borderRadius: BorderRadius.circular(5),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline,
                    style: BorderStyle.solid,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(5),
                  color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.upload_file,
                      size: 64,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _selectedAudioFile ?? 'Click to select audio file',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Supported formats: MP3, WAV, M4A, FLAC',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Enhancement Options
            Text(
              'Enhancement Options',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            
            _buildEnhancementOption(
              icon: Icons.graphic_eq,
              title: 'Noise Reduction',
              subtitle: 'Remove background noise and static',
            ),
            _buildEnhancementOption(
              icon: Icons.equalizer,
              title: 'Volume Normalization',
              subtitle: 'Balance audio levels throughout',
            ),
            _buildEnhancementOption(
              icon: Icons.surround_sound,
              title: 'Clarity Enhancement',
              subtitle: 'Improve voice clarity and definition',
            ),
            _buildEnhancementOption(
              icon: Icons.speed,
              title: 'Echo Removal',
              subtitle: 'Remove echo and reverb effects',
            ),
            
            const SizedBox(height: 24),
            
            // Enhance Button
            SizedBox(
              width: double.infinity,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [context.primaryColor, Color(0xFF8B6BFF)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ElevatedButton.icon(
                  onPressed: _selectedAudioFile != null ? _enhanceAudio : null,
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('Enhance Audio'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ).copyWith(
                    elevation: WidgetStateProperty.all(0),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildTemplateChip(String template) {
    final isSelected = _selectedTemplate == template;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(template),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedTemplate = selected ? template : '';
          });
          if (selected) {
            // Set template text based on selection
            String templateText = '';
            switch (template) {
              case 'Welcome Message':
                templateText = 'Welcome to our platform! We\'re excited to have you here.';
                break;
              case 'Announcement':
                templateText = 'We have an important announcement to share with you today.';
                break;
              case 'Tutorial Intro':
                templateText = 'In this tutorial, we\'ll guide you through the process step by step.';
                break;
              case 'Closing Remarks':
                templateText = 'Thank you for your time and attention. We hope to see you again soon.';
                break;
            }
            setState(() {
              _textToConvert = templateText;
            });
          }
        },
      ),
    );
  }
  
  Widget _buildEnhancementOption({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(5),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 24,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  void _generateTextToSpeech() {
    if (_textToConvert.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter text to convert')),
      );
      return;
    }
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Generating speech...\n'
          'Voice: $_selectedVoice | Language: $_selectedLanguage\n'
          'Format: $_selectedOutputFormat | Speed: ${_speechSpeed.toStringAsFixed(1)}x',
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }
  
  void _selectAudioFile() {
    // Simulate file selection
    setState(() {
      _selectedAudioFile = 'audio_sample.mp3';
    });
  }
  
  void _enhanceAudio() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Enhancing audio: $_selectedAudioFile'),
      ),
    );
  }
  
  Widget _buildTipItem(BuildContext context, String tip) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        tip,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          height: 1.5,
        ),
      ),
    );
  }
}

class AIDocumentsScreen extends StatefulWidget {
  const AIDocumentsScreen({super.key});

  @override
  State<AIDocumentsScreen> createState() => _AIDocumentsScreenState();
}

class _AIDocumentsScreenState extends State<AIDocumentsScreen> {
  String _selectedType = 'From Template';
  
  // From Template variables
  String _selectedCategory = 'Business';
  String _selectedTemplate = 'Business Proposal';
  String _companyName = '';
  String _clientName = '';
  String _projectName = '';
  String _budget = '';
  String _timeline = '';
  String _selectedOutputFormat = 'PDF';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('files.ai_documents'.tr()),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.description,
                        size: 32,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'AI Document Assistant',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Create, edit, and analyze documents with AI',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          
          // Document Creation Type
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Document Creation Type',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedType = 'From Template';
                                });
                              },
                              borderRadius: BorderRadius.circular(5),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                                decoration: BoxDecoration(
                                  color: _selectedType == 'From Template'
                                      ? Theme.of(context).colorScheme.primary
                                      : Colors.transparent,
                                  border: Border.all(
                                    color: _selectedType == 'From Template'
                                        ? Theme.of(context).colorScheme.primary
                                        : Theme.of(context).colorScheme.outline,
                                  ),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.description,
                                      size: 22,
                                      color: _selectedType == 'From Template'
                                          ? Theme.of(context).colorScheme.onPrimary
                                          : Theme.of(context).colorScheme.onSurface,
                                    ),
                                    const SizedBox(width: 6),
                                    Flexible(
                                      child: Text(
                                        'From Template',
                                        style: TextStyle(
                                          color: _selectedType == 'From Template'
                                              ? Theme.of(context).colorScheme.onPrimary
                                              : Theme.of(context).colorScheme.onSurface,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedType = 'AI Generation';
                                });
                              },
                              borderRadius: BorderRadius.circular(5),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                                decoration: BoxDecoration(
                                  color: _selectedType == 'AI Generation'
                                      ? Theme.of(context).colorScheme.primary
                                      : Colors.transparent,
                                  border: Border.all(
                                    color: _selectedType == 'AI Generation'
                                        ? Theme.of(context).colorScheme.primary
                                        : Theme.of(context).colorScheme.outline,
                                  ),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.auto_awesome,
                                      size: 22,
                                      color: _selectedType == 'AI Generation'
                                          ? Theme.of(context).colorScheme.onPrimary
                                          : Theme.of(context).colorScheme.onSurface,
                                    ),
                                    const SizedBox(width: 6),
                                    Flexible(
                                      child: Text(
                                        'AI Generation',
                                        style: TextStyle(
                                          color: _selectedType == 'AI Generation'
                                              ? Theme.of(context).colorScheme.onPrimary
                                              : Theme.of(context).colorScheme.onSurface,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedType = 'Format Conversion';
                                });
                              },
                              borderRadius: BorderRadius.circular(5),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                                decoration: BoxDecoration(
                                  color: _selectedType == 'Format Conversion'
                                      ? Theme.of(context).colorScheme.primary
                                      : Colors.transparent,
                                  border: Border.all(
                                    color: _selectedType == 'Format Conversion'
                                        ? Theme.of(context).colorScheme.primary
                                        : Theme.of(context).colorScheme.outline,
                                  ),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.transform,
                                      size: 22,
                                      color: _selectedType == 'Format Conversion'
                                          ? Theme.of(context).colorScheme.onPrimary
                                          : Theme.of(context).colorScheme.onSurface,
                                    ),
                                    const SizedBox(width: 6),
                                    Flexible(
                                      child: Text(
                                        'Format Conversion',
                                        style: TextStyle(
                                          color: _selectedType == 'Format Conversion'
                                              ? Theme.of(context).colorScheme.onPrimary
                                              : Theme.of(context).colorScheme.onSurface,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Content based on selected type
          if (_selectedType == 'From Template')
            _buildFromTemplateContent()
          else if (_selectedType == 'AI Generation')
            _buildAIGenerationContent()
          else
            _buildFormatConversionContent(),
        ],
      ),
    );
  }
  
  Widget _buildFromTemplateContent() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category Selection
            Text(
              'Category',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildCategoryChip('Business'),
                _buildCategoryChip('Academic'),
                _buildCategoryChip('Technical'),
                _buildCategoryChip('Personal'),
              ],
            ),
            const SizedBox(height: 16),
            
            // Choose Template
            DropdownButtonFormField<String>(
              value: _selectedTemplate,
              decoration: InputDecoration(
                labelText: 'Choose Template',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                prefixIcon: const Icon(Icons.article),
              ),
              items: _getTemplatesForCategory(),
              onChanged: (value) {
                setState(() {
                  _selectedTemplate = value!;
                });
              },
            ),
            const SizedBox(height: 16),
            
            // Template Information
            Text(
              'Template Information',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            
            TextField(
              decoration: InputDecoration(
                labelText: 'Company Name',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                prefixIcon: const Icon(Icons.business),
              ),
              onChanged: (value) {
                setState(() {
                  _companyName = value;
                });
              },
            ),
            const SizedBox(height: 12),
            
            TextField(
              decoration: InputDecoration(
                labelText: 'Client Name',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                prefixIcon: const Icon(Icons.person),
              ),
              onChanged: (value) {
                setState(() {
                  _clientName = value;
                });
              },
            ),
            const SizedBox(height: 12),
            
            TextField(
              decoration: InputDecoration(
                labelText: 'Project Name',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                prefixIcon: const Icon(Icons.work),
              ),
              onChanged: (value) {
                setState(() {
                  _projectName = value;
                });
              },
            ),
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      labelText: 'Budget',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                      ),
                      prefixIcon: const Icon(Icons.attach_money),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _budget = value;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      labelText: 'Timeline',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                      ),
                      prefixIcon: const Icon(Icons.schedule),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _timeline = value;
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Output Format
            DropdownButtonFormField<String>(
              value: _selectedOutputFormat,
              decoration: InputDecoration(
                labelText: 'Output Format',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
                prefixIcon: const Icon(Icons.file_copy),
              ),
              items: const [
                DropdownMenuItem(value: 'PDF', child: Text('PDF')),
                DropdownMenuItem(value: 'Word Document', child: Text('Word Document')),
                DropdownMenuItem(value: 'HTML', child: Text('HTML')),
                DropdownMenuItem(value: 'Markdown', child: Text('Markdown')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedOutputFormat = value!;
                });
              },
            ),
            const SizedBox(height: 24),
            
            // Generate Button
            SizedBox(
              width: double.infinity,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [context.primaryColor, Color(0xFF8B6BFF)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ElevatedButton.icon(
                  onPressed: _generateFromTemplate,
                  icon: const Icon(Icons.create),
                  label: const Text('Generate Document'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ).copyWith(
                    elevation: WidgetStateProperty.all(0),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildAIGenerationContent() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.auto_awesome,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'AI Generation',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Coming soon! Generate documents using AI prompts.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildFormatConversionContent() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.transform,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Format Conversion',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Coming soon! Convert documents between different formats.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildCategoryChip(String category) {
    final isSelected = _selectedCategory == category;
    return ChoiceChip(
      label: Text(category),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _selectedCategory = category;
          // Reset template when category changes
          _selectedTemplate = _getTemplatesForCategory().first.value!;
        });
      },
    );
  }
  
  List<DropdownMenuItem<String>> _getTemplatesForCategory() {
    switch (_selectedCategory) {
      case 'Business':
        return const [
          DropdownMenuItem(value: 'Business Proposal', child: Text('Business Proposal')),
          DropdownMenuItem(value: 'Project Report', child: Text('Project Report')),
          DropdownMenuItem(value: 'Meeting Minutes', child: Text('Meeting Minutes')),
          DropdownMenuItem(value: 'Invoice', child: Text('Invoice')),
          DropdownMenuItem(value: 'Contract', child: Text('Contract')),
        ];
      case 'Academic':
        return const [
          DropdownMenuItem(value: 'Research Paper', child: Text('Research Paper')),
          DropdownMenuItem(value: 'Thesis', child: Text('Thesis')),
          DropdownMenuItem(value: 'Essay', child: Text('Essay')),
          DropdownMenuItem(value: 'Lab Report', child: Text('Lab Report')),
        ];
      case 'Technical':
        return const [
          DropdownMenuItem(value: 'Technical Specification', child: Text('Technical Specification')),
          DropdownMenuItem(value: 'User Manual', child: Text('User Manual')),
          DropdownMenuItem(value: 'API Documentation', child: Text('API Documentation')),
          DropdownMenuItem(value: 'Bug Report', child: Text('Bug Report')),
        ];
      case 'Personal':
        return const [
          DropdownMenuItem(value: 'Resume', child: Text('Resume')),
          DropdownMenuItem(value: 'Cover Letter', child: Text('Cover Letter')),
          DropdownMenuItem(value: 'Personal Letter', child: Text('Personal Letter')),
          DropdownMenuItem(value: 'To-Do List', child: Text('To-Do List')),
        ];
      default:
        return const [
          DropdownMenuItem(value: 'Business Proposal', child: Text('Business Proposal')),
        ];
    }
  }
  
  void _generateFromTemplate() {
    if (_companyName.isEmpty || _clientName.isEmpty || _projectName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please fill in all required fields')),
      );
      return;
    }
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Generating $_selectedTemplate...\n'
          'Category: $_selectedCategory | Format: $_selectedOutputFormat',
        ),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}