import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import 'package:easy_localization/easy_localization.dart';
import '../api/services/calendar_api_service.dart' as api;
import '../services/workspace_service.dart';

class SmartEventCreatorScreen extends StatefulWidget {
  const SmartEventCreatorScreen({super.key});

  @override
  State<SmartEventCreatorScreen> createState() => _SmartEventCreatorScreenState();
}

class _SmartEventCreatorScreenState extends State<SmartEventCreatorScreen> {
  final TextEditingController _eventDescriptionController = TextEditingController();
  final TextEditingController _additionalNotesController = TextEditingController();
  final api.CalendarApiService _calendarApi = api.CalendarApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final stt.SpeechToText _speechToText = stt.SpeechToText();

  int _lookAheadDays = 14;
  bool _includeWeekends = true;
  bool _isLoading = false;
  bool _isListening = false;
  bool _speechAvailable = false;

  api.SmartScheduleResponse? _aiResponse;
  int? _selectedSuggestionIndex;
  String? _selectedRoomId;

  final List<int> _lookAheadOptions = [7, 14, 21, 30];

  @override
  void initState() {
    super.initState();
    _initSpeechRecognition();
  }

  @override
  void dispose() {
    _eventDescriptionController.dispose();
    _additionalNotesController.dispose();
    _speechToText.stop();
    super.dispose();
  }

  Future<void> _initSpeechRecognition() async {
    try {
      _speechAvailable = await _speechToText.initialize(
        onError: (error) {
          setState(() => _isListening = false);
        },
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            setState(() => _isListening = false);
          }
        },
        debugLogging: true,
      );

      if (_speechAvailable) {

        // Get available locales
        final locales = await _speechToText.locales();
        if (locales.isNotEmpty) {
        }
      } else {
      }

