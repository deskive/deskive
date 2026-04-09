import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/workspace_management_service.dart';
import '../../api/services/workspace_api_service.dart';

/// Screen for inviting members to the workspace
class InviteMemberScreen extends StatefulWidget {
  const InviteMemberScreen({super.key});

  @override
  State<InviteMemberScreen> createState() => _InviteMemberScreenState();
}

class _InviteMemberScreenState extends State<InviteMemberScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();
  
  WorkspaceRole _selectedRole = WorkspaceRole.member;
  bool _isLoading = false;
  final List<String> _emails = [];

  late WorkspaceManagementService _workspaceService;

  @override
  void initState() {
    super.initState();
    _workspaceService = WorkspaceManagementService.instance;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Invite Members'),
        centerTitle: true,
      ),
      body: Consumer<WorkspaceManagementService>(
        builder: (context, service, child) {
          final currentWorkspace = service.currentWorkspace;
          
          if (currentWorkspace == null) {
            return const Center(
              child: Text('No workspace selected'),
            );
          }

          if (!service.canManageMembers) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.lock, size: 64),
                  SizedBox(height: 16),
                  Text(
                    'Insufficient Permissions',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text('You need admin or owner permissions to invite members.'),
                ],
              ),
            );
          }

          return Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Workspace context
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Inviting to:',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onPrimaryContainer,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          currentWorkspace.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onPrimaryContainer,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Email input section
                  Text(
                    'Email Addresses',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Email input with add button
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _emailController,
                          decoration: const InputDecoration(
                            labelText: 'Email Address',
                            hintText: 'colleague@company.com',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.email),
                          ),
                          keyboardType: TextInputType.emailAddress,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Please enter an email address';
                            }
                            
                            final emailRegex = RegExp(
                              r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                            );
                            
                            if (!emailRegex.hasMatch(value.trim())) {
                              return 'Please enter a valid email address';
                            }
                            
                            return null;
                          },
                          onFieldSubmitted: (_) => _addEmail(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _addEmail,
                        child: const Text('Add'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Email chips display
                  if (_emails.isNotEmpty) ...[
                    Text(
                      'Recipients (${_emails.length})',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _emails.map((email) => Chip(
                        label: Text(email),
                        deleteIcon: const Icon(Icons.close, size: 18),
                        onDeleted: () => _removeEmail(email),
                      )).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Role selection
                  Text(
                    'Member Role',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  ...WorkspaceRole.values.where((role) {
                    // Only allow inviting roles that current user can manage
                    final currentRole = currentWorkspace.membership?.role ?? WorkspaceRole.member;
                    return currentRole.canManage(role);
                  }).map((role) => _buildRoleCard(role)),
                  
                  const SizedBox(height: 24),

                  // Custom message
                  Text(
                    'Custom Message (Optional)',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  TextFormField(
                    controller: _messageController,
                    decoration: const InputDecoration(
                      labelText: 'Invitation Message',
                      hintText: 'Join our team and collaborate on exciting projects...',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.message),
                    ),
                    maxLines: 4,
                    maxLength: 500,
                  ),
                  const SizedBox(height: 32),

                  // Send invitations button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _emails.isEmpty || _isLoading ? null : _sendInvitations,
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text('Send ${_emails.length} Invitation${_emails.length == 1 ? '' : 's'}'),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Info text
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceVariant,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.info_outline,
                          size: 16,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Invitations will be sent via email. Recipients will receive a link to join the workspace.',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildRoleCard(WorkspaceRole role) {
    final isSelected = _selectedRole == role;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: RadioListTile<WorkspaceRole>(
        value: role,
        groupValue: _selectedRole,
        onChanged: (value) {
          if (value != null) {
            setState(() {
              _selectedRole = value;
            });
          }
        },
        title: Text(
          role.displayName,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: Text(
          role.description,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        contentPadding: const EdgeInsets.all(12),
      ),
    );
  }

  void _addEmail() {
    if (_emailController.text.trim().isNotEmpty) {
      final email = _emailController.text.trim().toLowerCase();
      
      // Validate email format
      final emailRegex = RegExp(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
      );
      
      if (!emailRegex.hasMatch(email)) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Please enter a valid email address'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }
      
      // Check for duplicates
      if (_emails.contains(email)) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Email already added'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }
      
      setState(() {
        _emails.add(email);
        _emailController.clear();
      });
    }
  }

  void _removeEmail(String email) {
    setState(() {
      _emails.remove(email);
    });
  }

  Future<void> _sendInvitations() async {
    if (_emails.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please add at least one email address'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    int successCount = 0;
    int failureCount = 0;
    final failedEmails = <String>[];

    // Send invitations one by one
    for (final email in _emails) {
      final dto = InviteMemberDto(
        email: email,
        role: _selectedRole,
        message: _messageController.text.trim().isEmpty 
            ? null 
            : _messageController.text.trim(),
      );

      final success = await _workspaceService.inviteMember(dto);
      
      if (success) {
        successCount++;
      } else {
        failureCount++;
        failedEmails.add(email);
      }
    }

    setState(() {
      _isLoading = false;
    });

    if (!mounted) return;

    // Show results
    if (successCount == _emails.length) {
      // All successful
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Successfully sent $successCount invitation${successCount == 1 ? '' : 's'}!'),
          backgroundColor: Colors.green,
        ),
      );
      
      // Clear form and go back
      setState(() {
        _emails.clear();
        _messageController.clear();
      });
      Navigator.of(context).pop();
      
    } else if (successCount > 0) {
      // Partial success
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$successCount succeeded, $failureCount failed. Check failed emails.'),
          backgroundColor: Colors.orange,
        ),
      );
      
      // Keep only failed emails
      setState(() {
        _emails.clear();
        _emails.addAll(failedEmails);
      });
      
    } else {
      // All failed
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_workspaceService.error ?? 'Failed to send invitations'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}