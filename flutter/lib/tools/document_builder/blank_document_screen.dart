import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import '../../api/services/document_api_service.dart';
import '../../models/template/document_template.dart';
import '../../services/workspace_management_service.dart';
import '../templates/document_template_constants.dart';

/// Screen for creating a custom document from scratch without using a template
class BlankDocumentScreen extends StatefulWidget {
  const BlankDocumentScreen({super.key});

  @override
  State<BlankDocumentScreen> createState() => _BlankDocumentScreenState();
}

class _BlankDocumentScreenState extends State<BlankDocumentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  late quill.QuillController _quillController;
  late FocusNode _editorFocusNode;
  late ScrollController _editorScrollController;

  DocumentType _selectedType = DocumentType.contract;
  bool _isCreating = false;
  bool _showEditor = false;

  @override
  void initState() {
    super.initState();
    _editorFocusNode = FocusNode();
    _editorScrollController = ScrollController();
    _initializeEditor();
  }

  void _initializeEditor() {
    // Start with predefined sections based on document type
    final initialDelta = _getInitialContentForType(_selectedType);
    _quillController = quill.QuillController(
      document: quill.Document.fromJson(initialDelta),
      selection: const TextSelection.collapsed(offset: 0),
    );
  }

  List<dynamic> _getInitialContentForType(DocumentType type) {
    switch (type) {
      case DocumentType.proposal:
        return _getProposalTemplate();
      case DocumentType.contract:
        return _getContractTemplate();
      case DocumentType.invoice:
        return _getInvoiceTemplate();
      case DocumentType.sow:
        return _getSowTemplate();
      default:
        return _getContractTemplate();
    }
  }

  List<dynamic> _getProposalTemplate() {
    return [
      {'insert': 'Project Proposal'},
      {'insert': '\n', 'attributes': {'header': 1}},
      {'insert': '\n'},
      {'insert': 'Executive Summary'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Provide a brief overview of your proposal here. Summarize the key points and value proposition.\n\n'},
      {'insert': 'Project Overview'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Describe the project scope, goals, and expected outcomes.\n\n'},
      {'insert': 'Objectives'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Primary objective'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Secondary objective'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Additional objectives as needed'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': '\n'},
      {'insert': 'Timeline & Milestones'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Outline your project timeline and key milestones here.\n\n'},
      {'insert': 'Budget & Pricing'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Detail your pricing structure and payment terms.\n\n'},
      {'insert': 'Terms & Conditions'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Include any relevant terms and conditions.\n\n'},
      {'insert': '\n'},
      {'insert': '────────────────────────────────'},
      {'insert': '\n'},
      {'insert': 'Client Signature: ________________________     Date: ____________\n\n'},
      {'insert': 'Provider Signature: ________________________     Date: ____________\n'},
    ];
  }

  List<dynamic> _getContractTemplate() {
    return [
      {'insert': 'Service Agreement'},
      {'insert': '\n', 'attributes': {'header': 1}},
      {'insert': '\n'},
      {'insert': 'This Agreement is entered into as of [Date] by and between:\n\n'},
      {'insert': 'Parties'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Party A (Client):'},
      {'insert': '\n', 'attributes': {'bold': true}},
      {'insert': 'Name: ________________________\nAddress: ________________________\nEmail: ________________________\n\n'},
      {'insert': 'Party B (Service Provider):'},
      {'insert': '\n', 'attributes': {'bold': true}},
      {'insert': 'Name: ________________________\nAddress: ________________________\nEmail: ________________________\n\n'},
      {'insert': 'Scope of Services'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'The Service Provider agrees to provide the following services:\n'},
      {'insert': 'Service item 1'},
      {'insert': '\n', 'attributes': {'list': 'ordered'}},
      {'insert': 'Service item 2'},
      {'insert': '\n', 'attributes': {'list': 'ordered'}},
      {'insert': 'Service item 3'},
      {'insert': '\n', 'attributes': {'list': 'ordered'}},
      {'insert': '\n'},
      {'insert': 'Term & Duration'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'This Agreement shall commence on [Start Date] and continue until [End Date], unless terminated earlier in accordance with this Agreement.\n\n'},
      {'insert': 'Compensation'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'The Client agrees to pay the Service Provider:\n'},
      {'insert': 'Total Amount: \$________________________\nPayment Schedule: ________________________\n\n'},
      {'insert': 'Confidentiality'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Both parties agree to maintain the confidentiality of any proprietary information shared during the term of this Agreement.\n\n'},
      {'insert': 'Termination'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Either party may terminate this Agreement with [X] days written notice.\n\n'},
      {'insert': 'Governing Law'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'This Agreement shall be governed by the laws of [State/Country].\n\n'},
      {'insert': '\n'},
      {'insert': '────────────────────────────────'},
      {'insert': '\n'},
      {'insert': 'Signatures'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': '\n'},
      {'insert': 'Client Signature: ________________________     Date: ____________\n'},
      {'insert': 'Print Name: ________________________\n\n'},
      {'insert': 'Provider Signature: ________________________     Date: ____________\n'},
      {'insert': 'Print Name: ________________________\n'},
    ];
  }

  List<dynamic> _getInvoiceTemplate() {
    return [
      {'insert': 'INVOICE'},
      {'insert': '\n', 'attributes': {'header': 1}},
      {'insert': '\n'},
      {'insert': 'Invoice Number: INV-________________________\nInvoice Date: ________________________\nDue Date: ________________________\n\n'},
      {'insert': 'From'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Your Company Name\nYour Address\nCity, State, ZIP\nPhone: ________________________\nEmail: ________________________\n\n'},
      {'insert': 'Bill To'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Client Name\nClient Address\nCity, State, ZIP\nEmail: ________________________\n\n'},
      {'insert': 'Services / Items'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': '\n'},
      {'insert': '┌────────────────────────────────────────────────────────────┐\n'},
      {'insert': '│ Description                    │ Qty │ Rate    │ Amount   │\n'},
      {'insert': '├────────────────────────────────────────────────────────────┤\n'},
      {'insert': '│ Service/Item 1                 │  1  │ \$0.00  │ \$0.00   │\n'},
      {'insert': '│ Service/Item 2                 │  1  │ \$0.00  │ \$0.00   │\n'},
      {'insert': '│ Service/Item 3                 │  1  │ \$0.00  │ \$0.00   │\n'},
      {'insert': '├────────────────────────────────────────────────────────────┤\n'},
      {'insert': '│                                   Subtotal:    │ \$0.00   │\n'},
      {'insert': '│                                   Tax (0%):    │ \$0.00   │\n'},
      {'insert': '│                                   '},
      {'insert': 'TOTAL:', 'attributes': {'bold': true}},
      {'insert': '       │ '},
      {'insert': '\$0.00', 'attributes': {'bold': true}},
      {'insert': '   │\n'},
      {'insert': '└────────────────────────────────────────────────────────────┘\n\n'},
      {'insert': 'Payment Terms'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Payment is due within [X] days of the invoice date.\n\n'},
      {'insert': 'Payment Methods:'},
      {'insert': '\n', 'attributes': {'bold': true}},
      {'insert': 'Bank Transfer'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Credit Card'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Check'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': '\n'},
      {'insert': 'Notes'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Thank you for your business!\n'},
    ];
  }

  List<dynamic> _getSowTemplate() {
    return [
      {'insert': 'Statement of Work'},
      {'insert': '\n', 'attributes': {'header': 1}},
      {'insert': '\n'},
      {'insert': 'Project: ________________________\nDate: ________________________\nVersion: 1.0\n\n'},
      {'insert': '1. Introduction'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Provide a brief introduction to the project and its purpose.\n\n'},
      {'insert': '2. Scope of Work'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': '2.1 In Scope'},
      {'insert': '\n', 'attributes': {'header': 3}},
      {'insert': 'Deliverable 1'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Deliverable 2'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Deliverable 3'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': '\n'},
      {'insert': '2.2 Out of Scope'},
      {'insert': '\n', 'attributes': {'header': 3}},
      {'insert': 'Item not included 1'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Item not included 2'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': '\n'},
      {'insert': '3. Deliverables'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Deliverable 1: Description and acceptance criteria'},
      {'insert': '\n', 'attributes': {'list': 'ordered'}},
      {'insert': 'Deliverable 2: Description and acceptance criteria'},
      {'insert': '\n', 'attributes': {'list': 'ordered'}},
      {'insert': 'Deliverable 3: Description and acceptance criteria'},
      {'insert': '\n', 'attributes': {'list': 'ordered'}},
      {'insert': '\n'},
      {'insert': '4. Timeline'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': '\n'},
      {'insert': '┌──────────────────────────────────────────────────┐\n'},
      {'insert': '│ Phase          │ Start Date  │ End Date    │\n'},
      {'insert': '├──────────────────────────────────────────────────┤\n'},
      {'insert': '│ Phase 1        │ MM/DD/YYYY  │ MM/DD/YYYY  │\n'},
      {'insert': '│ Phase 2        │ MM/DD/YYYY  │ MM/DD/YYYY  │\n'},
      {'insert': '│ Phase 3        │ MM/DD/YYYY  │ MM/DD/YYYY  │\n'},
      {'insert': '└──────────────────────────────────────────────────┘\n\n'},
      {'insert': '5. Resources'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'List the resources required for this project.\n\n'},
      {'insert': '6. Assumptions'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Assumption 1'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Assumption 2'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': '\n'},
      {'insert': '7. Risks'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Risk 1: Description and mitigation'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': 'Risk 2: Description and mitigation'},
      {'insert': '\n', 'attributes': {'list': 'bullet'}},
      {'insert': '\n'},
      {'insert': '8. Acceptance Criteria'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': 'Define the criteria for project acceptance.\n\n'},
      {'insert': '\n'},
      {'insert': '────────────────────────────────'},
      {'insert': '\n'},
      {'insert': 'Approvals'},
      {'insert': '\n', 'attributes': {'header': 2}},
      {'insert': '\n'},
      {'insert': 'Client: ________________________     Date: ____________\n\n'},
      {'insert': 'Provider: ________________________     Date: ____________\n'},
    ];
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _quillController.dispose();
    _editorFocusNode.dispose();
    _editorScrollController.dispose();
    super.dispose();
  }

  void _onTypeChanged(DocumentType type) {
    setState(() {
      _selectedType = type;
      _titleController.text = 'New ${type.singularName}';
    });

    // Update editor content with new type template
    final initialDelta = _getInitialContentForType(type);
    _quillController.document = quill.Document.fromJson(initialDelta);
  }

  void _proceedToEditor() {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _showEditor = true;
    });
  }

  Future<void> _createDocument() async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No workspace selected'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isCreating = true);

    try {
      // Get content from editor
      final content = {'ops': _quillController.document.toDelta().toJson()};

      // Convert to HTML
      String contentHtml = '';
      try {
        final delta = _quillController.document.toDelta().toJson();
        final converter = QuillDeltaToHtmlConverter(
          List<Map<String, dynamic>>.from(delta),
          ConverterOptions.forEmail(),
        );
        contentHtml = converter.convert();
      } catch (e) {
        // Ignore HTML conversion errors
      }

      // Create document via API (no templateId = custom document)
      await DocumentApiService.instance.createDocument(
        workspaceId: workspaceId,
        title: _titleController.text,
        documentType: _selectedType,
        content: content,
        contentHtml: contentHtml.isNotEmpty ? contentHtml : null,
        description: _descriptionController.text.isNotEmpty
            ? _descriptionController.text
            : null,
        metadata: {'isCustomDocument': true},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${_selectedType.singularName} created successfully'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error creating document: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCreating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_showEditor
            ? _titleController.text
            : 'Create Custom Document'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_showEditor) {
              setState(() => _showEditor = false);
            } else {
              Navigator.pop(context);
            }
          },
        ),
        actions: [
          if (_showEditor)
            TextButton.icon(
              onPressed: _isCreating ? null : _createDocument,
              icon: _isCreating
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.check),
              label: const Text('Create'),
            ),
        ],
      ),
      body: _showEditor ? _buildEditorView() : _buildSetupView(),
    );
  }

  Widget _buildSetupView() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).primaryColor.withValues(alpha: 0.1),
                  Theme.of(context).primaryColor.withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.edit_document,
                  size: 48,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(height: 12),
                Text(
                  'Create Your Own Document',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Start with a professionally structured template and customize it to your needs',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.white60 : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Document Type Selection
          Text(
            'Select Document Type',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          _buildDocumentTypeGrid(isDark),
          const SizedBox(height: 24),

          // Document Title
          TextFormField(
            controller: _titleController,
            decoration: InputDecoration(
              labelText: 'Document Title',
              hintText: 'Enter a title for your document',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              prefixIcon: const Icon(Icons.title),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter a title';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Description (optional)
          TextFormField(
            controller: _descriptionController,
            decoration: InputDecoration(
              labelText: 'Description (optional)',
              hintText: 'Add a brief description',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              prefixIcon: const Icon(Icons.description_outlined),
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 32),

          // Preview of what's included
          _buildPreviewSection(isDark),
          const SizedBox(height: 24),

          // Continue Button
          ElevatedButton(
            onPressed: _proceedToEditor,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Continue to Editor',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                SizedBox(width: 8),
                Icon(Icons.arrow_forward),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentTypeGrid(bool isDark) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: DocumentType.values.map((type) {
        final isSelected = _selectedType == type;
        final color = DocumentTemplateConstants.getDocumentTypeColor(type);

        return InkWell(
          onTap: () => _onTypeChanged(type),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isSelected
                  ? color.withValues(alpha: 0.15)
                  : (isDark ? Colors.grey[850] : Colors.white),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? color : (isDark ? Colors.white12 : Colors.grey[300]!),
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  DocumentTemplateConstants.getDocumentTypeIcon(type),
                  color: isSelected ? color : (isDark ? Colors.white54 : Colors.grey[600]),
                  size: 28,
                ),
                const SizedBox(height: 8),
                Text(
                  type.singularName,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    color: isSelected
                        ? color
                        : (isDark ? Colors.white70 : Colors.grey[700]),
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPreviewSection(bool isDark) {
    final sections = _getSectionsForType(_selectedType);
    final color = DocumentTemplateConstants.getDocumentTypeColor(_selectedType);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[850] : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.view_list, size: 20, color: color),
              const SizedBox(width: 8),
              Text(
                'Included Sections',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: sections.map((section) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle_outline, size: 14, color: color),
                    const SizedBox(width: 4),
                    Text(
                      section,
                      style: TextStyle(
                        fontSize: 12,
                        color: color,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  List<String> _getSectionsForType(DocumentType type) {
    switch (type) {
      case DocumentType.proposal:
        return [
          'Executive Summary',
          'Project Overview',
          'Objectives',
          'Timeline',
          'Budget',
          'Terms',
          'Signatures',
        ];
      case DocumentType.contract:
        return [
          'Parties',
          'Scope of Services',
          'Term & Duration',
          'Compensation',
          'Confidentiality',
          'Termination',
          'Signatures',
        ];
      case DocumentType.invoice:
        return [
          'Invoice Details',
          'From/Bill To',
          'Services/Items',
          'Totals',
          'Payment Terms',
          'Notes',
        ];
      case DocumentType.sow:
        return [
          'Introduction',
          'Scope of Work',
          'Deliverables',
          'Timeline',
          'Resources',
          'Assumptions',
          'Risks',
          'Approvals',
        ];
      default:
        return ['Document Content'];
    }
  }

  Widget _buildEditorView() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        // Toolbar
        Container(
          decoration: BoxDecoration(
            color: isDark ? Colors.grey[850] : Colors.grey[50],
            border: Border(
              bottom: BorderSide(
                color: isDark ? Colors.white12 : Colors.grey[300]!,
              ),
            ),
          ),
          child: quill.QuillSimpleToolbar(
            controller: _quillController,
            config: const quill.QuillSimpleToolbarConfig(
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
        ),

        // Editor
        Expanded(
          child: Container(
            color: isDark ? Colors.grey[900] : Colors.white,
            child: quill.QuillEditor(
              controller: _quillController,
              focusNode: _editorFocusNode,
              scrollController: _editorScrollController,
              config: quill.QuillEditorConfig(
                scrollable: true,
                autoFocus: false,
                placeholder: 'Start writing your document...',
                expands: true,
                padding: const EdgeInsets.all(16),
              ),
            ),
          ),
        ),

        // Bottom bar with document info
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: isDark ? Colors.grey[850] : Colors.grey[100],
            border: Border(
              top: BorderSide(
                color: isDark ? Colors.white12 : Colors.grey[300]!,
              ),
            ),
          ),
          child: Row(
            children: [
              Icon(
                DocumentTemplateConstants.getDocumentTypeIcon(_selectedType),
                size: 16,
                color: DocumentTemplateConstants.getDocumentTypeColor(_selectedType),
              ),
              const SizedBox(width: 8),
              Text(
                _selectedType.singularName,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white54 : Colors.grey[600],
                ),
              ),
              const Spacer(),
              Text(
                'Custom Document',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white38 : Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
