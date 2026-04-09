import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'dart:convert';

class RichTextEditor extends StatefulWidget {
  final String? initialContent;
  final Function(String content)? onContentChanged;
  final bool isEditable;

  const RichTextEditor({
    Key? key,
    this.initialContent,
    this.onContentChanged,
    this.isEditable = true,
  }) : super(key: key);

  @override
  State<RichTextEditor> createState() => _RichTextEditorState();
}

class _RichTextEditorState extends State<RichTextEditor> {
  late QuillController _controller;
  late FocusNode _focusNode;
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _scrollController = ScrollController();

    // Initialize controller with content
    if (widget.initialContent != null && widget.initialContent!.isNotEmpty) {
      try {
        // Try to parse as Quill Delta JSON
        final delta = Document.fromJson(jsonDecode(widget.initialContent!));
        _controller = QuillController(
          document: delta,
          selection: const TextSelection.collapsed(offset: 0),
          readOnly: !widget.isEditable,
        );
      } catch (e) {
        // If parsing fails, treat as plain text
        _controller = QuillController.basic();
        _controller.document.insert(0, widget.initialContent!);
        _controller.readOnly = !widget.isEditable;
      }
    } else {
      _controller = QuillController.basic();
      _controller.readOnly = !widget.isEditable;
    }

    // Listen to content changes
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
      final deltaJson = jsonEncode(_controller.document.toDelta().toJson());
      widget.onContentChanged!(deltaJson);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (widget.isEditable) _buildToolbar(),
        Expanded(child: _buildEditor()),
      ],
    );
  }

  Widget _buildToolbar() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(
          bottom: BorderSide(
            color: Colors.grey.withOpacity(0.2),
          ),
        ),
      ),
      child: QuillSimpleToolbar(
        controller: _controller,
        config: const QuillSimpleToolbarConfig(
          showDividers: false,
          showFontFamily: false,
          showFontSize: true,
          showBoldButton: true,
          showItalicButton: true,
          showUnderLineButton: true,
          showStrikeThrough: true,
          showInlineCode: true,
          showColorButton: true,
          showBackgroundColorButton: true,
          showClearFormat: true,
          showAlignmentButtons: true,
          showLeftAlignment: true,
          showCenterAlignment: true,
          showRightAlignment: true,
          showJustifyAlignment: false,
          showHeaderStyle: true,
          showListNumbers: true,
          showListBullets: true,
          showListCheck: true,
          showCodeBlock: true,
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

  Widget _buildEditor() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: QuillEditor(
        controller: _controller,
        focusNode: _focusNode,
        scrollController: _scrollController,
        config: QuillEditorConfig(
          scrollable: true,
          autoFocus: false,
          placeholder: 'Start typing your note...',
          expands: false,
          padding: EdgeInsets.zero,
        ),
      ),
    );
  }

  // Helper methods for external access
  String getPlainText() {
    return _controller.document.toPlainText();
  }

  String getDeltaJson() {
    return jsonEncode(_controller.document.toDelta().toJson());
  }

  void setContent(String content) {
    try {
      // Try to parse as Quill Delta JSON
      final delta = Document.fromJson(jsonDecode(content));
      _controller.document = delta;
    } catch (e) {
      // If parsing fails, clear and insert as plain text
      _controller.clear();
      _controller.document.insert(0, content);
    }
  }

  void insertText(String text) {
    final index = _controller.selection.baseOffset;
    _controller.document.insert(index, text);
    _controller.updateSelection(
      TextSelection.collapsed(offset: index + text.length),
      ChangeSource.local,
    );
  }

  void formatSelection(Attribute attribute) {
    _controller.formatSelection(attribute);
  }

  void insertEmbed(int index, Embeddable embed) {
    _controller.document.insert(index, embed);
  }

  bool get hasContent {
    return _controller.document.length > 1;
  }

  void focus() {
    _focusNode.requestFocus();
  }

  void unfocus() {
    _focusNode.unfocus();
  }
}

// Extension for easier Quill operations
extension QuillControllerExtensions on QuillController {
  Attribute _getHeaderAttribute(int level) {
    switch (level) {
      case 1:
        return Attribute.h1;
      case 2:
        return Attribute.h2;
      case 3:
        return Attribute.h3;
      default:
        return Attribute.h1;
    }
  }

  void insertHeader(int level, String text) {
    final index = selection.baseOffset;
    document.insert(index, text);
    formatText(index, text.length, _getHeaderAttribute(level));
    updateSelection(
      TextSelection.collapsed(offset: index + text.length),
      ChangeSource.local,
    );
  }

