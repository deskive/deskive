import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'services/webrtc_service.dart';
import 'services/webrtc_config.dart';
import 'webrtc_video_call_screen.dart';
import 'webrtc_audio_call_screen.dart';
import '../theme/app_theme.dart';

class QuickMeetingScreen extends StatefulWidget {
  const QuickMeetingScreen({super.key});

  @override
  State<QuickMeetingScreen> createState() => _QuickMeetingScreenState();
}

class _QuickMeetingScreenState extends State<QuickMeetingScreen> {
  String _selectedMeetingType = 'Video Call';
  final List<bool> _selectedMembers = List.generate(5, (_) => false);
  
  final List<String> _meetingTypes = [
    'Video Call',
    'Audio Call',
    'Screen Share',
    'Conference Call'
  ];
  
  final List<TeamMember> _teamMembers = [
    TeamMember(name: 'John Doe', status: MemberStatus.online, avatar: '👨🏻‍💼'),
    TeamMember(name: 'Jane Smith', status: MemberStatus.online, avatar: '👩🏼‍💼'),
    TeamMember(name: 'Alex Johnson', status: MemberStatus.away, avatar: '👨🏽‍💼'),
    TeamMember(name: 'Emily Davis', status: MemberStatus.offline, avatar: '👩🏻‍💼'),
    TeamMember(name: 'Michael Wilson', status: MemberStatus.online, avatar: '👨🏾‍💼'),
  ];

