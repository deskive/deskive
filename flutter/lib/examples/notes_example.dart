import '../services/app_at_once_service.dart';
import '../utils/note_helper.dart';

/// Example class demonstrating how to work with notes using App at Once
class NotesExample {
  static Future<void> runExamples() async {
    
    try {
      // Ensure the service is initialized
      final service = AppAtOnceService.instance;
      
      // Create the notes table
      await service.createNotesTable();
      
      // Example 1: Create a simple text note
      await _createSimpleTextNote();
      
      // Example 2: Create a rich content note
      await _createRichContentNote();
      
      // Example 3: Create a note with tags and metadata
      await _createNoteWithMetadata();
      
      // Example 4: Create a template note
      await _createTemplateNote();
      
      // Example 5: Create hierarchical notes (parent-child)
      await _createHierarchicalNotes();
      
      
    } catch (e) {
    }
  }
  
  /// Example 1: Simple text note
  static Future<void> _createSimpleTextNote() async {
    
    final note = await NoteHelper.createTextNote(
      workspaceId: 'workspace-123',
      title: 'Meeting Notes',
      text: 'Discussed project timeline and deliverables for Q1 2024.',
      createdBy: 'user-456',
      tags: ['meetings', 'planning'],
      isFavorite: true,
    );
    
  }
  
  /// Example 2: Rich content note with structured JSON
  static Future<void> _createRichContentNote() async {
    
    final richContent = {
      'type': 'doc',
      'content': [
        {
          'type': 'heading',
          'attrs': {'level': 1},
          'content': [
            {'type': 'text', 'text': 'Project Requirements'}
          ]
        },
        {
          'type': 'paragraph',
          'content': [
            {'type': 'text', 'text': 'Here are the key requirements:'}
          ]
        },
        {
          'type': 'bulletList',
          'content': [
            {
              'type': 'listItem',
              'content': [
                {
                  'type': 'paragraph',
                  'content': [
                    {'type': 'text', 'text': 'User authentication system'}
                  ]
                }
              ]
            },
            {
              'type': 'listItem',
              'content': [
                {
                  'type': 'paragraph',
                  'content': [
                    {'type': 'text', 'text': 'Real-time data synchronization'}
                  ]
                }
              ]
            },
            {
              'type': 'listItem',
              'content': [
                {
                  'type': 'paragraph',
                  'content': [
                    {'type': 'text', 'text': 'Mobile responsive design'}
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    
    final note = await NoteHelper.createRichNote(
      workspaceId: 'workspace-123',
      title: 'Project Requirements Document',
      content: richContent,
      contentText: 'Project Requirements\nHere are the key requirements:\n• User authentication system\n• Real-time data synchronization\n• Mobile responsive design',
      createdBy: 'user-456',
      tags: ['requirements', 'documentation', 'project'],
      icon: '📋',
    );
    
  }
  
  /// Example 3: Note with metadata and tags
  static Future<void> _createNoteWithMetadata() async {
    
    final note = await NoteHelper.createTextNote(
      workspaceId: 'workspace-123',
      title: 'Daily Standup - March 15',
      text: '''
      What I did yesterday:
      - Implemented user authentication flow
      - Fixed database connection issues
      - Code review for payment module
      
      What I'm doing today:
      - Working on API documentation
      - Setting up CI/CD pipeline
      - Team retrospective meeting
      
      Blockers:
      - Waiting for design assets from design team
      ''',
      createdBy: 'user-456',
      tags: ['standup', 'daily', 'development', 'team'],
      isFavorite: false,
      icon: '📝',
    );
    
  }
  
  /// Example 4: Template note
  static Future<void> _createTemplateNote() async {
    
    final templateContent = NoteHelper.createBulletListContent([
      'What went well?',
      'What could be improved?',
      'Action items for next sprint',
      'Team feedback and suggestions'
    ]);
    
    final template = await NoteHelper.createTemplate(
      workspaceId: 'workspace-123',
      title: 'Sprint Retrospective Template',
      content: templateContent,
      contentText: '• What went well?\n• What could be improved?\n• Action items for next sprint\n• Team feedback and suggestions',
      createdBy: 'user-456',
      tags: ['template', 'retrospective', 'agile'],
      icon: '🔄',
    );
    
  }
  
  /// Example 5: Hierarchical notes (parent-child relationship)
  static Future<void> _createHierarchicalNotes() async {
    
    // Create parent note
    final parentNote = await NoteHelper.createTextNote(
      workspaceId: 'workspace-123',
      title: 'Mobile App Development Project',
      text: 'Main project folder for the new mobile application development.',
      createdBy: 'user-456',
      tags: ['project', 'mobile', 'development'],
      icon: '📱',
    );
    
    
    // Create child notes
    final childTitles = [
      'UI/UX Design Specifications',
      'Backend API Documentation', 
      'Testing Strategy',
      'Deployment Guidelines'
    ];
    
    for (final title in childTitles) {
      final childNote = await NoteHelper.createTextNote(
        workspaceId: 'workspace-123',
        title: title,
        text: 'Detailed information about $title will be added here.',
        createdBy: 'user-456',
        parentId: parentNote.id,
        tags: ['sub-document', 'project'],
      );
      
    }
  }
  
  /// Example of updating a note
  static Future<void> updateNoteExample() async {
    
    // First create a note
    final originalNote = await NoteHelper.createTextNote(
      workspaceId: 'workspace-123',
      title: 'Draft Document',
      text: 'This is a draft that needs updates.',
      createdBy: 'user-456',
      tags: ['draft'],
    );
    
    
    // Update the note
    final updatedNote = originalNote.copyWith(
      title: 'Final Document',
      contentText: 'This document has been finalized and approved.',
      content: NoteHelper.createHeadingContent('Final Document', 1),
    );
    
    final savedNote = await NoteHelper.updateNote(updatedNote);
    
    // Add more tags
    final noteWithTags = await NoteHelper.addTags(savedNote, ['approved', 'final']);
    
    // Toggle favorite
    final favoriteNote = await NoteHelper.toggleFavorite(noteWithTags);
  }
}