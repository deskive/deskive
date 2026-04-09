import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../utils/theme_notifier.dart';
import '../screens/auth/login_screen.dart';

/// Deletion reasons enum matching backend
enum DeletionReason {
  foundAlternative('found_alternative', 'Found a better alternative'),
  privacyConcerns('privacy_concerns', 'Privacy/security concerns'),
  bugsErrors('bugs_errors', 'Too many bugs or errors'),
  missingFeatures('missing_features', 'Missing features I need'),
  tooComplicated('too_complicated', 'App is too complicated'),
  notUsing('not_using', 'Not using the app anymore'),
  other('other', 'Other reason');

  final String value;
  final String label;
  const DeletionReason(this.value, this.label);
}

/// Account Deletion Exit Survey Widget
/// A multi-step survey shown before account deletion to gather feedback
/// and attempt to retain users.
class DeletionExitSurvey extends StatefulWidget {
  final VoidCallback? onCancel;
  final VoidCallback? onLogoutInstead;

  const DeletionExitSurvey({
    super.key,
    this.onCancel,
    this.onLogoutInstead,
  });

  /// Show the exit survey as a bottom sheet
  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (context) => DeletionExitSurvey(
        onCancel: () => Navigator.pop(context, false),
        onLogoutInstead: () async {
          Navigator.pop(context, false);
          await AuthService.instance.signOut();
          if (context.mounted) {
            Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
              MaterialPageRoute(
                builder: (_) => LoginScreen(themeNotifier: ThemeNotifier()),
              ),
              (route) => false,
            );
          }
        },
      ),
    );
  }

  @override
  State<DeletionExitSurvey> createState() => _DeletionExitSurveyState();
}

