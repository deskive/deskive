import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import '../api/services/workspace_api_service.dart';
import '../dao/workspace_dao.dart';

/// A reusable dialog widget to display member profile information
/// Can be used across different screens in the app
class MemberProfileDialog extends StatelessWidget {
  final WorkspaceMember member;
  final String? status; // 'online', 'away', 'busy', 'offline' - if null, uses isActive
  final VoidCallback? onClose;

  const MemberProfileDialog({
    super.key,
    required this.member,
    this.status,
    this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final name = member.name ?? 'member_profile.unknown'.tr();
    final initials = name.split(' ').map((e) => e.isNotEmpty ? e[0] : '').join().toUpperCase();
    final roleDisplay = _translateRole(member.role.value);

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 300),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'member_profile.title'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                InkWell(
                  onTap: onClose ?? () => Navigator.of(context).pop(),
                  borderRadius: BorderRadius.circular(16),
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.close, size: 20),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Avatar
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                  width: 2,
                ),
              ),
              child: CircleAvatar(
                radius: 36,
                backgroundColor: _getRoleColor(roleDisplay).withValues(alpha: 0.2),
                backgroundImage: member.avatar != null ? NetworkImage(member.avatar!) : null,
                child: member.avatar == null
                    ? Text(
                        initials,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: _getRoleColor(roleDisplay),
                        ),
                      )
                    : null,
              ),
            ),

            const SizedBox(height: 10),

            // Name
            Text(
              name,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 4),

            // Email with copy button
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    member.email,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: member.email));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('member_profile.email_copied'.tr()),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      Icons.copy,
                      size: 14,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Role Badge and Status Row
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Role Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getRoleColor(roleDisplay).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    roleDisplay,
                    style: TextStyle(
                      color: _getRoleColor(roleDisplay),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Status Badge
                Builder(
                  builder: (context) {
                    final memberStatus = _getMemberStatus();
                    final statusColor = _getStatusColor(memberStatus);
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: statusColor,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            memberStatus,
                            style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Divider
            Divider(
              height: 1,
              color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
            ),

            const SizedBox(height: 12),

            // Joined info
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 6),
                Text(
                  'member_profile.joined'.tr(args: [_formatJoinDate(member.joinedAt)]),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),

            // Permission badge for Owner only
            if (member.role == WorkspaceRole.owner) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.admin_panel_settings_outlined,
                    size: 14,
                    color: Colors.purple,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'member_profile.full_permissions'.tr(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.purple,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return Colors.purple;
      case 'admin':
        return Colors.blue;
      case 'member':
        return Colors.green;
      case 'viewer':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  Color _getStatusColor(String statusText) {
    switch (statusText.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'away':
        return Colors.orange;
      case 'busy':
        return Colors.red;
      case 'offline':
      default:
        return Colors.grey;
    }
  }

  String _getMemberStatus() {
    // Use passed status if available, otherwise fall back to isActive
    if (status != null) {
      switch (status!.toLowerCase()) {
        case 'online':
          return 'member_profile.status_active'.tr();
        case 'away':
          return 'member_profile.status_away'.tr();
        case 'busy':
          return 'member_profile.status_busy'.tr();
        case 'offline':
        default:
          return 'member_profile.status_offline'.tr();
      }
    }
    // Fallback to isActive
    return member.isActive ? 'member_profile.status_active'.tr() : 'member_profile.status_offline'.tr();
  }

  String _formatJoinDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'member_profile.today'.tr();
    } else if (difference.inDays == 1) {
      return 'member_profile.yesterday'.tr();
    } else if (difference.inDays < 7) {
      return 'member_profile.days_ago'.tr(args: [difference.inDays.toString()]);
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return 'member_profile.weeks_ago'.tr(args: [weeks.toString()]);
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return 'member_profile.months_ago'.tr(args: [months.toString()]);
    } else {
      final years = (difference.inDays / 365).floor();
      return 'member_profile.years_ago'.tr(args: [years.toString()]);
    }
  }

  String _translateRole(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'member_profile.role_owner'.tr();
      case 'admin':
        return 'member_profile.role_admin'.tr();
      case 'member':
        return 'member_profile.role_member'.tr();
      case 'viewer':
        return 'member_profile.role_viewer'.tr();
      case 'guest':
        return 'member_profile.role_guest'.tr();
      default:
        return role;
    }
  }
}

/// Helper function to show the member profile dialog
/// [status] can be 'online', 'away', 'busy', 'offline' - if null, uses member.isActive
Future<void> showMemberProfileDialog({
  required BuildContext context,
  required WorkspaceMember member,
  String? status,
}) {
  return showDialog(
    context: context,
    builder: (context) => MemberProfileDialog(member: member, status: status),
  );
}