      setState(() {});
    } catch (e, stackTrace) {
      _speechAvailable = false;
      setState(() {});
    }
  }

  Future<void> _getAISuggestions() async {
    if (_eventDescriptionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.please_describe_event'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _aiResponse = null;
      _selectedSuggestionIndex = null;
      _selectedRoomId = null;
    });

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      final requestDto = api.SmartScheduleRequestDto(
        prompt: _eventDescriptionController.text.trim(),
        context: 'work',
        maxLookAheadDays: _lookAheadDays,
        includeWeekends: _includeWeekends,
        timezone: DateTime.now().timeZoneName,
        additionalNotes: _additionalNotesController.text.trim().isNotEmpty
            ? _additionalNotesController.text.trim()
            : null,
      );

      final response = await _calendarApi.getSmartScheduleSuggestions(
        currentWorkspace.id,
        requestDto,
      );

      if (response.isSuccess && response.data != null) {
        setState(() {
          _aiResponse = response.data;
          _isLoading = false;
        });
      } else {
        throw Exception(response.message ?? 'Failed to get suggestions');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${'common.error'.tr()}: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _startVoiceInput() async {
    if (!_speechAvailable) {
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.warning, color: Colors.orange),
                SizedBox(width: 8),
                Text('calendar.speech_unavailable'.tr()),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'calendar.speech_not_available'.tr(),
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 16),
                  Text('calendar.possible_reasons'.tr()),
                  SizedBox(height: 8),
                  Text('• ${'calendar.speech_not_supported'.tr()}'),
                  Text('• ${'calendar.windows_speech_hint'.tr()}'),
                  Text('• ${'calendar.android_ios_hint'.tr()}'),
                  SizedBox(height: 16),
                  Text(
                    'calendar.for_windows_users'.tr(),
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text('calendar.windows_step_1'.tr()),
                  Text('calendar.windows_step_2'.tr()),
                  Text('calendar.windows_step_3'.tr()),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.ok'.tr()),
              ),
            ],
          ),
        );
      }
      return;
    }

    // Check current permission status first
    var status = await Permission.microphone.status;

    // If not granted, request permission
    if (!status.isGranted) {
      status = await Permission.microphone.request();
    }

    // Check if permission is now granted
    if (!status.isGranted) {

      if (mounted) {
        // Check if permanently denied
        if (status.isPermanentlyDenied) {
          // Show dialog to open settings
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: Row(
                children: [
                  Icon(Icons.warning, color: Colors.red),
                  SizedBox(width: 8),
                  Text('calendar.permission_required'.tr()),
                ],
              ),
              content: Text(
                'calendar.microphone_permission_hint'.tr(),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('common.cancel'.tr()),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    openAppSettings();
                  },
                  child: Text('calendar.open_settings'.tr()),
                ),
              ],
            ),
          );
        } else {
          // Just denied this time
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('calendar.microphone_permission_hint'.tr()),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
      return;
    }


    setState(() => _isListening = true);

    // Show listening dialog
    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.mic, color: Theme.of(context).primaryColor),
                SizedBox(width: 8),
                Text('calendar.listening'.tr()),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Pulsing microphone icon
                _PulsingMicIcon(),
                SizedBox(height: 16),
                Text(
                  'calendar.speak_now'.tr(),
                  style: TextStyle(fontSize: 16),
                ),
                SizedBox(height: 8),
                ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: 100),
                  child: SingleChildScrollView(
                    child: Text(
                      _eventDescriptionController.text.isEmpty
                          ? 'calendar.speech_example'.tr()
                          : _eventDescriptionController.text,
                      style: TextStyle(
                        fontSize: 14,
                        color: _eventDescriptionController.text.isEmpty
                            ? Colors.grey[400]
                            : Colors.grey[700],
                        fontStyle: _eventDescriptionController.text.isEmpty
                            ? FontStyle.italic
                            : FontStyle.normal,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton.icon(
                onPressed: () {
                  _speechToText.stop();
                  setState(() => _isListening = false);
                  Navigator.pop(dialogContext);
                },
                icon: Icon(Icons.stop),
                label: Text('calendar.stop'.tr()),
              ),
            ],
          ),
        ),
      );
    }

    try {
      await _speechToText.listen(
        onResult: (result) {
          setState(() {
            _eventDescriptionController.text = result.recognizedWords;
          });

          // Auto-close dialog when speech is finalized
          if (result.finalResult && mounted) {
            Future.delayed(const Duration(milliseconds: 500), () {
              if (mounted && _isListening) {
                _speechToText.stop();
                setState(() => _isListening = false);
                Navigator.pop(context);
              }
            });
          }
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
        localeId: 'en_US',
        cancelOnError: true,
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isListening = false);
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${'common.error'.tr()}: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _createEventFromSuggestion() async {
    if (_aiResponse == null || _selectedSuggestionIndex == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('calendar.please_select_time_slot'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final suggestion = _aiResponse!.suggestions[_selectedSuggestionIndex!];
    final extractedInfo = _aiResponse!.extractedInfo;

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('calendar.creating_event'.tr()),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      // Build CreateEventDto from AI response
      final createDto = api.CreateEventDto(
        title: extractedInfo.title,
        description: extractedInfo.description.isNotEmpty
            ? extractedInfo.description
            : null,
        startTime: suggestion.startTime.toLocal(),
        endTime: suggestion.endTime.toLocal(),
        location: extractedInfo.preferredLocation,
        allDay: false,
        roomId: _selectedRoomId,
        attendees: extractedInfo.attendees.isNotEmpty
            ? extractedInfo.attendees
            : null,
        priority: extractedInfo.priority,
        status: 'confirmed',
        isRecurring: false,
        visibility: 'private',
      );

      // Call create event API
      final response = await _calendarApi.createEvent(
        currentWorkspace.id,
        createDto,
      );

      // Close loading dialog
      if (mounted) {
        Navigator.pop(context);
      }

      if (response.isSuccess && response.data != null) {
        // Show success message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text('calendar.event_created_success'.tr(args: [extractedInfo.title])),
                  ),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 3),
            ),
          );

          // Navigate back with success flag
          Navigator.pop(context, true);
        }
      } else {
        throw Exception(response.message ?? 'Failed to create event');
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
      }

      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.white),
                SizedBox(width: 8),
                Expanded(
                  child: Text('${'common.error'.tr()}: $e'),
                ),
              ],
            ),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 5),
            action: SnackBarAction(
              label: 'common.retry'.tr(),
              textColor: Colors.white,
              onPressed: _createEventFromSuggestion,
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(
              Icons.auto_awesome,
              color: Theme.of(context).primaryColor,
            ),
            SizedBox(width: 8),
            Text('calendar.smart_event_creator'.tr()),
          ],
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: Colors.grey[200],
            height: 1,
          ),
        ),
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text(
                    'calendar.getting_ai_suggestions'.tr(),
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Description Section
                    _buildDescriptionSection(),

                    const SizedBox(height: 24),

                    // Get AI Suggestions Button
                    _buildAISuggestionsButton(),

                    if (_aiResponse != null) ...[
                      const SizedBox(height: 32),
                      _buildAIResponse(),
                    ] else ...[
                      const SizedBox(height: 32),

                      // Scheduling Preferences Section
                      _buildSchedulingPreferences(),

                      const SizedBox(height: 24),

                      // Additional Notes Section
                      _buildAdditionalNotes(),
                    ],
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildDescriptionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'calendar.describe_your_event'.tr(),
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        SizedBox(height: 8),
        Text(
          'calendar.use_natural_language'.tr(),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: Column(
            children: [
              TextField(
                controller: _eventDescriptionController,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: 'calendar.event_description_example'.tr(),
                  hintStyle: TextStyle(color: Colors.grey[400]),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.all(16),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 8, bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    IconButton(
                      onPressed: _startVoiceInput,
                      icon: Icon(Icons.mic),
                      color: Theme.of(context).primaryColor,
                      tooltip: 'calendar.voice_input'.tr(),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: BorderSide(color: Colors.grey[300]!),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAISuggestionsButton() {
    return ElevatedButton.icon(
      onPressed: _getAISuggestions,
      icon: Icon(Icons.auto_awesome),
      label: Text(
        'calendar.get_ai_suggestions'.tr(),
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 2,
      ),
    );
  }

  Widget _buildSchedulingPreferences() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.tune,
                color: Theme.of(context).primaryColor,
                size: 24,
              ),
              SizedBox(width: 8),
              Text(
                'calendar.scheduling_preferences'.tr(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Look ahead days
          Row(
            children: [
              Expanded(
                child: Text(
                  'calendar.look_ahead_days'.tr(),
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: DropdownButton<int>(
                  value: _lookAheadDays,
                  underline: const SizedBox(),
                  items: _lookAheadOptions.map((days) {
                    return DropdownMenuItem(
                      value: days,
                      child: Text('calendar.days'.tr(args: ['$days'])),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _lookAheadDays = value!;
                    });
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Include weekends
          Row(
            children: [
              Expanded(
                child: Text(
                  'calendar.include_weekends'.tr(),
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Switch(
                value: _includeWeekends,
                onChanged: (value) {
                  setState(() {
                    _includeWeekends = value;
                  });
                },
                activeColor: Theme.of(context).primaryColor,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAdditionalNotes() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'calendar.additional_notes'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: TextField(
            controller: _additionalNotesController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'calendar.additional_notes_hint'.tr(),
              hintStyle: TextStyle(color: Colors.grey[400]),
              border: InputBorder.none,
              contentPadding: EdgeInsets.all(16),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAIResponse() {
    if (_aiResponse == null) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Interpretation
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.blue[200]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.lightbulb, color: Colors.blue[700], size: 20),
                  SizedBox(width: 8),
                  Text(
                    'calendar.ai_interpretation'.tr(),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.blue[700],
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _aiResponse!.interpretation,
                style: TextStyle(color: Colors.blue[900]),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Extracted Information
        _buildExtractedInfo(),

        const SizedBox(height: 24),

        // Suggestions
        _buildSuggestions(),

        if (_aiResponse!.insights.isNotEmpty) ...[
          const SizedBox(height: 24),
          _buildInsights(),
        ],

        const SizedBox(height: 32),

        // Action Buttons
        _buildActionButtons(),
      ],
    );
  }

  Widget _buildExtractedInfo() {
    final info = _aiResponse!.extractedInfo;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'calendar.event_details'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildInfoRow(Icons.title, 'calendar.title'.tr(), info.title),
          if (info.description.isNotEmpty) ...[
            const SizedBox(height: 12),
            _buildInfoRow(Icons.description, 'calendar.description'.tr(), info.description),
          ],
          const SizedBox(height: 12),
          _buildInfoRow(Icons.timer, 'calendar.duration'.tr(), 'calendar.minutes'.tr(args: ['${info.estimatedDuration}'])),
          if (info.attendees.isNotEmpty) ...[
            const SizedBox(height: 12),
            _buildInfoRow(Icons.people, 'calendar.attendees'.tr(), info.attendees.join(', ')),
          ],
          if (info.preferredLocation != null) ...[
            const SizedBox(height: 12),
            _buildInfoRow(Icons.location_on, 'calendar.location'.tr(), info.preferredLocation!),
          ],
          const SizedBox(height: 12),
          _buildInfoRow(
            Icons.priority_high,
            'calendar.priority'.tr(),
            info.priority.toUpperCase(),
            valueColor: _getPriorityColor(info.priority),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, {Color? valueColor}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  color: valueColor ?? Colors.black87,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'highest':
      case 'high':
        return Colors.red;
      case 'medium':
      case 'normal':
        return Colors.orange;
      case 'low':
      case 'lowest':
        return Colors.green;
      default:
        return Colors.blue;
    }
  }

  Widget _buildSuggestions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'calendar.suggested_time_slots'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _aiResponse!.suggestions.length,
          itemBuilder: (context, index) {
            final suggestion = _aiResponse!.suggestions[index];
            final isSelected = _selectedSuggestionIndex == index;

            return GestureDetector(
              onTap: () {
                setState(() {
                  _selectedSuggestionIndex = index;
                  _selectedRoomId = suggestion.recommendedRoom?.id;
                });
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.blue[50] : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? Colors.blue : Colors.grey[300]!,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                DateFormat('EEEE, MMM d, y').format(suggestion.startTime.toLocal()),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${DateFormat('h:mm a').format(suggestion.startTime.toLocal())} - ${DateFormat('h:mm a').format(suggestion.endTime.toLocal())}',
                                style: TextStyle(
                                  color: Colors.grey[700],
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: _getConfidenceColor(suggestion.confidence),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'calendar.match_percentage'.tr(args: ['${suggestion.confidence}']),
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      suggestion.reasoning,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 13,
                      ),
                    ),
                    if (suggestion.considerations.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      ...suggestion.considerations.map((consideration) => Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Row(
                          children: [
                            Icon(Icons.warning_amber, size: 16, color: Colors.orange[700]),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                consideration,
                                style: TextStyle(
                                  color: Colors.orange[800],
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )),
                    ],
                    if (suggestion.recommendedRoom != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green[200]!),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.meeting_room, size: 16, color: Colors.green[700]),
                                SizedBox(width: 6),
                                Text(
                                  'calendar.recommended_room'.tr(),
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green[700],
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              suggestion.recommendedRoom!.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              '${'calendar.capacity'.tr()}: ${suggestion.recommendedRoom!.capacity} • ${suggestion.recommendedRoom!.equipment.join(', ')}',
                              style: TextStyle(
                                color: Colors.grey[700],
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              suggestion.recommendedRoom!.whyRecommended,
                              style: TextStyle(
                                color: Colors.green[800],
                                fontSize: 12,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Color _getConfidenceColor(int confidence) {
    if (confidence >= 90) return Colors.green;
    if (confidence >= 70) return Colors.blue;
    if (confidence >= 50) return Colors.orange;
    return Colors.red;
  }

  Widget _buildInsights() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.purple[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.purple[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.insights, color: Colors.purple[700], size: 20),
              SizedBox(width: 8),
              Text(
                'calendar.insights'.tr(),
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.purple[700],
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._aiResponse!.insights.map((insight) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('• ', style: TextStyle(color: Colors.purple[700])),
                Expanded(
                  child: Text(
                    insight,
                    style: TextStyle(color: Colors.purple[900]),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: () {
              setState(() {
                _aiResponse = null;
                _selectedSuggestionIndex = null;
                _selectedRoomId = null;
              });
            },
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              side: BorderSide(color: Colors.grey[300]!),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'calendar.try_again'.tr(),
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: _createEventFromSuggestion,
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 2,
            ),
            child: Text(
              'calendar.create_event'.tr(),
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Pulsing microphone icon widget for speech recognition indicator
class _PulsingMicIcon extends StatefulWidget {
  @override
  State<_PulsingMicIcon> createState() => _PulsingMicIconState();
}

class _PulsingMicIconState extends State<_PulsingMicIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.scale(
          scale: _animation.value,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.red.withOpacity(0.1),
            ),
            child: const Icon(
              Icons.mic,
              size: 60,
              color: Colors.red,
            ),
          ),
        );
      },
    );
  }
}
