import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/template/project_template.dart';
import '../../models/project.dart';
import 'template_service.dart';
import 'template_constants.dart';
import '../../projects/project_details_screen.dart';

/// Screen for creating a new project from a template
class CreateFromTemplateScreen extends StatefulWidget {
  final ProjectTemplate template;

  const CreateFromTemplateScreen({
    super.key,
    required this.template,
  });

  @override
  State<CreateFromTemplateScreen> createState() =>
      _CreateFromTemplateScreenState();
}

class _CreateFromTemplateScreenState extends State<CreateFromTemplateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final TemplateService _templateService = TemplateService.instance;

  DateTime? _startDate;
  bool _isCreating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Pre-fill with template name as suggestion
    _nameController.text = widget.template.name;
    _descriptionController.text = widget.template.description ?? '';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _createProject() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isCreating = true;
      _error = null;
    });

    try {
      final project = await _templateService.createProjectFromTemplate(
        templateIdOrSlug: widget.template.slug,
        projectName: _nameController.text.trim(),
        description: _descriptionController.text.trim().isNotEmpty
            ? _descriptionController.text.trim()
            : null,
        startDate: _startDate,
      );

      if (mounted) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('templates.project_created'.tr()),
            backgroundColor: Colors.green,
          ),
        );

        // Navigate to project details
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
            builder: (context) => ProjectDetailsScreen(project: project),
          ),
          (route) => route.isFirst,
        );
      }
    } catch (e) {
      setState(() {
        _isCreating = false;
        _error = e.toString();
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('templates.failed_to_create'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _selectStartDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );

    if (date != null) {
      setState(() {
        _startDate = date;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final categoryColor =
        TemplateConstants.getCategoryColor(widget.template.category);
    final categoryIcon =
        TemplateConstants.getCategoryIcon(widget.template.category);

    return Scaffold(
      appBar: AppBar(
        title: Text('templates.create_project'.tr()),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Template info card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: categoryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: categoryColor.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: categoryColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        categoryIcon,
                        color: categoryColor,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'templates.using_template'.tr(),
                            style: TextStyle(
                              fontSize: 12,
                              color:
                                  isDark ? Colors.white60 : Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.template.name,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: categoryColor,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'templates.sections_tasks_info'.tr(args: [
                              '${widget.template.structure.sections.length}',
                              '${widget.template.structure.totalTaskCount}',
                            ]),
                            style: TextStyle(
                              fontSize: 12,
                              color:
                                  isDark ? Colors.white54 : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Project name
              Text(
                'templates.project_name'.tr(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  hintText: 'templates.project_name_hint'.tr(),
                  filled: true,
                  fillColor: isDark ? Colors.white10 : Colors.grey.shade100,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  prefixIcon: const Icon(Icons.folder_outlined),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'templates.name_required'.tr();
                  }
                  if (value.trim().length < 2) {
                    return 'templates.name_too_short'.tr();
                  }
                  return null;
                },
                textInputAction: TextInputAction.next,
              ),

              const SizedBox(height: 16),

              // Description
              Text(
                'templates.description'.tr(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  hintText: 'templates.description_hint'.tr(),
                  filled: true,
                  fillColor: isDark ? Colors.white10 : Colors.grey.shade100,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  prefixIcon: const Icon(Icons.description_outlined),
                ),
                maxLines: 3,
                textInputAction: TextInputAction.done,
              ),

              const SizedBox(height: 16),

              // Start date
              Text(
                'templates.start_date'.tr(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: _selectStartDate,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white10 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.calendar_today_outlined,
                        size: 20,
                        color: isDark ? Colors.white60 : Colors.grey.shade600,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        _startDate != null
                            ? DateFormat('MMM dd, yyyy').format(_startDate!)
                            : 'templates.select_start_date'.tr(),
                        style: TextStyle(
                          fontSize: 15,
                          color: _startDate != null
                              ? (isDark ? Colors.white : Colors.black87)
                              : (isDark ? Colors.white54 : Colors.grey.shade600),
                        ),
                      ),
                      const Spacer(),
                      if (_startDate != null)
                        IconButton(
                          icon: Icon(
                            Icons.clear,
                            size: 18,
                            color:
                                isDark ? Colors.white54 : Colors.grey.shade600,
                          ),
                          onPressed: () {
                            setState(() {
                              _startDate = null;
                            });
                          },
                        ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Info section
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 20,
                      color: Colors.blue.shade600,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'templates.creation_info'.tr(),
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.blue.shade700,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 20,
                        color: Colors.red.shade600,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.red.shade700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 32),

              // Create button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isCreating ? null : _createProject,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _isCreating
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.add, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              'templates.create_project'.tr(),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
