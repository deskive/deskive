import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Users,
  Monitor,
  Wifi,
  Coffee,
  Settings,
  Check
} from 'lucide-react';
import { useIntl } from 'react-intl';

// Components
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

// Hooks
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useMeetingRooms, useCreateMeetingRoom, useUpdateMeetingRoom, useDeleteMeetingRoom } from '../../lib/api/calendar-api';

// Types
interface RoomForm {
  name: string;
  roomNumber: string;
  capacity: number;
  location: string;
  facilities: string[];
  color: string;
  description?: string;
  room_type: 'conference' | 'meeting' | 'huddle' | 'training' | 'presentation' | 'phone_booth';
}

const ROOM_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

const FACILITY_OPTIONS_CONFIG = [
  { value: 'projector', icon: Monitor },
  { value: 'whiteboard', icon: Edit2 },
  { value: 'video_conferencing', icon: Monitor },
  { value: 'wifi', icon: Wifi },
  { value: 'coffee', icon: Coffee },
  { value: 'air_conditioning', icon: Settings },
];

const ROOM_TYPES_CONFIG = [
  'conference',
  'meeting',
  'huddle',
  'training',
  'presentation',
  'phone_booth',
] as const;

interface CalendarSettingsProps {
  onClose?: () => void;
  openRoomDialog?: boolean;
}

