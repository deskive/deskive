import 'dart:async';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../dao/video_call_dao.dart';
import '../models/videocalls/video_call.dart';
import '../models/videocalls/join_request.dart';
import '../services/auth_service.dart';
import '../services/video_call_socket_service.dart';
import 'widgets/join_request_modal.dart';
import 'widgets/join_request_notification.dart';
import 'video_call_screen.dart';

/// Video Call Join Screen
/// Handles the join request flow before allowing users to enter the call
class VideoCallJoinScreen extends StatefulWidget {
  final String callId;
  final String workspaceId;

  const VideoCallJoinScreen({
    super.key,
    required this.callId,
    required this.workspaceId,
  });

  @override
  State<VideoCallJoinScreen> createState() => _VideoCallJoinScreenState();
}

class _VideoCallJoinScreenState extends State<VideoCallJoinScreen> {
  final VideoCallDao _videoCallDao = VideoCallDao();

  bool _isLoading = true;
  bool _isAuthorized = false;
  bool _isHost = false;
  bool _showJoinRequestModal = false;
  bool _waitingForApproval = false;
  String? _pendingRequestId;
  String? _error;

  VideoCall? _call;
  String? _livekitToken;
  String? _livekitUrl;

  // Join requests for host
  List<JoinRequest> _joinRequests = [];

  // WebSocket subscriptions
  StreamSubscription? _joinRequestNewSubscription;
  StreamSubscription? _joinRequestAcceptedSubscription;
  StreamSubscription? _joinRequestRejectedSubscription;

  @override
  void initState() {
    super.initState();
    _checkAuthorization();
  }

  @override
  void dispose() {
    _joinRequestNewSubscription?.cancel();
    _joinRequestAcceptedSubscription?.cancel();
    _joinRequestRejectedSubscription?.cancel();
    super.dispose();
  }

