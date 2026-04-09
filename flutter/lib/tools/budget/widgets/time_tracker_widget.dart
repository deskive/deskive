import 'dart:async';
import 'package:flutter/material.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

/// A floating time tracker widget that shows the current running timer
/// and allows starting/stopping timers
class TimeTrackerWidget extends StatefulWidget {
  final String? budgetId;
  final String? taskId;
  final VoidCallback? onTimerStarted;
  final VoidCallback? onTimerStopped;
  final bool showAsFloating;

  const TimeTrackerWidget({
    super.key,
    this.budgetId,
    this.taskId,
    this.onTimerStarted,
    this.onTimerStopped,
    this.showAsFloating = true,
  });

  @override
  State<TimeTrackerWidget> createState() => _TimeTrackerWidgetState();
}

class _TimeTrackerWidgetState extends State<TimeTrackerWidget> {
  final BudgetService _budgetService = BudgetService.instance;
  TimeEntry? _runningTimer;
  Timer? _refreshTimer;
  Timer? _displayTimer;
  Duration _currentDuration = Duration.zero;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadRunningTimer();
    // Refresh running timer status every 5 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _loadRunningTimer();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _displayTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadRunningTimer() async {
    try {
      TimeEntry? timer;
      if (widget.taskId != null) {
        timer = await _budgetService.getRunningTimerForTask(widget.taskId!);
      } else {
        timer = await _budgetService.getRunningTimer();
      }

      if (mounted) {
        setState(() {
          _runningTimer = timer;
          if (timer != null) {
            _currentDuration = DateTime.now().difference(timer.startTime);
            _startDisplayTimer();
          } else {
            _displayTimer?.cancel();
            _currentDuration = Duration.zero;
          }
        });
      }
    } catch (e) {
      debugPrint('Error loading running timer: $e');
    }
  }

  void _startDisplayTimer() {
    _displayTimer?.cancel();
    _displayTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_runningTimer != null && mounted) {
        setState(() {
          _currentDuration = DateTime.now().difference(_runningTimer!.startTime);
        });
      }
    });
  }

  Future<void> _stopTimer() async {
    if (_runningTimer == null) return;

    setState(() => _isLoading = true);

    try {
      await _budgetService.stopTimer(_runningTimer!.id);
      setState(() {
        _runningTimer = null;
        _currentDuration = Duration.zero;
      });
      _displayTimer?.cancel();
      widget.onTimerStopped?.call();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Timer stopped'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to stop timer: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_runningTimer == null) {
      return const SizedBox.shrink();
    }

    final content = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? Colors.teal.shade800 : Colors.teal.shade600,
        borderRadius: BorderRadius.circular(widget.showAsFloating ? 30 : 12),
        boxShadow: widget.showAsFloating
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pulsing indicator
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.red,
              boxShadow: [
                BoxShadow(
                  color: Colors.red.withOpacity(0.5),
                  blurRadius: 6,
                  spreadRadius: 2,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Timer display
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _formatDuration(_currentDuration),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                ),
              ),
              if (_runningTimer!.description != null &&
                  _runningTimer!.description!.isNotEmpty)
                Text(
                  _runningTimer!.description!,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
          const SizedBox(width: 16),
          // Stop button
          _isLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : IconButton(
                  onPressed: _stopTimer,
                  icon: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                    ),
                    child: const Icon(
                      Icons.stop,
                      color: Colors.red,
                      size: 20,
                    ),
                  ),
                  tooltip: 'Stop Timer',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
        ],
      ),
    );

    if (widget.showAsFloating) {
      return Positioned(
        bottom: 100,
        right: 16,
        child: content,
      );
    }

    return content;
  }
}

/// A compact inline timer display for use in lists
class InlineTimerDisplay extends StatefulWidget {
  final TimeEntry timeEntry;
  final VoidCallback? onStop;

  const InlineTimerDisplay({
    super.key,
    required this.timeEntry,
    this.onStop,
  });

  @override
  State<InlineTimerDisplay> createState() => _InlineTimerDisplayState();
}

class _InlineTimerDisplayState extends State<InlineTimerDisplay> {
  Timer? _timer;
  Duration _duration = Duration.zero;

  @override
  void initState() {
    super.initState();
    _updateDuration();
    if (widget.timeEntry.isRunning) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        _updateDuration();
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _updateDuration() {
    if (mounted) {
      setState(() {
        _duration = widget.timeEntry.currentDuration;
      });
    }
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours}h ${minutes}m ${seconds}s';
    }
    if (minutes > 0) {
      return '${minutes}m ${seconds}s';
    }
    return '${seconds}s';
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.timeEntry.isRunning)
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(right: 6),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.red,
            ),
          ),
        Text(
          _formatDuration(_duration),
          style: TextStyle(
            fontWeight: FontWeight.w500,
            color: widget.timeEntry.isRunning ? Colors.red : null,
            fontFamily: 'monospace',
          ),
        ),
        if (widget.timeEntry.isRunning && widget.onStop != null)
          IconButton(
            onPressed: widget.onStop,
            icon: const Icon(Icons.stop, size: 18),
            color: Colors.red,
            padding: const EdgeInsets.all(4),
            constraints: const BoxConstraints(),
            tooltip: 'Stop Timer',
          ),
      ],
    );
  }
}