export function CalendarSettings({ onClose, openRoomDialog = false }: CalendarSettingsProps) {
  const intl = useIntl();
  const { currentWorkspace } = useWorkspace();

  // Meeting rooms hooks
  const { data: meetingRooms = [], isLoading: roomsLoading } = useMeetingRooms(currentWorkspace?.id);
  const createRoomMutation = useCreateMeetingRoom();
  const updateRoomMutation = useUpdateMeetingRoom();
  const deleteRoomMutation = useDeleteMeetingRoom();

  // State
  const [showRoomDialog, setShowRoomDialog] = useState(openRoomDialog);
  const [editingRoom, setEditingRoom] = useState<any>(null);

  // Form state
  const [roomForm, setRoomForm] = useState<RoomForm>({
    name: '',
    roomNumber: '',
    capacity: 10,
    location: '',
    facilities: [],
    color: '#3b82f6',
    description: '',
    room_type: 'meeting'
  });

  // Localized facility options
  const FACILITY_OPTIONS = FACILITY_OPTIONS_CONFIG.map(facility => ({
    ...facility,
    label: intl.formatMessage({ id: `modules.calendar.calendarSettings.facilities.${facility.value}` })
  }));

  // Localized room types
  const ROOM_TYPES = ROOM_TYPES_CONFIG.map(type => ({
    value: type,
    label: intl.formatMessage({ id: `modules.calendar.calendarSettings.roomTypes.${type}.label` }),
    description: intl.formatMessage({ id: `modules.calendar.calendarSettings.roomTypes.${type}.description` })
  }));

  // Handlers
  const handleSaveRoom = () => {
    if (!roomForm.name.trim() || !roomForm.roomNumber.trim() || !roomForm.room_type) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.calendarSettings.errors.requiredFields' }));
      return;
    }

    if (!currentWorkspace) return;

    const roomData = {
      name: roomForm.name,
      description: roomForm.description,
      capacity: roomForm.capacity,
      location: roomForm.location,
      equipment: roomForm.facilities,
      room_type: roomForm.room_type
    };

    if (editingRoom) {
      updateRoomMutation.mutate({
        workspaceId: currentWorkspace.id,
        roomId: editingRoom.id,
        data: roomData
      }, {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'modules.calendar.calendarSettings.messages.roomUpdated' }));
          setShowRoomDialog(false);
          setEditingRoom(null);
          resetForm();
        },
        onError: () => {
          toast.error(intl.formatMessage({ id: 'modules.calendar.calendarSettings.errors.updateFailed' }));
        }
      });
    } else {
      createRoomMutation.mutate({
        workspaceId: currentWorkspace.id,
        data: roomData
      }, {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'modules.calendar.calendarSettings.messages.roomCreated' }));
          setShowRoomDialog(false);
          resetForm();
        },
        onError: () => {
          toast.error(intl.formatMessage({ id: 'modules.calendar.calendarSettings.errors.createFailed' }));
        }
      });
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!currentWorkspace) return;

    if (confirm(intl.formatMessage({ id: 'modules.calendar.calendarSettings.confirmDelete' }))) {
      deleteRoomMutation.mutate({
        workspaceId: currentWorkspace.id,
        roomId
      }, {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'modules.calendar.calendarSettings.messages.roomDeleted' }));
        },
        onError: () => {
          toast.error(intl.formatMessage({ id: 'modules.calendar.calendarSettings.errors.deleteFailed' }));
        }
      });
    }
  };

  const toggleFacility = (facility: string) => {
    setRoomForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
  };

  const resetForm = () => {
    setRoomForm({
      name: '',
      roomNumber: '',
      capacity: 10,
      location: '',
      facilities: [],
      color: '#3b82f6',
      description: '',
      room_type: 'meeting'
    });
  };

  const openEditDialog = (room: any) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      roomNumber: room.room_code || '',
      capacity: room.capacity,
      location: room.location,
      facilities: room.equipment || [],
      color: room.color || '#3b82f6',
      description: room.description || '',
      room_type: room.room_type || 'meeting'
    });
    setShowRoomDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Meeting Rooms Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {intl.formatMessage({ id: 'modules.calendar.calendarSettings.title' })}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'modules.calendar.calendarSettings.description' })}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingRoom(null);
              resetForm();
              setShowRoomDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'modules.calendar.calendarSettings.addRoom' })}
          </Button>
        </div>

        {roomsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {intl.formatMessage({ id: 'modules.calendar.calendarSettings.loading' })}
          </div>
        ) : meetingRooms.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">
              {intl.formatMessage({ id: 'modules.calendar.calendarSettings.noRooms' })}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {intl.formatMessage({ id: 'modules.calendar.calendarSettings.noRoomsDescription' })}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingRoom(null);
                resetForm();
                setShowRoomDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.calendarSettings.createRoom' })}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {meetingRooms.map((room: any) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: room.color || '#3b82f6' }}
                  />
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {room.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {intl.formatMessage({ id: 'modules.calendar.calendarSettings.capacityLabel' }, { capacity: room.capacity })}
                      </span>
                    </div>
                    {room.facilities && room.facilities.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {room.facilities.map((facility: string) => {
                          const facilityOption = FACILITY_OPTIONS.find(f => f.value === facility);
                          return facilityOption ? (
                            <Badge key={facility} variant="secondary" className="text-xs">
                              <facilityOption.icon className="h-3 w-3 mr-1" />
                              {facilityOption.label}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(room)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRoom(room.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Room Dialog */}
      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingRoom
                ? intl.formatMessage({ id: 'modules.calendar.calendarSettings.dialog.editTitle' })
                : intl.formatMessage({ id: 'modules.calendar.calendarSettings.dialog.createTitle' })
              }
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: 'modules.calendar.calendarSettings.dialog.description' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2 pl-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">
                  {intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.roomName' })}
                </Label>
                <Input
                  id="roomName"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.roomNamePlaceholder' })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomNumber">
                  {intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.roomNumber' })}
                </Label>
                <Input
                  id="roomNumber"
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.roomNumberPlaceholder' })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">
                  {intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.capacity' })}
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">
                  {intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.location' })}
                </Label>
                <Input
                  id="location"
                  value={roomForm.location}
                  onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.locationPlaceholder' })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomType">
                {intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.roomType' })}
              </Label>
              <Select
                value={roomForm.room_type}
                onValueChange={(value: 'conference' | 'meeting' | 'huddle' | 'training' | 'presentation' | 'phone_booth') =>
                  setRoomForm({ ...roomForm, room_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.selectRoomType' })} />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.facilities' })}</Label>
              <div className="grid grid-cols-2 gap-3">
                {FACILITY_OPTIONS.map((facility) => {
                  const Icon = facility.icon;
                  const isSelected = roomForm.facilities.includes(facility.value);
                  return (
                    <button
                      key={facility.value}
                      type="button"
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => toggleFacility(facility.value)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{facility.label}</span>
                      {isSelected && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.roomColor' })}</Label>
              <div className="flex gap-2">
                {ROOM_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      roomForm.color === color ? 'border-gray-900' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setRoomForm({ ...roomForm, color })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <Label htmlFor="roomDescription">
                {intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.description' })}
              </Label>
              <Textarea
                id="roomDescription"
                value={roomForm.description}
                onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                placeholder={intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.descriptionPlaceholder' })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowRoomDialog(false)}>
              {intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.cancel' })}
            </Button>
            <Button onClick={handleSaveRoom}>
              {editingRoom
                ? intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.saveChanges' })
                : intl.formatMessage({ id: 'modules.calendar.calendarSettings.form.createRoom' })
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}