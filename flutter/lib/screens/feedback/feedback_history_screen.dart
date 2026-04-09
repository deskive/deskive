import 'package:flutter/material.dart';
import '../../api/services/feedback_api_service.dart';
import '../../models/feedback/feedback_model.dart';
import 'feedback_screen.dart';
import 'feedback_detail_screen.dart';

class FeedbackHistoryScreen extends StatefulWidget {
  const FeedbackHistoryScreen({super.key});

  @override
  State<FeedbackHistoryScreen> createState() => _FeedbackHistoryScreenState();
}

class _FeedbackHistoryScreenState extends State<FeedbackHistoryScreen>
    with SingleTickerProviderStateMixin {
  final FeedbackApiService _feedbackApi = FeedbackApiService();
  late TabController _tabController;

  List<FeedbackModel> _allFeedback = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadFeedback();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFeedback() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await _feedbackApi.getUserFeedback();

      if (result.success && result.data != null) {
        setState(() {
          _allFeedback = result.data!.data;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = result.message ?? 'Failed to load feedback';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'An error occurred: $e';
        _isLoading = false;
      });
    }
  }

  List<FeedbackModel> get _pendingFeedback =>
      _allFeedback.where((f) => !f.isResolved).toList();

  List<FeedbackModel> get _resolvedFeedback =>
      _allFeedback.where((f) => f.isResolved).toList();

  Future<void> _navigateToSubmit() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const FeedbackScreen()),
    );

    if (result == true) {
      _loadFeedback();
    }
  }

  void _navigateToDetail(FeedbackModel feedback) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FeedbackDetailScreen(feedback: feedback),
      ),
    ).then((_) => _loadFeedback());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Feedback & Support'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'All (${_allFeedback.length})'),
            Tab(text: 'Pending (${_pendingFeedback.length})'),
            Tab(text: 'Resolved (${_resolvedFeedback.length})'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildFeedbackList(_allFeedback),
                    _buildFeedbackList(_pendingFeedback),
                    _buildFeedbackList(_resolvedFeedback),
                  ],
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _navigateToSubmit,
        icon: const Icon(Icons.add),
        label: const Text('New Feedback'),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? 'An error occurred',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadFeedback,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeedbackList(List<FeedbackModel> feedbackList) {
    if (feedbackList.isEmpty) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: _loadFeedback,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: feedbackList.length,
        itemBuilder: (context, index) {
          return _buildFeedbackCard(feedbackList[index]);
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.feedback_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'No feedback yet',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Tap the button below to submit your first feedback',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.outline,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeedbackCard(FeedbackModel feedback) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _navigateToDetail(feedback),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _buildTypeBadge(feedback.type),
                  const SizedBox(width: 8),
                  _buildStatusBadge(feedback.status),
                  const Spacer(),
                  Text(
                    _formatDate(feedback.createdAt),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                feedback.title,
                style: theme.textTheme.titleMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                feedback.description,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.7),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (feedback.attachments.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.attachment,
                      size: 16,
                      color: theme.colorScheme.outline,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${feedback.attachments.length} attachment${feedback.attachments.length > 1 ? 's' : ''}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
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

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return '${difference.inMinutes}m ago';
      }
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
