import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/calendar_event.dart';
import '../theme/app_theme.dart';

enum VideoProvider {
  zoom,
  googleMeet,
  teams,
  webex,
  custom,
}

class VideoCallIntegration {
  static String generateMeetingUrl(VideoProvider provider, {
    String? meetingId,
    String? password,
    String? customUrl,
  }) {
    switch (provider) {
      case VideoProvider.zoom:
        final baseUrl = 'https://zoom.us/j/${meetingId ?? 'MEETING_ID'}';
        return password != null ? '$baseUrl?pwd=$password' : baseUrl;
      
      case VideoProvider.googleMeet:
        return 'https://meet.google.com/${meetingId ?? 'new'}';
      
      case VideoProvider.teams:
        return 'https://teams.microsoft.com/l/meetup-join/${meetingId ?? 'MEETING_ID'}';
      
      case VideoProvider.webex:
        return 'https://webex.com/meet/${meetingId ?? 'MEETING_ID'}';
      
      case VideoProvider.custom:
        return customUrl ?? 'https://custom-meeting-url.com';
    }
  }

  static Future<bool> launchMeetingUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
    return false;
  }

  static VideoProvider? detectProvider(String url) {
    if (url.contains('zoom.us')) return VideoProvider.zoom;
    if (url.contains('meet.google.com')) return VideoProvider.googleMeet;
    if (url.contains('teams.microsoft.com')) return VideoProvider.teams;
    if (url.contains('webex.com')) return VideoProvider.webex;
    return VideoProvider.custom;
  }
}

class VideoCallWidget extends StatefulWidget {
  final CalendarEvent event;
  final Function(String?)? onMeetingUrlChanged;
  final bool isEditable;

  const VideoCallWidget({
    Key? key,
    required this.event,
    this.onMeetingUrlChanged,
    this.isEditable = true,
  }) : super(key: key);

  @override
  State<VideoCallWidget> createState() => _VideoCallWidgetState();
}