  @override
  Widget build(BuildContext context) {
    final selectedCount = _selectedMembers.where((selected) => selected).length;
    
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: Theme.of(context).colorScheme.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Start Quick Meeting',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Meeting Type Section
            Text(
              'Meeting Type',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).colorScheme.outline.withOpacity(0.3),
                ),
              ),
              child: DropdownButton<String>(
                value: _selectedMeetingType,
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedMeetingType = newValue!;
                  });
                },
                isExpanded: true,
                underline: Container(),
                dropdownColor: Theme.of(context).colorScheme.surface,
                icon: Icon(Icons.keyboard_arrow_down, color: Theme.of(context).colorScheme.onSurface),
                style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 16),
                items: _meetingTypes.map<DropdownMenuItem<String>>((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value, style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                  );
                }).toList(),
              ),
            ),
            
            const SizedBox(height: 32),
            
            // Select Team Members Section
            Text(
              'Select Team Members',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            
            // Team Members List
            Expanded(
              child: ListView.builder(
                itemCount: _teamMembers.length,
                itemBuilder: (context, index) {
                  final member = _teamMembers[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        // Checkbox
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedMembers[index] = !_selectedMembers[index];
                            });
                          },
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: _selectedMembers[index] 
                                  ? Theme.of(context).colorScheme.primary 
                                  : Colors.transparent,
                              border: Border.all(
                                color: _selectedMembers[index] 
                                    ? Theme.of(context).colorScheme.primary 
                                    : Theme.of(context).colorScheme.outline,
                                width: 2,
                              ),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: _selectedMembers[index]
                                ? Icon(
                                    Icons.check,
                                    color: Theme.of(context).colorScheme.onPrimary,
                                    size: 14,
                                  )
                                : null,
                          ),
                        ),
                        const SizedBox(width: 16),
                        
                        // Avatar
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Center(
                            child: Text(
                              member.avatar,
                              style: const TextStyle(fontSize: 20),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        
                        // Name
                        Expanded(
                          child: Text(
                            member.name,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface,
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        
                        // Status Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: _getStatusColor(member.status),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            _getStatusText(member.status),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Bottom Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: selectedCount > 0 ? _startMeeting : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: selectedCount > 0 
                          ? context.primaryColor
                          : Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
                      foregroundColor: selectedCount > 0
                          ? Colors.white
                          : Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Start Meeting',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Theme.of(context).colorScheme.onSurface,
                      side: BorderSide(color: Theme.of(context).colorScheme.outline),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Cancel',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Color _getStatusColor(MemberStatus status) {
    switch (status) {
      case MemberStatus.online:
        return const Color(0xFF10B981);
      case MemberStatus.away:
        return const Color(0xFF6B7280);
      case MemberStatus.offline:
        return const Color(0xFF6B7280);
    }
  }
  
  String _getStatusText(MemberStatus status) {
    switch (status) {
      case MemberStatus.online:
        return 'online';
      case MemberStatus.away:
        return 'away';
      case MemberStatus.offline:
        return 'offline';
    }
  }
  
  void _startMeeting() async {
    final selectedMembersList = <String>[];
    for (int i = 0; i < _selectedMembers.length; i++) {
      if (_selectedMembers[i]) {
        selectedMembersList.add(_teamMembers[i].name);
      }
    }
    
    // Show connecting dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).colorScheme.surface,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(height: 16),
            Text(
              'Starting $_selectedMeetingType...',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Connecting to ${selectedMembersList.join(', ')}',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
    
    try {
      // Initialize WebRTC service if not already initialized
      final webrtcService = WebRTCService.instance;
      if (!webrtcService.isInitialized) {
        await webrtcService.initialize(WebRTCConfig.apiKey);
      }
      
      // Create session based on meeting type
      String sessionTitle = '$_selectedMeetingType Meeting';
      bool enableScreenShare = _selectedMeetingType == 'Screen Share';
      bool enableRecording = _selectedMeetingType != 'Audio Call';
      
      // Create and join the session
      final session = await webrtcService.createAndJoinQuickMeeting(
        title: sessionTitle,
        userName: 'Host User', // This should come from user context
        invitedParticipants: selectedMembersList,
      );
      
      if (mounted) {
        Navigator.pop(context); // Close connecting dialog
        
        // Navigate to appropriate call screen
        
        if (_selectedMeetingType == 'Video Call') {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => WebRTCVideoCallScreen(
                sessionId: session.id,
                participants: selectedMembersList,
                meetingType: _selectedMeetingType,
              ),
            ),
          );
        } else if (_selectedMeetingType == 'Audio Call') {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => WebRTCAudioCallScreen(
                sessionId: session.id,
                participants: selectedMembersList,
                meetingType: _selectedMeetingType,
              ),
            ),
          );
        } else {
          // For Screen Share and Conference Call
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => WebRTCGenericCallScreen(
                sessionId: session.id,
                participants: selectedMembersList,
                meetingType: _selectedMeetingType,
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close connecting dialog
        
        // Show error dialog
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: Theme.of(context).colorScheme.surface,
            title: Text(
              'Connection Failed',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
            ),
            content: Text(
              'Failed to start $_selectedMeetingType: $e',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.ok'.tr()),
              ),
            ],
          ),
        );
      }
    }
  }
}

// Data models
class TeamMember {
  final String name;
  final MemberStatus status;
  final String avatar;
  
  TeamMember({
    required this.name,
    required this.status,
    required this.avatar,
  });
}

enum MemberStatus {
  online,
  away,
  offline,
}

// Generic call screen for screen sharing and conference calls
class WebRTCGenericCallScreen extends StatefulWidget {
  final String sessionId;
  final List<String> participants;
  final String meetingType;

  const WebRTCGenericCallScreen({
    super.key,
    required this.sessionId,
    required this.participants,
    required this.meetingType,
  });

  @override
  State<WebRTCGenericCallScreen> createState() => _WebRTCGenericCallScreenState();
}

class _WebRTCGenericCallScreenState extends State<WebRTCGenericCallScreen> {
  late WebRTCService _webrtcService;
  bool _isConnected = false;

  @override
  void initState() {
    super.initState();
    _webrtcService = WebRTCService.instance;
    _initializeCall();
  }

