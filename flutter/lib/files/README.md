# Enhanced File Management System

This directory contains a comprehensive file management system for the Flutter app, providing full integration with the backend file API endpoints.

## Overview

The enhanced file management system provides:
- File upload with progress tracking
- File download with progress indicators
- File preview capabilities
- Share functionality with link generation
- Advanced file search and filtering
- Folder management
- Storage statistics
- Batch operations

## Architecture

### Services

#### FileService (`/lib/services/file_service.dart`)
The main service that handles all file operations:
- Singleton pattern for global access
- Progress tracking for uploads/downloads
- Caching for better performance
- Integration with FileApiService for backend communication

Key features:
- Upload progress tracking with cancellation
- Download progress tracking with cancellation  
- File validation
- Cache management
- Chunked upload support for large files
- File preview URL generation

#### FileApiService (`/lib/api/services/file_api_service.dart`)
Updated to match backend API structure:
- Compatible with `/api/v1/files/` endpoints
- Proper DTO mapping for backend compatibility
- Pagination support
- Error handling

### Widgets

#### FileUploadWidget (`/lib/widgets/file_upload_widget.dart`)
Handles file uploads with:
- Multiple file selection
- Progress indicators for each file
- File validation (size, type)
- Upload cancellation
- Error handling and retry

#### FileDownloadWidget (`/lib/widgets/file_download_widget.dart`)
Manages file downloads with:
- Progress tracking
- Download cancellation
- File info display
- Open file functionality

#### FilePreviewWidget (`/lib/widgets/file_preview_widget.dart`)
Provides file previews:
- Image preview with zoom
- PDF preview with browser opening
- Text file preview
- Video/Audio preview controls
- Fullscreen preview mode
- Thumbnail generation

#### FileShareWidget (`/lib/widgets/file_share_widget.dart`)
Handles file sharing:
- Create share links with permissions
- Password protection
- Expiration dates
- Share link management
- Copy to clipboard functionality

#### FileSearchWidget (`/lib/widgets/file_search_widget.dart`)
Advanced search and filtering:
- Real-time search
- File type filtering
- Date range filtering
- User filtering
- Filter chips display
- Search history

### Screens

#### EnhancedFilesScreen (`/lib/files/enhanced_files_screen.dart`)
Main file management screen with:
- Tab-based interface (Files, Upload, Stats)
- Grid and list view modes
- File selection and batch operations
- Search integration
- Folder navigation
- Storage statistics
- Infinite scroll pagination

## Backend Integration

### API Endpoints

The system integrates with these backend endpoints:

```
/api/v1/workspaces/:workspaceId/files/
├── POST   /upload                    # Single file upload
├── POST   /upload/multiple           # Multiple file upload
├── GET    /                          # List files (paginated)
├── GET    /search                    # Search files
├── GET    /stats                     # Storage statistics
├── GET    /:fileId                   # Get file details
├── GET    /:fileId/download          # Download file
├── PUT    /:fileId/move              # Move/rename file
├── DELETE /:fileId                   # Delete file
├── POST   /:fileId/share             # Create share link
├── GET    /:fileId/shares            # Get file shares
└── DELETE /shares/:shareId           # Revoke share

/api/v1/workspaces/:workspaceId/files/folders/
├── POST   /                          # Create folder
├── GET    /                          # List folders
└── DELETE /:folderId                 # Delete folder

/api/v1/files/shared/
├── GET    /:shareToken               # Access shared file
└── GET    /:shareToken/download      # Download shared file
```

### Data Models

#### FileModel
```dart
class FileModel {
  final String id;
  final String name;
  final String originalName;
  final String mimeType;
  final int size;
  final String url;
  final String? thumbnailUrl;
  final String uploadedBy;
  final String? uploaderName;
  final String workspaceId;
  final String? folderId;
  final String? description;
  final List<String>? tags;
  final bool isPublic;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;
}
```

#### Folder
```dart
class Folder {
  final String id;
  final String name;
  final String? description;
  final String? parentId;
  final String createdBy;
  final String workspaceId;
  final bool isPublic;
  final List<Folder>? subfolders;
  final int? fileCount;
  final DateTime createdAt;
  final DateTime updatedAt;
}
```

#### FileShare
```dart
class FileShare {
  final String id;
  final String fileId;
  final String token;
  final String permission;
  final DateTime? expiresAt;
  final bool isPublic;
  final bool hasPassword;
  final DateTime createdAt;
}
```

