import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/theme_notifier.dart';
import '../services/auth_service.dart';
import '../providers/auth_provider.dart';
import 'profile_screen.dart';
import 'workspace_screen.dart';
import 'security_screen.dart';
import 'notification_settings_screen.dart';
import 'billing_screen.dart';
import 'common/webview_screen.dart';
import '../team/team_screen.dart';
import 'tab_arrangement_screen.dart';
import 'feedback/feedback_history_screen.dart';
import 'support_contact_screen.dart';

class SettingsScreen extends StatefulWidget {
  final ThemeNotifier themeNotifier;

  const SettingsScreen({super.key, required this.themeNotifier});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isLoggingOut = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('settings.title'.tr()),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          _buildSettingsTile(
            context,
            icon: Icons.person_outline,
            title: 'settings.profile'.tr(),
            subtitle: 'settings.profile_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ProfileScreen(),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.work_outline,
            title: 'settings.workspace'.tr(),
            subtitle: 'settings.workspace_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const WorkspaceScreen(),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.group_outlined,
            title: 'settings.team'.tr(),
            subtitle: 'settings.team_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const TeamScreen(),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.security,
            title: 'settings.security'.tr(),
            subtitle: 'settings.security_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const SecurityScreen(),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.notifications_outlined,
            title: 'settings.notification'.tr(),
            subtitle: 'settings.notification_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const NotificationSettingsScreen(),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.dashboard_customize_outlined,
            title: 'settings.arrange_tabs'.tr(),
            subtitle: 'settings.arrange_tabs_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const TabArrangementScreen(),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.payment,
            title: 'settings.billing'.tr(),
            subtitle: 'settings.billing_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const BillingScreen(),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.privacy_tip_outlined,
            title: 'settings.privacy_policy'.tr(),
            subtitle: 'settings.privacy_policy_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => WebViewScreen(
                    url: 'https://deskive.com/privacy',
                    title: 'settings.privacy_policy'.tr(),
                  ),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.description_outlined,
            title: 'settings.terms_of_service'.tr(),
            subtitle: 'settings.terms_of_service_subtitle'.tr(),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => WebViewScreen(
                    url: 'https://deskive.com/terms',
                    title: 'settings.terms_of_service'.tr(),
                  ),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.feedback_outlined,
            title: 'Feedback and Report',
            subtitle: 'Report bugs and suggest improvements',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const FeedbackHistoryScreen(),
                ),
              );
            },
          ),
          _buildSettingsTile(
            context,
            icon: Icons.support_agent_outlined,
            title: 'Support & Contact',
            subtitle: 'Get help and contact our support team',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const SupportContactScreen(),
                ),
              );
            },
          ),

          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 20),

          // Logout Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoggingOut ? null : _handleLogout,
                icon: _isLoggingOut
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.logout),
                label: Text(_isLoggingOut ? 'settings.logging_out'.tr() : 'settings.logout'.tr()),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Future<void> _handleLogout() async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('settings.logout'.tr()),
        content: Text('settings.logout_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('settings.logout'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _isLoggingOut = true;
    });

    try {

      // Call logout API
      await AuthService.instance.dio.post('/auth/logout');

      // Sign out using AuthProvider (which will notify listeners including AuthWrapper)
      await AuthProvider.instance.signOut();

      // Pop all routes to get back to root where AuthWrapper will show LoginScreen
      if (mounted) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoggingOut = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('settings.logout_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildSettingsTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: Theme.of(context).colorScheme.primary),
      ),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle) : null,
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}