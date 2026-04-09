import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/auth_service.dart';
import '../main_screen.dart';
import 'login_screen.dart';
import '../../utils/theme_notifier.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/app_config.dart';

class EmailVerificationScreen extends StatefulWidget {
  final String? token; // Optional token from email link
  final String? email; // Email address to verify
  final ThemeNotifier? themeNotifier;
  
  const EmailVerificationScreen({
    super.key,
    this.token,
    this.email,
    this.themeNotifier,
  });

  @override
  State<EmailVerificationScreen> createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  bool _isLoading = false;
  bool _isResending = false;
  String? _errorMessage;
  String? _successMessage;
  bool _isVerified = false;

  @override
  void initState() {
    super.initState();
    
    // If token is provided, verify immediately
    if (widget.token != null) {
      _verifyEmail(widget.token!);
    }
  }

  /// Verify email with token
  Future<void> _verifyEmail(String token) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final authService = AuthService.instance;
      
      // Initialize auth service if not already initialized
      if (!authService.isInitialized) {
        await authService.initialize();
      }

      await authService.verifyEmail(token);

      if (mounted) {
        setState(() {
          _isVerified = true;
          _successMessage = 'auth.email_verified_success'.tr();
        });

        // Navigate to main screen after 3 seconds if user is logged in
        if (authService.isAuthenticated) {
          Future.delayed(const Duration(seconds: 3), () {
            if (mounted) {
              _navigateToMainScreen();
            }
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  /// Resend verification email
  Future<void> _resendVerificationEmail() async {
    if (widget.email == null) {
      setState(() {
        _errorMessage = 'auth.email_required_resend'.tr();
      });
      return;
    }

    setState(() {
      _isResending = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final response = await http.post(
        Uri.parse('${AppConfig.backendBaseUrl}/auth/resend-verification'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'email': widget.email}),
      );

      if (response.statusCode == 200) {
        setState(() {
          _successMessage = 'auth.verification_resent'.tr(args: [widget.email!]);
        });
      } else {
        final errorData = json.decode(response.body);
        setState(() {
          _errorMessage = errorData['message'] ?? 'auth.resend_verification_failed'.tr();
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'auth.resend_verification_failed_retry'.tr();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isResending = false;
        });
      }
    }
  }

  void _navigateToMainScreen() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (context) => MainScreen(
          themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
        ),
      ),
      (route) => false,
    );
  }

  void _navigateToLogin() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (context) => LoginScreen(themeNotifier: widget.themeNotifier),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isFromEmailLink = widget.token != null;
    final hasEmailAddress = widget.email != null;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: isFromEmailLink
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => _navigateToLogin(),
              )
            : null,
        automaticallyImplyLeading: !isFromEmailLink,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              
              // Icon
              Icon(
                _isVerified ? Icons.verified_user : Icons.mark_email_unread,
                size: 64,
                color: _isVerified
                    ? Colors.green
                    : Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              
              // Title
              Text(
                _isVerified ? 'auth.email_verified'.tr() : 'auth.verify_email'.tr(),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: _isVerified
                      ? Colors.green
                      : Theme.of(context).colorScheme.primary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // Subtitle
              Text(
                _isVerified
                    ? 'auth.welcome_activated'.tr()
                    : hasEmailAddress
                        ? 'auth.verification_sent'.tr(args: [widget.email!])
                        : 'auth.check_email_verification'.tr(),
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),

              // Loading indicator for automatic verification
              if (_isLoading && isFromEmailLink) ...[
                const Center(
                  child: CircularProgressIndicator(),
                ),
                const SizedBox(height: 16),
                Text(
                  'auth.verifying_email'.tr(),
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
              ],

              // Error message
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.error_outline,
                        color: Theme.of(context).colorScheme.onErrorContainer,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onErrorContainer,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Success message
              if (_successMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _isVerified
                        ? Colors.green.withOpacity(0.1)
                        : Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        color: _isVerified
                            ? Colors.green
                            : Theme.of(context).colorScheme.primary,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _successMessage!,
                          style: TextStyle(
                            color: _isVerified
                                ? Colors.green
                                : Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Resend verification email button (only if not verified and has email)
              if (!_isVerified && hasEmailAddress) ...[
                OutlinedButton(
                  onPressed: (_isResending || _isLoading) ? null : _resendVerificationEmail,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isResending
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          'auth.resend_verification'.tr(),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                ),
                const SizedBox(height: 16),
              ],

              // Continue/Login button
              FilledButton(
                onPressed: () {
                  if (_isVerified && AuthService.instance.isAuthenticated) {
                    _navigateToMainScreen();
                  } else {
                    _navigateToLogin();
                  }
                },
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  backgroundColor: _isVerified ? Colors.green : null,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  _isVerified && AuthService.instance.isAuthenticated
                      ? 'auth.continue_to_app'.tr()
                      : 'auth.back_to_sign_in'.tr(),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),

              const SizedBox(height: 32),

              // Instructions for manual verification
              if (!_isVerified && !_isLoading) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'auth.didnt_receive_email'.tr(),
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '• ${'auth.check_spam_folder'.tr()}\n'
                        '• ${'auth.check_correct_email'.tr()}\n'
                        '• ${'auth.wait_and_resend'.tr()}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}