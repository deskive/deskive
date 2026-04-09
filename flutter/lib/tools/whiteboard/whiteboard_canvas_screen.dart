import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/workspace_service.dart';
import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import 'models/whiteboard_element.dart';
import 'models/whiteboard_data.dart';
import 'models/collaborator_presence.dart';
import 'services/whiteboard_api_service.dart';
import 'services/whiteboard_collaboration_service.dart';
import 'painters/whiteboard_painter.dart';
import 'widgets/whiteboard_toolbar.dart';

/// Main whiteboard canvas screen with drawing and collaboration
class WhiteboardCanvasScreen extends StatefulWidget {
  final String? whiteboardId;
  final String? whiteboardName;

  const WhiteboardCanvasScreen({
    super.key,
    this.whiteboardId,
    this.whiteboardName,
  });

  @override
  State<WhiteboardCanvasScreen> createState() => _WhiteboardCanvasScreenState();
}

class _WhiteboardCanvasScreenState extends State<WhiteboardCanvasScreen> {
  // Whiteboard data
  WhiteboardData? _whiteboard;
  List<WhiteboardElement> _elements = [];
  bool _isLoading = true;
  String? _error;

  // Drawing state
  WhiteboardTool _selectedTool = WhiteboardTool.freedraw;
  WhiteboardElement? _currentElement;
  Set<String> _selectedElementIds = {};

  // Style state
  Color _strokeColor = Colors.black;
  Color _backgroundColor = Colors.transparent;
  double _strokeWidth = 2.0;

  // Transform state
  double _scale = 1.0;
  Offset _offset = Offset.zero;
  Offset? _lastFocalPoint;

  // Collaboration
  WhiteboardCollaborationService? _collaborationService;
  Map<String, CollaboratorPresence> _collaborators = {};
  bool _isCollaborationConnected = false;

  // Undo/Redo
  final List<List<WhiteboardElement>> _undoStack = [];
  final List<List<WhiteboardElement>> _redoStack = [];
  static const int _maxUndoSteps = 50;

  // Auto-save
  Timer? _autoSaveTimer;
  bool _hasUnsavedChanges = false;
  static const Duration _autoSaveDelay = Duration(seconds: 2);

