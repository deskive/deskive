import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../theme/app_theme.dart';
import 'models/whiteboard_data.dart';
import 'services/whiteboard_api_service.dart';
import 'whiteboard_canvas_screen.dart';

/// Screen showing list of whiteboards with create/delete functionality
class WhiteboardListScreen extends StatefulWidget {
  const WhiteboardListScreen({super.key});

  @override
  State<WhiteboardListScreen> createState() => _WhiteboardListScreenState();
}

class _WhiteboardListScreenState extends State<WhiteboardListScreen> {
  List<WhiteboardListItem> _whiteboards = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadWhiteboards();
  }

  Future<void> _loadWhiteboards() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      debugPrint('[WhiteboardList] Loading whiteboards...');
      final whiteboards = await WhiteboardApiService.instance.getWhiteboards();
      debugPrint('[WhiteboardList] Loaded ${whiteboards.length} whiteboards');
      for (final wb in whiteboards) {
        debugPrint('[WhiteboardList] - ${wb.id}: ${wb.name}');
      }
      setState(() {
        _whiteboards = whiteboards;
        _isLoading = false;
      });
    } catch (e, stackTrace) {
      debugPrint('[WhiteboardList] Error loading whiteboards: $e');
      debugPrint('[WhiteboardList] Stack trace: $stackTrace');
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _createWhiteboard() async {
    final nameController = TextEditingController();

    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('whiteboard.create_new'.tr()),
        content: TextField(
          controller: nameController,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'whiteboard.name'.tr(),
            hintText: 'whiteboard.name_hint'.tr(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () {
              final name = nameController.text.trim();
              Navigator.pop(context, name.isEmpty ? 'Untitled' : name);
            },
            child: Text('common.create'.tr()),
          ),
        ],
      ),
    );

    if (name != null && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => WhiteboardCanvasScreen(
            whiteboardName: name,
          ),
        ),
      ).then((_) => _loadWhiteboards());
    }
  }

  Future<void> _deleteWhiteboard(WhiteboardListItem whiteboard) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('whiteboard.delete_title'.tr()),
        content: Text('whiteboard.delete_confirm'.tr(args: [whiteboard.name])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await WhiteboardApiService.instance.deleteWhiteboard(whiteboard.id);
        _loadWhiteboards();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('whiteboard.deleted'.tr())),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('whiteboard.delete_error'.tr())),
          );
        }
      }
    }
  }

  void _openWhiteboard(WhiteboardListItem whiteboard) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => WhiteboardCanvasScreen(
          whiteboardId: whiteboard.id,
          whiteboardName: whiteboard.name,
        ),
      ),
    ).then((_) => _loadWhiteboards());
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('whiteboard.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadWhiteboards,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(isDark),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createWhiteboard,
        icon: const Icon(Icons.add),
        label: Text('whiteboard.new'.tr()),
        backgroundColor: context.primaryColor,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildBody(bool isDark) {
    if (_isLoading) {
      return Center(
        child: CircularProgressIndicator(
          color: context.primaryColor,
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              'whiteboard.error_loading'.tr(),
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.white70 : Colors.black54,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white38 : Colors.black38,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadWhiteboards,
              icon: const Icon(Icons.refresh),
              label: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_whiteboards.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.draw_outlined,
              size: 64,
              color: isDark ? Colors.white24 : Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              'whiteboard.empty_title'.tr(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white70 : Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'whiteboard.empty_subtitle'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white38 : Colors.black38,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _createWhiteboard,
              icon: const Icon(Icons.add),
              label: Text('whiteboard.create_first'.tr()),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadWhiteboards,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _whiteboards.length,
        itemBuilder: (context, index) {
          final whiteboard = _whiteboards[index];
          return _buildWhiteboardCard(whiteboard, isDark);
        },
      ),
    );
  }

  Widget _buildWhiteboardCard(WhiteboardListItem whiteboard, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: context.borderColor,
        ),
      ),
      child: InkWell(
        onTap: () => _openWhiteboard(whiteboard),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Thumbnail or icon
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.purple.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: whiteboard.thumbnailUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          whiteboard.thumbnailUrl!,
                          fit: BoxFit.cover,
                        ),
                      )
                    : const Icon(
                        Icons.draw_outlined,
                        size: 28,
                        color: Colors.purple,
                      ),
              ),
              const SizedBox(width: 16),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      whiteboard.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'whiteboard.last_edited'.tr(
                        args: [timeago.format(whiteboard.updatedAt)],
                      ),
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white38 : Colors.black38,
                      ),
                    ),
                    if (whiteboard.elementCount > 0)
                      Text(
                        'whiteboard.element_count'.tr(
                          args: [whiteboard.elementCount.toString()],
                        ),
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white38 : Colors.black38,
                        ),
                      ),
                  ],
                ),
              ),

              // Actions
              PopupMenuButton<String>(
                onSelected: (value) {
                  switch (value) {
                    case 'delete':
                      _deleteWhiteboard(whiteboard);
                      break;
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'delete',
                    child: ListTile(
                      leading: Icon(Icons.delete_outline, color: Colors.red.shade400),
                      title: Text(
                        'common.delete'.tr(),
                        style: TextStyle(color: Colors.red.shade400),
                      ),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ],
                child: Container(
                  padding: const EdgeInsets.all(8),
                  child: Icon(
                    Icons.more_vert,
                    color: isDark ? Colors.white54 : Colors.black54,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
