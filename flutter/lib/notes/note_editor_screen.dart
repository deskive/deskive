import 'dart:async';
import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:flutter_quill/quill_delta.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_quill_delta_from_html/flutter_quill_delta_from_html.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:path_provider/path_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:markdown/markdown.dart' as md;
import 'package:archive/archive.dart';
import 'package:xml/xml.dart' as xml;
import 'dart:io';
import 'package:dio/dio.dart';
import 'note.dart';
import 'notes_service.dart';
import '../services/app_at_once_service.dart';
import '../config/app_config.dart';
import '../api/services/notes_api_service.dart' as api;
import '../api/services/ai_api_service.dart';
import '../services/workspace_service.dart';
import '../config/env_config.dart';
import '../api/services/calendar_api_service.dart' as calendar_api;
import '../services/file_service.dart';
import '../services/note_collaboration_service.dart';
import 'widgets/share_note_dialog.dart';
import 'widgets/collaborator_indicator.dart';
import '../models/file/file.dart' as file_model;
import '../widgets/mention_suggestion_widget.dart';
import '../widgets/attachment_display_widget.dart';
import '../widgets/attachment_preview_dialogs.dart';
import '../models/calendar_event.dart' as local_event;
import '../services/auth_service.dart';

enum NoteEditorMode { create, edit }

class NoteEditorScreen extends StatefulWidget {
  final Note? note;
  final NoteEditorMode initialMode;
  final String? parentId;
  final Map<String, dynamic>? templateData;

  const NoteEditorScreen({
    super.key,
    this.note,
    this.initialMode = NoteEditorMode.create,
    this.parentId,
    this.templateData,
  });

