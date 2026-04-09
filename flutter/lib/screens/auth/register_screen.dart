import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/auth_service.dart';
import '../../services/oauth_service.dart';
import '../../services/social_auth_service.dart';
import '../../services/workspace_management_service.dart';
import '../../services/analytics_service.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/auth_wrapper.dart';
import 'login_screen.dart';
import '../../utils/theme_notifier.dart';
import '../common/webview_screen.dart';

class RegisterScreen extends StatefulWidget {
  final ThemeNotifier? themeNotifier;
  
  const RegisterScreen({super.key, this.themeNotifier});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _acceptedTerms = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _signUp() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (!_acceptedTerms) {
      setState(() {
        _errorMessage = 'auth.accept_terms_required'.tr();
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = AuthService.instance;
      
      // Initialize auth service if not already initialized
      if (!authService.isInitialized) {
        await authService.initialize();
      }

      final user = await authService.signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        name: _nameController.text.trim(),
      );

      if (mounted) {
        // Track signup event
        AnalyticsService.instance.logSignUp(method: 'email');

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('auth.account_created'.tr()),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );

        // Navigate to login screen
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => LoginScreen(themeNotifier: widget.themeNotifier),
          ),
        );
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

  void _navigateToLogin() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => LoginScreen(themeNotifier: widget.themeNotifier),
      ),
    );
  }

  void _openWebView(String url, String title) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => WebViewScreen(
          url: url,
          title: title,
        ),
      ),
    );
  }

  Future<void> _signUpWithProvider(String provider) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Use native OAuth for Apple and Google on iOS/macOS
      if ((Platform.isIOS || Platform.isMacOS) && (provider == 'apple' || provider == 'google')) {
        await _signUpWithNativeProvider(provider);
        return;
      }

      // Use browser-based OAuth for GitHub and other platforms
      await OAuthService.instance.startOAuthFlow(
        provider: provider,
        context: context,
        onSuccess: () {
          // Track OAuth signup event
          AnalyticsService.instance.logSignUp(method: provider);

          // OAuth completed successfully
          if (mounted) {
            setState(() {
              _isLoading = false;
            });

            // Navigate to AuthWrapper which will show the correct screen
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(
                builder: (context) => AuthWrapper(themeNotifier: widget.themeNotifier!),
              ),
              (route) => false,
            );
          }
        },
        onError: (error) {
          if (mounted) {
            setState(() {
              _errorMessage = error;
              _isLoading = false;
            });
          }
        },
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'auth.failed_sign_up_with'.tr(args: [provider, e.toString()]);
          _isLoading = false;
        });
      }
    }
  }

  /// Native OAuth for Apple and Google on iOS
  Future<void> _signUpWithNativeProvider(String provider) async {
    try {
      // Initialize SocialAuthService
      await SocialAuthService.instance.initialize();

      Map<String, dynamic> result;

      if (provider == 'apple') {
        result = await SocialAuthService.instance.signInWithApple();
      } else if (provider == 'google') {
        result = await SocialAuthService.instance.signInWithGoogle();
      } else {
        throw Exception('Unsupported native provider: $provider');
      }

      // Track OAuth signup event
      AnalyticsService.instance.logSignUp(method: provider);

      // Reinitialize AuthProvider
      await AuthProvider.instance.initialize();

      // Initialize workspaces
      await WorkspaceManagementService.instance.initialize();

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        // Navigate to AuthWrapper
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (context) => AuthWrapper(themeNotifier: widget.themeNotifier!),
          ),
          (route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  /// Build social authentication button
  Widget _buildSocialButton({
    required VoidCallback onPressed,
    required IconData icon,
    required String label,
    required Color backgroundColor,
    required Color iconColor,
    Color? borderColor,
  }) {
    return Tooltip(
      message: 'auth.sign_up_with'.tr(args: [label]),
      child: Material(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: _isLoading ? null : onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              border: borderColor != null ? Border.all(color: borderColor) : null,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Icon(
                icon,
                color: _isLoading ? iconColor.withOpacity(0.5) : iconColor,
                size: 32,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 32),
                
                // Logo and app name
                Image.asset(
                  'assets/images/logo.png',
                  width: 100,
                  height: 100,
                ),
                const SizedBox(height: 16),
                
                Text(
                  'auth.create_account'.tr(),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),

                Text(
                  'auth.join_deskive'.tr(),
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

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
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Name field
                TextFormField(
                  controller: _nameController,
                  textInputAction: TextInputAction.next,
                  textCapitalization: TextCapitalization.words,
                  enabled: !_isLoading,
                  decoration: InputDecoration(
                    labelText: 'auth.full_name'.tr(),
                    prefixIcon: const Icon(Icons.person_outlined),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'auth.please_enter_full_name'.tr();
                    }
                    if (value.trim().length < 2) {
                      return 'auth.name_min_2'.tr();
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Email field
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  enabled: !_isLoading,
                  decoration: InputDecoration(
                    labelText: 'auth.email'.tr(),
                    prefixIcon: const Icon(Icons.email_outlined),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'auth.please_enter_email'.tr();
                    }
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                      return 'auth.please_enter_valid_email'.tr();
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Password field
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  textInputAction: TextInputAction.next,
                  enabled: !_isLoading,
                  decoration: InputDecoration(
                    labelText: 'auth.password'.tr(),
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
                      return 'auth.please_enter_password'.tr();
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
                  onFieldSubmitted: (_) => _signUp(),
                  decoration: InputDecoration(
                    labelText: 'auth.confirm_password'.tr(),
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
                      return 'auth.please_confirm_password'.tr();
                    }
                    if (value != _passwordController.text) {
                      return 'auth.passwords_not_match'.tr();
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Terms and conditions checkbox
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Checkbox(
                      value: _acceptedTerms,
                      onChanged: _isLoading ? null : (value) {
                        setState(() {
                          _acceptedTerms = value ?? false;
                        });
                      },
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: RichText(
                          text: TextSpan(
                            style: Theme.of(context).textTheme.bodySmall,
                            children: [
                              TextSpan(text: 'auth.i_agree_to'.tr()),
                              TextSpan(
                                text: 'auth.terms_of_service'.tr(),
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.w500,
                                  decoration: TextDecoration.underline,
                                ),
                                recognizer: TapGestureRecognizer()
                                  ..onTap = () => _openWebView(
                                    'https://deskive.com/terms',
                                    'auth.terms_of_service'.tr(),
                                  ),
                              ),
                              TextSpan(text: 'auth.and'.tr()),
                              TextSpan(
                                text: 'auth.privacy_policy'.tr(),
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.w500,
                                  decoration: TextDecoration.underline,
                                ),
                                recognizer: TapGestureRecognizer()
                                  ..onTap = () => _openWebView(
                                    'https://deskive.com/privacy',
                                    'auth.privacy_policy'.tr(),
                                  ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Sign up button
                FilledButton(
                  onPressed: (_isLoading || !_acceptedTerms) ? null : _signUp,
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
                          'auth.create_account'.tr(),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                ),
                const SizedBox(height: 16),

                // Divider
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'auth.or_continue_with'.tr(),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 20),

                // Social sign-up buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Google
                    _buildSocialButton(
                      onPressed: () => _signUpWithProvider('google'),
                      icon: Icons.g_mobiledata,
                      label: 'Google',
                      backgroundColor: Colors.white,
                      iconColor: Colors.red,
                      borderColor: Colors.grey.shade300,
                    ),
                    const SizedBox(width: 12),
                    // GitHub
                    _buildSocialButton(
                      onPressed: () => _signUpWithProvider('github'),
                      icon: Icons.code,
                      label: 'GitHub',
                      backgroundColor: Colors.grey.shade900,
                      iconColor: Colors.white,
                    ),
                    const SizedBox(width: 12),
                    // Apple
                    _buildSocialButton(
                      onPressed: () => _signUpWithProvider('apple'),
                      icon: Icons.apple,
                      label: 'Apple',
                      backgroundColor: Colors.black,
                      iconColor: Colors.white,
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Sign in link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'auth.already_have_account'.tr(),
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