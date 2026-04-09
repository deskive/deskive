import 'package:flutter/foundation.dart';
import '../models/note.dart';

/// AppAtOnce Service - Migrated to REST API with Dio
/// This service is deprecated and methods will throw errors.
/// Use individual REST API services instead (AuthService, NotesService, etc.)
class AppAtOnceService {
  static AppAtOnceService? _instance;
  static AppAtOnceService get instance => _instance ??= AppAtOnceService._();

  AppAtOnceService._();

  bool _initialized = false;
  String? _currentWorkspaceId;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      _initialized = true;
    } catch (e) {
      rethrow;
    }
  }

  bool get isInitialized => _initialized;
  String? get currentWorkspaceId => _currentWorkspaceId;

  // API key getter - kept for backward compatibility with existing code
  String get apiKey => throw UnimplementedError(
    'apiKey is deprecated. Use AppConfig.appAtOnceApiKey instead.'
  );

  // Table creation - not needed for REST API
  Future<void> createTable(String tableName, Map<String, dynamic> schema) async {
  }

  Future<Map<String, dynamic>> insertData(String table, Map<String, dynamic> data) async {
    throw UnimplementedError('insertData() is deprecated. Use REST API services instead.');
  }

  Future<List<Map<String, dynamic>>> getData(String table) async {
    throw UnimplementedError('getData() is deprecated. Use REST API services instead.');
  }

  // Notes-specific methods - stub implementations
  Future<void> createNotesTable() async {
  }

  Future<Note> insertNote(Note note) async {
    throw UnimplementedError(
      'insertNote() is deprecated. Use NotesService.createNote() with REST API instead.'
    );
  }

  Future<String?> getFirstWorkspaceId() async {
    return _currentWorkspaceId;
  }

  Future<List<Note>> getNotes({String? workspaceId, String? parentId}) async {
    throw UnimplementedError(
      'getNotes() is deprecated. Use NotesService.getNotes() with REST API instead.'
    );
  }

  Future<Note?> getNoteById(String noteId) async {
    throw UnimplementedError(
      'getNoteById() is deprecated. Use NotesService.getNote() with REST API instead.'
    );
  }

  Future<Note> updateNote(Note note) async {
    throw UnimplementedError(
      'updateNote() is deprecated. Use NotesService.updateNote() with REST API instead.'
    );
  }

  Future<void> deleteNote(String noteId) async {
    throw UnimplementedError(
      'deleteNote() is deprecated. Use NotesService.deleteNote() with REST API instead.'
    );
  }

  Future<void> permanentlyDeleteNote(String noteId) async {
    throw UnimplementedError(
      'permanentlyDeleteNote() is deprecated. Use NotesService.deleteNote() with REST API instead.'
    );
  }
}
