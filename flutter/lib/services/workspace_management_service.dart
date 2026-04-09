import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/workspace_invitation_api_service.dart';
import '../api/base_api_client.dart';

/// Comprehensive workspace management service
/// Handles workspace creation, switching, member management, and invitations
class WorkspaceManagementService extends ChangeNotifier {
  static WorkspaceManagementService? _instance;
  static WorkspaceManagementService get instance => 
      _instance ??= WorkspaceManagementService._internal();

  WorkspaceManagementService._internal() {
    _workspaceApiService = WorkspaceApiService();
    _invitationApiService = WorkspaceInvitationApiService();
  }

  late WorkspaceApiService _workspaceApiService;
  late WorkspaceInvitationApiService _invitationApiService;

  // State management
  List<Workspace> _workspaces = [];
  Workspace? _currentWorkspace;
  List<WorkspaceMember> _currentWorkspaceMembers = [];
  List<WorkspaceInvitation> _pendingInvitations = [];
  bool _isLoading = false;
  String? _error;

  // Getters
  List<Workspace> get workspaces => _workspaces;
  Workspace? get currentWorkspace => _currentWorkspace;
  List<WorkspaceMember> get currentWorkspaceMembers => _currentWorkspaceMembers;
  List<WorkspaceInvitation> get pendingInvitations => _pendingInvitations;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasWorkspaces => _workspaces.isNotEmpty;
  bool get canManageCurrentWorkspace => _currentWorkspace?.membership?.canManageWorkspace() ?? false;
  bool get canManageMembers => _currentWorkspace?.membership?.canManageMembers() ?? false;
  bool get isCurrentWorkspaceOwner => _currentWorkspace?.membership?.isOwner() ?? false;

  /// Initialize the workspace management service
  Future<void> initialize() async {
    await _loadWorkspaces();
    await _loadCurrentWorkspace();
  }

  /// Load all workspaces for the current user
  Future<void> _loadWorkspaces() async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceApiService.getAllWorkspaces();
      
