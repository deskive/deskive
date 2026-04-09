import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../dao/workspace_dao.dart';
import '../models/workspace/workspace.dart';
import '../models/workspace/workspace_response.dart';
import '../services/auth_service.dart';

/// Workspace service following DAO pattern
/// Handles workspace operations and caching
class WorkspaceService extends ChangeNotifier {
  static WorkspaceService? _instance;
  static WorkspaceService get instance =>
      _instance ??= WorkspaceService._internal();

  WorkspaceService._internal();

  late WorkspaceDao _workspaceDao;
  bool _isInitialized = false;

  // State
  List<Workspace> _workspaces = [];
  Workspace? _currentWorkspace;
  bool _isLoading = false;
  String? _error;

  // Getters
  List<Workspace> get workspaces => _workspaces;
  Workspace? get currentWorkspace => _currentWorkspace;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasWorkspaces => _workspaces.isNotEmpty;

  /// Initialize the service with API configuration
  void initialize() {
    if (_isInitialized) return;

    _workspaceDao = WorkspaceDao();
    _isInitialized = true;

    // Update token when auth changes
    AuthService.instance.addListener(_updateAuthToken);
  }

  /// Update auth token in DAO
  void _updateAuthToken() {
    if (_isInitialized) {
      _workspaceDao = WorkspaceDao();
    }
  }

  /// Fetch all workspaces from API
  Future<void> fetchWorkspaces() async {
    if (!_isInitialized) {
      initialize();
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceDao.getAllWorkspaces();

      if (response.success && response.data != null) {
        _workspaces = response.data!;

        // Set first workspace as current if none is set
        if (_currentWorkspace == null && _workspaces.isNotEmpty) {
          await setCurrentWorkspace(_workspaces.first.id);
        }
      } else {
        _setError(response.message ?? 'Failed to fetch workspaces');
      }
    } catch (e) {
      _setError('Error fetching workspaces: $e');
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Get a specific workspace by ID
  Future<Workspace?> getWorkspace(String workspaceId) async {
    if (!_isInitialized) {
      initialize();
    }

    try {
      final response = await _workspaceDao.getWorkspace(workspaceId);

      if (response.success && response.data != null) {
        return response.data!;
      }
    } catch (e) {
    }

    return null;
  }

  /// Create a new workspace
  Future<Workspace?> createWorkspace({
    required String name,
    String? description,
    String? website,
    String? logo,
  }) async {
    if (!_isInitialized) {
      initialize();
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceDao.createWorkspace(
        name: name,
        description: description,
        website: website,
        logo: logo,
      );

      if (response.success && response.data != null) {
        _workspaces.add(response.data!);
        await setCurrentWorkspace(response.data!.id);
        notifyListeners();
        return response.data!;
      } else {
        _setError(response.message ?? 'Failed to create workspace');
      }
    } catch (e) {
      _setError('Error creating workspace: $e');
    } finally {
      _setLoading(false);
    }

    return null;
  }

  /// Update workspace details
  Future<bool> updateWorkspace(
    String workspaceId, {
    String? name,
    String? description,
    String? website,
    String? logo,
  }) async {
    if (!_isInitialized) {
      initialize();
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceDao.updateWorkspace(
        workspaceId,
        name: name,
        description: description,
        website: website,
        logo: logo,
      );

      if (response.success && response.data != null) {
        // Update in list
        final index = _workspaces.indexWhere((w) => w.id == workspaceId);
        if (index != -1) {
          _workspaces[index] = response.data!;
        }

        // Update current workspace if it's the one being updated
        if (_currentWorkspace?.id == workspaceId) {
          _currentWorkspace = response.data!;
        }

        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Failed to update workspace');
      }
    } catch (e) {
      _setError('Error updating workspace: $e');
    } finally {
      _setLoading(false);
    }

    return false;
  }

  /// Delete a workspace
  Future<bool> deleteWorkspace(String workspaceId) async {
    if (!_isInitialized) {
      initialize();
    }

    _setLoading(true);
    _clearError();

    try {
      final success = await _workspaceDao.deleteWorkspace(workspaceId);

      if (success) {
        _workspaces.removeWhere((w) => w.id == workspaceId);

        // If deleted workspace was current, switch to another
        if (_currentWorkspace?.id == workspaceId) {
          if (_workspaces.isNotEmpty) {
            await setCurrentWorkspace(_workspaces.first.id);
          } else {
            _currentWorkspace = null;
          }
        }

        notifyListeners();
        return true;
      } else {
        _setError('Failed to delete workspace');
      }
    } catch (e) {
      _setError('Error deleting workspace: $e');
    } finally {
      _setLoading(false);
    }

    return false;
  }

  /// Set current workspace and persist to storage
  Future<void> setCurrentWorkspace(String workspaceId) async {
    final workspace = _workspaces.firstWhere(
      (w) => w.id == workspaceId,
      orElse: () => _workspaces.first,
    );

    _currentWorkspace = workspace;

    // Persist to storage
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('current_workspace_id', workspaceId);

    notifyListeners();
  }

  /// Load current workspace from storage
  Future<void> loadCurrentWorkspaceFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final workspaceId = prefs.getString('current_workspace_id');

    if (workspaceId != null) {
      // IMPORTANT: Validate that the stored workspace ID belongs to the current user
      final workspaceIndex = _workspaces.indexWhere((w) => w.id == workspaceId);

      if (workspaceIndex != -1) {
        // Stored workspace exists in user's workspaces - use it
        _currentWorkspace = _workspaces[workspaceIndex];
        notifyListeners();
      } else {
        // Stored workspace doesn't belong to current user - clear it
        await prefs.remove('current_workspace_id');
        _currentWorkspace = null;

        // If user has workspaces, switch to the first one
        if (_workspaces.isNotEmpty) {
          await setCurrentWorkspace(_workspaces.first.id);
        } else {
          notifyListeners();
        }
      }
    } else if (_workspaces.isEmpty) {
      // No stored workspace and user has no workspaces
      _currentWorkspace = null;
      notifyListeners();
    }
  }

  /// Get workspace by ID from cache
  Workspace? getWorkspaceById(String workspaceId) {
    try {
      return _workspaces.firstWhere((w) => w.id == workspaceId);
    } catch (e) {
      return null;
    }
  }

  /// Get workspace members with their presence status
  Future<List<MemberPresence>> getWorkspaceMembers(String workspaceId) async {
    if (!_isInitialized) {
      initialize();
    }

    try {
      return await _workspaceDao.getMembersPresence(workspaceId);
    } catch (e) {
      return [];
    }
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
  }

  void _clearError() {
    _error = null;
  }

  void _setError(String error) {
    _error = error;
  }

  /// Clear all data (for logout)
  Future<void> clear() async {
    _workspaces.clear();
    _currentWorkspace = null;
    _isLoading = false;
    _error = null;
    _isInitialized = false; // Reset so it reinitializes on next login

    // CRITICAL: Clear stored workspace ID from SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('current_workspace_id');
    } catch (e) {
    }

    notifyListeners();
  }

  @override
  void dispose() {
    AuthService.instance.removeListener(_updateAuthToken);
    super.dispose();
  }
}
