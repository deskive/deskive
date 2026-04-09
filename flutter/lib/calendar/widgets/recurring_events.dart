import 'package:flutter/material.dart';
import 'package:rrule/rrule.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/calendar_event.dart';

enum RecurrenceType {
  none,
  daily,
  weekly,
  monthly,
  yearly,
  custom,
}

class RecurrenceRule {
  final RecurrenceType type;
  final int interval;
  final List<int>? byWeekDay; // 0 = Monday, 6 = Sunday
  final List<int>? byMonthDay;
  final List<int>? byMonth;
  final DateTime? until;
  final int? count;

  const RecurrenceRule({
    required this.type,
    this.interval = 1,
    this.byWeekDay,
    this.byMonthDay,
    this.byMonth,
    this.until,
    this.count,
  });

  Map<String, dynamic> toJson() => {
    'type': type.name,
    'interval': interval,
    if (byWeekDay != null) 'byWeekDay': byWeekDay,
    if (byMonthDay != null) 'byMonthDay': byMonthDay,
    if (byMonth != null) 'byMonth': byMonth,
    if (until != null) 'until': until!.toIso8601String(),
    if (count != null) 'count': count,
  };

  factory RecurrenceRule.fromJson(Map<String, dynamic> json) {
    return RecurrenceRule(
      type: RecurrenceType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => RecurrenceType.none,
      ),
      interval: json['interval'] ?? 1,
      byWeekDay: json['byWeekDay'] != null ? List<int>.from(json['byWeekDay']) : null,
      byMonthDay: json['byMonthDay'] != null ? List<int>.from(json['byMonthDay']) : null,
      byMonth: json['byMonth'] != null ? List<int>.from(json['byMonth']) : null,
      until: json['until'] != null ? DateTime.parse(json['until']) : null,
      count: json['count'],
    );
  }

  String toRRuleString(DateTime dtStart) {
    final parts = <String>[];
    
    switch (type) {
      case RecurrenceType.none:
        return '';
      case RecurrenceType.daily:
        parts.add('FREQ=DAILY');
        break;
      case RecurrenceType.weekly:
        parts.add('FREQ=WEEKLY');
        if (byWeekDay != null && byWeekDay!.isNotEmpty) {
          final weekDays = byWeekDay!.map((day) => _getWeekDayString(day)).join(',');
          parts.add('BYDAY=$weekDays');
        }
        break;
      case RecurrenceType.monthly:
        parts.add('FREQ=MONTHLY');
        if (byMonthDay != null && byMonthDay!.isNotEmpty) {
          parts.add('BYMONTHDAY=${byMonthDay!.join(',')}');
        }
        break;
      case RecurrenceType.yearly:
        parts.add('FREQ=YEARLY');
        break;
      case RecurrenceType.custom:
        // Handle custom rules
        break;
    }

    if (interval > 1) {
      parts.add('INTERVAL=$interval');
    }

    if (until != null) {
      final untilStr = until!.toUtc().toIso8601String().replaceAll(RegExp(r'[-:]'), '').split('.')[0] + 'Z';
      parts.add('UNTIL=$untilStr');
    } else if (count != null) {
      parts.add('COUNT=$count');
    }

    return 'RRULE:${parts.join(';')}';
  }

  String _getWeekDayString(int weekday) {
    const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    return days[weekday];
  }
}

class RecurringEventWidget extends StatefulWidget {
  final CalendarEvent event;
  final RecurrenceRule? initialRule;
  final Function(RecurrenceRule?)? onRuleChanged;
  final bool isEditable;

  const RecurringEventWidget({
    Key? key,
    required this.event,
    this.initialRule,
    this.onRuleChanged,
    this.isEditable = true,
  }) : super(key: key);

  @override
  State<RecurringEventWidget> createState() => _RecurringEventWidgetState();
}

class _RecurringEventWidgetState extends State<RecurringEventWidget> {
  RecurrenceRule? _rule;
  RecurrenceType _selectedType = RecurrenceType.none;
  int _interval = 1;
  List<int> _selectedWeekDays = [];
  List<int> _selectedMonthDays = [];
  DateTime? _endDate;
  int? _occurrences;
  bool _useEndDate = false;
  bool _useOccurrences = false;