  @override
  State<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<NoteEditorScreen> {
  late final TextEditingController _titleController;
  late QuillController _quillController; // Non-final to allow recreation
  late final FocusNode _titleFocusNode;
  late FocusNode _contentFocusNode; // Non-final to allow recreation with controller
  late ScrollController _editorScrollController; // Non-final to allow recreation with controller

  // Key to force QuillEditor recreation when controller changes
  int _quillEditorKey = 0;

  final NotesService _notesService = NotesService();

  // All supported languages for translation
  // Language codes must match backend LanguageCode enum (e.g., 'zh-cn' not 'zh')
  final Map<String, Map<String, String>> _availableLanguages = {
    'en': {'flag': '🇺🇸', 'name': 'English'},
    'es': {'flag': '🇪🇸', 'name': 'Spanish'},
    'fr': {'flag': '🇫🇷', 'name': 'French'},
    'de': {'flag': '🇩🇪', 'name': 'German'},
    'it': {'flag': '🇮🇹', 'name': 'Italian'},
    'pt': {'flag': '🇵🇹', 'name': 'Portuguese'},
    'ru': {'flag': '🇷🇺', 'name': 'Russian'},
    'ja': {'flag': '🇯🇵', 'name': 'Japanese'},
    'ko': {'flag': '🇰🇷', 'name': 'Korean'},
    'zh-cn': {'flag': '🇨🇳', 'name': 'Chinese (Simplified)'},
    'zh-tw': {'flag': '🇹🇼', 'name': 'Chinese (Traditional)'},
    'ar': {'flag': '🇸🇦', 'name': 'Arabic'},
    'hi': {'flag': '🇮🇳', 'name': 'Hindi'},
  };

  String? _detectedLanguage;
  final api.NotesApiService _notesApiService = api.NotesApiService();
  final AIApiService _aiApiService = AIApiService();
  final calendar_api.CalendarApiService _calendarApi = calendar_api.CalendarApiService();
  final FileService _fileService = FileService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  late NoteEditorMode _mode;
  late String _selectedIcon;
  late bool _isFavorite;
  bool _isModified = false;
  bool _isSaving = false;
  bool _showAIImprovement = false;

  // / mention functionality for attachments
  List<api.Note> _availableNotes = [];
  List<local_event.CalendarEvent> _availableEventsLocal = [];
  List<file_model.File> _availableFiles = [];
  int _slashSymbolPosition = -1;
  List<Map<String, dynamic>> _linkedItems = []; // For storing linked notes, events, files

  // Real-time collaboration
  final NoteCollaborationService _collaborationService = NoteCollaborationService.instance;
  List<CollaborationUser> _collaborators = [];
  StreamSubscription<List<CollaborationUser>>? _usersSubscription;
  StreamSubscription<CursorData>? _cursorSubscription;
  StreamSubscription<CollaborationUser>? _userJoinedSubscription;
  StreamSubscription<String>? _userLeftSubscription;
  StreamSubscription<bool>? _connectionSubscription;
  StreamSubscription<RemoteContentUpdate>? _contentUpdateSubscription;
  StreamSubscription<RemoteDeltaUpdate>? _deltaUpdateSubscription;
  StreamSubscription<FullSyncData>? _fullSyncSubscription;
  StreamSubscription<Map<String, dynamic>>? _syncRequestSubscription;
  StreamSubscription? _documentChangesSubscription;
  bool _isCollaborationEnabled = false;
  String? _currentNoteApiId; // API ID for collaboration
  bool _isRefreshingContent = false; // Prevent multiple simultaneous refreshes
  Timer? _contentRefreshDebounce; // Debounce rapid updates
  bool _isApplyingRemoteDelta = false; // Prevent echo of remote changes
  Timer? _deltaSendDebounce; // Debounce rapid local changes
  String? _lastSentContent; // Track last sent content to detect actual changes
  Timer? _autoSaveDebounce; // Debounce auto-save
  bool _isAutoSaving = false; // Prevent multiple simultaneous auto-saves
  bool _isLoadingContent = false; // Track if we're fetching full note content
  bool _isEditorReady = false; // Delay QuillEditor creation until first frame

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
    
    // Initialize controllers
    String initialTitle = '';
    String initialContent = '';
    String initialIcon = '📝';
    
    if (widget.templateData != null) {
      // Initialize from template data
      initialTitle = widget.templateData!['title'] ?? '';
      initialContent = widget.templateData!['content'] ?? '';
      initialIcon = widget.templateData!['icon'] ?? '📝';
    } else if (widget.note != null) {
      // Initialize from existing note
      initialTitle = widget.note!.title;
      initialContent = widget.note!.content ?? ''; // Handle null content
      initialIcon = widget.note!.icon;
      debugPrint('[NoteEditor] Initialized from note - title: "$initialTitle", contentLength: ${initialContent.length}');
    }
    
    _titleController = TextEditingController(text: initialTitle);

    // Initialize Quill controller
    if (initialContent.isNotEmpty && _isHtmlContent(initialContent)) {
      // Convert HTML to Quill Delta format to preserve formatting
      try {
        // Simplify HTML before conversion to avoid complex elements causing issues
        final simplifiedHtml = _simplifyHtmlForEditor(initialContent);
        debugPrint('[NoteEditor] Initial HTML simplified, length: ${simplifiedHtml.length}');

        final delta = HtmlToDelta().convert(simplifiedHtml);
        _quillController = QuillController(
          document: Document.fromDelta(delta),
          selection: const TextSelection.collapsed(offset: 0),
        );
        debugPrint('[NoteEditor] Initial HTML converted successfully');
      } catch (e, stackTrace) {
        // Fallback to plain text if HTML conversion fails
        debugPrint('[NoteEditor] Initial HTML conversion failed: $e');
        debugPrint('[NoteEditor] Stack trace: $stackTrace');
        _quillController = QuillController.basic();
        final plainText = _stripHtmlTags(initialContent);
        if (plainText.isNotEmpty) {
          _quillController.document = Document()..insert(0, plainText);
        }
      }
    } else {
      // For plain text or empty content
      _quillController = QuillController.basic();
      if (initialContent.isNotEmpty) {
        _quillController.document = Document()..insert(0, initialContent);
      }
    }
    
    // Initialize focus nodes
    _titleFocusNode = FocusNode();
    _contentFocusNode = FocusNode();

    // Initialize scroll controller for QuillEditor
    _editorScrollController = ScrollController();

    // Initialize note data
    _selectedIcon = initialIcon;
    _isFavorite = widget.note?.isFavorite ?? false;
    
    // Auto-focus on title for new notes
    if (_mode == NoteEditorMode.create) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _titleFocusNode.requestFocus();
      });
    }
    
    // Add listeners for changes
    _titleController.addListener(_onDataChanged);
    _quillController.addListener(_onDataChanged);

    // Load attachable items for / mentions
    _loadNotesForMention();
    _loadEventsForMention();
    _loadFilesForMention();

    // Load existing attachments when editing a note
    if (_mode == NoteEditorMode.edit && widget.note != null) {
      _loadExistingAttachments();
    }

    // Fetch full note content if editing and content is empty/null (e.g., from URL import)
    if (_mode == NoteEditorMode.edit && widget.note != null) {
      final content = widget.note!.content;
      // Check for null or empty content - need to fetch from API
      if (content == null || content.isEmpty) {
        debugPrint('[NoteEditor] Content is null or empty, fetching full note content...');
        // Content may not have been included in the list response
        // Fetch full note details from API
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _fetchFullNoteContent();
        });
      } else {
        debugPrint('[NoteEditor] Content already loaded, length: ${content.length}');
      }
    }

    // Delay QuillEditor creation until after first frame to avoid GlobalKey conflicts
    // Use a longer delay to ensure the widget tree is fully stable
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        // Add extra delay for complex content
        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) {
            setState(() {
              _isEditorReady = true;
            });

            // Only initialize collaboration after the editor is ready
            // This prevents setState calls during editor initialization
            if (widget.note != null) {
              Future.delayed(const Duration(milliseconds: 200), () {
                if (mounted) {
                  _initializeCollaboration();
                }
              });
            }
          }
        });
      }
    });
  }

  /// Fetch full note content from API when content is not available in list response
  Future<void> _fetchFullNoteContent() async {
    if (_isLoadingContent || widget.note == null) return;

    setState(() {
      _isLoadingContent = true;
    });

    try {
      // Get workspace ID
      String? workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null || workspaceId.isEmpty) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        debugPrint('[NoteEditor] Cannot fetch note content: missing workspaceId');
        return;
      }

      debugPrint('[NoteEditor] Fetching full note content for note: ${widget.note!.id}');

      final response = await _notesApiService.getNote(workspaceId, widget.note!.id);

      if (response.isSuccess && response.data != null && mounted) {
        final noteContent = response.data!.content ?? '';
        debugPrint('[NoteEditor] Fetched content length: ${noteContent.length}');

        if (noteContent.isNotEmpty) {
          // Recreate all editor resources to avoid GlobalKey conflicts
          _recreateEditorWithContent(noteContent);

          // Reset modified flag since this is the original content
          setState(() {
            _isModified = false;
          });
        }
      } else {
        debugPrint('[NoteEditor] Failed to fetch note content: ${response.message}');
      }
    } catch (e) {
      debugPrint('[NoteEditor] Error fetching note content: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingContent = false;
        });
      }
    }
  }

  /// Helper method to recreate all editor resources with new content
  /// This completely destroys and recreates the QuillController, FocusNode, and ScrollController
  /// to avoid flutter_quill GlobalKey conflicts
  void _recreateEditorWithContent(String content, {int cursorOffset = 0}) {
    if (!mounted) return;

    debugPrint('[NoteEditor] _recreateEditorWithContent called, content length: ${content.length}');

    // First, hide the editor to remove QuillEditor from widget tree
    // This prevents the old widget from trying to access disposed resources
    setState(() {
      _isEditorReady = false;
    });

    // Use Future.delayed to ensure the widget tree is fully updated and
    // the old QuillEditor is completely unmounted before disposing resources.
    // Increased delay for complex content to ensure proper unmounting.
    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) return;

      try {
        // Dispose old resources safely
        try {
          _quillController.removeListener(_onDataChanged);
          _quillController.dispose();
        } catch (e) {
          debugPrint('[NoteEditor] Error disposing controller: $e');
        }

        try {
          _contentFocusNode.dispose();
        } catch (e) {
          debugPrint('[NoteEditor] Error disposing focus node: $e');
        }

        try {
          _editorScrollController.dispose();
        } catch (e) {
          debugPrint('[NoteEditor] Error disposing scroll controller: $e');
        }

        // Create new FocusNode and ScrollController
        _contentFocusNode = FocusNode();
        _editorScrollController = ScrollController();

        // Create new controller with content
        if (_isHtmlContent(content)) {
          debugPrint('[NoteEditor] Content is HTML, attempting conversion...');
          try {
            // Simplify HTML before conversion to avoid complex nested structures
            final simplifiedHtml = _simplifyHtmlForEditor(content);
            debugPrint('[NoteEditor] Simplified HTML length: ${simplifiedHtml.length}');

            final delta = HtmlToDelta().convert(simplifiedHtml);
            final docLength = delta.length;
            final safeOffset = cursorOffset.clamp(0, docLength > 0 ? docLength - 1 : 0);
            _quillController = QuillController(
              document: Document.fromDelta(delta),
              selection: TextSelection.collapsed(offset: safeOffset),
            );
            debugPrint('[NoteEditor] HTML converted successfully, doc length: $docLength');
          } catch (e, stackTrace) {
            debugPrint('[NoteEditor] Failed to convert HTML: $e');
            debugPrint('[NoteEditor] Stack trace: $stackTrace');
            // Fallback to plain text if HTML conversion fails
            _quillController = QuillController.basic();
            final plainText = _stripHtmlTags(content);
            if (plainText.isNotEmpty) {
              _quillController.document.insert(0, plainText);
            }
            debugPrint('[NoteEditor] Fallback to plain text, length: ${plainText.length}');
          }
        } else if (content.isNotEmpty) {
          _quillController = QuillController.basic();
          _quillController.document.insert(0, content);
        } else {
          _quillController = QuillController.basic();
        }

        // Add listener to new controller
        _quillController.addListener(_onDataChanged);

        // Increment key to force complete widget tree recreation
        _quillEditorKey++;
        debugPrint('[NoteEditor] Editor key incremented to: $_quillEditorKey');

        // Show the editor again after another delay to ensure clean state
        // Increased delay to allow widget tree to fully update
        Future.delayed(const Duration(milliseconds: 200), () {
          if (mounted) {
            setState(() {
              _isEditorReady = true;
            });
            debugPrint('[NoteEditor] Editor ready set to true');
          }
        });
      } catch (e, stackTrace) {
        debugPrint('[NoteEditor] Critical error in _recreateEditorWithContent: $e');
        debugPrint('[NoteEditor] Stack trace: $stackTrace');
        // Emergency fallback - create a basic controller
        _contentFocusNode = FocusNode();
        _editorScrollController = ScrollController();
        _quillController = QuillController.basic();
        _quillController.addListener(_onDataChanged);
        _quillEditorKey++;

        Future.delayed(const Duration(milliseconds: 200), () {
          if (mounted) {
            setState(() {
              _isEditorReady = true;
            });
          }
        });
      }
    });
  }

  /// Maximum content length to avoid editor performance issues
  static const int _maxEditorContentLength = 50000;

  /// Simplify HTML content to remove complex elements that cause issues with HtmlToDelta
  /// This is an aggressive cleanup for imported web content
  String _simplifyHtmlForEditor(String html) {
    debugPrint('[NoteEditor] _simplifyHtmlForEditor input length: ${html.length}');

    // If content is too large, extract just the plain text
    if (html.length > _maxEditorContentLength * 2) {
      debugPrint('[NoteEditor] Content too large, falling back to plain text extraction');
      return _extractPlainTextFromHtml(html);
    }

    String simplified = html;

    try {
      // PHASE 1: Remove entire problematic sections first (before they cause regex issues)
      // Remove the entire references/citations sections (common in Wikipedia)
      simplified = simplified
          .replaceAll(RegExp(r'<h2[^>]*>\s*References?\s*</h2>[\s\S]*?(?=<h2|$)', caseSensitive: false), '')
          .replaceAll(RegExp(r'<h2[^>]*>\s*External links?\s*</h2>[\s\S]*?(?=<h2|$)', caseSensitive: false), '')
          .replaceAll(RegExp(r'<h2[^>]*>\s*See also\s*</h2>[\s\S]*?(?=<h2|$)', caseSensitive: false), '')
          .replaceAll(RegExp(r'<h2[^>]*>\s*Notes?\s*</h2>[\s\S]*?(?=<h2|$)', caseSensitive: false), '')
          .replaceAll(RegExp(r'<h2[^>]*>\s*Further reading\s*</h2>[\s\S]*?(?=<h2|$)', caseSensitive: false), '');

      // Remove ordered lists that look like reference lists (have cite elements)
      simplified = simplified.replaceAll(RegExp(r'<ol[^>]*>[\s\S]*?<cite[\s\S]*?</ol>', caseSensitive: false), '');

      // PHASE 2: Remove script, style, and metadata
      simplified = simplified
          .replaceAll(RegExp(r'<script[^>]*>[\s\S]*?</script>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<style[^>]*>[\s\S]*?</style>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<noscript[^>]*>[\s\S]*?</noscript>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<!--[\s\S]*?-->', caseSensitive: false), '');

      // PHASE 3: Remove COinS metadata spans (Wikipedia bibliographic data)
      // These have title attributes with encoded bibliographic info
      simplified = simplified.replaceAll(RegExp(r'<span[^>]*title="ctx_ver=[^"]*"[^>]*>[\s\S]*?</span>', caseSensitive: false), '');
      simplified = simplified.replaceAll(RegExp(r'<span[^>]*title="[^"]*rft[^"]*"[^>]*>[\s\S]*?</span>', caseSensitive: false), '');

      // PHASE 4: Remove all cite elements (bibliographic citations)
      simplified = simplified.replaceAll(RegExp(r'<cite[^>]*>[\s\S]*?</cite>', caseSensitive: false), '');

      // PHASE 5: Remove sup elements (superscripts, often used for references)
      simplified = simplified.replaceAll(RegExp(r'<sup[^>]*>[\s\S]*?</sup>', caseSensitive: false), '');

      // PHASE 6: Remove complex structural elements
      simplified = simplified
          .replaceAll(RegExp(r'<svg[^>]*>[\s\S]*?</svg>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<table[^>]*>[\s\S]*?</table>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<nav[^>]*>[\s\S]*?</nav>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<aside[^>]*>[\s\S]*?</aside>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<footer[^>]*>[\s\S]*?</footer>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<header[^>]*>[\s\S]*?</header>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<iframe[^>]*>[\s\S]*?</iframe>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<form[^>]*>[\s\S]*?</form>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<input[^>]*/?>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<button[^>]*>[\s\S]*?</button>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<figure[^>]*>[\s\S]*?</figure>', caseSensitive: false), '');

      // PHASE 7: Remove all span elements (they often have complex attributes)
      // Keep the text content but remove the span tags
      for (int i = 0; i < 3; i++) {
        simplified = simplified.replaceAllMapped(
          RegExp(r'<span[^>]*>([\s\S]*?)</span>', caseSensitive: false),
          (match) => match.group(1) ?? '',
        );
      }

      // PHASE 8: Simplify divs to paragraphs
      simplified = simplified
          .replaceAll(RegExp(r'<div[^>]*>', caseSensitive: false), '<p>')
          .replaceAll(RegExp(r'</div>', caseSensitive: false), '</p>');

      // PHASE 9: Remove bracket references like [1], [2], [citation needed], etc.
      simplified = simplified
          .replaceAll(RegExp(r'\[\d+\]'), '')
          .replaceAll(RegExp(r'\[citation needed\]', caseSensitive: false), '')
          .replaceAll(RegExp(r'\[edit\]', caseSensitive: false), '')
          .replaceAll(RegExp(r'\[hide\]', caseSensitive: false), '')
          .replaceAll(RegExp(r'\[show\]', caseSensitive: false), '');

      // PHASE 10: Remove all attributes except href on links and src/alt on images
      // First, clean links to only have href
      simplified = simplified.replaceAllMapped(
        RegExp(r'<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>', caseSensitive: false),
        (match) => '<a href="${match.group(1)}">${match.group(2)}</a>',
      );

      // Clean images to only have src and alt
      simplified = simplified.replaceAllMapped(
        RegExp(r'<img\s+[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*/?>', caseSensitive: false),
        (match) => '<img src="${match.group(1)}" alt="${match.group(2)}">',
      );
      simplified = simplified.replaceAllMapped(
        RegExp(r'<img\s+[^>]*src="([^"]*)"[^>]*/?>', caseSensitive: false),
        (match) => '<img src="${match.group(1)}" alt="image">',
      );

      // PHASE 11: Clean up other elements by removing all attributes
      simplified = simplified
          .replaceAll(RegExp(r'\s+class="[^"]*"', caseSensitive: false), '')
          .replaceAll(RegExp(r'\s+id="[^"]*"', caseSensitive: false), '')
          .replaceAll(RegExp(r'\s+style="[^"]*"', caseSensitive: false), '')
          .replaceAll(RegExp(r'\s+data-[a-z0-9-]+="[^"]*"', caseSensitive: false), '')
          .replaceAll(RegExp(r'\s+aria-[a-z0-9-]+="[^"]*"', caseSensitive: false), '')
          .replaceAll(RegExp(r'\s+title="[^"]*"', caseSensitive: false), '')
          .replaceAll(RegExp(r'\s+role="[^"]*"', caseSensitive: false), '')
          .replaceAll(RegExp(r'\s+target="[^"]*"', caseSensitive: false), '');

      // PHASE 12: Clean up empty elements and excessive whitespace
      simplified = simplified
          .replaceAll(RegExp(r'<p>\s*</p>'), '')
          .replaceAll(RegExp(r'<li>\s*</li>'), '')
          .replaceAll(RegExp(r'<ul>\s*</ul>'), '')
          .replaceAll(RegExp(r'<ol>\s*</ol>'), '')
          .replaceAll(RegExp(r'\n\s*\n\s*\n+'), '\n\n')
          .replaceAll(RegExp(r'>\s+<'), '><');

      // PHASE 13: Limit content size if still too large
      if (simplified.length > _maxEditorContentLength) {
        debugPrint('[NoteEditor] Simplified content still too large (${simplified.length}), truncating');
        // Find a good break point (end of paragraph)
        int cutoff = _maxEditorContentLength;
        final paragraphEnd = simplified.lastIndexOf('</p>', cutoff);
        if (paragraphEnd > _maxEditorContentLength / 2) {
          cutoff = paragraphEnd + 4; // Include the </p>
        }
        simplified = simplified.substring(0, cutoff);
        simplified += '<p><em>[Content truncated for display]</em></p>';
      }

      debugPrint('[NoteEditor] _simplifyHtmlForEditor output length: ${simplified.length}');
      return simplified.trim();
    } catch (e, stackTrace) {
      debugPrint('[NoteEditor] Error in _simplifyHtmlForEditor: $e');
      debugPrint('[NoteEditor] Stack trace: $stackTrace');
      // Fallback to plain text extraction
      return _extractPlainTextFromHtml(html);
    }
  }

  /// Extract plain text from HTML as a last resort fallback
  String _extractPlainTextFromHtml(String html) {
    try {
      String text = html
          // Convert block elements to newlines
          .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
          .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
          .replaceAll(RegExp(r'</div>', caseSensitive: false), '\n')
          .replaceAll(RegExp(r'</h[1-6]>', caseSensitive: false), '\n\n')
          .replaceAll(RegExp(r'</li>', caseSensitive: false), '\n')
          // Remove all HTML tags
          .replaceAll(RegExp(r'<[^>]+>'), '')
          // Decode common HTML entities
          .replaceAll('&nbsp;', ' ')
          .replaceAll('&amp;', '&')
          .replaceAll('&lt;', '<')
          .replaceAll('&gt;', '>')
          .replaceAll('&quot;', '"')
          .replaceAll('&#39;', "'")
          // Clean up whitespace
          .replaceAll(RegExp(r'\n\s*\n\s*\n+'), '\n\n')
          .trim();

      // Limit size
      if (text.length > _maxEditorContentLength) {
        text = text.substring(0, _maxEditorContentLength);
        text += '\n\n[Content truncated for display]';
      }

      debugPrint('[NoteEditor] Extracted plain text length: ${text.length}');
      return text;
    } catch (e) {
      debugPrint('[NoteEditor] Error extracting plain text: $e');
      return 'Error loading content. Please try again.';
    }
  }

  /// Initialize real-time collaboration service and join the note session
  Future<void> _initializeCollaboration() async {
    try {
      // Get workspace ID from service or fallback to default
      String? workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null || workspaceId.isEmpty) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      final currentUser = AuthService.instance.currentUser;
      final userId = currentUser?.id ?? await AppConfig.getCurrentUserId();
      final userName = currentUser?.name ?? 'User';

      if (workspaceId == null || workspaceId.isEmpty) {
        debugPrint('[NoteEditor] Cannot initialize collaboration: missing workspaceId');
        return;
      }

      if (userId == null) {
        debugPrint('[NoteEditor] Cannot initialize collaboration: missing userId');
        return;
      }

      debugPrint('[NoteEditor] Initializing collaboration with workspaceId: $workspaceId');

      // Use the note ID directly from the widget
      _currentNoteApiId = widget.note!.id;

      if (_currentNoteApiId == null || _currentNoteApiId!.isEmpty) {
        debugPrint('[NoteEditor] Note ID is missing for collaboration');
        return;
      }

      // Initialize the collaboration service
      await _collaborationService.initialize(
        workspaceId: workspaceId,
        userId: userId,
        userName: userName,
      );

      // Subscribe to collaboration events
      // Use post-frame callback to prevent setState during build phase
      _usersSubscription = _collaborationService.usersStream.listen((users) {
        if (mounted) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _collaborators = users;
              });
            }
          });
        }
      });

      _userJoinedSubscription = _collaborationService.userJoinedStream.listen((user) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.person_add, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Text('${user.name} joined'),
                ],
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      });

      _userLeftSubscription = _collaborationService.userLeftStream.listen((userId) {
        // User left notification is handled by the usersStream update
      });

      _cursorSubscription = _collaborationService.cursorStream.listen((cursor) {
        // Handle cursor updates for collaborator cursors
        debugPrint('[NoteEditor] Cursor update from ${cursor.userName} at index ${cursor.index}');

        // Update the collaborator's cursor position in our local list
        // Use post-frame callback to prevent setState during build phase
        if (mounted) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                // Find and update the collaborator with the new cursor position
                final index = _collaborators.indexWhere((c) => c.id == cursor.userId);
                if (index >= 0) {
                  _collaborators[index] = _collaborators[index].copyWith(
                    cursorIndex: cursor.index,
                    selectionLength: cursor.length,
                  );
                } else {
                  // Add new collaborator from cursor data
                  _collaborators.add(CollaborationUser(
                    id: cursor.userId,
                    name: cursor.userName,
                    color: cursor.userColor,
                    cursorIndex: cursor.index,
                    selectionLength: cursor.length,
                    joinedAt: DateTime.now(),
                  ));
                }
              });
            }
          });
        }
      });

      // Listen for remote content updates (when other users edit the note)
      _contentUpdateSubscription = _collaborationService.contentUpdateStream.listen((update) {
        debugPrint('[NoteEditor] Remote content update from ${update.userName}');
        _handleRemoteContentUpdate(update);
      });

      // Listen for real-time delta updates (character-by-character sync)
      _deltaUpdateSubscription = _collaborationService.deltaUpdateStream.listen((deltaUpdate) {
        debugPrint('[NoteEditor] Real-time delta from ${deltaUpdate.userName}');
        _applyRemoteDelta(deltaUpdate);
      });

      // Listen for full sync data (when joining or reconnecting)
      _fullSyncSubscription = _collaborationService.fullSyncStream.listen((syncData) {
        debugPrint('[NoteEditor] Full sync from ${syncData.senderName}');
        _applyFullSync(syncData);
      });

      // Listen for sync requests (respond with our current content)
      _syncRequestSubscription = _collaborationService.syncRequestStream.listen((request) {
        debugPrint('[NoteEditor] Sync request from ${request['requesterName']}');
        _handleSyncRequest(request);
      });

      // Set up document change listener for real-time delta sync
      _setupDocumentChangeListener();

      // Listen for connection status and join/rejoin when connected
      // Don't cancel the subscription - keep listening for reconnections
      _connectionSubscription = _collaborationService.connectionStream.listen((connected) async {
        if (connected && _currentNoteApiId != null && mounted) {
          debugPrint('[NoteEditor] Connection established, joining note...');
          final joined = await _collaborationService.joinNote(_currentNoteApiId!);
          if (mounted) {
            // Use post-frame callback to prevent setState during build phase
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                setState(() {
                  _isCollaborationEnabled = joined;
                });
              }
            });
          }
          if (joined) {
            debugPrint('[NoteEditor] Successfully joined collaboration session');
          } else {
            debugPrint('[NoteEditor] Failed to join collaboration session');
          }
        } else if (!connected && mounted) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _isCollaborationEnabled = false;
              });
            }
          });
        }
      });

      // Also try to join immediately if already connected
      if (_collaborationService.isConnected) {
        final joined = await _collaborationService.joinNote(_currentNoteApiId!);
        if (mounted) {
          // Use post-frame callback to prevent setState during build phase
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _isCollaborationEnabled = joined;
              });
            }
          });
        }
        if (joined) {
          debugPrint('[NoteEditor] Successfully joined collaboration session (immediate)');
        }
      }

    } catch (e) {
      debugPrint('[NoteEditor] Error initializing collaboration: $e');
    }
  }

  /// Update cursor position for collaboration
  void _updateCollaboratorCursor() {
    if (!_isCollaborationEnabled) return;

    final selection = _quillController.selection;
    if (selection.isValid) {
      _collaborationService.updateCursor(
        selection.baseOffset,
        length: selection.extentOffset - selection.baseOffset,
      );
    }
  }

  /// Handle remote content update - fetch latest content and update editor
  void _handleRemoteContentUpdate(RemoteContentUpdate update) {
    // Debounce rapid updates (wait 500ms after last update before refreshing)
    _contentRefreshDebounce?.cancel();
    _contentRefreshDebounce = Timer(const Duration(milliseconds: 500), () {
      _refreshContentFromApi(update.userName);
    });
  }

  /// Fetch latest content from API and update the editor
  Future<void> _refreshContentFromApi(String updatedByName) async {
    if (_isRefreshingContent || !mounted) return;

    setState(() {
      _isRefreshingContent = true;
    });

    try {
      String? workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null || workspaceId.isEmpty) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || _currentNoteApiId == null) {
        debugPrint('[NoteEditor] Cannot refresh: missing workspaceId or noteId');
        return;
      }

      debugPrint('[NoteEditor] Fetching latest content from API...');
      final response = await _notesApiService.getNote(workspaceId, _currentNoteApiId!);

      if (response.isSuccess && response.data != null && mounted) {
        final apiNote = response.data!;
        final newContent = apiNote.content ?? '';
        final newTitle = apiNote.title;

        // Store current cursor position
        final currentSelection = _quillController.selection;
        final currentCursorOffset = currentSelection.isValid
            ? currentSelection.baseOffset
            : 0;

        // Check if content actually changed
        final currentContent = _getHtmlContent();
        if (currentContent == newContent && _titleController.text == newTitle) {
          debugPrint('[NoteEditor] Content unchanged, skipping update');
          return;
        }

        // Update title if changed (remove listener first to avoid triggering _onDataChanged)
        if (_titleController.text != newTitle) {
          _titleController.removeListener(_onDataChanged);
          _titleController.text = newTitle;
          _titleController.addListener(_onDataChanged);
        }

        // Recreate all editor resources to avoid GlobalKey conflicts
        if (newContent.isNotEmpty) {
          _recreateEditorWithContent(newContent, cursorOffset: currentCursorOffset);
        }

        // Reset modified flag since we just synced
        _isModified = false;

        // Show notification
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.sync, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '$updatedByName made changes',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              backgroundColor: Colors.blue,
              duration: const Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }

        debugPrint('[NoteEditor] Content refreshed successfully');
      }
    } catch (e) {
      debugPrint('[NoteEditor] Error refreshing content: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshingContent = false;
        });
      }
    }
  }

  /// Get current content as HTML
  String _getHtmlContent() {
    final delta = _quillController.document.toDelta();
    final converter = QuillDeltaToHtmlConverter(
      delta.toJson(),
      ConverterOptions(),
    );
    return converter.convert();
  }

  /// Send real-time delta to other collaborators
  /// Uses debouncing to batch rapid changes
  void _sendRealTimeDelta() {
    _deltaSendDebounce?.cancel();
    _deltaSendDebounce = Timer(const Duration(milliseconds: 100), () {
      if (!_isCollaborationEnabled || _isApplyingRemoteDelta) return;

      try {
        // Get current document as delta JSON
        final delta = _quillController.document.toDelta();
        final deltaJson = delta.toJson();

        // Check if content actually changed
        final currentContent = deltaJson.toString();
        if (_lastSentContent == currentContent) {
          debugPrint('[NoteEditor] Content unchanged, skipping delta send');
          return;
        }
        _lastSentContent = currentContent;

        debugPrint('[NoteEditor] Sending full document delta: ${deltaJson.length} operations');

        // Send the full document delta
        // The receiver will replace their content with this
        _collaborationService.sendDelta(deltaJson, fullContent: _getHtmlContent());
      } catch (e) {
        debugPrint('[NoteEditor] Error sending delta: $e');
      }
    });
  }

  /// Set up document change listener for real-time delta sync (backup method)
  void _setupDocumentChangeListener() {
    // The main delta sending is now done in _onDataChanged
    // This is kept as a backup for the document.changes stream
    _documentChangesSubscription?.cancel();
  }

  /// Auto-save note content to database with debouncing
  /// This enables real-time sync by saving to API and notifying collaborators
  void _autoSaveToDatabase() {
    // Only auto-save for existing notes (not new notes being created)
    if (widget.note == null || _currentNoteApiId == null) return;

    // Don't auto-save if we're applying remote changes (to prevent loops)
    if (_isApplyingRemoteDelta || _isRefreshingContent) return;

    // Cancel any pending auto-save
    _autoSaveDebounce?.cancel();

    // Debounce auto-save to 1.5 seconds after last edit
    _autoSaveDebounce = Timer(const Duration(milliseconds: 1500), () async {
      if (_isAutoSaving || !mounted) return;

      // Don't save if title is empty
      final title = _titleController.text.trim();
      if (title.isEmpty) return;

      _isAutoSaving = true;

      try {
        // Convert Quill Delta to HTML
        final delta = _quillController.document.toDelta();

        // Create custom inline styles for color handling
        final inlineStyles = InlineStyles({
          'color': InlineStyleType(fn: (value, _) {
            String cssColor = value;
            if (value.startsWith('#') && value.length == 9) {
              cssColor = '#${value.substring(3)}';
            }
            return 'color:$cssColor';
          }),
          'background': InlineStyleType(fn: (value, _) {
            String cssBgColor = value;
            if (value.startsWith('#') && value.length == 9) {
              cssBgColor = '#${value.substring(3)}';
            }
            return 'background-color:$cssBgColor';
          }),
          'font': InlineStyleType(fn: (value, _) => 'font-family:$value'),
          'size': InlineStyleType(map: {
            'small': 'font-size: 0.75em',
            'large': 'font-size: 1.5em',
            'huge': 'font-size: 2.5em',
          }),
        });

        final converter = QuillDeltaToHtmlConverter(
          delta.toJson(),
          ConverterOptions(
            converterOptions: OpConverterOptions(
              inlineStyles: inlineStyles,
            ),
          ),
        );
        final htmlContent = converter.convert();

        // Get workspace ID
        String? workspaceId = _workspaceService.currentWorkspace?.id;
        if (workspaceId == null || workspaceId.isEmpty) {
          workspaceId = EnvConfig.defaultWorkspaceId;
        }

        if (workspaceId == null || workspaceId.isEmpty) {
          debugPrint('[NoteEditor] Auto-save failed: No workspace ID');
          return;
        }

        // Update note via API
        final updateNoteDto = api.UpdateNoteDto(
          title: title,
          content: htmlContent,
          tags: [],
        );

        final response = await _notesApiService.updateNote(
          workspaceId,
          _currentNoteApiId!,
          updateNoteDto,
        );

        if (response.isSuccess) {
          debugPrint('[NoteEditor] Auto-save successful');

          // Reset modified flag since we just saved
          if (mounted) {
            setState(() {
              _isModified = false;
            });
          }

          // Notify other collaborators that content has been updated
          // They will fetch the latest content from the API
          if (_isCollaborationEnabled) {
            _collaborationService.notifyContentUpdate();
            debugPrint('[NoteEditor] Notified collaborators of auto-save');
          }
        } else {
          debugPrint('[NoteEditor] Auto-save failed: ${response.message}');
        }
      } catch (e) {
        debugPrint('[NoteEditor] Auto-save error: $e');
      } finally {
        _isAutoSaving = false;
      }
    });
  }

  /// Apply a remote delta update to the editor
  /// Uses safe disposal pattern: hide editor -> wait for unmount -> dispose -> create -> show
  void _applyRemoteDelta(RemoteDeltaUpdate deltaUpdate) {
    if (!mounted) return;

    // Set flag to prevent echo
    _isApplyingRemoteDelta = true;

    // Store current selection before hiding the editor
    final currentSelection = _quillController.selection;
    final currentCursorOffset = currentSelection.isValid ? currentSelection.baseOffset : 0;

    debugPrint('[NoteEditor] Applying remote delta from ${deltaUpdate.userName}, ${deltaUpdate.delta.length} ops');

    // First, hide the editor to remove QuillEditor from widget tree
    setState(() {
      _isEditorReady = false;
    });

    // Use Future.delayed to ensure the widget tree is fully updated and
    // the old QuillEditor is completely unmounted before disposing resources.
    Future.delayed(const Duration(milliseconds: 50), () {
      if (!mounted) {
        _isApplyingRemoteDelta = false;
        return;
      }

      try {
        // Dispose all old resources
        _quillController.removeListener(_onDataChanged);
        _quillController.dispose();
        _contentFocusNode.dispose();
        _editorScrollController.dispose();

        // Create new FocusNode and ScrollController
        _contentFocusNode = FocusNode();
        _editorScrollController = ScrollController();

        // Convert the delta JSON to a Delta object and create new controller
        final remoteDelta = Delta.fromJson(deltaUpdate.delta);
        final docLength = remoteDelta.length;
        final safeOffset = currentCursorOffset.clamp(0, docLength > 0 ? docLength - 1 : 0);

        _quillController = QuillController(
          document: Document.fromDelta(remoteDelta),
          selection: TextSelection.collapsed(offset: safeOffset),
        );

        // Add listener to new controller
        _quillController.addListener(_onDataChanged);

        // Update last sent content to avoid echoing back
        _lastSentContent = deltaUpdate.delta.toString();

        // Increment key to force widget recreation
        _quillEditorKey++;

        debugPrint('[NoteEditor] Applied remote delta successfully');

        // Show the editor again after another short delay to ensure clean state
        Future.delayed(const Duration(milliseconds: 50), () {
          if (mounted) {
            setState(() {
              _isEditorReady = true;
            });
          }
          // Reset flag after showing editor
          Future.delayed(const Duration(milliseconds: 100), () {
            _isApplyingRemoteDelta = false;
          });
        });
      } catch (e) {
        debugPrint('[NoteEditor] Error applying remote delta: $e');
        _isApplyingRemoteDelta = false;

        // Fallback: if delta application fails, try full content sync
        if (deltaUpdate.fullContent != null) {
          debugPrint('[NoteEditor] Falling back to full content sync');
          _applyFullContentSync(deltaUpdate.fullContent!);
        } else {
          // Re-show editor if no fallback available
          if (mounted) {
            setState(() {
              _isEditorReady = true;
            });
          }
        }
      }
    });
  }

  /// Apply full sync data received from another collaborator
  void _applyFullSync(FullSyncData syncData) {
    if (!mounted) return;

    // Only apply if this sync is targeted at us or is a broadcast
    _applyFullContentSync(syncData.content, title: syncData.title);

    debugPrint('[NoteEditor] Applied full sync from ${syncData.senderName}');
  }

  /// Apply full content synchronization
  void _applyFullContentSync(String content, {String? title}) {
    if (!mounted) return;

    try {
      _isApplyingRemoteDelta = true;

      // Store current cursor position
      final currentSelection = _quillController.selection;
      final currentCursorOffset = currentSelection.isValid ? currentSelection.baseOffset : 0;

      // Update title if provided (remove listener first to avoid triggering _onDataChanged)
      if (title != null && _titleController.text != title) {
        _titleController.removeListener(_onDataChanged);
        _titleController.text = title;
        _titleController.addListener(_onDataChanged);
      }

      // Recreate all editor resources to avoid GlobalKey conflicts
      if (content.isNotEmpty) {
        _recreateEditorWithContent(content, cursorOffset: currentCursorOffset);
      }
    } finally {
      Future.delayed(const Duration(milliseconds: 100), () {
        _isApplyingRemoteDelta = false;
      });
    }
  }

  /// Handle sync request from another collaborator
  void _handleSyncRequest(Map<String, dynamic> request) {
    if (!mounted || !_isCollaborationEnabled) return;

    final requesterId = request['requesterId'] as String?;
    if (requesterId == null) return;

    // Send our current content as a response
    final content = _getHtmlContent();
    final title = _titleController.text;

    _collaborationService.sendSyncResponse(requesterId, content, title: title);
    debugPrint('[NoteEditor] Sent sync response to $requesterId');
  }

  /// Load existing attachments from API for the note being edited
  Future<void> _loadExistingAttachments() async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null || widget.note == null) return;

      final response = await _notesApiService.getNote(workspaceId, widget.note!.id);
      if (response.isSuccess && response.data != null) {
        final attachments = response.data!.attachments;
        if (attachments != null) {
          final List<Map<String, dynamic>> loadedItems = [];

          // Load note attachments
          final noteAttachments = attachments['note_attachment'];
          if (noteAttachments != null && noteAttachments is List) {
            for (final item in noteAttachments) {
              if (item is Map<String, dynamic>) {
                loadedItems.add({
                  'id': item['id'] ?? '',
                  'name': item['title'] ?? item['name'] ?? 'notes_editor.untitled_note'.tr(),
                  'type': 'note',
                  'icon': item['icon'],
                  'updated_at': item['updated_at'],
                });
              } else if (item is String) {
                // Just ID - fetch note details
                try {
                  final noteResponse = await _notesApiService.getNote(workspaceId, item);
                  if (noteResponse.isSuccess && noteResponse.data != null) {
                    loadedItems.add({
                      'id': item,
                      'name': noteResponse.data!.title,
                      'type': 'note',
                    });
                  }
                } catch (e) {
                  loadedItems.add({
                    'id': item,
                    'name': 'Note',
                    'type': 'note',
                  });
                }
              }
            }
          }

          // Load event attachments
          final eventAttachments = attachments['event_attachment'];
          if (eventAttachments != null && eventAttachments is List) {
            for (final item in eventAttachments) {
              if (item is Map<String, dynamic>) {
                loadedItems.add({
                  'id': item['id'] ?? '',
                  'name': item['title'] ?? item['name'] ?? 'notes_editor.untitled_event'.tr(),
                  'type': 'event',
                  'start_time': item['start_time'],
                  'end_time': item['end_time'],
                  'location': item['location'],
                });
              } else if (item is String) {
                // Just ID - fetch event details
                try {
                  final calendarApi = calendar_api.CalendarApiService();
                  final eventResponse = await calendarApi.getEvent(workspaceId, item);
                  if (eventResponse.isSuccess && eventResponse.data != null) {
                    loadedItems.add({
                      'id': item,
                      'name': eventResponse.data!.title,
                      'type': 'event',
                      'start_time': eventResponse.data!.startTime.toIso8601String(),
                      'end_time': eventResponse.data!.endTime.toIso8601String(),
                    });
                  }
                } catch (e) {
                  loadedItems.add({
                    'id': item,
                    'name': 'Event',
                    'type': 'event',
                  });
                }
              }
            }
          }

          // Load file attachments
          final fileAttachments = attachments['file_attachment'];
          if (fileAttachments != null && fileAttachments is List) {
            for (final item in fileAttachments) {
              if (item is Map<String, dynamic>) {
                loadedItems.add({
                  'id': item['id'] ?? '',
                  'name': item['name'] ?? 'notes_editor.untitled_file'.tr(),
                  'type': 'file',
                  'size': item['size']?.toString(),
                  'mime_type': item['type'] ?? item['mime_type'],
                  'url': item['url'],
                });
              } else if (item is String) {
                // Just ID or URL
                loadedItems.add({
                  'id': item,
                  'name': 'File',
                  'type': 'file',
                });
              }
            }
          }

          if (loadedItems.isNotEmpty && mounted) {
            setState(() {
              _linkedItems = loadedItems;
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading existing attachments: $e');
    }
  }

  @override
  void dispose() {
    // Clean up collaboration
    _usersSubscription?.cancel();
    _cursorSubscription?.cancel();
    _userJoinedSubscription?.cancel();
    _userLeftSubscription?.cancel();
    _connectionSubscription?.cancel();
    _contentUpdateSubscription?.cancel();
    _deltaUpdateSubscription?.cancel();
    _fullSyncSubscription?.cancel();
    _syncRequestSubscription?.cancel();
    _documentChangesSubscription?.cancel();
    _contentRefreshDebounce?.cancel();
    _deltaSendDebounce?.cancel();
    _autoSaveDebounce?.cancel();
    if (_isCollaborationEnabled) {
      _collaborationService.leaveNote();
    }

    _titleController.dispose();
    _quillController.dispose();
    _titleFocusNode.dispose();
    _contentFocusNode.dispose();
    _editorScrollController.dispose();
    super.dispose();
  }

  void _onDataChanged() {
    if (!_isModified) {
      setState(() {
        _isModified = true;
      });
    }

    // Update cursor position for collaboration
    _updateCollaboratorCursor();

    // Send real-time delta updates if collaboration is enabled
    if (_isCollaborationEnabled && !_isApplyingRemoteDelta) {
      _sendRealTimeDelta();
    }

    // Auto-save to database for existing notes (enables real-time collaboration)
    // This saves the content to the API and notifies other collaborators
    if (!_isApplyingRemoteDelta && !_isRefreshingContent) {
      _autoSaveToDatabase();
    }

    // Check if we should show AI improvement option
    final content = _quillController.document.toPlainText().trim();
    final title = _titleController.text.trim();
    final shouldShowAI = content.isNotEmpty || (_mode == NoteEditorMode.edit && title.isNotEmpty);

    if (_showAIImprovement != shouldShowAI) {
      setState(() {
        _showAIImprovement = shouldShowAI;
      });
    }

    // Check for / mention trigger in Quill editor
    final plainText = _quillController.document.toPlainText();
    final cursorPos = _quillController.selection.baseOffset;

    if (cursorPos > 0 && cursorPos <= plainText.length) {
      final charBeforeCursor = plainText[cursorPos - 1];
      if (charBeforeCursor == '/') {
        // Store slash position and show attachment picker bottom sheet
        _slashSymbolPosition = cursorPos - 1;
        _showAttachmentPicker();
      }
    }

    // Trigger rebuild for title changes in new notes
    if (widget.note == null) {
      setState(() {});
    }
  }

  bool get _canSave {
    if (widget.note == null) {
      // For new notes, allow saving if there's a title
      return _titleController.text.trim().isNotEmpty;
    } else {
      // For existing notes, require modifications
      return _titleController.text.trim().isNotEmpty && _isModified;
    }
  }


  Future<void> _saveNote() async {
    if (!_canSave || _isSaving) return;

    setState(() {
      _isSaving = true;
    });

    try {
      // Convert Quill Delta to HTML to preserve formatting including colors
      final delta = _quillController.document.toDelta();

      // Debug: Print the Delta JSON to see if colors are present

      // Create custom inline styles that handle color attributes
      final inlineStyles = InlineStyles({
        'color': InlineStyleType(fn: (value, _) {
          // Convert Flutter color format (#AARRGGBB) to CSS format (#RRGGBB)
          String cssColor = value;
          if (value.startsWith('#') && value.length == 9) {
            cssColor = '#${value.substring(3)}'; // Remove alpha channel
          }
          return 'color:$cssColor';
        }),
        'background': InlineStyleType(fn: (value, _) {
          // Convert Flutter color format (#AARRGGBB) to CSS format (#RRGGBB)
          String cssBgColor = value;
          if (value.startsWith('#') && value.length == 9) {
            cssBgColor = '#${value.substring(3)}'; // Remove alpha channel
          }
          return 'background-color:$cssBgColor';
        }),
        // Include default font styles
        'font': InlineStyleType(fn: (value, _) => 'font-family:$value'),
        'size': InlineStyleType(map: {
          'small': 'font-size: 0.75em',
          'large': 'font-size: 1.5em',
          'huge': 'font-size: 2.5em',
        }),
      });

      // Custom conversion with proper color handling
      final converter = QuillDeltaToHtmlConverter(
        delta.toJson(),
        ConverterOptions(
          converterOptions: OpConverterOptions(
            inlineStyles: inlineStyles, // Use custom inline styles
          ),
        ),
      );
      final htmlContent = converter.convert();

      // Debug: Print the HTML to verify colors are included

      // Also get plain text for description
      final plainText = _quillController.document.toPlainText().trim();
      final description = plainText.length > 100 ? plainText.substring(0, 100) : plainText;

      // Get workspace ID
      String? workspaceId = _workspaceService.currentWorkspace?.id;

      // Fallback to default workspace ID from environment
      if (workspaceId == null || workspaceId.isEmpty) {
        workspaceId = EnvConfig.defaultWorkspaceId;
      }

      if (workspaceId == null || workspaceId.isEmpty) {
        throw Exception('No workspace ID available');
      }

      if (widget.note == null) {
        // Create new note via REST API

        // Format linked items - send only UUIDs to API (backend requires UUID strings)
        // Note: _linkedItems keeps full data for local use (exporting, sharing preview)
        Map<String, dynamic>? attachments;
        if (_linkedItems.isNotEmpty) {
          final noteAttachments = <String>[];
          final eventAttachments = <String>[];
          final fileAttachments = <String>[];

          for (final item in _linkedItems) {
            final itemId = item['id']?.toString() ?? '';
            if (itemId.isEmpty) continue;

            switch (item['type']) {
              case 'note':
                noteAttachments.add(itemId);
                break;
              case 'event':
                eventAttachments.add(itemId);
                break;
              case 'file':
                fileAttachments.add(itemId);
                break;
            }
          }

          attachments = {
            'note_attachment': noteAttachments,
            'event_attachment': eventAttachments,
            'file_attachment': fileAttachments,
          };
        }

        final createNoteDto = api.CreateNoteDto(
          title: _titleController.text.trim(),
          content: htmlContent, // Use HTML content with formatting
          parentId: widget.parentId,
          tags: [],
          isPublic: false,
          attachments: attachments,
        );

        final response = await _notesApiService.createNote(workspaceId, createNoteDto);

        if (response.isSuccess && response.data != null) {

          // Also create in local service for compatibility
          final noteId = await _notesService.createNote(
            title: _titleController.text.trim(),
            description: description,
            content: htmlContent, // Use HTML content with formatting
            icon: _selectedIcon,
            categoryId: 'work',
            subcategory: 'General',
            keywords: [],
            isFavorite: _isFavorite,
            parentId: widget.parentId,
          );

          // Add activity for note creation
          _notesService.addActivity(
            noteId,
            Activity(
              id: 'created_${DateTime.now().millisecondsSinceEpoch}',
              noteId: noteId,
              userId: 'current_user',
              userName: 'You',
              userAvatar: '👤',
              type: ActivityType.created,
              description: 'created this note',
              timestamp: DateTime.now(),
            ),
          );

          if (mounted) {
            setState(() {
              _isSaving = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Note created successfully'),
                backgroundColor: Colors.green,
              ),
            );
            Navigator.pop(context, noteId);
          }
        } else {
          throw Exception(response.message ?? 'Failed to create note');
        }
      } else {
        // Update existing note via REST API

        // We need the note ID from the API - try to find it by title
        // This is a workaround since the local Note class doesn't have the API ID
        final notesResponse = await _notesApiService.getNotes(workspaceId);

        api.Note? apiNote;
        if (notesResponse.isSuccess && notesResponse.data != null) {
          // Find the matching note by title
          apiNote = notesResponse.data!.firstWhere(
            (n) => n.title.toLowerCase().trim() == widget.note!.title.toLowerCase().trim(),
            orElse: () => throw Exception('Note not found in API'),
          );
        }

        if (apiNote != null) {
          // Format linked items - send only UUIDs to API (backend requires UUID strings)
          // Note: _linkedItems keeps full data for local use (exporting, sharing preview)
          Map<String, dynamic>? attachments;
          if (_linkedItems.isNotEmpty) {
            final noteAttachments = <String>[];
            final eventAttachments = <String>[];
            final fileAttachments = <String>[];

            for (final item in _linkedItems) {
              final itemId = item['id']?.toString() ?? '';
              if (itemId.isEmpty) continue;

              switch (item['type']) {
                case 'note':
                  noteAttachments.add(itemId);
                  break;
                case 'event':
                  eventAttachments.add(itemId);
                  break;
                case 'file':
                  fileAttachments.add(itemId);
                  break;
              }
            }

            attachments = {
              'note_attachment': noteAttachments,
              'event_attachment': eventAttachments,
              'file_attachment': fileAttachments,
            };
          }

          final updateNoteDto = api.UpdateNoteDto(
            title: _titleController.text.trim(),
            content: htmlContent, // Use HTML content with formatting
            tags: [],
            attachments: attachments,
          );

          final response = await _notesApiService.updateNote(
            workspaceId,
            apiNote.id,
            updateNoteDto,
          );

          if (response.isSuccess) {

            // Also update in local service for compatibility
            await _notesService.updateNote(
              id: widget.note!.id,
              title: _titleController.text.trim(),
              description: description,
              content: htmlContent, // Use HTML content with formatting
              icon: _selectedIcon,
              categoryId: widget.note!.categoryId,
              subcategory: widget.note!.subcategory,
              keywords: widget.note!.keywords,
            );

            // Determine what type of update was made for better activity description
            String updateType = 'content';
            if (_titleController.text.trim() != widget.note!.title) {
              updateType = 'title';
            } else if (_linkedItems.isNotEmpty) {
              updateType = 'attachments';
            }

            // Add activity for note update
            _notesService.addActivity(
              widget.note!.id,
              Activity(
                id: 'updated_${DateTime.now().millisecondsSinceEpoch}',
                noteId: widget.note!.id,
                userId: 'current_user',
                userName: 'You',
                userAvatar: '👤',
                type: ActivityType.updated,
                description: 'updated this note',
                timestamp: DateTime.now(),
                metadata: {'updateType': updateType},
              ),
            );

            // Notify other collaborators about the update
            if (_isCollaborationEnabled) {
              _collaborationService.notifyContentUpdate();
              debugPrint('[NoteEditor] Notified collaborators of content update');
            }

            if (mounted) {
              setState(() {
                _isSaving = false;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Note updated successfully'),
                  backgroundColor: Colors.green,
                  ),
              );
              Navigator.pop(context);
            }
          } else {
            throw Exception(response.message ?? 'Failed to update note');
          }
        }
      }

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving note: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  void _deleteNote() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('notes_editor.delete_note'.tr()),
        content: Text('notes_editor.delete_note_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              _notesService.deleteNote(widget.note!.id);
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Close note editor
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('notes_editor.note_moved_to_trash'.tr()),
                  backgroundColor: Colors.orange,
                ),
              );
            },
            child: Text('common.delete'.tr(), style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _improveWithAI() {
    final content = _quillController.document.toPlainText().trim();
    final title = _titleController.text.trim();

    if (content.isEmpty && title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes_editor.write_content_first'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      color: Colors.blue,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'notes_editor.improve_using_ai'.tr(),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'notes_editor.ai_analyzing'.tr(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              CircularProgressIndicator(),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.cancel'.tr()),
              ),
            ],
          ),
        ),
      ),
    );

    // Simulate AI processing
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        _showAIImprovements(content);
      }
    });
  }

  void _showAIImprovements(String originalContent) {
    // Get both title and content for AI improvements
    final title = _titleController.text.trim();
    final content = originalContent.trim();
    final combinedText = title.isNotEmpty && content.isNotEmpty 
        ? '$title\n\n$content' 
        : title.isNotEmpty 
            ? title 
            : content;
    
    // Simulate AI improvements
    final improvements = _generateAIImprovements(combinedText);
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      color: Colors.blue,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'notes_editor.ai_improvements'.tr(),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            // Content
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: improvements.length,
                itemBuilder: (context, index) {
                  final improvement = improvements[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                improvement['icon'] as IconData,
                                color: Colors.blue,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  improvement['title'] as String,
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            improvement['description'] as String,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              improvement['content'] as String,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton(
                                onPressed: () {
                                  // Copy to clipboard
                                  Clipboard.setData(ClipboardData(
                                    text: improvement['content'] as String,
                                  ));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('notes_editor.copied_to_clipboard'.tr()),
                                    ),
                                  );
                                },
                                child: Text('common.copy'.tr()),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: () {
                                  _applyAIImprovement(improvement['content'] as String);
                                  Navigator.pop(context);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  foregroundColor: Colors.white,
                                ),
                                child: Text('notes_editor.apply'.tr()),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _generateAIImprovements(String content) {
    return [
      {
        'title': 'notes_editor.grammar_style_title'.tr(),
        'description': 'notes_editor.grammar_style_desc'.tr(),
        'icon': Icons.edit,
        'content': _improveGrammarAndStyle(content),
      },
      {
        'title': 'notes_editor.structure_title'.tr(),
        'description': 'notes_editor.structure_desc'.tr(),
        'icon': Icons.format_list_bulleted,
        'content': _improveStructure(content),
      },
      {
        'title': 'notes_editor.concise_title'.tr(),
        'description': 'notes_editor.concise_desc'.tr(),
        'icon': Icons.compress,
        'content': _makeConcise(content),
      },
      {
        'title': 'notes_editor.professional_title'.tr(),
        'description': 'notes_editor.professional_desc'.tr(),
        'icon': Icons.business,
        'content': _makeProfessional(content),
      },
    ];
  }

  String _improveGrammarAndStyle(String content) {
    // Simple improvements for demo purposes
    return '${content
        .replaceAll(RegExp(r'\s+'), ' ')
        .replaceAll(RegExp(r'\.+'), '.')
        .replaceAll(RegExp(r',+'), ',')
        .trim()}\n\n✨ This version includes improved grammar, better sentence flow, and enhanced readability for a more polished presentation.';
  }

  String _improveStructure(String content) {
    final lines = content.split('\n').where((line) => line.trim().isNotEmpty).toList();
    if (lines.isEmpty) return content;

    final structured = StringBuffer();
    structured.writeln('# ${_titleController.text.isNotEmpty ? _titleController.text : 'Key Points'}');
    structured.writeln();
    
    for (int i = 0; i < lines.length; i++) {
      structured.writeln('• ${lines[i].trim()}');
    }
    
    structured.writeln();
    structured.writeln('---');
    structured.writeln('*Organized for better readability and structure*');
    
    return structured.toString();
  }

  String _makeConcise(String content) {
    final words = content.split(' ');
    final conciseLength = (words.length * 0.7).round();
    
    return '${words.take(conciseLength).join(' ')}\n\n📝 Condensed to essential points while preserving key information.';
  }

  String _makeProfessional(String content) {
    return '${content
        .replaceAll(RegExp(r'\bI think\b', caseSensitive: false), 'It is recommended that')
        .replaceAll(RegExp(r'\bmaybe\b', caseSensitive: false), 'potentially')
        .replaceAll(RegExp(r'\bkinda\b', caseSensitive: false), 'somewhat')
        .replaceAll(RegExp(r'\bgonna\b', caseSensitive: false), 'going to')}\n\n💼 Enhanced with professional language and formal tone for business contexts.';
  }

  /// Sanitizes AI-generated content by removing unwanted formatting artifacts
  /// such as markdown symbols, headers, bullet points, and other formatting
  String _sanitizeAIContent(String content) {
    String cleaned = content;

    // Remove markdown headers (# ## ### etc.)
    cleaned = cleaned.replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '');

    // Remove all **...** bold markers and their content headers
    cleaned = cleaned.replaceAll(RegExp(r'^\*\*[^*]+\*\*\s*', multiLine: true), '');
    cleaned = cleaned.replaceAll(RegExp(r'\*\*'), '');

    // Remove all *...* italic markers
    cleaned = cleaned.replaceAll(RegExp(r'(?<!\*)\*(?!\*)([^*]+)\*(?!\*)'), r'$1');

    // Remove markdown bullet points (-, *, •) at the start of lines
    cleaned = cleaned.replaceAll(RegExp(r'^[\-\*•]\s+', multiLine: true), '');

    // Remove numbered lists (1., 2), #1, etc.)
    cleaned = cleaned.replaceAll(RegExp(r'^[\d#]+[\.\)\:]\s*', multiLine: true), '');

    // Remove "Option N:", "Description N:", "Section N:" prefixes
    cleaned = cleaned.replaceAll(
      RegExp(r'^(?:Option|Description|Section|Point|Item)\s*\d*[\:\.]?\s*', caseSensitive: false, multiLine: true),
      '',
    );

    // Remove horizontal rules (---, ***, ___)
    cleaned = cleaned.replaceAll(RegExp(r'^[\-\*_]{3,}\s*$', multiLine: true), '');

    // Remove code block markers (```)
    cleaned = cleaned.replaceAll(RegExp(r'```[a-z]*\n?'), '');

    // Remove inline code markers (`)
    cleaned = cleaned.replaceAll(RegExp(r'`([^`]+)`'), r'$1');

    // Remove common AI footer/header patterns
    cleaned = cleaned.replaceAll(
      RegExp(r"(?:Here's|Here is|Below is).*?(?:version|text|content|improvement).*?[:\.]?\s*", caseSensitive: false),
      '',
    );

    // Remove emoji markers often used by AI (✨ 📝 💼 ✅ etc.) at start/end of text
    cleaned = cleaned.replaceAll(RegExp(r'^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+\s*', unicode: true, multiLine: true), '');
    cleaned = cleaned.replaceAll(RegExp(r'\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$', unicode: true, multiLine: true), '');

    // Remove excessive newlines (more than 2 consecutive)
    cleaned = cleaned.replaceAll(RegExp(r'\n{3,}'), '\n\n');

    // Remove leading/trailing whitespace from each line
    cleaned = cleaned.split('\n').map((line) => line.trim()).join('\n');

    // Remove leading/trailing newlines from the entire text
    cleaned = cleaned.trim();

    return cleaned;
  }

  /// Sanitizes translated text by removing unwanted quotation marks
  /// that AI often adds when translating text
  String _sanitizeTranslatedText(String text) {
    String cleaned = text;

    // Remove leading and trailing double quotes (straight and curly)
    cleaned = cleaned.replaceAll(RegExp(r'^[""\u201C\u201D]+'), '');
    cleaned = cleaned.replaceAll(RegExp(r'[""\u201C\u201D]+$'), '');

    // Remove leading and trailing single quotes (straight and curly)
    cleaned = cleaned.replaceAll(RegExp(r"^['''\u2018\u2019]+"), '');
    cleaned = cleaned.replaceAll(RegExp(r"['''\u2018\u2019]+$"), '');

    // Remove common AI translation preambles
    cleaned = cleaned.replaceAll(
      RegExp(r'^(?:Translation|Translated text|Here is the translation)[:\s]*', caseSensitive: false),
      '',
    );

    // Apply general AI sanitization as well
    cleaned = _sanitizeAIContent(cleaned);

    return cleaned.trim();
  }

  void _applyAIImprovement(String improvedContent) {
    // Sanitize the AI-generated content before applying
    final sanitizedContent = _sanitizeAIContent(improvedContent);

    _quillController.document = Document()..insert(0, sanitizedContent);
    _isModified = true;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.auto_awesome, color: Colors.white),
            SizedBox(width: 8),
            Text('AI improvement applied!'),
          ],
        ),
        backgroundColor: Colors.green,
      ),
    );
  }

  // @ mention functionality methods
  Future<void> _loadNotesForMention() async {
    try {
      final currentWorkspaceId = _workspaceService.currentWorkspace?.id;
      if (currentWorkspaceId == null) return;

      final response = await _notesApiService.getNotes(currentWorkspaceId);

      if (response.success && response.data != null && mounted) {
        // Filter out the current note if editing
        final notes = response.data!.where((note) {
          if (widget.note == null) return true;
          // Exclude current note from attachable notes
          return note.title != widget.note!.title;
        }).toList();

        setState(() {
          _availableNotes = notes;
        });
        print('NoteEditor: Loaded ${notes.length} notes for / mentions');
      }
    } catch (e) {
    }
  }

  Future<void> _loadEventsForMention() async {
    try {
      final currentWorkspaceId = _workspaceService.currentWorkspace?.id;
      if (currentWorkspaceId == null) return;

      final response = await _calendarApi.getEvents(currentWorkspaceId);

      if (response.success && response.data != null && mounted) {
        setState(() {
          // Convert API events to local CalendarEvent for MentionSuggestionWidget
          _availableEventsLocal = response.data!.map((apiEvent) {
            // Convert attendees from List<EventAttendee> to List<Map<String, dynamic>>
            final attendeesList = apiEvent.attendees?.map((attendee) {
              return {
                'email': attendee.email,
                'name': attendee.name,
                'status': attendee.status,
              };
            }).toList() ?? [];

            return local_event.CalendarEvent(
              id: apiEvent.id,
              workspaceId: apiEvent.workspaceId,
              title: apiEvent.title,
              description: apiEvent.description,
              startTime: apiEvent.startTime,
              endTime: apiEvent.endTime,
              allDay: apiEvent.isAllDay,
              location: apiEvent.location,
              organizerId: apiEvent.organizerId,
              categoryId: apiEvent.categoryId,
              attendees: attendeesList,
              attachments: apiEvent.attachments != null
                  ? local_event.CalendarEventAttachments(
                      fileAttachment: apiEvent.attachments!.fileAttachment,
                      noteAttachment: apiEvent.attachments!.noteAttachment,
                      eventAttachment: apiEvent.attachments!.eventAttachment,
                    )
                  : null,
              isRecurring: apiEvent.isRecurring,
              meetingUrl: apiEvent.meetingUrl,
              createdAt: apiEvent.createdAt,
              updatedAt: apiEvent.updatedAt,
            );
          }).toList();
        });
      }
    } catch (e) {
    }
  }

  Future<void> _loadFilesForMention() async {
    try {
      final workspaceId = _workspaceService.currentWorkspace?.id;
      if (workspaceId == null) return;

      // Initialize file service with workspace ID before fetching files
      _fileService.initialize(workspaceId);
      final files = await _fileService.getFiles();

      if (files != null && mounted) {
        setState(() {
          _availableFiles = files;
        });
      }
    } catch (e) {
      debugPrint('Error loading files for mention: $e');
    }
  }

  void _insertNoteReference(api.Note note) {
    setState(() {
      _linkedItems.add({
        'id': note.id,
        'name': note.title,
        'type': 'note',
      });

      // Delete the / character that triggered the mention
      if (_slashSymbolPosition >= 0) {
        _quillController.document.delete(_slashSymbolPosition, 1);
      }

      _slashSymbolPosition = -1;
      _isModified = true;
    });
  }

  void _insertEventReference(local_event.CalendarEvent event) {
    setState(() {
      _linkedItems.add({
        'id': event.id,
        'name': event.title,
        'type': 'event',
        'start_time': event.startTime.toIso8601String(),
        'end_time': event.endTime.toIso8601String(),
        'location': event.location,
        'description': event.description,
        'is_all_day': event.allDay,
      });

      // Delete the / character that triggered the mention
      if (_slashSymbolPosition >= 0) {
        _quillController.document.delete(_slashSymbolPosition, 1);
      }

      _slashSymbolPosition = -1;
      _isModified = true;
    });
  }

  void _insertFileReference(file_model.File file) {
    setState(() {
      _linkedItems.add({
        'id': file.id,
        'name': file.name,
        'type': 'file',
        'metadata': {
          'size': file.size,
          'mime_type': file.mimeType,
          'url': file.url,
        },
      });

      // Delete the / character that triggered the mention
      if (_slashSymbolPosition >= 0) {
        _quillController.document.delete(_slashSymbolPosition, 1);
      }

      _slashSymbolPosition = -1;
      _isModified = true;
    });
  }

  String _formatFileSize(String sizeStr) {
    try {
      final bytes = int.parse(sizeStr);
      if (bytes < 1024) return '${bytes}B';
      if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
      if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
    } catch (e) {
      return sizeStr;
    }
  }

  /// Shows the attachment picker as a bottom sheet for better visibility with keyboard
  void _showAttachmentPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
          ),
          child: Column(
            children: [
              // Compact drag handle
              Container(
                margin: const EdgeInsets.symmetric(vertical: 6),
                width: 32,
                height: 3,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Compact Title
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: Row(
                  children: [
                    const Icon(
                      Icons.attach_file,
                      color: Colors.orange,
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'notes_editor.attach_to_note'.tr(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Icon(
                          Icons.close,
                          size: 20,
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Divider(height: 1, thickness: 0.5),
              // Attachment picker content
              Expanded(
                child: MentionSuggestionWidget(
                  notes: _availableNotes,
                  events: _availableEventsLocal,
                  files: _availableFiles,
                  onNoteSelected: (note) {
                    Navigator.pop(context);
                    _insertNoteReference(note);
                  },
                  onEventSelected: (event) {
                    Navigator.pop(context);
                    _insertEventReference(event);
                  },
                  onFileSelected: (file) {
                    Navigator.pop(context);
                    _insertFileReference(file);
                  },
                  onClose: () => Navigator.pop(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Handles tapping on an attachment to show preview dialog
  void _handleAttachmentTap(AttachmentItem attachment) {
    final workspaceId = _workspaceService.currentWorkspace?.id ?? '';

    switch (attachment.type) {
      case AttachmentType.event:
        EventPreviewDialog.show(
          context,
          eventId: attachment.id,
          eventName: attachment.name,
          workspaceId: workspaceId,
        );
        break;
      case AttachmentType.note:
        NotePreviewDialog.show(
          context,
          noteId: attachment.id,
          noteName: attachment.name,
          workspaceId: workspaceId,
        );
        break;
      case AttachmentType.file:
        FilePreviewDialog.show(
          context,
          fileId: attachment.id,
          fileName: attachment.name,
          fileSize: attachment.metadata?['size']?.toString(),
          mimeType: attachment.metadata?['mime_type']?.toString(),
          fileUrl: attachment.metadata?['url']?.toString(),
        );
        break;
    }
  }

  Future<void> _selectIcon() async {
    final selectedEmoji = await showDialog<String>(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          width: 300,
          height: 400,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Icon',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 6,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                  ),
                  itemCount: NoteEmojis.popular.length,
                  itemBuilder: (context, index) {
                    final emoji = NoteEmojis.popular[index];
                    return InkWell(
                      onTap: () => Navigator.pop(context, emoji),
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: emoji == _selectedIcon
                                ? Theme.of(context).colorScheme.primary
                                : Colors.transparent,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Center(
                          child: Text(
                            emoji,
                            style: const TextStyle(fontSize: 24),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (selectedEmoji != null) {
      setState(() {
        _selectedIcon = selectedEmoji;
        _isModified = true;
      });
    }
  }

  void _showDocumentInfo() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.info_outline),
                const SizedBox(width: 8),
                Text(
                  'notes_editor.document_info'.tr(),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoRow('notes_editor.title_label'.tr(), widget.note?.title ?? 'notes_editor.untitled'.tr()),
            _buildInfoRow('notes_editor.created_label'.tr(), widget.note?.createdAt.toString().split('.')[0] ?? 'notes_editor.na'.tr()),
            _buildInfoRow('notes_editor.updated_label'.tr(), widget.note?.updatedAt.toString().split('.')[0] ?? 'notes_editor.na'.tr()),
            _buildInfoRow('notes_editor.category_label'.tr(), widget.note?.categoryId ?? 'notes_editor.none'.tr()),
            _buildInfoRow('notes_editor.words_label'.tr(), _quillController.document.toPlainText().split(' ').where((w) => w.isNotEmpty).length.toString()),
            _buildInfoRow('notes_editor.characters_label'.tr(), _quillController.document.toPlainText().length.toString()),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  // TODO: Collaborators feature not functional yet - will implement later
  // void _showCollaborators() {
  //   showModalBottomSheet(
  //     context: context,
  //     isScrollControlled: true,
  //     backgroundColor: Colors.transparent,
  //     builder: (context) => _CollaboratorsBottomSheet(
  //       note: widget.note,
  //       onCollaboratorsChanged: _onCollaboratorsChanged,
  //     ),
  //   );
  // }

  Future<void> _showShareDialog() async {
    if (widget.note == null) return;

    try {
      final workspaceId = await AppConfig.getCurrentWorkspaceId();
      if (workspaceId == null || workspaceId.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('notes_editor.workspace_not_found'.tr())),
          );
        }
        return;
      }

      final result = await showDialog<bool>(
        context: context,
        builder: (context) => ShareNoteDialog(
          noteId: widget.note!.id,
          noteTitle: widget.note!.title,
          workspaceId: workspaceId,
          createdBy: widget.note!.createdBy,
        ),
      );

      // If sharing was successful, you can refresh the note or do other actions
      if (result == true && mounted) {
        // Note was shared successfully
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  // TODO: Collaborators feature not functional yet - will implement later
  // Future<void> _onCollaboratorsChanged(List<Collaborator> newCollaborators) async {
  //   if (widget.note == null) return;
  //
  //   try {
  //
  //     // Update local note service first
  //     _notesService.updateNoteCollaborators(widget.note!.id, newCollaborators);
  //
  //     // Update database with collaborators in collaborativeData field
  //     final appAtOnceService = AppAtOnceService.instance;
  //     if (appAtOnceService.isInitialized) {
  //       // Get all notes to find the current note
  //       final dbNotes = await appAtOnceService.getNotes(
  //         workspaceId: appAtOnceService.currentWorkspaceId,
  //       );
  //
  //       // Find the note in database
  //       final dbNote = dbNotes.firstWhere(
  //         (n) => n.id == widget.note!.id,
  //         orElse: () => throw Exception('Note not found in database'),
  //       );
  //
  //       // Get user ID for updates
  //       final userId = await AppConfig.getCurrentUserId() ?? "";
  //       if (userId.isEmpty) {
  //         return;
  //       }
  //
  //       // Convert collaborators to JSON for storage
  //       final collaboratorsData = {
  //         'collaborators': newCollaborators.map((c) => c.toJson()).toList(),
  //         'lastUpdated': DateTime.now().toIso8601String(),
  //       };
  //
  //       // Update the note with new collaborative data
  //       final updatedNote = dbNote.copyWith(
  //         collaborativeData: {
  //           ...dbNote.collaborativeData,
  //           ...collaboratorsData,
  //         },
  //         lastEditedBy: userId,
  //       );
  //
  //       await appAtOnceService.updateNote(updatedNote);
  //
  //       // Add activity for collaborator changes
  //       final activity = Activity(
  //         id: DateTime.now().millisecondsSinceEpoch.toString(),
  //         noteId: widget.note!.id,
  //         userId: userId,
  //         userName: 'You',
  //         userAvatar: 'Y',
  //         type: ActivityType.collaboratorAdded,
  //         description: 'Updated collaborators (${newCollaborators.length} total)',
  //         timestamp: DateTime.now(),
  //       );
  //
  //       _notesService.addActivity(widget.note!.id, activity);
  //     }
  //
  //     // Show success message
  //     if (mounted) {
  //       ScaffoldMessenger.of(context).showSnackBar(
  //         SnackBar(
  //           content: Row(
  //             children: [
  //               Icon(Icons.people, color: Colors.white, size: 20),
  //               SizedBox(width: 8),
  //               Text('Collaborators updated successfully'),
  //             ],
  //           ),
  //           backgroundColor: Colors.green,
  //           duration: Duration(seconds: 2),
  //         ),
  //       );
  //     }
  //
  //   } catch (e) {
  //     if (mounted) {
  //       ScaffoldMessenger.of(context).showSnackBar(
  //         SnackBar(
  //           content: Text('Failed to update collaborators: $e'),
  //           backgroundColor: Colors.red,
  //         ),
  //       );
  //     }
  //   }
  // }

  void _showRecentActivity() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _RecentActivityBottomSheet(note: widget.note),
    );
  }

  /// Import content from a file into the current note
  void _importFileContent() async {
    try {
      // Pick a file
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: false,
      );

      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      final fileName = file.name.toLowerCase();

      // Check if file extension is supported
      final supportedExtensions = ['txt', 'md', 'docx'];
      final extension = fileName.contains('.')
          ? fileName.split('.').last
          : '';

      if (!supportedExtensions.contains(extension)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Unsupported file type. Please select a .txt, .md, or .docx file.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      // Read file content
      List<int> bytes;
      if (file.bytes != null) {
        bytes = file.bytes!;
      } else if (file.path != null) {
        final fileOnDisk = File(file.path!);
        if (!await fileOnDisk.exists()) {
          throw Exception('File not found');
        }
        bytes = await fileOnDisk.readAsBytes();
      } else {
        throw Exception('Failed to read file content');
      }

      // Convert to HTML based on file type
      String htmlContent = '';

      if (fileName.endsWith('.txt')) {
        final content = utf8.decode(bytes);
        final paragraphs = content.split('\n\n').where((p) => p.trim().isNotEmpty);
        if (paragraphs.isEmpty) {
          htmlContent = '<p>${content.replaceAll('\n', '<br>')}</p>';
        } else {
          htmlContent = paragraphs.map((p) => '<p>${p.replaceAll('\n', '<br>')}</p>').join('');
        }
      } else if (fileName.endsWith('.md')) {
        final content = utf8.decode(bytes);
        htmlContent = md.markdownToHtml(content, extensionSet: md.ExtensionSet.gitHubWeb);
      } else if (fileName.endsWith('.docx')) {
        htmlContent = await _extractDocxContentForImport(bytes);
      }

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (htmlContent.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('File is empty'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      // Show dialog to choose append or replace
      if (mounted) {
        final action = await showDialog<String>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('notes_import.title'.tr()),
            content: Text('How would you like to import the content?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.cancel'.tr()),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, 'append'),
                child: Text('Append'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, 'replace'),
                child: Text('Replace'),
              ),
            ],
          ),
        );

        if (action == null) return;

        // Convert HTML to Delta and update editor
        final delta = HtmlToDelta().convert(htmlContent);

        if (action == 'replace') {
          _quillController.document = Document.fromDelta(delta);
        } else {
          // Append to existing content
          final currentLength = _quillController.document.length;
          _quillController.document.insert(currentLength - 1, '\n\n');
          _quillController.document.compose(
            delta,
            ChangeSource.local,
          );
        }

        setState(() {
          _isModified = true;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notes_import.success'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      debugPrint('Import error: $e');
      if (mounted) {
        Navigator.pop(context); // Close loading dialog if still showing
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to import: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Extract text content from .docx file for import
  Future<String> _extractDocxContentForImport(List<int> bytes) async {
    final archive = ZipDecoder().decodeBytes(bytes);
    final documentFile = archive.files.firstWhere(
      (file) => file.name == 'word/document.xml',
      orElse: () => throw Exception('Invalid .docx file'),
    );

    final documentContent = utf8.decode(documentFile.content as List<int>);
    final document = xml.XmlDocument.parse(documentContent);

    final paragraphs = <String>[];
    final body = document.findAllElements('w:body').firstOrNull;

    if (body != null) {
      for (final paragraph in body.findAllElements('w:p')) {
        final textParts = <String>[];
        for (final run in paragraph.findAllElements('w:r')) {
          for (final text in run.findAllElements('w:t')) {
            textParts.add(text.innerText);
          }
        }
        final paragraphText = textParts.join('');
        if (paragraphText.isNotEmpty) {
          paragraphs.add('<p>$paragraphText</p>');
        }
      }
    }

    return paragraphs.isNotEmpty ? paragraphs.join('\n') : '';
  }

  void _showQuickActions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.flash_on),
                const SizedBox(width: 8),
                Text(
                  'notes_editor.quick_actions'.tr(),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf),
              title: Text('notes_editor.export_as_pdf'.tr()),
              onTap: () {
                Navigator.pop(context);
                _exportAsPDF();
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showImproveWithAI() async {
    // Detect language before showing the dialog
    await _detectCurrentLanguage();

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(16),
          child: SingleChildScrollView(
            controller: scrollController,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Row(
                  children: [
                    const Icon(Icons.auto_awesome, size: 24),
                    const SizedBox(width: 12),
                    Text(
                      'notes_editor.improve_with_ai'.tr(),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // AI Actions Section
                Text(
                  'notes_editor.ai_actions'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),

                // AI Action buttons
                _buildAIAction(context, Icons.summarize, 'notes_editor.summarize_text'.tr(), 'summarize'),
                _buildAIAction(context, Icons.edit, 'notes_editor.improve_writing'.tr(), 'improve'),
                _buildAIAction(context, Icons.spellcheck, 'notes_editor.fix_grammar'.tr(), 'grammar'),
                _buildAIAction(context, Icons.expand, 'notes_editor.make_longer'.tr(), 'expand'),
                _buildAIAction(context, Icons.compress, 'notes_editor.make_shorter'.tr(), 'shorten'),

                const SizedBox(height: 24),

                // Translate Section
                Text(
                  'notes_editor.translate'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),

                // Dynamically build language options (excluding detected language)
                ..._buildLanguageOptions(context),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildAIAction(BuildContext context, IconData icon, String title, String action) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        _performAIAction(action);
      },
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Row(
          children: [
            Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Text(
              title,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLanguageOption(BuildContext context, String flag, String language, String languageCode) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        _translateNote(language, languageCode);
      },
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Text(flag, style: const TextStyle(fontSize: 24)),
            const SizedBox(width: 12),
            Text(
              language,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }

  /// Build language options dynamically, excluding the detected current language
  List<Widget> _buildLanguageOptions(BuildContext context) {
    final List<Widget> languageWidgets = [];

    // Sort languages alphabetically by name (English first if available)
    final sortedLanguages = _availableLanguages.entries.toList()
      ..sort((a, b) {
        // Put English first
        if (a.key == 'en') return -1;
        if (b.key == 'en') return 1;
        return a.value['name']!.compareTo(b.value['name']!);
      });

    for (final entry in sortedLanguages) {
      final languageCode = entry.key;
      final languageData = entry.value;

      // Skip the detected language (don't show it in the list)
      if (_detectedLanguage != null && languageCode == _detectedLanguage) {
        continue;
      }

      languageWidgets.add(
        _buildLanguageOption(
          context,
          languageData['flag']!,
          languageData['name']!,
          languageCode,
        ),
      );
    }

    return languageWidgets;
  }

  /// Detect the current language of the note content using simple heuristics
  Future<void> _detectCurrentLanguage() async {
    final content = _quillController.document.toPlainText().trim();

    if (content.isEmpty) {
      setState(() {
        _detectedLanguage = null;
      });
      return;
    }

    // Simple heuristic-based language detection
    // Check for non-Latin scripts
    if (RegExp(r'[\u4e00-\u9fa5]').hasMatch(content)) {
      // Chinese characters detected (default to Simplified)
      setState(() {
        _detectedLanguage = 'zh-cn';
      });
    } else if (RegExp(r'[\u0600-\u06ff]').hasMatch(content)) {
      // Arabic script detected
      setState(() {
        _detectedLanguage = 'ar';
      });
    } else if (RegExp(r'[\u3040-\u309f\u30a0-\u30ff]').hasMatch(content)) {
      // Japanese (Hiragana/Katakana) detected
      setState(() {
        _detectedLanguage = 'ja';
      });
    } else if (RegExp(r'[\uac00-\ud7af]').hasMatch(content)) {
      // Korean (Hangul) detected
      setState(() {
        _detectedLanguage = 'ko';
      });
    } else if (RegExp(r'[\u0900-\u097f]').hasMatch(content)) {
      // Hindi (Devanagari) detected
      setState(() {
        _detectedLanguage = 'hi';
      });
    } else if (RegExp(r'[\u0400-\u04ff]').hasMatch(content)) {
      // Cyrillic script detected (Russian)
      setState(() {
        _detectedLanguage = 'ru';
      });
    } else {
      // For Latin-based scripts, check for common words
      final lowerContent = content.toLowerCase();

      // Common English words
      final englishWords = ['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'of', 'a', 'an'];
      final englishCount = englishWords.where((word) => lowerContent.contains(' $word ')).length;

      // Common Spanish words
      final spanishWords = ['el', 'la', 'de', 'y', 'que', 'en', 'los', 'las', 'un', 'una', 'es', 'por'];
      final spanishCount = spanishWords.where((word) => lowerContent.contains(' $word ')).length;

      // Common French words
      final frenchWords = ['le', 'la', 'de', 'et', 'un', 'une', 'est', 'dans', 'les', 'des', 'pour', 'que'];
      final frenchCount = frenchWords.where((word) => lowerContent.contains(' $word ')).length;

      // Common German words
      final germanWords = ['der', 'die', 'das', 'und', 'ist', 'in', 'den', 'von', 'zu', 'ein', 'eine', 'mit'];
      final germanCount = germanWords.where((word) => lowerContent.contains(' $word ')).length;

      // Common Portuguese words
      final portugueseWords = ['o', 'a', 'de', 'e', 'que', 'em', 'os', 'as', 'um', 'uma', 'para', 'com'];
      final portugueseCount = portugueseWords.where((word) => lowerContent.contains(' $word ')).length;

      // Common Italian words
      final italianWords = ['il', 'la', 'di', 'e', 'che', 'un', 'una', 'per', 'in', 'dei', 'del', 'gli'];
      final italianCount = italianWords.where((word) => lowerContent.contains(' $word ')).length;

      // Determine the most likely language
      final counts = {
        'en': englishCount,
        'es': spanishCount,
        'fr': frenchCount,
        'de': germanCount,
        'pt': portugueseCount,
        'it': italianCount,
      };

      // Find the language with the highest count
      var maxCount = 0;
      String? detectedLang;
      counts.forEach((lang, count) {
        if (count > maxCount) {
          maxCount = count;
          detectedLang = lang;
        }
      });

      // Only set if we have reasonable confidence (at least 2 matching words)
      setState(() {
        _detectedLanguage = (maxCount >= 2) ? detectedLang : 'en'; // Default to English
      });
    }

  }

  void _performAIAction(String action) async {
    // Get the current note content
    final content = _quillController.document.toPlainText();

    if (content.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes_editor.add_content_first'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                const SizedBox(height: 16),
                Text(_getAIActionLoadingText(action)),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      late AIResponse<TextGenerationResult> response;

      // Call appropriate AI API based on action
      switch (action) {
        case 'summarize':
          final summaryResponse = await _aiApiService.summarizeContent(
            SummarizeContentDto(
              content: content,
              summaryType: 'abstractive',
              contentType: 'general',
              length: 'medium',
            ),
          );
          if (summaryResponse.success) {
            // Convert summary result to text generation format for consistency
            final result = TextGenerationResult(
              generatedText: summaryResponse.data.summary,
              textType: 'summary',
              wordCount: summaryResponse.data.summaryWordCount,
            );
            response = AIResponse(data: result, success: true);
          } else {
            throw Exception(summaryResponse.error ?? 'Summarization failed');
          }
          break;
        case 'improve':
          response = await _aiApiService.improveWriting(content);
          break;
        case 'grammar':
          response = await _aiApiService.fixGrammar(content);
          break;
        case 'expand':
          response = await _aiApiService.expandContent(content);
          break;
        case 'shorten':
          response = await _aiApiService.shortenContent(content);
          break;
        default:
          throw Exception('Unknown action: $action');
      }

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      if (response.data.generatedText.isNotEmpty) {
        final previewLength = response.data.generatedText.length > 100 ? 100 : response.data.generatedText.length;
      }

      if (response.success && response.data.generatedText.isNotEmpty) {
        // Sanitize and update the note content with the AI-generated text
        final sanitizedContent = _sanitizeAIContent(response.data.generatedText);
        _quillController.document = Document()..insert(0, sanitizedContent);

        setState(() {
          _isModified = true;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 8),
                Text(_getAIActionSuccessText(action)),
              ],
            ),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        final errorMsg = response.error ?? 'AI returned empty content';
        throw Exception(errorMsg);
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes_editor.ai_action_failed'.tr(args: [e.toString()])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _getAIActionLoadingText(String action) {
    switch (action) {
      case 'summarize':
        return 'notes_editor.summarizing'.tr();
      case 'improve':
        return 'notes_editor.improving_writing'.tr();
      case 'grammar':
        return 'notes_editor.fixing_grammar'.tr();
      case 'expand':
        return 'notes_editor.making_longer'.tr();
      case 'shorten':
        return 'notes_editor.making_shorter'.tr();
      default:
        return 'notes_editor.processing_ai'.tr();
    }
  }

  String _getAIActionSuccessText(String action) {
    switch (action) {
      case 'summarize':
        return 'notes_editor.summarized_success'.tr();
      case 'improve':
        return 'notes_editor.improved_success'.tr();
      case 'grammar':
        return 'notes_editor.grammar_fixed_success'.tr();
      case 'expand':
        return 'notes_editor.expanded_success'.tr();
      case 'shorten':
        return 'notes_editor.shortened_success'.tr();
      default:
        return 'notes_editor.ai_completed'.tr();
    }
  }

  void _translateNote(String language, String languageCode) async {
    // Get the current note content
    final content = _quillController.document.toPlainText();

    if (content.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes_editor.add_content_to_translate'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                Text('notes_editor.translating'.tr()),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      // Call translation API
      final response = await _aiApiService.translateText(
        TranslateTextDto(
          text: content,
          targetLanguage: languageCode,
          preserveFormatting: true,
        ),
      );

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      if (response.success && response.data.translatedText.isNotEmpty) {
        // Sanitize the translated text to remove unwanted quotes and formatting
        final sanitizedTranslation = _sanitizeTranslatedText(response.data.translatedText);
        // Update the note content with the translated text
        _quillController.document = Document()..insert(0, sanitizedTranslation);

        setState(() {
          _isModified = true;
          // Update detected language to the target language after successful translation
          _detectedLanguage = languageCode;
        });


        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 8),
                Text('notes_editor.translated_to'.tr(args: [language])),
              ],
            ),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        throw Exception(response.error ?? 'Translation failed');
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('notes_editor.translation_failed'.tr(args: [e.toString()])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }


  Future<void> _exportAsPDF() async {
    String? mainNotePath;
    final List<String> exportedFiles = [];
    final List<String> failedFiles = [];

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                Text('notes_editor.exporting'.tr()),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      final titleText = _titleController.text.trim();
      final title = widget.note?.title ?? (titleText.isEmpty ? 'notes_editor.untitled'.tr() : titleText);

      // Get content - first try plain text from Quill, then strip HTML if needed
      String content = _quillController.document.toPlainText();

      // If the plain text still contains HTML tags, strip them
      if (_isHtmlContent(content)) {
        content = _stripHtmlTagsForPdf(content);
      }

      // Also check the original content and strip HTML
      final originalContent = widget.note?.content ?? '';
      if (content.trim().isEmpty && originalContent.isNotEmpty) {
        content = _stripHtmlTagsForPdf(originalContent);
      }

      final createdDate = widget.note?.createdAt ?? DateTime.now();
      final updatedDate = widget.note?.updatedAt ?? DateTime.now();

      // Split content into paragraphs for better pagination
      final paragraphs = content.split('\n\n').where((p) => p.trim().isNotEmpty).toList();

      // Get directory for saving files
      Directory? directory;
      if (Platform.isAndroid) {
        directory = Directory('/storage/emulated/0/Download');
        if (!await directory.exists()) {
          directory = await getExternalStorageDirectory();
        }
      } else if (Platform.isIOS) {
        directory = await getApplicationDocumentsDirectory();
      } else {
        directory = await getApplicationDocumentsDirectory();
      }

      if (directory == null) {
        throw Exception('Could not access storage directory');
      }

      // Create a subfolder for this note's exports
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final safeName = title.replaceAll(RegExp(r'[^\w\s-]'), '_').trim();
      final exportFolder = Directory('${directory.path}/NoteExport_${safeName}_$timestamp');
      await exportFolder.create(recursive: true);

      // Fetch attachments data
      List<Map<String, dynamic>> noteAttachments = [];
      List<Map<String, dynamic>> eventAttachments = [];
      List<Map<String, dynamic>> fileAttachments = [];

      final workspaceId = _workspaceService.currentWorkspace?.id;

      if (workspaceId != null && _linkedItems.isNotEmpty) {
        for (final item in _linkedItems) {
          try {
            final enrichedItem = Map<String, dynamic>.from(item);
            final itemType = item['type']?.toString() ?? '';
            final itemId = item['id']?.toString() ?? '';

            if (itemType == 'note' && itemId.isNotEmpty) {
              enrichedItem['name'] = item['name']?.toString() ?? 'notes_editor.untitled_note'.tr();
              enrichedItem['content'] = '';

              try {
                final noteResponse = await _notesApiService.getNote(workspaceId, itemId);
                if (noteResponse.isSuccess && noteResponse.data != null) {
                  enrichedItem['name'] = noteResponse.data!.title;
                  enrichedItem['content'] = _stripHtmlTagsForPdf(noteResponse.data!.content ?? '');
                }
              } catch (e) {
                debugPrint('Error fetching note content: $e');
              }
              noteAttachments.add(enrichedItem);
            } else if (itemType == 'event' && itemId.isNotEmpty) {
              enrichedItem['name'] = item['name']?.toString() ?? 'notes_editor.untitled_event'.tr();
              enrichedItem['description'] = '';
              enrichedItem['start_time'] = item['start_time']?.toString();
              enrichedItem['end_time'] = item['end_time']?.toString();
              enrichedItem['location'] = item['location']?.toString() ?? '';

              try {
                final eventResponse = await _calendarApi.getEvent(workspaceId, itemId);
                if (eventResponse.isSuccess && eventResponse.data != null) {
                  final event = eventResponse.data!;
                  enrichedItem['name'] = event.title;
                  enrichedItem['description'] = event.description ?? '';
                  enrichedItem['start_time'] = event.startTime.toIso8601String();
                  enrichedItem['end_time'] = event.endTime.toIso8601String();
                  enrichedItem['location'] = event.location ?? '';
                  enrichedItem['is_all_day'] = event.isAllDay;
                  enrichedItem['organizer_name'] = event.organizerName ?? '';
                  enrichedItem['meeting_url'] = event.meetingUrl ?? '';
                  if (event.attendees != null && event.attendees!.isNotEmpty) {
                    enrichedItem['attendees'] = event.attendees!
                        .map((a) => a.name ?? a.email ?? 'Unknown')
                        .toList();
                  }
                }
              } catch (e) {
                debugPrint('Error fetching event content: $e');
              }
              eventAttachments.add(enrichedItem);
            } else if (itemType == 'file') {
              enrichedItem['name'] = item['name']?.toString() ?? 'notes_editor.untitled_file'.tr();
              enrichedItem['size'] = item['size']?.toString();
              enrichedItem['mime_type'] = item['mime_type']?.toString();
              enrichedItem['url'] = item['url']?.toString();
              fileAttachments.add(enrichedItem);
            }
          } catch (e) {
            debugPrint('Error processing attachment: $e');
          }
        }
      }

      // 1. Export main note as PDF (simple, without embedded attachments)
      final mainPdf = pw.Document();
      mainPdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(32),
          maxPages: 50,
          build: (pw.Context context) {
            final List<pw.Widget> widgets = [
              pw.Header(
                level: 0,
                child: pw.Text(
                  title,
                  style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold),
                ),
              ),
              pw.SizedBox(height: 16),
              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey300),
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Note Information', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                    pw.SizedBox(height: 8),
                    pw.Text('Created: ${_formatDateForPDF(createdDate)}', style: const pw.TextStyle(fontSize: 12)),
                    pw.Text('Updated: ${_formatDateForPDF(updatedDate)}', style: const pw.TextStyle(fontSize: 12)),
                    if (widget.note?.category != null)
                      pw.Text('Category: ${widget.note!.category!.name}', style: const pw.TextStyle(fontSize: 12)),
                    if (widget.note?.subcategory.isNotEmpty == true)
                      pw.Text('Subcategory: ${widget.note!.subcategory}', style: const pw.TextStyle(fontSize: 12)),
                  ],
                ),
              ),
              pw.SizedBox(height: 24),
              pw.Text('Content', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 12),
            ];

            if (paragraphs.isEmpty) {
              widgets.add(pw.Text('No content available.', style: const pw.TextStyle(fontSize: 12, lineSpacing: 1.5)));
            } else {
              for (final paragraph in paragraphs) {
                widgets.add(pw.Paragraph(text: paragraph.trim(), style: const pw.TextStyle(fontSize: 12, lineSpacing: 1.5)));
                widgets.add(pw.SizedBox(height: 8));
              }
            }

            // Add attachments summary (just titles, not full content)
            final totalAttachments = noteAttachments.length + eventAttachments.length + fileAttachments.length;
            if (totalAttachments > 0) {
              widgets.add(pw.SizedBox(height: 24));
              widgets.add(pw.Divider(color: PdfColors.grey300));
              widgets.add(pw.SizedBox(height: 16));
              widgets.add(pw.Text('Attachments (exported separately)', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)));
              widgets.add(pw.SizedBox(height: 8));

              if (noteAttachments.isNotEmpty) {
                widgets.add(pw.Text('Linked Notes: ${noteAttachments.length}', style: pw.TextStyle(fontSize: 12, color: PdfColors.blue700)));
                for (final note in noteAttachments) {
                  widgets.add(pw.Padding(padding: const pw.EdgeInsets.only(left: 16, top: 4), child: pw.Text('• ${note['name']}', style: const pw.TextStyle(fontSize: 11))));
                }
              }
              if (eventAttachments.isNotEmpty) {
                widgets.add(pw.SizedBox(height: 8));
                widgets.add(pw.Text('Linked Events: ${eventAttachments.length}', style: pw.TextStyle(fontSize: 12, color: PdfColors.green700)));
                for (final event in eventAttachments) {
                  widgets.add(pw.Padding(padding: const pw.EdgeInsets.only(left: 16, top: 4), child: pw.Text('• ${event['name']}', style: const pw.TextStyle(fontSize: 11))));
                }
              }
              if (fileAttachments.isNotEmpty) {
                widgets.add(pw.SizedBox(height: 8));
                widgets.add(pw.Text('Linked Files: ${fileAttachments.length}', style: pw.TextStyle(fontSize: 12, color: PdfColors.orange700)));
                for (final file in fileAttachments) {
                  widgets.add(pw.Padding(padding: const pw.EdgeInsets.only(left: 16, top: 4), child: pw.Text('• ${file['name']}', style: const pw.TextStyle(fontSize: 11))));
                }
              }
            }

            return widgets;
          },
        ),
      );

      mainNotePath = '${exportFolder.path}/$safeName.pdf';
      final mainFile = File(mainNotePath);
      await mainFile.writeAsBytes(await mainPdf.save());
      exportedFiles.add('$safeName.pdf');

      // 2. Export linked notes as separate PDFs
      for (final linkedNote in noteAttachments) {
        try {
          final linkedNoteName = linkedNote['name']?.toString() ?? 'notes_editor.untitled_note'.tr();
          final linkedNoteContent = linkedNote['content']?.toString() ?? '';
          final safeLinkedName = linkedNoteName.replaceAll(RegExp(r'[^\w\s-]'), '_').trim();

          final linkedPdf = pw.Document();
          final linkedParagraphs = linkedNoteContent.split('\n\n').where((p) => p.trim().isNotEmpty).toList();

          linkedPdf.addPage(
            pw.MultiPage(
              pageFormat: PdfPageFormat.a4,
              margin: const pw.EdgeInsets.all(32),
              maxPages: 50,
              build: (pw.Context context) {
                final List<pw.Widget> widgets = [
                  pw.Header(level: 0, child: pw.Text(linkedNoteName, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold))),
                  pw.SizedBox(height: 16),
                  pw.Text('Linked Note from: $title', style: pw.TextStyle(fontSize: 12, color: PdfColors.grey600, fontStyle: pw.FontStyle.italic)),
                  pw.SizedBox(height: 24),
                ];

                if (linkedParagraphs.isEmpty) {
                  widgets.add(pw.Text('No content available.', style: const pw.TextStyle(fontSize: 12, lineSpacing: 1.5)));
                } else {
                  for (final paragraph in linkedParagraphs) {
                    widgets.add(pw.Paragraph(text: paragraph.trim(), style: const pw.TextStyle(fontSize: 12, lineSpacing: 1.5)));
                    widgets.add(pw.SizedBox(height: 8));
                  }
                }
                return widgets;
              },
            ),
          );

          final linkedFile = File('${exportFolder.path}/${safeName}_Note_$safeLinkedName.pdf');
          await linkedFile.writeAsBytes(await linkedPdf.save());
          exportedFiles.add('${safeName}_Note_$safeLinkedName.pdf');
        } catch (e) {
          failedFiles.add('Note: ${linkedNote['name']}');
          debugPrint('Error exporting linked note: $e');
        }
      }

      // 3. Export events as separate PDFs
      for (final event in eventAttachments) {
        try {
          final eventName = event['name']?.toString() ?? 'notes_editor.untitled_event'.tr();
          final safeEventName = eventName.replaceAll(RegExp(r'[^\w\s-]'), '_').trim();

          final eventPdf = pw.Document();
          eventPdf.addPage(
            pw.Page(
              pageFormat: PdfPageFormat.a4,
              margin: const pw.EdgeInsets.all(32),
              build: (pw.Context context) {
                final List<pw.Widget> widgets = [
                  pw.Header(level: 0, child: pw.Text(eventName, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold, color: PdfColors.green800))),
                  pw.SizedBox(height: 8),
                  pw.Text('Event from note: $title', style: pw.TextStyle(fontSize: 12, color: PdfColors.grey600, fontStyle: pw.FontStyle.italic)),
                  pw.SizedBox(height: 24),
                ];

                // Date and time
                if (event['start_time'] != null) {
                  try {
                    final startTime = DateTime.parse(event['start_time']);
                    final endTime = event['end_time'] != null ? DateTime.parse(event['end_time']) : null;
                    String dateStr = _formatDateForPDF(startTime);
                    if (endTime != null) {
                      dateStr += ' - ${_formatDateForPDF(endTime)}';
                    }
                    if (event['is_all_day'] == true) {
                      dateStr += ' (All Day)';
                    }
                    widgets.add(pw.Row(children: [
                      pw.Text('Date: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                      pw.Expanded(child: pw.Text(dateStr, style: const pw.TextStyle(fontSize: 12))),
                    ]));
                    widgets.add(pw.SizedBox(height: 8));
                  } catch (_) {}
                }

                if (event['location'] != null && event['location'].toString().isNotEmpty) {
                  widgets.add(pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                    pw.Text('Location: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                    pw.Expanded(child: pw.Text(event['location'], style: const pw.TextStyle(fontSize: 12))),
                  ]));
                  widgets.add(pw.SizedBox(height: 8));
                }

                if (event['organizer_name'] != null && event['organizer_name'].toString().isNotEmpty) {
                  widgets.add(pw.Row(children: [
                    pw.Text('Organizer: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                    pw.Expanded(child: pw.Text(event['organizer_name'], style: const pw.TextStyle(fontSize: 12))),
                  ]));
                  widgets.add(pw.SizedBox(height: 8));
                }

                if (event['attendees'] != null && (event['attendees'] as List).isNotEmpty) {
                  widgets.add(pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                    pw.Text('Attendees: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                    pw.Expanded(child: pw.Text((event['attendees'] as List).join(', '), style: const pw.TextStyle(fontSize: 12))),
                  ]));
                  widgets.add(pw.SizedBox(height: 8));
                }

                if (event['meeting_url'] != null && event['meeting_url'].toString().isNotEmpty) {
                  widgets.add(pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                    pw.Text('Meeting URL: ', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                    pw.Expanded(child: pw.Text(event['meeting_url'], style: pw.TextStyle(fontSize: 12, color: PdfColors.blue700))),
                  ]));
                  widgets.add(pw.SizedBox(height: 8));
                }

                if (event['description'] != null && event['description'].toString().isNotEmpty) {
                  widgets.add(pw.SizedBox(height: 16));
                  widgets.add(pw.Text('Description:', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)));
                  widgets.add(pw.SizedBox(height: 8));
                  widgets.add(pw.Text(_stripHtmlTagsForPdf(event['description']), style: const pw.TextStyle(fontSize: 12, lineSpacing: 1.4)));
                }

                return pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: widgets);
              },
            ),
          );

          final eventFile = File('${exportFolder.path}/${safeName}_Event_$safeEventName.pdf');
          await eventFile.writeAsBytes(await eventPdf.save());
          exportedFiles.add('${safeName}_Event_$safeEventName.pdf');
        } catch (e) {
          failedFiles.add('Event: ${event['name']}');
          debugPrint('Error exporting event: $e');
        }
      }

      // 4. Download file attachments
      final dio = Dio();
      int fileIndex = 1;
      for (final fileAttachment in fileAttachments) {
        try {
          final originalFileName = fileAttachment['name']?.toString() ?? 'notes_editor.untitled_file'.tr();
          final fileUrl = fileAttachment['url']?.toString();

          // Get file extension from original name or URL
          String extension = '';
          if (originalFileName.contains('.')) {
            extension = originalFileName.substring(originalFileName.lastIndexOf('.'));
          } else if (fileUrl != null && fileUrl.contains('.')) {
            final urlFileName = fileUrl.split('/').last.split('?').first;
            if (urlFileName.contains('.')) {
              extension = urlFileName.substring(urlFileName.lastIndexOf('.'));
            }
          }

          // Determine file type for naming
          String fileType = 'File';
          final mimeType = fileAttachment['mime_type']?.toString().toLowerCase() ?? '';
          if (mimeType.startsWith('image/') || extension.toLowerCase().contains(RegExp(r'\.(jpg|jpeg|png|gif|webp|bmp)'))) {
            fileType = 'Image';
          } else if (mimeType.startsWith('video/') || extension.toLowerCase().contains(RegExp(r'\.(mp4|mov|avi|mkv|webm)'))) {
            fileType = 'Video';
          } else if (mimeType.startsWith('audio/') || extension.toLowerCase().contains(RegExp(r'\.(mp3|wav|aac|m4a)'))) {
            fileType = 'Audio';
          } else if (mimeType == 'application/pdf' || extension.toLowerCase() == '.pdf') {
            fileType = 'PDF';
          } else if (mimeType.contains('document') || mimeType.contains('word') || extension.toLowerCase().contains(RegExp(r'\.(doc|docx)'))) {
            fileType = 'Document';
          }

          if (fileUrl != null && fileUrl.isNotEmpty) {
            final safeFileName = '${safeName}_${fileType}_$fileIndex$extension';
            final savePath = '${exportFolder.path}/$safeFileName';
            await dio.download(fileUrl, savePath);
            exportedFiles.add(safeFileName);
            fileIndex++;
          } else {
            failedFiles.add('File: $originalFileName (No URL)');
          }
        } catch (e) {
          failedFiles.add('File: ${fileAttachment['name']}');
          debugPrint('Error downloading file: $e');
        }
      }

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      // Show success dialog with exported files list
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(failedFiles.isEmpty ? Icons.check_circle : Icons.warning, color: failedFiles.isEmpty ? Colors.green : Colors.orange),
              const SizedBox(width: 8),
              const Expanded(child: Text('Export Complete')),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Exported to: ${exportFolder.path}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 16),
                const Text('Exported Files:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...exportedFiles.map((f) => Padding(
                  padding: const EdgeInsets.only(left: 8, bottom: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.check, color: Colors.green, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(f, style: const TextStyle(fontSize: 13))),
                    ],
                  ),
                )),
                if (failedFiles.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text('Failed:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                  const SizedBox(height: 8),
                  ...failedFiles.map((f) => Padding(
                    padding: const EdgeInsets.only(left: 8, bottom: 4),
                    child: Row(
                      children: [
                        const Icon(Icons.error, color: Colors.red, size: 16),
                        const SizedBox(width: 8),
                        Expanded(child: Text(f, style: const TextStyle(fontSize: 13))),
                      ],
                    ),
                  )),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
            if (mainNotePath != null)
              TextButton(
                onPressed: () async {
                  Navigator.pop(context);
                  final mainPdfBytes = await File(mainNotePath!).readAsBytes();
                  await Printing.sharePdf(bytes: mainPdfBytes, filename: '$safeName.pdf');
                },
                child: const Text('Share Main PDF'),
              ),
          ],
        ),
      );
    } catch (e, stackTrace) {
      debugPrint('Error exporting PDF: $e');
      debugPrint('Stack trace: $stackTrace');

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(child: Text('Failed to export: ${e.toString()}')),
            ],
          ),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  String _formatDateForPDF(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  /// Check if content contains HTML tags
  bool _isHtmlContent(String content) {
    return content.contains(RegExp(r'<[^>]+>'));
  }

  /// Strip HTML tags while preserving text content
  String _stripHtmlTags(String html) {
    return html
        .replaceAll(RegExp(r'<br\s*/?>'), '\n')
        .replaceAll(RegExp(r'<p[^>]*>'), '\n')
        .replaceAll(RegExp(r'</p>'), '\n')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll(RegExp(r'\n\n+'), '\n\n')
        .trim();
  }

  /// Strip HTML tags from content for PDF export (preserves line breaks properly)
  String _stripHtmlTagsForPdf(String html) {
    if (html.isEmpty) return html;
    return html
        .replaceAll(RegExp(r'<br\s*/?>'), '\n')
        .replaceAll(RegExp(r'</p>\s*<p[^>]*>'), '\n\n')
        .replaceAll(RegExp(r'<p[^>]*>'), '')
        .replaceAll(RegExp(r'</p>'), '\n')
        .replaceAll(RegExp(r'<div[^>]*>'), '')
        .replaceAll(RegExp(r'</div>'), '\n')
        .replaceAll(RegExp(r'<li[^>]*>'), '• ')
        .replaceAll(RegExp(r'</li>'), '\n')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll(RegExp(r'&nbsp;'), ' ')
        .replaceAll(RegExp(r'&amp;'), '&')
        .replaceAll(RegExp(r'&lt;'), '<')
        .replaceAll(RegExp(r'&gt;'), '>')
        .replaceAll(RegExp(r'&quot;'), '"')
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }

  // Track collaborator cursors for rendering
  final Map<String, CursorData> _collaboratorCursors = {};

  /// Build content editor based on content type
  Widget _buildContentEditor() {
    // Show loading indicator while fetching content from API or editor not ready
    if (_isLoadingContent || !_isEditorReady) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading note content...'),
          ],
        ),
      );
    }

    // Wrap editor in Stack to overlay collaborator cursors
    // Use UniqueKey based on _quillEditorKey to force complete widget tree recreation
    // This ensures flutter_quill's internal GlobalKeys are also recreated
    return Stack(
      key: ValueKey('stack_$_quillEditorKey'),
      children: [
        // The actual Quill editor - use UniqueKey to force complete recreation
        // The key on QuillEditor itself is critical to avoid GlobalKey conflicts
        KeyedSubtree(
          key: ValueKey('keyed_subtree_$_quillEditorKey'),
          child: QuillEditor(
            key: ValueKey('quill_editor_$_quillEditorKey'),
            focusNode: _contentFocusNode,
            controller: _quillController,
            scrollController: _editorScrollController,
          ),
        ),
        // Collaborator cursor overlays
        ..._buildCollaboratorCursors(),
      ],
    );
  }

  /// Build cursor overlay widgets for each collaborator
  List<Widget> _buildCollaboratorCursors() {
    final cursors = <Widget>[];

    for (final collaborator in _collaborators) {
      if (collaborator.cursorIndex != null && collaborator.cursorIndex! >= 0) {
        // Calculate approximate position based on cursor index
        // This is a rough estimation - proper implementation would need
        // access to the text layout metrics
        final cursorPosition = _calculateCursorPosition(collaborator.cursorIndex!);

        if (cursorPosition != null) {
          cursors.add(
            Positioned(
              top: cursorPosition.dy,
              left: cursorPosition.dx,
              child: _CollaboratorCursorWidget(
                name: collaborator.name,
                color: _parseCollaboratorColor(collaborator.color),
              ),
            ),
          );
        }
      }
    }

    return cursors;
  }

  /// Calculate pixel-perfect cursor position from text index
  /// Uses TextPainter to measure actual text dimensions with word wrap support
  Offset? _calculateCursorPosition(int index) {
    try {
      // Get the document text
      final plainText = _quillController.document.toPlainText();
      if (index > plainText.length) return null;

      debugPrint('[CursorCalc] Index: $index, Total length: ${plainText.length}');
      debugPrint('[CursorCalc] Plain text first 100 chars: ${plainText.substring(0, plainText.length > 100 ? 100 : plainText.length)}');

      // QuillEditor default text style - must match exactly
      final textStyle = TextStyle(
        fontSize: 16.0,
        height: 1.3,
        fontFamily: 'Roboto',
      );

      // Get the editor width for word wrapping calculation
      // This should match the actual editor width
      final editorWidth = MediaQuery.of(context).size.width - 32; // Subtract horizontal padding

      // QuillEditor internal padding
      const editorPaddingTop = 12.0;
      const editorPaddingLeft = 0.0;

      // Get text up to the cursor position
      final textBeforeCursor = plainText.substring(0, index);

      // Use TextPainter with maxLines and width to handle word wrapping
      final fullTextPainter = TextPainter(
        text: TextSpan(text: textBeforeCursor, style: textStyle),
        textDirection: ui.TextDirection.ltr,
        maxLines: null,
      )..layout(maxWidth: editorWidth);

      // Get the position of the last character (cursor position)
      final cursorOffset = fullTextPainter.getOffsetForCaret(
        TextPosition(offset: textBeforeCursor.length),
        Rect.zero,
      );

      debugPrint('[CursorCalc] Calculated offset: $cursorOffset');

      final left = editorPaddingLeft + cursorOffset.dx;
      final top = editorPaddingTop + cursorOffset.dy;

      return Offset(left, top);
    } catch (e) {
      debugPrint('[NoteEditor] Error calculating cursor position: $e');
      return null;
    }
  }

  /// Parse collaborator color string to Color
  Color _parseCollaboratorColor(String colorStr) {
    try {
      if (colorStr.startsWith('#')) {
        final hex = colorStr.substring(1);
        if (hex.length == 6) {
          return Color(int.parse('FF$hex', radix: 16));
        }
      }
    } catch (e) {
      // Fall through to default
    }
    return Colors.blue;
  }

  /// Build a simple live indicator when collaboration is active but you're alone
  Widget _buildLiveIndicator() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: Colors.green,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.green.withOpacity(0.5),
                blurRadius: 4,
                spreadRadius: 1,
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        Text(
          'Live',
          style: TextStyle(
            fontSize: 12,
            color: Colors.green,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: Text(
          widget.note == null ? 'notes_editor.create_note'.tr() : widget.note!.title,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          // Live collaboration indicator
          if (_isCollaborationEnabled)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: _collaborators.isNotEmpty
                  ? CollaboratorIndicator(
                      collaborators: _collaborators,
                      maxVisible: 3,
                    )
                  : _buildLiveIndicator(),
            ),
          // Import button - available for all notes
          IconButton(
            icon: const Icon(Icons.file_upload_outlined),
            onPressed: _importFileContent,
            tooltip: 'notes_import.title'.tr(),
          ),
          TextButton(
            onPressed: (_canSave && !_isSaving) ? _saveNote : null,
            child: _isSaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Text('notes_editor.save'.tr()),
          ),
          if (widget.note != null) ...[
            IconButton(
              icon: const Icon(Icons.share),
              onPressed: _showShareDialog,
              tooltip: 'notes_editor.share_note_tooltip'.tr(),
            ),
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'document_info':
                    _showDocumentInfo();
                    break;
                  // TODO: Collaborators feature not functional yet
                  // case 'collaborators':
                  //   _showCollaborators();
                  //   break;
                  case 'recent_activity':
                    _showRecentActivity();
                    break;
                  case 'quick_actions':
                    _showQuickActions();
                    break;
                  case 'import':
                    _importFileContent();
                    break;
                  case 'delete':
                    _deleteNote();
                    break;
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'document_info',
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline),
                      const SizedBox(width: 8),
                      Text('notes_editor.document_info'.tr()),
                    ],
                  ),
                ),
                // TODO: Collaborators feature not functional yet
                // const PopupMenuItem(
                //   value: 'collaborators',
                //   child: Row(
                //     children: [
                //       Icon(Icons.people_outline),
                //       SizedBox(width: 8),
                //       Text('Collaborators'),
                //     ],
                //   ),
                // ),
                PopupMenuItem(
                  value: 'recent_activity',
                  child: Row(
                    children: [
                      const Icon(Icons.history),
                      const SizedBox(width: 8),
                      Text('notes_editor.document_info'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'quick_actions',
                  child: Row(
                    children: [
                      const Icon(Icons.flash_on),
                      const SizedBox(width: 8),
                      Text('notes_editor.quick_actions'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'import',
                  child: Row(
                    children: [
                      const Icon(Icons.file_upload_outlined),
                      const SizedBox(width: 8),
                      Text('notes_import.title'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(Icons.delete, color: Colors.red),
                      const SizedBox(width: 8),
                      Text('common.delete'.tr(), style: const TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
            // Content area
            Expanded(
              child: Column(
                children: [
                  // Metadata section
                  Container(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Icon and Title Row
                        Row(
                          children: [
                            InkWell(
                              onTap: _selectIcon,
                              child: Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Center(
                                  child: Text(
                                    _selectedIcon,
                                    style: const TextStyle(fontSize: 24),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _titleController,
                                focusNode: _titleFocusNode,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                                decoration: InputDecoration(
                                  hintText: 'notes_editor.enter_title'.tr(),
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                ),
                                textInputAction: TextInputAction.next,
                                onSubmitted: (_) {
                                  _contentFocusNode.requestFocus();
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 16),

                  // AI Improvement and Attach Buttons
                  Container(
                    margin: const EdgeInsets.only(left: 16, bottom: 8),
                    child: Row(
                      children: [
                        // AI Improvement Button
                        if (_showAIImprovement)
                          InkWell(
                            onTap: _showImproveWithAI,
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.1),
                                border: Border.all(
                                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
                                  width: 1,
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.auto_awesome,
                                    size: 18,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'notes_editor.improve_using_ai'.tr(),
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      color: Theme.of(context).colorScheme.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        if (_showAIImprovement) const SizedBox(width: 8),
                        // Attach Button - opens attachment picker bottom sheet
                        InkWell(
                          onTap: () {
                            _showAttachmentPicker();
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                            decoration: BoxDecoration(
                              color: Colors.orange.withValues(alpha: 0.1),
                              border: Border.all(
                                color: Colors.orange.withValues(alpha: 0.3),
                                width: 1,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.attach_file,
                                  size: 18,
                                  color: Colors.orange,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'notes_editor.attach_to_note'.tr(),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: Colors.orange,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Display linked items using AttachmentFieldWidget
                  if (_linkedItems.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      child: AttachmentFieldWidget(
                        attachments: _linkedItems
                            .map((item) => AttachmentItem.fromMap(item))
                            .toList(),
                        onRemoveAttachment: (attachment) {
                          setState(() {
                            _linkedItems.removeWhere(
                              (item) => item['id'] == attachment.id && item['type'] == attachment.type.value,
                            );
                          });
                        },
                        onTapAttachment: _handleAttachmentTap,
                        isCompact: true,
                      ),
                    ),
                  
                  // Text Styling Toolbar
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: QuillSimpleToolbar(
                        controller: _quillController,
                        config: const QuillSimpleToolbarConfig(
                          showFontFamily: false,
                          showFontSize: true,
                          showBoldButton: true,
                          showItalicButton: true,
                          showUnderLineButton: true,
                          showStrikeThrough: true,
                          showColorButton: true,
                          showBackgroundColorButton: true,
                          showClearFormat: true,
                          showAlignmentButtons: true,
                          showLeftAlignment: true,
                          showCenterAlignment: true,
                          showRightAlignment: true,
                          showJustifyAlignment: true,
                          showHeaderStyle: true,
                          showListNumbers: true,
                          showListBullets: true,
                          showListCheck: true,
                          showCodeBlock: true,
                          showQuote: true,
                          showIndent: true,
                          showLink: true,
                          showSearchButton: false,
                          showInlineCode: true,
                          showUndo: true,
                          showRedo: true,
                        ),
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Content Editor
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _buildContentEditor(),
                    ),
                  ),
                ],
              ),
            ),
            ],
          ),
          // Loading overlay
          if (_isSaving)
            AbsorbPointer(
              absorbing: true,
              child: Container(
                color: Colors.black.withValues(alpha: 0.3),
                child: Center(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(),
                          const SizedBox(height: 16),
                          Text(
                            widget.note == null ? 'Creating note...' : 'Updating note...',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// TODO: Collaborators feature not functional yet - widget kept for future implementation
// This widget is currently not used as the menu items calling it are commented out
class _CollaboratorsBottomSheet extends StatefulWidget {
  final Note? note;
  final Function(List<Collaborator>) onCollaboratorsChanged;

  const _CollaboratorsBottomSheet({
    required this.note,
    required this.onCollaboratorsChanged,
  });

  @override
  State<_CollaboratorsBottomSheet> createState() => _CollaboratorsBottomSheetState();
}

class _CollaboratorsBottomSheetState extends State<_CollaboratorsBottomSheet> {
  late List<Collaborator> _collaborators;
  final TextEditingController _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _collaborators = widget.note?.collaborators ?? [];
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.5,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    const Icon(Icons.people, size: 24),
                    const SizedBox(width: 12),
                    Text(
                      'Collaborators',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    // Current user section
                    _buildOwnerSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Shared users section
                    _buildSharedUsersSection(),
                    
                    const SizedBox(height: 24),
                    
                    // Add collaborator section
                    _buildAddCollaboratorSection(),
                    
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOwnerSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Owner entry
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              // Avatar
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [Colors.orange, Colors.deepOrange],
                  ),
                ),
                child: const Center(
                  child: Text(
                    '👤',
                    style: TextStyle(fontSize: 18),
                  ),
                ),
              ),
              
              const SizedBox(width: 12),
              
              // User info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'You',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Owner • Created about 1 hour ago',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              
              // Role badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  'Owner',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSharedUsersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_collaborators.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Text(
                'No shared users',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
                ),
              ),
            ),
          )
        else
          ..._collaborators.map((collaborator) => _buildCollaboratorItem(collaborator)),
      ],
    );
  }

  Widget _buildCollaboratorItem(Collaborator collaborator) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          // Avatar
          CircleAvatar(
            radius: 20,
            backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
            child: Text(
              collaborator.avatar,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
          
          const SizedBox(width: 12),
          
          // User info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  collaborator.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  collaborator.email,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          
          // Role dropdown
          PopupMenuButton<CollaboratorRole>(
            initialValue: collaborator.role,
            onSelected: (role) => _changeCollaboratorRole(collaborator, role),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: collaborator.role == CollaboratorRole.editor
                    ? Colors.blue.withValues(alpha: 0.1)
                    : Colors.grey.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: collaborator.role == CollaboratorRole.editor
                      ? Colors.blue.withValues(alpha: 0.3)
                      : Colors.grey.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    collaborator.role.name.substring(0, 1).toUpperCase() + 
                    collaborator.role.name.substring(1),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: collaborator.role == CollaboratorRole.editor
                          ? Colors.blue
                          : Colors.grey[700],
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.keyboard_arrow_down,
                    size: 16,
                    color: collaborator.role == CollaboratorRole.editor
                        ? Colors.blue
                        : Colors.grey[700],
                  ),
                ],
              ),
            ),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: CollaboratorRole.editor,
                child: Text('Editor'),
              ),
              const PopupMenuItem(
                value: CollaboratorRole.viewer,
                child: Text('Viewer'),
              ),
            ],
          ),
          
          const SizedBox(width: 8),
          
          // Remove button
          IconButton(
            onPressed: () => _removeCollaborator(collaborator),
            icon: const Icon(Icons.close, size: 18),
            color: Colors.grey[600],
          ),
        ],
      ),
    );
  }

  Widget _buildAddCollaboratorSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Add collaborator',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _emailController,
                decoration: InputDecoration(
                  hintText: 'Enter email address',
                  prefixIcon: const Icon(Icons.email_outlined),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
                keyboardType: TextInputType.emailAddress,
                onSubmitted: (_) => _addCollaborator(),
              ),
            ),
            const SizedBox(width: 12),
            
            ElevatedButton(
              onPressed: _isLoading ? null : _addCollaborator,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Add'),
            ),
          ],
        ),
      ],
    );
  }

  void _addCollaborator() {
    final email = _emailController.text.trim();
    if (email.isEmpty || !RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please enter a valid email address'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Check if collaborator already exists
    if (_collaborators.any((c) => c.email.toLowerCase() == email.toLowerCase())) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('This collaborator is already added'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    // Create new collaborator
    final newCollaborator = Collaborator(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: email.split('@').first, // Use email prefix as name
      email: email,
      avatar: email.substring(0, 1).toUpperCase(),
      role: CollaboratorRole.viewer, // Default to viewer
      addedAt: DateTime.now(),
    );

    setState(() {
      _collaborators.add(newCollaborator);
      _emailController.clear();
      _isLoading = false;
    });

    // Update the note with new collaborators
    widget.onCollaboratorsChanged(_collaborators);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.person_add, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text('Added ${newCollaborator.name} as collaborator'),
          ],
        ),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _removeCollaborator(Collaborator collaborator) async {
    setState(() {
      _collaborators.removeWhere((c) => c.id == collaborator.id);
    });
    
    // Update the note with new collaborators
    await widget.onCollaboratorsChanged(_collaborators);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.person_remove, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text('Removed ${collaborator.name}'),
            ],
          ),
          backgroundColor: Colors.orange,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _changeCollaboratorRole(Collaborator collaborator, CollaboratorRole newRole) async {
    setState(() {
      final index = _collaborators.indexWhere((c) => c.id == collaborator.id);
      if (index != -1) {
        _collaborators[index] = collaborator.copyWith(role: newRole);
      }
    });
    
    // Update the note with new collaborators
    await widget.onCollaboratorsChanged(_collaborators);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.swap_horiz, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text('Changed ${collaborator.name} to ${newRole.name}'),
            ],
          ),
          backgroundColor: Colors.blue,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }
}

class _RecentActivityBottomSheet extends StatelessWidget {
  final Note? note;

  const _RecentActivityBottomSheet({required this.note});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.8,
      minChildSize: 0.4,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    const Icon(Icons.history, size: 24),
                    const SizedBox(width: 12),
                    Text(
                      'Recent Activity',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              
              Expanded(
                child: _buildActivityList(context, scrollController),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActivityList(BuildContext context, ScrollController scrollController) {
    // Get activities from the note and sort by most recent first
    final activities = _getActivities();
    activities.sort((a, b) => b.timestamp.compareTo(a.timestamp));

    if (activities.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text(
            'No recent activity',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey,
            ),
          ),
        ),
      );
    }

    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: activities.length,
      itemBuilder: (context, index) {
        final activity = activities[index];
        return _buildActivityItem(context, activity);
      },
    );
  }

  Widget _buildActivityItem(BuildContext context, Activity activity) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          // Activity icon or user avatar
          _buildActivityIcon(context, activity),
          
          const SizedBox(width: 12),
          
          // Activity content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getActivityDescription(activity),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatActivityTime(activity.timestamp),
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityIcon(BuildContext context, Activity activity) {
    // Use the activity's built-in icon and color methods
    final iconColor = activity.getColor(context);

    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: iconColor.withValues(alpha: 0.15),
      ),
      child: Icon(
        activity.icon,
        color: iconColor,
        size: 22,
      ),
    );
  }

  String _getActivityDescription(Activity activity) {
    final userName = activity.userName == 'You' ? 'You' : activity.userName;

    switch (activity.type) {
      case ActivityType.created:
        return '$userName created this note';
      case ActivityType.updated:
        // Check metadata for more detailed update info
        final updateType = activity.metadata?['updateType'] as String?;
        if (updateType != null) {
          switch (updateType) {
            case 'title':
              return '$userName changed the note title';
            case 'content':
              return '$userName edited the note content';
            case 'attachments':
              return '$userName modified attachments';
            case 'auto_save':
              return 'Note was auto-saved';
            default:
              return '$userName updated this note';
          }
        }
        return '$userName updated this note';
      case ActivityType.shared:
        final sharedWith = activity.metadata?['sharedWith'] as String?;
        if (sharedWith != null) {
          return '$userName shared this note with $sharedWith';
        }
        return '$userName shared this note';
      case ActivityType.favorited:
        return '$userName added this note to favorites';
      case ActivityType.unfavorited:
        return '$userName removed this note from favorites';
      case ActivityType.collaboratorAdded:
        final collaborator = activity.metadata?['collaborator'] as String?;
        if (collaborator != null) {
          return '$userName added $collaborator as a collaborator';
        }
        return '$userName added a collaborator';
      case ActivityType.collaboratorRemoved:
        final collaborator = activity.metadata?['collaborator'] as String?;
        if (collaborator != null) {
          return '$userName removed $collaborator from collaborators';
        }
        return '$userName removed a collaborator';
      case ActivityType.collaboratorRoleChanged:
        final collaborator = activity.metadata?['collaborator'] as String?;
        final newRole = activity.metadata?['newRole'] as String?;
        if (collaborator != null && newRole != null) {
          return "$userName changed $collaborator's role to $newRole";
        }
        return '$userName changed a collaborator\'s role';
    }
  }

  String _formatActivityTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} minutes ago';
    } else if (difference.inHours < 24) {
      if (difference.inHours == 1) {
        return 'about 1 hour ago';
      }
      return '${difference.inHours} hours ago';
    } else if (difference.inDays == 1) {
      return 'yesterday';
    } else {
      return '${difference.inDays} days ago';
    }
  }

  List<Activity> _getActivities() {
    if (note == null) return [];

    // Use actual activities from the note if available
    if (note!.activities.isNotEmpty) {
      return List<Activity>.from(note!.activities);
    }

    // Fallback: Generate basic activities from note metadata
    final activities = <Activity>[];

    // Add created activity based on note's createdAt
    activities.add(Activity(
      id: 'created_${note!.id}',
      noteId: note!.id,
      userId: 'current_user',
      userName: 'You',
      userAvatar: '👤',
      type: ActivityType.created,
      description: 'created this note',
      timestamp: note!.createdAt,
    ));

    // Add updated activity if the note has been updated after creation
    if (note!.updatedAt.isAfter(note!.createdAt.add(const Duration(seconds: 1)))) {
      activities.add(Activity(
        id: 'updated_${note!.id}',
        noteId: note!.id,
        userId: 'current_user',
        userName: 'You',
        userAvatar: '👤',
        type: ActivityType.updated,
        description: 'updated this note',
        timestamp: note!.updatedAt,
        metadata: const {'updateType': 'content'},
      ));
    }

    // Add favorite activity if the note is favorited
    if (note!.isFavorite) {
      activities.add(Activity(
        id: 'favorited_${note!.id}',
        noteId: note!.id,
        userId: 'current_user',
        userName: 'You',
        userAvatar: '👤',
        type: ActivityType.favorited,
        description: 'added to favorites',
        timestamp: note!.updatedAt.subtract(const Duration(minutes: 5)),
      ));
    }

    return activities;
  }
}

/// Widget to display a collaborator's cursor in the editor
class _CollaboratorCursorWidget extends StatelessWidget {
  final String name;
  final Color color;

  const _CollaboratorCursorWidget({
    required this.name,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Cursor line (positioned at the exact cursor location)
        Container(
          width: 2,
          height: 24,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(1),
          ),
        ),
        // Name label (to the right of cursor)
        Transform.translate(
          offset: const Offset(0, -16), // Position label above the line
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: color,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(4),
                bottomRight: Radius.circular(4),
              ),
            ),
            child: Text(
              name,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ],
    );
  }
}