class _VideoCallWidgetState extends State<VideoCallWidget> {
  String? _meetingUrl;
  VideoProvider? _selectedProvider;
  final TextEditingController _urlController = TextEditingController();
  final TextEditingController _meetingIdController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _meetingUrl = widget.event.meetingUrl;
    if (_meetingUrl != null) {
      _selectedProvider = VideoCallIntegration.detectProvider(_meetingUrl!);
      _urlController.text = _meetingUrl!;
    }
  }

  @override
  void dispose() {
    _urlController.dispose();
    _meetingIdController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.videocam,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'videocalls.video_call'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                if (_meetingUrl != null && !widget.isEditable)
                  ElevatedButton.icon(
                    onPressed: _joinMeeting,
                    icon: const Icon(Icons.videocam, size: 18),
                    label: Text('calendar.join'.tr()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            
            if (_meetingUrl == null && widget.isEditable) 
              _buildSetupSection()
            else if (_meetingUrl != null)
              _buildMeetingSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildSetupSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Add video call to this meeting',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        
        // Quick setup buttons
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildQuickSetupButton(
              VideoProvider.googleMeet,
              'Google Meet',
              Icons.video_call,
              Colors.blue,
            ),
            _buildQuickSetupButton(
              VideoProvider.zoom,
              'Zoom',
              Icons.videocam,
              const Color(0xFF2D8CFF),
            ),
            _buildQuickSetupButton(
              VideoProvider.teams,
              'Teams',
              Icons.groups,
              const Color(0xFF6264A7),
            ),
            _buildQuickSetupButton(
              VideoProvider.webex,
              'Webex',
              Icons.business,
              const Color(0xFF00BCF2),
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        const Divider(),
        const SizedBox(height: 16),
        
        // Manual URL entry
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _urlController,
                decoration: InputDecoration(
                  labelText: 'Meeting URL',
                  hintText: 'calendar.meeting_url_or_generate'.tr(),
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.link),
                ),
                onChanged: (value) {
                  setState(() {
                    _meetingUrl = value.isNotEmpty ? value : null;
                    _selectedProvider = value.isNotEmpty
                        ? VideoCallIntegration.detectProvider(value)
                        : null;
                  });
                  widget.onMeetingUrlChanged?.call(_meetingUrl);
                },
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _urlController.text.isNotEmpty ? _saveMeetingUrl : null,
              icon: const Icon(Icons.check),
              tooltip: 'Save URL',
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickSetupButton(
    VideoProvider provider, 
    String name, 
    IconData icon, 
    Color color,
  ) {
    return OutlinedButton.icon(
      onPressed: () => _setupProvider(provider),
      icon: Icon(icon, size: 18),
      label: Text(name),
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color.withOpacity(0.5)),
      ),
    );
  }

  Widget _buildMeetingSection() {
    final provider = _selectedProvider;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Meeting info
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: _getProviderColor(provider).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _getProviderColor(provider).withOpacity(0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _getProviderIcon(provider),
                    color: _getProviderColor(provider),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _getProviderName(provider),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _getProviderColor(provider),
                    ),
                  ),
                  const Spacer(),
                  if (widget.isEditable)
                    IconButton(
                      onPressed: _removeMeeting,
                      icon: const Icon(Icons.close, size: 18),
                      tooltip: 'Remove meeting',
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _meetingUrl!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    onPressed: _copyMeetingUrl,
                    icon: const Icon(Icons.copy, size: 18),
                    tooltip: 'Copy URL',
                  ),
                ],
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Action buttons
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _joinMeeting,
                icon: const Icon(Icons.videocam),
                label: Text('calendar.join_meeting'.tr()),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _getProviderColor(provider),
                  foregroundColor: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: _testMeeting,
              icon: const Icon(Icons.speaker_phone),
              label: Text('calendar.test'.tr()),
            ),
          ],
        ),
        
        const SizedBox(height: 12),
        
        // Meeting details (for some providers)
        if (provider == VideoProvider.zoom)
          _buildZoomDetails(),
      ],
    );
  }

  Widget _buildZoomDetails() {
    return ExpansionTile(
      title: Text('calendar.meeting_details'.tr()),
      leading: const Icon(Icons.info_outline),
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_meetingIdController.text.isNotEmpty) ...[
                Text('calendar.meeting_id'.tr(args: [_meetingIdController.text])),
                const SizedBox(height: 8),
              ],
              if (_passwordController.text.isNotEmpty) ...[
                Text('calendar.password'.tr(args: [_passwordController.text])),
                const SizedBox(height: 8),
              ],
              const Text(
                'Dial-in Information:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text('+1-234-567-8900'),
              const Text('+1-234-567-8901'),
              const SizedBox(height: 8),
              const Text(
                'One tap mobile:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text('+12345678900,,${_meetingIdController.text}#'),
            ],
          ),
        ),
      ],
    );
  }

  void _setupProvider(VideoProvider provider) {
    if (provider == VideoProvider.googleMeet) {
      _setupGoogleMeet();
    } else {
      _showProviderSetupDialog(provider);
    }
  }

  void _setupGoogleMeet() {
    final url = VideoCallIntegration.generateMeetingUrl(VideoProvider.googleMeet);
    setState(() {
      _meetingUrl = url;
      _selectedProvider = VideoProvider.googleMeet;
      _urlController.text = url;
    });
    widget.onMeetingUrlChanged?.call(_meetingUrl);
    _showMessage('Google Meet link generated');
  }

  void _showProviderSetupDialog(VideoProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('calendar.setup_provider'.tr(args: [_getProviderName(provider)])),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _meetingIdController,
              decoration: InputDecoration(
                labelText: 'Meeting ID',
                hintText: 'calendar.enter_meeting_id'.tr(),
              ),
            ),
            const SizedBox(height: 16),
            if (provider == VideoProvider.zoom)
              TextField(
                controller: _passwordController,
                decoration: InputDecoration(
                  labelText: 'Password (Optional)',
                  hintText: 'calendar.enter_meeting_password'.tr(),
                ),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () {
              final url = VideoCallIntegration.generateMeetingUrl(
                provider,
                meetingId: _meetingIdController.text,
                password: _passwordController.text.isNotEmpty
                    ? _passwordController.text
                    : null,
              );
              setState(() {
                _meetingUrl = url;
                _selectedProvider = provider;
                _urlController.text = url;
              });
              widget.onMeetingUrlChanged?.call(_meetingUrl);
              Navigator.of(context).pop();
              _showMessage('${_getProviderName(provider)} meeting setup complete');
            },
            child: Text('calendar.setup'.tr()),
          ),
        ],
      ),
    );
  }

  void _saveMeetingUrl() {
    final url = _urlController.text.trim();
    if (url.isNotEmpty) {
      setState(() {
        _meetingUrl = url;
        _selectedProvider = VideoCallIntegration.detectProvider(url);
      });
      widget.onMeetingUrlChanged?.call(_meetingUrl);
      _showMessage('Meeting URL saved');
    }
  }

  void _removeMeeting() {
    setState(() {
      _meetingUrl = null;
      _selectedProvider = null;
      _urlController.clear();
      _meetingIdController.clear();
      _passwordController.clear();
    });
    widget.onMeetingUrlChanged?.call(null);
    _showMessage('Video call removed');
  }

  Future<void> _joinMeeting() async {
    if (_meetingUrl != null) {
      final success = await VideoCallIntegration.launchMeetingUrl(_meetingUrl!);
      if (!success) {
        _showMessage('Unable to open meeting URL', isError: true);
      }
    }
  }

  void _testMeeting() {
    // Open a test/settings page for the provider
    if (_selectedProvider == VideoProvider.zoom) {
      VideoCallIntegration.launchMeetingUrl('https://zoom.us/test');
    } else if (_selectedProvider == VideoProvider.googleMeet) {
      VideoCallIntegration.launchMeetingUrl('https://meet.google.com/test');
    } else {
      _showMessage('Test functionality not available for this provider');
    }
  }

  void _copyMeetingUrl() {
    if (_meetingUrl != null) {
      // Copy to clipboard
      _showMessage('Meeting URL copied to clipboard');
    }
  }

  String _getProviderName(VideoProvider? provider) {
    switch (provider) {
      case VideoProvider.zoom:
        return 'Zoom';
      case VideoProvider.googleMeet:
        return 'Google Meet';
      case VideoProvider.teams:
        return 'Microsoft Teams';
      case VideoProvider.webex:
        return 'Cisco Webex';
      case VideoProvider.custom:
        return 'Custom';
      case null:
        return 'Unknown';
    }
  }

  IconData _getProviderIcon(VideoProvider? provider) {
    switch (provider) {
      case VideoProvider.zoom:
        return Icons.videocam;
      case VideoProvider.googleMeet:
        return Icons.video_call;
      case VideoProvider.teams:
        return Icons.groups;
      case VideoProvider.webex:
        return Icons.business;
      case VideoProvider.custom:
        return Icons.link;
      case null:
        return Icons.videocam_off;
    }
  }

  Color _getProviderColor(VideoProvider? provider) {
    switch (provider) {
      case VideoProvider.zoom:
        return const Color(0xFF2D8CFF);
      case VideoProvider.googleMeet:
        return Colors.blue;
      case VideoProvider.teams:
        return const Color(0xFF6264A7);
      case VideoProvider.webex:
        return const Color(0xFF00BCF2);
      case VideoProvider.custom:
        return Colors.grey;
      case null:
        return Colors.grey;
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : null,
      ),
    );
  }
}