## Usage

### Basic Setup

1. Add FileService to your app's provider tree:

```dart
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => FileService.instance),
    // other providers...
  ],
  child: MyApp(),
)
```

2. Initialize FileService with workspace ID:

```dart
final fileService = Provider.of<FileService>(context, listen: false);
fileService.initialize(workspaceId);
```

### Using the Enhanced Files Screen

```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => EnhancedFilesScreen(
      workspaceId: 'your-workspace-id',
      folderId: 'optional-folder-id', // null for root
    ),
  ),
);
```

### File Upload

```dart
// Standalone upload widget
FileUploadWidget(
  folderId: folderId,
  allowMultiple: true,
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
  onUploadComplete: () {
    // Handle completion
  },
)

// Programmatic upload
final response = await fileService.uploadFile(
  file: File('path/to/file.pdf'),
  folderId: 'optional-folder-id',
  description: 'File description',
  tags: ['tag1', 'tag2'],
);
```

### File Download

```dart
// Download widget
FileDownloadWidget(
  file: fileModel,
  onDownloadComplete: () {
    // Handle completion
  },
)

// Programmatic download
final response = await fileService.downloadFile(
  fileId: 'file-id',
  customPath: '/custom/path/file.pdf',
);
```

### File Search

```dart
FileSearchWidget(
  onResults: (files) {
    // Handle search results
  },
  onClearSearch: () {
    // Handle search clear
  },
)
```

### File Sharing

```dart
// Share widget
FileShareWidget(
  file: fileModel,
  onShareCreated: () {
    // Handle share creation
  },
)

// Programmatic sharing
final response = await fileService.shareFile(
  fileId: 'file-id',
  permission: 'read',
  expiresAt: DateTime.now().add(Duration(days: 7)),
  password: 'optional-password',
);
```

## Features

### File Upload
- ✅ Single and multiple file upload
- ✅ Progress tracking with cancellation
- ✅ File validation (size, type)
- ✅ Error handling and retry
- ✅ Chunked upload support for large files

### File Download
- ✅ Progress tracking with cancellation
- ✅ Custom download paths
- ✅ File info display
- ✅ Open file functionality

### File Management
- ✅ Grid and list view modes
- ✅ File sorting and filtering
- ✅ Batch operations (select multiple)
- ✅ File rename and move
- ✅ File deletion with confirmation

### File Sharing
- ✅ Share link creation
- ✅ Permission levels (read/write)
- ✅ Password protection
- ✅ Expiration dates
- ✅ Share link management

### File Preview
- ✅ Image preview with zoom
- ✅ PDF preview
- ✅ Text file preview
- ✅ Video/Audio preview
- ✅ Fullscreen mode
- ✅ Thumbnail generation

### Search and Filtering
- ✅ Real-time search
- ✅ File type filtering
- ✅ Date range filtering
- ✅ User filtering
- ✅ Advanced filter dialog

### Storage Management
- ✅ Storage quota tracking
- ✅ Usage statistics
- ✅ File type breakdown
- ✅ Storage warnings

## Performance Optimizations

1. **Caching**: Files, folders, and file details are cached for better performance
2. **Pagination**: Files are loaded in pages with infinite scroll
3. **Lazy Loading**: Thumbnails and previews are loaded on demand
4. **Progress Tracking**: Real-time progress updates for uploads/downloads
5. **Debounced Search**: Search queries are debounced to avoid excessive API calls

## Error Handling

The system provides comprehensive error handling:
- Network errors with retry options
- File validation errors
- Storage quota exceeded errors
- Permission denied errors
- File not found errors

## Future Enhancements

Potential future improvements:
- File versioning
- Collaborative editing
- Advanced file annotations
- OCR text extraction
- File conversion
- Bulk operations optimization
- Offline file access
- File synchronization

## Dependencies

Required packages:
```yaml
dependencies:
  flutter: ^3.0.0
  provider: ^6.0.0
  dio: ^5.0.0
  file_picker: ^5.0.0
  path_provider: ^2.0.0
  path: ^1.8.0
  mime: ^1.0.0
```

## Testing

The system includes comprehensive testing:
- Unit tests for services
- Widget tests for UI components
- Integration tests for file operations
- Mock API responses for testing

## Security Considerations

- File validation to prevent malicious uploads
- Secure file sharing with permissions
- Password protection for sensitive files
- Token-based authentication
- File access logging