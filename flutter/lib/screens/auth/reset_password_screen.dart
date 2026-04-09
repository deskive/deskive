import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/auth_service.dart';
import 'login_screen.dart';
import '../../utils/theme_notifier.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/app_config.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String token;
  final ThemeNotifier? themeNotifier;
  
  const ResetPasswordScreen({
    super.key,
    required this.token,
    this.themeNotifier,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  String? _errorMessage;
  String? _successMessage;
  bool _tokenValid = true;

  @override
  void initState() {
    super.initState();
    _validateToken();
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  /// Validate the reset token
  Future<void> _validateToken() async {
    try {
      final response = await http.post(
        Uri.parse('${AppConfig.backendBaseUrl}/auth/validate-reset-token'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'token': widget.token}),
      );

      if (response.statusCode != 200) {
        setState(() {
          _tokenValid = false;
          _errorMessage = 'auth.reset_token_invalid'.tr();
        });
      }
    } catch (e) {
      setState(() {
        _tokenValid = false;
        _errorMessage = 'auth.reset_token_failed'.tr();
      });
    }
  }

  /// Reset password with new password
  Future<void> _resetPassword() async {
    if (!_formKey.currentState!.validate() || !_tokenValid) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final response = await http.post(
        Uri.parse('${AppConfig.backendBaseUrl}/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'token': widget.token,
          'password': _passwordController.text,
        }),
      );

      if (response.statusCode == 200) {
        setState(() {
          _successMessage = 'auth.password_reset_success'.tr();
        });

        // Navigate to login after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            _navigateToLogin();
          }
        });
      } else {
        final errorData = json.decode(response.body);
        setState(() {
          _errorMessage = errorData['message'] ?? 'auth.password_reset_failed'.tr();
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'auth.password_reset_failed_retry'.tr();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
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
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _navigateToLogin(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 32),
                
                // Icon
                Icon(
                  Icons.lock_reset,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 24),
                
                // Title
                Text(
                  'auth.set_new_password'.tr(),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),

                // Subtitle
                Text(
                  _tokenValid
                      ? 'auth.enter_new_password'.tr()
                      : 'auth.reset_link_invalid'.tr(),
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),

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
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.check_circle_outline,
                          color: Theme.of(context).colorScheme.primary,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _successMessage!,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Show form only if token is valid and no success message
                if (_tokenValid && _successMessage == null) ...[
                  // New password field
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    textInputAction: TextInputAction.next,
                    enabled: !_isLoading,
                    decoration: InputDecoration(
                      labelText: 'auth.new_password'.tr(),
                      prefixIcon: const Icon(Icons.lock_outlined),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      helperText: 'auth.password_requirements'.tr(),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'auth.please_enter_new_password'.tr();
                      }
                      if (value.length < 8) {
                        return 'auth.password_min_8'.tr();
                      }
                      if (!RegExp(r'^(?=.*[A-Za-z])(?=.*\d)').hasMatch(value)) {
                        return 'auth.password_letters_numbers'.tr();
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Confirm password field
                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: _obscureConfirmPassword,
                    textInputAction: TextInputAction.done,
                    enabled: !_isLoading,
                    onFieldSubmitted: (_) => _resetPassword(),
                    decoration: InputDecoration(
                      labelText: 'auth.confirm_new_password'.tr(),
                      prefixIcon: const Icon(Icons.lock_outlined),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscureConfirmPassword ? Icons.visibility : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscureConfirmPassword = !_obscureConfirmPassword;
                          });
                        },
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'auth.please_confirm_new_password'.tr();
                      }
                      if (value != _passwordController.text) {
                        return 'auth.passwords_not_match'.tr();
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 32),

                  // Reset password button
                  FilledButton(
                    onPressed: _isLoading ? null : _resetPassword,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
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
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            'auth.reset_password'.tr(),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                  ),
                ],

                // Show back to login button if token is invalid or success
                if (!_tokenValid || _successMessage != null) ...[
                  FilledButton(
                    onPressed: _navigateToLogin,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'auth.back_to_sign_in'.tr(),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],

                const SizedBox(height: 32),

                // Back to login link (always visible)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'auth.remember_password'.tr(),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    TextButton(
                      onPressed: _isLoading ? null : _navigateToLogin,
                      child: Text(
                        'auth.sign_in'.tr(),
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}