import 'package:flutter/material.dart';
import 'package:giphy_get/giphy_get.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:uuid/uuid.dart';

/// Dialog for selecting GIFs using GIPHY API
class GifPickerDialog extends StatefulWidget {
  final Function(GiphyGif gif) onGifSelected;

  const GifPickerDialog({
    super.key,
    required this.onGifSelected,
  });

  @override
  State<GifPickerDialog> createState() => _GifPickerDialogState();

  /// Show the GIF picker as a bottom sheet
  static Future<GiphyGif?> show(BuildContext context) async {
    return showModalBottomSheet<GiphyGif>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => GifPickerDialog(
          onGifSelected: (gif) {
            Navigator.pop(context, gif);
          },
        ),
      ),
    );
  }
}

class _GifPickerDialogState extends State<GifPickerDialog> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isLoading = false;
  List<GiphyGif> _gifs = [];
  String? _error;

  // Get GIPHY API key from environment
  String get _giphyApiKey => dotenv.env['GIPHY_API_KEY'] ?? '';

  @override
  void initState() {
    super.initState();
    _loadTrendingGifs();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTrendingGifs() async {
    if (_giphyApiKey.isEmpty) {
      setState(() {
        _error = 'gif.api_key_not_configured'.tr();
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final randomId = const Uuid().v4();
      final client = GiphyClient(apiKey: _giphyApiKey, randomId: randomId);
      final collection = await client.trending(limit: 25);

      if (mounted) {
        setState(() {
          _gifs = collection.data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'gif.failed_to_load'.tr();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _searchGifs(String query) async {
    if (_giphyApiKey.isEmpty) {
      setState(() {
        _error = 'gif.api_key_not_configured'.tr();
      });
      return;
    }

    if (query.trim().isEmpty) {
      _loadTrendingGifs();
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _searchQuery = query;
    });

    try {
      final randomId = const Uuid().v4();
      final client = GiphyClient(apiKey: _giphyApiKey, randomId: randomId);
      final collection = await client.search(query, limit: 25);

      if (mounted) {
        setState(() {
          _gifs = collection.data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'gif.search_failed'.tr();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey[900] : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            decoration: BoxDecoration(
              color: Colors.grey[400],
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Title
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Text(
                  'gif.title'.tr(),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'gif.search_hint'.tr(),
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _loadTrendingGifs();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDarkMode ? Colors.grey[700]! : Colors.grey[300]!,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDarkMode ? Colors.grey[700]! : Colors.grey[300]!,
                  ),
                ),
                filled: true,
                fillColor: isDarkMode ? Colors.grey[800] : Colors.grey[100],
              ),
              onChanged: (value) {
                // Debounce search
                Future.delayed(const Duration(milliseconds: 500), () {
                  if (mounted && _searchController.text == value) {
                    _searchGifs(value);
                  }
                });
              },
              onSubmitted: _searchGifs,
            ),
          ),

          // Content
          Expanded(
            child: _buildContent(),
          ),

          // GIPHY attribution
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isDarkMode ? Colors.grey[800]! : Colors.grey[200]!,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'gif.powered_by'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    color: isDarkMode ? Colors.grey[500] : Colors.grey[600],
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  'GIPHY',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isDarkMode ? Colors.grey[400] : Colors.grey[700],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: TextStyle(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: _searchQuery.isEmpty ? _loadTrendingGifs : () => _searchGifs(_searchQuery),
              icon: const Icon(Icons.refresh),
              label: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_gifs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.gif_box_outlined,
              size: 48,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'gif.no_results'.tr(),
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(8),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1.2,
      ),
      itemCount: _gifs.length,
      itemBuilder: (context, index) {
        final gif = _gifs[index];
        final previewUrl = gif.images?.fixedHeight?.url ??
                          gif.images?.original?.url ?? '';

        if (previewUrl.isEmpty) {
          return const SizedBox.shrink();
        }

        return GestureDetector(
          onTap: () => widget.onGifSelected(gif),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Container(
              color: Colors.grey[800],
              child: Image.network(
                previewUrl,
                fit: BoxFit.cover,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Center(
                    child: CircularProgressIndicator(
                      value: loadingProgress.expectedTotalBytes != null
                          ? loadingProgress.cumulativeBytesLoaded /
                              loadingProgress.expectedTotalBytes!
                          : null,
                      strokeWidth: 2,
                    ),
                  );
                },
                errorBuilder: (context, error, stackTrace) {
                  return Center(
                    child: Icon(
                      Icons.broken_image,
                      color: Colors.grey[600],
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}
