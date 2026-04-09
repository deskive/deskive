import 'package:flutter/foundation.dart';
import '../models/folder/folder.dart' as model;
import '../models/file/file.dart' as file_model;

/// Shared clipboard service for cut/copy/paste operations
class ClipboardService extends ChangeNotifier {
  static final ClipboardService _instance = ClipboardService._internal();
  static ClipboardService get instance => _instance;

  ClipboardService._internal();

  // Clipboard items
  model.Folder? _copiedFolder;
  model.Folder? _cutFolder;
  file_model.File? _copiedFile;
  file_model.File? _cutFile;

  // Multiple items clipboard
  List<file_model.File> _copiedFiles = [];
  List<file_model.File> _cutFiles = [];
  List<model.Folder> _copiedFolders = [];
  List<model.Folder> _cutFolders = [];

  // Getters
  model.Folder? get copiedFolder => _copiedFolder;
  model.Folder? get cutFolder => _cutFolder;
  file_model.File? get copiedFile => _copiedFile;
  file_model.File? get cutFile => _cutFile;

  List<file_model.File> get copiedFiles => _copiedFiles;
  List<file_model.File> get cutFiles => _cutFiles;
  List<model.Folder> get copiedFolders => _copiedFolders;
  List<model.Folder> get cutFolders => _cutFolders;

  // Check if clipboard has anything
  bool get hasContent =>
      _copiedFolder != null ||
      _cutFolder != null ||
      _copiedFile != null ||
      _cutFile != null ||
      _copiedFiles.isNotEmpty ||
      _cutFiles.isNotEmpty ||
      _copiedFolders.isNotEmpty ||
      _cutFolders.isNotEmpty;

  // Copy operations
  void copyFolder(model.Folder folder) {
    _copiedFolder = folder;
    _cutFolder = null;
    _copiedFile = null;
    _cutFile = null;
    _copiedFiles = [];
    _cutFiles = [];
    _copiedFolders = [];
    _cutFolders = [];
    notifyListeners();
  }

  void copyFile(file_model.File file) {
    _copiedFile = file;
    _cutFile = null;
    _copiedFolder = null;
    _cutFolder = null;
    _copiedFiles = [];
    _cutFiles = [];
    _copiedFolders = [];
    _cutFolders = [];
    notifyListeners();
  }

  // Copy multiple items
  void copyMultipleFiles(List<file_model.File> files) {
    _copiedFiles = List.from(files);
    _cutFiles = [];
    _copiedFolders = [];
    _cutFolders = [];
    _copiedFile = null;
    _cutFile = null;
    _copiedFolder = null;
    _cutFolder = null;
    notifyListeners();
  }

  void copyMultipleFolders(List<model.Folder> folders) {
    _copiedFolders = List.from(folders);
    _cutFolders = [];
    _copiedFiles = [];
    _cutFiles = [];
    _copiedFile = null;
    _cutFile = null;
    _copiedFolder = null;
    _cutFolder = null;
    notifyListeners();
  }

  void copyMultipleItems({
    List<file_model.File>? files,
    List<model.Folder>? folders,
  }) {
    _copiedFiles = files != null ? List.from(files) : [];
    _copiedFolders = folders != null ? List.from(folders) : [];
    _cutFiles = [];
    _cutFolders = [];
    _copiedFile = null;
    _cutFile = null;
    _copiedFolder = null;
    _cutFolder = null;
    notifyListeners();
  }

  // Cut operations
  void setCutFolder(model.Folder folder) {
    _cutFolder = folder;
    _copiedFolder = null;
    _copiedFile = null;
    _cutFile = null;
    _copiedFiles = [];
    _cutFiles = [];
    _copiedFolders = [];
    _cutFolders = [];
    notifyListeners();
  }

  void setCutFile(file_model.File file) {
    _cutFile = file;
    _copiedFile = null;
    _copiedFolder = null;
    _cutFolder = null;
    _copiedFiles = [];
    _cutFiles = [];
    _copiedFolders = [];
    _cutFolders = [];
    notifyListeners();
  }

  // Cut multiple items
  void cutMultipleFiles(List<file_model.File> files) {
    _cutFiles = List.from(files);
    _copiedFiles = [];
    _copiedFolders = [];
    _cutFolders = [];
    _copiedFile = null;
    _cutFile = null;
    _copiedFolder = null;
    _cutFolder = null;
    notifyListeners();
  }

  void cutMultipleFolders(List<model.Folder> folders) {
    _cutFolders = List.from(folders);
    _copiedFolders = [];
    _copiedFiles = [];
    _cutFiles = [];
    _copiedFile = null;
    _cutFile = null;
    _copiedFolder = null;
    _cutFolder = null;
    notifyListeners();
  }

  void cutMultipleItems({
    List<file_model.File>? files,
    List<model.Folder>? folders,
  }) {
    _cutFiles = files != null ? List.from(files) : [];
    _cutFolders = folders != null ? List.from(folders) : [];
    _copiedFiles = [];
    _copiedFolders = [];
    _copiedFile = null;
    _cutFile = null;
    _copiedFolder = null;
    _cutFolder = null;
    notifyListeners();
  }

  // Clear clipboard
  void clear() {
    _copiedFolder = null;
    _cutFolder = null;
    _copiedFile = null;
    _cutFile = null;
    _copiedFiles = [];
    _cutFiles = [];
    _copiedFolders = [];
    _cutFolders = [];
    notifyListeners();
  }

  // Get clipboard content description
  String getDescription() {
    if (_cutFile != null) return 'Cut: ${_cutFile!.name}';
    if (_copiedFile != null) return 'Copied: ${_copiedFile!.name}';
    if (_cutFolder != null) return 'Cut: ${_cutFolder!.name}';
    if (_copiedFolder != null) return 'Copied: ${_copiedFolder!.name}';
    if (_cutFiles.isNotEmpty) return 'Cut: ${_cutFiles.length} file(s)';
    if (_cutFolders.isNotEmpty) return 'Cut: ${_cutFolders.length} folder(s)';
    if (_copiedFiles.isNotEmpty) return 'Copied: ${_copiedFiles.length} file(s)';
    if (_copiedFolders.isNotEmpty) return 'Copied: ${_copiedFolders.length} folder(s)';
    if (_copiedFiles.isNotEmpty || _copiedFolders.isNotEmpty) {
      return 'Copied: ${_copiedFiles.length} file(s) and ${_copiedFolders.length} folder(s)';
    }
    if (_cutFiles.isNotEmpty || _cutFolders.isNotEmpty) {
      return 'Cut: ${_cutFiles.length} file(s) and ${_cutFolders.length} folder(s)';
    }
    return 'Empty';
  }
}