  @override
  void initState() {
    super.initState();
    _rule = widget.initialRule;
    if (_rule != null) {
      _selectedType = _rule!.type;
      _interval = _rule!.interval;
      _selectedWeekDays = List.from(_rule!.byWeekDay ?? []);
      _selectedMonthDays = List.from(_rule!.byMonthDay ?? []);
      _endDate = _rule!.until;
      _occurrences = _rule!.count;
      _useEndDate = _endDate != null;
      _useOccurrences = _occurrences != null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.repeat,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Repeat',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                if (_selectedType != RecurrenceType.none)
                  TextButton(
                    onPressed: widget.isEditable ? _clearRecurrence : null,
                    child: Text('calendar.clear'.tr()),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            
            if (!widget.isEditable && _rule == null)
              Text(
                'This event does not repeat',
                style: TextStyle(color: Colors.grey[600]),
              )
            else if (!widget.isEditable && _rule != null)
              _buildReadOnlyView()
            else
              _buildEditableView(),
          ],
        ),
      ),
    );
  }

  Widget _buildReadOnlyView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _getRecurrenceDescription(_rule!),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        if (_rule!.until != null) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.event, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text(
                'Until ${_formatDate(_rule!.until!)}',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ],
        if (_rule!.count != null) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.numbers, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text(
                '${_rule!.count} occurrences',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildEditableView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Recurrence type selector
        Text(
          'Repeat',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<RecurrenceType>(
          value: _selectedType,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
          items: RecurrenceType.values.map((type) {
            return DropdownMenuItem(
              value: type,
              child: Text(_getRecurrenceTypeLabel(type)),
            );
          }).toList(),
          onChanged: (type) {
            setState(() {
              _selectedType = type!;
              _updateRule();
            });
          },
        ),
        
        if (_selectedType != RecurrenceType.none) ...[
          const SizedBox(height: 16),
          _buildIntervalSelector(),
          
          if (_selectedType == RecurrenceType.weekly) ...[
            const SizedBox(height: 16),
            _buildWeekDaySelector(),
          ],
          
          if (_selectedType == RecurrenceType.monthly) ...[
            const SizedBox(height: 16),
            _buildMonthDaySelector(),
          ],
          
          const SizedBox(height: 16),
          _buildEndConditions(),
          
          const SizedBox(height: 16),
          _buildPreview(),
        ],
      ],
    );
  }

  Widget _buildIntervalSelector() {
    String intervalLabel;
    switch (_selectedType) {
      case RecurrenceType.daily:
        intervalLabel = _interval == 1 ? 'day' : 'days';
        break;
      case RecurrenceType.weekly:
        intervalLabel = _interval == 1 ? 'week' : 'weeks';
        break;
      case RecurrenceType.monthly:
        intervalLabel = _interval == 1 ? 'month' : 'months';
        break;
      case RecurrenceType.yearly:
        intervalLabel = _interval == 1 ? 'year' : 'years';
        break;
      default:
        intervalLabel = 'interval';
    }

    return Row(
      children: [
        Text('calendar.every'.tr()),
        const SizedBox(width: 8),
        SizedBox(
          width: 80,
          child: TextFormField(
            initialValue: _interval.toString(),
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            ),
            onChanged: (value) {
              final newInterval = int.tryParse(value);
              if (newInterval != null && newInterval > 0) {
                setState(() {
                  _interval = newInterval;
                  _updateRule();
                });
              }
            },
          ),
        ),
        const SizedBox(width: 8),
        Text(intervalLabel),
      ],
    );
  }

  Widget _buildWeekDaySelector() {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Repeat on',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: weekDays.asMap().entries.map((entry) {
            final index = entry.key;
            final day = entry.value;
            final isSelected = _selectedWeekDays.contains(index);
            
            return FilterChip(
              label: Text(day),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedWeekDays.add(index);
                  } else {
                    _selectedWeekDays.remove(index);
                  }
                  _selectedWeekDays.sort();
                  _updateRule();
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildMonthDaySelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Repeat on day',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        RadioListTile<bool>(
          title: Text('calendar.day_of_month'.tr(args: ['${widget.event.startTime.day}'])),
          value: true,
          groupValue: _selectedMonthDays.isNotEmpty,
          onChanged: (value) {
            setState(() {
              if (value == true) {
                _selectedMonthDays = [widget.event.startTime.day];
              } else {
                _selectedMonthDays = [];
              }
              _updateRule();
            });
          },
        ),
      ],
    );
  }

  Widget _buildEndConditions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'End',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        
        RadioListTile<String>(
          title: Text('calendar.never'.tr()),
          value: 'never',
          groupValue: _useEndDate ? 'date' : _useOccurrences ? 'count' : 'never',
          onChanged: (value) {
            setState(() {
              _useEndDate = false;
              _useOccurrences = false;
              _updateRule();
            });
          },
        ),

        RadioListTile<String>(
          title: Text('calendar.on_date'.tr()),
          value: 'date',
          groupValue: _useEndDate ? 'date' : _useOccurrences ? 'count' : 'never',
          onChanged: (value) {
            setState(() {
              _useEndDate = true;
              _useOccurrences = false;
              _endDate ??= widget.event.startTime.add(const Duration(days: 30));
              _updateRule();
            });
          },
        ),
        
        if (_useEndDate) ...[
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.only(left: 32),
            child: InkWell(
              onTap: _selectEndDate,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.calendar_today, size: 20),
                    const SizedBox(width: 8),
                    Text(_formatDate(_endDate!)),
                  ],
                ),
              ),
            ),
          ),
        ],
        
        RadioListTile<String>(
          title: Text('calendar.after_occurrences'.tr()),
          value: 'count',
          groupValue: _useEndDate ? 'date' : _useOccurrences ? 'count' : 'never',
          onChanged: (value) {
            setState(() {
              _useEndDate = false;
              _useOccurrences = true;
              _occurrences ??= 10;
              _updateRule();
            });
          },
        ),
        
        if (_useOccurrences) ...[
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.only(left: 32),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 80,
                  child: TextFormField(
                    initialValue: _occurrences.toString(),
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    ),
                    onChanged: (value) {
                      final newCount = int.tryParse(value);
                      if (newCount != null && newCount > 0) {
                        setState(() {
                          _occurrences = newCount;
                          _updateRule();
                        });
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Text('calendar.occurrences'.tr()),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPreview() {
    if (_rule == null || _rule!.type == RecurrenceType.none) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Theme.of(context).primaryColor.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.preview,
                size: 16,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(width: 4),
              Text(
                'Preview',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(_getRecurrenceDescription(_rule!)),
          const SizedBox(height: 8),
          Text(
            'Next occurrences:',
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 4),
          ..._getNextOccurrences().take(3).map((date) {
            return Text(
              _formatDate(date),
              style: TextStyle(color: Colors.grey[600]),
            );
          }),
        ],
      ),
    );
  }

  String _getRecurrenceTypeLabel(RecurrenceType type) {
    switch (type) {
      case RecurrenceType.none:
        return 'Does not repeat';
      case RecurrenceType.daily:
        return 'Daily';
      case RecurrenceType.weekly:
        return 'Weekly';
      case RecurrenceType.monthly:
        return 'Monthly';
      case RecurrenceType.yearly:
        return 'Yearly';
      case RecurrenceType.custom:
        return 'Custom';
    }
  }

  String _getRecurrenceDescription(RecurrenceRule rule) {
    switch (rule.type) {
      case RecurrenceType.none:
        return 'calendar.no_recurrence'.tr();
      case RecurrenceType.daily:
        return rule.interval == 1 ? 'calendar.daily'.tr() : 'calendar.every_n_days'.tr(args: ['${rule.interval}']);
      case RecurrenceType.weekly:
        String base = rule.interval == 1 ? 'calendar.weekly'.tr() : 'calendar.every_n_weeks'.tr(args: ['${rule.interval}']);
        if (rule.byWeekDay != null && rule.byWeekDay!.isNotEmpty) {
          final weekDays = [
            'calendar.day_monday'.tr(),
            'calendar.day_tuesday'.tr(),
            'calendar.day_wednesday'.tr(),
            'calendar.day_thursday'.tr(),
            'calendar.day_friday'.tr(),
            'calendar.day_saturday'.tr(),
            'calendar.day_sunday'.tr()
          ];
          final days = rule.byWeekDay!.map((day) => weekDays[day]).join(', ');
          base += ' ${'calendar.on_days'.tr()} $days';
        }
        return base;
      case RecurrenceType.monthly:
        return rule.interval == 1 ? 'calendar.monthly'.tr() : 'calendar.every_n_months'.tr(args: ['${rule.interval}']);
      case RecurrenceType.yearly:
        return rule.interval == 1 ? 'calendar.yearly'.tr() : 'calendar.every_n_years'.tr(args: ['${rule.interval}']);
      case RecurrenceType.custom:
        return 'calendar.custom'.tr();
    }
  }

  List<DateTime> _getNextOccurrences() {
    if (_rule == null) return [];

    final occurrences = <DateTime>[];
    var current = widget.event.startTime;
    final maxOccurrences = _rule!.count ?? 10;
    final endDate = _rule!.until ?? DateTime.now().add(const Duration(days: 365));

    for (int i = 0; i < maxOccurrences && current.isBefore(endDate); i++) {
      occurrences.add(current);
      current = _getNextOccurrence(current);
    }

    return occurrences;
  }

  DateTime _getNextOccurrence(DateTime current) {
    switch (_rule!.type) {
      case RecurrenceType.daily:
        return current.add(Duration(days: _rule!.interval));
      case RecurrenceType.weekly:
        return current.add(Duration(days: 7 * _rule!.interval));
      case RecurrenceType.monthly:
        return DateTime(
          current.year,
          current.month + _rule!.interval,
          current.day,
          current.hour,
          current.minute,
        );
      case RecurrenceType.yearly:
        return DateTime(
          current.year + _rule!.interval,
          current.month,
          current.day,
          current.hour,
          current.minute,
        );
      default:
        return current.add(const Duration(days: 1));
    }
  }

  String _formatDate(DateTime date) {
    final months = [
      'calendar.month_jan_short'.tr(),
      'calendar.month_feb_short'.tr(),
      'calendar.month_mar_short'.tr(),
      'calendar.month_apr_short'.tr(),
      'calendar.month_may_short'.tr(),
      'calendar.month_jun_short'.tr(),
      'calendar.month_jul_short'.tr(),
      'calendar.month_aug_short'.tr(),
      'calendar.month_sep_short'.tr(),
      'calendar.month_oct_short'.tr(),
      'calendar.month_nov_short'.tr(),
      'calendar.month_dec_short'.tr()
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  Future<void> _selectEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? widget.event.startTime.add(const Duration(days: 30)),
      firstDate: widget.event.startTime,
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );

    if (picked != null) {
      setState(() {
        _endDate = picked;
        _updateRule();
      });
    }
  }

  void _updateRule() {
    if (_selectedType == RecurrenceType.none) {
      _rule = null;
    } else {
      _rule = RecurrenceRule(
        type: _selectedType,
        interval: _interval,
        byWeekDay: _selectedType == RecurrenceType.weekly && _selectedWeekDays.isNotEmpty
            ? _selectedWeekDays
            : null,
        byMonthDay: _selectedType == RecurrenceType.monthly && _selectedMonthDays.isNotEmpty
            ? _selectedMonthDays
            : null,
        until: _useEndDate ? _endDate : null,
        count: _useOccurrences ? _occurrences : null,
      );
    }
    widget.onRuleChanged?.call(_rule);
  }

  void _clearRecurrence() {
    setState(() {
      _selectedType = RecurrenceType.none;
      _interval = 1;
      _selectedWeekDays.clear();
      _selectedMonthDays.clear();
      _endDate = null;
      _occurrences = null;
      _useEndDate = false;
      _useOccurrences = false;
      _updateRule();
    });
  }
}