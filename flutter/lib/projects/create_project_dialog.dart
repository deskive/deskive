import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class CreateProjectDialog extends StatefulWidget {
  final String? initialMessage;
  
  const CreateProjectDialog({super.key, this.initialMessage});

  @override
  State<CreateProjectDialog> createState() => _CreateProjectDialogState();
}

class _CreateProjectDialogState extends State<CreateProjectDialog> {
  final _nameController = TextEditingController();
  String? _selectedProjectType;
  bool _addMessageAsTask = true;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
      ),
      title: Row(
        children: [
          Icon(Icons.work, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 8),
          Text('projects.create_project'.tr()),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: 'projects.project_name'.tr(),
              border: const OutlineInputBorder(),
            ),
            autofocus: true,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            decoration: InputDecoration(
              labelText: 'projects.project_type'.tr(),
              border: const OutlineInputBorder(),
            ),
            value: _selectedProjectType,
            items: [
              DropdownMenuItem(value: 'task', child: Text('projects.type_task_management'.tr())),
              DropdownMenuItem(value: 'development', child: Text('projects.type_development'.tr())),
              DropdownMenuItem(value: 'design', child: Text('projects.type_design'.tr())),
              DropdownMenuItem(value: 'research', child: Text('projects.type_research'.tr())),
            ],
            onChanged: (value) {
              setState(() {
                _selectedProjectType = value;
              });
            },
          ),
          if (widget.initialMessage != null) ...[
            const SizedBox(height: 16),
            CheckboxListTile(
              title: Text('projects.add_message_as_task'.tr()),
              value: _addMessageAsTask,
              onChanged: (value) {
                setState(() {
                  _addMessageAsTask = value ?? false;
                });
              },
              controlAffinity: ListTileControlAffinity.leading,
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('common.cancel'.tr()),
        ),
        FilledButton(
          onPressed: () {
            if (_nameController.text.trim().isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('projects.please_enter_name'.tr()),
                  backgroundColor: Colors.red,
                ),
              );
              return;
            }

            Navigator.pop(context, {
              'name': _nameController.text.trim(),
              'type': _selectedProjectType,
              'addMessageAsTask': _addMessageAsTask,
            });

            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.white, size: 20),
                    const SizedBox(width: 8),
                    Text('projects.project_created'.tr()),
                  ],
                ),
                backgroundColor: Colors.green,
                action: SnackBarAction(
                  label: 'common.open'.tr(),
                  textColor: Colors.white,
                  onPressed: () {
                    // TODO: Navigate to project
                  },
                ),
              ),
            );
          },
          child: Text('projects.create_project'.tr()),
        ),
      ],
    );
  }
}

// Helper function to show the dialog
Future<Map<String, dynamic>?> showCreateProjectDialog(
  BuildContext context, {
  String? initialMessage,
}) {
  return showDialog<Map<String, dynamic>>(
    context: context,
    builder: (context) => CreateProjectDialog(initialMessage: initialMessage),
  );
}