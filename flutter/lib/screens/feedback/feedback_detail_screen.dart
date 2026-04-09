import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../api/services/feedback_api_service.dart';
import '../../models/feedback/feedback_model.dart';

class FeedbackDetailScreen extends StatefulWidget {
  final FeedbackModel feedback;

  const FeedbackDetailScreen({super.key, required this.feedback});

  @override
  State<FeedbackDetailScreen> createState() => _FeedbackDetailScreenState();
}

class _FeedbackDetailScreenState extends State<FeedbackDetailScreen> {
  final FeedbackApiService _feedbackApi = FeedbackApiService();

  FeedbackModel? _feedback;
  List<FeedbackResponseModel> _responses = [];
  bool _isLoadingResponses = true;

  @override
  void initState() {
    super.initState();
    _feedback = widget.feedback;
    _loadResponses();
  }

  Future<void> _loadResponses() async {
    setState(() {
      _isLoadingResponses = true;
    });

    try {
      final result = await _feedbackApi.getResponses(widget.feedback.id);

      if (result.success && result.data != null) {
        setState(() {
          _responses = result.data!;
          _isLoadingResponses = false;
        });
      } else {
        setState(() {
          _isLoadingResponses = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoadingResponses = false;
      });
    }
  }

  Future<void> _openAttachment(FeedbackAttachment attachment) async {
    final uri = Uri.parse(attachment.url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open attachment')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final feedback = _feedback!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Feedback Details'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Status and Type badges
          Row(
            children: [
              _buildTypeBadge(feedback.type),
              const SizedBox(width: 8),
              _buildStatusBadge(feedback.status),
              if (feedback.priority != FeedbackPriority.medium) ...[
                const SizedBox(width: 8),
                _buildPriorityBadge(feedback.priority),
              ],
            ],
          ),
          const SizedBox(height: 16),

          // Title
          Text(
            feedback.title,
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),

          // Date
          Text(
            'Submitted on ${_formatFullDate(feedback.createdAt)}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
          const SizedBox(height: 24),

          // Description
          Text(
            'Description',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              feedback.description,
              style: theme.textTheme.bodyMedium,
            ),
          ),
          const SizedBox(height: 24),

          // Category
          if (feedback.category != null) ...[
            _buildInfoRow('Category', feedback.category!.displayName),
            const SizedBox(height: 16),
          ],

          // Attachments
          if (feedback.attachments.isNotEmpty) ...[
            Text(
              'Attachments',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: feedback.attachments.map((attachment) {
                return ActionChip(
                  avatar: _getAttachmentIcon(attachment.type),
                  label: Text(
                    attachment.name.length > 20
                        ? '${attachment.name.substring(0, 17)}...'
                        : attachment.name,
                  ),
                  onPressed: () => _openAttachment(attachment),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
          ],

          // Device Info
          if (feedback.appVersion != null ||
              feedback.deviceInfo.platform != null) ...[
            Text(
              'Device Information',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color:
                    theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (feedback.appVersion != null)
                    Text('App Version: ${feedback.appVersion}'),
                  if (feedback.deviceInfo.platform != null)
                    Text('Platform: ${feedback.deviceInfo.platform}'),
                  if (feedback.deviceInfo.osVersion != null)
                    Text('OS Version: ${feedback.deviceInfo.osVersion}'),
                  if (feedback.deviceInfo.deviceModel != null)
                    Text('Device: ${feedback.deviceInfo.deviceModel}'),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Resolution Notes (if resolved)
          if (feedback.isResolved) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.green.withOpacity(0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Resolved',
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                  if (feedback.resolvedAt != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Resolved on ${_formatFullDate(feedback.resolvedAt!)}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                  if (feedback.resolutionNotes != null &&
                      feedback.resolutionNotes!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Resolution Notes:',
                      style: theme.textTheme.labelMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      feedback.resolutionNotes!,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Admin Responses
          Text(
            'Responses',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (_isLoadingResponses)
            const Center(child: CircularProgressIndicator())
          else if (_responses.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No responses yet',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.outline,
                  ),
                ),
              ),
            )
          else
            Column(
              children: _responses.map((response) {
                return _buildResponseCard(response);
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildResponseCard(FeedbackResponseModel response) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: theme.colorScheme.primary,
                  child: const Icon(
                    Icons.support_agent,
                    size: 18,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Support Team',
                        style: theme.textTheme.titleSmall,
                      ),
                      Text(
                        _formatFullDate(response.createdAt),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
                if (response.statusChange != null)
                  _buildStatusBadge(
                    FeedbackStatus.fromString(response.statusChange!),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              response.content,
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Text(
          '$label: ',
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium,
        ),
      ],
    );
  }

  Widget _buildTypeBadge(FeedbackType type) {
    Color color;
    IconData icon;

    switch (type) {
      case FeedbackType.bug:
        color = Colors.red;
        icon = Icons.bug_report;
        break;
      case FeedbackType.issue:
        color = Colors.orange;
        icon = Icons.warning;
        break;
      case FeedbackType.improvement:
        color = Colors.blue;
        icon = Icons.lightbulb;
        break;
      case FeedbackType.featureRequest:
        color = Colors.purple;
        icon = Icons.auto_awesome;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            type.displayName,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(FeedbackStatus status) {
    Color color;
    switch (status) {
      case FeedbackStatus.pending:
        color = Colors.grey;
        break;
      case FeedbackStatus.inReview:
        color = Colors.blue;
        break;
      case FeedbackStatus.inProgress:
        color = Colors.orange;
        break;
      case FeedbackStatus.resolved:
        color = Colors.green;
        break;
      case FeedbackStatus.wontFix:
        color = Colors.red;
        break;
      case FeedbackStatus.duplicate:
        color = Colors.purple;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status.displayName,
        style: TextStyle(
          fontSize: 12,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildPriorityBadge(FeedbackPriority priority) {
    Color color;
    switch (priority) {
      case FeedbackPriority.low:
        color = Colors.grey;
        break;
      case FeedbackPriority.medium:
        color = Colors.blue;
        break;
      case FeedbackPriority.high:
        color = Colors.orange;
        break;
      case FeedbackPriority.critical:
        color = Colors.red;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        priority.displayName,
        style: TextStyle(
          fontSize: 12,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Icon _getAttachmentIcon(String type) {
    if (type.startsWith('image/')) {
      return const Icon(Icons.image, size: 18);
    } else if (type == 'application/pdf') {
      return const Icon(Icons.picture_as_pdf, size: 18);
    } else if (type.startsWith('text/')) {
      return const Icon(Icons.description, size: 18);
    }
    return const Icon(Icons.attachment, size: 18);
  }

  String _formatFullDate(DateTime date) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
