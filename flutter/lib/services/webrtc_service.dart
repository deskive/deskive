import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'socket_io_chat_service.dart';

/// WebRTC Service for managing peer-to-peer video/audio connections
class WebRTCService {
  static final WebRTCService _instance = WebRTCService._internal();
  factory WebRTCService() => _instance;
  WebRTCService._internal();

  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  String? _recipientUserId; // Store recipient ID for WebRTC signaling
  final SocketIOChatService _socketService = SocketIOChatService.instance;

  // ICE servers configuration (STUN servers for NAT traversal)
  final Map<String, dynamic> _iceServers = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
      {'urls': 'stun:stun2.l.google.com:19302'},
    ]
  };

  // WebRTC configuration
  final Map<String, dynamic> _config = {
    'mandatory': {},
    'optional': [
      {'DtlsSrtpKeyAgreement': true},
    ],
  };

  /// Get user media (camera and microphone)
  Future<MediaStream> getUserMedia({
    bool audio = true,
    bool video = true,
    String facingMode = 'user',
  }) async {
    final Map<String, dynamic> mediaConstraints = {
      'audio': audio,
      'video': video
          ? {
              'facingMode': facingMode,
              'width': {'ideal': 1280},
              'height': {'ideal': 720},
              'frameRate': {'ideal': 30},
            }
          : false,
    };

    try {
      final stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      _localStream = stream;
      return stream;
    } catch (e) {
      rethrow;
    }
  }

  /// Create peer connection
  Future<RTCPeerConnection> initializePeerConnection(String callId, {String? recipientId}) async {
    try {
      _recipientUserId = recipientId; // Store for ICE candidate sending
      _peerConnection = await createPeerConnection(_iceServers);

      // Add local stream tracks
      if (_localStream != null) {
        _localStream!.getTracks().forEach((track) {
          _peerConnection!.addTrack(track, _localStream!);
        });
      }

      // Handle ICE candidates
      _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
        if (candidate.candidate != null) {
          _socketService.sendICECandidate(callId, candidate, to: _recipientUserId);
        }
      };

      // Handle connection state changes
      _peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
      };

      // Handle ICE connection state
      _peerConnection!.onIceConnectionState = (RTCIceConnectionState state) {
      };

      // Handle signaling state changes
      _peerConnection!.onSignalingState = (RTCSignalingState state) {
      };

      return _peerConnection!;
    } catch (e) {
      rethrow;
    }
  }

  /// Create offer (caller side)
  Future<RTCSessionDescription> createOffer(String callId, {String? recipientId}) async {
    if (_peerConnection == null) {
      throw Exception('Peer connection not initialized');
    }

    try {
      final offer = await _peerConnection!.createOffer();
      await _peerConnection!.setLocalDescription(offer);

      // Send offer via socket
      _socketService.sendWebRTCOffer(callId, offer, to: recipientId);

      return offer;
    } catch (e) {
      rethrow;
    }
  }

  /// Create answer (callee side)
  Future<RTCSessionDescription> createAnswer(String callId, {String? recipientId}) async {
    if (_peerConnection == null) {
      throw Exception('Peer connection not initialized');
    }

    try {
      final answer = await _peerConnection!.createAnswer();
      await _peerConnection!.setLocalDescription(answer);

      // Send answer via socket
      _socketService.sendWebRTCAnswer(callId, answer, to: recipientId);

      return answer;
    } catch (e) {
      rethrow;
    }
  }

  /// Set remote description (for incoming offer/answer)
  Future<void> setRemoteDescription(RTCSessionDescription description) async {
    if (_peerConnection == null) {
      throw Exception('Peer connection not initialized');
    }

    try {
      await _peerConnection!.setRemoteDescription(description);
    } catch (e) {
      rethrow;
    }
  }

  /// Add ICE candidate received from remote peer
  Future<void> addIceCandidate(RTCIceCandidate candidate) async {
    if (_peerConnection == null) {
      throw Exception('Peer connection not initialized');
    }

    try {
      await _peerConnection!.addCandidate(candidate);
    } catch (e) {
      rethrow;
    }
  }

  /// Toggle audio track (mute/unmute)
  void toggleAudio(bool enabled) {
    if (_localStream != null) {
      _localStream!.getAudioTracks().forEach((track) {
        track.enabled = enabled;
      });
    }
  }

  /// Toggle video track (on/off)
  void toggleVideo(bool enabled) {
    if (_localStream != null) {
      _localStream!.getVideoTracks().forEach((track) {
        track.enabled = enabled;
      });
    }
  }

  /// Switch camera (front/back)
  Future<void> switchCamera() async {
    if (_localStream != null && _localStream!.getVideoTracks().isNotEmpty) {
      try {
        final videoTrack = _localStream!.getVideoTracks()[0];
        await Helper.switchCamera(videoTrack);
      } catch (e) {
        rethrow;
      }
    }
  }

  /// Enable/disable speakerphone
  void setSpeakerphone(bool enabled) {
    Helper.setSpeakerphoneOn(enabled);
  }

  /// Dispose resources and clean up
  Future<void> dispose() async {

    // Stop all tracks in local stream
    if (_localStream != null) {
      _localStream!.getTracks().forEach((track) {
        track.stop();
      });
      await _localStream!.dispose();
      _localStream = null;
    }

    // Dispose remote stream
    if (_remoteStream != null) {
      await _remoteStream!.dispose();
      _remoteStream = null;
    }

    // Close peer connection
    if (_peerConnection != null) {
      await _peerConnection!.close();
      await _peerConnection!.dispose();
      _peerConnection = null;
    }

  }

  // Getters
  MediaStream? get localStream => _localStream;
  MediaStream? get remoteStream => _remoteStream;
  RTCPeerConnection? get peerConnection => _peerConnection;

  /// Set remote stream (called when receiving remote tracks)
  set remoteStream(MediaStream? stream) {
    _remoteStream = stream;
  }
}