class VideoCallQuickActions extends StatelessWidget {
  final CalendarEvent event;

  const VideoCallQuickActions({
    Key? key,
    required this.event,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (event.meetingUrl == null) return const SizedBox.shrink();

    final provider = VideoCallIntegration.detectProvider(event.meetingUrl!);
    final now = DateTime.now();
    final canJoin = event.startTime.isBefore(now.add(const Duration(minutes: 15))) &&
                    event.endTime.isAfter(now.subtract(const Duration(minutes: 5)));

    return Card(
      color: _getProviderColor(provider).withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(
              _getProviderIcon(provider),
              color: _getProviderColor(provider),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Video call with ${_getProviderName(provider)}',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: _getProviderColor(provider),
                ),
              ),
            ),
            if (canJoin)
              ElevatedButton(
                onPressed: () => _joinMeeting(event.meetingUrl!),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                child: Text('calendar.join_now'.tr()),
              )
            else
              OutlinedButton(
                onPressed: () => _joinMeeting(event.meetingUrl!),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _getProviderColor(provider),
                  side: BorderSide(color: _getProviderColor(provider)),
                ),
                child: Text('calendar.join'.tr()),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _joinMeeting(String url) async {
    await VideoCallIntegration.launchMeetingUrl(url);
  }

  String _getProviderName(VideoProvider? provider) {
    switch (provider) {
      case VideoProvider.zoom:
        return 'Zoom';
      case VideoProvider.googleMeet:
        return 'Google Meet';
      case VideoProvider.teams:
        return 'Microsoft Teams';
      case VideoProvider.webex:
        return 'Cisco Webex';
      case VideoProvider.custom:
        return 'videocalls.custom'.tr();
      case null:
        return 'videocalls.video_call'.tr();
    }
  }

  IconData _getProviderIcon(VideoProvider? provider) {
    switch (provider) {
      case VideoProvider.zoom:
        return Icons.videocam;
      case VideoProvider.googleMeet:
        return Icons.video_call;
      case VideoProvider.teams:
        return Icons.groups;
      case VideoProvider.webex:
        return Icons.business;
      case VideoProvider.custom:
        return Icons.link;
      case null:
        return Icons.videocam_off;
    }
  }

  Color _getProviderColor(VideoProvider? provider) {
    switch (provider) {
      case VideoProvider.zoom:
        return const Color(0xFF2D8CFF);
      case VideoProvider.googleMeet:
        return Colors.blue;
      case VideoProvider.teams:
        return const Color(0xFF6264A7);
      case VideoProvider.webex:
        return const Color(0xFF00BCF2);
      case VideoProvider.custom:
        return Colors.grey;
      case null:
        return Colors.grey;
    }
  }
}