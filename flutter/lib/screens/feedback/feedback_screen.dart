import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../api/services/feedback_api_service.dart';
import '../../models/feedback/feedback_model.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final FeedbackApiService _feedbackApi = FeedbackApiService();

  FeedbackType _selectedType = FeedbackType.bug;
  FeedbackCategory? _selectedCategory;
  bool _isSubmitting = false;
  final List<FeedbackAttachment> _attachments = [];
  final List<File> _pendingFiles = [];

  String? _appVersion;
  DeviceInfo? _deviceInfo;

  @override
  void initState() {
    super.initState();
    _loadDeviceInfo();
  }

  Future<void> _loadDeviceInfo() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final deviceInfoPlugin = DeviceInfoPlugin();

      String? platform;
      String? osVersion;
      String? deviceModel;

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfoPlugin.androidInfo;
        platform = 'android';
        osVersion = androidInfo.version.release;
        deviceModel = '${androidInfo.manufacturer} ${androidInfo.model}';
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfoPlugin.iosInfo;
        platform = 'ios';
        osVersion = iosInfo.systemVersion;
        deviceModel = iosInfo.model;
      }

      setState(() {
        _appVersion = packageInfo.version;
        _deviceInfo = DeviceInfo(
          platform: platform,
          osVersion: osVersion,
          deviceModel: deviceModel,
        );
      });
    } catch (e) {
      debugPrint('Failed to load device info: $e');
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (_attachments.length + _pendingFiles.length >= 5) {
      _showSnackBar('Maximum 5 attachments allowed');
      return;
    }

    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );

    if (image != null) {
      final file = File(image.path);
      final size = await file.length();
      if (size > 10 * 1024 * 1024) {
        _showSnackBar('File size must be less than 10MB');
        return;
      }
      setState(() {
        _pendingFiles.add(file);
      });
    }
  }

  Future<void> _takeScreenshot() async {
    if (_attachments.length + _pendingFiles.length >= 5) {
      _showSnackBar('Maximum 5 attachments allowed');
      return;
    }

    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );

    if (image != null) {
      setState(() {
        _pendingFiles.add(File(image.path));
      });
    }
  }

  Future<void> _pickFile() async {
    if (_attachments.length + _pendingFiles.length >= 5) {
      _showSnackBar('Maximum 5 attachments allowed');
      return;
    }

    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'log'],
      allowMultiple: false,
    );

    if (result != null && result.files.isNotEmpty) {
      final file = File(result.files.first.path!);
      final size = await file.length();
      if (size > 10 * 1024 * 1024) {
        _showSnackBar('File size must be less than 10MB');
        return;
      }
      setState(() {
        _pendingFiles.add(file);
      });
    }
  }

  void _removeFile(int index) {
    setState(() {
      _pendingFiles.removeAt(index);
    });
  }

  Future<void> _uploadFiles() async {
    final uploadedAttachments = <FeedbackAttachment>[];

    for (final file in _pendingFiles) {
      final result = await _feedbackApi.uploadAttachment(file);
      if (result.success && result.data != null) {
        uploadedAttachments.add(result.data!);
      }
    }

    _attachments.addAll(uploadedAttachments);
    _pendingFiles.clear();
  }

  Future<void> _submitFeedback() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
    });

    try {
      // Upload pending files first
      if (_pendingFiles.isNotEmpty) {
        await _uploadFiles();
      }

      final dto = CreateFeedbackDto(
        type: _selectedType,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        category: _selectedCategory,
        attachments: _attachments.isNotEmpty ? _attachments : null,
        appVersion: _appVersion,
        deviceInfo: _deviceInfo,
      );

      final result = await _feedbackApi.createFeedback(dto);

      if (result.success) {
        if (mounted) {
          _showSnackBar('Feedback submitted successfully!', isError: false);
          Navigator.pop(context, true);
        }
      } else {
        _showSnackBar(result.message ?? 'Failed to submit feedback');
      }
    } catch (e) {
      _showSnackBar('An error occurred: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _showSnackBar(String message, {bool isError = true}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Submit Feedback'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Type selector
            Text(
              'Feedback Type',
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: FeedbackType.values.map((type) {
                final isSelected = _selectedType == type;
                return ChoiceChip(
                  label: Text(type.displayName),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedType = type;
                      });
                    }
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Title field
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'Brief description of the issue',
                border: OutlineInputBorder(),
              ),
              maxLength: 200,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a title';
                }
                if (value.trim().length < 5) {
                  return 'Title must be at least 5 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Description field
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Provide detailed information about the issue...',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 6,
              maxLength: 2000,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a description';
                }
                if (value.trim().length < 20) {
                  return 'Description must be at least 20 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Category dropdown
            DropdownButtonFormField<FeedbackCategory>(
              value: _selectedCategory,
              decoration: const InputDecoration(
                labelText: 'Category (Optional)',
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem<FeedbackCategory>(
                  value: null,
                  child: Text('Select a category'),
                ),
                ...FeedbackCategory.values.map((category) {
                  return DropdownMenuItem(
                    value: category,
                    child: Text(category.displayName),
                  );
                }),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedCategory = value;
                });
              },
            ),
            const SizedBox(height: 24),

            // Attachments section
            Text(
              'Attachments (Optional)',
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: 4),
            Text(
              'Add screenshots or files to help us understand the issue better',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _pickImage,
                  icon: const Icon(Icons.photo_library),
                  label: const Text('Gallery'),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _takeScreenshot,
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Camera'),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _pickFile,
                  icon: const Icon(Icons.attach_file),
                  label: const Text('File'),
                ),
              ],
            ),

            // Display pending files
            if (_pendingFiles.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _pendingFiles.asMap().entries.map((entry) {
                  final index = entry.key;
                  final file = entry.value;
                  final fileName = file.path.split('/').last;
                  return Chip(
                    avatar: const Icon(Icons.attachment, size: 18),
                    label: Text(
                      fileName.length > 20
                          ? '${fileName.substring(0, 17)}...'
                          : fileName,
                    ),
                    deleteIcon: const Icon(Icons.close, size: 18),
                    onDeleted: () => _removeFile(index),
                  );
                }).toList(),
              ),
            ],

            const SizedBox(height: 32),

            // Device info display
            if (_appVersion != null || _deviceInfo != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: theme.colorScheme.outline.withOpacity(0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Device Information',
                      style: theme.textTheme.labelMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'App Version: ${_appVersion ?? "Unknown"}',
                      style: theme.textTheme.bodySmall,
                    ),
                    if (_deviceInfo != null) ...[
                      Text(
                        'Platform: ${_deviceInfo!.platform ?? "Unknown"}',
                        style: theme.textTheme.bodySmall,
                      ),
                      Text(
                        'Device: ${_deviceInfo!.deviceModel ?? "Unknown"}',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),

            const SizedBox(height: 24),

            // Submit button
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isSubmitting ? null : _submitFeedback,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Submit Feedback'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
