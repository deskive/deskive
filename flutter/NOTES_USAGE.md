# Notes Functionality with App at Once

This document explains how to use the notes functionality implemented with the App at Once SDK.

## Overview

The notes system supports the complete schema you provided, including:
- Hierarchical notes (parent-child relationships)
- Rich content storage (JSON format)
- Metadata (tags, favorites, templates, etc.)
- Workspace organization
- Version tracking (created_at, updated_at)

## Quick Start

### 1. Basic Note Creation

```dart
import 'package:your_app/utils/note_helper.dart';

// Create a simple text note
final note = await NoteHelper.createTextNote(
  workspaceId: 'your-workspace-id',
  title: 'Meeting Notes',
  text: 'Discussion about project timeline.',
  createdBy: 'user-id',
  tags: ['meetings', 'planning'],
  isFavorite: true,
);
```

### 2. Rich Content Notes

```dart
// Create a note with structured content
final richContent = {
  'type': 'doc',
  'content': [
    {
      'type': 'heading',
      'attrs': {'level': 1},
      'content': [{'type': 'text', 'text': 'Project Plan'}]
    },
    {
      'type': 'bulletList',
      'content': [
        {
          'type': 'listItem',
          'content': [
            {
              'type': 'paragraph',
              'content': [{'type': 'text', 'text': 'Phase 1: Planning'}]
            }
          ]
        }
      ]
    }
  ]
};

final note = await NoteHelper.createRichNote(
  workspaceId: 'workspace-id',
  title: 'Project Plan',
  content: richContent,
  createdBy: 'user-id',
  icon: '📋',
);
```

### 3. Hierarchical Notes

```dart
// Create parent note
final parentNote = await NoteHelper.createTextNote(
  workspaceId: 'workspace-id',
  title: 'Project Documentation',
  text: 'Main project folder',
  createdBy: 'user-id',
  icon: '📁',
);

// Create child note
final childNote = await NoteHelper.createTextNote(
  workspaceId: 'workspace-id',
  title: 'API Documentation',
  text: 'Details about the API endpoints',
  createdBy: 'user-id',
  parentId: parentNote.id, // Link to parent
);
```

## Note Model Schema

```dart
class Note {
  final String? id;                    // UUID primary key
  final String workspaceId;            // Required workspace reference
  final String title;                  // Note title
  final Map<String, dynamic> content;  // Rich content (JSON)
  final String? contentText;           // Plain text version
  final String? parentId;              // Parent note reference
  final String? parentNoteId;          // Alternative parent reference
  final String? authorId;              // Original author
  final String createdBy;              // Creator (required)
  final String? lastEditedBy;          // Last editor
  final int position;                  // Ordering position
  final String? templateId;            // Template reference
  final int viewCount;                 // View statistics
  final bool isPublished;              // Publication status
  final DateTime? publishedAt;         // Publication date
  final String? slug;                  // URL slug
  final String? coverImage;            // Cover image URL
  final String? icon;                  // Note icon
  final List<String> tags;             // Tags array
  final bool isTemplate;               // Template flag
  final bool isPublic;                 // Public visibility
  final DateTime? deletedAt;           // Soft delete timestamp
  final DateTime? archivedAt;          // Archive timestamp
  final bool isFavorite;               // Favorite status
  final Map<String, dynamic> collaborativeData; // Collaboration data
  final DateTime createdAt;            // Creation timestamp
  final DateTime updatedAt;            // Update timestamp
}
```

## Service Methods

### Core Operations

```dart
final service = AppAtOnceService.instance;

// Create table
await service.createNotesTable();

// Insert note
final insertedNote = await service.insertNote(note);

// Get notes
final notes = await service.getNotes(workspaceId: 'workspace-id');
final childNotes = await service.getNotes(parentId: 'parent-note-id');

// Get specific note
final note = await service.getNoteById('note-id');

// Update note
final updatedNote = await service.updateNote(note);

// Delete (soft delete)
await service.deleteNote('note-id');

// Permanent delete
await service.permanentlyDeleteNote('note-id');
```

### Helper Methods

```dart
// Toggle favorite
final favoriteNote = await NoteHelper.toggleFavorite(note);

// Add tags
final taggedNote = await NoteHelper.addTags(note, ['new-tag', 'another-tag']);

// Remove tags
final untaggedNote = await NoteHelper.removeTags(note, ['old-tag']);

// Archive note
await NoteHelper.archiveNote('note-id');
```

## Content Structures

### Text Content
```dart
{
  'type': 'doc',
  'content': [
    {
      'type': 'paragraph',
      'content': [
        {'type': 'text', 'text': 'Your text here'}
      ]
    }
  ]
}
```

### Heading Content
```dart
{
  'type': 'doc',
  'content': [
    {
      'type': 'heading',
      'attrs': {'level': 1}, // 1-6
      'content': [
        {'type': 'text', 'text': 'Heading Text'}
      ]
    }
  ]
}
```

### List Content
```dart
{
  'type': 'doc',
  'content': [
    {
      'type': 'bulletList', // or 'orderedList'
      'content': [
        {
          'type': 'listItem',
          'content': [
            {
              'type': 'paragraph',
              'content': [
                {'type': 'text', 'text': 'List item text'}
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Database Schema

The notes table includes these indexes for optimal performance:
- `workspace_id` - For workspace queries
- `parent_id` - For hierarchical queries
- `parent_note_id` - Alternative parent queries
- `tags` (GIN index) - For tag-based searches
- `deleted_at` - For filtering deleted notes
- `workspace_id, deleted_at` - Combined workspace/deletion queries
- `is_favorite` - For favorite filtering
- `archived_at` - For archive filtering

## Current Implementation Status

- ✅ **Note Model**: Complete with all schema fields
- ✅ **Service Layer**: CRUD operations defined
- ✅ **Helper Utilities**: Convenience methods for common operations
- ✅ **Content Structures**: Predefined JSON structures
- ✅ **Examples**: Comprehensive usage examples
- ⏳ **SDK Integration**: Waiting for correct App at Once API

## Next Steps

Once the App at Once SDK API is properly documented:
1. Replace placeholder methods with actual SDK calls
2. Implement real-time synchronization
3. Add error handling and validation
4. Create UI components for note management
5. Add search and filtering capabilities

## Example Usage

See `lib/examples/notes_example.dart` for comprehensive examples of:
- Simple text notes
- Rich content notes
- Notes with metadata
- Template creation
- Hierarchical note structures
- Note updates and management

To run the examples:
```dart
import 'package:your_app/examples/notes_example.dart';

await NotesExample.runExamples();
```