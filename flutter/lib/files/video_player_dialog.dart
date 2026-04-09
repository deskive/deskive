import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../models/file/file.dart' as file_model;

class VideoPlayerDialog extends StatefulWidget {
  final file_model.File file;

  const VideoPlayerDialog({
    super.key,
    required this.file,
  });

  @override
  State<VideoPlayerDialog> createState() => _VideoPlayerDialogState();
}

class _VideoPlayerDialogState extends State<VideoPlayerDialog> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;
  String? _errorMessage;
  bool _isPlaying = false;
  bool _showControls = true;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      // Use the direct URL from the file
      if (widget.file.url == null || widget.file.url!.isEmpty) {
        setState(() {
          _hasError = true;
          _errorMessage = 'Video URL is not available';
        });
        return;
      }

      final videoUrl = widget.file.url!;

      _controller = VideoPlayerController.networkUrl(Uri.parse(videoUrl));

      await _controller.initialize();

      setState(() {
        _isInitialized = true;
      });

      // Add listener for video state changes
      _controller.addListener(() {
        if (mounted) {
          setState(() {
            _isPlaying = _controller.value.isPlaying;
          });
        }
      });
    } catch (e) {
      setState(() {
        _hasError = true;
        _errorMessage = e.toString();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _togglePlayPause() {
    setState(() {
      if (_controller.value.isPlaying) {
        _controller.pause();
      } else {
        _controller.play();
      }
    });
  }

  void _seekForward() {
    final newPosition = _controller.value.position + const Duration(seconds: 10);
    _controller.seekTo(newPosition);
  }

  void _seekBackward() {
    final newPosition = _controller.value.position - const Duration(seconds: 10);
    _controller.seekTo(newPosition);
  }

  String _formatFileSize(String size) {
    try {
      final bytes = int.parse(size);
      if (bytes < 1024) {
        return '$bytes B';
      } else if (bytes < 1024 * 1024) {
        return '${(bytes / 1024).toStringAsFixed(2)} KB';
      } else if (bytes < 1024 * 1024 * 1024) {
        return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
      } else {
        return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
      }
    } catch (e) {
      return size;
    }
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    if (hours > 0) {
      return '$hours:${twoDigits(minutes)}:${twoDigits(seconds)}';
    } else {
      return '${twoDigits(minutes)}:${twoDigits(seconds)}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.black,
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: 500,
          maxHeight: MediaQuery.of(context).size.height * 0.55,
        ),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              color: Colors.black87,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.play_circle_outline, color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.file.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          _formatFileSize(widget.file.size),
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white, size: 20),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  ),
                ],
              ),
            ),

            // Video Player
            Expanded(
              child: _hasError
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 64,
                            color: Colors.red,
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Failed to load video',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _errorMessage ?? 'Unknown error',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    )
                  : !_isInitialized
                      ? const Center(
                          child: CircularProgressIndicator(
                            color: Colors.white,
                          ),
                        )
                      : GestureDetector(
                          onTap: () {
                            setState(() {
                              _showControls = !_showControls;
                            });
                          },
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Center(
                                child: AspectRatio(
                                  aspectRatio: _controller.value.aspectRatio,
                                  child: VideoPlayer(_controller),
                                ),
                              ),

                              // Play/Pause overlay
                              if (_showControls)
                                Container(
                                  color: Colors.black26,
                                  child: Center(
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        IconButton(
                                          icon: const Icon(
                                            Icons.replay_10,
                                            size: 32,
                                            color: Colors.white,
                                          ),
                                          onPressed: _seekBackward,
                                        ),
                                        const SizedBox(width: 16),
                                        IconButton(
                                          icon: Icon(
                                            _isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
                                            size: 48,
                                            color: Colors.white,
                                          ),
                                          onPressed: _togglePlayPause,
                                        ),
                                        const SizedBox(width: 16),
                                        IconButton(
                                          icon: const Icon(
                                            Icons.forward_10,
                                            size: 32,
                                            color: Colors.white,
                                          ),
                                          onPressed: _seekForward,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
            ),

            // Video Controls
            if (_isInitialized && !_hasError)
              Container(
                color: Colors.black87,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: Column(
                  children: [
                    // Progress bar
                    VideoProgressIndicator(
                      _controller,
                      allowScrubbing: true,
                      colors: const VideoProgressColors(
                        playedColor: Colors.blue,
                        bufferedColor: Colors.grey,
                        backgroundColor: Colors.white24,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Time display
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _formatDuration(_controller.value.position),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                          ),
                        ),
                        Text(
                          _formatDuration(_controller.value.duration),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

void showVideoPlayerDialog(BuildContext context, {required file_model.File file}) {
  showDialog(
    context: context,
    builder: (context) => VideoPlayerDialog(file: file),
  );
}
