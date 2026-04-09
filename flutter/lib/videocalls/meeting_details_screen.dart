import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';
import '../models/videocalls/video_call.dart';
import '../api/services/video_call_service.dart';
import '../api/base_api_client.dart';
import 'video_call_screen.dart';
import 'audio_call_screen.dart';

class MeetingDetailsScreen extends StatelessWidget {
  final String? meetingId;  // Add meeting ID
  final String? callType;   // Add call type (video/audio)
  final String title;
  final String duration;
  final String date;
  final String time;
  final String status;
  final int participantCount;
  final List<MeetingParticipant> participants;
  final bool hasNotes;
  final bool hasSummary;

  const MeetingDetailsScreen({
    super.key,
    this.meetingId,
    this.callType,
    required this.title,
    required this.duration,
    required this.date,
    required this.time,
    required this.status,
    required this.participantCount,
    required this.participants,
    required this.hasNotes,
    required this.hasSummary,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.close,
            color: isDark ? Colors.white : Colors.black,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Icon(
              Icons.videocam,
              color: Colors.green,
              size: 24,
            ),
            const SizedBox(width: 12),
            Text(
              'Meeting Details',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Meeting Title
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Meeting Info Grid
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Duration:',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? Colors.white60 : Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              duration,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Date:',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? Colors.white60 : Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              date,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Time:',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? Colors.white60 : Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              time,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Status:',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? Colors.white60 : Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.green.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                status,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.green,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Participants Section
                  Row(
                    children: [
                      Icon(
                        Icons.people_outline,
                        size: 20,
                        color: isDark ? Colors.white70 : Colors.grey[700],
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Participants ($participantCount)',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Action Buttons - Fixed at bottom
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F1419) : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      _joinMeeting(context);
                    },
                    icon: const Icon(Icons.login, size: 18),
                    label: const Text(
                      'Join Meeting',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      _copyDetails(context);
                    },
                    icon: const Icon(Icons.copy, size: 18),
                    label: const Text(
                      'Copy Details',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isDark ? Colors.white70 : Colors.grey[700],
                      side: BorderSide(
                        color: isDark ? Colors.white30 : Colors.grey[300]!,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _joinMeeting(BuildContext context) async {
    if (meetingId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('videocalls.meeting_id_not_available'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Colors.white),
      ),
    );

    try {
      final apiService = VideoCallService(BaseApiClient.instance);

      // Call join API to get LiveKit token
      final joinResponse = await apiService.joinCall(meetingId!);

      // Close loading dialog
      if (context.mounted) {
        Navigator.pop(context);
      }

      // Navigate to appropriate call screen
      if (context.mounted) {
        final isVideoCall = callType?.toLowerCase() == 'video';

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => isVideoCall
                ? VideoCallScreen(
                    callId: meetingId,
                    channelName: title,
                    callerName: title,
                  )
                : AudioCallScreen(
                    callId: meetingId,
                    channelName: title,
                    callerName: title,
                  ),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog
      if (context.mounted) {
        Navigator.pop(context);
      }

      // Show error message
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_join_meeting'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _copyDetails(BuildContext context) {
    final details = '''
$title

Duration: $duration
Date: $date
Time: $time
Status: $status

Participants: ${participants.length}
''';

    Clipboard.setData(ClipboardData(text: details));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('videocalls.meeting_details_copied'.tr()),
        backgroundColor: Colors.green,
      ),
    );
  }
}

class MeetingParticipant {
  final String name;
  final String initials;
  final List<Color> gradientColors;

  const MeetingParticipant({
    required this.name,
    required this.initials,
    required this.gradientColors,
  });
}