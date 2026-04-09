/**
 * VideoLeftSidebar Component - Contacts, call history, and meeting management
 * Migrated from workspace-suite-frontend with clean architecture
 */

import React, { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Video,
  Phone,
  Search,
  Clock,
  Users,
  Calendar,
  Plus,
  MoreVertical,
  PhoneCall,
  VideoIcon,
  UserPlus,
  Star,
  Archive,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  VideoLeftSidebarProps,
  Contact,
  CallHistory,
  ScheduledMeeting,
  CallParticipant
} from '@/types/video'
import { ScheduleMeetingModal } from '@/components/video-call'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useVideoCalls } from '@/lib/api/video-call-api'

export const VideoLeftSidebar: React.FC<VideoLeftSidebarProps> = ({
  currentView,
  isCollapsed,
  participants = [],
  onStartCall
}) => {
  const intl = useIntl()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('contacts')
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    favorites: true,
    recent: true,
    team: true,
    external: false
  })

  // Fetch workspace members
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')

  // Fetch call history (ended calls)
  const { data: callHistory = [] } = useVideoCalls(workspaceId || '', { status: 'ended', limit: 20 })

  // Fetch scheduled meetings
  const { data: scheduledCalls = [] } = useVideoCalls(workspaceId || '', { status: 'scheduled', limit: 20 })

  // Convert workspace members to contacts format
  const contacts: Contact[] = useMemo(() => {
    return workspaceMembers.map(member => ({
      id: member.user_id || member.id,
      name: member.user?.name || member.user?.email || 'Unknown User',
      email: member.user?.email || '',
      avatar: member.user?.avatar || '',
      department: member.role === 'owner' ? 'Owner' :
                  member.role === 'admin' ? 'Admin' :
                  'Team Member',
      status: 'offline' as const, // TODO: Integrate with real-time presence
      lastSeen: new Date()
    }))
  }, [workspaceMembers])

  // Create a map of user IDs to contacts for quick lookup
  const contactMap = useMemo(() => {
    const map = new Map<string, Contact>()
    contacts.forEach(contact => map.set(contact.id, contact))
    return map
  }, [contacts])

  // Transform call history from API to CallHistory format
  const transformedCallHistory: CallHistory[] = useMemo(() => {
    return callHistory.slice(0, 10).map(call => {
      const startTime = call.actual_start_time ? new Date(call.actual_start_time).getTime() : 0
      const endTime = call.actual_end_time ? new Date(call.actual_end_time).getTime() : 0
      const duration = endTime - startTime

      // Map participant IDs to Contact objects
      const participantContacts = (call.participants || [])
        .map(p => contactMap.get(p.user_id))
        .filter((c): c is Contact => c !== undefined)

      return {
        id: call.id,
        participants: participantContacts,
        type: call.call_type,
        duration,
        timestamp: startTime,
        isGroupCall: call.is_group_call,
        hasAIFeatures: !!(call.metadata?.transcription || call.metadata?.summary),
        status: 'completed' as const
      }
    }).filter(call => call.participants.length > 0)
  }, [callHistory, contactMap])

  // Transform scheduled calls from API to ScheduledMeeting format
  const transformedScheduledMeetings: ScheduledMeeting[] = useMemo(() => {
    return scheduledCalls.slice(0, 10).map(call => {
      const startTime = call.scheduled_start_time ? new Date(call.scheduled_start_time) : new Date()
      const endTime = call.scheduled_end_time ? new Date(call.scheduled_end_time) : new Date(startTime.getTime() + 3600000)
      const duration = endTime.getTime() - startTime.getTime()

      // Map participant IDs to Contact objects
      const participantContacts = (call.participants || [])
        .map(p => contactMap.get(p.user_id))
        .filter((c): c is Contact => c !== undefined)

      return {
        id: call.id,
        title: call.title,
        participants: participantContacts,
        startTime,
        duration,
        type: call.call_type,
        recurring: false, // TODO: Add recurring flag to backend
        createdBy: call.host_user_id
      }
    }).filter(meeting => meeting.participants.length > 0)
  }, [scheduledCalls, contactMap])

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts

    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.department.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, contacts])

  // Get recent contacts from call history
  const recentContactIds = useMemo(() => {
    const ids = new Set<string>()
    transformedCallHistory
      .slice(0, 5)
      .forEach(call => {
        call.participants.forEach(p => ids.add(p.id))
      })
    return ids
  }, [transformedCallHistory])

  // Group contacts by department
  const groupedContacts = useMemo(() => {
    const favorites = filteredContacts.slice(0, 3) // Top 3 as favorites for now
    const recent = filteredContacts.filter(c => recentContactIds.has(c.id)).slice(0, 5)
    const team = filteredContacts.filter(c => c.department !== 'External')
    const external = filteredContacts.filter(c => c.department === 'External')

    return { favorites, recent, team, external }
  }, [filteredContacts, recentContactIds])

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  // Handle start call
  const handleStartCall = (contacts: Contact[], type: 'audio' | 'video') => {
    if (onStartCall) {
      onStartCall(contacts, type)
      toast.success(`Starting ${type} call with ${contacts.map(c => c.name).join(', ')}`)
    }
  }

  // Status indicator component
  const StatusIndicator = ({ status }: { status: Contact['status'] }) => {
    const colors = {
      online: 'bg-green-500',
      busy: 'bg-red-500', 
      away: 'bg-yellow-500',
      offline: 'bg-gray-500'
    }
    
    return (
      <div className={cn('w-3 h-3 rounded-full border-2 border-white', colors[status])} />
    )
  }

  // Section header component
  const SectionHeader = ({ 
    title, 
    sectionKey, 
    count 
  }: { 
    title: string
    sectionKey: string
    count: number 
  }) => (
    <div 
      className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/50 rounded-lg"
      onClick={() => setExpandedSections(prev => ({
        ...prev,
        [sectionKey]: !prev[sectionKey]
      }))}
    >
      <div className="flex items-center gap-2">
        {expandedSections[sectionKey] ? 
          <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        }
        <span className="text-sm font-medium text-foreground">{title}</span>
        <Badge variant="outline" className="text-xs">
          {count}
        </Badge>
      </div>
    </div>
  )

  // Contact item component
  const ContactItem = ({ contact }: { contact: Contact }) => (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg group">
      <div className="relative">
        <Avatar className="h-9 w-9">
          <AvatarImage src={contact.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            {contact.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1">
          <StatusIndicator status={contact.status} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {contact.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {contact.department}
        </p>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleStartCall([contact], 'audio')}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleStartCall([contact], 'video')}
        >
          <Video className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  if (isCollapsed) {
    return (
      <div className="w-16 bg-muted/30 border-r border-border flex flex-col items-center py-4 gap-4">
        <Button variant="ghost" size="sm" className="p-2">
          <Users className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="sm" className="p-2">
          <Clock className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="sm" className="p-2">
          <Calendar className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-muted/30 border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-2">
          <TabsTrigger value="contacts" className="text-xs">
            <Users className="h-4 w-4 mr-1" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <Clock className="h-4 w-4 mr-1" />
            History
          </TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs">
            <Calendar className="h-4 w-4 mr-1" />
            Meetings
          </TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 mt-2">
          <ScrollArea className="h-full px-2">
            <div className="space-y-1">
              {/* Favorites */}
              <SectionHeader title="Favorites" sectionKey="favorites" count={groupedContacts.favorites.length} />
              {expandedSections.favorites && (
                <div className="ml-4 space-y-1">
                  {groupedContacts.favorites.map(contact => (
                    <ContactItem key={contact.id} contact={contact} />
                  ))}
                </div>
              )}

              {/* Recent */}
              <SectionHeader title={intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.recentContacts' })} sectionKey="recent" count={groupedContacts.recent.length} />
              {expandedSections.recent && (
                <div className="ml-4 space-y-1">
                  {groupedContacts.recent.map(contact => (
                    <ContactItem key={contact.id} contact={contact} />
                  ))}
                </div>
              )}

              {/* Team */}
              <SectionHeader title="Team" sectionKey="team" count={groupedContacts.team.length} />
              {expandedSections.team && (
                <div className="ml-4 space-y-1">
                  {groupedContacts.team.map(contact => (
                    <ContactItem key={contact.id} contact={contact} />
                  ))}
                </div>
              )}

              {/* External */}
              <SectionHeader title="External" sectionKey="external" count={groupedContacts.external.length} />
              {expandedSections.external && (
                <div className="ml-4 space-y-1">
                  {groupedContacts.external.map(contact => (
                    <ContactItem key={contact.id} contact={contact} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 mt-2">
          <ScrollArea className="h-full px-4">
            <div className="space-y-3">
              {transformedCallHistory.map(call => (
                <div key={call.id} className="p-3 hover:bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      call.status === 'completed' ? 'bg-green-500/20 text-green-600' :
                      call.status === 'missed' ? 'bg-red-500/20 text-red-600' :
                      'bg-gray-500/20 text-gray-600'
                    )}>
                      {call.type === 'video' ? 
                        <Video className="h-4 w-4" /> : 
                        <Phone className="h-4 w-4" />
                      }
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {call.isGroupCall ? 
                            `Group call (${call.participants.length})` :
                            call.participants[0]?.name
                          }
                        </p>
                        {call.hasAIFeatures && (
                          <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-300">
                            AI
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{call.status}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(call.timestamp)}</span>
                        {call.duration > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(call.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleStartCall(call.participants, call.type)}
                    >
                      <PhoneCall className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="flex-1 mt-2">
          <ScrollArea className="h-full px-4">
            <div className="space-y-3">
              {/* Schedule Meeting Button */}
              <Button
                className="w-full btn-gradient-primary border-0"
                onClick={() => setShowScheduleMeetingModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule New Meeting
              </Button>

              <Separator />

              {transformedScheduledMeetings.map(meeting => (
                <div key={meeting.id} className="p-3 hover:bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 text-blue-600 rounded-full">
                      <Calendar className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {meeting.title}
                        </p>
                        {meeting.recurring && (
                          <Badge variant="outline" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{meeting.startTime.toLocaleString()}</span>
                        <span>•</span>
                        <span>{formatDuration(meeting.duration)}</span>
                        <span>•</span>
                        <span>{meeting.participants.length} participants</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleStartCall(meeting.participants, meeting.type)}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => toast.info('Start quick audio call feature coming soon')}
          >
            <Phone className="h-4 w-4 mr-2" />
            Audio Call
          </Button>
          <Button
            className="flex-1"
            onClick={() => toast.info('Start quick video call feature coming soon')}
          >
            <Video className="h-4 w-4 mr-2" />
            Video Call
          </Button>
        </div>
        <Button
          className="w-full btn-gradient-primary border-0"
          onClick={() => setShowScheduleMeetingModal(true)}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        open={showScheduleMeetingModal}
        onOpenChange={setShowScheduleMeetingModal}
      />
    </div>
  )
}