  Future<void> _initializeCall() async {
    try {
      if (!_webrtcService.isInitialized) {
        await _webrtcService.initialize(WebRTCConfig.apiKey);
      }

      // Join the existing session
      await _webrtcService.joinVideoSession(
        widget.sessionId,
        userName: 'User',
      );

      setState(() {
        _isConnected = true;
      });
    } catch (e) {
    }
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
                          '${_webrtcService.participants.length + 1} participants',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 16,
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
              
              // Meeting content area
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey[800],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        widget.meetingType == 'Screen Share' 
                            ? Icons.screen_share 
                            : Icons.groups,
                        color: Colors.white70,
                        size: 80,
                      ),
                      const SizedBox(height: 20),
                      Text(
                        widget.meetingType == 'Screen Share' 
                            ? 'Screen Sharing Session'
                            : 'Conference Call',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 40),
                      if (_isConnected && widget.participants.isNotEmpty)
                        Column(
                          children: [
                            Text(
                              '${'videocalls.participants'.tr()}:',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              widget.participants.join(', '),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 40),
              
              // Bottom controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildControlButton(
                    icon: _webrtcService.isAudioEnabled ? Icons.mic : Icons.mic_off,
                    onPressed: _toggleAudio,
                    isActive: _webrtcService.isAudioEnabled,
                    backgroundColor: _webrtcService.isAudioEnabled ? null : Colors.red,
                  ),
                  if (widget.meetingType == 'Screen Share')
                    _buildControlButton(
                      icon: _webrtcService.isScreenSharing ? Icons.stop_screen_share : Icons.screen_share,
                      onPressed: _toggleScreenShare,
                      isActive: true,
                      backgroundColor: _webrtcService.isScreenSharing ? Colors.green : null,
                    ),
                  _buildControlButton(
                    icon: Icons.call_end,
                    onPressed: _endCall,
                    isActive: false,
                    backgroundColor: Colors.red,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _toggleAudio() async {
    try {
      await _webrtcService.toggleAudio();
      setState(() {});
    } catch (e) {
    }
  }

  Future<void> _toggleScreenShare() async {
    try {
      await _webrtcService.toggleScreenShare();
      setState(() {});
    } catch (e) {
    }
  }

  Future<void> _endCall() async {
    try {
      await _webrtcService.leaveVideoSession();
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
      }
    }
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
          color: backgroundColor ?? (isActive ? Colors.white.withOpacity(0.2) : Colors.grey[600]),
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

// Legacy Video Call Screen (to be replaced)
class VideoCallScreen extends StatefulWidget {
  final List<String> participants;
  final String meetingType;

  const VideoCallScreen({
    super.key,
    required this.participants,
    required this.meetingType,
  });

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  bool _isMuted = false;
  bool _isVideoOn = true;
  bool _isFrontCamera = true;
  late DateTime _startTime;

  @override
  void initState() {
    super.initState();
    _startTime = DateTime.now();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Main video view (simulated with gradient)
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
              ),
            ),
          ),
          
          // Top bar with call info
          Positioned(
            top: 60,
            left: 20,
            right: 20,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'videocalls.video_call'.tr(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 8),
                          if (_isVideoOn)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.green,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 4,
                                    height: 4,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Text(
                                    'CAM',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      Text(
                        '${widget.participants.length} participants',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
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
          ),
          
          // Participants grid with video simulation
          Positioned(
            top: 140,
            left: 20,
            right: 20,
            bottom: 120,
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.75,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: widget.participants.length,
              itemBuilder: (context, index) {
                final isCurrentUser = index == 0; // First participant is current user
                final showVideo = _isVideoOn && isCurrentUser;
                
                return Container(
                  decoration: BoxDecoration(
                    color: showVideo ? Colors.black : Colors.grey[800],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Stack(
                    children: [
                      // Video feed simulation for current user
                      if (showVideo)
                        Container(
                          width: double.infinity,
                          height: double.infinity,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Color(0xFF1E3A8A),
                                Color(0xFF3730A3),
                                Color(0xFF1E293B),
                              ],
                            ),
                          ),
                          child: Stack(
                            children: [
                              // Simulated camera view with moving gradient
                              Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  gradient: LinearGradient(
                                    begin: _isFrontCamera ? Alignment.topLeft : Alignment.topRight,
                                    end: _isFrontCamera ? Alignment.bottomRight : Alignment.bottomLeft,
                                    colors: _isFrontCamera ? [
                                      Colors.blue.withOpacity(0.3),
                                      Colors.purple.withOpacity(0.3),
                                      Colors.teal.withOpacity(0.3),
                                    ] : [
                                      Colors.green.withOpacity(0.3),
                                      Colors.orange.withOpacity(0.3),
                                      Colors.pink.withOpacity(0.3),
                                    ],
                                  ),
                                ),
                                child: Center(
                                  child: Icon(
                                    _isFrontCamera ? Icons.face : Icons.landscape,
                                    color: Colors.white.withOpacity(0.3),
                                    size: 40,
                                  ),
                                ),
                              ),
                              // Camera indicator
                              Positioned(
                                top: 8,
                                right: 8,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
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
                                      const SizedBox(width: 4),
                                      const Text(
                                        'LIVE',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 8,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      
                      // Avatar view when video is off or for other participants
                      if (!showVideo)
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                color: Colors.blue,
                                borderRadius: BorderRadius.circular(30),
                              ),
                              child: Center(
                                child: Text(
                                  widget.participants[index][0].toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              widget.participants[index],
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                              textAlign: TextAlign.center,
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ],
                        ),
                      
                      // Video off indicator for current user
                      if (isCurrentUser && !_isVideoOn)
                        Positioned(
                          bottom: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.8),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Icon(
                              Icons.videocam_off,
                              color: Colors.white,
                              size: 16,
                            ),
                          ),
                        ),
                      
                      // Participant name overlay
                      Positioned(
                        bottom: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.6),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          constraints: BoxConstraints(maxWidth: 100),
                          child: Text(
                            isCurrentUser ? 'You' : widget.participants[index],
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          
          // Bottom controls
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildControlButton(
                  icon: _isMuted ? Icons.mic_off : Icons.mic,
                  onTap: () {
                    setState(() => _isMuted = !_isMuted);
                    // Show feedback
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(_isMuted ? 'Microphone muted' : 'Microphone unmuted'),
                        duration: const Duration(seconds: 1),
                      ),
                    );
                  },
                  isActive: !_isMuted,
                ),
                _buildControlButton(
                  icon: _isVideoOn ? Icons.videocam : Icons.videocam_off,
                  onTap: () {
                    setState(() => _isVideoOn = !_isVideoOn);
                    // Show feedback
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(_isVideoOn ? 'Camera turned on' : 'Camera turned off'),
                        duration: const Duration(seconds: 1),
                      ),
                    );
                  },
                  isActive: _isVideoOn,
                ),
                // Camera flip button (only visible when video is on)
                if (_isVideoOn)
                  _buildControlButton(
                    icon: Icons.flip_camera_ios,
                    onTap: () {
                      setState(() => _isFrontCamera = !_isFrontCamera);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(_isFrontCamera ? 'Switched to front camera' : 'Switched to back camera'),
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    },
                    isActive: true,
                  ),
                _buildControlButton(
                  icon: Icons.call_end,
                  onTap: () => Navigator.pop(context),
                  isActive: false,
                  backgroundColor: Colors.red,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required VoidCallback onTap,
    required bool isActive,
    Color? backgroundColor,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          color: backgroundColor ?? (isActive ? Colors.white.withOpacity(0.2) : Colors.red),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: 28,
        ),
      ),
    );
  }
}

