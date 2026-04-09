import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:io';
import '../../services/workspace_management_service.dart';
import '../../services/auth_service.dart';
import '../../api/services/workspace_api_service.dart';
import '../../api/base_api_client.dart';
import '../../utils/theme_notifier.dart';
import '../main_screen.dart';

/// Screen for creating a new workspace
class CreateWorkspaceScreen extends StatefulWidget {
  const CreateWorkspaceScreen({super.key});

  @override
  State<CreateWorkspaceScreen> createState() => _CreateWorkspaceScreenState();
}

class _CreateWorkspaceScreenState extends State<CreateWorkspaceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  File? _selectedImage;
  String? _uploadedLogoUrl;
  bool _isLoading = false;
  bool _isUploadingImage = false;

  late WorkspaceManagementService _workspaceService;
  final ImagePicker _picker = ImagePicker();
  final BaseApiClient _apiClient = BaseApiClient.instance;

  @override
  void initState() {
    super.initState();
    _workspaceService = WorkspaceManagementService.instance;
    _nameController.addListener(() {
      setState(() {}); // Update character count
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
          _isUploadingImage = true;
        });

        // Upload image to server
        await _uploadImage(File(image.path));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('create_workspace.failed_to_pick_image'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _uploadImage(File imageFile) async {
    try {

      // Create multipart file
      String fileName = imageFile.path.split('/').last;
      FormData formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imageFile.path,
          filename: fileName,
        ),
      });

      // Upload to workspace logo endpoint
      final response = await _apiClient.post(
        '/workspaces/logo/upload',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );


      if (response.statusCode == 200 || response.statusCode == 201) {
        // Extract URL from response - try multiple possible keys
        final String? uploadedUrl = response.data['url'] ??
                                    response.data['file_url'] ??
                                    response.data['logoUrl'] ??
                                    response.data['data']?['url'] ??
                                    response.data['data']?['logoUrl'];

        if (uploadedUrl == null) {
          throw Exception('No URL in upload response: ${response.data}');
        }

        setState(() {
          _uploadedLogoUrl = uploadedUrl;
          _isUploadingImage = false;
        });


        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('create_workspace.icon_uploaded'.tr()),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else {
        throw Exception('Upload failed with status: ${response.statusCode}');
      }
    } catch (e) {

      setState(() {
        _isUploadingImage = false;
        _selectedImage = null;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('create_workspace.failed_to_upload_icon'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600),
          padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
          child: Form(
            key: _formKey,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                      // Title
                      Text(
                        'create_workspace.title'.tr(),
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Subtitle
                      Text(
                        'create_workspace.subtitle'.tr(),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 40),

                      // Icon Upload Area
                      InkWell(
                        onTap: _isUploadingImage ? null : _pickImage,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: Colors.grey.shade300,
                              width: 2,
                              style: BorderStyle.solid,
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: _isUploadingImage
                              ? const Center(
                                  child: CircularProgressIndicator(),
                                )
                              : _selectedImage != null
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: Image.file(
                                        _selectedImage!,
                                        fit: BoxFit.cover,
                                      ),
                                    )
                                  : Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.business,
                                          size: 48,
                                          color: Colors.grey.shade400,
                                        ),
                                        const SizedBox(height: 8),
                                        Icon(
                                          Icons.upload,
                                          size: 24,
                                          color: Colors.grey.shade400,
                                        ),
                                      ],
                                    ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Upload Icon Button
                      OutlinedButton(
                        onPressed: _isUploadingImage ? null : _pickImage,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.black,
                          side: const BorderSide(color: Colors.grey),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 12,
                          ),
                        ),
                        child: Text(
                          _isUploadingImage ? 'create_workspace.uploading'.tr() : 'create_workspace.upload_icon'.tr(),
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Optional text
                      Text(
                        'create_workspace.optional_hint'.tr(),
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(height: 40),

                      // Workspace Name Label
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'create_workspace.workspace_name'.tr(),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.black,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Workspace Name Input
                      TextFormField(
                        controller: _nameController,
                        decoration: InputDecoration(
                          hintText: 'create_workspace.name_hint'.tr(),
                          hintStyle: TextStyle(color: Colors.grey.shade400),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: const BorderSide(color: Colors.blue, width: 2),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        maxLength: 50,
                        buildCounter: (context, {required currentLength, required isFocused, maxLength}) {
                          return null; // Hide default counter
                        },
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'create_workspace.name_required'.tr();
                          }
                          if (value.trim().length < 2) {
                            return 'create_workspace.name_min_length'.tr();
                          }
                          return null;
                        },
                        textCapitalization: TextCapitalization.words,
                        enabled: !_isLoading,
                      ),
                      const SizedBox(height: 4),

                      // Character count
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'create_workspace.character_count'.tr(args: [_nameController.text.length.toString()]),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),

                      // Create Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: (_isLoading || _isUploadingImage) ? null : _createWorkspace,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF5B8DEE),
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: Colors.grey.shade300,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                            ),
                            elevation: 0,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Text(
                                  _isUploadingImage ? 'create_workspace.uploading_icon'.tr() : 'create_workspace.create_button'.tr(),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Footer text
                  Text(
                    'create_workspace.footer_text'.tr(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _createWorkspace() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Don't allow creation while image is uploading
    if (_isUploadingImage) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('create_workspace.wait_for_upload'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Check authentication
    final authService = AuthService.instance;
    final token = authService.currentSession;

    setState(() {
      _isLoading = true;
    });

    final dto = CreateWorkspaceDto(
      name: _nameController.text.trim(),
      logo: _uploadedLogoUrl, // Use uploaded logo URL
    );


    final success = await _workspaceService.createWorkspace(dto);

    setState(() {
      _isLoading = false;
    });

    if (!mounted) return;

    if (success) {

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('create_workspace.success'.tr(args: [dto.name])),
          backgroundColor: Colors.green,
        ),
      );

      // Navigate to main screen after successful creation
      final themeNotifier = Provider.of<ThemeNotifier>(context, listen: false);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => MainScreen(themeNotifier: themeNotifier),
        ),
      );
    } else {

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_workspaceService.error ?? 'create_workspace.failed'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
