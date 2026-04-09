import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Model class for attachments
class AttachmentItem {
  final String id;
  final String name;
  final AttachmentType type;
  final Map<String, dynamic>? metadata;

  AttachmentItem({
    required this.id,
    required this.name,
    required this.type,
    this.metadata,
  });

  factory AttachmentItem.fromMap(Map<String, dynamic> map) {
    return AttachmentItem(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      type: AttachmentType.fromString(map['type'] ?? 'file'),
      metadata: map,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'type': type.value,
      ...?metadata,
    };
  }
}

enum AttachmentType {
  note('note'),
  event('event'),
  file('file');

  final String value;
  const AttachmentType(this.value);

  static AttachmentType fromString(String value) {
    switch (value.toLowerCase()) {
      case 'note':
        return AttachmentType.note;
      case 'event':
        return AttachmentType.event;
      case 'file':
        return AttachmentType.file;
      default:
        return AttachmentType.file;
    }
  }

  IconData get icon {
    switch (this) {
      case AttachmentType.note:
        return Icons.description_outlined;
      case AttachmentType.event:
        return Icons.event_outlined;
      case AttachmentType.file:
        return Icons.insert_drive_file_outlined;
    }
  }

  Color get color {
    switch (this) {
      case AttachmentType.note:
        return Colors.blue;
      case AttachmentType.event:
        return Colors.green;
      case AttachmentType.file:
        return Colors.orange;
    }
  }

  String get label {
    switch (this) {
      case AttachmentType.note:
        return 'Note';
      case AttachmentType.event:
        return 'Event';
      case AttachmentType.file:
        return 'File';
    }
  }
}

/// A reusable widget for displaying attachments (notes, events, files)
/// Shows attached items as chips/cards with remove option
class AttachmentDisplayWidget extends StatelessWidget {
  final List<AttachmentItem> attachments;
  final Function(AttachmentItem)? onRemove;
  final Function(AttachmentItem)? onTap;
  final bool showRemoveButton;
  final bool isCompact;
  final String? emptyMessage;

  const AttachmentDisplayWidget({
    super.key,
    required this.attachments,
    this.onRemove,
    this.onTap,
    this.showRemoveButton = true,
    this.isCompact = false,
    this.emptyMessage,
  });

  @override
  Widget build(BuildContext context) {
    if (attachments.isEmpty) {
      if (emptyMessage != null) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(
            emptyMessage!,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
              fontSize: 13,
            ),
          ),
        );
      }
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Icon(
                Icons.attach_file,
                size: 16,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              ),
              const SizedBox(width: 6),
              Text(
                'Attachments (${attachments.length})',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),

        // Attachments list
        isCompact ? _buildCompactView(context) : _buildExpandedView(context),
      ],
    );
  }

  Widget _buildCompactView(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: attachments.map((attachment) {
        return _buildCompactChip(context, attachment);
      }).toList(),
    );
  }

  Widget _buildCompactChip(BuildContext context, AttachmentItem attachment) {
    return InkWell(
      onTap: onTap != null ? () => onTap!(attachment) : null,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: attachment.type.color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: attachment.type.color.withOpacity(0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              attachment.type.icon,
              size: 14,
              color: attachment.type.color,
            ),
            const SizedBox(width: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 120),
              child: Text(
                attachment.name,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (showRemoveButton && onRemove != null) ...[
              const SizedBox(width: 4),
              InkWell(
                onTap: () => onRemove!(attachment),
                borderRadius: BorderRadius.circular(10),
                child: Icon(
                  Icons.close,
                  size: 14,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildExpandedView(BuildContext context) {
    return Column(
      children: attachments.map((attachment) {
        return _buildExpandedCard(context, attachment);
      }).toList(),
    );
  }

  Widget _buildExpandedCard(BuildContext context, AttachmentItem attachment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.1),
        ),
      ),
      child: InkWell(
        onTap: onTap != null ? () => onTap!(attachment) : null,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Icon container
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: attachment.type.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  attachment.type.icon,
                  size: 18,
                  color: attachment.type.color,
                ),
              ),
              const SizedBox(width: 12),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      attachment.name,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      attachment.type.label,
                      style: TextStyle(
                        color: attachment.type.color,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

              // Remove button
              if (showRemoveButton && onRemove != null)
                IconButton(
                  onPressed: () => onRemove!(attachment),
                  icon: Icon(
                    Icons.close,
                    size: 18,
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                  ),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 32,
                    minHeight: 32,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A combined widget that includes both the mention trigger functionality
/// and attachment display. Use this for easy integration.
class AttachmentFieldWidget extends StatelessWidget {
  final List<AttachmentItem> attachments;
  final Function(AttachmentItem) onRemoveAttachment;
  final Function(AttachmentItem)? onTapAttachment;
  final bool isCompact;

  const AttachmentFieldWidget({
    super.key,
    required this.attachments,
    required this.onRemoveAttachment,
    this.onTapAttachment,
    this.isCompact = true,
  });

  @override
  Widget build(BuildContext context) {
    if (attachments.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: AttachmentDisplayWidget(
        attachments: attachments,
        onRemove: onRemoveAttachment,
        onTap: onTapAttachment,
        isCompact: isCompact,
        showRemoveButton: true,
      ),
    );
  }
}
