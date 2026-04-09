import 'package:flutter/material.dart';
import '../../services/note_collaboration_service.dart';

/// Widget that displays a row of collaborator avatars for real-time collaboration
class CollaboratorIndicator extends StatelessWidget {
  final List<CollaborationUser> collaborators;
  final int maxVisible;
  final VoidCallback? onTap;

  const CollaboratorIndicator({
    super.key,
    required this.collaborators,
    this.maxVisible = 5,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (collaborators.isEmpty) {
      return const SizedBox.shrink();
    }

    final visibleCollaborators = collaborators.take(maxVisible).toList();
    final hiddenCount = collaborators.length - visibleCollaborators.length;

    // Calculate width for the stacked avatars
    // Each avatar is 32px, overlapping by 12px (so 20px per additional avatar)
    final avatarCount = visibleCollaborators.length + (hiddenCount > 0 ? 1 : 0);
    final stackWidth = avatarCount > 0 ? 32.0 + (avatarCount - 1) * 20.0 : 0.0;

    return GestureDetector(
      onTap: onTap ?? () => _showCollaboratorsDialog(context),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Live indicator dot
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: Colors.green,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.green.withOpacity(0.5),
                  blurRadius: 4,
                  spreadRadius: 1,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Stacked avatars with explicit width
          SizedBox(
            width: stackWidth,
            height: 32,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                for (int i = 0; i < visibleCollaborators.length; i++)
                  Positioned(
                    left: i * 20.0,
                    child: _CollaboratorAvatar(
                      user: visibleCollaborators[i],
                      showBorder: true,
                    ),
                  ),
                if (hiddenCount > 0)
                  Positioned(
                    left: visibleCollaborators.length * 20.0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Theme.of(context).colorScheme.surface,
                          width: 2,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '+$hiddenCount',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(width: 8),

          // Text label
          Text(
            '${collaborators.length} editing',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  void _showCollaboratorsDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _CollaboratorsBottomSheet(collaborators: collaborators),
    );
  }
}

/// Individual collaborator avatar
class _CollaboratorAvatar extends StatelessWidget {
  final CollaborationUser user;
  final bool showBorder;
  final double size;

  const _CollaboratorAvatar({
    required this.user,
    this.showBorder = false,
    this.size = 32,
  });

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(user.color);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        shape: BoxShape.circle,
        border: showBorder
            ? Border.all(
                color: Theme.of(context).colorScheme.surface,
                width: 2,
              )
            : null,
      ),
      child: user.avatar != null && user.avatar!.isNotEmpty
          ? ClipOval(
              child: Image.network(
                user.avatar!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _buildInitials(color),
              ),
            )
          : _buildInitials(color),
    );
  }

  Widget _buildInitials(Color color) {
    final initials = _getInitials(user.name);
    return Center(
      child: Text(
        initials,
        style: TextStyle(
          fontSize: size * 0.4,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '?';
    }
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  Color _parseColor(String colorStr) {
    try {
      if (colorStr.startsWith('#')) {
        final hex = colorStr.substring(1);
        if (hex.length == 6) {
          return Color(int.parse('FF$hex', radix: 16));
        } else if (hex.length == 8) {
          return Color(int.parse(hex, radix: 16));
        }
      }
    } catch (e) {
      // Fall through to default
    }
    return Colors.blue;
  }
}

/// Bottom sheet showing all collaborators
class _CollaboratorsBottomSheet extends StatelessWidget {
  final List<CollaborationUser> collaborators;

  const _CollaboratorsBottomSheet({required this.collaborators});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Title
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.green.withOpacity(0.5),
                      blurRadius: 4,
                      spreadRadius: 1,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Currently Editing',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                '${collaborators.length} user${collaborators.length == 1 ? '' : 's'}',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Collaborators list
          ...collaborators.map((user) => _CollaboratorTile(user: user)),

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

/// Individual collaborator tile in the bottom sheet
class _CollaboratorTile extends StatelessWidget {
  final CollaborationUser user;

  const _CollaboratorTile({required this.user});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          _CollaboratorAvatar(user: user, size: 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.name,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  _getStatusText(),
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          // Cursor indicator color
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: _parseColor(user.color),
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }

  String _getStatusText() {
    if (user.cursorIndex != null) {
      return 'Editing...';
    }
    return 'Viewing';
  }

  Color _parseColor(String colorStr) {
    try {
      if (colorStr.startsWith('#')) {
        final hex = colorStr.substring(1);
        if (hex.length == 6) {
          return Color(int.parse('FF$hex', radix: 16));
        }
      }
    } catch (e) {
      // Fall through
    }
    return Colors.blue;
  }
}

/// Widget to display cursor position of a collaborator in the editor
class CollaboratorCursor extends StatelessWidget {
  final CursorData cursor;
  final double top;
  final double left;

  const CollaboratorCursor({
    super.key,
    required this.cursor,
    required this.top,
    required this.left,
  });

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(cursor.userColor);

    return Positioned(
      top: top,
      left: left,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Cursor line
          Container(
            width: 2,
            height: 20,
            color: color,
          ),
          // Name label
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            decoration: BoxDecoration(
              color: color,
              borderRadius: const BorderRadius.only(
                topRight: Radius.circular(4),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(4),
              ),
            ),
            child: Text(
              cursor.userName,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _parseColor(String colorStr) {
    try {
      if (colorStr.startsWith('#')) {
        final hex = colorStr.substring(1);
        if (hex.length == 6) {
          return Color(int.parse('FF$hex', radix: 16));
        }
      }
    } catch (e) {
      // Fall through
    }
    return Colors.blue;
  }
}
