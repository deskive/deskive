import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('tasks.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: 8,
        itemBuilder: (context, index) {
          final isCompleted = index % 3 == 0;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Checkbox(
                value: isCompleted,
                onChanged: (value) {},
              ),
              title: Text(
                'Task ${index + 1}: Complete the mobile app design',
                style: TextStyle(
                  decoration: isCompleted ? TextDecoration.lineThrough : null,
                  color: isCompleted ? Colors.grey : null,
                ),
              ),
              subtitle: Text('Due: Dec ${15 + index}'),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getPriorityColor(index).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _getPriorityText(index),
                  style: TextStyle(
                    color: _getPriorityColor(index),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
    );
  }

  Color _getPriorityColor(int index) {
    switch (index % 3) {
      case 0: return Colors.green;
      case 1: return Colors.orange;
      default: return Colors.red;
    }
  }

  String _getPriorityText(int index) {
    switch (index % 3) {
      case 0: return 'tasks.priority_low'.tr();
      case 1: return 'tasks.priority_medium'.tr();
      default: return 'tasks.priority_high'.tr();
    }
  }
}