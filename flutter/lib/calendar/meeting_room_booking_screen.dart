import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../api/services/calendar_api_service.dart';
import '../services/workspace_service.dart';

class MeetingRoomBookingScreen extends StatefulWidget {
  const MeetingRoomBookingScreen({Key? key}) : super(key: key);

  @override
  State<MeetingRoomBookingScreen> createState() => _MeetingRoomBookingScreenState();
}

class _MeetingRoomBookingScreenState extends State<MeetingRoomBookingScreen> {
  final CalendarApiService _calendarApi = CalendarApiService();
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  List<MeetingRoom> _rooms = [];
  bool _isLoading = false;
  MeetingRoom? _selectedRoom;
  String _searchQuery = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMeetingRooms();
  }

  Future<void> _loadMeetingRooms() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace == null) {
        throw Exception('No workspace selected');
      }

      final response = await _calendarApi.getMeetingRooms(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _rooms = response.data!;
          _isLoading = false;
        });
      } else {
        throw Exception(response.message);
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load meeting rooms: $e';
        _isLoading = false;
        _rooms = [];
      });
    }
  }

  List<MeetingRoom> get _filteredRooms {
    if (_searchQuery.isEmpty) return _rooms;
    return _rooms.where((room) {
      return room.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
             room.location.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();
  }

  String _getEquipmentLabel(String key) {
    switch (key) {
      case 'projector':
        return 'calendar.equipment_projector'.tr();
      case 'whiteboard':
        return 'calendar.equipment_whiteboard'.tr();
      case 'video_conference':
        return 'calendar.equipment_video_conference'.tr();
      case 'audio_system':
        return 'calendar.equipment_audio_system'.tr();
      default:
        return key.replaceAll('_', ' ');
    }
  }

  String _getAmenityLabel(String key) {
    switch (key) {
      case 'coffee_machine':
        return 'calendar.amenity_coffee_machine'.tr();
      case 'water':
        return 'calendar.amenity_water'.tr();
      case 'snacks':
        return 'calendar.amenity_snacks'.tr();
      case 'air_conditioning':
        return 'calendar.amenity_air_conditioning'.tr();
      default:
        return key.replaceAll('_', ' ');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('calendar.meeting_rooms'.tr()),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        iconTheme: IconThemeData(color: Theme.of(context).textTheme.bodyLarge?.color),
        titleTextStyle: Theme.of(context).textTheme.headlineSmall,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: _showCreateMeetingRoomDialog,
            tooltip: 'calendar.create_meeting_room'.tr(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'calendar.error_loading_rooms'.tr(),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _loadMeetingRooms,
                        icon: const Icon(Icons.refresh),
                        label: Text('common.retry'.tr()),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    _buildRoomSearch(),
                    Expanded(child: _buildRoomsList()),
                  ],
                ),
    );
  }

  void _showCreateMeetingRoomDialog() {
    final TextEditingController nameController = TextEditingController();
    final TextEditingController numberController = TextEditingController();
    final TextEditingController capacityController = TextEditingController(text: '10');
    final TextEditingController locationController = TextEditingController();
    final TextEditingController descriptionController = TextEditingController();

    Set<String> selectedEquipment = {};
    Set<String> selectedAmenities = {};

    final Map<String, IconData> equipment = {
      'projector': Icons.videocam,
      'whiteboard': Icons.edit,
      'video_conference': Icons.video_call,
      'audio_system': Icons.speaker,
    };

    final Map<String, IconData> amenities = {
      'coffee_machine': Icons.coffee,
      'water': Icons.water_drop,
      'snacks': Icons.fastfood,
      'air_conditioning': Icons.ac_unit,
    };

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, dialogSetState) {
          return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'calendar.create_meeting_room'.tr(),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(context),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'calendar.configure_room_details'.tr(),
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),

                // Body
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Room Name and Number
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'calendar.room_name'.tr(),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: nameController,
                                    decoration: InputDecoration(
                                      hintText: 'calendar.room_name_hint'.tr(),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'calendar.room_number'.tr(),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: numberController,
                                    decoration: InputDecoration(
                                      hintText: 'calendar.room_number_hint'.tr(),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Capacity and Location
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'calendar.capacity'.tr(),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: capacityController,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      hintText: 'calendar.capacity_hint'.tr(),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'calendar.location'.tr(),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: locationController,
                                    decoration: InputDecoration(
                                      hintText: 'calendar.location_hint'.tr(),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Equipment
                        Text(
                          'calendar.equipment'.tr(),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: equipment.entries.map((entry) {
                            final isSelected = selectedEquipment.contains(entry.key);
                            return InkWell(
                              onTap: () {
                                dialogSetState(() {
                                  if (isSelected) {
                                    selectedEquipment.remove(entry.key);
                                  } else {
                                    selectedEquipment.add(entry.key);
                                  }
                                });
                              },
                              child: Container(
                                width: MediaQuery.of(context).size.width * 0.4,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: isSelected
                                        ? Colors.blue
                                        : Colors.grey.withOpacity(0.3),
                                    width: isSelected ? 2 : 1,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  color: isSelected
                                      ? Colors.blue.withOpacity(0.1)
                                      : null,
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      entry.value,
                                      size: 20,
                                      color: isSelected ? Colors.blue : Colors.grey[700],
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _getEquipmentLabel(entry.key),
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isSelected ? Colors.blue : Colors.grey[700],
                                          fontWeight: isSelected
                                              ? FontWeight.w600
                                              : FontWeight.normal,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),

                        // Amenities
                        Text(
                          'calendar.amenities'.tr(),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: amenities.entries.map((entry) {
                            final isSelected = selectedAmenities.contains(entry.key);
                            return InkWell(
                              onTap: () {
                                dialogSetState(() {
                                  if (isSelected) {
                                    selectedAmenities.remove(entry.key);
                                  } else {
                                    selectedAmenities.add(entry.key);
                                  }
                                });
                              },
                              child: Container(
                                width: MediaQuery.of(context).size.width * 0.4,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: isSelected
                                        ? Colors.green
                                        : Colors.grey.withOpacity(0.3),
                                    width: isSelected ? 2 : 1,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  color: isSelected
                                      ? Colors.green.withOpacity(0.1)
                                      : null,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      entry.value,
                                      size: 20,
                                      color: isSelected ? Colors.green : Colors.grey[600],
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _getAmenityLabel(entry.key),
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isSelected ? Colors.green : Colors.grey[700],
                                          fontWeight: isSelected
                                              ? FontWeight.w600
                                              : FontWeight.normal,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),

                        // Description
                        Text(
                          'calendar.description_optional'.tr(),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: descriptionController,
                          maxLines: 3,
                          decoration: InputDecoration(
                            hintText: 'calendar.room_description_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),

                // Footer
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(color: Colors.grey.withOpacity(0.3)),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text('common.cancel'.tr()),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: () async {
                          if (nameController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('calendar.enter_room_name'.tr()),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          if (numberController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('calendar.enter_room_number'.tr()),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          // Create meeting room via API
                          try {
                            final currentWorkspace = _workspaceService.currentWorkspace;
                            if (currentWorkspace == null) {
                              throw Exception('No workspace selected');
                            }

                            final dto = CreateMeetingRoomDto(
                              name: nameController.text.trim(),
                              description: descriptionController.text.trim().isEmpty
                                  ? null
                                  : descriptionController.text.trim(),
                              capacity: int.tryParse(capacityController.text) ?? 10,
                              location: locationController.text.trim().isEmpty
                                  ? 'Not specified'
                                  : locationController.text.trim(),
                              roomType: 'conference',
                              equipment: selectedEquipment.isEmpty
                                  ? null
                                  : selectedEquipment.toList(),
                              amenities: selectedAmenities.isEmpty
                                  ? null
                                  : selectedAmenities.toList(),
                              bookingPolicy: 'open',
                            );

                            final response = await _calendarApi.createMeetingRoom(
                              currentWorkspace.id,
                              dto,
                            );

                            if (response.isSuccess && response.data != null) {
                              // Add to local list
                              this.setState(() {
                                _rooms.add(response.data!);
                              });

                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.room_created'.tr(args: [response.data!.name])),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            } else {
                              throw Exception(response.message);
                            }
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('calendar.failed_create_room'.tr(args: ['$e'])),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 12,
                          ),
                        ),
                        child: Text('calendar.create_room'.tr()),
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

  Widget _buildRoomSearch() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: TextField(
        decoration: InputDecoration(
          hintText: 'calendar.search_rooms'.tr(),
          prefixIcon: const Icon(Icons.search),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.grey.withOpacity(0.3)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.grey.withOpacity(0.3)),
          ),
        ),
        onChanged: (value) {
          setState(() => _searchQuery = value);
        },
      ),
    );
  }

  Widget _buildRoomsList() {
    final filteredRooms = _filteredRooms;

    if (filteredRooms.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.meeting_room_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'calendar.no_meeting_rooms'.tr(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'calendar.create_room_hint'.tr(),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filteredRooms.length,
      itemBuilder: (context, index) {
        final room = filteredRooms[index];
        final isSelected = _selectedRoom?.id == room.id;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 2,
          child: InkWell(
            onTap: () {
              setState(() {
                _selectedRoom = room;
              });
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: isSelected
                    ? Border.all(color: Theme.of(context).primaryColor, width: 2)
                    : null,
                color: isSelected
                    ? Theme.of(context).primaryColor.withOpacity(0.05)
                    : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.meeting_room,
                        color: Theme.of(context).primaryColor,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              room.name,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Icon(
                                  Icons.location_on,
                                  size: 14,
                                  color: Colors.grey[600],
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    room.location,
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Colors.grey[600],
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                    maxLines: 1,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: Icon(Icons.edit, size: 20),
                            onPressed: () => _showEditMeetingRoomDialog(room),
                            tooltip: 'calendar.edit_room'.tr(),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: Icon(Icons.delete, size: 20, color: Colors.red),
                            onPressed: () => _showDeleteConfirmation(room),
                            tooltip: 'calendar.delete_room'.tr(),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: room.status == 'available'
                                  ? Colors.green.withOpacity(0.1)
                                  : Colors.orange.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: room.status == 'available'
                                    ? Colors.green
                                    : Colors.orange,
                                width: 1,
                              ),
                            ),
                            child: Text(
                              room.status.toUpperCase(),
                              style: TextStyle(
                                color: room.status == 'available'
                                    ? Colors.green[700]
                                    : Colors.orange[700],
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.blue.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.blue, width: 1),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.people,
                                  size: 16,
                                  color: Colors.blue[700],
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '${room.capacity}',
                                  style: TextStyle(
                                    color: Colors.blue[700],
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (room.description != null && room.description!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      room.description!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[700],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (room.equipment != null && room.equipment!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          Icons.devices,
                          size: 14,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'calendar.equipment_label'.tr(),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: room.equipment!.map((equipment) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.purple.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Colors.purple.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            equipment.replaceAll('_', ' '),
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.purple[700],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                  if (room.amenities != null && room.amenities!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          Icons.local_cafe,
                          size: 14,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'calendar.amenities_label'.tr(),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: room.amenities!.map((amenity) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Theme.of(context).primaryColor.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            amenity.replaceAll('_', ' '),
                            style: TextStyle(
                              fontSize: 11,
                              color: Theme.of(context).primaryColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showEditMeetingRoomDialog(MeetingRoom room) {
    final TextEditingController nameController = TextEditingController(text: room.name);
    final TextEditingController numberController = TextEditingController();
    final TextEditingController capacityController = TextEditingController(text: room.capacity.toString());
    final TextEditingController locationController = TextEditingController(text: room.location);
    final TextEditingController descriptionController = TextEditingController(text: room.description ?? '');

    Set<String> selectedEquipment = Set.from(room.equipment ?? []);
    Set<String> selectedAmenities = Set.from(room.amenities ?? []);

    final Map<String, IconData> equipment = {
      'projector': Icons.videocam,
      'whiteboard': Icons.edit,
      'video_conference': Icons.video_call,
      'audio_system': Icons.speaker,
    };

    final Map<String, IconData> amenities = {
      'coffee_machine': Icons.coffee,
      'water': Icons.water_drop,
      'snacks': Icons.fastfood,
      'air_conditioning': Icons.ac_unit,
    };

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, dialogSetState) {
          return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.9,
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.9,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'calendar.edit_meeting_room'.tr(),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(context),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'calendar.update_room_details'.tr(),
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),

                // Body
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Room Name
                        Text(
                          'calendar.room_name'.tr(),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: nameController,
                          decoration: InputDecoration(
                            hintText: 'calendar.room_name_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Location and Capacity
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'calendar.location'.tr(),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: locationController,
                                    decoration: InputDecoration(
                                      hintText: 'calendar.location_hint'.tr(),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'calendar.capacity'.tr(),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: capacityController,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      hintText: 'calendar.capacity_hint'.tr(),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Equipment
                        Text(
                          'calendar.equipment'.tr(),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: equipment.entries.map((entry) {
                            final isSelected = selectedEquipment.contains(entry.key);
                            return InkWell(
                              onTap: () {
                                dialogSetState(() {
                                  if (isSelected) {
                                    selectedEquipment.remove(entry.key);
                                  } else {
                                    selectedEquipment.add(entry.key);
                                  }
                                });
                              },
                              child: Container(
                                width: MediaQuery.of(context).size.width * 0.4,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: isSelected
                                        ? Colors.blue
                                        : Colors.grey.withOpacity(0.3),
                                    width: isSelected ? 2 : 1,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  color: isSelected
                                      ? Colors.blue.withOpacity(0.1)
                                      : null,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      entry.value,
                                      size: 20,
                                      color: isSelected ? Colors.blue : Colors.grey[700],
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _getEquipmentLabel(entry.key),
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isSelected ? Colors.blue : Colors.grey[700],
                                          fontWeight: isSelected
                                              ? FontWeight.w600
                                              : FontWeight.normal,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),

                        // Amenities
                        Text(
                          'calendar.amenities'.tr(),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: amenities.entries.map((entry) {
                            final isSelected = selectedAmenities.contains(entry.key);
                            return InkWell(
                              onTap: () {
                                dialogSetState(() {
                                  if (isSelected) {
                                    selectedAmenities.remove(entry.key);
                                  } else {
                                    selectedAmenities.add(entry.key);
                                  }
                                });
                              },
                              child: Container(
                                width: MediaQuery.of(context).size.width * 0.4,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: isSelected
                                        ? Colors.green
                                        : Colors.grey.withOpacity(0.3),
                                    width: isSelected ? 2 : 1,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  color: isSelected
                                      ? Colors.green.withOpacity(0.1)
                                      : null,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      entry.value,
                                      size: 20,
                                      color: isSelected ? Colors.green : Colors.grey[600],
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _getAmenityLabel(entry.key),
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isSelected ? Colors.green : Colors.grey[700],
                                          fontWeight: isSelected
                                              ? FontWeight.w600
                                              : FontWeight.normal,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),

                        // Description
                        Text(
                          'calendar.description_optional'.tr(),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: descriptionController,
                          maxLines: 3,
                          decoration: InputDecoration(
                            hintText: 'calendar.room_description_hint'.tr(),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),

                // Footer
                Container(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text('common.cancel'.tr()),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: () async {
                          if (nameController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('calendar.enter_room_name'.tr()),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          // Update meeting room via API
                          try {
                            final currentWorkspace = _workspaceService.currentWorkspace;
                            if (currentWorkspace == null) {
                              throw Exception('No workspace selected');
                            }

                            final updateData = {
                              'name': nameController.text.trim(),
                              if (descriptionController.text.trim().isNotEmpty)
                                'description': descriptionController.text.trim(),
                              'capacity': int.tryParse(capacityController.text) ?? 10,
                              if (locationController.text.trim().isNotEmpty)
                                'location': locationController.text.trim(),
                              if (selectedEquipment.isNotEmpty)
                                'equipment': selectedEquipment.toList(),
                              if (selectedAmenities.isNotEmpty)
                                'amenities': selectedAmenities.toList(),
                            };

                            final response = await _calendarApi.updateMeetingRoom(
                              currentWorkspace.id,
                              room.id,
                              updateData,
                            );

                            if (response.isSuccess && response.data != null) {
                              // Update local list
                              this.setState(() {
                                final index = _rooms.indexWhere((r) => r.id == room.id);
                                if (index != -1) {
                                  _rooms[index] = response.data!;
                                }
                              });

                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('calendar.room_updated'.tr(args: [response.data!.name])),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            } else {
                              throw Exception(response.message);
                            }
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('calendar.failed_update_room'.tr(args: ['$e'])),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 12,
                          ),
                        ),
                        child: Text('calendar.update_room'.tr()),
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

  void _showDeleteConfirmation(MeetingRoom room) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('calendar.delete_meeting_room'.tr()),
        content: Text(
          'calendar.delete_confirmation'.tr(args: [room.name]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);

              try {
                final currentWorkspace = _workspaceService.currentWorkspace;
                if (currentWorkspace == null) {
                  throw Exception('No workspace selected');
                }

                final response = await _calendarApi.deleteMeetingRoom(
                  currentWorkspace.id,
                  room.id,
                );

                if (response.isSuccess) {
                  setState(() {
                    _rooms.removeWhere((r) => r.id == room.id);
                  });

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('calendar.room_deleted'.tr(args: [room.name])),
                      backgroundColor: Colors.green,
                    ),
                  );
                } else {
                  throw Exception(response.message);
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('calendar.failed_delete_room'.tr(args: ['$e'])),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );
  }

}