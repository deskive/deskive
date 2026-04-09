import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import '../api/services/calendar_api_service.dart';
import '../services/workspace_service.dart';
import '../widgets/google_drive_file_picker.dart';

// Conditionally import dart:io only on non-web platforms
import 'dart:io' if (dart.library.html) 'package:deskive/utils/web_file_stub.dart';

class CalendarImportModal extends StatefulWidget {
  final VoidCallback? onImportComplete;

  const CalendarImportModal({
    super.key,
    this.onImportComplete,
  });

  @override
  State<CalendarImportModal> createState() => _CalendarImportModalState();
}

class _CalendarImportModalState extends State<CalendarImportModal> {
  final CalendarApiService _calendarApi = CalendarApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  bool _isLoading = false;
  bool _isImporting = false;
  String? _error;
  List<_ParsedEvent> _parsedEvents = [];
  String? _selectedFilePath;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              _buildHeader(context),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _parsedEvents.isEmpty
                        ? _buildImportOptions(context)
                        : _buildEventPreview(context, scrollController),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 8),
          Text(
            'calendar_import.title'.tr(),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const Spacer(),
          if (_parsedEvents.isNotEmpty && !_isImporting)
            ElevatedButton(
              onPressed: _importEvents,
              child: Text('calendar_import.import_button'.tr()),
            ),
        ],
      ),
    );
  }

  Widget _buildImportOptions(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
          Icon(
            Icons.calendar_month,
            size: 80,
            color: Theme.of(context).primaryColor.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 24),
          Text(
            'calendar_import.select_file_title'.tr(),
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'calendar_import.select_file_subtitle'.tr(),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _pickICSFile,
              icon: const Icon(Icons.file_upload_outlined),
              label: Text('calendar_import.pick_ics_file'.tr()),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _pickFromGoogleDrive,
              icon: const Icon(Icons.cloud),
              label: Text('calendar_import.from_google_drive'.tr()),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'calendar_import.supported_formats'.tr(),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[500],
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventPreview(BuildContext context, ScrollController scrollController) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_selectedFilePath != null)
                Row(
                  children: [
                    const Icon(Icons.insert_drive_file, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _selectedFilePath!.split('/').last,
                        style: Theme.of(context).textTheme.bodySmall,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _parsedEvents = [];
                          _selectedFilePath = null;
                        });
                      },
                      child: Text('calendar_import.change_file'.tr()),
                    ),
                  ],
                ),
              const SizedBox(height: 8),
              Text(
                'calendar_import.events_found'.tr(args: ['${_parsedEvents.length}']),
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
        ),
        if (_isImporting) ...[
          const LinearProgressIndicator(),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'calendar_import.importing'.tr(),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
        Expanded(
          child: ListView.builder(
            controller: scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _parsedEvents.length,
            itemBuilder: (context, index) {
              final event = _parsedEvents[index];
              return _buildEventCard(context, event);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildEventCard(BuildContext context, _ParsedEvent event) {
    final dateFormat = DateFormat('MMM dd, yyyy');
    final timeFormat = DateFormat('HH:mm');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              event.title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.access_time, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  event.allDay
                      ? '${dateFormat.format(event.startTime)} (All day)'
                      : '${dateFormat.format(event.startTime)} ${timeFormat.format(event.startTime)} - ${timeFormat.format(event.endTime)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            if (event.location != null && event.location!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      event.location!,
                      style: Theme.of(context).textTheme.bodySmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
            if (event.description != null && event.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                event.description!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _pickICSFile() async {
    debugPrint('=== ICS File Picker Started (v2) ===');
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Use withData: true to force loading file content into memory
      // This avoids some platform-specific file access issues
      debugPrint('Calling FilePicker.platform.pickFiles...');
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: false,
        withData: true, // Force load file bytes
      );

      debugPrint('FilePicker result: ${result != null ? "got result" : "null"}');

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final fileName = file.name.toLowerCase();
        debugPrint('Selected file: ${file.name}, bytes: ${file.bytes?.length ?? "null"}, path: ${file.path ?? "null"}');

        // Validate file extension manually
        if (!fileName.endsWith('.ics') &&
            !fileName.endsWith('.ical') &&
            !fileName.endsWith('.ifb') &&
            !fileName.endsWith('.icalendar')) {
          debugPrint('Invalid file extension: $fileName');
          setState(() {
            _error = 'calendar_import.invalid_ics_file'.tr();
            _isLoading = false;
          });
          return;
        }

        // Try to get content directly from bytes (withData: true should provide this)
        if (file.bytes != null && file.bytes!.isNotEmpty) {
          debugPrint('Reading ICS from bytes, size: ${file.bytes!.length}');
          // Print first 100 bytes for debugging
          final preview = file.bytes!.take(100).toList();
          debugPrint('First 100 bytes: $preview');

          String content;
          try {
            content = utf8.decode(file.bytes!, allowMalformed: true);
            debugPrint('UTF-8 decode successful, content length: ${content.length}');
            debugPrint('Content preview: ${content.substring(0, content.length > 200 ? 200 : content.length)}');
          } catch (e, st) {
            debugPrint('UTF-8 decode error: $e');
            debugPrint('UTF-8 stack trace: $st');
            // Fallback: try direct char conversion
            content = String.fromCharCodes(file.bytes!);
            debugPrint('Fallback decode successful');
          }

          setState(() {
            _selectedFilePath = file.name;
          });
          _processICSContent(content);
        } else if (!kIsWeb && file.path != null) {
          // File path reading only works on mobile/desktop, NOT on web
          debugPrint('No bytes available, reading from path: ${file.path}');
          setState(() {
            _selectedFilePath = file.path;
          });
          await _parseICSFile(file.path!);
        } else {
          debugPrint('ERROR: No bytes available (web: $kIsWeb, path: ${file.path})');
          setState(() {
            _error = kIsWeb
                ? 'calendar_import.error_picking_file'.tr(args: ['File content not available on web. Please try again.'])
                : 'calendar_import.error_picking_file'.tr(args: ['No file content available']);
            _isLoading = false;
          });
        }
      } else {
        debugPrint('User cancelled file picker');
      }
    } catch (e, stackTrace) {
      debugPrint('=== FILE PICKER ERROR ===');
      debugPrint('Error type: ${e.runtimeType}');
      debugPrint('Error message: $e');
      debugPrint('Stack trace: $stackTrace');
      debugPrint('=========================');
      setState(() {
        _error = 'calendar_import.error_picking_file'.tr(args: ['$e']);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
    debugPrint('=== ICS File Picker Completed ===');
  }

  void _processICSContent(String content) {
    debugPrint('=== Processing ICS Content ===');
    debugPrint('Content length: ${content.length}');

    // Check if content looks like ICS format
    final hasVCalendar = content.contains('BEGIN:VCALENDAR');
    final hasVEvent = content.contains('BEGIN:VEVENT');
    debugPrint('Has VCALENDAR: $hasVCalendar, Has VEVENT: $hasVEvent');

    if (!hasVCalendar && !hasVEvent) {
      debugPrint('Invalid ICS: No VCALENDAR or VEVENT found');
      debugPrint('Content sample: ${content.substring(0, content.length > 500 ? 500 : content.length)}');
      setState(() {
        _error = 'calendar_import.invalid_ics_file'.tr();
      });
      return;
    }

    try {
      debugPrint('Starting ICS parsing...');
      final events = _parseICSContent(content);
      debugPrint('Parsing complete. Found ${events.length} events');

      if (events.isEmpty) {
        debugPrint('No events found in parsed content');
        setState(() {
          _error = 'calendar_import.no_events_found'.tr();
        });
      } else {
        debugPrint('Successfully parsed ${events.length} events');
        for (var i = 0; i < events.length && i < 3; i++) {
          debugPrint('Event $i: ${events[i].title}');
        }
        setState(() {
          _parsedEvents = events;
        });
      }
    } catch (e, stackTrace) {
      debugPrint('=== ICS PARSING ERROR ===');
      debugPrint('Error type: ${e.runtimeType}');
      debugPrint('Error message: $e');
      debugPrint('Stack trace: $stackTrace');
      debugPrint('=========================');
      setState(() {
        _error = 'calendar_import.error_parsing_file'.tr(args: ['$e']);
      });
    }
    debugPrint('=== ICS Processing Complete ===');
  }

  Future<void> _pickFromGoogleDrive() async {
    // Google Drive file picker with local file download doesn't work on web
    if (kIsWeb) {
      debugPrint('Google Drive import not supported on web');
      setState(() {
        _error = 'calendar_import.google_drive_error'.tr(args: ['Google Drive import is not supported on web. Please use the mobile app.']);
      });
      return;
    }

    try {
      final result = await GoogleDriveFilePicker.show(
        context: context,
        allowedExtensions: ['ics', 'ical', 'ifb', 'icalendar'],
        title: 'calendar_import.select_ics_from_drive'.tr(),
      );

      if (result != null && result.localFile != null) {
        setState(() {
          _isLoading = true;
          _error = null;
          _selectedFilePath = result.file.name;
        });

        try {
          // Read file as bytes first to handle encoding issues
          debugPrint('Reading Drive file: ${result.file.name}');
          final bytes = await result.localFile!.readAsBytes();
          debugPrint('Read ${bytes.length} bytes from Drive file');

          // Decode using UTF-8 with malformed character handling
          String content;
          try {
            content = utf8.decode(bytes, allowMalformed: true);
            debugPrint('UTF-8 decode successful');
          } catch (e) {
            debugPrint('UTF-8 decode failed: $e, trying Latin-1');
            content = latin1.decode(bytes);
          }

          // Process the content
          _processICSContent(content);
        } catch (parseError, stackTrace) {
          debugPrint('ICS parsing error from Drive: $parseError');
          debugPrint('Stack trace: $stackTrace');
          setState(() {
            _error = 'calendar_import.error_parsing_file'.tr(args: ['$parseError']);
          });
        } finally {
          if (mounted) {
            setState(() {
              _isLoading = false;
            });
          }
        }
      }
    } catch (e, stackTrace) {
      debugPrint('Google Drive file picker error: $e');
      debugPrint('Stack trace: $stackTrace');
      if (mounted) {
        setState(() {
          _error = 'calendar_import.google_drive_error'.tr(args: ['$e']);
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _parseICSFile(String filePath) async {
    // File operations don't work on web - should use bytes instead
    if (kIsWeb) {
      debugPrint('ERROR: _parseICSFile called on web platform');
      setState(() {
        _error = 'calendar_import.error_parsing_file'.tr(args: ['File reading not supported on web']);
      });
      return;
    }

    try {
      final file = File(filePath);

      if (!await file.exists()) {
        setState(() {
          _error = 'calendar_import.error_parsing_file'.tr(args: ['File not found']);
        });
        return;
      }

      // Read file as bytes first
      debugPrint('Reading file from path: $filePath');
      final bytes = await file.readAsBytes();
      debugPrint('Read ${bytes.length} bytes');

      // Decode using UTF-8 with malformed character handling
      String content;
      try {
        content = utf8.decode(bytes, allowMalformed: true);
        debugPrint('UTF-8 decode successful, content length: ${content.length}');
      } catch (e) {
        debugPrint('UTF-8 decode failed: $e, trying Latin-1');
        // Fallback to Latin-1 encoding
        content = latin1.decode(bytes);
      }

      // Process the content
      _processICSContent(content);
    } catch (e, stackTrace) {
      debugPrint('ICS file parsing error: $e');
      debugPrint('Stack trace: $stackTrace');
      setState(() {
        _error = 'calendar_import.error_parsing_file'.tr(args: ['$e']);
      });
    }
  }

  List<_ParsedEvent> _parseICSContent(String content) {
    final events = <_ParsedEvent>[];
    final lines = content.replaceAll('\r\n ', '').replaceAll('\r\n\t', '').split(RegExp(r'\r?\n'));

    bool inEvent = false;
    String? currentTitle;
    String? currentDescription;
    String? currentLocation;
    DateTime? currentStart;
    DateTime? currentEnd;
    bool currentAllDay = false;

    for (var line in lines) {
      line = line.trim();

      if (line == 'BEGIN:VEVENT') {
        inEvent = true;
        currentTitle = null;
        currentDescription = null;
        currentLocation = null;
        currentStart = null;
        currentEnd = null;
        currentAllDay = false;
      } else if (line == 'END:VEVENT') {
        if (inEvent && currentTitle != null && currentStart != null) {
          // Calculate proper end time
          DateTime endTime;
          if (currentEnd == null || currentEnd.isBefore(currentStart) || currentEnd.isAtSameMomentAs(currentStart)) {
            // If no end time, or end time is before/equal to start time, add default duration
            if (currentAllDay) {
              endTime = currentStart.add(const Duration(days: 1));
            } else {
              endTime = currentStart.add(const Duration(hours: 1));
            }
            debugPrint('Adjusted end time from $currentEnd to $endTime (start: $currentStart)');
          } else {
            endTime = currentEnd;
          }

          events.add(_ParsedEvent(
            title: currentTitle,
            description: currentDescription,
            location: currentLocation,
            startTime: currentStart,
            endTime: endTime,
            allDay: currentAllDay,
          ));
        }
        inEvent = false;
      } else if (inEvent) {
        if (line.startsWith('SUMMARY:')) {
          currentTitle = _unescapeICSValue(line.substring(8));
        } else if (line.startsWith('DESCRIPTION:')) {
          currentDescription = _unescapeICSValue(line.substring(12));
        } else if (line.startsWith('LOCATION:')) {
          currentLocation = _unescapeICSValue(line.substring(9));
        } else if (line.startsWith('DTSTART')) {
          final parsed = _parseICSDateTime(line);
          if (parsed != null) {
            currentStart = parsed.dateTime;
            currentAllDay = parsed.isDate;
          }
        } else if (line.startsWith('DTEND')) {
          final parsed = _parseICSDateTime(line);
          if (parsed != null) {
            currentEnd = parsed.dateTime;
          }
        }
      }
    }

    return events;
  }

  String _unescapeICSValue(String value) {
    return value
        .replaceAll('\\n', '\n')
        .replaceAll('\\,', ',')
        .replaceAll('\\;', ';')
        .replaceAll('\\\\', '\\');
  }

  _ICSDateTimeResult? _parseICSDateTime(String line) {
    // Handle different formats:
    // DTSTART:20231225T100000Z
    // DTSTART;VALUE=DATE:20231225
    // DTSTART;TZID=America/New_York:20231225T100000

    final colonIndex = line.lastIndexOf(':');
    if (colonIndex == -1) return null;

    final value = line.substring(colonIndex + 1).trim();
    final params = line.substring(0, colonIndex);

    bool isDate = params.contains('VALUE=DATE') && !params.contains('VALUE=DATE-TIME');

    try {
      if (isDate) {
        // DATE format: YYYYMMDD
        if (value.length >= 8) {
          final year = int.parse(value.substring(0, 4));
          final month = int.parse(value.substring(4, 6));
          final day = int.parse(value.substring(6, 8));
          return _ICSDateTimeResult(DateTime(year, month, day), true);
        }
      } else {
        // DATE-TIME format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
        if (value.length >= 15) {
          final year = int.parse(value.substring(0, 4));
          final month = int.parse(value.substring(4, 6));
          final day = int.parse(value.substring(6, 8));
          final hour = int.parse(value.substring(9, 11));
          final minute = int.parse(value.substring(11, 13));
          final second = int.parse(value.substring(13, 15));

          DateTime dt = DateTime(year, month, day, hour, minute, second);

          // If ends with Z, it's UTC
          if (value.endsWith('Z')) {
            dt = DateTime.utc(year, month, day, hour, minute, second);
          }

          return _ICSDateTimeResult(dt, false);
        }
      }
    } catch (e) {
      debugPrint('Error parsing ICS date: $value - $e');
    }

    return null;
  }

  Future<void> _importEvents() async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) {
      setState(() {
        _error = 'calendar_import.no_workspace'.tr();
      });
      return;
    }

    setState(() {
      _isImporting = true;
      _error = null;
    });

    int successCount = 0;
    int failCount = 0;
    String? lastErrorMessage;

    for (final event in _parsedEvents) {
      try {
        debugPrint('=== Importing event: ${event.title} ===');
        debugPrint('Start: ${event.startTime.toIso8601String()}');
        debugPrint('End: ${event.endTime.toIso8601String()}');
        debugPrint('AllDay: ${event.allDay}');

        final dto = CreateEventDto(
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          allDay: event.allDay,
        );

        debugPrint('DTO JSON: ${dto.toJson()}');

        final response = await _calendarApi.createEvent(
          currentWorkspace.id,
          dto,
        );

        debugPrint('Response success: ${response.isSuccess}, message: ${response.message}, statusCode: ${response.statusCode}');

        if (response.isSuccess) {
          successCount++;
          debugPrint('Event imported successfully');
        } else {
          failCount++;
          lastErrorMessage = response.message;
          debugPrint('Failed to import event: ${response.message}');
        }
      } catch (e, stackTrace) {
        failCount++;
        lastErrorMessage = e.toString();
        debugPrint('Exception importing event ${event.title}: $e');
        debugPrint('Stack trace: $stackTrace');
      }
    }

    setState(() {
      _isImporting = false;
    });

    if (mounted) {
      Navigator.pop(context);

      widget.onImportComplete?.call();

      String message;
      if (failCount == 0) {
        message = 'calendar_import.success'.tr(args: ['$successCount']);
      } else if (successCount > 0) {
        message = 'calendar_import.partial_success'.tr(args: ['$successCount', '$failCount']);
        if (lastErrorMessage != null) {
          message += '\n$lastErrorMessage';
        }
      } else {
        // All failed
        message = 'calendar_import.error_importing'.tr(args: [lastErrorMessage ?? 'Unknown error']);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          duration: failCount > 0 ? const Duration(seconds: 5) : const Duration(seconds: 3),
        ),
      );
    }
  }
}

class _ParsedEvent {
  final String title;
  final String? description;
  final String? location;
  final DateTime startTime;
  final DateTime endTime;
  final bool allDay;

  _ParsedEvent({
    required this.title,
    this.description,
    this.location,
    required this.startTime,
    required this.endTime,
    this.allDay = false,
  });
}

class _ICSDateTimeResult {
  final DateTime dateTime;
  final bool isDate;

  _ICSDateTimeResult(this.dateTime, this.isDate);
}
