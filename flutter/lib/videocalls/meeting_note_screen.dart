import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';

class MeetingNoteScreen extends StatelessWidget {
  final String title;
  final String date;
  final String duration;
  final int participants;
  final String content;
  final double aiAccuracy;
  final DateTime generatedDate;
  final List<MeetingParticipant> participantsList;

  const MeetingNoteScreen({
    super.key,
    required this.title,
    required this.date,
    required this.duration,
    required this.participants,
    required this.content,
    required this.aiAccuracy,
    required this.generatedDate,
    required this.participantsList,
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
              Icons.description_outlined,
              color: isDark ? Colors.white : Colors.black,
              size: 24,
            ),
            const SizedBox(width: 12),
            Text(
              'Meeting Note',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF7B61FF).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              '${aiAccuracy.toInt()}% AI Accuracy',
              style: const TextStyle(
                color: Color(0xFF7B61FF),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
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
                  const SizedBox(height: 16),
                  
                  // Meeting Info
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today,
                        size: 16,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                      const SizedBox(width: 8),
                      Text(
                        date,
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white60 : Colors.grey[600],
                        ),
                      ),
                      const SizedBox(width: 24),
                      Icon(
                        Icons.access_time,
                        size: 16,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                      const SizedBox(width: 8),
                      Text(
                        duration,
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white60 : Colors.grey[600],
                        ),
                      ),
                      const SizedBox(width: 24),
                      Icon(
                        Icons.people,
                        size: 16,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$participants participants',
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white60 : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  
                  // AI-Generated Content Section
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7B61FF).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.auto_awesome,
                          color: Color(0xFF7B61FF),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'AI-Generated Content',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E2541) : Colors.grey[50],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      content,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: isDark ? Colors.white70 : Colors.grey[700],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // Meeting Context Section
                  Text(
                    'Meeting Context',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // AI Confidence Score
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AI Confidence Score',
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white60 : Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: Stack(
                              children: [
                                Container(
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: isDark ? Colors.white12 : Colors.grey[300],
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                                Container(
                                  height: 8,
                                  width: MediaQuery.of(context).size.width * (aiAccuracy / 100),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [Color(0xFF7B61FF), Color(0xFF9B7CFF)],
                                    ),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            '${aiAccuracy.toInt()}% accuracy',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.white60 : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // Generated Date
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Generated',
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white60 : Colors.grey[600],
                        ),
                      ),
                      Text(
                        _getTimeAgo(generatedDate),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  
                  // Participants Section
                  Text(
                    'Participants',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: participantsList.map((participant) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 24),
                        child: Column(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: participant.gradientColors,
                                ),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  participant.initials,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              participant.name,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? Colors.white70 : Colors.grey[700],
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
          
          // Bottom Action Buttons
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F1419) : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? Colors.white12 : Colors.grey[300]!,
                ),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      _saveToNotes(context);
                    },
                    icon: const Icon(Icons.save_alt, size: 14),
                    label: const Text(
                      'Save to Notes',
                      style: TextStyle(fontSize: 12),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isDark ? Colors.white70 : Colors.grey[700],
                      side: BorderSide(
                        color: isDark ? Colors.white30 : Colors.grey[300]!,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      _exportNote(context);
                    },
                    icon: const Icon(Icons.download, size: 14),
                    label: const Text(
                      'Export',
                      style: TextStyle(fontSize: 12),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isDark ? Colors.white70 : Colors.grey[700],
                      side: BorderSide(
                        color: isDark ? Colors.white30 : Colors.grey[300]!,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      _copyNote(context);
                    },
                    icon: const Icon(Icons.copy, size: 14),
                    label: const Text(
                      'Copy Note',
                      style: TextStyle(fontSize: 12),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
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

  String _getTimeAgo(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays > 0) {
      return '${difference.inDays} days ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hours ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} minutes ago';
    } else {
      return 'Just now';
    }
  }

  void _saveToNotes(BuildContext context) {
    // TODO: Implement save to notes functionality
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('videocalls.note_saved'.tr()),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _exportNote(BuildContext context) {
    // TODO: Implement export functionality
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('videocalls.export_coming'.tr()),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _copyNote(BuildContext context) {
    final noteText = '''
$title

Date: $date
Duration: $duration
Participants: $participants

AI-Generated Content:
$content

AI Confidence: ${aiAccuracy.toInt()}%
Generated: ${_getTimeAgo(generatedDate)}

Participants:
${participantsList.map((p) => p.name).join(', ')}
''';

    Clipboard.setData(ClipboardData(text: noteText));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('videocalls.note_copied'.tr()),
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