/// Helper function to show member profile dialog from MemberPresence
/// This is useful when you have presence data instead of WorkspaceMember
/// [avatarUrl] can be passed separately if presence API doesn't return avatar
Future<void> showMemberPresenceProfileDialog({
  required BuildContext context,
  required MemberPresence member,
  String? avatarUrl,
}) {
  return showDialog(
    context: context,
    builder: (context) => MemberPresenceProfileDialog(
      member: member,
      avatarUrl: avatarUrl,
    ),
  );
}

/// Dialog widget for MemberPresence model
class MemberPresenceProfileDialog extends StatelessWidget {
  final MemberPresence member;
  final String? avatarUrl; // Optional avatar URL (if not in member)
  final VoidCallback? onClose;

  const MemberPresenceProfileDialog({
    super.key,
    required this.member,
    this.avatarUrl,
    this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final name = member.name;
    final initials = name.split(' ').map((e) => e.isNotEmpty ? e[0] : '').join().toUpperCase();
    final roleDisplay = member.role.isNotEmpty
        ? _translateRole(member.role)
        : 'member_profile.role_member'.tr();
    // Use avatarUrl parameter first, then fall back to member.avatar
    final avatar = avatarUrl ?? member.avatar;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 300),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'member_profile.title'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                InkWell(
                  onTap: onClose ?? () => Navigator.of(context).pop(),
                  borderRadius: BorderRadius.circular(16),
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.close, size: 20),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Avatar
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                  width: 2,
                ),
              ),
              child: CircleAvatar(
                radius: 36,
                backgroundColor: _getRoleColor(roleDisplay).withValues(alpha: 0.2),
                backgroundImage: avatar != null && avatar.isNotEmpty
                    ? NetworkImage(avatar)
                    : null,
                child: avatar == null || avatar.isEmpty
                    ? Text(
                        initials,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: _getRoleColor(roleDisplay),
                        ),
                      )
                    : null,
              ),
            ),

            const SizedBox(height: 10),

            // Name
            Text(
              name,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 4),

            // Email with copy button
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    member.email,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: member.email));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('member_profile.email_copied'.tr()),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      Icons.copy,
                      size: 14,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Role Badge and Status Row
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Role Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getRoleColor(roleDisplay).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    roleDisplay,
                    style: TextStyle(
                      color: _getRoleColor(roleDisplay),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Status Badge
                Builder(
                  builder: (context) {
                    final statusText = _getStatusText(member.status);
                    final statusColor = _getStatusColor(statusText);
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: statusColor,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            statusText,
                            style: TextStyle(
                              color: statusColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Divider
            Divider(
              height: 1,
              color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
            ),

            const SizedBox(height: 12),

            // Last seen info
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.access_time,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 6),
                Text(
                  member.status.toLowerCase() == 'online'
                      ? 'member_profile.active_now'.tr()
                      : member.lastSeen != null
                          ? 'member_profile.last_seen'.tr(args: [_formatLastSeen(member.lastSeen!)])
                          : 'member_profile.status_offline'.tr(),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),

            // Permission badge for Owner only
            if (member.role.toLowerCase() == 'owner') ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.admin_panel_settings_outlined,
                    size: 14,
                    color: Colors.purple,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'member_profile.full_permissions'.tr(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.purple,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return Colors.purple;
      case 'admin':
        return Colors.blue;
      case 'member':
        return Colors.green;
      case 'viewer':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  Color _getStatusColor(String statusText) {
    switch (statusText.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'away':
        return Colors.orange;
      case 'busy':
        return Colors.red;
      case 'offline':
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'online':
        return 'member_profile.status_active'.tr();
      case 'away':
        return 'member_profile.status_away'.tr();
      case 'busy':
        return 'member_profile.status_busy'.tr();
      case 'offline':
      default:
        return 'member_profile.status_offline'.tr();
    }
  }

  String _formatLastSeen(String lastSeen) {
    try {
      final lastSeenDate = DateTime.parse(lastSeen);
      final difference = DateTime.now().difference(lastSeenDate);

      if (difference.inMinutes < 1) {
        return 'member_profile.just_now'.tr();
      } else if (difference.inMinutes < 60) {
        return 'member_profile.minutes_ago'.tr(args: [difference.inMinutes.toString()]);
      } else if (difference.inHours < 24) {
        return 'member_profile.hours_ago'.tr(args: [difference.inHours.toString()]);
      } else {
        return 'member_profile.days_ago'.tr(args: [difference.inDays.toString()]);
      }
    } catch (e) {
      return 'member_profile.unknown'.tr();
    }
  }

  String _translateRole(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'member_profile.role_owner'.tr();
      case 'admin':
        return 'member_profile.role_admin'.tr();
      case 'member':
        return 'member_profile.role_member'.tr();
      case 'viewer':
        return 'member_profile.role_viewer'.tr();
      case 'guest':
        return 'member_profile.role_guest'.tr();
      default:
        return role;
    }
  }
}
