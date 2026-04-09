import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';

class MeetingSummaryScreen extends StatelessWidget {
  final String title;
  final String date;
  final String duration;
  final int participants;
  final String summary;
  final List<String> keyPoints;
  final List<String> participantNames;

  const MeetingSummaryScreen({
    super.key,
    required this.title,
    required this.date,
    required this.duration,
    required this.participants,
    required this.summary,
    required this.keyPoints,
    required this.participantNames,
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
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: Colors.orange,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Meeting Summary',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
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
            
            // Meeting Summary Section
            Text(
              'Meeting Summary',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2541) : Colors.grey[50],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                summary,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: isDark ? Colors.white70 : Colors.grey[700],
                ),
              ),
            ),
            const SizedBox(height: 32),
            
            // Key Points Section
            Text(
              'Key Points',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            const SizedBox(height: 16),
            ...keyPoints.asMap().entries.map((entry) {
              final index = entry.key + 1;
              final point = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          '$index',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.orange,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        point,
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
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
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: participantNames.map((name) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E2541) : Colors.grey[100],
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    name,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white70 : Colors.grey[700],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 40),
            
            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      _downloadPDF(context);
                    },
                    icon: const Icon(Icons.download, size: 18),
                    label: Text('videocalls.download_pdf'.tr()),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isDark ? Colors.white70 : Colors.grey[700],
                      side: BorderSide(
                        color: isDark ? Colors.white30 : Colors.grey[300]!,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      _copySummary(context);
                    },
                    icon: const Icon(Icons.copy, size: 18),
                    label: Text('videocalls.copy_summary'.tr()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
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

  void _downloadPDF(BuildContext context) {
    // TODO: Implement PDF download functionality
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('videocalls.pdf_download_coming'.tr()),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _copySummary(BuildContext context) {
    final summaryText = '''
$title

Date: $date
Duration: $duration
Participants: $participants

Meeting Summary:
$summary

Key Points:
${keyPoints.asMap().entries.map((e) => '${e.key + 1}. ${e.value}').join('\n')}

Participants:
${participantNames.join(', ')}
''';

    Clipboard.setData(ClipboardData(text: summaryText));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('videocalls.summary_copied'.tr()),
        backgroundColor: Colors.green,
      ),
    );
  }
}