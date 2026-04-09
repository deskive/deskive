import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';

/// A rich text editor widget for creating/editing document content
class DocumentContentEditor extends StatefulWidget {
  final Map<String, dynamic>? initialContent;
  final Function(Map<String, dynamic> content, String html)? onContentChanged;
  final bool isEditable;
  final String placeholder;

  const DocumentContentEditor({
    super.key,
    this.initialContent,
    this.onContentChanged,
    this.isEditable = true,
    this.placeholder = 'Start writing your document...',
  });

  @override
  State<DocumentContentEditor> createState() => DocumentContentEditorState();
}

class DocumentContentEditorState extends State<DocumentContentEditor> {
  late QuillController _controller;
  late FocusNode _focusNode;
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _scrollController = ScrollController();
    _initializeController();
  }

  void _initializeController() {
    if (widget.initialContent != null && widget.initialContent!.isNotEmpty) {
      try {
        // Try to parse as Quill Delta JSON
        final ops = widget.initialContent!['ops'] as List<dynamic>?;
        if (ops != null) {
          final doc = Document.fromJson(widget.initialContent!['ops']);
          _controller = QuillController(
            document: doc,
            selection: const TextSelection.collapsed(offset: 0),
            readOnly: !widget.isEditable,
          );
        } else {
          _controller = QuillController.basic();
          _controller.readOnly = !widget.isEditable;
        }
      } catch (e) {
        _controller = QuillController.basic();
        _controller.readOnly = !widget.isEditable;
      }
    } else {
      _controller = QuillController.basic();
      _controller.readOnly = !widget.isEditable;
    }

    _controller.addListener(_onContentChanged);
  }

  @override
  void dispose() {
    _controller.removeListener(_onContentChanged);
    _controller.dispose();
    _focusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onContentChanged() {
    if (widget.onContentChanged != null) {
      final content = getContent();
      final html = getHtml();
      widget.onContentChanged!(content, html);
    }
  }

  /// Get the content as Quill Delta JSON
  Map<String, dynamic> getContent() {
    return {'ops': _controller.document.toDelta().toJson()};
  }

  /// Get the content as HTML
  String getHtml() {
    try {
      final delta = _controller.document.toDelta().toJson();
      final converter = QuillDeltaToHtmlConverter(
        List<Map<String, dynamic>>.from(delta),
        ConverterOptions.forEmail(),
      );
      return converter.convert();
    } catch (e) {
      return '';
    }
  }

  /// Get plain text content
  String getPlainText() {
    return _controller.document.toPlainText();
  }

  /// Set content from Quill Delta JSON
  void setContent(Map<String, dynamic> content) {
    try {
      final ops = content['ops'] as List<dynamic>?;
      if (ops != null) {
        final doc = Document.fromJson(ops);
        _controller.document = doc;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  /// Insert predefined content at current position
  void insertPredefinedContent(List<Map<String, dynamic>> ops) {
    try {
      final index = _controller.selection.baseOffset;
      for (final op in ops) {
        if (op.containsKey('insert')) {
          final insert = op['insert'];
          if (insert is String) {
            _controller.document.insert(index, insert);

            // Apply attributes if present
            if (op.containsKey('attributes')) {
              final attrs = op['attributes'] as Map<String, dynamic>;
              for (final entry in attrs.entries) {
                final attribute = _getAttributeFromKey(entry.key, entry.value);
                if (attribute != null) {
                  _controller.formatText(index, insert.length, attribute);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  Attribute? _getAttributeFromKey(String key, dynamic value) {
    switch (key) {
      case 'bold':
        return value == true ? Attribute.bold : null;
      case 'italic':
        return value == true ? Attribute.italic : null;
      case 'underline':
        return value == true ? Attribute.underline : null;
      case 'header':
        if (value == 1) return Attribute.h1;
        if (value == 2) return Attribute.h2;
        if (value == 3) return Attribute.h3;
        return null;
      default:
        return null;
    }
  }

  /// Check if editor has content
  bool get hasContent => _controller.document.length > 1;

  /// Focus the editor
  void focus() => _focusNode.requestFocus();

  /// Unfocus the editor
  void unfocus() => _focusNode.unfocus();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        if (widget.isEditable) _buildToolbar(isDark),
        Expanded(child: _buildEditor(isDark)),
      ],
    );
  }

  Widget _buildToolbar(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[850] : Colors.grey[50],
        border: Border(
          bottom: BorderSide(
            color: isDark ? Colors.white12 : Colors.grey[300]!,
          ),
        ),
      ),
      child: QuillSimpleToolbar(
        controller: _controller,
        config: QuillSimpleToolbarConfig(
          showDividers: true,
          showFontFamily: false,
          showFontSize: true,
          showBoldButton: true,
          showItalicButton: true,
          showUnderLineButton: true,
          showStrikeThrough: false,
          showInlineCode: false,
          showColorButton: false,
          showBackgroundColorButton: false,
          showClearFormat: true,
          showAlignmentButtons: true,
          showLeftAlignment: true,
          showCenterAlignment: true,
          showRightAlignment: true,
          showJustifyAlignment: false,
          showHeaderStyle: true,
          showListNumbers: true,
          showListBullets: true,
          showListCheck: false,
          showCodeBlock: false,
          showQuote: true,
          showIndent: true,
          showLink: true,
          showUndo: true,
          showRedo: true,
          multiRowsDisplay: false,
          showDirection: false,
          showSearchButton: false,
        ),
      ),
    );
  }

  Widget _buildEditor(bool isDark) {
    return Container(
      color: isDark ? Colors.grey[900] : Colors.white,
      child: QuillEditor(
        controller: _controller,
        focusNode: _focusNode,
        scrollController: _scrollController,
        config: QuillEditorConfig(
          scrollable: true,
          autoFocus: false,
          placeholder: widget.placeholder,
          expands: true,
          padding: const EdgeInsets.all(16),
        ),
      ),
    );
  }
}
