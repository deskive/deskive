import 'package:flutter/material.dart';
import '../models/email_account_state.dart';

/// Tab bar widget for switching between email accounts
/// Supports unlimited accounts (multiple Gmail and/or SMTP/IMAP)
/// Shows "All Mail" tab when there are 2+ connected accounts
class EmailAccountTabs extends StatelessWidget {
  final List<EmailAccountState> accounts;
  final int selectedIndex;
  final ValueChanged<int> onTabSelected;
  final VoidCallback? onAddAccount;
  final bool canAddAccount;
  final bool showAllMailTab;

  const EmailAccountTabs({
    super.key,
    required this.accounts,
    required this.selectedIndex,
    required this.onTabSelected,
    this.onAddAccount,
    this.canAddAccount = true,
    this.showAllMailTab = false,
  });

  /// Total tab count including All Mail tab
  int get _totalTabCount => showAllMailTab ? accounts.length + 1 : accounts.length;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: colorScheme.outlineVariant,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          // Account tabs
          Expanded(
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              itemCount: _totalTabCount,
              itemBuilder: (context, index) {
                // First tab is All Mail when showAllMailTab is true
                if (showAllMailTab && index == 0) {
                  final isSelected = selectedIndex == 0;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: _AllMailTab(
                      isSelected: isSelected,
                      onTap: () => onTabSelected(0),
                    ),
                  );
                }

                // Adjust index for account tabs
                final accountIndex = showAllMailTab ? index - 1 : index;
                final account = accounts[accountIndex];
                final isSelected = index == selectedIndex;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _AccountTab(
                    account: account,
                    isSelected: isSelected,
                    onTap: () => onTabSelected(index),
                  ),
                );
              },
            ),
          ),

          // Add account button - only shown if can add more accounts
          if (onAddAccount != null && canAddAccount)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: IconButton(
                icon: Icon(
                  Icons.add_circle_outline,
                  color: colorScheme.primary,
                ),
                onPressed: onAddAccount,
                tooltip: 'Add email account',
              ),
            ),
        ],
      ),
    );
  }
}

/// All Mail tab widget
class _AllMailTab extends StatelessWidget {
  final bool isSelected;
  final VoidCallback onTap;

  const _AllMailTab({
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final allMailColor = Colors.blue;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? allMailColor.withValues(alpha: 0.15)
                : colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? allMailColor : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 12,
                backgroundColor: allMailColor.withValues(alpha: 0.2),
                child: Icon(
                  Icons.all_inbox,
                  size: 14,
                  color: allMailColor,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'All Mail',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  color: isSelected ? allMailColor : colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AccountTab extends StatelessWidget {
  final EmailAccountState account;
  final bool isSelected;
  final VoidCallback onTap;

  const _AccountTab({
    required this.account,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final isGmail = account.provider == 'gmail';
    final providerColor = isGmail ? Colors.red : colorScheme.primary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? providerColor.withValues(alpha: 0.15)
                : colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? providerColor : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Provider icon or avatar
              _buildAvatar(context, providerColor),
              const SizedBox(width: 8),

              // Email address (truncated)
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 120),
                child: Text(
                  account.emailAddress.isNotEmpty
                      ? account.emailAddress
                      : (isGmail ? 'Gmail' : 'SMTP/IMAP'),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected ? providerColor : colorScheme.onSurface,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),

              const SizedBox(width: 4),

              // Provider badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: providerColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  isGmail ? 'Gmail' : 'SMTP',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: providerColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(BuildContext context, Color providerColor) {
    final hasProfilePicture = account.profilePicture != null && account.profilePicture!.isNotEmpty;

    if (hasProfilePicture) {
      return CircleAvatar(
        radius: 12,
        backgroundImage: NetworkImage(account.profilePicture!),
        onBackgroundImageError: (exception, stackTrace) {},
      );
    }

    return CircleAvatar(
      radius: 12,
      backgroundColor: providerColor.withValues(alpha: 0.2),
      child: Icon(
        account.isGmail ? Icons.mail : Icons.dns,
        size: 14,
        color: providerColor,
      ),
    );
  }
}
