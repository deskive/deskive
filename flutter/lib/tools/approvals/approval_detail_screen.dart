import 'dart:async';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/approval.dart';
import '../../api/services/approvals_api_service.dart';
import '../../services/workspace_service.dart';
import '../../services/auth_service.dart';
import '../../services/socket_io_chat_service.dart';
import '../../theme/app_theme.dart';
import 'widgets/comment_section.dart';
import 'widgets/approver_list.dart';

class ApprovalDetailScreen extends StatefulWidget {
  final String requestId;

  const ApprovalDetailScreen({
    super.key,
    required this.requestId,
  });

  @override
  State<ApprovalDetailScreen> createState() => _ApprovalDetailScreenState();
}

class _ApprovalDetailScreenState extends State<ApprovalDetailScreen> {
  final ApprovalsApiService _apiService = ApprovalsApiService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  ApprovalRequest? _request;
  List<ApprovalComment> _comments = [];
  bool _isLoading = true;
  bool _isActionLoading = false;
  String? _error;
  StreamSubscription<Map<String, dynamic>>? _approvalSubscription;

  String? get _currentUserId => AuthService.instance.currentUser?.id;
  bool get _isRequester => _request?.requesterId == _currentUserId;
  bool get _isExplicitApprover => _request?.approvers.any(
    (a) => a.userId == _currentUserId && a.status == ApproverStatus.pending
  ) ?? false;
  bool get _isPending => _request?.status == RequestStatus.pending;

  /// Check if current user is owner or admin
  bool get _isOwnerOrAdmin {
    final membership = _workspaceService.currentWorkspace?.membership;
    if (membership == null) return false;
    // Use canManageWorkspace() helper which checks for owner/admin roles
    return membership.canManageWorkspace();
  }

  /// Owners/admins can approve any pending request (except their own), or if they're explicitly an approver
  bool get _canApproveOrReject =>
    ((_isOwnerOrAdmin && !_isRequester) || _isExplicitApprover) && _isPending;

  /// Requester can cancel their own pending request
  bool get _canCancel => _isRequester && _isPending;

  /// Owners/admins can delete completed requests (approved, rejected, cancelled)
  bool get _canDelete => _isOwnerOrAdmin && _request != null && !_isPending;

  @override
  void initState() {
    super.initState();
    _loadData();
    _setupApprovalSocketListener();
  }

  @override
  void dispose() {
    _approvalSubscription?.cancel();
    super.dispose();
  }

  void _setupApprovalSocketListener() {
    _approvalSubscription = SocketIOChatService.instance.approvalStream.listen(
      (data) => _handleApprovalEvent(data),
      onError: (error) => debugPrint('Approval stream error: $error'),
    );
  }

