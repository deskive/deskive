import 'dart:async';
import 'package:flutter/foundation.dart';

/// Configuration options for typing effect
class TypingEffectConfig {
  /// Minimum delay between characters (ms)
  final int minDelay;

  /// Maximum delay between characters (ms)
  final int maxDelay;

  /// Number of characters to reveal per tick
  final int chunkSize;

  const TypingEffectConfig({
    this.minDelay = 15,
    this.maxDelay = 35,
    this.chunkSize = 2,
  });

  static const fast = TypingEffectConfig(
    minDelay: 10,
    maxDelay: 20,
    chunkSize: 3,
  );

  static const normal = TypingEffectConfig(
    minDelay: 15,
    maxDelay: 35,
    chunkSize: 2,
  );

  static const slow = TypingEffectConfig(
    minDelay: 30,
    maxDelay: 60,
    chunkSize: 1,
  );
}

/// Controller for typing animation effect
/// Similar to frontend's useTypingEffect hook
class TypingEffectController extends ChangeNotifier {
  final TypingEffectConfig config;

  String _buffer = '';
  int _displayedLength = 0;
  Timer? _timer;
  bool _isTyping = false;

  TypingEffectController({
    this.config = const TypingEffectConfig(),
  });

  /// Currently displayed content (what the user sees)
  String get displayedContent => _buffer.substring(0, _displayedLength);

  /// Full buffered content
  String get fullContent => _buffer;

  /// Whether typing animation is active
  bool get isTyping => _isTyping;

  /// Progress as a value between 0 and 1
  double get progress => _buffer.isEmpty ? 0 : _displayedLength / _buffer.length;

  /// Append text to the buffer (used for text_delta streaming events)
  /// This will automatically start/continue the typing animation
  void appendToBuffer(String text) {
    _buffer += text;
    _startTypingAnimation();
  }

  /// Set the full content instantly (used for complete text events)
  /// This bypasses the typing animation for immediate display
  void setFullContent(String text) {
    _stopAnimation();
    _buffer = text;
    _displayedLength = text.length;
    _isTyping = false;
    notifyListeners();
  }

  /// Reset all state (used when starting a new message)
  void reset() {
    _stopAnimation();
    _buffer = '';
    _displayedLength = 0;
    _isTyping = false;
    notifyListeners();
  }

  /// Complete any remaining typing animation instantly
  /// Useful for when the stream completes and we want to show all remaining content
  void completeTyping() {
    if (_displayedLength < _buffer.length) {
      _stopAnimation();
      _displayedLength = _buffer.length;
      _isTyping = false;
      notifyListeners();
    }
  }

  /// Start or continue the typing animation
  void _startTypingAnimation() {
    // Don't start if already running
    if (_timer != null) return;

    _isTyping = true;
    notifyListeners();

    _scheduleNextTick();
  }

  void _scheduleNextTick() {
    // Calculate random delay within range
    final delay = config.minDelay +
        (DateTime.now().millisecondsSinceEpoch % (config.maxDelay - config.minDelay));

    _timer = Timer(Duration(milliseconds: delay), () {
      if (_displayedLength < _buffer.length) {
        // Calculate next chunk end position
        final nextIndex = (_displayedLength + config.chunkSize).clamp(0, _buffer.length);

        _displayedLength = nextIndex;
        notifyListeners();

        // Schedule next tick if there's more content
        if (_displayedLength < _buffer.length) {
          _scheduleNextTick();
        } else {
          // Buffer caught up - pause animation but keep ready for more
          _timer = null;
          _isTyping = false;
          notifyListeners();
        }
      } else {
        // No more content to display
        _timer = null;
        _isTyping = false;
        notifyListeners();
      }
    });
  }

  void _stopAnimation() {
    _timer?.cancel();
    _timer = null;
  }

  @override
  void dispose() {
    _stopAnimation();
    super.dispose();
  }
}
