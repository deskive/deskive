import 'package:flutter/material.dart';
import '../api/services/email_api_service.dart';

class SmtpImapConnectWidget extends StatefulWidget {
  final String workspaceId;
  final VoidCallback? onConnected;
  final VoidCallback? onBack;

  const SmtpImapConnectWidget({
    super.key,
    required this.workspaceId,
    this.onConnected,
    this.onBack,
  });

  @override
  State<SmtpImapConnectWidget> createState() => _SmtpImapConnectWidgetState();
}

class _SmtpImapConnectWidgetState extends State<SmtpImapConnectWidget> {
  final EmailApiService _emailService = EmailApiService();
  final _formKey = GlobalKey<FormState>();

  // Provider selection
  String _selectedProvider = 'gmail';

  // Form controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _displayNameController = TextEditingController();

  // Custom server settings
  final _smtpHostController = TextEditingController();
  final _smtpPortController = TextEditingController(text: '587');
  final _imapHostController = TextEditingController();
  final _imapPortController = TextEditingController(text: '993');
  bool _smtpSecure = false;
  bool _imapSecure = true;

  bool _obscurePassword = true;
  bool _isTesting = false;
  bool _isConnecting = false;
  TestConnectionResult? _testResult;

  final Map<String, EmailProviderPreset> _providers = {
    'gmail': EmailProviderPreset.gmail,
    'outlook': EmailProviderPreset.outlook,
    'yahoo': EmailProviderPreset.yahoo,
  };

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _displayNameController.dispose();
    _smtpHostController.dispose();
    _smtpPortController.dispose();
    _imapHostController.dispose();
    _imapPortController.dispose();
    super.dispose();
  }

  void _onProviderChanged(String? value) {
    if (value == null) return;
    setState(() {
      _selectedProvider = value;
      _testResult = null;

      // Auto-fill server settings for known providers
      if (_providers.containsKey(value)) {
        final preset = _providers[value]!;
        _smtpHostController.text = preset.smtpHost;
        _smtpPortController.text = preset.smtpPort.toString();
        _smtpSecure = preset.smtpSecure;
        _imapHostController.text = preset.imapHost;
        _imapPortController.text = preset.imapPort.toString();
        _imapSecure = preset.imapSecure;
      } else {
        // Clear for custom
        _smtpHostController.clear();
        _smtpPortController.text = '587';
        _smtpSecure = false;
        _imapHostController.clear();
        _imapPortController.text = '993';
        _imapSecure = true;
      }
    });
  }

  SmtpConfig _buildSmtpConfig() {
    return SmtpConfig(
      host: _selectedProvider == 'custom'
          ? _smtpHostController.text.trim()
          : _providers[_selectedProvider]!.smtpHost,
      port: _selectedProvider == 'custom'
          ? int.tryParse(_smtpPortController.text) ?? 587
          : _providers[_selectedProvider]!.smtpPort,
      secure: _selectedProvider == 'custom'
          ? _smtpSecure
          : _providers[_selectedProvider]!.smtpSecure,
      user: _emailController.text.trim(),
      password: _passwordController.text,
    );
  }

  ImapConfig _buildImapConfig() {
    return ImapConfig(
      host: _selectedProvider == 'custom'
          ? _imapHostController.text.trim()
          : _providers[_selectedProvider]!.imapHost,
      port: _selectedProvider == 'custom'
          ? int.tryParse(_imapPortController.text) ?? 993
          : _providers[_selectedProvider]!.imapPort,
      secure: _selectedProvider == 'custom'
          ? _imapSecure
          : _providers[_selectedProvider]!.imapSecure,
      user: _emailController.text.trim(),
      password: _passwordController.text,
    );
  }

  Future<void> _testConnection() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    try {
      final request = TestSmtpImapRequest(
        smtp: _buildSmtpConfig(),
        imap: _buildImapConfig(),
      );

      final response = await _emailService.testSmtpImapConnection(
        widget.workspaceId,
        request,
      );

      if (response.success && response.data != null) {
        setState(() {
          _testResult = response.data;
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Connection test failed')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isTesting = false);
      }
    }
  }

  Future<void> _connect() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isConnecting = true);

    try {
      final request = ConnectSmtpImapRequest(
        emailAddress: _emailController.text.trim(),
        displayName: _displayNameController.text.trim().isEmpty
            ? null
            : _displayNameController.text.trim(),
        smtp: _buildSmtpConfig(),
        imap: _buildImapConfig(),
      );

      final response = await _emailService.connectSmtpImap(
        widget.workspaceId,
        request,
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Email connected successfully!')),
          );
        }
        widget.onConnected?.call();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Failed to connect')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isConnecting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCustom = _selectedProvider == 'custom';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Back button and title
            Row(
              children: [
                if (widget.onBack != null)
                  IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: widget.onBack,
                  ),
                Expanded(
                  child: Text(
                    'Connect Email via SMTP/IMAP',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Works with any email provider that supports SMTP/IMAP',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
            ),
            const SizedBox(height: 24),

            // Provider selection
            Text(
              'Email Provider',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'gmail',
                  label: Text('Gmail'),
                  icon: Icon(Icons.mail),
                ),
                ButtonSegment(
                  value: 'outlook',
                  label: Text('Outlook'),
                  icon: Icon(Icons.mail),
                ),
                ButtonSegment(
                  value: 'yahoo',
                  label: Text('Yahoo'),
                  icon: Icon(Icons.mail),
                ),
                ButtonSegment(
                  value: 'custom',
                  label: Text('Custom'),
                  icon: Icon(Icons.settings),
                ),
              ],
              selected: {_selectedProvider},
              onSelectionChanged: (selection) => _onProviderChanged(selection.first),
            ),
            const SizedBox(height: 24),

            // Email field
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                hintText: 'your.email@example.com',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.email),
              ),
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter your email address';
                }
                if (!value.contains('@')) {
                  return 'Please enter a valid email address';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Display name field
            TextFormField(
              controller: _displayNameController,
              decoration: const InputDecoration(
                labelText: 'Display Name (optional)',
                hintText: 'John Doe',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
            ),
            const SizedBox(height: 16),

            // Password field
            TextFormField(
              controller: _passwordController,
              decoration: InputDecoration(
                labelText: _selectedProvider == 'gmail'
                    ? 'App Password'
                    : 'Password',
                hintText: _selectedProvider == 'gmail'
                    ? 'Enter your Gmail app password'
                    : 'Enter your password',
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              obscureText: _obscurePassword,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter your password';
                }
                return null;
              },
            ),

            // App password note for Gmail
            if (_selectedProvider == 'gmail') ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 20,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'For Gmail, you need to use an App Password. Go to Google Account > Security > 2-Step Verification > App passwords.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),

            // Custom server settings
            if (isCustom) ...[
              Text(
                'SMTP Settings (Outgoing)',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: TextFormField(
                      controller: _smtpHostController,
                      decoration: const InputDecoration(
                        labelText: 'SMTP Host',
                        hintText: 'smtp.example.com',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (isCustom && (value == null || value.isEmpty)) {
                          return 'Required';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: TextFormField(
                      controller: _smtpPortController,
                      decoration: const InputDecoration(
                        labelText: 'Port',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                title: const Text('Use SSL/TLS'),
                value: _smtpSecure,
                onChanged: (value) => setState(() => _smtpSecure = value),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 16),

              Text(
                'IMAP Settings (Incoming)',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: TextFormField(
                      controller: _imapHostController,
                      decoration: const InputDecoration(
                        labelText: 'IMAP Host',
                        hintText: 'imap.example.com',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (isCustom && (value == null || value.isEmpty)) {
                          return 'Required';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: TextFormField(
                      controller: _imapPortController,
                      decoration: const InputDecoration(
                        labelText: 'Port',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                title: const Text('Use SSL/TLS'),
                value: _imapSecure,
                onChanged: (value) => setState(() => _imapSecure = value),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 24),
            ],

            // Test result
            if (_testResult != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _testResult!.success
                      ? Colors.green.withValues(alpha: 0.1)
                      : Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _testResult!.success ? Colors.green : Colors.red,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _testResult!.success ? Icons.check_circle : Icons.error,
                          color: _testResult!.success ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _testResult!.success ? 'Connection Successful' : 'Connection Failed',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: _testResult!.success ? Colors.green : Colors.red,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildTestResultItem('SMTP', _testResult!.smtp),
                    const SizedBox(height: 8),
                    _buildTestResultItem('IMAP', _testResult!.imap),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isTesting || _isConnecting ? null : _testConnection,
                    child: _isTesting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Test Connection'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _isTesting || _isConnecting ? null : _connect,
                    child: _isConnecting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Connect'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTestResultItem(String protocol, dynamic result) {
    final isSuccess = result.success;
    return Row(
      children: [
        Icon(
          isSuccess ? Icons.check : Icons.close,
          size: 16,
          color: isSuccess ? Colors.green : Colors.red,
        ),
        const SizedBox(width: 8),
        Text(
          '$protocol: ${result.message}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
