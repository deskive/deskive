import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart';

/// Service to manage in-app floating call bubble overlay
class CallOverlayService {
  static final CallOverlayService instance = CallOverlayService._internal();
  CallOverlayService._internal();

  // Overlay entry for the floating bubble
  OverlayEntry? _overlayEntry;

  // Call state
  Room? activeRoom;
  LocalParticipant? localParticipant;
  List<RemoteParticipant> remoteParticipants = [];
  String? callId;
  String? callerName;
  bool isMicEnabled = true;
  bool isCameraEnabled = true;

  // Bubble visibility
  bool get isVisible => _overlayEntry != null;

  /// Show the floating bubble
  void showBubble(BuildContext context, {
    required Room room,
    required String callId,
    String? callerName,
    bool micEnabled = true,
    bool cameraEnabled = true,
    required Function(BuildContext) onTap,
  }) {
    // Don't show if already visible
    if (_overlayEntry != null) return;

    // Store call state
    activeRoom = room;
    localParticipant = room.localParticipant;
    remoteParticipants = room.remoteParticipants.values.toList();
    this.callId = callId;
    this.callerName = callerName;
    isMicEnabled = micEnabled;
    isCameraEnabled = cameraEnabled;

    // Create overlay entry
    _overlayEntry = OverlayEntry(
      builder: (overlayContext) => FloatingCallBubble(
        room: room,
        callId: callId,
        callerName: callerName,
        onTap: () {
          removeBubble();
          // Pass the overlay context which is still valid
          onTap(overlayContext);
        },
        onClose: () {
          removeBubble();
          // End call
          room.disconnect();
        },
      ),
    );

    // Insert into overlay
    Overlay.of(context).insert(_overlayEntry!);
  }

  /// Remove the floating bubble
  void removeBubble() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  /// Update participants list
  void updateParticipants(List<RemoteParticipant> participants) {
    remoteParticipants = participants;
  }

  /// Dispose resources
  void dispose() {
    removeBubble();
    activeRoom = null;
    localParticipant = null;
    remoteParticipants = [];
  }
}

/// Floating call bubble widget
class FloatingCallBubble extends StatefulWidget {
  final Room room;
  final String callId;
  final String? callerName;
  final VoidCallback onTap;
  final VoidCallback onClose;

  const FloatingCallBubble({
    super.key,
    required this.room,
    required this.callId,
    this.callerName,
    required this.onTap,
    required this.onClose,
  });

  @override
  State<FloatingCallBubble> createState() => _FloatingCallBubbleState();
}

class _FloatingCallBubbleState extends State<FloatingCallBubble> {
  Offset _position = const Offset(20, 100);
  List<RemoteParticipant> _remoteParticipants = [];

  @override
  void initState() {
    super.initState();
    _remoteParticipants = widget.room.remoteParticipants.values.toList();

    // Listen for participant changes
    widget.room.createListener().on<ParticipantConnectedEvent>((event) {
      setState(() {
        _remoteParticipants = widget.room.remoteParticipants.values.toList();
      });
    });

    widget.room.createListener().on<ParticipantDisconnectedEvent>((event) {
      setState(() {
        _remoteParticipants = widget.room.remoteParticipants.values.toList();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final remoteParticipant = _remoteParticipants.firstOrNull;

    // Get video track
    VideoTrack? videoTrack;
    String participantName = 'You';
    bool isCameraEnabled = false;

    if (remoteParticipant != null) {
      final videoPublication = remoteParticipant.videoTrackPublications.firstOrNull;
      videoTrack = videoPublication?.track as VideoTrack?;
      participantName = remoteParticipant.name ?? remoteParticipant.identity ?? 'Participant';
      isCameraEnabled = videoTrack != null &&
                       !videoTrack.muted &&
                       videoPublication?.subscribed == true;
    } else {
      videoTrack = widget.room.localParticipant?.videoTrackPublications.firstOrNull?.track as VideoTrack?;
      participantName = 'You';
      isCameraEnabled = videoTrack != null;
    }

    return Positioned(
      left: _position.dx,
      top: _position.dy,
      child: GestureDetector(
        onPanUpdate: (details) {
          setState(() {
            _position = Offset(
              (_position.dx + details.delta.dx).clamp(0, screenSize.width - 100),
              (_position.dy + details.delta.dy).clamp(0, screenSize.height - 180),
            );
          });
        },
        onTap: widget.onTap,
        child: Material(
          elevation: 8,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 100,
            height: 180,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF6264A7), width: 2),
            ),
            child: Stack(
              children: [
                // Video or avatar
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: videoTrack != null && isCameraEnabled
                      ? VideoTrackRenderer(videoTrack, fit: VideoViewFit.cover)
                      : Container(
                          color: const Color(0xFF1C1C1E),
                          child: Center(
                            child: Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [Color(0xFF6264A7), Color(0xFF8B8FD8)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  participantName.isNotEmpty
                                      ? participantName.substring(0, 1).toUpperCase()
                                      : 'C',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                ),

                // Name badge at bottom
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(10),
                        bottomRight: Radius.circular(10),
                      ),
                    ),
                    child: Text(
                      participantName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),

                // Self-preview (local camera) - small rectangle in top-left corner
                if (widget.room.localParticipant?.videoTrackPublications.isNotEmpty == true)
                  Positioned(
                    top: 4,
                    left: 4,
                    child: Container(
                      width: 28,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        border: Border.all(color: Colors.white.withOpacity(0.5), width: 1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: Builder(
                          builder: (context) {
                            final localVideoTrack = widget.room.localParticipant
                                ?.videoTrackPublications.firstOrNull?.track as VideoTrack?;
                            if (localVideoTrack != null && !localVideoTrack.muted) {
                              return VideoTrackRenderer(localVideoTrack, fit: VideoViewFit.cover);
                            }
                            return Container(
                              color: const Color(0xFF1C1C1E),
                              child: const Icon(
                                Icons.person,
                                color: Colors.white38,
                                size: 16,
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),

                // Close button
                Positioned(
                  top: 4,
                  right: 4,
                  child: GestureDetector(
                    onTap: () {
                      // Show confirmation dialog
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: const Color(0xFF2C2C2E),
                          title: const Text('End Call?', style: TextStyle(color: Colors.white)),
                          content: const Text(
                            'Are you sure you want to end this call?',
                            style: TextStyle(color: Color(0xFF8E8E93)),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('Cancel', style: TextStyle(color: Color(0xFF6264A7))),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                widget.onClose();
                              },
                              child: const Text('End Call', style: TextStyle(color: Color(0xFFC4314B))),
                            ),
                          ],
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.8),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.call_end,
                        color: Colors.white,
                        size: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
