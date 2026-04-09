import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

/// Bottom sheet for adding a new email account
/// Supports unlimited accounts - always shows both Gmail and SMTP/IMAP options
class AddAccountSheet extends StatelessWidget {
  /// @deprecated No longer used - kept for backward compatibility
  final bool gmailConnected;
  /// @deprecated No longer used - kept for backward compatibility
  final bool smtpImapConnected;
  final VoidCallback onGmailConnect;
  final VoidCallback onSmtpImapConnect;

  const AddAccountSheet({
    super.key,
    this.gmailConnected = false, // Deprecated - no longer affects display
    this.smtpImapConnected = false, // Deprecated - no longer affects display
    required this.onGmailConnect,
    required this.onSmtpImapConnect,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colorScheme.onSurface.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Title
          Text(
            'email.add_account'.tr(),
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'email.add_account_description'.tr(),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),

          // Gmail option - always available for adding multiple Gmail accounts
          _AccountOption(
            icon: Icons.mail,
            iconColor: Colors.red,
            title: 'email.connect_gmail'.tr(),
            subtitle: 'email.connect_gmail_description'.tr(),
            onTap: () {
              Navigator.pop(context);
              onGmailConnect();
            },
          ),

          const SizedBox(height: 12),

          // SMTP/IMAP option - always available for adding multiple SMTP/IMAP accounts
          _AccountOption(
            icon: Icons.dns,
            iconColor: Colors.blue,
            title: 'email.connect_smtp_imap'.tr(),
            subtitle: 'email.connect_smtp_imap_description'.tr(),
            onTap: () {
              Navigator.pop(context);
              onSmtpImapConnect();
            },
          ),
        ],
      ),
    );
  }
}

class _AccountOption extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _AccountOption({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            children: [
              // Icon
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),

              // Text
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),

              // Arrow
              Icon(
                Icons.chevron_right,
                color: colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