      if (response.isSuccess && response.data != null) {
        _workspaces = response.data!;
        
        // If no current workspace is set and we have workspaces, set the first one
        if (_currentWorkspace == null && _workspaces.isNotEmpty) {
          await switchWorkspace(_workspaces.first.id);
        }
      } else {
        _setError(response.message ?? 'Failed to load workspaces');
      }
    } catch (e) {
      _setError('Unexpected error loading workspaces: $e');
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Load current workspace from storage
  Future<void> _loadCurrentWorkspace() async {
    final prefs = await SharedPreferences.getInstance();
    final currentWorkspaceId = prefs.getString('current_workspace_id');

    if (currentWorkspaceId != null) {
      // IMPORTANT: Validate that the stored workspace ID belongs to the current user
      final workspaceIndex = _workspaces.indexWhere((w) => w.id == currentWorkspaceId);

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
          await switchWorkspace(_workspaces.first.id);
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

  /// Create a new workspace
  Future<bool> createWorkspace(CreateWorkspaceDto dto) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceApiService.createWorkspace(dto);
      
      if (response.isSuccess && response.data != null) {
        // Add new workspace to the list
        _workspaces.add(response.data!);
        
        // Switch to the new workspace
        await switchWorkspace(response.data!.id);
        
        return true;
      } else {
        _setError(response.message ?? 'Failed to create workspace');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error creating workspace: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Switch to a different workspace
  Future<bool> switchWorkspace(String workspaceId) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceApiService.getWorkspace(workspaceId);
      
      if (response.isSuccess && response.data != null) {
        _currentWorkspace = response.data!;
        
        // Save to storage
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('current_workspace_id', workspaceId);
        
        // Load workspace members
        await _loadCurrentWorkspaceMembers();
        
        // Load pending invitations if user can manage members
        if (canManageMembers) {
          await _loadPendingInvitations();
        }
        
        return true;
      } else {
        _setError(response.message ?? 'Failed to switch workspace');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error switching workspace: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Update workspace details
  Future<bool> updateWorkspace(String workspaceId, UpdateWorkspaceDto dto) async {
    if (!canManageCurrentWorkspace) {
      _setError('Insufficient permissions to update workspace');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceApiService.updateWorkspace(workspaceId, dto);
      
      if (response.isSuccess && response.data != null) {
        // Update workspace in list
        final index = _workspaces.indexWhere((w) => w.id == workspaceId);
        if (index != -1) {
          _workspaces[index] = response.data!;
        }
        
        // Update current workspace if it's the one being updated
        if (_currentWorkspace?.id == workspaceId) {
          _currentWorkspace = response.data!;
        }
        
        return true;
      } else {
        _setError(response.message ?? 'Failed to update workspace');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error updating workspace: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Delete workspace (owner only)
  Future<bool> deleteWorkspace(String workspaceId) async {
    if (!isCurrentWorkspaceOwner) {
      _setError('Only workspace owner can delete workspace');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceApiService.deleteWorkspace(workspaceId);
      
      if (response.isSuccess) {
        // Remove workspace from list
        _workspaces.removeWhere((w) => w.id == workspaceId);
        
        // If deleted workspace was current, switch to another or clear
        if (_currentWorkspace?.id == workspaceId) {
          if (_workspaces.isNotEmpty) {
            await switchWorkspace(_workspaces.first.id);
          } else {
            _currentWorkspace = null;
            _currentWorkspaceMembers.clear();
            _pendingInvitations.clear();
          }
        }
        
        return true;
      } else {
        _setError(response.message ?? 'Failed to delete workspace');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error deleting workspace: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Invite a member to the current workspace
  Future<bool> inviteMember(InviteMemberDto dto) async {
    if (_currentWorkspace == null || !canManageMembers) {
      _setError('Cannot invite members - insufficient permissions');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceApiService.inviteMember(_currentWorkspace!.id, dto);
      
      if (response.isSuccess) {
        // Refresh pending invitations to show the new invite
        await _loadPendingInvitations();
        return true;
      } else {
        _setError(response.message ?? 'Failed to invite member');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error inviting member: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Load members of the current workspace
  Future<void> _loadCurrentWorkspaceMembers() async {
    if (_currentWorkspace == null) return;

    try {
      final response = await _workspaceApiService.getMembers(_currentWorkspace!.id);
      
      if (response.isSuccess && response.data != null) {
        _currentWorkspaceMembers = response.data!;
      }
    } catch (e) {
    }
  }

  /// Load pending invitations for the current workspace
  Future<void> _loadPendingInvitations() async {
    if (_currentWorkspace == null || !canManageMembers) return;

    try {
      final response = await _invitationApiService.listPendingInvitations(_currentWorkspace!.id);
      
      if (response.isSuccess && response.data != null) {
        _pendingInvitations = response.data!;
      }
    } catch (e) {
    }
  }

  /// Update member role in the current workspace
  Future<bool> updateMemberRole(String memberId, UpdateMemberRoleDto dto) async {
    if (_currentWorkspace == null || !canManageMembers) {
      _setError('Cannot update member role - insufficient permissions');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceApiService.updateMemberRole(
        _currentWorkspace!.id, 
        memberId, 
        dto
      );
      
      if (response.isSuccess && response.data != null) {
        // Update member in the list
        final index = _currentWorkspaceMembers.indexWhere((m) => m.id == memberId);
        if (index != -1) {
          _currentWorkspaceMembers[index] = response.data!;
        }
        
        return true;
      } else {
        _setError(response.message ?? 'Failed to update member role');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error updating member role: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Remove member from the current workspace
  Future<bool> removeMember(String memberId) async {
    if (_currentWorkspace == null || !canManageMembers) {
      _setError('Cannot remove member - insufficient permissions');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _workspaceApiService.removeMember(_currentWorkspace!.id, memberId);
      
      if (response.isSuccess) {
        // Remove member from the list
        _currentWorkspaceMembers.removeWhere((m) => m.id == memberId);
        return true;
      } else {
        _setError(response.message ?? 'Failed to remove member');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error removing member: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Accept a workspace invitation
  Future<bool> acceptInvitation(String invitationToken) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _invitationApiService.acceptInvitation(
        AcceptInvitationDto(invitationToken: invitationToken)
      );
      
      if (response.isSuccess && response.data != null) {
        // Refresh workspaces to include the newly joined workspace
        await _loadWorkspaces();
        
        // Switch to the new workspace
        await switchWorkspace(response.data!.workspaceId);
        
        return true;
      } else {
        _setError(response.message ?? 'Failed to accept invitation');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error accepting invitation: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Cancel a pending invitation
  Future<bool> cancelInvitation(String invitationId) async {
    if (_currentWorkspace == null || !canManageMembers) {
      _setError('Cannot cancel invitation - insufficient permissions');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _invitationApiService.cancelInvitation(
        invitationId, 
        _currentWorkspace!.id
      );
      
      if (response.isSuccess) {
        // Remove invitation from the list
        _pendingInvitations.removeWhere((i) => i.id == invitationId);
        return true;
      } else {
        _setError(response.message ?? 'Failed to cancel invitation');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error canceling invitation: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Resend a pending invitation
  Future<bool> resendInvitation(String invitationId) async {
    if (_currentWorkspace == null || !canManageMembers) {
      _setError('Cannot resend invitation - insufficient permissions');
      return false;
    }

    _setLoading(true);
    _clearError();

    try {
      final response = await _invitationApiService.resendInvitation(
        invitationId, 
        _currentWorkspace!.id
      );
      
      if (response.isSuccess) {
        return true;
      } else {
        _setError(response.message ?? 'Failed to resend invitation');
        return false;
      }
    } catch (e) {
      _setError('Unexpected error resending invitation: $e');
      return false;
    } finally {
      _setLoading(false);
      notifyListeners();
    }
  }

  /// Refresh current workspace data
  Future<void> refresh() async {
    await _loadWorkspaces();
    if (_currentWorkspace != null) {
      await _loadCurrentWorkspaceMembers();
      if (canManageMembers) {
        await _loadPendingInvitations();
      }
    }
  }

  /// Get workspace by ID
  Workspace? getWorkspaceById(String workspaceId) {
    try {
      return _workspaces.firstWhere((w) => w.id == workspaceId);
    } catch (e) {
      return null;
    }
  }

  /// Get member by ID in current workspace
  WorkspaceMember? getMemberById(String memberId) {
    try {
      return _currentWorkspaceMembers.firstWhere((m) => m.id == memberId);
    } catch (e) {
      return null;
    }
  }

  /// Check if user can perform specific action
  bool canPerformAction(String action) {
    return _currentWorkspace?.membership?.hasPermission(action) ?? false;
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
    _currentWorkspaceMembers.clear();
    _pendingInvitations.clear();
    _isLoading = false;
    _error = null;

    // CRITICAL: Clear stored workspace ID from SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('current_workspace_id');
    } catch (e) {
    }

    notifyListeners();
  }
}