  void insertBulletPoint(String text) {
    final index = selection.baseOffset;
    document.insert(index, text);
    formatText(index, text.length, Attribute.ul);
    updateSelection(
      TextSelection.collapsed(offset: index + text.length),
      ChangeSource.local,
    );
  }

  void insertNumberedList(String text) {
    final index = selection.baseOffset;
    document.insert(index, text);
    formatText(index, text.length, Attribute.ol);
    updateSelection(
      TextSelection.collapsed(offset: index + text.length),
      ChangeSource.local,
    );
  }

  void insertCheckbox(String text, bool checked) {
    final index = selection.baseOffset;
    document.insert(index, text);
    formatText(index, text.length, checked ? Attribute.checked : Attribute.unchecked);
    updateSelection(
      TextSelection.collapsed(offset: index + text.length),
      ChangeSource.local,
    );
  }

  void insertCodeBlock(String code) {
    final index = selection.baseOffset;
    document.insert(index, code);
    formatText(index, code.length, Attribute.codeBlock);
    updateSelection(
      TextSelection.collapsed(offset: index + code.length),
      ChangeSource.local,
    );
  }

  void insertQuote(String quote) {
    final index = selection.baseOffset;
    document.insert(index, quote);
    formatText(index, quote.length, Attribute.blockQuote);
    updateSelection(
      TextSelection.collapsed(offset: index + quote.length),
      ChangeSource.local,
    );
  }
}

// Custom toolbar for specific actions
class CustomQuillToolbar extends StatelessWidget {
  final QuillController controller;
  final VoidCallback? onInsertImage;
  final VoidCallback? onInsertTable;
  final VoidCallback? onInsertLink;

  const CustomQuillToolbar({
    Key? key,
    required this.controller,
    this.onInsertImage,
    this.onInsertTable,
    this.onInsertLink,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(
          bottom: BorderSide(
            color: Colors.grey.withOpacity(0.2),
          ),
        ),
      ),
      child: Row(
        children: [
          // Template buttons
          _buildToolbarButton(
            icon: Icons.format_size,
            tooltip: 'Insert Header',
            onPressed: () => _insertHeader(context),
          ),
          _buildToolbarButton(
            icon: Icons.format_list_bulleted,
            tooltip: 'Insert Bullet Point',
            onPressed: () => _insertBulletPoint(),
          ),
          _buildToolbarButton(
            icon: Icons.format_list_numbered,
            tooltip: 'Insert Numbered List',
            onPressed: () => _insertNumberedList(),
          ),
          _buildToolbarButton(
            icon: Icons.check_box,
            tooltip: 'Insert Checkbox',
            onPressed: () => _insertCheckbox(),
          ),
          const VerticalDivider(),
          _buildToolbarButton(
            icon: Icons.code,
            tooltip: 'Insert Code Block',
            onPressed: () => _insertCodeBlock(),
          ),
          _buildToolbarButton(
            icon: Icons.format_quote,
            tooltip: 'Insert Quote',
            onPressed: () => _insertQuote(),
          ),
          const VerticalDivider(),
          if (onInsertImage != null)
            _buildToolbarButton(
              icon: Icons.image,
              tooltip: 'Insert Image',
              onPressed: onInsertImage!,
            ),
          if (onInsertTable != null)
            _buildToolbarButton(
              icon: Icons.table_chart,
              tooltip: 'Insert Table',
              onPressed: onInsertTable!,
            ),
          if (onInsertLink != null)
            _buildToolbarButton(
              icon: Icons.link,
              tooltip: 'Insert Link',
              onPressed: onInsertLink!,
            ),
        ],
      ),
    );
  }

  Widget _buildToolbarButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onPressed,
        child: Container(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 20),
        ),
      ),
    );
  }

  void _insertHeader(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Insert Header'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Header 1'),
              onTap: () {
                Navigator.of(context).pop();
                controller.insertHeader(1, 'Header 1\n');
              },
            ),
            ListTile(
              title: const Text('Header 2'),
              onTap: () {
                Navigator.of(context).pop();
                controller.insertHeader(2, 'Header 2\n');
              },
            ),
            ListTile(
              title: const Text('Header 3'),
              onTap: () {
                Navigator.of(context).pop();
                controller.insertHeader(3, 'Header 3\n');
              },
            ),
          ],
        ),
      ),
    );
  }

  void _insertBulletPoint() {
    controller.insertBulletPoint('• Bullet point\n');
  }

  void _insertNumberedList() {
    controller.insertNumberedList('1. Numbered item\n');
  }

  void _insertCheckbox() {
    controller.insertCheckbox('☐ Checkbox item\n', false);
  }

  void _insertCodeBlock() {
    controller.insertCodeBlock('// Code block\nconst example = true;\n');
  }

  void _insertQuote() {
    controller.insertQuote('This is a quote\n');
  }
}
