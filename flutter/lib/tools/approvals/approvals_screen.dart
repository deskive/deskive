import 'dart:async';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/approval.dart';
import '../../api/services/approvals_api_service.dart';
import '../../api/services/workspace_api_service.dart';
import '../../services/workspace_service.dart';
import '../../services/auth_service.dart';
import '../../services/socket_io_chat_service.dart';
import '../../theme/app_theme.dart';
import 'approval_detail_screen.dart';
import 'create_request_screen.dart';
import 'request_types_screen.dart';
import 'widgets/approval_card.dart';
import 'widgets/stats_cards.dart';

class ApprovalsScreen extends StatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApprovalsApiService _apiService = ApprovalsApiService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  List<ApprovalRequest> _requests = [];
  List<RequestType> _requestTypes = [];
  ApprovalStats? _stats;
  bool _isLoading = true;
  String? _error;
  StreamSubscription<Map<String, dynamic>>? _approvalSubscription;

  // User role detection
  String? get _currentUserId => AuthService.instance.currentUser?.id;
  bool get _isOwnerOrAdmin {
    final membership = _workspaceService.currentWorkspace?.membership;
    if (membership == null) return false;
    // Use canManageWorkspace() helper which checks for owner/admin roles
    return membership.canManageWorkspace();
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadData();
    _setupApprovalSocketListener();
  }

  @override
  void dispose() {
    _approvalSubscription?.cancel();
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
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
    debugPrint('[ApprovalsScreen] Received approval event: $eventType');

    switch (eventType) {
      case 'request_created':
        _handleRequestCreated(data);
        break;
      case 'status_updated':
        _handleStatusUpdated(data);
        break;
      case 'request_deleted':
        _handleRequestDeleted(data);
        break;
      case 'comment_added':
        // Just refresh stats for now
        _refreshStats();
        break;
    }
  }

  void _handleRequestCreated(Map<String, dynamic> data) {
    final requestData = data['request'] as Map<String, dynamic>?;
    if (requestData == null) return;

    final newRequest = ApprovalRequest.fromJson(requestData);

    // Check if request already exists
    if (_requests.any((r) => r.id == newRequest.id)) return;

    setState(() {
      _requests.insert(0, newRequest);
    });
    _refreshStats();

    // Show a snackbar notification
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('approvals.new_request_received'.tr(args: [newRequest.title])),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  void _handleStatusUpdated(Map<String, dynamic> data) {
    // Reload data to get the updated request
    _loadData();
  }

  void _handleRequestDeleted(Map<String, dynamic> data) {
    final requestId = data['requestId'] as String?;
    if (requestId == null) return;

    setState(() {
      _requests = _requests.where((r) => r.id != requestId).toList();
    });
    _refreshStats();
  }

  Future<void> _refreshStats() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final statsResponse = await _apiService.getStats(workspaceId);
    if (statsResponse.success && mounted) {
      setState(() {
        _stats = statsResponse.data;
      });
    }
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) {
      setState(() {});
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
      // Load requests, stats, and request types in parallel
      final results = await Future.wait([
        _apiService.getRequests(workspaceId),
        _apiService.getStats(workspaceId),
        _apiService.getRequestTypes(workspaceId),
      ]);

      final requestsResponse = results[0] as dynamic;
      final statsResponse = results[1] as dynamic;
      final typesResponse = results[2] as dynamic;

      if (mounted) {
        setState(() {
          if (requestsResponse.success) {
            _requests = requestsResponse.data as List<ApprovalRequest>;
          }
          if (statsResponse.success) {
            _stats = statsResponse.data as ApprovalStats;
          }
          if (typesResponse.success) {
            _requestTypes = typesResponse.data as List<RequestType>;
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load data: $e';
          _isLoading = false;
        });
      }
    }
  }

  /// Filter requests based on user role and selected tab
  /// - Owners/admins see all requests
  /// - Regular members see: their own requests + requests where they're an approver
  List<ApprovalRequest> _getFilteredRequests(List<ApprovalRequest> requests) {
    // First filter by ownership for non-admin/owner members
    List<ApprovalRequest> filtered;
    if (_isOwnerOrAdmin) {
      filtered = requests;
    } else {
      // Regular members see:
      // 1. Requests they created (as requester)
      // 2. Requests where they are an approver
      filtered = requests.where((r) {
        // Is requester
        if (r.requesterId == _currentUserId) return true;
        // Is approver
        if (r.approvers.any((a) => a.userId == _currentUserId)) return true;
        return false;
      }).toList();
    }
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('approvals.title'.tr()),
        actions: [
          // Manage Types button - only visible to owners/admins
          if (_isOwnerOrAdmin)
            IconButton(
              icon: const Icon(Icons.category_outlined),
              tooltip: 'approvals.manage_types'.tr(),
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const RequestTypesScreen(),
                  ),
                );
                _loadData();
              },
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: [
            Tab(text: 'approvals.tab_all'.tr()),
            Tab(text: 'approvals.tab_pending'.tr()),
            Tab(text: 'approvals.tab_approved'.tr()),
            Tab(text: 'approvals.tab_rejected'.tr()),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: Column(
                    children: [
                      // Stats Cards - only visible to owners/admins
                      if (_stats != null && _isOwnerOrAdmin)
                        ApprovalStatsCards(stats: _stats!),

                      // Request Types Quick Access - only for owners/admins
                      if (_isOwnerOrAdmin && _requestTypes.isNotEmpty)
                        _buildRequestTypesSection(isDark),

                      // Request List
                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _buildRequestList(_getFilteredRequests(_requests)),
                            _buildRequestList(_getFilteredRequests(_requests.where((r) => r.status == RequestStatus.pending).toList())),
                            _buildRequestList(_getFilteredRequests(_requests.where((r) => r.status == RequestStatus.approved).toList())),
                            _buildRequestList(_getFilteredRequests(_requests.where((r) => r.status == RequestStatus.rejected).toList())),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const CreateRequestScreen(),
            ),
          );
          if (result == true) {
            _loadData();
          }
        },
        icon: const Icon(Icons.add),
        label: Text('approvals.new_request'.tr()),
        backgroundColor: context.primaryColor,
        foregroundColor: Colors.white,
      ),
    );
  }

  /// Request types quick access section for owners/admins
  Widget _buildRequestTypesSection(bool isDark) {
    // Show first 3 active request types
    final activeTypes = _requestTypes.where((t) => t.isActive).take(3).toList();
    if (activeTypes.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'approvals.request_types'.tr(),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                  letterSpacing: 0.5,
                ),
              ),
              TextButton(
                onPressed: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const RequestTypesScreen(),
                    ),
                  );
                  _loadData();
                },
                child: Text(
                  'approvals.manage_types'.tr(),
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 70,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: activeTypes.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final type = activeTypes[index];
                return _buildRequestTypeCard(type, isDark);
              },
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildRequestTypeCard(RequestType type, bool isDark) {
    final color = _parseColor(type.color ?? '#2196F3');
    return InkWell(
      onTap: () async {
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => CreateRequestScreen(preselectedTypeId: type.id),
          ),
        );
        if (result == true) {
          _loadData();
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 140,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.borderColor),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.description_outlined, color: color, size: 20),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                type.name,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black87,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
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

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? 'An error occurred',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey[600],
              ),
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

  Widget _buildRequestList(List<ApprovalRequest> requests) {
    if (requests.isEmpty) {
      return _buildEmptyView();
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: requests.length,
      itemBuilder: (context, index) {
        final request = requests[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: ApprovalCard(
            request: request,
            onTap: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ApprovalDetailScreen(requestId: request.id),
                ),
              );
              if (result == true) {
                _loadData();
              }
            },
          ),
        );
      },
    );
  }

  Widget _buildEmptyView() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.approval_outlined,
              size: 64,
              color: isDark ? Colors.white38 : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'approvals.empty_title'.tr(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'approvals.empty_subtitle'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: isDark ? Colors.white38 : Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