  void _handleApprovalEvent(Map<String, dynamic> data) {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    // Check if this event is for the current workspace
    if (data['workspaceId'] != workspaceId) return;

    final eventType = data['eventType'] as String?;
    final requestId = data['requestId'] as String?;

    // Only handle events for this specific request
    if (requestId != widget.requestId) return;

    debugPrint('[ApprovalDetailScreen] Received approval event: $eventType for request: $requestId');

    switch (eventType) {
      case 'status_updated':
        _handleStatusUpdated(data);
        break;
      case 'comment_added':
        _handleCommentAdded(data);
        break;
      case 'request_deleted':
        // Request was deleted, go back
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('approvals.deleted_success'.tr()),
              backgroundColor: Colors.orange,
            ),
          );
          Navigator.pop(context, true);
        }
        break;
    }
  }

  void _handleStatusUpdated(Map<String, dynamic> data) {
    // Reload the full request data to get updated status
    _loadData();
  }

  void _handleCommentAdded(Map<String, dynamic> data) {
    final commentData = data['comment'] as Map<String, dynamic>?;
    if (commentData == null) return;

    final newComment = ApprovalComment.fromJson(commentData);

    // Check if comment already exists
    if (_comments.any((c) => c.id == newComment.id)) return;

    if (mounted) {
      setState(() {
        _comments.add(newComment);
      });
    }
  }

  Future<void> _loadData() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _error = 'No workspace selected';
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _apiService.getRequest(workspaceId, widget.requestId),
        _apiService.getComments(workspaceId, widget.requestId),
      ]);

      final requestResponse = results[0] as dynamic;
      final commentsResponse = results[1] as dynamic;

      if (mounted) {
        setState(() {
          if (requestResponse.success) {
            _request = requestResponse.data as ApprovalRequest;
          } else {
            _error = requestResponse.message;
          }
          if (commentsResponse.success) {
            _comments = commentsResponse.data as List<ApprovalComment>;
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load request: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _approveRequest() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    // Refresh request data first to check current status
    setState(() => _isActionLoading = true);

    final refreshResponse = await _apiService.getRequest(workspaceId, widget.requestId);

    if (!mounted) return;

    if (refreshResponse.success) {
      final latestRequest = refreshResponse.data!;

      // Check if request is still pending
      if (latestRequest.status != RequestStatus.pending) {
        setState(() {
          _request = latestRequest;
          _isActionLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('approvals.status_changed'.tr()),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      // Update local data with fresh data
      setState(() {
        _request = latestRequest;
        _isActionLoading = false;
      });
    } else {
      setState(() => _isActionLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(refreshResponse.message ?? 'Failed to refresh request'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Now show the approve dialog
    final confirmed = await _showApproveDialog();
    if (confirmed == null) return;

    setState(() => _isActionLoading = true);

    final response = await _apiService.approveRequest(
      workspaceId,
      widget.requestId,
      comments: confirmed.isNotEmpty ? confirmed : null,
    );

    if (mounted) {
      if (response.success) {
        // Update local state with the approved request before popping
        // This ensures buttons are disabled even if pop is delayed
        setState(() {
          _request = response.data;
          _isActionLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('approvals.approved_success'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      } else {
        setState(() => _isActionLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to approve'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _rejectRequest() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    // Refresh request data first to check current status
    setState(() => _isActionLoading = true);

    final refreshResponse = await _apiService.getRequest(workspaceId, widget.requestId);

    if (!mounted) return;

    if (refreshResponse.success) {
      final latestRequest = refreshResponse.data!;

      // Check if request is still pending
      if (latestRequest.status != RequestStatus.pending) {
        setState(() {
          _request = latestRequest;
          _isActionLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('approvals.status_changed'.tr()),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      // Update local data with fresh data
      setState(() {
        _request = latestRequest;
        _isActionLoading = false;
      });
    } else {
      setState(() => _isActionLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(refreshResponse.message ?? 'Failed to refresh request'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Now show the reject dialog
    final reason = await _showRejectDialog();
    if (reason == null || reason.isEmpty) return;

    setState(() => _isActionLoading = true);

    final response = await _apiService.rejectRequest(
      workspaceId,
      widget.requestId,
      reason: reason,
    );

    if (mounted) {
      if (response.success) {
        // Update local state with the rejected request before popping
        // This ensures buttons are disabled even if pop is delayed
        setState(() {
          _request = response.data;
          _isActionLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('approvals.rejected_success'.tr()),
            backgroundColor: Colors.orange,
          ),
        );
        Navigator.pop(context, true);
      } else {
        setState(() => _isActionLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to reject'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _cancelRequest() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('approvals.cancel_title'.tr()),
        content: Text('approvals.cancel_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.no'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.yes'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isActionLoading = true);

    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await _apiService.cancelRequest(workspaceId, widget.requestId);

    if (mounted) {
      if (response.success) {
        // Update local state with the cancelled request before popping
        setState(() {
          _request = response.data;
          _isActionLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('approvals.cancelled_success'.tr()),
            backgroundColor: Colors.grey,
          ),
        );
        Navigator.pop(context, true);
      } else {
        setState(() => _isActionLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to cancel'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteRequest() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('approvals.delete_title'.tr()),
        content: Text('approvals.delete_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.no'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isActionLoading = true);

    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await _apiService.deleteRequest(workspaceId, widget.requestId);

    if (mounted) {
      setState(() => _isActionLoading = false);
      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('approvals.deleted_success'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to delete'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<String?> _showApproveDialog() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('approvals.approve_title'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('approvals.approve_confirm'.tr()),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                labelText: 'approvals.comments_optional'.tr(),
                border: const OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: Text('approvals.approve'.tr()),
          ),
        ],
      ),
    );
  }

  Future<String?> _showRejectDialog() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('approvals.reject_title'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('approvals.reject_confirm'.tr()),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                labelText: 'approvals.rejection_reason'.tr(),
                border: const OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('approvals.reason_required'.tr()),
                    backgroundColor: Colors.orange,
                  ),
                );
                return;
              }
              Navigator.pop(context, controller.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('approvals.reject'.tr()),
          ),
        ],
      ),
    );
  }

  Future<void> _addComment(String content) async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await _apiService.addComment(
      workspaceId,
      widget.requestId,
      content: content,
    );

    if (response.success && mounted) {
      setState(() {
        _comments.add(response.data!);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('approvals.request_details'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _request == null
                  ? _buildErrorView()
                  : _buildContent(isDark),
      bottomNavigationBar: _buildActionBar(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Request not found',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: Text('common.retry'.tr()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          _buildHeaderCard(isDark),
          const SizedBox(height: 16),

          // Details Card
          _buildDetailsCard(isDark),
          const SizedBox(height: 16),

          // Custom Fields Card
          if (_request!.data.isNotEmpty) ...[
            _buildCustomFieldsCard(isDark),
            const SizedBox(height: 16),
          ],

          // Attachments Card
          if (_request!.attachments != null && _request!.attachments!.isNotEmpty) ...[
            _buildAttachmentsCard(isDark),
            const SizedBox(height: 16),
          ],

          // Approvers Card
          _buildApproversCard(isDark),
          const SizedBox(height: 16),

          // Rejection Reason
          if (_request!.status == RequestStatus.rejected && _request!.rejectionReason != null) ...[
            _buildRejectionCard(isDark),
            const SizedBox(height: 16),
          ],

          // Comments Section
          CommentSection(
            comments: _comments,
            onAddComment: _addComment,
          ),
          const SizedBox(height: 80), // Space for bottom bar
        ],
      ),
    );
  }

  Widget _buildHeaderCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _request!.title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ),
              _buildStatusBadge(_request!.status),
            ],
          ),
          if (_request!.typeName != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                if (_request!.typeColor != null)
                  Container(
                    width: 12,
                    height: 12,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: _parseColor(_request!.typeColor!),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                Text(
                  _request!.typeName!,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.white60 : Colors.grey[600],
                  ),
                ),
                const SizedBox(width: 12),
                _buildPriorityBadge(_request!.priority),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailsCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'approvals.details'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white70 : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),

          // Requester
          _buildDetailRow(
            icon: Icons.person_outline,
            label: 'approvals.requested_by'.tr(),
            value: _request!.requesterName ?? 'Unknown',
            isDark: isDark,
          ),

          // Created
          _buildDetailRow(
            icon: Icons.schedule,
            label: 'approvals.created'.tr(),
            value: DateFormat('MMM d, yyyy HH:mm').format(_request!.createdAt),
            isDark: isDark,
          ),

          // Due Date
          if (_request!.dueDate != null)
            _buildDetailRow(
              icon: Icons.event,
              label: 'approvals.due_date'.tr(),
              value: DateFormat('MMM d, yyyy').format(_request!.dueDate!),
              isDark: isDark,
            ),

          // Description
          if (_request!.description != null && _request!.description!.isNotEmpty) ...[
            const Divider(height: 24),
            Text(
              'approvals.description'.tr(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.white38 : Colors.grey[500],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _request!.description!,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: isDark ? Colors.white38 : Colors.grey[500]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white38 : Colors.grey[500],
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomFieldsCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'approvals.custom_fields'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white70 : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          ..._request!.data.entries.map((entry) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    entry.key,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    entry.value?.toString() ?? '-',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildAttachmentsCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'approvals.attachments'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white70 : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          ..._request!.attachments!.map((url) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => _openAttachment(url),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: context.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getAttachmentIcon(url),
                        size: 18,
                        color: context.primaryColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _getFileName(url),
                        style: TextStyle(
                          fontSize: 13,
                          color: context.primaryColor,
                          decoration: TextDecoration.underline,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Icon(
                      Icons.open_in_new,
                      size: 16,
                      color: isDark ? Colors.white38 : Colors.grey[400],
                    ),
                  ],
                ),
              ),
            ),
          )),
        ],
      ),
    );
  }

  String _getFileName(String url) {
    try {
      final uri = Uri.parse(url);
      final pathSegments = uri.pathSegments;
      if (pathSegments.isNotEmpty) {
        return Uri.decodeComponent(pathSegments.last);
      }
    } catch (e) {
      // Fallback to simple split
    }
    return url.split('/').last;
  }

  IconData _getAttachmentIcon(String url) {
    final fileName = url.split('/').last.toLowerCase();
    if (fileName.endsWith('.pdf')) return Icons.picture_as_pdf;
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return Icons.description;
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return Icons.table_chart;
    if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif')) return Icons.image;
    if (fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi')) return Icons.video_file;
    if (fileName.endsWith('.mp3') || fileName.endsWith('.wav')) return Icons.audio_file;
    if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) return Icons.folder_zip;
    return Icons.attach_file;
  }

  Future<void> _openAttachment(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('approvals.cannot_open_attachment'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to open attachment: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildApproversCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'approvals.approvers'.tr(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white70 : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          ApproverList(approvers: _request!.approvers),
        ],
      ),
    );
  }

  Widget _buildRejectionCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.cancel_outlined, size: 18, color: Colors.red[700]),
              const SizedBox(width: 8),
              Text(
                'approvals.rejection_reason'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.red[700],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _request!.rejectionReason!,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.white70 : Colors.grey[700],
            ),
          ),
        ],
      ),
    );
  }

  Widget? _buildActionBar() {
    if (_request == null) return null;

    // No actions if request is pending and user has no permissions
    final hasAnyAction = _canCancel || _canApproveOrReject || _canDelete;
    if (!hasAnyAction) return null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border(top: BorderSide(color: context.borderColor)),
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Cancel button for requester on pending requests
            if (_canCancel) ...[
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isActionLoading ? null : _cancelRequest,
                  icon: const Icon(Icons.close),
                  label: Text('approvals.cancel'.tr()),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey[700],
                  ),
                ),
              ),
            ],
            // Reject/Approve buttons for approvers (explicit approvers or owners/admins)
            if (_canApproveOrReject) ...[
              if (_canCancel) const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isActionLoading ? null : _rejectRequest,
                  icon: const Icon(Icons.close),
                  label: Text('approvals.reject'.tr()),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isActionLoading ? null : _approveRequest,
                  icon: _isActionLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check),
                  label: Text('approvals.approve'.tr()),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
            // Delete button for owners/admins on completed requests
            if (_canDelete) ...[
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isActionLoading ? null : _deleteRequest,
                  icon: _isActionLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.delete_outline),
                  label: Text('common.delete'.tr()),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(RequestStatus status) {
    Color bgColor;
    Color textColor;
    String text;

    switch (status) {
      case RequestStatus.pending:
        bgColor = Colors.amber.withOpacity(0.15);
        textColor = Colors.amber[700]!;
        text = 'approvals.status_pending'.tr();
        break;
      case RequestStatus.approved:
        bgColor = Colors.green.withOpacity(0.15);
        textColor = Colors.green[700]!;
        text = 'approvals.status_approved'.tr();
        break;
      case RequestStatus.rejected:
        bgColor = Colors.red.withOpacity(0.15);
        textColor = Colors.red[700]!;
        text = 'approvals.status_rejected'.tr();
        break;
      case RequestStatus.cancelled:
        bgColor = Colors.grey.withOpacity(0.15);
        textColor = Colors.grey[700]!;
        text = 'approvals.status_cancelled'.tr();
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildPriorityBadge(RequestPriority priority) {
    Color bgColor;
    Color textColor;
    String text;

    switch (priority) {
      case RequestPriority.low:
        bgColor = Colors.grey.withOpacity(0.15);
        textColor = Colors.grey[700]!;
        text = 'approvals.priority_low'.tr();
        break;
      case RequestPriority.normal:
        bgColor = Colors.blue.withOpacity(0.15);
        textColor = Colors.blue[700]!;
        text = 'approvals.priority_normal'.tr();
        break;
      case RequestPriority.high:
        bgColor = Colors.orange.withOpacity(0.15);
        textColor = Colors.orange[700]!;
        text = 'approvals.priority_high'.tr();
        break;
      case RequestPriority.urgent:
        bgColor = Colors.red.withOpacity(0.15);
        textColor = Colors.red[700]!;
        text = 'approvals.priority_urgent'.tr();
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Color _parseColor(String colorStr) {
    try {
      if (colorStr.startsWith('#')) {
        return Color(int.parse(colorStr.substring(1), radix: 16) + 0xFF000000);
      }
      return Colors.blue;
    } catch (e) {
      return Colors.blue;
    }
  }
}
