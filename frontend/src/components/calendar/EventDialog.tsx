import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, addMinutes } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useIntl } from 'react-intl'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateEvent, useUpdateEvent, useDeleteEvent, useEventCategories, useMeetingRooms, calendarKeys, calendarApi } from '@/lib/api/calendar-api'
import { useActiveNotes, notesApi } from '@/lib/api/notes-api'
import { useGenerateDescriptionSuggestions } from '@/lib/api/ai-api'
import { storageApi } from '@/lib/api/storage-api'
import { fileApi } from '@/lib/api/files-api'
import { api } from '@/lib/fetch'
import { useQueryClient } from '@tanstack/react-query'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useBots } from '@/lib/api/bots-api'
import { useAssignBotToEvent } from '@/lib/api/event-bot-assignments-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FilePreviewDialog } from '@/components/files/FileOperationDialogs'
import { EventPreviewDialog } from './EventPreviewDialog'
import { EventBotAssignment } from './EventBotAssignment'
import type { CalendarEventAPI } from '@/types/calendar'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CalendarEvent, Reminder, RecurrenceRule, NotificationType, RecurrencePattern, CreateEventRequest, UpdateEventRequest } from '../../types/calendar'
import { Bell, Trash2, Sparkles, Loader2, Building, FileText, Upload, Plus, X, File, Image, Video, Music, FileType, Eye, FolderOpen, Calendar, HardDrive } from 'lucide-react'
import { ChatDrivePickerModal } from '@/components/chat/ChatDrivePickerModal'
import { googleDriveApi } from '@/lib/api/google-drive-api'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

// Schema will use dynamic validation message from intl in the component
const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isAllDay: z.boolean(),
  categoryId: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'urgent'] as const),
  location: z.string().optional(),
  roomId: z.string().optional(),
  meetingUrl: z.string().optional(),
  isPrivate: z.boolean(),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventDialogProps {
  open: boolean
  onClose: () => void
  event?: CalendarEvent | null
  defaultDate?: Date | null
  defaultHour?: number | null
}

// Meeting rooms will be fetched from API

// Common event titles
const getCommonEventTitles = (): string[] => {
  return [
    // Meetings
    'Team Meeting', 'Daily Standup', 'Weekly Sync', 'Project Meeting', 'Client Meeting',
    'Status Update', 'Planning Meeting', 'Strategy Session', 'All Hands Meeting',
    // Reviews & Feedback
    'Sprint Review', 'Code Review', 'Design Review', 'Performance Review',
    'Retrospective', 'Feedback Session', 'Demo Day',
    // 1:1s & Personal
    '1:1 Meeting', 'One-on-One', 'Check-in', 'Mentoring Session', 'Career Discussion',
    // Training & Development
    'Training Session', 'Workshop', 'Learning Session', 'Knowledge Share',
    'Tech Talk', 'Brown Bag Session', 'Lunch & Learn',
    // Interviews & Hiring
    'Interview', 'Technical Interview', 'Candidate Interview', 'Phone Screen',
    'Final Interview', 'Panel Interview',
    // Project Work
    'Planning Session', 'Brainstorming', 'Requirements Review', 'Architecture Review',
    'Sprint Planning', 'Backlog Grooming', 'Release Planning',
    // Social & Breaks
    'Coffee Chat', 'Team Lunch', 'Happy Hour', 'Team Building',
    'Birthday Celebration', 'Office Hours',
    // Focus Time
    'Focus Time', 'Deep Work', 'Coding Time', 'Writing Time', 'Research Time',
    'Admin Time', 'Email Time',
    // External
    'Conference Call', 'Vendor Meeting', 'Webinar', 'External Meeting',
    'Customer Call', 'Support Call'
  ]
}

