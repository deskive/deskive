import 'package:flutter/material.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';
import '../../../config/app_config.dart';

/// Screen for starting a new time tracker
class StartTimerScreen extends StatefulWidget {
  final String budgetId;
  final String? taskId;
  final String? taskName;
  final List<BudgetCategory> categories;

  const StartTimerScreen({
    super.key,
    required this.budgetId,
    this.taskId,
    this.taskName,
    required this.categories,
  });

  @override
  State<StartTimerScreen> createState() => _StartTimerScreenState();
}

class _StartTimerScreenState extends State<StartTimerScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _hourlyRateController = TextEditingController();

  final BudgetService _budgetService = BudgetService.instance;

  String? _selectedCategoryId;
  bool _billable = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadUserBillingRate();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _hourlyRateController.dispose();
    super.dispose();
  }

  Future<void> _loadUserBillingRate() async {
    try {
      // Try to get task-specific rate first if task is provided
      if (widget.taskId != null) {
        // TODO: Get current user ID and fetch task assignee rate
        // For now, just load default billing rate
      }

      // Get user's default billing rate
      // TODO: Get current user ID
      // final rate = await _budgetService.getUserBillingRate(userId);
      // if (rate != null && mounted) {
      //   setState(() {
      //     _hourlyRateController.text = rate.hourlyRate.toString();
      //   });
      // }
    } catch (e) {
      debugPrint('Error loading billing rate: $e');
    }
  }

  Future<void> _startTimer() async {
    if (!_formKey.currentState!.validate()) return;

    // Validate taskId is provided
    if (widget.taskId == null || widget.taskId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A task must be selected to start a timer'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Validate hourly rate is provided
    final hourlyRate = double.tryParse(_hourlyRateController.text);
    if (hourlyRate == null || hourlyRate <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid hourly rate'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Get current user ID as assigneeId
      final userId = await AppConfig.getCurrentUserId();
      if (userId == null || userId.isEmpty) {
        throw Exception('User not logged in');
      }

      final request = StartTimerRequest(
        taskId: widget.taskId!,
        assigneeId: userId,
        hourlyRate: hourlyRate,
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        billable: _billable,
      );

      await _budgetService.startTimer(request);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Timer started'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start timer: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Start Timer'),
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Task info (if provided)
            if (widget.taskName != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? Colors.purple.shade900.withOpacity(0.3) : Colors.purple.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.purple.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.task_alt, color: Colors.purple),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Task',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.purple,
                            ),
                          ),
                          Text(
                            widget.taskName!,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Description
            TextFormField(
              controller: _descriptionController,
              decoration: InputDecoration(
                labelText: 'Description (optional)',
                hintText: 'What are you working on?',
                prefixIcon: const Icon(Icons.description),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),

            // Category dropdown
            DropdownButtonFormField<String>(
              value: _selectedCategoryId,
              decoration: InputDecoration(
                labelText: 'Category (optional)',
                prefixIcon: const Icon(Icons.category),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              items: [
                const DropdownMenuItem<String>(
                  value: null,
                  child: Text('No Category'),
                ),
                ...widget.categories.map((category) {
                  return DropdownMenuItem<String>(
                    value: category.id,
                    child: Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: category.color != null
                                ? Color(int.parse(category.color!.replaceFirst('#', '0xFF')))
                                : Colors.grey,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(category.name),
                      ],
                    ),
                  );
                }),
              ],
              onChanged: (value) {
                setState(() => _selectedCategoryId = value);
              },
            ),
            const SizedBox(height: 16),

            // Task requirement warning
            if (widget.taskId == null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber, color: Colors.orange),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'A task must be selected to start a timer. Please start the timer from a specific task.',
                        style: TextStyle(
                          color: Colors.orange.shade800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Hourly rate
            TextFormField(
              controller: _hourlyRateController,
              decoration: InputDecoration(
                labelText: 'Hourly Rate *',
                hintText: 'e.g., 50.00',
                prefixIcon: const Icon(Icons.attach_money),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Hourly rate is required';
                }
                final rate = double.tryParse(value);
                if (rate == null || rate <= 0) {
                  return 'Please enter a valid rate';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Billable toggle
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: SwitchListTile(
                title: const Text('Billable'),
                subtitle: const Text('This time entry can be billed to clients'),
                value: _billable,
                onChanged: (value) {
                  setState(() => _billable = value);
                },
                contentPadding: EdgeInsets.zero,
                activeColor: Colors.green,
              ),
            ),
            const SizedBox(height: 32),

            // Start button
            SizedBox(
              height: 56,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _startTimer,
                icon: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Icon(Icons.play_arrow),
                label: Text(_isLoading ? 'Starting...' : 'Start Timer'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bottom sheet for quick timer start
class QuickStartTimerSheet extends StatefulWidget {
  final String budgetId;
  final String? taskId;
  final double? defaultHourlyRate;
  final List<BudgetCategory> categories;

  const QuickStartTimerSheet({
    super.key,
    required this.budgetId,
    this.taskId,
    this.defaultHourlyRate,
    required this.categories,
  });

  @override
  State<QuickStartTimerSheet> createState() => _QuickStartTimerSheetState();
}

class _QuickStartTimerSheetState extends State<QuickStartTimerSheet> {
  final _descriptionController = TextEditingController();
  final _hourlyRateController = TextEditingController();
  final BudgetService _budgetService = BudgetService.instance;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.defaultHourlyRate != null) {
      _hourlyRateController.text = widget.defaultHourlyRate!.toString();
    }
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _hourlyRateController.dispose();
    super.dispose();
  }

  Future<void> _startTimer() async {
    // Validate taskId
    if (widget.taskId == null || widget.taskId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A task must be selected to start a timer'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Validate hourly rate
    final hourlyRate = double.tryParse(_hourlyRateController.text);
    if (hourlyRate == null || hourlyRate <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid hourly rate'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final userId = await AppConfig.getCurrentUserId();
      if (userId == null || userId.isEmpty) {
        throw Exception('User not logged in');
      }

      final request = StartTimerRequest(
        taskId: widget.taskId!,
        assigneeId: userId,
        hourlyRate: hourlyRate,
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        billable: true,
      );

      await _budgetService.startTimer(request);

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start timer: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final canStart = widget.taskId != null && widget.taskId!.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Title
          const Text(
            'Start Timer',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          // Task warning if no task
          if (!canStart) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning_amber, color: Colors.orange, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Select a task first to start a timer',
                      style: TextStyle(color: Colors.orange, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Description input
          TextField(
            controller: _descriptionController,
            decoration: InputDecoration(
              hintText: 'What are you working on?',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            autofocus: canStart,
          ),
          const SizedBox(height: 12),

          // Hourly rate input
          TextField(
            controller: _hourlyRateController,
            decoration: InputDecoration(
              labelText: 'Hourly Rate *',
              hintText: 'e.g., 50.00',
              prefixIcon: const Icon(Icons.attach_money),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 24),

          // Start button
          SizedBox(
            height: 50,
            child: ElevatedButton.icon(
              onPressed: (_isLoading || !canStart) ? null : _startTimer,
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.play_arrow),
              label: Text(_isLoading ? 'Starting...' : 'Start'),
              style: ElevatedButton.styleFrom(
                backgroundColor: canStart ? Colors.teal : Colors.grey,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),

          // Advanced options link
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => StartTimerScreen(
                    budgetId: widget.budgetId,
                    taskId: widget.taskId,
                    categories: widget.categories,
                  ),
                ),
              );
            },
            child: const Text('More options'),
          ),

          // Bottom padding for keyboard
          SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
        ],
      ),
    );
  }
}
