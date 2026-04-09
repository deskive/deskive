import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/template/project_template.dart';
import 'template_constants.dart';
import 'create_from_template_screen.dart';

/// Screen for previewing a project template before creating a project
class TemplatePreviewScreen extends StatelessWidget {
  final ProjectTemplate template;

  const TemplatePreviewScreen({
    super.key,
    required this.template,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final categoryColor = TemplateConstants.getCategoryColor(template.category);
    final categoryIcon = TemplateConstants.getCategoryIcon(template.category);

    return Scaffold(
      appBar: AppBar(
        title: Text('templates.preview'.tr()),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    categoryColor.withOpacity(0.2),
                    categoryColor.withOpacity(0.05),
                  ],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: categoryColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          categoryIcon,
                          color: categoryColor,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (template.isFeatured)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.star,
                                      size: 14,
                                      color: Colors.amber.shade600,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Featured',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.amber.shade600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            Text(
                              template.name,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: categoryColor.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                TemplateConstants.getCategoryName(
                                    template.category),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: categoryColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (template.description != null &&
                      template.description!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      template.description!,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white70 : Colors.grey.shade700,
                        height: 1.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Stats cards
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  _buildStatCard(
                    context: context,
                    icon: Icons.layers_outlined,
                    label: 'templates.sections'.tr(),
                    value: '${template.structure.sections.length}',
                    isDark: isDark,
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    context: context,
                    icon: Icons.task_alt_outlined,
                    label: 'templates.tasks'.tr(),
                    value: '${template.structure.totalTaskCount}',
                    isDark: isDark,
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    context: context,
                    icon: Icons.checklist_outlined,
                    label: 'templates.subtasks'.tr(),
                    value: '${template.structure.totalSubtaskCount}',
                    isDark: isDark,
                  ),
                ],
              ),
            ),

            // Kanban stages
            if (template.structure.kanbanStages.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Text(
                  'templates.kanban_stages'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
              SizedBox(
                height: 44,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: template.structure.kanbanStages.length,
                  itemBuilder: (context, index) {
                    final stage = template.structure.kanbanStages[index];
                    final stageColor = _parseColor(stage.color);
                    return Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: stageColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: stageColor.withOpacity(0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: stageColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            stage.name,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: stageColor,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],

            // Custom fields
            if (template.structure.customFields.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text(
                  'templates.custom_fields'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: template.structure.customFields.map((field) {
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white10 : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            TemplateConstants.getFieldTypeIcon(field.type),
                            size: 14,
                            color:
                                isDark ? Colors.white60 : Colors.grey.shade600,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            field.name,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark
                                  ? Colors.white70
                                  : Colors.grey.shade700,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],

            // Sections and tasks
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                'templates.sections_and_tasks'.tr(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
            ...template.structure.sections.map((section) {
              return _buildSectionCard(context, section, isDark);
            }),

            // Bottom padding for FAB
            const SizedBox(height: 100),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createProject(context),
        icon: const Icon(Icons.add),
        label: Text('templates.use_template'.tr()),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildStatCard({
    required BuildContext context,
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? Colors.white10 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 24,
              color: isDark ? Colors.white60 : Colors.grey.shade600,
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white54 : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard(
    BuildContext context,
    TemplateSection section,
    bool isDark,
  ) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.white12 : Colors.grey.shade200,
        ),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            Icons.folder_outlined,
            size: 20,
            color: Theme.of(context).primaryColor,
          ),
        ),
        title: Text(
          section.name,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          'templates.task_count'.tr(args: ['${section.tasks.length}']),
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.white54 : Colors.grey.shade600,
          ),
        ),
        children: section.tasks.map((task) {
          return _buildTaskItem(context, task, isDark);
        }).toList(),
      ),
    );
  }

  Widget _buildTaskItem(
    BuildContext context,
    TemplateTask task,
    bool isDark,
  ) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.white10 : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.check_circle_outline,
                size: 18,
                color: isDark ? Colors.white54 : Colors.grey.shade500,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  task.title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              if (task.priority != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: TemplateConstants.getPriorityColor(task.priority)
                        .withOpacity(0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    task.priority!,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: TemplateConstants.getPriorityColor(task.priority),
                    ),
                  ),
                ),
            ],
          ),
          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Padding(
              padding: const EdgeInsets.only(left: 26),
              child: Text(
                task.description!,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white54 : Colors.grey.shade600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
          if (task.subtasks.isNotEmpty) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(left: 26),
              child: Column(
                children: task.subtasks.map((subtask) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      children: [
                        Icon(
                          Icons.subdirectory_arrow_right,
                          size: 14,
                          color:
                              isDark ? Colors.white38 : Colors.grey.shade400,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            subtask.title,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark
                                  ? Colors.white54
                                  : Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
          if (task.labels.isNotEmpty) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(left: 26),
              child: Wrap(
                spacing: 4,
                runSpacing: 4,
                children: task.labels.map((label) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white12 : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? Colors.white60 : Colors.grey.shade700,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _parseColor(String colorString) {
    try {
      if (colorString.startsWith('#')) {
        return Color(
            int.parse(colorString.substring(1), radix: 16) + 0xFF000000);
      }
      return Colors.blue;
    } catch (e) {
      return Colors.blue;
    }
  }

  void _createProject(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateFromTemplateScreen(template: template),
      ),
    );
  }
}
