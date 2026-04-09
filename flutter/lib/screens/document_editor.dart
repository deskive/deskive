import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;

class DocumentEditor extends StatefulWidget {
  final String? documentId;
  final String? initialContent;

  const DocumentEditor({
    super.key,
    this.documentId,
    this.initialContent,
  });

  @override
  State<DocumentEditor> createState() => _DocumentEditorState();
}

class _DocumentEditorState extends State<DocumentEditor> {
  late quill.QuillController _controller;
  final FocusNode _focusNode = FocusNode();
  bool _isReadOnly = false;
  String _documentTitle = 'Untitled Document';
  bool _hasUnsavedChanges = false;

  @override
  void initState() {
    super.initState();
    _initializeDocument();
  }

  void _initializeDocument() {
    if (widget.initialContent != null) {
      // In a real app, you'd parse the content properly
      _controller = quill.QuillController.basic();
    } else {
      _controller = quill.QuillController.basic();
    }
    
    _controller.addListener(() {
      if (!_hasUnsavedChanges) {
        setState(() {
          _hasUnsavedChanges = true;
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: _showRenameDialog,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_documentTitle),
              const SizedBox(width: 4),
              const Icon(Icons.edit, size: 16),
            ],
          ),
        ),
        actions: [
          if (_hasUnsavedChanges)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Unsaved',
                style: TextStyle(
                  color: Colors.orange,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          IconButton(
            icon: Icon(_isReadOnly ? Icons.edit : Icons.visibility),
            onPressed: () {
              setState(() {
                _isReadOnly = !_isReadOnly;
              });
            },
            tooltip: _isReadOnly ? 'Edit' : 'Preview',
          ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _shareDocument,
          ),
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'save', child: Text('Save')),
              const PopupMenuItem(value: 'export_pdf', child: Text('Export as PDF')),
              const PopupMenuItem(value: 'export_word', child: Text('Export as Word')),
              const PopupMenuItem(value: 'version_history', child: Text('Version History')),
              const PopupMenuItem(value: 'delete', child: Text('Delete Document')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Toolbar
          if (!_isReadOnly) ...[
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                  ),
                ),
              ),
              child: quill.QuillSimpleToolbar(
                controller: _controller,
                configurations: const quill.QuillSimpleToolbarConfigurations(
                  showFontFamily: false,
                  showFontSize: false,
                  showBoldButton: true,
                  showItalicButton: true,
                  showUnderLineButton: true,
                  showStrikeThrough: true,
                  showColorButton: true,
                  showBackgroundColorButton: true,
                  showListNumbers: true,
                  showListBullets: true,
                  showCodeBlock: true,
                  showQuote: true,
                  showIndent: true,
                  showLink: true,
                  showSearchButton: false,
                ),
              ),
            ),
          ],
          
          // Document Stats Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
            ),
            child: Row(
              children: [
                Text(
                  'Words: ${_getWordCount()}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(width: 16),
                Text(
                  'Characters: ${_getCharacterCount()}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const Spacer(),
                if (!_isReadOnly)
                  Row(
                    children: [
                      Icon(
                        Icons.people,
                        size: 16,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '3 collaborators',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
              ],
            ),
          ),
          
          // Editor
          Expanded(
            child: Container(
              color: Theme.of(context).colorScheme.surface,
              child: quill.QuillEditor.basic(
                controller: _controller,
                focusNode: _focusNode,
                configurations: quill.QuillEditorConfigurations(
                  padding: const EdgeInsets.all(16),
                  placeholder: 'Start writing your document...',
                ),
              ),
            ),
          ),
          
          // Collaboration Bar
          if (!_isReadOnly)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(
                  top: BorderSide(
                    color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                  ),
                ),
              ),
              child: Row(
                children: [
                  // Active Collaborators
                  Row(
                    children: [
                      _buildCollaboratorAvatar('JD', Colors.blue),
                      _buildCollaboratorAvatar('JS', Colors.green),
                      _buildCollaboratorAvatar('MJ', Colors.purple),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'John, Jane, and Mike are editing',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: _saveDocument,
                    icon: const Icon(Icons.save, size: 16),
                    label: const Text('Save'),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(80, 32),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCollaboratorAvatar(String initials, Color color) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: Center(
        child: Text(
          initials,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  int _getWordCount() {
    final text = _controller.document.toPlainText();
    return text.trim().isEmpty ? 0 : text.trim().split(RegExp(r'\s+')).length;
  }

  int _getCharacterCount() {
    return _controller.document.toPlainText().length;
  }

  void _showRenameDialog() {
    final controller = TextEditingController(text: _documentTitle);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename Document'),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(
            labelText: 'Document Title',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _documentTitle = controller.text.trim().isEmpty 
                    ? 'Untitled Document' 
                    : controller.text.trim();
              });
              Navigator.pop(context);
            },
            child: const Text('Rename'),
          ),
        ],
      ),
    );
  }

  void _shareDocument() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Share Document',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: InputDecoration(
                labelText: 'Add people by email',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                suffixIcon: const Icon(Icons.send),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('Permission: '),
                DropdownButton<String>(
                  value: 'Edit',
                  items: const [
                    DropdownMenuItem(value: 'View', child: Text('Can view')),
                    DropdownMenuItem(value: 'Comment', child: Text('Can comment')),
                    DropdownMenuItem(value: 'Edit', child: Text('Can edit')),
                  ],
                  onChanged: (value) {},
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Document shared successfully')),
                  );
                },
                child: const Text('Share'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'save':
        _saveDocument();
        break;
      case 'export_pdf':
        _exportDocument('PDF');
        break;
      case 'export_word':
        _exportDocument('Word');
        break;
      case 'version_history':
        _showVersionHistory();
        break;
      case 'delete':
        _deleteDocument();
        break;
    }
  }

  void _saveDocument() {
    // In a real app, you'd save to your backend
    setState(() {
      _hasUnsavedChanges = false;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Document saved successfully'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _exportDocument(String format) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Exporting document as $format...')),
    );
  }

  void _showVersionHistory() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Version History',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                children: [
                  _buildVersionItem('Current version', 'Just now', 'You'),
                  _buildVersionItem('Added conclusion section', '2 hours ago', 'Jane Smith'),
                  _buildVersionItem('Updated introduction', '5 hours ago', 'John Doe'),
                  _buildVersionItem('Initial draft', '1 day ago', 'You'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVersionItem(String description, String time, String author) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.history),
        title: Text(description),
        subtitle: Text('$time • $author'),
        trailing: const Icon(Icons.restore),
        onTap: () {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Version restored')),
          );
        },
      ),
    );
  }

  void _deleteDocument() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Document'),
        content: Text('Are you sure you want to delete "$_documentTitle"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Document deleted')),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}