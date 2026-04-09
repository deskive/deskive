enum EventAttachmentType { note, document, link }

class EventAttachment {
  final String? id;
  final String eventId;
  final String noteId;
  final String attachedBy;
  final DateTime attachedAt;
  final EventAttachmentType attachmentType;
  
  // Additional fields for UI
  final String? noteTitle;
  final String? noteContent;

  EventAttachment({
    this.id,
    required this.eventId,
    required this.noteId,
    required this.attachedBy,
    DateTime? attachedAt,
    this.attachmentType = EventAttachmentType.note,
    this.noteTitle,
    this.noteContent,
  }) : attachedAt = attachedAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'event_id': eventId,
      'note_id': noteId,
      'attached_by': attachedBy,
      'attached_at': attachedAt.toIso8601String(),
      'attachment_type': attachmentType.name,
    };
  }

  factory EventAttachment.fromMap(Map<String, dynamic> map) {
    return EventAttachment(
      id: map['id'],
      eventId: map['event_id'] ?? '',
      noteId: map['note_id'] ?? '',
      attachedBy: map['attached_by'] ?? '',
      attachedAt: map['attached_at'] != null
          ? DateTime.parse(map['attached_at'])
          : DateTime.now(),
      attachmentType: _parseAttachmentType(map['attachment_type']),
      noteTitle: map['note_title'],
      noteContent: map['note_content'],
    );
  }

  static EventAttachmentType _parseAttachmentType(String? value) {
    switch (value) {
      case 'document':
        return EventAttachmentType.document;
      case 'link':
        return EventAttachmentType.link;
      default:
        return EventAttachmentType.note;
    }
  }

  EventAttachment copyWith({
    String? id,
    String? eventId,
    String? noteId,
    String? attachedBy,
    DateTime? attachedAt,
    EventAttachmentType? attachmentType,
    String? noteTitle,
    String? noteContent,
  }) {
    return EventAttachment(
      id: id ?? this.id,
      eventId: eventId ?? this.eventId,
      noteId: noteId ?? this.noteId,
      attachedBy: attachedBy ?? this.attachedBy,
      attachedAt: attachedAt ?? this.attachedAt,
      attachmentType: attachmentType ?? this.attachmentType,
      noteTitle: noteTitle ?? this.noteTitle,
      noteContent: noteContent ?? this.noteContent,
    );
  }

  @override
  String toString() {
    return 'EventAttachment{id: $id, eventId: $eventId, noteId: $noteId, type: $attachmentType}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is EventAttachment && 
           other.id == id &&
           other.eventId == eventId &&
           other.noteId == noteId;
  }

  @override
  int get hashCode => Object.hash(id, eventId, noteId);
}