  Future<void> _checkAuthorization() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {

      // Get call details
      _call = await _videoCallDao.getCallById(widget.callId);

      if (_call == null) {
        setState(() {
          _error = 'Call not found';
          _isLoading = false;
        });
        return;
      }

      // Check if user is the host
      final userId = AuthService.instance.currentUser?.id;
      _isHost = _call!.hostUserId == userId;


      // Check if user is invited
      final isInvited = _call!.invitees?.contains(userId) ?? false;

      if (_isHost || isInvited) {
        // User is authorized - join the call
        await _joinCall();
      } else {
        // User needs to request to join
        setState(() {
          _isAuthorized = false;
          _showJoinRequestModal = true;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to check authorization: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _joinCall() async {
    try {

      final response = await _videoCallDao.joinCall(widget.callId);


      setState(() {
        _isAuthorized = true;
        _livekitToken = response['token'];
        _livekitUrl = response['room_url'];
        _isLoading = false;
      });

      // Setup WebSocket listeners for join requests if user is host
      if (_isHost) {
        _setupHostWebSocketListeners();
        _fetchPendingJoinRequests();
      }
    } catch (e) {

      // Check if error is due to not being invited
      if (e.toString().contains('not invited') ||
          e.toString().contains('not authorized') ||
          e.toString().contains('403')) {
        setState(() {
          _isAuthorized = false;
          _showJoinRequestModal = true;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to join call: $e';
          _isLoading = false;
        });
      }
    }
  }

  void _setupHostWebSocketListeners() {

    try {
      final socketService = VideoCallSocketService.instance;

      // Listen for new join requests
      _joinRequestNewSubscription = socketService.onJoinRequestNew.listen((request) {

        if (mounted) {
          setState(() {
            // Avoid duplicates
            if (!_joinRequests.any((r) => r.id == request.id)) {
              _joinRequests.add(request);
            }
          });

          // Show snackbar notification
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${request.displayName} wants to join the call'),
              backgroundColor: Colors.blue,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      });

      // Listen for accepted requests (to remove from list)
      _joinRequestAcceptedSubscription =
          socketService.onJoinRequestAccepted.listen((data) {

        if (mounted) {
          setState(() {
            _joinRequests.removeWhere((r) => r.id == data.requestId);
          });
        }
      });

      // Listen for rejected requests (to remove from list)
      _joinRequestRejectedSubscription =
          socketService.onJoinRequestRejected.listen((data) {

        if (mounted) {
          setState(() {
            _joinRequests.removeWhere((r) => r.id == data.requestId);
          });
        }
      });
    } catch (e) {
    }
  }

  void _setupRequesterWebSocketListeners() {

    try {
      final socketService = VideoCallSocketService.instance;

      // Listen for request accepted
      _joinRequestAcceptedSubscription =
          socketService.onJoinRequestAccepted.listen((data) {

        if (data.requestId == _pendingRequestId && mounted) {
          // Reset waiting state
          setState(() {
            _waitingForApproval = false;
            _pendingRequestId = null;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('videocalls.request_accepted_joining'.tr()),
              backgroundColor: Colors.green,
            ),
          );

          // Reload and join the call
          _checkAuthorization();
        }
      });

      // Listen for request rejected
      _joinRequestRejectedSubscription =
          socketService.onJoinRequestRejected.listen((data) {

        if (data.requestId == _pendingRequestId && mounted) {
          setState(() {
            _waitingForApproval = false;
            _pendingRequestId = null;
            _error = 'Your request to join was rejected by the host.';
          });
        }
      });
    } catch (e) {
    }
  }

  Future<void> _fetchPendingJoinRequests() async {
    try {

      final requests = await _videoCallDao.getJoinRequests(widget.callId);


      if (mounted) {
        setState(() {
          _joinRequests = requests;
        });

        if (requests.isNotEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('videocalls.pending_join_requests'.tr(args: [requests.length.toString()])),
              backgroundColor: Colors.blue,
            ),
          );
        }
      }
    } catch (e) {
    }
  }

  Future<void> _handleRequestJoin(String displayName, String message) async {
    try {

      // Setup listeners first to catch quick responses
      _setupRequesterWebSocketListeners();

      final response = await _videoCallDao.requestJoin(
        widget.callId,
        displayName,
        message: message,
      );


      if (mounted) {
        setState(() {
          _showJoinRequestModal = false;
          _waitingForApproval = true;
          _pendingRequestId = response['request_id'];
        });

        Navigator.of(context).pop(); // Close the modal

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.join_request_sent'.tr()),
            backgroundColor: Colors.blue,
          ),
        );
      }
    } catch (e) {

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_send_request'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleAcceptRequest(String requestId) async {
    try {

      await _videoCallDao.acceptJoinRequest(widget.callId, requestId);

      if (mounted) {
        setState(() {
          _joinRequests.removeWhere((r) => r.id == requestId);
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.join_request_accepted'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_accept_request'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleRejectRequest(String requestId) async {
    try {

      await _videoCallDao.rejectJoinRequest(widget.callId, requestId);

      if (mounted) {
        setState(() {
          _joinRequests.removeWhere((r) => r.id == requestId);
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.join_request_rejected'.tr()),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_reject_request'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Loading state
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Colors.grey[900],
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.blue),
              SizedBox(height: 16),
              Text(
                'Connecting to video call...',
                style: TextStyle(color: Colors.white, fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    // Error state
    if (_error != null) {
      return Scaffold(
        backgroundColor: Colors.grey[900],
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.red),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: Colors.red,
                        size: 48,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Connection Failed',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _error!,
                        style: const TextStyle(color: Colors.grey),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text('videocalls.go_back'.tr()),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Waiting for approval state
    if (_waitingForApproval) {
      return Scaffold(
        backgroundColor: Colors.grey[900],
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.blue),
              const SizedBox(height: 24),
              const Text(
                'Waiting for host approval...',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'The host will be notified of your request',
                style: TextStyle(color: Colors.grey[400]),
              ),
              const SizedBox(height: 32),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text('common.cancel'.tr()),
              ),
            ],
          ),
        ),
      );
    }

    // Show join request modal for unauthorized users
    if (_showJoinRequestModal && !_isAuthorized) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        showJoinRequestModal(
          context: context,
          roomName: _call?.title,
          callType: _call?.callType ?? 'video',
          onRequestJoin: _handleRequestJoin,
          onCancel: () => Navigator.of(context).pop(),
        );
      });

      return Scaffold(
        backgroundColor: Colors.grey[900],
        body: const Center(
          child: CircularProgressIndicator(color: Colors.blue),
        ),
      );
    }

    // Authorized - show the video call
    if (_isAuthorized && _livekitToken != null && _livekitUrl != null) {
      return Stack(
        children: [
          VideoCallScreen(
            callId: widget.callId,
            callerName: AuthService.instance.currentUser?.name ??
                AuthService.instance.currentUser?.email ??
                'User',
            isJoinViaLink: true,
          ),

          // Show join request notifications for host
          if (_isHost && _joinRequests.isNotEmpty)
            JoinRequestList(
              requests: _joinRequests,
              onAccept: _handleAcceptRequest,
              onReject: _handleRejectRequest,
            ),
        ],
      );
    }

    // Fallback - should not reach here
    return Scaffold(
      backgroundColor: Colors.grey[900],
      body: const Center(
        child: Text(
          'Something went wrong',
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}