  // Text input
  final TextEditingController _textController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _initializeWhiteboard();
  }

  @override
  void dispose() {
    _collaborationService?.dispose();
    _autoSaveTimer?.cancel();
    _textController.dispose();
    super.dispose();
  }

  Future<void> _initializeWhiteboard() async {
    try {
      if (widget.whiteboardId != null) {
        // Load existing whiteboard
        await _loadWhiteboard();
        _initializeCollaboration();
      } else {
        // Create new whiteboard
        await _createWhiteboard();
        _initializeCollaboration();
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadWhiteboard() async {
    setState(() => _isLoading = true);

    debugPrint('[WhiteboardCanvas] Loading whiteboard: ${widget.whiteboardId}');

    try {
      final whiteboard = await WhiteboardApiService.instance.getWhiteboard(
        widget.whiteboardId!,
      );

      debugPrint('[WhiteboardCanvas] ✅ Loaded whiteboard: ${whiteboard.name}');
      debugPrint('[WhiteboardCanvas] Elements count: ${whiteboard.elements.length}');

      setState(() {
        _whiteboard = whiteboard;
        _elements = whiteboard.elements;
        _isLoading = false;
      });
    } catch (e, stackTrace) {
      debugPrint('[WhiteboardCanvas] ❌ Failed to load whiteboard: $e');
      debugPrint('[WhiteboardCanvas] Stack trace: $stackTrace');
      setState(() {
        _error = 'Failed to load whiteboard: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _createWhiteboard() async {
    setState(() => _isLoading = true);

    try {
      final whiteboard = await WhiteboardApiService.instance.createWhiteboard(
        name: widget.whiteboardName ?? 'Untitled Whiteboard',
      );

      setState(() {
        _whiteboard = whiteboard;
        _elements = [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to create whiteboard: $e';
        _isLoading = false;
      });
    }
  }

  void _initializeCollaboration() {
    if (_whiteboard == null) {
      debugPrint('[WhiteboardCanvas] ❌ Cannot init collaboration: whiteboard is null');
      return;
    }

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      debugPrint('[WhiteboardCanvas] ❌ Cannot init collaboration: workspaceId is null');
      return;
    }

    debugPrint('[WhiteboardCanvas] 🔗 Initializing collaboration...');
    debugPrint('[WhiteboardCanvas] WorkspaceId: $workspaceId');
    debugPrint('[WhiteboardCanvas] WhiteboardId: ${_whiteboard!.id}');

    _collaborationService = WhiteboardCollaborationService(
      workspaceId: workspaceId,
      whiteboardId: _whiteboard!.id,
      onElementsUpdate: _handleRemoteElementsUpdate,
      onPointerUpdate: _handlePointerUpdate,
      onPresenceUpdate: _handlePresenceUpdate,
      onConnected: () {
        debugPrint('[WhiteboardCanvas] 🟢 Collaboration connected!');
        setState(() => _isCollaborationConnected = true);
      },
      onDisconnected: () {
        debugPrint('[WhiteboardCanvas] 🔴 Collaboration disconnected');
        setState(() => _isCollaborationConnected = false);
      },
      onError: (error) {
        debugPrint('[WhiteboardCanvas] ❌ Collaboration error: $error');
      },
    );

    _collaborationService!.connect();
  }

  void _handleRemoteElementsUpdate(List<WhiteboardElement> remoteElements) {
    debugPrint('[WhiteboardCanvas] 📥 Received ${remoteElements.length} remote elements');
    debugPrint('[WhiteboardCanvas] Local elements: ${_elements.length}, merging...');
    setState(() {
      _elements = ElementMerger.merge(_elements, remoteElements);
    });
    debugPrint('[WhiteboardCanvas] After merge: ${_elements.length} elements');
  }

  void _handlePointerUpdate(String odontId, double x, double y) {
    // Skip our own pointer
    if (odontId == AuthService.instance.currentUser?.id) return;

    setState(() {
      final existing = _collaborators[odontId];
      if (existing != null) {
        _collaborators[odontId] = existing.updatePointer(x, y);
      }
    });
  }

  void _handlePresenceUpdate(Map<String, CollaboratorPresence> presence) {
    // Filter out our own presence
    final userId = AuthService.instance.currentUser?.id;
    setState(() {
      _collaborators = Map.fromEntries(
        presence.entries.where((e) => e.key != userId),
      );
    });
  }

  void _pushUndoState() {
    _undoStack.add(List.from(_elements.map((e) => e.copyWith())));
    if (_undoStack.length > _maxUndoSteps) {
      _undoStack.removeAt(0);
    }
    _redoStack.clear();
  }

  void _undo() {
    if (_undoStack.isEmpty) return;

    _redoStack.add(List.from(_elements.map((e) => e.copyWith())));
    setState(() {
      _elements = _undoStack.removeLast();
    });
    _scheduleAutoSave();
    _collaborationService?.sendElementsUpdate(_elements);
  }

  void _redo() {
    if (_redoStack.isEmpty) return;

    _undoStack.add(List.from(_elements.map((e) => e.copyWith())));
    setState(() {
      _elements = _redoStack.removeLast();
    });
    _scheduleAutoSave();
    _collaborationService?.sendElementsUpdate(_elements);
  }

  void _scheduleAutoSave() {
    setState(() => _hasUnsavedChanges = true);
    _autoSaveTimer?.cancel();
    _autoSaveTimer = Timer(_autoSaveDelay, _saveWhiteboard);
  }

  Future<void> _saveWhiteboard() async {
    if (_whiteboard == null || !_hasUnsavedChanges) return;

    debugPrint('[WhiteboardCanvas] 💾 Saving ${_elements.length} elements...');

    try {
      final result = await WhiteboardApiService.instance.saveElements(
        _whiteboard!.id,
        _elements,
      );
      if (mounted) {
        setState(() => _hasUnsavedChanges = false);
      }
      debugPrint('[WhiteboardCanvas] ✅ Auto-saved successfully, returned ${result.elements.length} elements');
    } catch (e) {
      debugPrint('[WhiteboardCanvas] ❌ Auto-save failed: $e');
      // Reset the flag after failure to prevent UI from showing "Saving..." forever
      // The changes are still in memory and will sync via collaboration or retry
      if (mounted) {
        setState(() => _hasUnsavedChanges = false);
      }
      // Show a snackbar to notify user
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Offset _screenToCanvas(Offset screenPoint) {
    return (screenPoint - _offset) / _scale;
  }

  // Track if we're in the middle of a two-finger gesture
  bool _isScaling = false;
  double _baseScale = 1.0;

  void _handleScaleStart(ScaleStartDetails details) {
    _lastFocalPoint = details.focalPoint;
    _isScaling = details.pointerCount >= 2;
    _baseScale = _scale;

    if (!_isScaling) {
      // Single finger - treat as pan/draw start
      final canvasPoint = _screenToCanvas(details.localFocalPoint);

      if (_selectedTool == WhiteboardTool.hand) {
        return;
      }

      if (_selectedTool == WhiteboardTool.selection) {
        // Check if we hit an element
        final hitElement = _findElementAt(canvasPoint);
        if (hitElement != null) {
          setState(() {
            _selectedElementIds = {hitElement.id};
          });
        } else {
          setState(() {
            _selectedElementIds.clear();
          });
        }
        return;
      }

      if (_selectedTool == WhiteboardTool.eraser) {
        _eraseAt(canvasPoint);
        return;
      }

      // Start creating new element
      _pushUndoState();
      final elementType = _selectedTool.elementType;
      if (elementType != null) {
        setState(() {
          _currentElement = WhiteboardElement(
            type: elementType,
            x: canvasPoint.dx,
            y: canvasPoint.dy,
            width: 0,
            height: 0,
            strokeColor: _colorToHex(_strokeColor),
            backgroundColor: _colorToHex(_backgroundColor),
            strokeWidth: _strokeWidth,
            points: elementType == ElementType.freedraw ||
                    elementType == ElementType.line ||
                    elementType == ElementType.arrow
                ? [[canvasPoint.dx, canvasPoint.dy, 0.5]]
                : null,
          );
        });
      }
    }
  }

  void _handleScaleUpdate(ScaleUpdateDetails details) {
    if (details.pointerCount >= 2 || _isScaling) {
      // Two-finger gesture: pan and zoom
      _isScaling = true;
      setState(() {
        _scale = (_baseScale * details.scale).clamp(0.1, 5.0);
        if (_lastFocalPoint != null) {
          _offset += details.focalPoint - _lastFocalPoint!;
        }
        _lastFocalPoint = details.focalPoint;
      });
      return;
    }

    // Single finger - treat as pan/draw update
    final canvasPoint = _screenToCanvas(details.localFocalPoint);

    // Send pointer to collaborators
    _collaborationService?.sendPointer(canvasPoint.dx, canvasPoint.dy);

    if (_selectedTool == WhiteboardTool.hand) {
      if (_lastFocalPoint != null) {
        setState(() {
          _offset += details.focalPoint - _lastFocalPoint!;
          _lastFocalPoint = details.focalPoint;
        });
      }
      return;
    }

    if (_selectedTool == WhiteboardTool.selection && _selectedElementIds.isNotEmpty) {
      // Move selected elements
      if (_lastFocalPoint != null) {
        final delta = (details.focalPoint - _lastFocalPoint!) / _scale;
        setState(() {
          for (final elementId in _selectedElementIds) {
            final index = _elements.indexWhere((e) => e.id == elementId);
            if (index >= 0) {
              _elements[index] = _elements[index].copyWith(
                x: _elements[index].x + delta.dx,
                y: _elements[index].y + delta.dy,
              );
            }
          }
        });
        _lastFocalPoint = details.focalPoint;
        _scheduleAutoSave();
      }
      return;
    }

    if (_selectedTool == WhiteboardTool.eraser) {
      _eraseAt(canvasPoint);
      return;
    }

    if (_currentElement != null) {
      setState(() {
        if (_currentElement!.type == ElementType.freedraw ||
            _currentElement!.type == ElementType.line ||
            _currentElement!.type == ElementType.arrow) {
          // Add point to path
          final points = List<List<double>>.from(_currentElement!.points ?? []);
          points.add([canvasPoint.dx, canvasPoint.dy, 0.5]);
          _currentElement = _currentElement!.copyWith(points: points);
        } else {
          // Update shape size
          _currentElement = _currentElement!.copyWith(
            width: canvasPoint.dx - _currentElement!.x,
            height: canvasPoint.dy - _currentElement!.y,
          );
        }
      });
    }
  }

  void _handleScaleEnd(ScaleEndDetails details) {
    _lastFocalPoint = null;

    if (_isScaling) {
      _isScaling = false;
      return;
    }

    // Single finger end - finalize drawing
    if (_currentElement != null) {
      // Normalize negative dimensions
      var element = _currentElement!;
      if (element.width < 0) {
        element = element.copyWith(
          x: element.x + element.width,
          width: -element.width,
        );
      }
      if (element.height < 0) {
        element = element.copyWith(
          y: element.y + element.height,
          height: -element.height,
        );
      }

      // Only add if element has meaningful size
      if (element.type == ElementType.freedraw ||
          element.type == ElementType.line ||
          element.type == ElementType.arrow ||
          (element.width.abs() > 5 && element.height.abs() > 5)) {
        setState(() {
          _elements.add(element.incrementVersion());
          _currentElement = null;
        });
        _scheduleAutoSave();
        _collaborationService?.sendElementsUpdate(_elements);
      } else {
        setState(() => _currentElement = null);
      }
    }
  }

  void _handleTap(TapUpDetails details) {
    final canvasPoint = _screenToCanvas(details.localPosition);

    if (_selectedTool == WhiteboardTool.text) {
      _showTextInput(canvasPoint);
      return;
    }

    if (_selectedTool == WhiteboardTool.selection) {
      final hitElement = _findElementAt(canvasPoint);
      setState(() {
        if (hitElement != null) {
          _selectedElementIds = {hitElement.id};
        } else {
          _selectedElementIds.clear();
        }
      });
    }
  }

  WhiteboardElement? _findElementAt(Offset point) {
    for (int i = _elements.length - 1; i >= 0; i--) {
      final element = _elements[i];
      if (!element.isDeleted && element.containsPoint(point)) {
        return element;
      }
    }
    return null;
  }

  void _eraseAt(Offset point) {
    final hitElement = _findElementAt(point);
    if (hitElement != null) {
      _pushUndoState();
      setState(() {
        final index = _elements.indexWhere((e) => e.id == hitElement.id);
        if (index >= 0) {
          _elements[index] = _elements[index].markDeleted();
        }
      });
      _scheduleAutoSave();
      _collaborationService?.sendElementsUpdate(_elements);
    }
  }

  void _showTextInput(Offset position) {
    _textController.clear();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Text'),
        content: TextField(
          controller: _textController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Enter text...',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (_textController.text.isNotEmpty) {
                _pushUndoState();
                setState(() {
                  _elements.add(WhiteboardElement(
                    type: ElementType.text,
                    x: position.dx,
                    y: position.dy,
                    width: 200,
                    height: 50,
                    text: _textController.text,
                    strokeColor: _colorToHex(_strokeColor),
                    fontSize: 20,
                  ).incrementVersion());
                });
                _scheduleAutoSave();
                _collaborationService?.sendElementsUpdate(_elements);
              }
              Navigator.pop(context);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);

    if (image != null) {
      // TODO: Upload image and get URL
      // For now, we'll use a placeholder
      _pushUndoState();
      setState(() {
        _elements.add(WhiteboardElement(
          type: ElementType.image,
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          imageUrl: image.path,
        ).incrementVersion());
      });
      _scheduleAutoSave();
      _collaborationService?.sendElementsUpdate(_elements);
    }
  }

  void _deleteSelected() {
    if (_selectedElementIds.isEmpty) return;

    _pushUndoState();
    setState(() {
      for (final elementId in _selectedElementIds) {
        final index = _elements.indexWhere((e) => e.id == elementId);
        if (index >= 0) {
          _elements[index] = _elements[index].markDeleted();
        }
      }
      _selectedElementIds.clear();
    });
    _scheduleAutoSave();
    _collaborationService?.sendElementsUpdate(_elements);
  }

  void _zoomIn() {
    setState(() {
      _scale = (_scale * 1.2).clamp(0.1, 5.0);
    });
  }

  void _zoomOut() {
    setState(() {
      _scale = (_scale / 1.2).clamp(0.1, 5.0);
    });
  }

  void _resetZoom() {
    setState(() {
      _scale = 1.0;
      _offset = Offset.zero;
    });
  }

  String _colorToHex(Color color) {
    if (color == Colors.transparent) return 'transparent';
    return '#${color.value.toRadixString(16).padLeft(8, '0').substring(2)}';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: Text(widget.whiteboardName ?? 'Loading...'),
        ),
        body: Center(
          child: CircularProgressIndicator(
            color: context.primaryColor,
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Whiteboard'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
              const SizedBox(height: 16),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _initializeWhiteboard,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_whiteboard?.name ?? 'Whiteboard'),
        actions: [
          // Connection indicator
          if (_isCollaborationConnected)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${_collaborators.length + 1}',
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          // Delete selected
          if (_selectedElementIds.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: _deleteSelected,
              tooltip: 'Delete Selected',
            ),
          // More options
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'rename':
                  _showRenameDialog();
                  break;
                case 'export':
                  _exportWhiteboard();
                  break;
                case 'share':
                  _shareWhiteboard();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'rename',
                child: ListTile(
                  leading: Icon(Icons.edit),
                  title: Text('Rename'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: ListTile(
                  leading: Icon(Icons.download),
                  title: Text('Export'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'share',
                child: ListTile(
                  leading: Icon(Icons.share),
                  title: Text('Share'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Toolbar
          WhiteboardToolbar(
            selectedTool: _selectedTool,
            onToolChanged: (tool) {
              if (tool == WhiteboardTool.image) {
                _pickImage();
              } else {
                setState(() => _selectedTool = tool);
              }
            },
            strokeColor: _strokeColor,
            onStrokeColorChanged: (color) => setState(() => _strokeColor = color),
            backgroundColor: _backgroundColor,
            onBackgroundColorChanged: (color) => setState(() => _backgroundColor = color),
            strokeWidth: _strokeWidth,
            onStrokeWidthChanged: (width) => setState(() => _strokeWidth = width),
            onUndo: _undo,
            onRedo: _redo,
            canUndo: _undoStack.isNotEmpty,
            canRedo: _redoStack.isNotEmpty,
          ),

          // Canvas
          Expanded(
            child: Stack(
              children: [
                // Drawing area
                GestureDetector(
                  onScaleStart: _handleScaleStart,
                  onScaleUpdate: _handleScaleUpdate,
                  onScaleEnd: _handleScaleEnd,
                  onTapUp: _handleTap,
                  child: Container(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    child: CustomPaint(
                      painter: WhiteboardPainter(
                        elements: _elements.where((e) => !e.isDeleted).toList(),
                        currentElement: _currentElement,
                        selectedElementIds: _selectedElementIds,
                        collaborators: _collaborators,
                        scale: _scale,
                        offset: _offset,
                      ),
                      size: Size.infinite,
                    ),
                  ),
                ),

                // Floating zoom controls
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: WhiteboardFloatingToolbar(
                    onZoomIn: _zoomIn,
                    onZoomOut: _zoomOut,
                    onZoomReset: _resetZoom,
                    onToggleGrid: () {},
                    showGrid: true,
                    zoomLevel: _scale,
                  ),
                ),

                // Saving indicator
                if (_hasUnsavedChanges)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'Saving...',
                        style: TextStyle(color: Colors.white, fontSize: 12),
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

  void _showRenameDialog() {
    final controller = TextEditingController(text: _whiteboard?.name);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename Whiteboard'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Name',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.isNotEmpty && _whiteboard != null) {
                try {
                  final updated = await WhiteboardApiService.instance.updateWhiteboard(
                    _whiteboard!.id,
                    name: controller.text,
                  );
                  setState(() => _whiteboard = updated);
                } catch (e) {
                  debugPrint('[WhiteboardCanvas] Rename failed: $e');
                }
              }
              if (mounted) Navigator.pop(context);
            },
            child: const Text('Rename'),
          ),
        ],
      ),
    );
  }

  void _exportWhiteboard() {
    // TODO: Implement PNG export
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Export feature coming soon')),
    );
  }

  void _shareWhiteboard() async {
    if (_whiteboard == null) return;

    try {
      final shareLink = await WhiteboardApiService.instance.generateShareLink(
        _whiteboard!.id,
      );
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Share Whiteboard'),
            content: SelectableText(shareLink),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate share link: $e')),
        );
      }
    }
  }
}
