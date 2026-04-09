import 'package:flutter/material.dart';
import '../../api/services/email_api_service.dart';

/// Widget to display account avatar, name, email, and provider badge
class AccountIndicator extends StatelessWidget {
  final EmailConnection connection;
  final String provider;
  final bool compact;
  final VoidCallback? onTap;

  const AccountIndicator({
    super.key,
    required this.connection,
    required this.provider,
    this.compact = false,
    this.onTap,
  });

  bool get isGmail => provider == 'gmail';
  Color get providerColor => isGmail ? Colors.red : Colors.blue;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final hasProfilePicture = connection.profilePicture != null &&
        connection.profilePicture!.isNotEmpty;

    final initial = (connection.displayName?.isNotEmpty == true
            ? connection.displayName![0]
            : connection.emailAddress.isNotEmpty
                ? connection.emailAddress[0]
                : 'U')
        .toUpperCase();

    if (compact) {
      return _buildCompact(context, hasProfilePicture, initial);
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            // Avatar
            hasProfilePicture
                ? CircleAvatar(
                    radius: 20,
                    backgroundImage: NetworkImage(connection.profilePicture!),
                    onBackgroundImageError: (exception, stackTrace) {},
                  )
                : CircleAvatar(
                    radius: 20,
                    backgroundColor: providerColor.withValues(alpha: 0.2),
                    child: isGmail
                        ? Text(
                            initial,
                            style: TextStyle(
                              color: providerColor,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : Icon(
                            Icons.dns,
                            color: providerColor,
                            size: 20,
                          ),
                  ),

            const SizedBox(width: 12),

            // Name and email
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          connection.displayName ?? connection.emailAddress,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      _buildProviderBadge(context),
                    ],
                  ),
                  if (connection.displayName != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      connection.emailAddress,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),

            if (onTap != null)
              Icon(
                Icons.chevron_right,
                color: colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompact(BuildContext context, bool hasProfilePicture, String initial) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Small avatar
        hasProfilePicture
            ? CircleAvatar(
                radius: 12,
                backgroundImage: NetworkImage(connection.profilePicture!),
                onBackgroundImageError: (exception, stackTrace) {},
              )
            : CircleAvatar(
                radius: 12,
                backgroundColor: providerColor.withValues(alpha: 0.2),
                child: isGmail
                    ? Text(
                        initial,
                        style: TextStyle(
                          fontSize: 10,
                          color: providerColor,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : Icon(
                        Icons.dns,
                        color: providerColor,
                        size: 12,
                      ),
              ),

        const SizedBox(width: 4),

        // Small provider badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
          decoration: BoxDecoration(
            color: providerColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(3),
          ),
          child: Text(
            isGmail ? 'Gmail' : 'SMTP',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: providerColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProviderBadge(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: providerColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        isGmail ? 'Gmail' : 'SMTP/IMAP',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: providerColor,
        ),
      ),
    );
  }
}

/// Simple provider badge widget
class ProviderBadge extends StatelessWidget {
  final String provider;
  final bool small;

  const ProviderBadge({
    super.key,
    required this.provider,
    this.small = false,
  });

  bool get isGmail => provider == 'gmail';
  Color get providerColor => isGmail ? Colors.red : Colors.blue;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 4 : 6,
        vertical: small ? 1 : 2,
      ),
      decoration: BoxDecoration(
        color: providerColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        isGmail ? 'Gmail' : 'SMTP',
        style: TextStyle(
          fontSize: small ? 9 : 10,
          fontWeight: FontWeight.w600,
          color: providerColor,
        ),
      ),
    );
  }
}
