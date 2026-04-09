/// Video Call Analytics Model
class VideoCallAnalytics {
  final int totalMeetings;
  final int totalTimeSeconds;
  final String totalTimeFormatted;
  final int thisWeek;
  final int avgDurationSeconds;
  final String avgDurationFormatted;

  VideoCallAnalytics({
    required this.totalMeetings,
    required this.totalTimeSeconds,
    required this.totalTimeFormatted,
    required this.thisWeek,
    required this.avgDurationSeconds,
    required this.avgDurationFormatted,
  });

  factory VideoCallAnalytics.fromJson(Map<String, dynamic> json) {
    return VideoCallAnalytics(
      totalMeetings: json['total_meetings'] as int? ?? 0,
      totalTimeSeconds: json['total_time_seconds'] as int? ?? 0,
      totalTimeFormatted: json['total_time_formatted'] as String? ?? '0m',
      thisWeek: json['this_week'] as int? ?? 0,
      avgDurationSeconds: json['avg_duration_seconds'] as int? ?? 0,
      avgDurationFormatted: json['avg_duration_formatted'] as String? ?? '0m',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_meetings': totalMeetings,
      'total_time_seconds': totalTimeSeconds,
      'total_time_formatted': totalTimeFormatted,
      'this_week': thisWeek,
      'avg_duration_seconds': avgDurationSeconds,
      'avg_duration_formatted': avgDurationFormatted,
    };
  }

  /// Empty analytics (default state)
  static VideoCallAnalytics empty() {
    return VideoCallAnalytics(
      totalMeetings: 0,
      totalTimeSeconds: 0,
      totalTimeFormatted: '0m',
      thisWeek: 0,
      avgDurationSeconds: 0,
      avgDurationFormatted: '0m',
    );
  }
}
