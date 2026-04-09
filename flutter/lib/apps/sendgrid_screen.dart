import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'models/sendgrid_models.dart';
import 'services/sendgrid_service.dart';

/// SendGrid email screen with compose, templates, and statistics
class SendGridScreen extends StatefulWidget {
  const SendGridScreen({super.key});

  @override
  State<SendGridScreen> createState() => _SendGridScreenState();
}

class _SendGridScreenState extends State<SendGridScreen>
    with SingleTickerProviderStateMixin {
  final SendGridService _sendGridService = SendGridService.instance;
  late TabController _tabController;

  // Controllers for compose form
  final TextEditingController _toController = TextEditingController();
  final TextEditingController _ccController = TextEditingController();
  final TextEditingController _bccController = TextEditingController();
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _bodyController = TextEditingController();

  // State
  List<SendGridTemplate> _templates = [];
  List<SendGridStats> _stats = [];
  SendGridConnection? _connection;
  SendGridTemplate? _selectedTemplate;

  bool _isLoadingConnection = true;
  bool _isLoadingTemplates = false;
  bool _isLoadingStats = false;
  bool _isSending = false;
  bool _useHtml = true;
  String? _error;

  // Date range for stats
  DateTime _statsStartDate = DateTime.now().subtract(const Duration(days: 30));
  DateTime _statsEndDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadConnection();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _toController.dispose();
    _ccController.dispose();
    _bccController.dispose();
    _subjectController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;

    switch (_tabController.index) {
      case 1:
        if (_templates.isEmpty) _loadTemplates();
        break;
      case 2:
        if (_stats.isEmpty) _loadStats();
        break;
    }
  }

  Future<void> _loadConnection() async {
    setState(() {
      _isLoadingConnection = true;
      _error = null;
    });

    try {
      final connection = await _sendGridService.getConnection();
      setState(() {
        _connection = connection;
        _isLoadingConnection = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingConnection = false;
      });
    }
  }

  Future<void> _loadTemplates() async {
    setState(() {
      _isLoadingTemplates = true;
      _error = null;
    });

    try {
      final response = await _sendGridService.listTemplates();
      setState(() {
        _templates = response.templates;
        _isLoadingTemplates = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingTemplates = false;
      });
    }
  }

  Future<void> _loadStats() async {
    setState(() {
      _isLoadingStats = true;
      _error = null;
    });

    try {
      final stats = await _sendGridService.getStats(
        startDate: _statsStartDate,
        endDate: _statsEndDate,
      );
      setState(() {
        _stats = stats;
        _isLoadingStats = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingStats = false;
      });
    }
  }

  Future<void> _sendEmail() async {
    // Validate required fields
    if (_toController.text.trim().isEmpty) {
      _showError('Please enter a recipient email address');
      return;
    }
    if (_subjectController.text.trim().isEmpty) {
      _showError('Please enter a subject');
      return;
    }
    if (_bodyController.text.trim().isEmpty) {
      _showError('Please enter a message body');
      return;
    }

    setState(() => _isSending = true);

    try {
      final request = SendEmailRequest(
        to: _toController.text.trim(),
        subject: _subjectController.text.trim(),
        htmlContent: _useHtml ? _bodyController.text.trim() : null,
        textContent: !_useHtml ? _bodyController.text.trim() : null,
        cc: _parseEmailList(_ccController.text),
        bcc: _parseEmailList(_bccController.text),
      );

      final response = await _sendGridService.sendEmail(request);

      if (mounted) {
        _showSuccess('Email sent successfully! Message ID: ${response.messageId ?? 'N/A'}');
        _clearComposeForm();
      }
    } catch (e) {
      if (mounted) {
        _showError('Failed to send email: $e');
      }
    } finally {
      setState(() => _isSending = false);
    }
  }

  List<String>? _parseEmailList(String text) {
    if (text.trim().isEmpty) return null;
    return text
        .split(RegExp(r'[,;\s]+'))
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
  }

  void _clearComposeForm() {
    _toController.clear();
    _ccController.clear();
    _bccController.clear();
    _subjectController.clear();
    _bodyController.clear();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(
        start: _statsStartDate,
        end: _statsEndDate,
      ),
    );

    if (picked != null) {
      setState(() {
        _statsStartDate = picked.start;
        _statsEndDate = picked.end;
      });
      _loadStats();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_isLoadingConnection) {
      return Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              const _SendGridLogo(size: 28),
              const SizedBox(width: 12),
              const Text('SendGrid'),
            ],
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_connection == null) {
      return Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              const _SendGridLogo(size: 28),
              const SizedBox(width: 12),
              const Text('SendGrid'),
            ],
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const _SendGridLogo(size: 64),
              const SizedBox(height: 16),
              Text(
                'SendGrid is not connected',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'Please connect your SendGrid account to use email features.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loadConnection,
                child: const Text('Refresh'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const _SendGridLogo(size: 28),
            const SizedBox(width: 12),
            const Text('SendGrid'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              switch (_tabController.index) {
                case 0:
                  _loadConnection();
                  break;
                case 1:
                  _loadTemplates();
                  break;
                case 2:
                  _loadStats();
                  break;
              }
            },
            tooltip: 'Refresh',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.edit), text: 'Compose'),
            Tab(icon: Icon(Icons.description), text: 'Templates'),
            Tab(icon: Icon(Icons.analytics), text: 'Stats'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildComposeTab(),
          _buildTemplatesTab(),
          _buildStatsTab(),
        ],
      ),
    );
  }

  Widget _buildComposeTab() {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sender info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    Icons.person_outline,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'From',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                        Text(
                          '${_connection?.senderName ?? 'Unknown'} <${_connection?.senderEmail ?? 'unknown@example.com'}>',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // To field
          TextField(
            controller: _toController,
            decoration: InputDecoration(
              labelText: 'To *',
              hintText: 'recipient@example.com',
              prefixIcon: const Icon(Icons.email_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),

          // CC field
          TextField(
            controller: _ccController,
            decoration: InputDecoration(
              labelText: 'CC',
              hintText: 'cc1@example.com, cc2@example.com',
              prefixIcon: const Icon(Icons.people_outline),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),

          // BCC field
          TextField(
            controller: _bccController,
            decoration: InputDecoration(
              labelText: 'BCC',
              hintText: 'bcc1@example.com, bcc2@example.com',
              prefixIcon: const Icon(Icons.visibility_off_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),

          // Subject field
          TextField(
            controller: _subjectController,
            decoration: InputDecoration(
              labelText: 'Subject *',
              hintText: 'Enter email subject',
              prefixIcon: const Icon(Icons.subject),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // HTML/Plain text toggle
          Row(
            children: [
              Text(
                'Content Type:',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(width: 16),
              ChoiceChip(
                label: const Text('HTML'),
                selected: _useHtml,
                onSelected: (selected) {
                  setState(() => _useHtml = true);
                },
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: const Text('Plain Text'),
                selected: !_useHtml,
                onSelected: (selected) {
                  setState(() => _useHtml = false);
                },
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Body field
          TextField(
            controller: _bodyController,
            decoration: InputDecoration(
              labelText: 'Body *',
              hintText: _useHtml
                  ? '<p>Enter your HTML content here...</p>'
                  : 'Enter your message here...',
              alignLabelWithHint: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            maxLines: 10,
            minLines: 5,
          ),
          const SizedBox(height: 24),

          // Send button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isSending ? null : _sendEmail,
              icon: _isSending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send),
              label: Text(_isSending ? 'Sending...' : 'Send Email'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTemplatesTab() {
    final theme = Theme.of(context);

    if (_isLoadingTemplates) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _templates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Error loading templates',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadTemplates,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_templates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.description_outlined,
              size: 64,
              color: theme.colorScheme.onSurface.withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'No templates found',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Create templates in your SendGrid dashboard',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
          ],
        ),
      );
    }

    return Row(
      children: [
        // Templates list
        SizedBox(
          width: 300,
          child: Container(
            decoration: BoxDecoration(
              border: Border(
                right: BorderSide(color: theme.dividerColor),
              ),
            ),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Text(
                        'Templates',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${_templates.length}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView.builder(
                    itemCount: _templates.length,
                    itemBuilder: (context, index) {
                      final template = _templates[index];
                      final isSelected = _selectedTemplate?.id == template.id;

                      return ListTile(
                        selected: isSelected,
                        selectedTileColor:
                            theme.colorScheme.primaryContainer.withOpacity(0.3),
                        leading: Icon(
                          Icons.description,
                          color: isSelected
                              ? theme.colorScheme.primary
                              : theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                        title: Text(
                          template.name,
                          style: TextStyle(
                            fontWeight:
                                isSelected ? FontWeight.w600 : FontWeight.normal,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          'ID: ${template.id}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.5),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => _selectTemplate(template),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
        // Template preview
        Expanded(
          child: _selectedTemplate == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.touch_app,
                        size: 48,
                        color: theme.colorScheme.onSurface.withOpacity(0.3),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Select a template to preview',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                )
              : _buildTemplatePreview(_selectedTemplate!),
        ),
      ],
    );
  }

  void _selectTemplate(SendGridTemplate template) async {
    setState(() => _selectedTemplate = template);

    // Load full template details if HTML content is not available
    if (template.htmlContent == null) {
      try {
        final fullTemplate = await _sendGridService.getTemplate(template.id);
        setState(() {
          _selectedTemplate = fullTemplate;
          // Update in list too
          final index = _templates.indexWhere((t) => t.id == template.id);
          if (index != -1) {
            _templates[index] = fullTemplate;
          }
        });
      } catch (e) {
        // Ignore error, keep showing basic template info
      }
    }
  }

  Widget _buildTemplatePreview(SendGridTemplate template) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: theme.dividerColor),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      template.name,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Template ID: ${template.id}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ],
                ),
              ),
              ElevatedButton.icon(
                onPressed: () => _useTemplateForEmail(template),
                icon: const Icon(Icons.edit, size: 18),
                label: const Text('Use Template'),
              ),
            ],
          ),
        ),
        Expanded(
          child: template.htmlContent != null
              ? SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: theme.dividerColor),
                    ),
                    child: SelectableText(
                      template.htmlContent!,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                )
              : Center(
                  child: Text(
                    'No preview available',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                ),
        ),
      ],
    );
  }

  void _useTemplateForEmail(SendGridTemplate template) {
    if (template.htmlContent != null) {
      _bodyController.text = template.htmlContent!;
      setState(() => _useHtml = true);
    }
    _tabController.animateTo(0);
    _showSuccess('Template content loaded into compose form');
  }

  Widget _buildStatsTab() {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('MMM d, yyyy');

    return Column(
      children: [
        // Date range selector
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: theme.dividerColor),
            ),
          ),
          child: Row(
            children: [
              Text(
                'Date Range:',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(width: 16),
              OutlinedButton.icon(
                onPressed: _selectDateRange,
                icon: const Icon(Icons.date_range, size: 18),
                label: Text(
                  '${dateFormat.format(_statsStartDate)} - ${dateFormat.format(_statsEndDate)}',
                ),
              ),
              const Spacer(),
              if (_isLoadingStats)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
        ),
        // Stats content
        Expanded(
          child: _isLoadingStats && _stats.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _error != null && _stats.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.error_outline,
                            size: 48,
                            color: theme.colorScheme.error,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Error loading statistics',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _error!,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(0.6),
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadStats,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    )
                  : _stats.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.analytics_outlined,
                                size: 64,
                                color: theme.colorScheme.onSurface.withOpacity(0.3),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No statistics available',
                                style: theme.textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Send some emails to see statistics',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                                ),
                              ),
                            ],
                          ),
                        )
                      : _buildStatsContent(),
        ),
      ],
    );
  }

  Widget _buildStatsContent() {
    // Calculate aggregated stats
    final totalRequests = _stats.fold<int>(0, (sum, s) => sum + s.requests);
    final totalDelivered = _stats.fold<int>(0, (sum, s) => sum + s.delivered);
    final totalOpens = _stats.fold<int>(0, (sum, s) => sum + s.opens);
    final totalClicks = _stats.fold<int>(0, (sum, s) => sum + s.clicks);
    final totalBounces = _stats.fold<int>(0, (sum, s) => sum + s.bounces);

    final deliveryRate = totalRequests > 0
        ? (totalDelivered / totalRequests * 100)
        : 0.0;
    final openRate = totalDelivered > 0
        ? (totalOpens / totalDelivered * 100)
        : 0.0;
    final clickRate = totalDelivered > 0
        ? (totalClicks / totalDelivered * 100)
        : 0.0;
    final bounceRate = totalRequests > 0
        ? (totalBounces / totalRequests * 100)
        : 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary cards
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              _buildStatCard(
                'Requests',
                totalRequests.toString(),
                Icons.send,
                Colors.blue,
              ),
              _buildStatCard(
                'Delivered',
                totalDelivered.toString(),
                Icons.check_circle,
                Colors.green,
                subtitle: '${deliveryRate.toStringAsFixed(1)}% rate',
              ),
              _buildStatCard(
                'Opens',
                totalOpens.toString(),
                Icons.visibility,
                Colors.orange,
                subtitle: '${openRate.toStringAsFixed(1)}% rate',
              ),
              _buildStatCard(
                'Clicks',
                totalClicks.toString(),
                Icons.touch_app,
                Colors.purple,
                subtitle: '${clickRate.toStringAsFixed(1)}% rate',
              ),
              _buildStatCard(
                'Bounces',
                totalBounces.toString(),
                Icons.error,
                Colors.red,
                subtitle: '${bounceRate.toStringAsFixed(1)}% rate',
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Daily breakdown
          Text(
            'Daily Breakdown',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          _buildStatsTable(),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color, {
    String? subtitle,
  }) {
    final theme = Theme.of(context);

    return Card(
      child: Container(
        width: 180,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 24),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatsTable() {
    final dateFormat = DateFormat('MMM d');

    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('Date')),
            DataColumn(label: Text('Requests'), numeric: true),
            DataColumn(label: Text('Delivered'), numeric: true),
            DataColumn(label: Text('Opens'), numeric: true),
            DataColumn(label: Text('Clicks'), numeric: true),
            DataColumn(label: Text('Bounces'), numeric: true),
            DataColumn(label: Text('Delivery %'), numeric: true),
            DataColumn(label: Text('Open %'), numeric: true),
          ],
          rows: _stats.map((stat) {
            return DataRow(
              cells: [
                DataCell(Text(dateFormat.format(stat.date))),
                DataCell(Text(stat.requests.toString())),
                DataCell(Text(stat.delivered.toString())),
                DataCell(Text(stat.opens.toString())),
                DataCell(Text(stat.clicks.toString())),
                DataCell(
                  Text(
                    stat.bounces.toString(),
                    style: TextStyle(
                      color: stat.bounces > 0 ? Colors.red : null,
                    ),
                  ),
                ),
                DataCell(Text('${stat.deliveryRate.toStringAsFixed(1)}%')),
                DataCell(Text('${stat.openRate.toStringAsFixed(1)}%')),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

/// SendGrid logo widget
class _SendGridLogo extends StatelessWidget {
  final double size;

  const _SendGridLogo({this.size = 24});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _SendGridLogoPainter(),
      ),
    );
  }
}

class _SendGridLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;

    // SendGrid blue color
    const sendGridBlue = Color(0xFF1A82E2);

    paint.color = sendGridBlue;

    // Draw a simplified SendGrid-like logo (stylized envelope)
    final path = Path();
    final unit = size.width / 10;

    // Outer envelope shape
    path.moveTo(unit, unit * 2);
    path.lineTo(size.width / 2, unit * 5);
    path.lineTo(size.width - unit, unit * 2);
    path.lineTo(size.width - unit, size.height - unit);
    path.lineTo(unit, size.height - unit);
    path.close();

    canvas.drawPath(path, paint);

    // Top flap
    final flapPath = Path();
    flapPath.moveTo(unit, unit * 2);
    flapPath.lineTo(size.width / 2, unit * 4.5);
    flapPath.lineTo(size.width - unit, unit * 2);
    flapPath.lineTo(size.width / 2, unit);
    flapPath.close();

    paint.color = sendGridBlue.withOpacity(0.7);
    canvas.drawPath(flapPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