// Quick Meeting Audio Call Screen
class QuickMeetingAudioCallScreen extends StatefulWidget {
  final List<String> participants;
  final String meetingType;

  const QuickMeetingAudioCallScreen({
    super.key,
    required this.participants,
    required this.meetingType,
  });

  @override
  State<QuickMeetingAudioCallScreen> createState() => _QuickMeetingAudioCallScreenState();
}

class _QuickMeetingAudioCallScreenState extends State<QuickMeetingAudioCallScreen> {
  bool _isMuted = false;
  bool _isSpeakerOn = false;

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
                          'Audio Call',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '${widget.participants.length} participants',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 16,
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
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Main speaker avatar (first participant)
                    Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: Colors.blue,
                        borderRadius: BorderRadius.circular(60),
                        border: Border.all(color: Colors.white, width: 3),
                      ),
                      child: Center(
                        child: Text(
                          widget.participants.isNotEmpty 
                              ? widget.participants[0][0].toUpperCase()
                              : 'U',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 48,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 20),
                    
                    Container(
                      constraints: const BoxConstraints(maxWidth: 200),
                      child: Text(
                        widget.participants.isNotEmpty
                            ? widget.participants[0]
                            : 'Unknown',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                        textAlign: TextAlign.center,
                      ),
                    ),
                    
                    const SizedBox(height: 40),
                    
                    // Other participants
                    if (widget.participants.length > 1)
                      Wrap(
                        spacing: 16,
                        runSpacing: 16,
                        children: widget.participants.skip(1).map((participant) {
                          return Column(
                            children: [
                              Container(
                                width: 60,
                                height: 60,
                                decoration: BoxDecoration(
                                  color: Colors.grey[600],
                                  borderRadius: BorderRadius.circular(30),
                                ),
                                child: Center(
                                  child: Text(
                                    participant[0].toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: 70,
                                child: Text(
                                  participant,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
              
              // Bottom controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildAudioControlButton(
                    icon: _isMuted ? Icons.mic_off : Icons.mic,
                    onTap: () => setState(() => _isMuted = !_isMuted),
                    isActive: !_isMuted,
                  ),
                  _buildAudioControlButton(
                    icon: _isSpeakerOn ? Icons.volume_up : Icons.volume_down,
                    onTap: () => setState(() => _isSpeakerOn = !_isSpeakerOn),
                    isActive: _isSpeakerOn,
                  ),
                  _buildAudioControlButton(
                    icon: Icons.call_end,
                    onTap: () => Navigator.pop(context),
                    isActive: false,
                    backgroundColor: Colors.red,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAudioControlButton({
    required IconData icon,
    required VoidCallback onTap,
    required bool isActive,
    Color? backgroundColor,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          color: backgroundColor ?? (isActive ? Colors.white.withOpacity(0.2) : Colors.grey[600]),
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

// Generic Call Screen for Screen Share and Conference Call
class GenericCallScreen extends StatefulWidget {
  final List<String> participants;
  final String meetingType;

  const GenericCallScreen({
    super.key,
    required this.participants,
    required this.meetingType,
  });

  @override
  State<GenericCallScreen> createState() => _GenericCallScreenState();
}

class _GenericCallScreenState extends State<GenericCallScreen> {
  bool _isMuted = false;

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
                          '${widget.participants.length} participants',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 16,
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
              
              // Meeting content area
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey[800],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        widget.meetingType == 'Screen Share' 
                            ? Icons.screen_share 
                            : Icons.groups,
                        color: Colors.white70,
                        size: 80,
                      ),
                      const SizedBox(height: 20),
                      Text(
                        widget.meetingType == 'Screen Share' 
                            ? 'Screen Sharing Active'
                            : 'Conference Call',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 40),
                      Text(
                        '${'videocalls.participants'.tr()}: ${widget.participants.join(', ')}',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 16,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 40),
              
              // Bottom controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildGenericControlButton(
                    icon: _isMuted ? Icons.mic_off : Icons.mic,
                    onTap: () => setState(() => _isMuted = !_isMuted),
                    isActive: !_isMuted,
                  ),
                  if (widget.meetingType == 'Screen Share')
                    _buildGenericControlButton(
                      icon: Icons.stop_screen_share,
                      onTap: () {},
                      isActive: true,
                    ),
                  _buildGenericControlButton(
                    icon: Icons.call_end,
                    onTap: () => Navigator.pop(context),
                    isActive: false,
                    backgroundColor: Colors.red,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGenericControlButton({
    required IconData icon,
    required VoidCallback onTap,
    required bool isActive,
    Color? backgroundColor,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          color: backgroundColor ?? (isActive ? Colors.white.withOpacity(0.2) : Colors.grey[600]),
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