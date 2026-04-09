import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/auth_provider.dart';
import '../../services/workspace_management_service.dart';
import '../../services/oauth_service.dart';
import '../../services/social_auth_service.dart';
import '../../services/analytics_service.dart';
import '../../models/user.dart';
import '../../widgets/auth_wrapper.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';
import '../main_screen.dart';
import '../workspace/create_workspace_screen.dart';
import '../../utils/theme_notifier.dart';

class LoginScreen extends StatefulWidget {
  final ThemeNotifier? themeNotifier;
  
  const LoginScreen({super.key, this.themeNotifier});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  // Languages list
  final List<Map<String, String>> _languages = [
    {'value': 'en', 'label': 'English'},
    {'value': 'ja', 'label': '日本語'},
  ];

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authProvider = AuthProvider.instance;

      // Initialize auth provider if not already initialized
      if (!authProvider.isInitialized) {
        await authProvider.initialize();
      }

      // Use AuthProvider instead of AuthService to ensure state updates propagate
      final user = await authProvider.signIn(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (mounted) {
        // Track login event
        AnalyticsService.instance.logLogin(method: 'email');

        // Load workspaces after successful login
        await WorkspaceManagementService.instance.initialize();

        // Navigate to MainScreen
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => AuthWrapper(themeNotifier: widget.themeNotifier!),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        final errorMsg = e.toString().replaceFirst('Exception: ', '');
        setState(() {
          _errorMessage = errorMsg;
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

  Future<void> _signInWithProvider(String provider) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Use native OAuth for Apple and Google on iOS/macOS
      if ((Platform.isIOS || Platform.isMacOS) && (provider == 'apple' || provider == 'google')) {
        await _signInWithNativeProvider(provider);
        return;
      }

      // Use browser-based OAuth for GitHub and other platforms
      await OAuthService.instance.startOAuthFlow(
        provider: provider,
        context: context,
        onSuccess: () {
          // Track OAuth login event
          AnalyticsService.instance.logLogin(method: provider);

          // OAuth completed successfully
          if (mounted) {
            setState(() {
              _isLoading = false;
            });

            // Navigate to AuthWrapper which will show the correct screen
            // This ensures navigation happens even if the Safari View Controller
            // was blocking the AuthWrapper's state-based rebuild
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
          _errorMessage = 'auth.failed_sign_in_with'.tr(args: [provider, e.toString()]);
          _isLoading = false;
        });
      }
    }
  }

  /// Native OAuth for Apple and Google on iOS
  Future<void> _signInWithNativeProvider(String provider) async {
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

      // Track OAuth login event
      AnalyticsService.instance.logLogin(method: provider);

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

  void _navigateToRegister() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => RegisterScreen(themeNotifier: widget.themeNotifier),
      ),
    );
  }

  void _navigateToForgotPassword() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ForgotPasswordScreen(themeNotifier: widget.themeNotifier),
      ),
    );
  }

  void _showLanguagePicker() {
    final currentLocale = context.locale.languageCode;

    showDialog(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        title: Text('profile.select_language'.tr()),
        children: _languages.map((lang) {
          final isSelected = lang['value'] == currentLocale;
          return SimpleDialogOption(
            onPressed: () {
              // Apply the locale change
              context.setLocale(Locale(lang['value']!));
              Navigator.pop(dialogContext);
            },
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    lang['label']!,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected ? Theme.of(dialogContext).colorScheme.primary : null,
                    ),
                  ),
                ),
                if (isSelected)
                  Icon(Icons.check, color: Theme.of(dialogContext).colorScheme.primary, size: 20),
              ],
            ),
          );
        }).toList(),
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
                // Language selector at top right
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: _showLanguagePicker,
                    icon: const Icon(Icons.language, size: 20),
                    label: Text(
                      _languages.firstWhere(
                        (l) => l['value'] == context.locale.languageCode,
                        orElse: () => {'label': 'English'},
                      )['label']!,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Logo and app name
                Image.asset(
                  'assets/images/logo.png',
                  width: 100,
                  height: 100,
                ),
                const SizedBox(height: 16),
                
                Text(
                  'Deskive',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                
                Text(
                  'auth.welcome_back'.tr(),
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
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.error_outline,
                          color: Colors.red.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

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
                  textInputAction: TextInputAction.done,
                  enabled: !_isLoading,
                  onFieldSubmitted: (_) => _signIn(),
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
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'auth.please_enter_password'.tr();
                    }
                    if (value.length < 6) {
                      return 'auth.password_min_6'.tr();
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Forgot password link
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _isLoading ? null : _navigateToForgotPassword,
                    child: Text(
                      'auth.forgot_password'.tr(),
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // Sign in button
                FilledButton(
                  onPressed: _isLoading ? null : _signIn,
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
                          'auth.sign_in'.tr(),
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

                // Social sign-in buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Google
                    _buildSocialButton(
                      onPressed: () => _signInWithProvider('google'),
                      icon: Icons.g_mobiledata,
                      label: 'Google',
                      backgroundColor: Colors.white,
                      iconColor: Colors.red,
                      borderColor: Colors.grey.shade300,
                    ),
                    const SizedBox(width: 12),
                    // GitHub
                    _buildSocialButton(
                      onPressed: () => _signInWithProvider('github'),
                      icon: Icons.code,
                      label: 'GitHub',
                      backgroundColor: Colors.grey.shade900,
                      iconColor: Colors.white,
                    ),
                    const SizedBox(width: 12),
                    // Apple
                    _buildSocialButton(
                      onPressed: () => _signInWithProvider('apple'),
                      icon: Icons.apple,
                      label: 'Apple',
                      backgroundColor: Colors.black,
                      iconColor: Colors.white,
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Sign up link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'auth.dont_have_account'.tr(),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    TextButton(
                      onPressed: _isLoading ? null : _navigateToRegister,
                      child: Text(
                        'auth.sign_up'.tr(),
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
      message: 'auth.sign_in_with'.tr(args: [label]),
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
}