import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:async';
import 'services/webrtc_service.dart';
import 'services/webrtc_config.dart';
import 'package:appatonce/appatonce.dart';

/// WebRTC Audio Call Screen using AppAtOnce SDK
/// This screen provides audio-only calling functionality with AppAtOnce WebRTC
class WebRTCAudioCallScreen extends StatefulWidget {
  final String? sessionId;
  final List<String> participants;
  final String meetingType;
  final bool isIncoming;

  const WebRTCAudioCallScreen({
    super.key,
    this.sessionId,
    this.participants = const [],
    this.meetingType = 'Audio Call',
    this.isIncoming = false,
  });

  @override
  State<WebRTCAudioCallScreen> createState() => _WebRTCAudioCallScreenState();
}

class _WebRTCAudioCallScreenState extends State<WebRTCAudioCallScreen>
    with WidgetsBindingObserver {
  late WebRTCService _webrtcService;
  Timer? _callTimer;
  int _callDurationSeconds = 0;
  bool _isConnected = false;
  bool _isSpeakerOn = false;
  String _callDuration = '00:00';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _webrtcService = WebRTCService.instance;
    _initializeCall();
    _startCallTimer();
  }

  @override
  void dispose() {
    _callTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _initializeCall() async {
    try {
      if (!_webrtcService.isInitialized) {
        await _webrtcService.initialize(WebRTCConfig.apiKey);
      }

      if (widget.sessionId != null) {
        // Join existing session
        await _webrtcService.joinVideoSession(
          widget.sessionId!,
          userName: 'User', // This should come from user context
        );
        
        // Turn off video for audio-only call
        if (_webrtcService.isVideoEnabled) {
          await _webrtcService.toggleVideo();
        }
      }

      setState(() {
        _isConnected = true;
      });

    } catch (e) {
      _showErrorDialog('Failed to connect to the audio call: $e');
    }
  }

  void _startCallTimer() {
    _callTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _callDurationSeconds++;
          final minutes = _callDurationSeconds ~/ 60;
          final seconds = _callDurationSeconds % 60;
          _callDuration = '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
        });
      }
    });
  }

  Future<void> _toggleAudio() async {
    try {
      await _webrtcService.toggleAudio();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_webrtcService.isAudioEnabled ? 'Microphone on' : 'Microphone muted'),
          duration: const Duration(seconds: 1),
          backgroundColor: _webrtcService.isAudioEnabled ? Colors.green : Colors.red,
        ),
      );
    } catch (e) {
      _showErrorDialog('Failed to toggle audio: $e');
    }
  }

  void _toggleSpeaker() {
    setState(() {
      _isSpeakerOn = !_isSpeakerOn;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_isSpeakerOn ? 'Speaker on' : 'Speaker off'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Future<void> _toggleRecording() async {
    try {
      await _webrtcService.toggleRecording();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_webrtcService.isRecording ? 'Recording started' : 'Recording stopped'),
          duration: const Duration(seconds: 1),
          backgroundColor: _webrtcService.isRecording ? Colors.red : Colors.grey,
        ),
      );
    } catch (e) {
      _showErrorDialog('Failed to toggle recording: $e');
    }
  }

  Future<void> _endCall() async {
    try {
      await _webrtcService.leaveVideoSession();
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      // Still navigate back even if there's an error
      if (mounted) {
        Navigator.pop(context);
      }
    }
  }

  void _showErrorDialog(String message) {
    if (!mounted) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).colorScheme.surface,
        title: Text(
          'Error',
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
        ),
        content: Text(
          message,
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('videocalls.ok'.tr()),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E293B),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // Top bar
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.meetingType,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '$_callDuration • ${_webrtcService.participants.length + 1} participants',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 16,
                          ),
                        ),
                        if (_webrtcService.isRecording)
                          Container(
                            margin: const EdgeInsets.only(top: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.red,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  'RECORDING',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
              
              const SizedBox(height: 60),
              
              // Participants display
              Expanded(
                child: _isConnected ? _buildParticipantsView() : _buildConnectingView(),
              ),
              
              // Bottom controls
              _buildControlBar(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConnectingView() {
    return const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        CircularProgressIndicator(color: Colors.white),
        SizedBox(height: 20),
        Text(
          'Connecting to audio call...',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
          ),
        ),
      ],
    );
  }

  Widget _buildParticipantsView() {
    final participants = _webrtcService.participants;
    final totalParticipants = participants.length + 1; // Include self

    if (totalParticipants <= 2) {
      return _buildMainSpeakerView(participants);
    } else {
      return _buildMultiParticipantView(participants);
    }
  }

  Widget _buildMainSpeakerView(List<VideoParticipant> participants) {
    // Show the main speaker (first participant or self if alone)
    String speakerName = 'videocalls.you'.tr();
    bool isSelf = true;
    
    if (participants.isNotEmpty) {
      final mainParticipant = participants.first;
      speakerName = mainParticipant.name ?? mainParticipant.identity;
      isSelf = false;
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Main speaker avatar
        Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            color: isSelf ? const Color(WebRTCUIConfig.primaryColor) : Colors.blue,
            borderRadius: BorderRadius.circular(60),
            border: Border.all(
              color: _webrtcService.isAudioEnabled && isSelf ? Colors.green : Colors.white,
              width: 3,
            ),
          ),
          child: Stack(
            children: [
              Center(
                child: Text(
                  speakerName.isNotEmpty ? speakerName[0].toUpperCase() : 'U',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              // Mute indicator
              if (isSelf && !_webrtcService.isAudioEnabled)
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.mic_off,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                ),
            ],
          ),
        ),
        
        const SizedBox(height: 20),
        
        Text(
          speakerName,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w500,
          ),
        ),
        
        if (isSelf && !_webrtcService.isAudioEnabled)
          const Text(
            'Muted',
            style: TextStyle(
              color: Colors.red,
              fontSize: 14,
            ),
          ),
        
        const SizedBox(height: 40),
        
        // Other participants (if any)
        if (participants.length > 1)
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: participants.skip(1).map((participant) {
              return _buildSmallParticipantAvatar(
                participant.name ?? participant.identity,
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildMultiParticipantView(List<VideoParticipant> participants) {
    return Column(
      children: [
        // Main speaker area
        Expanded(
          flex: 2,
          child: _buildMainSpeakerView([participants.first]),
        ),
        
        // Other participants grid
        Expanded(
          flex: 1,
          child: GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              childAspectRatio: 1.0,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: participants.length + 1, // Include self
            itemBuilder: (context, index) {
              if (index == 0) {
                // Self
                return _buildSmallParticipantAvatar('videocalls.you'.tr(), isSelf: true);
              } else {
                final participant = participants[index - 1];
                return _buildSmallParticipantAvatar(
                  participant.name ?? participant.identity,
                );
              }
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSmallParticipantAvatar(String name, {bool isSelf = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: isSelf ? const Color(WebRTCUIConfig.primaryColor) : Colors.grey[600],
            borderRadius: BorderRadius.circular(25),
            border: Border.all(
              color: isSelf && _webrtcService.isAudioEnabled ? Colors.green : Colors.grey,
              width: 2,
            ),
          ),
          child: Stack(
            children: [
              Center(
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'U',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (isSelf && !_webrtcService.isAudioEnabled)
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.mic_off,
                      color: Colors.white,
                      size: 10,
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        SizedBox(
          width: 60,
          child: Text(
            name,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 10,
            ),
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
      ],
    );
  }

  Widget _buildControlBar() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Mute/Unmute
        _buildControlButton(
          icon: _webrtcService.isAudioEnabled ? Icons.mic : Icons.mic_off,
          onPressed: _toggleAudio,
          isActive: _webrtcService.isAudioEnabled,
          backgroundColor: _webrtcService.isAudioEnabled ? null : Colors.red,
        ),
        
        // Speaker toggle
        _buildControlButton(
          icon: _isSpeakerOn ? Icons.volume_up : Icons.volume_down,
          onPressed: _toggleSpeaker,
          isActive: _isSpeakerOn,
        ),
        
        // Recording (if enabled)
        if (WebRTCFeatures.enableRecording)
          _buildControlButton(
            icon: _webrtcService.isRecording ? Icons.stop : Icons.fiber_manual_record,
            onPressed: _toggleRecording,
            isActive: true,
            backgroundColor: _webrtcService.isRecording ? Colors.red : null,
          ),
        
        // End Call
        _buildControlButton(
          icon: Icons.call_end,
          onPressed: _endCall,
          isActive: false,
          backgroundColor: Colors.red,
        ),
      ],
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required VoidCallback onPressed,
    required bool isActive,
    Color? backgroundColor,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          color: backgroundColor ?? 
              (isActive ? Colors.white.withOpacity(0.2) : Colors.grey.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(35),
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: 32,
        ),
      ),
    );
  }
}