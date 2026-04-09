import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/auth_service.dart';

/// Join Request Modal
/// Shows when a user tries to join a call they weren't invited to
class JoinRequestModal extends StatefulWidget {
  final String? roomName;
  final String callType; // 'audio' or 'video'
  final Future<void> Function(String displayName, String message) onRequestJoin;
  final VoidCallback onCancel;

  const JoinRequestModal({
    super.key,
    this.roomName,
    required this.callType,
    required this.onRequestJoin,
    required this.onCancel,
  });

  @override
  State<JoinRequestModal> createState() => _JoinRequestModalState();
}

class _JoinRequestModalState extends State<JoinRequestModal> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _displayNameController;
  final _messageController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Pre-fill with user's name
    final user = AuthService.instance.currentUser;
    _displayNameController = TextEditingController(
      text: user?.name ?? user?.email ?? '',
    );
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_displayNameController.text.trim().isEmpty) return;

    setState(() => _isSubmitting = true);

    try {
      await widget.onRequestJoin(
        _displayNameController.text.trim(),
        _messageController.text.trim(),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.instance.currentUser;
    final isVideo = widget.callType == 'video';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isVideo ? Icons.videocam : Icons.mic,
                      color: Colors.blue,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Request to Join Call',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.roomName != null
                              ? 'Requesting to join "${widget.roomName}"'
                              : 'You need permission to join this call',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // User info preview
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: Colors.blue,
                      backgroundImage: user?.avatar_url != null
                          ? NetworkImage(user!.avatar_url!)
                          : null,
                      child: user?.avatar_url == null
                          ? Text(
                              (user?.name ?? user?.email ?? 'U')
                                  .substring(0, 1)
                                  .toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.name ?? user?.email ?? 'User',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            'Requesting to join',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Display name field
              const Text(
                'Display Name',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _displayNameController,
                decoration: InputDecoration(
                  hintText: 'videocalls.enter_your_name'.tr(),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter your name';
                  }
                  return null;
                },
                maxLength: 50,
              ),

              const SizedBox(height: 16),

              // Optional message field
              const Text(
                'Message (optional)',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _messageController,
                decoration: InputDecoration(
                  hintText: 'videocalls.why_join'.tr(),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
                maxLength: 200,
                maxLines: 2,
              ),
              Text(
                'The host will see this when deciding to accept your request',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[500],
                ),
              ),

              const SizedBox(height: 24),

              // Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _isSubmitting ? null : widget.onCancel,
                    child: Text('common.cancel'.tr()),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text('videocalls.request_to_join'.tr()),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Shows the join request modal as a dialog
Future<void> showJoinRequestModal({
  required BuildContext context,
  String? roomName,
  required String callType,
  required Future<void> Function(String displayName, String message) onRequestJoin,
  required VoidCallback onCancel,
}) {
  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => JoinRequestModal(
      roomName: roomName,
      callType: callType,
      onRequestJoin: onRequestJoin,
      onCancel: () {
        Navigator.of(context).pop();
        onCancel();
      },
    ),
  );
}