class _DeletionExitSurveyState extends State<DeletionExitSurvey> {
  int _currentStep = 0;
  DeletionReason? _selectedReason;
  final TextEditingController _feedbackController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isSubmitting = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _feedbackController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Padding(
        padding: EdgeInsets.only(bottom: bottomPadding),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar with close button
            Padding(
              padding: const EdgeInsets.only(top: 8, left: 16, right: 8),
              child: Row(
                children: [
                  const Spacer(),
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: theme.dividerColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: widget.onCancel,
                    icon: const Icon(Icons.close),
                    tooltip: 'Cancel',
                  ),
                ],
              ),
            ),
            // Progress indicator
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                children: List.generate(3, (index) {
                  return Expanded(
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(right: index < 2 ? 8 : 0),
                      decoration: BoxDecoration(
                        color: index <= _currentStep
                            ? theme.colorScheme.primary
                            : theme.dividerColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _buildStepContent(theme),
              ),
            ),
            // Bottom actions
            _buildBottomActions(theme),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent(ThemeData theme) {
    switch (_currentStep) {
      case 0:
        return _buildReasonStep(theme);
      case 1:
        return _buildFeedbackStep(theme);
      case 2:
        return _buildConfirmationStep(theme);
      default:
        return const SizedBox.shrink();
    }
  }

  /// Step 1: Ask why they're leaving
  Widget _buildReasonStep(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.sentiment_dissatisfied,
                color: theme.colorScheme.primary, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'We\'re sorry to see you go!',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Help us improve by telling us why you\'re deleting your account.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.textTheme.bodySmall?.color,
          ),
        ),
        const SizedBox(height: 24),
        ...DeletionReason.values.map((reason) => _buildReasonOption(reason, theme)),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildReasonOption(DeletionReason reason, ThemeData theme) {
    final isSelected = _selectedReason == reason;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => setState(() => _selectedReason = reason),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(
              color: isSelected ? theme.colorScheme.primary : theme.dividerColor,
              width: isSelected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(12),
            color: isSelected
                ? theme.colorScheme.primary.withOpacity(0.05)
                : null,
          ),
          child: Row(
            children: [
              Icon(
                isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: isSelected ? theme.colorScheme.primary : theme.dividerColor,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  reason.label,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ),
              _getReasonIcon(reason, theme),
            ],
          ),
        ),
      ),
    );
  }

  Icon _getReasonIcon(DeletionReason reason, ThemeData theme) {
    IconData icon;
    Color color;
    switch (reason) {
      case DeletionReason.foundAlternative:
        icon = Icons.swap_horiz;
        color = Colors.blue;
        break;
      case DeletionReason.privacyConcerns:
        icon = Icons.security;
        color = Colors.orange;
        break;
      case DeletionReason.bugsErrors:
        icon = Icons.bug_report;
        color = Colors.red;
        break;
      case DeletionReason.missingFeatures:
        icon = Icons.extension;
        color = Colors.purple;
        break;
      case DeletionReason.tooComplicated:
        icon = Icons.psychology;
        color = Colors.teal;
        break;
      case DeletionReason.notUsing:
        icon = Icons.access_time;
        color = Colors.grey;
        break;
      case DeletionReason.other:
        icon = Icons.more_horiz;
        color = Colors.grey;
        break;
    }
    return Icon(icon, color: color, size: 20);
  }

  /// Step 2: Targeted feedback based on reason
  Widget _buildFeedbackStep(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildTargetedResponse(theme),
        const SizedBox(height: 24),
        Text(
          'Any additional feedback? (Optional)',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _feedbackController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'Tell us more about your experience...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            filled: true,
          ),
        ),
        const SizedBox(height: 16),
        // Offer alternatives
        _buildAlternativeActions(theme),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildTargetedResponse(ThemeData theme) {
    String title;
    String message;
    IconData icon;
    Color color;
    Widget? action;

    switch (_selectedReason) {
      case DeletionReason.bugsErrors:
        title = 'We\'re sorry you experienced issues!';
        message = 'Please report the bug and we\'ll fix it quickly. Our team typically resolves issues within 24-48 hours.';
        icon = Icons.bug_report;
        color = Colors.red;
        action = OutlinedButton.icon(
          onPressed: () => _handleReportBug(),
          icon: const Icon(Icons.report_problem),
          label: const Text('Report Bug'),
        );
        break;
      case DeletionReason.missingFeatures:
        title = 'We\'d love to hear your ideas!';
        message = 'What feature would make this app perfect for you? Let us know and we\'ll consider adding it!';
        icon = Icons.lightbulb;
        color = Colors.amber;
        break;
      case DeletionReason.privacyConcerns:
        title = 'Your privacy matters to us';
        message = 'We take privacy seriously. Would you like to review our privacy settings or talk to our support team?';
        icon = Icons.shield;
        color = Colors.green;
        action = OutlinedButton.icon(
          onPressed: () => _handleContactSupport(),
          icon: const Icon(Icons.support_agent),
          label: const Text('Contact Support'),
        );
        break;
      case DeletionReason.tooComplicated:
        title = 'We\'re here to help!';
        message = 'Would you like a quick tutorial or to talk to our support team? We can help you get the most out of the app.';
        icon = Icons.help;
        color = Colors.blue;
        action = OutlinedButton.icon(
          onPressed: () => _handleContactSupport(),
          icon: const Icon(Icons.support_agent),
          label: const Text('Get Help'),
        );
        break;
      case DeletionReason.notUsing:
        title = 'No problem!';
        message = 'Would you prefer to just log out instead? Your data will be saved if you return.';
        icon = Icons.pause_circle;
        color = Colors.grey;
        action = ElevatedButton.icon(
          onPressed: widget.onLogoutInstead,
          icon: const Icon(Icons.logout),
          label: const Text('Log Out Instead'),
        );
        break;
      case DeletionReason.foundAlternative:
        title = 'We understand';
        message = 'We\'d love to know what they offer that we don\'t. Your feedback helps us improve!';
        icon = Icons.swap_horiz;
        color = Colors.blue;
        break;
      default:
        title = 'Thank you for your feedback';
        message = 'Your input helps us improve the app for everyone.';
        icon = Icons.feedback;
        color = theme.colorScheme.primary;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: theme.textTheme.bodyMedium,
          ),
          if (action != null) ...[
            const SizedBox(height: 12),
            action,
          ],
        ],
      ),
    );
  }

  Widget _buildAlternativeActions(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Not ready to delete?',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: widget.onLogoutInstead,
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('Log Out'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: widget.onCancel,
                  icon: const Icon(Icons.close, size: 18),
                  label: const Text('Cancel'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Step 3: Final confirmation with password
  Widget _buildConfirmationStep(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.error.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: theme.colorScheme.error.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.warning_amber_rounded,
                      color: theme.colorScheme.error, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Final Confirmation',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.error,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'This action cannot be undone. All your data will be permanently deleted including:',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              _buildDeletionItem('Your profile and settings', theme),
              _buildDeletionItem('All messages and files', theme),
              _buildDeletionItem('Your workspaces and projects', theme),
              _buildDeletionItem('Calendar events and notes', theme),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Enter your password to confirm deletion',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          enabled: !_isSubmitting,
          decoration: InputDecoration(
            labelText: 'Password',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off : Icons.visibility,
              ),
              onPressed: () {
                setState(() => _obscurePassword = !_obscurePassword);
              },
            ),
            errorText: _errorMessage,
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildDeletionItem(String text, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, bottom: 4),
      child: Row(
        children: [
          Icon(Icons.remove, size: 16, color: theme.colorScheme.error),
          const SizedBox(width: 8),
          Text(text, style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }

  Widget _buildBottomActions(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (_currentStep > 0)
              TextButton.icon(
                onPressed: _isSubmitting ? null : () {
                  setState(() => _currentStep--);
                },
                icon: const Icon(Icons.arrow_back),
                label: const Text('Back'),
              ),
            const Spacer(),
            if (_currentStep < 2)
              ElevatedButton(
                onPressed: _canProceed() ? _goToNextStep : null,
                child: const Text('Continue'),
              )
            else
              ElevatedButton(
                onPressed: _isSubmitting ? null : _handleDeleteAccount,
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.error,
                  foregroundColor: theme.colorScheme.onError,
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Delete Account'),
              ),
          ],
        ),
      ),
    );
  }

  bool _canProceed() {
    switch (_currentStep) {
      case 0:
        return _selectedReason != null;
      case 1:
        return true; // Feedback is optional
      case 2:
        return _passwordController.text.isNotEmpty;
      default:
        return false;
    }
  }

  void _goToNextStep() {
    if (_currentStep < 2) {
      setState(() {
        _currentStep++;
        _errorMessage = null;
      });
    }
  }

  Future<void> _handleDeleteAccount() async {
    final password = _passwordController.text.trim();
    if (password.isEmpty) {
      setState(() => _errorMessage = 'Password is required');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      // Submit feedback first
      await _submitFeedback(wasRetained: false, deletedAccount: true);

      // Delete account
      await AuthService.instance.deleteAccount(password);

      // Sign out
      await AuthService.instance.signOut();

      if (mounted) {
        // Navigate to login screen
        Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => LoginScreen(themeNotifier: ThemeNotifier()),
          ),
          (route) => false,
        );

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Account deleted successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  Future<void> _submitFeedback({
    required bool wasRetained,
    required bool deletedAccount,
  }) async {
    if (_selectedReason == null) return;

    try {
      await AuthService.instance.dio.post(
        '/auth/deletion-feedback',
        data: {
          'reason': _selectedReason!.value,
          'reasonDetails': _getReasonDetails(),
          'feedbackResponse': _feedbackController.text.trim().isNotEmpty
              ? _feedbackController.text.trim()
              : null,
          'wasRetained': wasRetained,
          'deletedAccount': deletedAccount,
        },
      );
    } catch (e) {
      // Don't block deletion if feedback submission fails
      debugPrint('Failed to submit deletion feedback: $e');
    }
  }

  String? _getReasonDetails() {
    // Add any specific details based on the reason
    switch (_selectedReason) {
      case DeletionReason.bugsErrors:
        return 'User experienced bugs/errors';
      case DeletionReason.missingFeatures:
        return 'User needs additional features';
      case DeletionReason.privacyConcerns:
        return 'User has privacy concerns';
      case DeletionReason.tooComplicated:
        return 'User found app too complicated';
      case DeletionReason.notUsing:
        return 'User not actively using the app';
      case DeletionReason.foundAlternative:
        return 'User found alternative solution';
      default:
        return null;
    }
  }

  void _handleReportBug() {
    // Submit feedback as retained and close
    _submitFeedback(wasRetained: true, deletedAccount: false);
    widget.onCancel?.call();
    // TODO: Navigate to bug report screen
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Please report the bug in Settings > Feedback & Support'),
        duration: Duration(seconds: 4),
      ),
    );
  }

  void _handleContactSupport() {
    // Submit feedback as retained and close
    _submitFeedback(wasRetained: true, deletedAccount: false);
    widget.onCancel?.call();
    // TODO: Navigate to support screen
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Please contact support in Settings > Feedback & Support'),
        duration: Duration(seconds: 4),
      ),
    );
  }
}
