import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';

class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  late TabController _tabController;

  bool _isCurrentPasswordVisible = false;
  bool _isNewPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;
  bool _isLoading = false;

  // 2FA State
  bool _is2FAEnabled = false;
  bool _is2FALoading = true;
  String? _qrCodeUrl;
  String? _secret;
  List<String> _backupCodes = [];
  bool _isSetup2FAInProgress = false;
  final _verificationCodeController = TextEditingController();

  // Session State
  List<Map<String, dynamic>> _sessions = [];
  List<Map<String, dynamic>> _loginHistory = [];
  bool _isLoadingSessions = true;
  bool _isLoadingHistory = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _load2FAStatus();
    _loadSessions();
    _loadLoginHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _verificationCodeController.dispose();
    super.dispose();
  }

  Future<void> _load2FAStatus() async {
    try {
      final status = await AuthService.instance.get2FAStatus();
      if (mounted) {
        setState(() {
          _is2FAEnabled = status['enabled'] == true || status['is2FAEnabled'] == true;
          _is2FALoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _is2FALoading = false;
        });
      }
    }
  }

  Future<void> _loadSessions() async {
    try {
      final sessions = await AuthService.instance.getActiveSessions();
      if (mounted) {
        setState(() {
          _sessions = sessions;
          _isLoadingSessions = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingSessions = false;
        });
      }
    }
  }

  Future<void> _loadLoginHistory() async {
    try {
      final history = await AuthService.instance.getLoginHistory();
      if (mounted) {
        setState(() {
          _loginHistory = history;
          _isLoadingHistory = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingHistory = false;
        });
      }
    }
  }

  Future<void> _startEnable2FA() async {
    setState(() {
      _isSetup2FAInProgress = true;
    });

    try {
      final result = await AuthService.instance.enable2FA();
      if (mounted) {
        setState(() {
          _qrCodeUrl = result['qrCode'] ?? result['qr_code'];
          _secret = result['secret'];
          _backupCodes = result['backupCodes'] != null
              ? List<String>.from(result['backupCodes'])
              : [];
        });
        _show2FASetupDialog();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSetup2FAInProgress = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _show2FASetupDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => _TwoFactorSetupDialog(
        qrCodeUrl: _qrCodeUrl,
        secret: _secret,
        backupCodes: _backupCodes,
        onVerify: _verify2FASetup,
        onCancel: () {
          setState(() {
            _isSetup2FAInProgress = false;
            _qrCodeUrl = null;
            _secret = null;
            _backupCodes = [];
          });
        },
      ),
    );
  }

  Future<void> _verify2FASetup(String code) async {
    try {
      final result = await AuthService.instance.verify2FASetup(code);
      if (mounted) {
        Navigator.of(context).pop();
        setState(() {
          _is2FAEnabled = true;
          _isSetup2FAInProgress = false;
          _backupCodes = result['backupCodes'] != null
              ? List<String>.from(result['backupCodes'])
              : _backupCodes;
        });
        _showBackupCodesDialog();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('security.2fa_enabled_success'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showBackupCodesDialog() {
    if (_backupCodes.isEmpty) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('security.backup_codes'.tr()),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'security.backup_codes_description'.tr(),
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: _backupCodes.map((code) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Text(
                      code,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )).toList(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: _backupCodes.join('\n')));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('common.copied_to_clipboard'.tr())),
              );
            },
            child: Text('common.copy'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.close'.tr()),
          ),
        ],
      ),
    );
  }

  Future<void> _disable2FA() async {
    final codeController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('security.disable_2fa'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('security.disable_2fa_description'.tr()),
            const SizedBox(height: 16),
            TextField(
              controller: codeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: InputDecoration(
                labelText: 'security.verification_code'.tr(),
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('security.disable'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true && codeController.text.isNotEmpty) {
      try {
        await AuthService.instance.disable2FA(codeController.text);
        if (mounted) {
          setState(() {
            _is2FAEnabled = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('security.2fa_disabled_success'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString().replaceAll('Exception: ', '')),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
    codeController.dispose();
  }

  Future<void> _revokeSession(String sessionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('security.revoke_session'.tr()),
        content: Text('security.revoke_session_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('security.revoke'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await AuthService.instance.revokeSession(sessionId);
        if (mounted) {
          _loadSessions();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('security.session_revoked'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString().replaceAll('Exception: ', '')),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _revokeAllSessions() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('security.revoke_all_sessions'.tr()),
        content: Text('security.revoke_all_sessions_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('security.revoke_all'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await AuthService.instance.revokeAllOtherSessions();
        if (mounted) {
          _loadSessions();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('security.all_sessions_revoked'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString().replaceAll('Exception: ', '')),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _changePassword() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Call the API to change password
      await AuthService.instance.changePassword(
        currentPassword: _currentPasswordController.text,
        newPassword: _newPasswordController.text,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('security.password_changed'.tr()),
            backgroundColor: Colors.green,
          ),
        );

        // Clear the form
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        // Show error message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('security.title'.tr()),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'security.password'.tr()),
            Tab(text: 'security.two_factor'.tr()),
            Tab(text: 'security.sessions'.tr()),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPasswordTab(),
          _build2FATab(),
          _buildSessionsTab(),
        ],
      ),
    );
  }

  Widget _buildPasswordTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Text(
              'security.change_password'.tr(),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'security.change_password_description'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 32),

            // Current Password
            TextFormField(
              controller: _currentPasswordController,
              obscureText: !_isCurrentPasswordVisible,
              decoration: InputDecoration(
                labelText: 'security.current_password'.tr(),
                hintText: 'security.current_password_hint'.tr(),
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(
                    _isCurrentPasswordVisible
                        ? Icons.visibility_off
                        : Icons.visibility,
                  ),
                  onPressed: () {
                    setState(() {
                      _isCurrentPasswordVisible = !_isCurrentPasswordVisible;
                    });
                  },
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'security.current_password_required'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            // New Password
            TextFormField(
              controller: _newPasswordController,
              obscureText: !_isNewPasswordVisible,
              decoration: InputDecoration(
                labelText: 'security.new_password'.tr(),
                hintText: 'security.new_password_hint'.tr(),
                prefixIcon: const Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(
                    _isNewPasswordVisible
                        ? Icons.visibility_off
                        : Icons.visibility,
                  ),
                  onPressed: () {
                    setState(() {
                      _isNewPasswordVisible = !_isNewPasswordVisible;
                    });
                  },
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'security.new_password_required'.tr();
                }
                if (value.length < 8) {
                  return 'security.new_password_length'.tr();
                }
                if (value == _currentPasswordController.text) {
                  return 'security.new_password_different'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            // Confirm Password
            TextFormField(
              controller: _confirmPasswordController,
              obscureText: !_isConfirmPasswordVisible,
              decoration: InputDecoration(
                labelText: 'security.confirm_password'.tr(),
                hintText: 'security.confirm_password_hint'.tr(),
                prefixIcon: const Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(
                    _isConfirmPasswordVisible
                        ? Icons.visibility_off
                        : Icons.visibility,
                  ),
                  onPressed: () {
                    setState(() {
                      _isConfirmPasswordVisible = !_isConfirmPasswordVisible;
                    });
                  },
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'security.confirm_password_required'.tr();
                }
                if (value != _newPasswordController.text) {
                  return 'security.passwords_not_match'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _changePassword,
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      )
                    : Text('security.change_password'.tr()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _build2FATab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text(
            'security.two_factor_auth'.tr(),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'security.two_factor_description'.tr(),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 32),

          // 2FA Status Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _is2FAEnabled
                          ? Colors.green.withValues(alpha: 0.1)
                          : Colors.orange.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _is2FAEnabled ? Icons.shield : Icons.shield_outlined,
                      color: _is2FAEnabled ? Colors.green : Colors.orange,
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _is2FALoading
                              ? 'security.checking_status'.tr()
                              : _is2FAEnabled
                                  ? 'security.2fa_enabled'.tr()
                                  : 'security.2fa_disabled'.tr(),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _is2FAEnabled
                              ? 'security.2fa_enabled_description'.tr()
                              : 'security.2fa_disabled_description'.tr(),
                          style: TextStyle(
                            fontSize: 14,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Enable/Disable Button
          if (!_is2FALoading)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: _is2FAEnabled
                  ? OutlinedButton.icon(
                      onPressed: _disable2FA,
                      icon: const Icon(Icons.shield_outlined, color: Colors.red),
                      label: Text(
                        'security.disable_2fa'.tr(),
                        style: const TextStyle(color: Colors.red),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    )
                  : ElevatedButton.icon(
                      onPressed: _isSetup2FAInProgress ? null : _startEnable2FA,
                      icon: _isSetup2FAInProgress
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.shield),
                      label: Text('security.enable_2fa'.tr()),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
            ),

          if (_is2FAEnabled) ...[
            const SizedBox(height: 24),
            // Backup Codes Section
            Card(
              child: ListTile(
                leading: const Icon(Icons.key),
                title: Text('security.backup_codes'.tr()),
                subtitle: Text('security.view_backup_codes'.tr()),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  try {
                    final codes = await AuthService.instance.getBackupCodes();
                    if (mounted) {
                      setState(() {
                        _backupCodes = codes;
                      });
                      _showBackupCodesDialog();
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(e.toString().replaceAll('Exception: ', '')),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSessionsTab() {
    return RefreshIndicator(
      onRefresh: () async {
        await _loadSessions();
        await _loadLoginHistory();
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Active Sessions Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'security.active_sessions'.tr(),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (_sessions.length > 1)
                  TextButton(
                    onPressed: _revokeAllSessions,
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                    child: Text('security.revoke_all'.tr()),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'security.active_sessions_description'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),

            if (_isLoadingSessions)
              const Center(child: CircularProgressIndicator())
            else if (_sessions.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Center(
                    child: Text('security.no_sessions'.tr()),
                  ),
                ),
              )
            else
              ...(_sessions.map((session) => _buildSessionCard(session)).toList()),

            const SizedBox(height: 32),

            // Login History Section
            Text(
              'security.login_history'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'security.login_history_description'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),

            if (_isLoadingHistory)
              const Center(child: CircularProgressIndicator())
            else if (_loginHistory.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Center(
                    child: Text('security.no_login_history'.tr()),
                  ),
                ),
              )
            else
              ...(_loginHistory.map((entry) => _buildLoginHistoryCard(entry)).toList()),
          ],
        ),
      ),
    );
  }

  Widget _buildSessionCard(Map<String, dynamic> session) {
    final deviceName = session['deviceName'] ?? session['device_name'] ?? 'Unknown Device';
    final browser = session['browser'] ?? session['userAgent'] ?? '';
    final ip = session['ipAddress'] ?? session['ip_address'] ?? session['ip'] ?? '';
    final lastActive = session['lastActive'] ?? session['last_active'] ?? session['createdAt'] ?? session['created_at'];
    final isCurrent = session['isCurrent'] == true || session['is_current'] == true;

    DateTime? lastActiveDate;
    if (lastActive != null) {
      try {
        lastActiveDate = DateTime.parse(lastActive.toString());
      } catch (_) {}
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              _getDeviceIcon(deviceName),
              size: 32,
              color: isCurrent ? Colors.green : Colors.grey,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        deviceName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (isCurrent) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'security.current'.tr(),
                            style: const TextStyle(
                              fontSize: 10,
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (browser.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      browser,
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    '${ip.isNotEmpty ? '$ip • ' : ''}${lastActiveDate != null ? DateFormat.yMMMd().add_jm().format(lastActiveDate) : ''}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (!isCurrent)
              IconButton(
                onPressed: () => _revokeSession(session['id']),
                icon: const Icon(Icons.close, color: Colors.red),
                tooltip: 'security.revoke'.tr(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoginHistoryCard(Map<String, dynamic> entry) {
    final status = entry['status'] ?? entry['success'] == true ? 'success' : 'failed';
    final ip = entry['ipAddress'] ?? entry['ip_address'] ?? entry['ip'] ?? '';
    final location = entry['location'] ?? '';
    final timestamp = entry['timestamp'] ?? entry['createdAt'] ?? entry['created_at'];
    final browser = entry['browser'] ?? entry['userAgent'] ?? '';

    DateTime? loginDate;
    if (timestamp != null) {
      try {
        loginDate = DateTime.parse(timestamp.toString());
      } catch (_) {}
    }

    final isSuccess = status == 'success' || entry['success'] == true;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              isSuccess ? Icons.check_circle : Icons.error,
              color: isSuccess ? Colors.green : Colors.red,
              size: 24,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isSuccess ? 'security.login_successful'.tr() : 'security.login_failed'.tr(),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: isSuccess ? Colors.green : Colors.red,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${ip.isNotEmpty ? ip : ''}${location.isNotEmpty ? ' • $location' : ''}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  if (browser.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      browser,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (loginDate != null)
              Text(
                DateFormat.MMMd().add_jm().format(loginDate),
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
      ),
    );
  }

  IconData _getDeviceIcon(String deviceName) {
    final lower = deviceName.toLowerCase();
    if (lower.contains('iphone') || lower.contains('android') || lower.contains('mobile')) {
      return Icons.phone_android;
    } else if (lower.contains('ipad') || lower.contains('tablet')) {
      return Icons.tablet;
    } else if (lower.contains('mac') || lower.contains('windows') || lower.contains('linux')) {
      return Icons.computer;
    }
    return Icons.devices;
  }
}

// 2FA Setup Dialog
class _TwoFactorSetupDialog extends StatefulWidget {
  final String? qrCodeUrl;
  final String? secret;
  final List<String> backupCodes;
  final Function(String) onVerify;
  final VoidCallback onCancel;

  const _TwoFactorSetupDialog({
    required this.qrCodeUrl,
    required this.secret,
    required this.backupCodes,
    required this.onVerify,
    required this.onCancel,
  });

  @override
  State<_TwoFactorSetupDialog> createState() => _TwoFactorSetupDialogState();
}

class _TwoFactorSetupDialogState extends State<_TwoFactorSetupDialog> {
  final _codeController = TextEditingController();
  bool _isVerifying = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('security.setup_2fa'.tr()),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'security.setup_2fa_instructions'.tr(),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // QR Code
            if (widget.qrCodeUrl != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: widget.qrCodeUrl!.startsWith('data:image')
                    ? Image.memory(
                        base64Decode(widget.qrCodeUrl!.split(',').last),
                        width: 200,
                        height: 200,
                      )
                    : const SizedBox(
                        width: 200,
                        height: 200,
                        child: Center(child: Text('QR Code')),
                      ),
              ),

            const SizedBox(height: 16),

            // Secret key
            if (widget.secret != null) ...[
              Text(
                'security.secret_key'.tr(),
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: SelectableText(
                  widget.secret!,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Verification code input
            TextField(
              controller: _codeController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 24,
                letterSpacing: 8,
                fontWeight: FontWeight.bold,
              ),
              decoration: InputDecoration(
                labelText: 'security.verification_code'.tr(),
                hintText: '000000',
                border: const OutlineInputBorder(),
                counterText: '',
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.pop(context);
            widget.onCancel();
          },
          child: Text('common.cancel'.tr()),
        ),
        ElevatedButton(
          onPressed: _isVerifying
              ? null
              : () async {
                  if (_codeController.text.length != 6) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('security.enter_6_digit_code'.tr()),
                        backgroundColor: Colors.orange,
                      ),
                    );
                    return;
                  }
                  setState(() => _isVerifying = true);
                  await widget.onVerify(_codeController.text);
                  if (mounted) setState(() => _isVerifying = false);
                },
          child: _isVerifying
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text('security.verify'.tr()),
        ),
      ],
    );
  }
}
