import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:vsc_quill_delta_to_html/vsc_quill_delta_to_html.dart';
import 'dart:math' as math;
import '../models/calendar_event.dart';
import '../services/video_call_service.dart';
import '../services/workspace_service.dart';
import '../services/auth_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/ai_api_service.dart';
import 'video_call_screen.dart';
import '../theme/app_theme.dart';
import '../widgets/ai_description_button.dart';

class ScheduleMeetingScreen extends StatefulWidget {
  final DateTime? selectedDate;

  const ScheduleMeetingScreen({super.key, this.selectedDate});

  @override
  State<ScheduleMeetingScreen> createState() => _ScheduleMeetingScreenState();
}

class _ScheduleMeetingScreenState extends State<ScheduleMeetingScreen>
    with TickerProviderStateMixin {
  // Tab management
  int _selectedTabIndex = 0;
  final List<String> _tabs = ['videocalls.basic_details']; // 'Advanced Options', 'AI Features' - Commented out

  // Form fields
  String _selectedPlatform = 'Video';
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _linkController = TextEditingController();
  final TextEditingController _physicalLocationController = TextEditingController();
  late QuillController _descriptionController;
  final ScrollController _descriptionScrollController = ScrollController();
  final FocusNode _descriptionFocusNode = FocusNode();
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _memberSearchController = TextEditingController();
  late DateTime _selectedDate;
  TimeOfDay _selectedTime = TimeOfDay.now();
  final String _selectedTimezone = 'Asia/Dhaka';
  String _selectedLocation = 'Virtual';
  String _selectedDuration = '1 hour';
  bool _enableSummary = true;
  bool _startImmediately = false;

  // Advanced Options variables
  String _recurrenceFrequency = 'No recurrence';
  bool _sendReminders = true;
  final List<int> _reminderTimes = [5, 15]; // minutes before meeting
  bool _addToCalendar = true;
  bool _sendInviteToMessages = false;

  // AI Features variables
  bool _enableAIFeatures = false;
  bool _realTimeTranscription = false;
  bool _liveTranslation = false;
  bool _aiNoteTaking = false;
  bool _speakerIdentification = false;
  bool _voiceCloneTranslation = false;

  // Loading state
  bool _isCreatingMeeting = false;
  bool _isLoadingMembers = false;
  bool _isNavigating = false; // Track navigation to prevent race conditions

  // AI generation state and animation
  bool _isGeneratingAI = false;
  late AnimationController _aiAnimationController;
  late Animation<double> _aiBorderAnimation;
  final AIApiService _aiService = AIApiService();

  // Workspace members
  List<WorkspaceMember> _workspaceMembers = [];
  List<WorkspaceMember> _filteredMembers = [];
  final Set<String> _selectedMemberIds = {};
  bool _selectAllOnline = false;

  @override
  void initState() {
    super.initState();
    // Initialize selected date with the passed date or default to today
    _selectedDate = widget.selectedDate ?? DateTime.now();
    // Initialize QuillController for description
    _descriptionController = QuillController.basic();
    _loadWorkspaceMembers();
    _memberSearchController.addListener(_filterMembers);

    // Initialize animation controller for AI generation border effect
    _aiAnimationController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _aiBorderAnimation = CurvedAnimation(
      parent: _aiAnimationController,
      curve: Curves.linear,
    );
  }

  // Theme-aware color getters
  Color get backgroundColor => Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF0F1419)
      : Colors.grey[50]!;

  Color get surfaceColor => Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF1A1F2A)
      : Colors.white;

  Color get textColor => Theme.of(context).brightness == Brightness.dark
      ? Colors.white
      : Colors.black87;

  Color get subtitleColor => Theme.of(context).brightness == Brightness.dark
      ? Colors.grey[400]!
      : Colors.grey[600]!;

  Color get borderColor => Theme.of(context).brightness == Brightness.dark
      ? Colors.grey[800]!
      : Colors.grey[300]!;

  Color get cardColor => Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF252B37)
      : Colors.grey[100]!;

  @override
  void dispose() {
    _titleController.dispose();
    _linkController.dispose();
    _physicalLocationController.dispose();
    _descriptionController.dispose();
    _descriptionScrollController.dispose();
    _descriptionFocusNode.dispose();
    _notesController.dispose();
    _memberSearchController.dispose();
    _aiAnimationController.dispose();
    super.dispose();
  }

  /// Load workspace members from API
  Future<void> _loadWorkspaceMembers() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      return;
    }

    setState(() {
      _isLoadingMembers = true;
    });

    try {
      final apiService = WorkspaceApiService();
      final response = await apiService.getMembers(workspaceId);

      if (response.isSuccess && response.data != null) {
        // Filter out the current user from the list
        final currentUserId = AuthService.instance.currentUser?.id;
        final filteredMembers = response.data!.where((member) {
          return member.userId != currentUserId;
        }).toList();

        setState(() {
          _workspaceMembers = filteredMembers;
          _filteredMembers = filteredMembers;
          _isLoadingMembers = false;
        });
      } else {
        setState(() {
          _isLoadingMembers = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoadingMembers = false;
      });
    }
  }

  /// Filter members based on search query
  void _filterMembers() {
    final query = _memberSearchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredMembers = _workspaceMembers;
      } else {
        _filteredMembers = _workspaceMembers.where((member) {
          final name = (member.name ?? '').toLowerCase();
          final email = member.email.toLowerCase();
          return name.contains(query) || email.contains(query);
        }).toList();
      }
    });
  }

  /// Toggle member selection
  void _toggleMemberSelection(String userId) {
    setState(() {
      if (_selectedMemberIds.contains(userId)) {
        _selectedMemberIds.remove(userId);
      } else {
        _selectedMemberIds.add(userId);
      }
    });
  }

  /// Select/Deselect all members
  void _toggleSelectAll() {
    setState(() {
      if (_selectAllOnline) {
        // Deselect all
        _selectedMemberIds.clear();
        _selectAllOnline = false;
      } else {
        // Select all filtered members (exclude current user)
        _selectedMemberIds.clear();
        for (final member in _filteredMembers) {
          if (member.isActive) {
            _selectedMemberIds.add(member.userId);
          }
        }
        _selectAllOnline = true;
      }
    });
  }

  // Generate AI description for meeting
  Future<void> _generateAIDescription() async {
    final meetingTitle = _titleController.text.trim();

    if (meetingTitle.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('videocalls.enter_title_for_ai'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Start animation and set loading state
    setState(() {
      _isGeneratingAI = true;
    });
    _aiAnimationController.repeat();

    try {
      // Get duration in minutes
      int durationMinutes = 60;
      if (_selectedDuration == '30 minutes') {
        durationMinutes = 30;
      } else if (_selectedDuration == '1 hour') {
        durationMinutes = 60;
      } else if (_selectedDuration == '1.5 hours') {
        durationMinutes = 90;
      } else if (_selectedDuration == '2 hours') {
        durationMinutes = 120;
      } else if (_selectedDuration == '3 hours') {
        durationMinutes = 180;
      }

      // Call AI API to generate 3 descriptions
      final response = await _aiService.generateMeetingDescriptions(
        meetingTitle,
        location: _selectedLocation,
        duration: durationMinutes,
      );

      // Stop animation
      _aiAnimationController.stop();
      setState(() {
        _isGeneratingAI = false;
      });

      if (response.success && response.data != null) {
        // Parse descriptions
        final fullText = response.data!.generatedText;
        List<String> descriptions = [];

        // Try splitting by blank lines
        if (fullText.contains('\n\n')) {
          descriptions = fullText
              .split('\n\n')
              .map((d) => d.trim())
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Try splitting by ---
        else if (fullText.contains('---')) {
          descriptions = fullText
              .split('---')
              .map((d) => d.trim())
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Try splitting by numbered list (1., 2., 3.)
        else if (fullText.contains(RegExp(r'^\d+\.\s', multiLine: true))) {
          final pattern = RegExp(r'\d+\.\s*(.+?)(?=\d+\.\s|$)', dotAll: true);
          final matches = pattern.allMatches(fullText);
          descriptions = matches
              .map((m) => m.group(1)?.trim() ?? '')
              .where((d) => d.isNotEmpty)
              .toList();
        }
        // Otherwise use the whole text as one description
        else {
          descriptions = [fullText];
        }

        // Clean up descriptions
        descriptions = descriptions.map((desc) {
          return desc
              .replaceAll(RegExp(r'^\d+[\.\)]\s*'), '')
              .replaceAll(RegExp(r'\*\*[^*]+\*\*\s*'), '')
              .trim();
        }).where((d) => d.isNotEmpty).toList();

        if (descriptions.isEmpty) {
          throw Exception('No descriptions generated');
        }

        // Show selection dialog
        if (mounted) {
          _showDescriptionSelectionDialog(descriptions);
        }
      } else {
        throw Exception(response.error ?? 'Failed to generate descriptions');
      }
    } catch (e) {
      // Stop animation on error
      _aiAnimationController.stop();
      setState(() {
        _isGeneratingAI = false;
      });

      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_generate_ai'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showDescriptionSelectionDialog(List<String> descriptions) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogSurfaceColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final dialogTextColor = isDark ? Colors.white : Colors.black87;
    final dialogSubtitleColor = isDark ? Colors.grey[400] : Colors.grey[600];
    final dialogBorderColor = isDark ? Colors.grey[800]! : Colors.grey[300]!;
    final dialogBackgroundColor = isDark ? const Color(0xFF2D2D2D) : const Color(0xFFF5F5F5);

    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: dialogSurfaceColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Container(
          constraints: BoxConstraints(
            maxWidth: 500,
            maxHeight: MediaQuery.of(context).size.height * 0.7,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'videocalls.select_description'.tr(),
                      style: TextStyle(
                        color: dialogTextColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: dialogSubtitleColor, size: 20),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Scrollable list of options
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: const EdgeInsets.all(20),
                  itemCount: descriptions.length,
                  separatorBuilder: (context, index) => SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () {
                          setState(() {
                            // Set Quill editor content with AI generated description
                            final length = _descriptionController.document.length;
                            _descriptionController.replaceText(
                              0,
                              length - 1,
                              descriptions[index],
                              TextSelection.collapsed(offset: descriptions[index].length),
                            );
                          });
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('videocalls.description_applied'.tr()),
                              backgroundColor: context.primaryColor,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: dialogBackgroundColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: dialogBorderColor.withOpacity(0.5),
                              width: 1.5,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: context.primaryColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'videocalls.option_number'.tr(args: [(index + 1).toString()]),
                                      style: TextStyle(
                                        color: context.primaryColor,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 12),
                              Text(
                                descriptions[index],
                                style: TextStyle(
                                  color: dialogTextColor,
                                  fontSize: 14,
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: _buildAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            _buildTabBar(),
            Expanded(
              child: _buildTabContent(),
            ),
            _buildBottomActions(),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: backgroundColor,
      elevation: 0,
      leading: IconButton(
        icon: Icon(Icons.close, color: textColor),
        onPressed: (_isCreatingMeeting || _isNavigating)
            ? null
            : () => _handleClose(),
      ),
      title: Row(
        children: [
          Icon(Icons.schedule, color: textColor, size: 20),
          SizedBox(width: 8),
          Text(
            'videocalls.schedule_meeting'.tr(),
            style: TextStyle(color: textColor, fontSize: 18),
          ),
        ],
      ),
    );
  }

  /// Safely close the screen to prevent Navigator race conditions
  void _handleClose() {
    if (_isNavigating) return;

    setState(() {
      _isNavigating = true;
    });

    // Use Future.delayed to ensure navigation happens outside of build phase
    Future.delayed(Duration.zero, () {
      if (!mounted) return;
      if (Navigator.canPop(context)) {
        Navigator.pop(context);
      }
    });
  }

  // Tab bar hidden - only Basic Details tab is active
  Widget _buildTabBar() {
    return const SizedBox.shrink(); // Hidden since only one tab
    /* COMMENTED OUT - Only Basic Details tab needed
    return Container(
      height: 60,
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: borderColor.withValues(alpha: 0.3)),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: List.generate(_tabs.length, (index) {
            final isSelected = _selectedTabIndex == index;
            return GestureDetector(
              onTap: () => setState(() => _selectedTabIndex = index),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  color: isSelected ? context.primaryColor.withValues(alpha: 0.1) : Colors.transparent,
                  borderRadius: BorderRadius.circular(5),
                  border: Border.all(
                    color: isSelected ? context.primaryColor : borderColor,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (index == 0) Icon(Icons.edit, size: 14, color: isSelected ? context.primaryColor : subtitleColor),
                    if (index == 1) Icon(Icons.settings, size: 14, color: isSelected ? context.primaryColor : subtitleColor),
                    if (index == 2) Icon(Icons.auto_awesome, size: 14, color: isSelected ? context.primaryColor : subtitleColor),
                    SizedBox(width: 4),
                    Text(
                      _tabs[index],
                      style: TextStyle(
                        color: isSelected ? context.primaryColor : textColor,
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
    */
  }

  Widget _buildTabContent() {
    // Only Basic Details tab is active
    return _buildBasicDetailsTab();

    /* COMMENTED OUT - Advanced Options and AI Features tabs
    switch (_selectedTabIndex) {
      case 0:
        return _buildBasicDetailsTab();
      case 1:
        return _buildAdvancedOptionsTab();
      case 2:
        return _buildAIFeaturesTab();
      default:
        return _buildBasicDetailsTab();
    }
    */
  }

  Widget _buildBasicDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Meeting Platform
          Text(
            'videocalls.meeting_platform'.tr(),
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w600),
          ),
          SizedBox(height: 12),
          Row(
            children: [
              _buildPlatformCard('videocalls.video'.tr(), 'videocalls.video_full_hd'.tr(), Icons.videocam, Colors.purple),
              SizedBox(width: 12),
              _buildPlatformCard('videocalls.audio_call'.tr(), 'videocalls.audio_crystal_clear'.tr(), Icons.mic, Colors.cyan),
              SizedBox(width: 12),
              _buildPlatformCard('videocalls.webinar'.tr(), 'videocalls.webinar_description'.tr(), Icons.people, Colors.pink),
            ],
          ),
          SizedBox(height: 24),

          // Meeting Title
          Text(
            'videocalls.meeting_title_required'.tr(),
            style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
          ),
          SizedBox(height: 8),
          TextField(
            controller: _titleController,
            style: TextStyle(color: textColor),
            decoration: InputDecoration(
              hintText: 'videocalls.enter_meeting_title'.tr(),
              hintStyle: TextStyle(color: subtitleColor),
              filled: true,
              fillColor: cardColor,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          SizedBox(height: 16),

          // Duration
          Text(
            'videocalls.duration'.tr(),
            style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
          ),
          SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedDuration,
                isExpanded: true,
                style: TextStyle(color: textColor),
                dropdownColor: surfaceColor,
                items: [
                  DropdownMenuItem(value: '30 minutes', child: Text('30 ${'videocalls.minutes_suffix'.tr()}')),
                  DropdownMenuItem(value: '1 hour', child: Text('1 ${'videocalls.hour_suffix'.tr()}')),
                  DropdownMenuItem(value: '1.5 hours', child: Text('1.5 ${'videocalls.hours_suffix'.tr()}')),
                  DropdownMenuItem(value: '2 hours', child: Text('2 ${'videocalls.hours_suffix'.tr()}')),
                  DropdownMenuItem(value: '3 hours', child: Text('3 ${'videocalls.hours_suffix'.tr()}')),
                  DropdownMenuItem(value: 'Custom', child: Text('videocalls.custom'.tr())),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedDuration = value!;
                  });
                },
              ),
            ),
          ),
          SizedBox(height: 16),

          // Date and Time Row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'videocalls.date'.tr(),
                      style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                    SizedBox(height: 8),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _selectedDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          setState(() {
                            _selectedDate = picked;
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${_selectedDate.month.toString().padLeft(2, '0')}/${_selectedDate.day.toString().padLeft(2, '0')}/${_selectedDate.year}',
                                style: TextStyle(color: textColor),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            SizedBox(width: 8),
                            Icon(Icons.calendar_today, color: subtitleColor, size: 18),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'videocalls.time'.tr(),
                      style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                    SizedBox(height: 8),
                    InkWell(
                      onTap: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: _selectedTime,
                        );
                        if (picked != null) {
                          setState(() {
                            _selectedTime = picked;
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _selectedTime.format(context),
                              style: TextStyle(color: textColor),
                            ),
                            Icon(Icons.access_time, color: subtitleColor, size: 18),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'videocalls.timezone'.tr(),
                      style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                    SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _selectedTimezone,
                        style: TextStyle(color: textColor, fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 24),

          // Meeting Location
          Text(
            'videocalls.meeting_location'.tr(),
            style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w600),
          ),
          SizedBox(height: 12),
          Row(
            children: [
              _buildLocationCard('videocalls.virtual'.tr(), 'videocalls.online_meeting'.tr(), Icons.videocam),
              SizedBox(width: 12),
              _buildLocationCard('videocalls.in_person'.tr(), 'videocalls.physical_location'.tr(), Icons.location_on),
              SizedBox(width: 12),
              _buildLocationCard('videocalls.hybrid'.tr(), 'videocalls.both_online_in_person'.tr(), Icons.groups),
            ],
          ),
          SizedBox(height: 24),

          // Physical Location (for In-Person and Hybrid)
          if (_selectedLocation == 'In-Person' || _selectedLocation == 'Hybrid') ...[
            Text(
              'videocalls.physical_location'.tr(),
              style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
            ),
            SizedBox(height: 8),
            TextField(
              controller: _physicalLocationController,
              style: TextStyle(color: textColor),
              decoration: InputDecoration(
                hintText: 'videocalls.enter_physical_address'.tr(),
                hintStyle: TextStyle(color: subtitleColor, fontSize: 12),
                filled: true,
                fillColor: cardColor,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                prefixIcon: Icon(Icons.location_on, color: subtitleColor, size: 20),
              ),
            ),
            SizedBox(height: 16),
          ],


          // Description
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'videocalls.description_optional'.tr(),
                style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
              ),
              AIDescriptionButton(
                onPressed: _generateAIDescription,
                isLoading: _isGeneratingAI,
              ),
            ],
          ),
          SizedBox(height: 8),
          _isGeneratingAI
              ? AnimatedBuilder(
                  animation: _aiBorderAnimation,
                  builder: (context, child) {
                    return Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        gradient: SweepGradient(
                          center: Alignment.center,
                          startAngle: 0,
                          endAngle: math.pi * 2,
                          transform: GradientRotation(_aiBorderAnimation.value * math.pi * 2),
                          colors: [
                            Colors.teal.shade500,
                            Colors.teal.shade400,
                            Colors.cyan.shade400,
                            Colors.green.shade400,
                            Colors.green.shade500,
                            Colors.teal.shade500,
                          ],
                          stops: const [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.teal.shade800.withOpacity(0.7),
                            blurRadius: 15,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(2),
                      child: Container(
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: child,
                      ),
                    );
                  },
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Column(
                      children: [
                        // Quill Toolbar
                        Container(
                          decoration: BoxDecoration(
                            color: cardColor.withOpacity(0.5),
                          ),
                          child: QuillSimpleToolbar(
                            controller: _descriptionController,
                            config: const QuillSimpleToolbarConfig(
                              showBoldButton: true,
                              showItalicButton: true,
                              showUnderLineButton: true,
                              showStrikeThrough: true,
                              showListNumbers: true,
                              showListBullets: true,
                              showIndent: true,
                              showLink: false,
                              showClearFormat: true,
                              showFontFamily: false,
                              showFontSize: false,
                              showBackgroundColorButton: false,
                              showColorButton: false,
                              showHeaderStyle: false,
                              showQuote: false,
                              showCodeBlock: false,
                              showInlineCode: false,
                              showAlignmentButtons: true,
                              showSearchButton: false,
                              showSubscript: false,
                              showSuperscript: false,
                              showDividers: false,
                              showSmallButton: false,
                              showDirection: false,
                              showUndo: false,
                              showRedo: false,
                              multiRowsDisplay: false,
                            ),
                          ),
                        ),
                        Divider(height: 1, color: borderColor),
                        // Quill Editor
                        Container(
                          height: 120,
                          padding: const EdgeInsets.all(12),
                          child: QuillEditor.basic(
                            controller: _descriptionController,
                            focusNode: _descriptionFocusNode,
                            scrollController: _descriptionScrollController,
                            config: QuillEditorConfig(
                              placeholder: 'videocalls.add_meeting_agenda'.tr(),
                              expands: true,
                              padding: EdgeInsets.zero,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : Container(
                  decoration: BoxDecoration(
                    color: cardColor,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: borderColor),
                  ),
                  child: Column(
                    children: [
                      // Quill Toolbar
                      Container(
                        decoration: BoxDecoration(
                          color: cardColor.withOpacity(0.5),
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(8),
                            topRight: Radius.circular(8),
                          ),
                        ),
                        child: QuillSimpleToolbar(
                          controller: _descriptionController,
                          config: const QuillSimpleToolbarConfig(
                            showBoldButton: true,
                            showItalicButton: true,
                            showUnderLineButton: true,
                            showStrikeThrough: true,
                            showListNumbers: true,
                            showListBullets: true,
                            showIndent: true,
                            showLink: false,
                            showClearFormat: true,
                            showFontFamily: false,
                            showFontSize: false,
                            showBackgroundColorButton: false,
                            showColorButton: false,
                            showHeaderStyle: false,
                            showQuote: false,
                            showCodeBlock: false,
                            showInlineCode: false,
                            showAlignmentButtons: true,
                            showSearchButton: false,
                            showSubscript: false,
                            showSuperscript: false,
                            showDividers: false,
                            showSmallButton: false,
                            showDirection: false,
                            showUndo: false,
                            showRedo: false,
                            multiRowsDisplay: false,
                          ),
                        ),
                      ),
                      Divider(height: 1, color: borderColor),
                      // Quill Editor
                      Container(
                        height: 120,
                        padding: const EdgeInsets.all(12),
                        child: QuillEditor.basic(
                          controller: _descriptionController,
                          focusNode: _descriptionFocusNode,
                          scrollController: _descriptionScrollController,
                          config: QuillEditorConfig(
                            placeholder: 'videocalls.add_meeting_agenda'.tr(),
                            expands: true,
                            padding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
          SizedBox(height: 24),

          // Invite Team Members
          _buildInviteTeamMembersSection(),

          SizedBox(height: 24),

          // Start Immediately Option
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _startImmediately
                  ? context.primaryColor.withValues(alpha: 0.1)
                  : cardColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: _startImmediately
                    ? context.primaryColor
                    : borderColor,
              ),
            ),
            child: Row(
              children: [
                Checkbox(
                  value: _startImmediately,
                  onChanged: (value) {
                    setState(() {
                      _startImmediately = value!;
                    });
                  },
                  activeColor: context.primaryColor,
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'videocalls.start_meeting_immediately'.tr(),
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'videocalls.send_realtime_call'.tr(),
                        style: TextStyle(
                          color: subtitleColor,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          SizedBox(height: 16),

          // Meeting Summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Checkbox(
                      value: _enableSummary,
                      onChanged: (value) {
                        setState(() {
                          _enableSummary = value!;
                        });
                      },
                      activeColor: context.primaryColor,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'videocalls.meeting_summary'.tr(),
                      style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                SizedBox(height: 12),
                _buildSummaryRow('videocalls.date_time'.tr(), 'July 21st, 2025 at 15:12'),
                SizedBox(height: 8),
                _buildSummaryRow('videocalls.duration_label'.tr(), '60 minutes'),
                SizedBox(height: 8),
                _buildSummaryRow('videocalls.location_label'.tr(), 'videocalls.video'.tr()),
                SizedBox(height: 8),
                _buildSummaryRow('videocalls.attendees_label'.tr(), 'videocalls.members_count'.tr(args: [_selectedMemberIds.length.toString()])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build invite team members section with workspace members
  Widget _buildInviteTeamMembersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'videocalls.invite_team_members'.tr(),
              style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w600),
            ),
            if (_selectedMemberIds.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: context.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'videocalls.count_selected'.tr(args: [_selectedMemberIds.length.toString()]),
                  style: TextStyle(
                    color: context.primaryColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
        SizedBox(height: 12),

        // Select all / Deselect all
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'videocalls.select_all_active_members'.tr(),
              style: TextStyle(color: textColor, fontSize: 14),
            ),
            TextButton(
              onPressed: _toggleSelectAll,
              child: Text(
                _selectAllOnline ? 'videocalls.deselect_all'.tr() : 'videocalls.select_all'.tr(),
                style: TextStyle(color: context.primaryColor),
              ),
            ),
          ],
        ),
        SizedBox(height: 8),

        // Search members
        TextField(
          controller: _memberSearchController,
          style: TextStyle(color: textColor),
          decoration: InputDecoration(
            hintText: 'videocalls.search_team_members'.tr(),
            hintStyle: TextStyle(color: subtitleColor),
            filled: true,
            fillColor: cardColor,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            prefixIcon: Icon(Icons.search, color: subtitleColor, size: 20),
          ),
        ),
        SizedBox(height: 16),

        // Members list
        if (_isLoadingMembers)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(context.primaryColor),
              ),
            ),
          )
        else if (_filteredMembers.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              children: [
                Icon(Icons.people_outline, color: subtitleColor, size: 48),
                SizedBox(height: 12),
                Text(
                  'videocalls.no_team_members_found'.tr(),
                  style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
                ),
                SizedBox(height: 4),
                Text(
                  'videocalls.try_different_search_invite'.tr(),
                  style: TextStyle(color: subtitleColor, fontSize: 12),
                ),
              ],
            ),
          )
        else
          Container(
            constraints: const BoxConstraints(maxHeight: 300),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: _filteredMembers.length,
              itemBuilder: (context, index) {
                final member = _filteredMembers[index];
                final isSelected = _selectedMemberIds.contains(member.userId);

                return InkWell(
                  onTap: () => _toggleMemberSelection(member.userId),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: index < _filteredMembers.length - 1 ? borderColor : Colors.transparent,
                        ),
                      ),
                    ),
                    child: Row(
                      children: [
                        // Checkbox
                        Checkbox(
                          value: isSelected,
                          onChanged: (value) => _toggleMemberSelection(member.userId),
                          activeColor: context.primaryColor,
                        ),
                        SizedBox(width: 12),

                        // Avatar
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: context.primaryColor.withValues(alpha: 0.1),
                          backgroundImage: member.avatar != null && member.avatar!.isNotEmpty
                              ? NetworkImage(member.avatar!)
                              : null,
                          child: member.avatar == null || member.avatar!.isEmpty
                              ? Text(
                                  (member.name ?? member.email).substring(0, 1).toUpperCase(),
                                  style: TextStyle(
                                    color: context.primaryColor,
                                    fontWeight: FontWeight.bold,
                                  ),
                                )
                              : null,
                        ),
                        SizedBox(width: 12),

                        // Member info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                member.name ?? member.email,
                                style: TextStyle(
                                  color: textColor,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              SizedBox(height: 2),
                              Row(
                                children: [
                                  // Green dot for active users
                                  if (member.isActive) ...[
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: Color(0xFF00C853),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    SizedBox(width: 6),
                                  ],
                                  Flexible(
                                    child: Text(
                                      member.email,
                                      style: TextStyle(
                                        color: subtitleColor,
                                        fontSize: 12,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Role badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getRoleColor(member.role).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            _getRoleLabel(member.role),
                            style: TextStyle(
                              color: _getRoleColor(member.role),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Color _getRoleColor(WorkspaceRole role) {
    switch (role) {
      case WorkspaceRole.owner:
        return Colors.purple;
      case WorkspaceRole.admin:
        return Colors.blue;
      case WorkspaceRole.member:
        return Colors.green;
      case WorkspaceRole.viewer:
        return Colors.orange;
    }
  }

  String _getRoleLabel(WorkspaceRole role) {
    switch (role) {
      case WorkspaceRole.owner:
        return 'videocalls.owner'.tr().toUpperCase();
      case WorkspaceRole.admin:
        return 'videocalls.admin'.tr().toUpperCase();
      case WorkspaceRole.member:
        return 'videocalls.team_member'.tr().toUpperCase();
      case WorkspaceRole.viewer:
        return 'videocalls.participant'.tr().toUpperCase();
    }
  }

  /* COMMENTED OUT - Advanced Options Tab not needed
  Widget _buildAdvancedOptionsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Recurrence Section
          _buildSectionHeader(Icons.repeat, 'videocalls.recurrence'.tr()),
          SizedBox(height: 16),
          _buildRecurrenceSection(),

          SizedBox(height: 32),

          // Notifications & Reminders Section
          _buildSectionHeader(Icons.notifications, 'videocalls.notifications_reminders'.tr()),
          SizedBox(height: 16),
          _buildNotificationsSection(),

          SizedBox(height: 32),

          // Invitation Options Section
          _buildInvitationOptionsSection(),

          SizedBox(height: 32),

          // Meeting Summary Section
          _buildMeetingSummarySection(),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, color: textColor, size: 18),
        SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildRecurrenceSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'videocalls.frequency'.tr(),
          style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
        ),
        SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _recurrenceFrequency,
              style: TextStyle(color: textColor),
              dropdownColor: surfaceColor,
              icon: Icon(Icons.keyboard_arrow_down, color: subtitleColor),
              items: [
                DropdownMenuItem(value: 'No recurrence', child: Text('videocalls.no_recurrence'.tr())),
                DropdownMenuItem(value: 'Daily', child: Text('videocalls.daily'.tr())),
                DropdownMenuItem(value: 'Weekly', child: Text('videocalls.weekly'.tr())),
                DropdownMenuItem(value: 'Monthly', child: Text('videocalls.monthly'.tr())),
                DropdownMenuItem(value: 'Yearly', child: Text('videocalls.yearly'.tr())),
              ],
              onChanged: (String? newValue) {
                if (newValue != null) {
                  setState(() {
                    _recurrenceFrequency = newValue;
                  });
                }
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Send reminders toggle
        Row(
          children: [
            Checkbox(
              value: _sendReminders,
              onChanged: (bool? value) {
                setState(() {
                  _sendReminders = value ?? false;
                });
              },
              fillColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return context.primaryColor;
                }
                return Colors.transparent;
              }),
              side: BorderSide(color: borderColor),
            ),
            Text(
              'videocalls.send_reminders'.tr(),
              style: TextStyle(color: textColor, fontSize: 14, fontWeight: FontWeight.w500),
            ),
          ],
        ),

        if (_sendReminders) ...[
          SizedBox(height: 16),
          Text(
            'videocalls.reminder_times'.tr(),
            style: TextStyle(color: textColor, fontSize: 12),
          ),
          SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [5, 10, 15, 30, 60].map((time) {
              final isSelected = _reminderTimes.contains(time);
              return FilterChip(
                selected: isSelected,
                label: Text('$time ${'videocalls.min_short'.tr()}'),
                onSelected: (bool selected) {
                  setState(() {
                    if (selected) {
                      _reminderTimes.add(time);
                    } else {
                      _reminderTimes.remove(time);
                    }
                  });
                },
                selectedColor: context.primaryColor.withValues(alpha: 0.2),
                checkmarkColor: context.primaryColor,
                side: BorderSide(color: isSelected ? context.primaryColor : borderColor),
                backgroundColor: surfaceColor,
                labelStyle: TextStyle(
                  color: isSelected ? context.primaryColor : textColor,
                  fontSize: 12,
                ),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }

  Widget _buildInvitationOptionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'videocalls.invitation_options'.tr(),
          style: TextStyle(
            color: textColor,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        SizedBox(height: 16),

        // Add to calendar
        Row(
          children: [
            Checkbox(
              value: _addToCalendar,
              onChanged: (bool? value) {
                setState(() {
                  _addToCalendar = value ?? false;
                });
              },
              fillColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return context.primaryColor;
                }
                return Colors.transparent;
              }),
              side: BorderSide(color: borderColor),
            ),
            Icon(Icons.calendar_today, color: textColor, size: 16),
            SizedBox(width: 8),
            Text(
              'videocalls.add_to_calendar'.tr(),
              style: TextStyle(color: textColor, fontSize: 14),
            ),
          ],
        ),

        SizedBox(height: 12),

        // Send Invite to Messages
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Checkbox(
                value: _sendInviteToMessages,
                onChanged: (bool? value) {
                  setState(() {
                    _sendInviteToMessages = value ?? false;
                  });
                },
                fillColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return context.primaryColor;
                  }
                  return Colors.transparent;
                }),
                side: BorderSide(color: borderColor),
              ),
              Icon(Icons.message, color: textColor, size: 16),
              SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'videocalls.send_invite_to_messages'.tr(),
                      style: TextStyle(color: textColor, fontSize: 14),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'videocalls.use_mentions'.tr(),
                      style: TextStyle(color: subtitleColor, fontSize: 12),
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

  Widget _buildMeetingSummarySection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.calendar_today, color: textColor, size: 16),
              SizedBox(width: 8),
              Text(
                'videocalls.meeting_summary'.tr(),
                style: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          SizedBox(height: 16),

          _buildSummaryRow('videocalls.date_time'.tr(), 'July 22nd, 2025 at 09:04'),
          _buildSummaryRow('videocalls.duration_label'.tr(), '60 minutes'),
          _buildSummaryRow('videocalls.location_label'.tr(), 'videocalls.video'.tr()),
        ],
      ),
    );
  }

  */ // End of Advanced Options Tab comment

  /* COMMENTED OUT - AI Features Tab not needed
  Widget _buildAIFeaturesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Enable AI Features Section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.auto_awesome, color: textColor, size: 20),
                        SizedBox(width: 12),
                        Text(
                          'videocalls.enable_ai_features'.tr(),
                          style: TextStyle(
                            color: textColor,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Switch(
                      value: _enableAIFeatures,
                      onChanged: (bool value) {
                        setState(() {
                          _enableAIFeatures = value;
                        });
                      },
                      activeColor: context.primaryColor,
                      inactiveThumbColor: subtitleColor,
                      inactiveTrackColor: borderColor,
                    ),
                  ],
                ),
                SizedBox(height: 12),
                Text(
                  'videocalls.ai_features_description'.tr(),
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),

          // Individual AI Features (only show when enabled)
          if (_enableAIFeatures) ...[
            SizedBox(height: 16),

            // Real-time Transcription
            _buildAIFeatureRow(
              Icons.mic,
              'videocalls.realtime_transcription'.tr(),
              'videocalls.realtime_transcription_desc'.tr(),
              _realTimeTranscription,
              (value) => setState(() => _realTimeTranscription = value),
            ),

            // Live Translation
            _buildAIFeatureRow(
              Icons.translate,
              'videocalls.live_translation'.tr(),
              '',
              _liveTranslation,
              (value) => setState(() => _liveTranslation = value),
            ),

            // AI Note-taking
            _buildAIFeatureRow(
              Icons.note_alt,
              'videocalls.ai_note_taking'.tr(),
              'videocalls.ai_note_taking_desc'.tr(),
              _aiNoteTaking,
              (value) => setState(() => _aiNoteTaking = value),
            ),

            SizedBox(height: 16),

            // Advanced Options
            Text(
              'videocalls.advanced_options'.tr(),
              style: TextStyle(
                color: textColor,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(width: 12),

            _buildAIFeatureRowSimple(
              'videocalls.speaker_identification'.tr(),
              '',
              _speakerIdentification,
              (value) => setState(() => _speakerIdentification = value),
            ),

            _buildAIFeatureRowSimple(
              'videocalls.voice_clone_translation'.tr(),
              '',
              _voiceCloneTranslation,
              (value) => setState(() => _voiceCloneTranslation = value),
            ),

            SizedBox(height: 24),

            // AI Features Summary
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.auto_awesome, color: textColor, size: 16),
                      SizedBox(width: 8),
                      Text(
                        'AI Features Summary',
                        style: TextStyle(
                          color: textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  _buildAISummaryStatusRow('videocalls.realtime_transcription'.tr() + ':', _realTimeTranscription ? 'videocalls.enabled'.tr() : 'videocalls.disabled'.tr(), _realTimeTranscription),
                  _buildAISummaryStatusRow('videocalls.live_translation'.tr() + ':', _liveTranslation ? 'videocalls.enabled'.tr() : 'videocalls.disabled'.tr(), _liveTranslation),
                  _buildAISummaryStatusRow('videocalls.ai_note_taking'.tr() + ':', _aiNoteTaking ? 'videocalls.enabled'.tr() : 'videocalls.disabled'.tr(), _aiNoteTaking),
                  _buildAISummaryStatusRow('videocalls.speaker_identification'.tr() + ':', _speakerIdentification ? 'videocalls.enabled'.tr() : 'videocalls.disabled'.tr(), _speakerIdentification),
                ],
              ),
            ),
          ],

          SizedBox(height: 24),

          // Meeting Summary Section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.calendar_today, color: textColor, size: 18),
                    SizedBox(width: 12),
                    Text(
                      'videocalls.meeting_summary'.tr(),
                      style: TextStyle(
                        color: textColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 20),

                _buildAISummaryRow('videocalls.date_time'.tr(), 'July 22nd, 2025 at 15:44'),
                _buildAISummaryRow('videocalls.duration_label'.tr(), '60 minutes'),
                _buildAISummaryRow('videocalls.location_label'.tr(), 'videocalls.video'.tr()),
                _buildAISummaryRow('videocalls.ai_features'.tr() + ':', _enableAIFeatures ? 'videocalls.enabled'.tr() : 'videocalls.disabled'.tr()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAIFeatureRow(IconData icon, String title, String description, bool value, ValueChanged<bool> onChanged) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, color: textColor, size: 20),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (description.isNotEmpty) ...[
                  SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 12,
                      height: 1.3,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: context.primaryColor,
            inactiveThumbColor: subtitleColor,
            inactiveTrackColor: borderColor,
          ),
        ],
      ),
    );
  }

  Widget _buildAIFeatureRowSimple(String title, String description, bool value, ValueChanged<bool> onChanged) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(width: 32), // Indent for Advanced Options
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (description.isNotEmpty) ...[
                  SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(
                      color: subtitleColor,
                      fontSize: 12,
                      height: 1.3,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: context.primaryColor,
            inactiveThumbColor: subtitleColor,
            inactiveTrackColor: borderColor,
          ),
        ],
      ),
    );
  }

  Widget _buildAISummaryStatusRow(String label, String status, bool isEnabled) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: 12,
            ),
          ),
          Text(
            status,
            style: TextStyle(
              color: isEnabled ? const Color(0xFF00C853) : subtitleColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAISummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: textColor,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  */ // End of AI Features Tab comment

  Widget _buildPlatformCard(String title, String subtitle, IconData icon, Color color) {
    final isSelected = _selectedPlatform == title;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedPlatform = title),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.1) : surfaceColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? color : borderColor,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  color: subtitleColor,
                  fontSize: 11,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLocationCard(String title, String subtitle, IconData icon) {
    final isSelected = _selectedLocation == title;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedLocation = title),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected ? context.primaryColor.withValues(alpha: 0.1) : surfaceColor,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? context.primaryColor : borderColor,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? context.primaryColor : textColor, size: 24),
              SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  color: subtitleColor,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: subtitleColor, fontSize: 13),
        ),
        Text(
          value,
          style: TextStyle(color: textColor, fontSize: 13, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Future<void> _scheduleMeeting() async {

    // Validate title
    if (_titleController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('videocalls.enter_meeting_title'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }


    // Get workspace ID
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('videocalls.no_workspace_selected'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isCreatingMeeting = true;
    });


    try {
      // Create start and end DateTime
      final startDateTime = DateTime(
        _selectedDate.year,
        _selectedDate.month,
        _selectedDate.day,
        _selectedTime.hour,
        _selectedTime.minute,
      );

      // Parse duration to get end time
      Duration duration = const Duration(hours: 1); // Default
      if (_selectedDuration == '30 minutes') {
        duration = const Duration(minutes: 30);
      } else if (_selectedDuration == '1 hour') {
        duration = const Duration(hours: 1);
      } else if (_selectedDuration == '1.5 hours') {
        duration = const Duration(minutes: 90);
      } else if (_selectedDuration == '2 hours') {
        duration = const Duration(hours: 2);
      } else if (_selectedDuration == '3 hours') {
        duration = const Duration(hours: 3);
      }

      final endDateTime = startDateTime.add(duration);

      // Convert Quill delta to HTML for description
      final descriptionText = _descriptionController.document.toPlainText().trim();
      String? descriptionHtml;
      if (descriptionText.isNotEmpty) {
        final delta = _descriptionController.document.toDelta();
        final converter = QuillDeltaToHtmlConverter(
          delta.toJson(),
          ConverterOptions(),
        );
        descriptionHtml = converter.convert();
      }

      // Build API payload - INCLUDE participant_ids for attendee assignment
      final Map<String, dynamic> payload = {
        'title': _titleController.text,
        'description': descriptionHtml ?? '',
        'call_type': _selectedPlatform.toLowerCase(),
        'is_group_call': true,
        'max_participants': 50,
        'recording_enabled': false,
        'participant_ids': _selectedMemberIds.toList(), // ✅ Send selected attendees
      };

      // Only add scheduled times if NOT starting immediately
      // Backend detects instant calls by absence of scheduled_start_time
      if (!_startImmediately) {
        payload['scheduled_start_time'] = startDateTime.toUtc().toIso8601String();
        payload['scheduled_end_time'] = endDateTime.toUtc().toIso8601String();
      }


      // Call API - Backend will send FCM push and socket notifications
      final createdMeeting = await VideoCallService.instance.createMeeting(
        workspaceId,
        payload,
      );


      if (!mounted) return;

      setState(() {
        _isCreatingMeeting = false;
      });

      if (createdMeeting != null) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _startImmediately
                  ? 'videocalls.meeting_started_notification'.tr(args: [_selectedMemberIds.length.toString()])
                  : 'videocalls.meeting_scheduled_notification'.tr(args: [_selectedMemberIds.length.toString()]),
            ),
            backgroundColor: Colors.green,
          ),
        );

        // Mark as navigating to prevent double-taps
        _isNavigating = true;

        // If starting immediately, auto-join the call
        if (_startImmediately) {

          // Use Future.delayed to safely pop outside of build phase
          Future.delayed(Duration.zero, () {
            if (!mounted) return;

            // Pop schedule screen first (return null - video call already created)
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            }

            // Then navigate to video call screen (audio or video based on platform)
            Future.delayed(const Duration(milliseconds: 100), () {
              if (!mounted) return;

              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => VideoCallScreen(
                    callId: createdMeeting.id,
                    channelName: _titleController.text,
                    isIncoming: false,
                    participants: [],
                    isAudioOnly: _selectedPlatform.toLowerCase() == 'audio',
                  ),
                ),
              );
            });
          });
        } else {
          // For scheduled meetings, just close the screen
          // Return null because video call is already created and saved via VideoCallService

          // Use Future.delayed to safely pop outside of build phase
          Future.delayed(Duration.zero, () {
            if (!mounted) return;
            if (Navigator.canPop(context)) {
              Navigator.pop(context); // Return null - video call already created
            }
          });
        }
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _isCreatingMeeting = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('videocalls.failed_create_meeting'.tr(args: [e.toString()])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaceColor,
        border: Border(
          top: BorderSide(color: borderColor),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [context.primaryColor, Color(0xFF8B6BFF)],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: ElevatedButton.icon(
                onPressed: _isCreatingMeeting
                    ? null
                    : () {
                        _scheduleMeeting();
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                icon: _isCreatingMeeting
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Icon(
                        _startImmediately ? Icons.videocam : Icons.schedule,
                        color: Colors.white,
                        size: 18,
                      ),
                label: Text(
                  _isCreatingMeeting
                      ? (_startImmediately ? 'videocalls.starting'.tr() : 'videocalls.creating'.tr())
                      : (_startImmediately ? 'videocalls.start_meeting_now'.tr() : 'videocalls.schedule_meeting'.tr()),
                  style: TextStyle(color: Colors.white, fontSize: 14),
                ),
              ),
            ),
          ),
          SizedBox(width: 12),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: (_isCreatingMeeting || _isNavigating)
                  ? null
                  : () => _handleClose(),
              style: OutlinedButton.styleFrom(
                foregroundColor: textColor,
                side: BorderSide(
                  color: borderColor,
                ),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              icon: Icon(Icons.close, size: 18),
              label: Text(
                'common.cancel'.tr(),
                style: TextStyle(fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