export function EventDialog({ open, onClose, event, defaultDate, defaultHour }: EventDialogProps) {
  const intl = useIntl()
  const navigate = useNavigate()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined)
  const [attendees, setAttendees] = useState<string[]>([])
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([])
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)
  const [showAttendeeDropdown, setShowAttendeeDropdown] = useState(false)
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(-1)
  const [attachedNotes, setAttachedNotes] = useState<Array<{id: string, title: string, attachedAt?: string, attachedBy?: string}>>([])
  const [loadingAttachedNotes, setLoadingAttachedNotes] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<Array<{id: string, name: string, size: number, type: string, url?: string, uploadedAt?: string}>>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [showFileSelector, setShowFileSelector] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [descriptionAttachments, setDescriptionAttachments] = useState<Array<{ id: string; title: string; type: 'notes' | 'events' | 'files' | 'drive'; driveFileUrl?: string; driveThumbnailUrl?: string; driveMimeType?: string; driveFileSize?: number }>>([])

  // Google Drive picker state
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const [isDriveConnected, setIsDriveConnected] = useState(false)

  // State for attachment preview dialogs
  const [filePreviewOpen, setFilePreviewOpen] = useState(false)
  const [filePreviewData, setFilePreviewData] = useState<any>(null)
  const [filePreviewLoading, setFilePreviewLoading] = useState(false)
  const [eventPreviewOpen, setEventPreviewOpen] = useState(false)
  const [eventPreviewData, setEventPreviewData] = useState<CalendarEventAPI | null>(null)
  const [eventPreviewLoading, setEventPreviewLoading] = useState(false)

  // Bot assignment state
  const [selectedBotId, setSelectedBotId] = useState<string>('')

  // Helper function to get icon for attachment type
  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'notes':
        return <FileText className="h-4 w-4" />
      case 'events':
        return <Calendar className="h-4 w-4" />
      case 'files':
        return <FolderOpen className="h-4 w-4" />
      case 'drive':
        return <HardDrive className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const isEdit = !!event

  const { currentWorkspace } = useWorkspace()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: categories = [] } = useEventCategories(currentWorkspace?.id || '')
  const { data: availableNotes = [] } = useActiveNotes(currentWorkspace?.id || '')

  // Check if current user is the organizer
  const isOrganizer = event?.organizerId === user?.id || event?.userId === user?.id

  // Form should be read-only if editing and not the organizer
  const isFormReadOnly = isEdit && !isOrganizer
  
  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent()
  const deleteEventMutation = useDeleteEvent()
  const descriptionMutation = useGenerateDescriptionSuggestions()
  
  // Fetch real meeting rooms data
  const { data: meetingRooms = [] } = useMeetingRooms(currentWorkspace?.id)

  // Fetch workspace members for attendees dropdown
  const { data: workspaceMembers = [] } = useWorkspaceMembers(currentWorkspace?.id || '')

  // Fetch bots for bot assignment
  const { data: bots } = useBots(currentWorkspace?.id || '')
  const assignBotMutation = useAssignBotToEvent()

  // Filter to only show activated prebuilt bots
  const availableBots = bots?.filter(
    (bot) => bot.botType === 'prebuilt' && bot.status === 'active'
  ) || []

  // Mock workspace files - TODO: Replace with real file API
  const workspaceFiles = [
    { id: 'file1', name: 'Project Plan.pdf', size: '1024000', mime_type: 'application/pdf' },
    { id: 'file2', name: 'Meeting Notes.docx', size: '512000', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { id: 'file3', name: 'Design Mockup.png', size: '2048000', mime_type: 'image/png' },
    { id: 'file4', name: 'Budget.xlsx', size: '768000', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  ]

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: '09:00',
      endTime: '10:00',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      isAllDay: false,
      categoryId: '',
      priority: 'normal',
      location: '',
      roomId: 'none',
      meetingUrl: '',
      isPrivate: false,
    },
  })

  // Handle click on linked attachment
  const handleAttachmentClick = async (attachment: { id: string; title: string; type: 'notes' | 'events' | 'files' | 'drive'; driveFileUrl?: string }) => {
    const wsId = workspaceId || currentWorkspace?.id
    if (!wsId) return

    if (attachment.type === 'notes') {
      // Navigate to the note
      onClose()
      navigate(`/workspaces/${wsId}/notes/${attachment.id}`)
    } else if (attachment.type === 'files') {
      // Open file preview modal
      setFilePreviewLoading(true)
      setFilePreviewOpen(true)
      try {
        const fileData = await fileApi.getFile(wsId, attachment.id)
        setFilePreviewData(fileData)
      } catch (error) {
        console.error('Error fetching file:', error)
        toast.error('Failed to load file')
        setFilePreviewData({ id: attachment.id, name: attachment.title, type: 'file' })
      } finally {
        setFilePreviewLoading(false)
      }
    } else if (attachment.type === 'events') {
      // Open event preview modal
      setEventPreviewLoading(true)
      setEventPreviewOpen(true)
      try {
        const eventData = await calendarApi.getEvent(wsId, attachment.id)
        setEventPreviewData(eventData)
      } catch (error) {
        console.error('Error fetching event:', error)
        toast.error('Failed to load event')
        setEventPreviewData(null)
      } finally {
        setEventPreviewLoading(false)
      }
    } else if (attachment.type === 'drive') {
      // Open Google Drive file in new tab
      if (attachment.driveFileUrl) {
        window.open(attachment.driveFileUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('Drive file URL not available')
      }
    }
  }

  // Check Google Drive connection status when dialog opens
  useEffect(() => {
    const checkDriveConnection = async () => {
      const wsId = workspaceId || currentWorkspace?.id
      if (!wsId || !open) return
      try {
        const connection = await googleDriveApi.getConnection(wsId)
        setIsDriveConnected(!!connection)
      } catch {
        setIsDriveConnected(false)
      }
    }
    checkDriveConnection()
  }, [open, workspaceId, currentWorkspace?.id])

  // Handle Drive file selection
  const handleDriveFilesSelected = (files: Array<{ id: string; title: string; type: 'drive'; driveFileUrl?: string; driveThumbnailUrl?: string; driveMimeType?: string; driveFileSize?: number }>) => {
    setDescriptionAttachments(prev => {
      const newFiles = files.filter(file => !prev.some(existing => existing.id === file.id && existing.type === 'drive'))
      return [...prev, ...newFiles]
    })
    setShowDrivePicker(false)
  }

  // Reset all states when modal opens/closes
  useEffect(() => {
    if (!open) {
      // Clean up all states when modal closes
      form.reset({
        title: '',
        description: '',
        startTime: '09:00',
        endTime: '10:00',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        isAllDay: false,
        categoryId: '',
        priority: 'normal',
        location: '',
        roomId: 'none',
        meetingUrl: '',
        isPrivate: false,
      })
      setReminders([])
      setRecurrence(undefined)
      setAttendees([])
      setAttachedFiles([])
      setAttachedNotes([])
      setDescriptionSuggestions([])
      setShowDescriptionSuggestions(false)
      setTitleSuggestions([])
      setShowTitleSuggestions(false)
      setSelectedTitleIndex(-1)
      setShowFileSelector(false)
      setSelectedBotId('')
      return
    }

    if (event) {
      // Edit mode - populate with event data
      const startDate = new Date(event.startTime)
      const endDate = new Date(event.endTime)
      
      form.reset({
        title: event.title,
        description: event.description || '',
        startTime: event.isAllDay ? '09:00' : format(startDate, 'HH:mm'),
        endTime: event.isAllDay ? '17:00' : format(endDate, 'HH:mm'),
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        isAllDay: event.isAllDay ?? false,
        categoryId: event.categoryId || '',
        priority: event.priority,
        location: event.location ? (typeof event.location === 'string' ? event.location : event.location.name) : '',
        roomId: event.roomId || 'none',
        meetingUrl: event.meetingLink || '',
        isPrivate: event.isPrivate ?? false,
      })

      setReminders(event.reminders || [])
      setRecurrence(event.recurrence || undefined)
      // Handle attendees - check for both email and user_id fields
      setAttendees(event.attendees?.map(a => {
        if (typeof a === 'string') return a
        // Check for email first, then user_id (which might be an email)
        return a.email || a.id || ''
      }).filter(Boolean) || [])
      
      // Load attached files and notes from the unified attachments object
      const eventAttachments = event.attachments || { file_attachment: [], note_attachment: [], event_attachment: [], drive_attachment: [] };

      if (eventAttachments.file_attachment && Array.isArray(eventAttachments.file_attachment)) {
        console.log('Loading attached files from event:', eventAttachments.file_attachment);
        // Handle different formats: URLs (new), objects (transition), or IDs (old)
        const normalizedFiles = eventAttachments.file_attachment.map((file: any, index: number) => {
          // New format: direct URL string
          if (typeof file === 'string' && (file.startsWith('http') || file.startsWith('/'))) {
            const fileName = file.split('/').pop() || `Attachment ${index + 1}`;
            return {
              id: `file-${index}`,
              name: fileName,
              url: file,
              type: 'application/octet-stream'
            };
          }
          // Old format: just file ID
          else if (typeof file === 'string') {
            return { id: file, name: `File ${file}`, type: 'application/octet-stream' };
          }
          // Object format (current transition state)
          return file;
        });
        setAttachedFiles(normalizedFiles)
      } else {
        setAttachedFiles([])
      }

      // Load attached notes - fetch actual note details from IDs
      if (eventAttachments.note_attachment && Array.isArray(eventAttachments.note_attachment) && eventAttachments.note_attachment.length > 0) {
        console.log('Loading attached notes from event:', eventAttachments.note_attachment);
        // We have note IDs, fetch the actual note details
        setLoadingAttachedNotes(true);
        fetchNoteDetails(eventAttachments.note_attachment as string[]).then(noteDetails => {
          console.log('Fetched note details:', noteDetails);
          setAttachedNotes(noteDetails);
          setLoadingAttachedNotes(false);
        }).catch(error => {
          console.error('Error loading attached notes:', error);
          setLoadingAttachedNotes(false);
          setAttachedNotes([]);
        });
      } else {
        setAttachedNotes([]);
        setLoadingAttachedNotes(false);
      }

      // Load description attachments from enriched attachments data
      const loadedDescriptionAttachments: Array<{ id: string; title: string; type: 'notes' | 'events' | 'files' | 'drive'; driveFileUrl?: string; driveThumbnailUrl?: string; driveMimeType?: string; driveFileSize?: number }> = [];

      // Add file attachments
      if (eventAttachments.file_attachment && Array.isArray(eventAttachments.file_attachment)) {
        eventAttachments.file_attachment.forEach((item: any) => {
          if (typeof item === 'object' && item.id) {
            loadedDescriptionAttachments.push({
              id: item.id,
              title: item.name || 'Unknown file',
              type: 'files'
            });
          } else if (typeof item === 'string') {
            loadedDescriptionAttachments.push({
              id: item,
              title: `File ${item.slice(0, 8)}`,
              type: 'files'
            });
          }
        });
      }

      // Add note attachments
      if (eventAttachments.note_attachment && Array.isArray(eventAttachments.note_attachment)) {
        eventAttachments.note_attachment.forEach((item: any) => {
          if (typeof item === 'object' && item.id) {
            loadedDescriptionAttachments.push({
              id: item.id,
              title: item.title || 'Untitled Note',
              type: 'notes'
            });
          } else if (typeof item === 'string') {
            loadedDescriptionAttachments.push({
              id: item,
              title: `Note ${item.slice(0, 8)}`,
              type: 'notes'
            });
          }
        });
      }

      // Add event attachments
      if (eventAttachments.event_attachment && Array.isArray(eventAttachments.event_attachment)) {
        eventAttachments.event_attachment.forEach((item: any) => {
          if (typeof item === 'object' && item.id) {
            loadedDescriptionAttachments.push({
              id: item.id,
              title: item.title || 'Untitled Event',
              type: 'events'
            });
          } else if (typeof item === 'string') {
            loadedDescriptionAttachments.push({
              id: item,
              title: `Event ${item.slice(0, 8)}`,
              type: 'events'
            });
          }
        });
      }

      // Add Google Drive attachments
      if (eventAttachments.drive_attachment && Array.isArray(eventAttachments.drive_attachment)) {
        eventAttachments.drive_attachment.forEach((item: any) => {
          if (typeof item === 'object' && item.id) {
            loadedDescriptionAttachments.push({
              id: item.id,
              title: item.title || 'Drive File',
              type: 'drive',
              driveFileUrl: item.driveFileUrl,
              driveThumbnailUrl: item.driveThumbnailUrl,
              driveMimeType: item.driveMimeType,
              driveFileSize: item.driveFileSize
            });
          }
        });
      }

      setDescriptionAttachments(loadedDescriptionAttachments);
    } else {
      // Create mode - reset to defaults
      const startTime = defaultHour ? `${defaultHour.toString().padStart(2, '0')}:00` : '09:00'
      const endTime = defaultHour ? `${(defaultHour + 1).toString().padStart(2, '0')}:00` : '10:00'
      
      form.reset({
        title: '',
        description: '',
        startTime,
        endTime,
        startDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        endDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        isAllDay: false,
        categoryId: '',
        priority: 'normal',
        location: '',
        roomId: 'none',
        meetingUrl: '',
        isPrivate: false,
      })
      
      // Clear all other states for create mode
      setReminders([])
      setRecurrence(undefined)
      setAttendees([])
      setAttachedFiles([])
      setAttachedNotes([])
      setDescriptionAttachments([])
      setSelectedBotId('')
    }
  }, [open, event, defaultDate, defaultHour, form])

  const onSubmit = async (data: EventFormData) => {
    if (!currentWorkspace) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.errors.noWorkspace' }))
      return
    }


    try {
      // Convert form data to API format
      const startDateTime = new Date(`${data.startDate}T${data.isAllDay ? '00:00' : data.startTime}`)
      const endDateTime = new Date(`${data.endDate}T${data.isAllDay ? '23:59' : data.endTime}`)
      
      // Separate description attachments by type (from / mentions in description)
      const descriptionFileIds = descriptionAttachments.filter(att => att.type === 'files').map(att => att.id);
      const descriptionNoteIds = descriptionAttachments.filter(att => att.type === 'notes').map(att => att.id);
      const descriptionEventIds = descriptionAttachments.filter(att => att.type === 'events').map(att => att.id);
      const driveAttachments = descriptionAttachments.filter(att => att.type === 'drive').map(att => ({
        id: att.id,
        title: att.title,
        driveFileUrl: att.driveFileUrl,
        driveThumbnailUrl: att.driveThumbnailUrl,
        driveMimeType: att.driveMimeType,
        driveFileSize: att.driveFileSize
      }));

      // Build unified attachments object - combine manual attachments with description mentions
      const unifiedAttachments = {
        file_attachment: [
          ...attachedFiles.map(file => file.url || file.id).filter(Boolean) as string[],
          ...descriptionFileIds
        ],
        note_attachment: [
          ...attachedNotes.map(note => note.id),
          ...descriptionNoteIds
        ],
        event_attachment: [
          ...descriptionEventIds
        ],
        drive_attachment: driveAttachments
      };

      if (isEdit && event) {
        // For regular events, use the event ID directly
        const eventIdToUpdate = event.id;

        const updateData: UpdateEventRequest = {
          title: data.title,
          description: data.description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          all_day: data.isAllDay,
          location: data.location,
          room_id: data.roomId !== 'none' ? data.roomId : undefined,
          category_id: data.categoryId && data.categoryId !== '' ? data.categoryId : undefined,
          attendees: attendees,
          meeting_url: data.meetingUrl,
          visibility: data.isPrivate ? 'private' : 'public',
          priority: data.priority as 'low' | 'normal' | 'high' | 'urgent',
          status: 'confirmed',
          is_recurring: !!recurrence,
          recurrence_rule: recurrence ? {
            frequency: recurrence.pattern as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval: recurrence.interval,
            byWeekDay: recurrence.pattern === 'weekly' ? [1, 3, 5] : undefined,
            until: recurrence.endDate?.toISOString()
          } : undefined,
          reminders: reminders.map(r => r.minutes),
          // Unified attachments object
          attachments: unifiedAttachments,
        }

        try {
          await updateEventMutation.mutateAsync({
            workspaceId: currentWorkspace.id,
            eventId: eventIdToUpdate,
            data: updateData
          })
          toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.success.updated' }))
        } catch (updateError: any) {
          console.error('Update event error:', updateError)
          const errorMsg = updateError?.message || 'Failed to update event'
          toast.error(errorMsg)
          return // Don't continue to onClose
        }
      } else {
        const createData: CreateEventRequest = {
          title: data.title,
          description: data.description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          all_day: data.isAllDay,
          location: data.location,
          room_id: data.roomId !== 'none' ? data.roomId : undefined,
          category_id: data.categoryId && data.categoryId !== '' ? data.categoryId : undefined,
          attendees: attendees,
          meeting_url: data.meetingUrl,
          visibility: data.isPrivate ? 'private' : 'public',
          priority: data.priority as 'low' | 'normal' | 'high' | 'urgent',
          status: 'confirmed',
          is_recurring: !!recurrence,
          recurrence_rule: recurrence ? {
            frequency: recurrence.pattern as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval: recurrence.interval,
            byWeekDay: recurrence.pattern === 'weekly' ? [1, 3, 5] : undefined,
            until: recurrence.endDate?.toISOString()
          } : undefined,
          reminders: reminders.map(r => r.minutes),
          // Unified attachments object
          attachments: unifiedAttachments,
        }

        try {
          const createdEvent = await createEventMutation.mutateAsync({
            workspaceId: currentWorkspace.id,
            data: createData
          })
          toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.success.created' }))

          // Assign bot if one was selected
          if (selectedBotId && createdEvent) {
            try {
              await assignBotMutation.mutateAsync({
                workspaceId: currentWorkspace.id,
                eventId: createdEvent.id,
                data: {
                  botId: selectedBotId,
                  isActive: true,
                },
              })
              toast.success('Bot assigned to event successfully')
            } catch (botError: any) {
              console.error('Bot assignment error:', botError)
              toast.error('Failed to assign bot to event')
            }
          }
        } catch (createError: any) {
          console.error('Create event error:', createError)
          const errorMsg = createError?.message || 'Failed to create event'
          toast.error(errorMsg)
          return // Don't continue to onClose
        }
      }

      // Invalidate calendar queries to refresh the view
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
      onClose()
    } catch (error: any) {
      console.error('Failed to save event:', error)
      // Fallback error handling for any other errors
      const errorMessage = error?.message || 'An error occurred'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    
    try {
      await deleteEventMutation.mutateAsync({
        workspaceId: currentWorkspace?.id || '',
        eventId: event.id,
        deleteSeries: false // TODO: Add UI option for recurring events
      })
      
      // Invalidate calendar queries to refresh the view
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() })

      toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.success.deleted' }))
      setShowDeleteConfirmation(false)
      onClose()
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.errors.deleteFailed' }))
    }
  }

  const addReminder = () => {
    const newReminder: Reminder = {
      id: `reminder-${Date.now()}`,
      type: 'email' as NotificationType,
      minutes: 15,
      isActive: true
    }
    setReminders([...reminders, newReminder])
  }

  const removeReminder = (id: string | undefined) => {
    if (!id) return
    setReminders(reminders.filter(r => r.id !== id))
  }

  const addAttendee = (email: string) => {
    if (email.trim() && !attendees.includes(email.trim())) {
      setAttendees([...attendees, email.trim()])
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showAttendeeDropdown && !target.closest('.attendee-dropdown-container')) {
        setShowAttendeeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAttendeeDropdown])

  const generateSmartDescriptions = (title: string): string[] => {
    const lowerTitle = title.toLowerCase()
    
    if (lowerTitle.includes('standup') || lowerTitle.includes('stand-up') || lowerTitle.includes('daily')) {
      return [
        'Quick daily sync to discuss progress, blockers, and plan for the day. Share updates on current tasks and upcoming priorities.',
        'Brief team check-in to align on deliverables, address any impediments, and coordinate daily activities.',
        'Daily standup meeting to review yesterday\'s accomplishments, today\'s goals, and any support needed from the team.'
      ]
    }
    
    if (lowerTitle.includes('retro') || lowerTitle.includes('retrospective')) {
      return [
        'Team retrospective to reflect on recent work, celebrate successes, identify improvement areas, and plan action items for the next iteration.',
        'Sprint retrospective meeting to discuss what went well, what could be improved, and specific actions to enhance team effectiveness.',
        'Collaborative session to review team performance, gather feedback, and implement process improvements for better outcomes.'
      ]
    }
    
    if (lowerTitle.includes('planning') || lowerTitle.includes('sprint planning')) {
      return [
        'Sprint planning session to review backlog items, estimate effort, define sprint goals, and commit to deliverables for the upcoming iteration.',
        'Collaborative planning meeting to prioritize features, break down user stories, and establish clear objectives for the development cycle.',
        'Team planning session to analyze requirements, assess capacity, and create a detailed execution plan for project milestones.'
      ]
    }
    
    if (lowerTitle.includes('1:1') || lowerTitle.includes('one-on-one') || lowerTitle.includes('1-on-1')) {
      return [
        'Regular one-on-one meeting to discuss career development, provide feedback, address concerns, and align on goals and expectations.',
        'Personal check-in to review performance, discuss professional growth opportunities, and ensure alignment on priorities and objectives.',
        'Individual meeting focused on career progression, skill development, feedback exchange, and addressing any workplace challenges.'
      ]
    }
    
    return [
      `Meeting to discuss ${title.toLowerCase()} and related topics. Review current status, address any questions, and plan next steps.`,
      `Collaborative session focused on ${title.toLowerCase()}. Share updates, gather feedback, and ensure alignment on objectives.`,
      `Discussion about ${title.toLowerCase()} to make progress on key initiatives and coordinate team activities.`
    ]
  }

  const generateDescriptionSuggestions = async () => {
    const title = form.getValues('title')

    // Validate title first
    if (!title.trim()) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.errors.fillTitleFirst' }))
      return
    }

    setIsGeneratingDescription(true)
    setDescriptionSuggestions([])
    setShowDescriptionSuggestions(false)

    try {
      // Call the unified description suggestions API
      const response = await descriptionMutation.mutateAsync({
        type: 'event',
        title: title.trim(),
        count: 3,
        tone: 'professional',
        length: 'medium',
      })

      // Backend returns already parsed suggestions
      let suggestions = response.suggestions

      // Fallback to smart patterns if AI doesn't provide good suggestions
      if (suggestions.length === 0 || suggestions.every(s => s.length < 20)) {
        suggestions = generateSmartDescriptions(title)
      }

      setDescriptionSuggestions(suggestions)
      setShowDescriptionSuggestions(true)
      toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.success.aiGenerated' }))
    } catch (error) {
      console.error('Error generating descriptions:', error)
      // Fallback to smart patterns if API fails
      const fallbackSuggestions = generateSmartDescriptions(title)
      setDescriptionSuggestions(fallbackSuggestions)
      setShowDescriptionSuggestions(true)
      toast.warning(intl.formatMessage({ id: 'modules.calendar.eventDialog.errors.aiSuggestionsUnavailable' }))
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const selectDescriptionSuggestion = (suggestion: string) => {
    form.setValue('description', suggestion)
    setShowDescriptionSuggestions(false)
  }

  const generateTitleSuggestions = (input: string) => {
    const allTitles = getCommonEventTitles()
    
    if (!input.trim()) {
      return [
        'Team Meeting', 'Daily Standup', '1:1 Meeting', 'Focus Time', 'Client Meeting',
        'Code Review', 'Planning Session', 'Coffee Chat'
      ]
    }
    
    const lowercaseInput = input.toLowerCase()
    const filtered = allTitles.filter(title => 
      title.toLowerCase().includes(lowercaseInput)
    )
    
    const exactMatches = filtered.filter(title =>
      title.toLowerCase().split(' ').some(word => word.startsWith(lowercaseInput))
    )
    
    const otherMatches = filtered.filter(title =>
      !exactMatches.includes(title)
    )
    
    return [...exactMatches, ...otherMatches].slice(0, 8)
  }

  const handleTitleInputChange = (value: string) => {
    form.setValue('title', value)
    const suggestions = generateTitleSuggestions(value)
    setTitleSuggestions(suggestions)
    setShowTitleSuggestions(suggestions.length > 0)
    setSelectedTitleIndex(-1)
  }

  const selectTitleSuggestion = (title: string) => {
    form.setValue('title', title)
    setShowTitleSuggestions(false)
    setSelectedTitleIndex(-1)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (!showTitleSuggestions || titleSuggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedTitleIndex(prev => 
          prev < titleSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedTitleIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedTitleIndex >= 0) {
          selectTitleSuggestion(titleSuggestions[selectedTitleIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowTitleSuggestions(false)
        setSelectedTitleIndex(-1)
        break
    }
  }

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!currentWorkspace?.id) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.errors.noWorkspace' }))
      return
    }
    
    setIsUploadingFiles(true)
    const fileArray = Array.from(files)
    
    try {
      for (const file of fileArray) {
        const tempId = `uploading-${Date.now()}-${Math.random()}`
        setUploadProgress(prev => ({ ...prev, [tempId]: 10 }))
        
        try {
          // Upload file to backend
          const uploadedFile = await storageApi.uploadFile(file, currentWorkspace.id)
          
          setUploadProgress(prev => ({ ...prev, [tempId]: 100 }))
          
          const newFile = {
            id: uploadedFile.id,
            name: uploadedFile.name,
            size: parseInt(uploadedFile.size),
            type: uploadedFile.mime_type,
            url: uploadedFile.url,
            uploadedAt: uploadedFile.created_at
          };
          
          console.log('Uploaded file object:', uploadedFile);
          console.log('Adding file to attached files:', newFile);
          
          setAttachedFiles(prev => [...prev, newFile])

          toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.files.uploaded' }, { name: file.name }))
        } catch (fileError) {
          console.error(`Failed to upload ${file.name}:`, fileError)
          toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.errors.fileUploadFailed' }, { name: file.name }))
        }
        
        // Remove progress for this file
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[tempId]
          return newProgress
        })
      }
    } catch (error) {
      console.error('File upload error:', error)
      toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.errors.uploadFailed' }))
    } finally {
      setIsUploadingFiles(false)
      setUploadProgress({})
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }

  const selectFromFiles = (file: any) => {
    setAttachedFiles(prev => [...prev, {
      id: file.id,
      name: file.name,
      size: parseInt(file.size) || 0,
      type: file.mime_type || 'application/octet-stream',
      url: file.storage_path,
      uploadedAt: new Date().toISOString()
    }])
    setShowFileSelector(false)
    toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.files.fileAdded' }, { name: file.name }))
  }

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.files.fileRemoved' }))
  }

  const attachNote = (note: any) => {
    const isAlreadyAttached = attachedNotes.some(attachedNote => attachedNote.id === note.id)
    if (isAlreadyAttached) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.notes.noteAlreadyAttached' }))
      return
    }

    const noteToAttach = {
      id: note.id,
      title: note.title,
      attachedAt: new Date().toISOString(),
      attachedBy: 'current-user' // TODO: Get current user
    }

    setAttachedNotes(prev => [...prev, noteToAttach])
    toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.notes.noteAttached' }, { title: note.title }))
  }

  const removeAttachedNote = (noteId: string) => {
    setAttachedNotes(prev => prev.filter(n => n.id !== noteId))
    toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.notes.noteRemoved' }))
  }

  // Fetch note details from note IDs
  const fetchNoteDetails = async (noteIds: string[]) => {
    if (!noteIds || noteIds.length === 0) return []
    if (!currentWorkspace?.id) return []
    
    try {
      const notePromises = noteIds.map(async (noteId) => {
        try {
          const note = await notesApi.getNoteByWorkspace(currentWorkspace.id, noteId)
          return {
            id: note.id,
            title: note.title,
            attachedAt: new Date().toISOString(), // We don't have the actual attachment date
            attachedBy: 'user' // We don't have this info from the API
          }
        } catch (error) {
          console.error(`Failed to fetch note ${noteId}:`, error)
          return {
            id: noteId,
            title: `Note ${noteId}`,
            attachedAt: new Date().toISOString(),
            attachedBy: 'user'
          }
        }
      })
      
      return await Promise.all(notePromises)
    } catch (error) {
      console.error('Error fetching note details:', error)
      return []
    }
  }

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="h-4 w-4" />
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />
    if (mimeType.includes('pdf')) return <FileType className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const handleOpenNote = (noteId: string) => {
    console.log('Opening note with ID:', noteId);

    if (!noteId) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.notes.noNoteId' }))
      return
    }

    if (!currentWorkspace?.id) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.eventDialog.errors.noWorkspace' }))
      return
    }

    const noteUrl = `/workspaces/${currentWorkspace.id}/notes/${noteId}`
    console.log('Opening note URL:', noteUrl);
    window.open(noteUrl, '_blank')
    toast.success(intl.formatMessage({ id: 'modules.calendar.eventDialog.notes.openingNote' }))
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: isEdit ? 'modules.calendar.eventDialog.titleEdit' : 'modules.calendar.eventDialog.titleCreate' })}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">{intl.formatMessage({ id: 'modules.calendar.eventDialog.tabs.details' })}</TabsTrigger>
                <TabsTrigger value="advanced">{intl.formatMessage({ id: 'modules.calendar.eventDialog.tabs.advanced' })}</TabsTrigger>
                <TabsTrigger value="attachments">{intl.formatMessage({ id: 'modules.calendar.eventDialog.tabs.attachments' })}</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <fieldset disabled={isFormReadOnly}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.title' })}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={intl.formatMessage({ id: 'modules.calendar.eventDialog.form.titlePlaceholder' })} 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              handleTitleInputChange(e.target.value)
                            }}
                            onKeyDown={handleTitleKeyDown}
                            onFocus={() => {
                              const suggestions = generateTitleSuggestions(field.value)
                              setTitleSuggestions(suggestions)
                              setShowTitleSuggestions(suggestions.length > 0)
                            }}
                            onBlur={() => {
                              setTimeout(() => setShowTitleSuggestions(false), 150)
                            }}
                            autoComplete="off"
                          />
                          
                          {showTitleSuggestions && titleSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                              <div className="p-2">
                                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                                  <Sparkles className="h-3 w-3" />
                                  {intl.formatMessage({ id: 'modules.calendar.eventDialog.suggestions.commonTitles' })}
                                </div>
                                {titleSuggestions.map((suggestion, index) => (
                                  <div
                                    key={suggestion}
                                    className={cn(
                                      "px-3 py-2 text-sm cursor-pointer rounded-md transition-colors",
                                      selectedTitleIndex === index 
                                        ? "bg-accent text-accent-foreground" 
                                        : "hover:bg-accent/50"
                                    )}
                                    onClick={() => selectTitleSuggestion(suggestion)}
                                    onMouseEnter={() => setSelectedTitleIndex(index)}
                                  >
                                    {suggestion}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.description' })}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateDescriptionSuggestions}
                          disabled={isGeneratingDescription || descriptionMutation.isPending || !form.getValues('title')}
                          className="h-8 px-2 text-xs"
                        >
                          {(isGeneratingDescription || descriptionMutation.isPending) ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          {intl.formatMessage({ id: 'modules.calendar.eventDialog.form.aiSuggest' })}
                        </Button>
                      </div>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder={intl.formatMessage({ id: 'modules.calendar.eventDialog.form.descriptionPlaceholder' })}
                          minHeight="100px"
                          enableMentions={true}
                          attachments={descriptionAttachments}
                          onAttachmentsChange={setDescriptionAttachments}
                        />
                      </FormControl>
                      {showDescriptionSuggestions && descriptionSuggestions.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.aiSuggestions' })}</div>
                          {descriptionSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="p-3 text-sm bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors border border-border/50"
                              onClick={() => selectDescriptionSuggestion(suggestion)}
                            >
                              {suggestion}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDescriptionSuggestions(false)}
                            className="h-7 text-xs"
                          >
                            {intl.formatMessage({ id: 'modules.calendar.eventDialog.form.closeSuggestions' })}
                          </Button>
                        </div>
                      )}
                      <FormMessage />

                      {/* Linked Items Display */}
                      {descriptionAttachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            Linked Items ({descriptionAttachments.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {descriptionAttachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer",
                                  "bg-background hover:bg-muted transition-colors group"
                                )}
                                onClick={() => handleAttachmentClick(attachment)}
                              >
                                <div className={cn(
                                  "text-muted-foreground",
                                  attachment.type === 'notes' && "text-blue-500",
                                  attachment.type === 'events' && "text-green-500",
                                  attachment.type === 'files' && "text-orange-500",
                                  attachment.type === 'drive' && "text-green-600"
                                )}>
                                  {getAttachmentIcon(attachment.type)}
                                </div>
                                <span className="font-medium truncate max-w-[200px]" title={attachment.title}>
                                  {attachment.title}
                                </span>
                                {!isFormReadOnly && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDescriptionAttachments(prev => prev.filter(a => a.id !== attachment.id))
                                    }}
                                    className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove link"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.category' })}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isFormReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={intl.formatMessage({ id: 'modules.calendar.eventDialog.form.categoryPlaceholder' })} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: category.color }}
                                  />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))}
                            {categories.length === 0 && (
                              <div className="text-sm text-muted-foreground p-2">
                                {intl.formatMessage({ id: 'modules.calendar.eventDialog.form.noCategoriesAvailable' })}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.priority' })}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isFormReadOnly}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.priorityLow' })}</SelectItem>
                            <SelectItem value="normal">{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.priorityNormal' })}</SelectItem>
                            <SelectItem value="high">{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.priorityHigh' })}</SelectItem>
                            <SelectItem value="urgent">{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.priorityUrgent' })}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isAllDay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.allDayEvent' })}</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.calendar.eventDialog.form.allDayDescription' })}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFormReadOnly}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.startDate' })}</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => {
                              field.onChange(e)
                              // If end date is before new start date, update end date
                              const newStartDate = e.target.value
                              const currentEndDate = form.getValues('endDate')
                              if (currentEndDate < newStartDate) {
                                form.setValue('endDate', newStartDate)
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.endDate' })}</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            min={form.watch('startDate') || format(new Date(), 'yyyy-MM-dd')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!form.watch('isAllDay') && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.startTime' })}</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                // If same date and end time is before new start time, update end time
                                const newStartTime = e.target.value
                                const currentEndTime = form.getValues('endTime')
                                const startDate = form.getValues('startDate')
                                const endDate = form.getValues('endDate')
                                if (startDate === endDate && currentEndTime < newStartTime) {
                                  form.setValue('endTime', newStartTime)
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => {
                        const startDate = form.watch('startDate')
                        const endDate = form.watch('endDate')
                        const startTime = form.watch('startTime')
                        // Only set min time constraint when start and end dates are the same
                        const minTime = startDate === endDate ? startTime : undefined

                        return (
                          <FormItem>
                            <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.endTime' })}</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                min={minTime}
                                onChange={(e) => {
                                  const newEndTime = e.target.value
                                  // If same date and end time is before start time, don't allow it
                                  if (startDate === endDate && newEndTime < startTime) {
                                    // Set end time to start time instead
                                    field.onChange({ ...e, target: { ...e.target, value: startTime } })
                                    form.setValue('endTime', startTime)
                                  } else {
                                    field.onChange(e)
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.location' })}</FormLabel>
                      <FormControl>
                        <Input placeholder={intl.formatMessage({ id: 'modules.calendar.eventDialog.form.locationPlaceholder' })} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meetingUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.meetingUrl' })}</FormLabel>
                      <FormControl>
                        <Input placeholder={intl.formatMessage({ id: 'modules.calendar.eventDialog.form.meetingUrlPlaceholder' })} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.meetingRoom' })}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'} disabled={isFormReadOnly}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={intl.formatMessage({ id: 'modules.calendar.eventDialog.form.meetingRoomPlaceholder' })} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.noMeetingRoom' })}</SelectItem>
                          {meetingRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                <span>{room.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({room.location} • {room.capacity} people)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{intl.formatMessage({ id: 'modules.calendar.eventDialog.form.privateEvent' })}</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.calendar.eventDialog.form.privateEventDescription' })}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFormReadOnly}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                </fieldset>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6">
                <fieldset disabled={isFormReadOnly}>
                <div>
                  <Label>{intl.formatMessage({ id: 'modules.calendar.eventDialog.attendees.label' })}</Label>
                  <div className="space-y-2 mb-4">
                    {attendees.map((email, index) => {
                      // Find the member to display their name
                      const member = workspaceMembers.find(m => m.user?.email === email)
                      const displayName = member?.user?.name || email
                      const avatar = member?.user?.avatar

                      return (
                        <div key={`attendee-${index}-${email}`} className="flex items-center gap-3 p-2 border rounded bg-muted/20">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={avatar} alt={displayName} />
                            <AvatarFallback className="text-xs">
                              {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{displayName}</div>
                            <div className="text-xs text-muted-foreground truncate">{email}</div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAttendees(attendees.filter(a => a !== email))}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Dropdown to select workspace members */}
                  <div className="relative attendee-dropdown-container">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowAttendeeDropdown(!showAttendeeDropdown)}
                      disabled={isFormReadOnly}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {intl.formatMessage({ id: 'modules.calendar.eventDialog.attendees.addAttendee' })}
                    </Button>

                    {showAttendeeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-y-auto">
                        {workspaceMembers.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">
                            {intl.formatMessage({ id: 'modules.calendar.eventDialog.attendees.noWorkspaceMembers' })}
                          </div>
                        ) : (
                          workspaceMembers
                            .filter(member => {
                              const memberEmail = member.user?.email || ''
                              // Exclude already added attendees and the current logged-in user
                              return !attendees.includes(memberEmail) && memberEmail !== user?.email
                            })
                            .map(member => {
                              const userName = member.user?.name || member.user?.email || 'Unknown'
                              const userEmail = member.user?.email || ''
                              const userAvatar = member.user?.avatar

                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                                  onClick={() => {
                                    if (userEmail) {
                                      addAttendee(userEmail)
                                      setShowAttendeeDropdown(false)
                                    }
                                  }}
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={userAvatar} alt={userName} />
                                    <AvatarFallback className="text-xs">
                                      {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{userName}</div>
                                    <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
                                  </div>
                                </button>
                              )
                            })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4 mt-3">
                    <Label>{intl.formatMessage({ id: 'modules.calendar.eventDialog.reminders.label' })}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addReminder} disabled={isFormReadOnly}>
                      <Bell className="h-4 w-4 mr-2" />
                      {intl.formatMessage({ id: 'modules.calendar.eventDialog.reminders.addReminder' })}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {reminders.map(reminder => (
                      <div key={reminder.id} className="flex items-center gap-4 p-2 border rounded">
                        <Input
                          type="number"
                          value={reminder.minutes}
                          onChange={(e) => {
                            setReminders(reminders.map(r => 
                              r.id === reminder.id ? { ...r, minutes: parseInt(e.target.value) } : r
                            ))
                          }}
                          className="w-20"
                          min="1"
                        />
                        <span className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.eventDialog.reminders.minutesBefore' })}</span>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReminder(reminder.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>{intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.label' })}</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    {intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.description' })}
                  </p>
                  
                  <Select
                    value={recurrence?.pattern || 'none'}
                    disabled={isFormReadOnly}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setRecurrence(undefined)
                      } else {
                        setRecurrence({
                          pattern: value as RecurrencePattern,
                          interval: 1,
                          endDate: addMinutes(new Date(), 60 * 24 * 30),
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.placeholder' })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.none' })}</SelectItem>
                      <SelectItem value="daily">{intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.daily' })}</SelectItem>
                      <SelectItem value="weekly">{intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.weekly' })}</SelectItem>
                      <SelectItem value="monthly">{intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.monthly' })}</SelectItem>
                      <SelectItem value="yearly">{intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.yearly' })}</SelectItem>
                    </SelectContent>
                  </Select>

                  {recurrence && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>{intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.repeatEvery' })}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={recurrence.interval}
                            onChange={(e) => {
                              setRecurrence({
                                ...recurrence,
                                interval: parseInt(e.target.value) || 1
                              })
                            }}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            {recurrence.pattern}(s)
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label>{intl.formatMessage({ id: 'modules.calendar.eventDialog.recurrence.endDate' })}</Label>
                        <Input
                          type="date"
                          value={recurrence.endDate ? format(recurrence.endDate, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            setRecurrence({
                              ...recurrence,
                              endDate: e.target.value ? new Date(e.target.value) : undefined
                            })
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Event Bot Assignment */}
                <div>
                  {isEdit && event ? (
                    // Edit mode - show full EventBotAssignment component
                    <EventBotAssignment eventId={event.id} />
                  ) : (
                    // Create mode - show simple bot selection dropdown
                    availableBots.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Bell className="h-4 w-4" />
                          <Label>Event Bot Assistant</Label>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Assign a bot to automatically send reminders and manage this event
                        </p>
                        <Select value={selectedBotId || 'none'} onValueChange={(value) => setSelectedBotId(value === 'none' ? '' : value)} disabled={isFormReadOnly}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a bot (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No bot</SelectItem>
                            {availableBots.map((bot) => (
                              <SelectItem key={bot.id} value={bot.id}>
                                {bot.displayName || bot.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedBotId && selectedBotId !== 'none' && (
                          <div className="text-xs text-muted-foreground">
                            The bot will be assigned to this event after creation
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
                </fieldset>
              </TabsContent>

              <TabsContent value="attachments" className="space-y-6">
                <fieldset disabled={isFormReadOnly}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-sm font-medium">{intl.formatMessage({ id: 'modules.calendar.eventDialog.files.label' })}</Label>
                      <p className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.calendar.eventDialog.files.description' })}
                      </p>
                    </div>
                  </div>

                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.md,.csv,.json"
                  />

                  <div className="flex gap-4">
                    <div
                      className="flex-1 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                      onDrop={handleFileDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnter={(e) => e.preventDefault()}
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        {intl.formatMessage({ id: 'modules.calendar.eventDialog.files.dropOrClick' })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.calendar.eventDialog.files.supports' })}
                      </p>
                    </div>

                    {isDriveConnected && (
                      <div
                        className="border-2 border-dashed border-green-500/25 rounded-lg p-6 text-center hover:border-green-500/50 transition-colors cursor-pointer bg-green-50/50 dark:bg-green-950/20"
                        onClick={() => setShowDrivePicker(true)}
                      >
                        <HardDrive className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                          Google Drive
                        </p>
                        <p className="text-xs text-green-600/70 dark:text-green-500/70">
                          Attach from Drive
                        </p>
                      </div>
                    )}
                  </div>

                  {showFileSelector && (
                    <div className="border rounded-lg p-4 bg-muted/5 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">{intl.formatMessage({ id: 'modules.calendar.eventDialog.files.selectFromWorkspace' })}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFileSelector(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {workspaceFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                            onClick={() => selectFromFiles(file)}
                          >
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.mime_type)}
                              <div>
                                <div className="text-sm font-medium">{file.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.round((parseInt(file.size) || 0) / 1024)} KB
                                </div>
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {attachedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">{intl.formatMessage({ id: 'modules.calendar.eventDialog.files.attachedFiles' }, { count: attachedFiles.length })}</h4>
                      {attachedFiles.map((file, index) => (
                        <div key={file.id || `file-${index}`} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                          <div className="flex items-center gap-3">
                            {getFileIcon(file.type)}
                            <div>
                              <div className="font-medium text-sm">{file.name || `File ${file.id || 'Unknown'}`}</div>
                              <div className="text-xs text-muted-foreground">
                                {file.size ? `${Math.round(file.size / 1024)} KB` : 'Size unknown'}
                                {file.uploadedAt && ` • Added ${format(new Date(file.uploadedAt), 'MMM d, yyyy')}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (file.url) {
                                  window.open(file.url, '_blank');
                                } else {
                                  toast.error('File URL not available');
                                }
                              }}
                              title="View file"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachedFile(file.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isUploadingFiles && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.eventDialog.files.uploadingFiles' })}</div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: '60%' }} />
                      </div>
                    </div>
                  )}

                  {/* Google Drive Attachments */}
                  {descriptionAttachments.filter(att => att.type === 'drive').length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-medium">Google Drive Files ({descriptionAttachments.filter(att => att.type === 'drive').length})</h4>
                      {descriptionAttachments.filter(att => att.type === 'drive').map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-3">
                            <HardDrive className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="font-medium text-sm">{file.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {file.driveMimeType && `${file.driveMimeType.split('/').pop()}`}
                                {file.driveFileSize && ` • ${Math.round(file.driveFileSize / 1024)} KB`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (file.driveFileUrl) {
                                  window.open(file.driveFileUrl, '_blank', 'noopener,noreferrer');
                                } else {
                                  toast.error('Drive file URL not available');
                                }
                              }}
                              title="View in Google Drive"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDescriptionAttachments(prev => prev.filter(a => a.id !== file.id))}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </fieldset>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between">
              <div className="flex gap-2">
                {isEdit && isOrganizer && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="flex items-center gap-2"
                    disabled={deleteEventMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
                {isEdit && !isOrganizer && (
                  <p className="text-sm text-muted-foreground">
                    {intl.formatMessage({ id: 'modules.calendar.eventDialog.organizerOnly' })}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="btn-gradient-primary border-0"
                  disabled={createEventMutation.isPending || updateEventMutation.isPending || (isEdit && !isOrganizer)}
                >
                  {createEventMutation.isPending || updateEventMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isEdit ? intl.formatMessage({ id: 'modules.calendar.eventDialog.buttons.updateEvent' }) : intl.formatMessage({ id: 'modules.calendar.eventDialog.buttons.createEvent' })}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <ConfirmationDialog
      open={showDeleteConfirmation}
      onOpenChange={() => setShowDeleteConfirmation(false)}
      onConfirm={handleDelete}
      title={intl.formatMessage({ id: 'modules.calendar.eventDialog.deleteConfirmation.title' })}
      description={intl.formatMessage({ id: 'modules.calendar.eventDialog.deleteConfirmation.description' })}
      confirmText={intl.formatMessage({ id: 'modules.calendar.eventDialog.deleteConfirmation.confirmText' })}
      cancelText={intl.formatMessage({ id: 'modules.calendar.eventDialog.deleteConfirmation.cancelText' })}
      variant="destructive"
      isLoading={deleteEventMutation.isPending}
    />

    {/* File Preview Dialog */}
    <FilePreviewDialog
      isOpen={filePreviewOpen}
      onClose={() => {
        setFilePreviewOpen(false)
        setFilePreviewData(null)
      }}
      file={filePreviewData}
      isLoading={filePreviewLoading}
    />

    {/* Event Preview Dialog */}
    <EventPreviewDialog
      isOpen={eventPreviewOpen}
      onClose={() => {
        setEventPreviewOpen(false)
        setEventPreviewData(null)
      }}
      event={eventPreviewData}
      isLoading={eventPreviewLoading}
    />

    {/* Google Drive File Picker Modal */}
    <ChatDrivePickerModal
      open={showDrivePicker}
      onOpenChange={setShowDrivePicker}
      onSelectFiles={(files) => handleDriveFilesSelected(files.map(f => ({
        id: f.id,
        title: f.title || f.name || 'Untitled',
        type: 'drive' as const,
        driveFileUrl: f.driveFileUrl,
        driveThumbnailUrl: f.driveThumbnailUrl,
        driveMimeType: f.driveMimeType,
        driveFileSize: f.driveFileSize
      })))}
    />
    </>
  )
}