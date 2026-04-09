/**
 * VideoView Component - Exact copy from workspace-suite-frontend
 * Clean React+Vite+TypeScript implementation
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Video,
  Phone,
  Users,
  Calendar,
  Clock,
  Plus,
  PhoneCall,
  Brain,
  Sparkles,
  History,
  Search,
  Filter,
  FileText
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useVideoCallStore } from '@/stores/videoCallStore'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ScheduleMeetingModal } from '@/components/video-call'
import { MeetingSummaryView } from '@/components/video-call/MeetingSummaryView'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useCreateVideoCall, useVideoCalls, useMembersPresence } from '@/lib/api/video-call-api'
import type { VideoCall } from '@/lib/api/video-call-api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useMemberProfile } from '@/hooks/useMemberProfile'

interface Contact {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'online' | 'offline' | 'away' | 'busy'
  lastSeen?: string
}

export function VideoView() {
  const intl = useIntl()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth() // Get current logged-in user
  const { openMemberProfile } = useMemberProfile()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'contacts' | 'history' | 'scheduled'>('contacts')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all')
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false)
  const [meetingCode, setMeetingCode] = useState('')
  const [selectedCallForSummary, setSelectedCallForSummary] = useState<VideoCall | null>(null)

  // Check for tab query parameter (from notifications)
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && (tabParam === 'contacts' || tabParam === 'history' || tabParam === 'scheduled')) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Fetch workspace members
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')

  // Fetch video calls (for history and scheduled tabs)
  const { data: videoCalls = [] } = useVideoCalls(workspaceId || '')

  // Fetch member presence status
  const { data: presenceData = [] } = useMembersPresence(workspaceId || '')

  // Create call mutation
  const createCall = useCreateVideoCall()

  // Create presence map for quick lookup
  const presenceMap = useMemo(() => {
    const map = new Map<string, { status: 'online' | 'offline' | 'away' | 'busy'; last_seen?: string }>()
    presenceData.forEach(p => {
      map.set(p.user_id, { status: p.status, last_seen: p.last_seen })
    })
    return map
  }, [presenceData])

  // Convert workspace members to contacts format with real presence data
  // Exclude the currently logged-in user from contacts
  const contacts: Contact[] = useMemo(() => {
    return workspaceMembers
      .filter(member => {
        const userId = member.user_id || member.id
        return userId !== user?.id // Exclude current user
      })
      .map(member => {
        const userId = member.user_id || member.id
        const presence = presenceMap.get(userId)

        return {
          id: userId,
          name: member.user?.name || member.user?.email || 'Unknown User',
          email: member.user?.email || '',
          avatar: member.user?.avatar,
          status: presence?.status || 'offline',
          lastSeen: presence?.last_seen || 'Unknown'
        }
      })
  }, [workspaceMembers, presenceMap, user?.id])

  // Get call history from real API - only show calls where current user is the host
  // For now, show all past calls (ended or active with actual_start_time) until proper call ending is implemented
  const endedCalls = useMemo(() => {
    console.log('🎥 Video Calls Data:', {
      totalCalls: videoCalls.length,
      currentUserId: user?.id,
      calls: videoCalls.map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        host_user_id: c.host_user_id,
        isHost: c.host_user_id === user?.id,
        hasStartTime: !!c.actual_start_time
      }))
    })

    // Show calls that have started (ended or active) where user is the host
    // Exclude scheduled calls that haven't started yet
    const filtered = videoCalls.filter(call =>
      (call.status === 'ended' || (call.status === 'active' && call.actual_start_time)) &&
      call.host_user_id === user?.id
    )

    console.log('🎥 Filtered History Calls:', {
      count: filtered.length,
      calls: filtered.map(c => ({ id: c.id, title: c.title, status: c.status }))
    })

    return filtered
  }, [videoCalls, user?.id])

  const scheduledCalls = useMemo(() => {
    // Show scheduled calls where user is in the invitees array
    if (!user?.id) return []

    const userId = user.id
    const filtered = videoCalls.filter(call => {
      if (call.status !== 'scheduled') return false

      // Check if user is in the invitees array
      if (call.invitees && Array.isArray(call.invitees)) {
        return call.invitees.includes(userId)
      }

      // Fallback: show if user is the host (for backwards compatibility)
      return call.host_user_id === userId
    })

    console.log('📅 Filtered Scheduled Calls:', {
      count: filtered.length,
      currentUserId: userId,
      calls: filtered.map(c => ({
        id: c.id,
        title: c.title,
        invitees: c.invitees,
        isInvited: c.invitees?.includes(userId)
      }))
    })

    return filtered
  }, [videoCalls, user?.id])

  // Filter contacts based on search and status
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms <= 0) {
      return '-' // Show dash for unknown/zero duration
    }
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  // Format timestamp as "time ago"
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp || timestamp <= 0) {
      return '-'
    }

    const now = Date.now()
    const diffMs = now - timestamp
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) {
      return intl.formatMessage({ id: 'common.justNow' }, { defaultMessage: 'Just now' })
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'busy': return 'bg-red-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  // Start an instant call
  const handleStartInstantCall = async (
    contactIds: string[],
    type: 'audio' | 'video',
    isGroupCall: boolean = false
  ) => {
    if (!workspaceId) {
      toast.error('Workspace not found')
      return
    }

    try {
      toast.loading('Starting call...')

      const call = await createCall.mutateAsync({
        workspaceId,
        data: {
          title: `${type === 'video' ? 'Video' : 'Audio'} Call`,
          description: `Instant ${type} call`,
          call_type: type,
          is_group_call: isGroupCall,
          participant_ids: contactIds,
          recording_enabled: false,
        }
      })

      toast.dismiss()
      toast.success('Call created!')

      // Open call in new window
      const callUrl = `/call/${workspaceId}/${call.id}`
      const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
      window.open(callUrl, `video-call-${call.id}`, windowFeatures)
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message || 'Failed to start call')
      console.error('Failed to start call:', error)
    }
  }

  // Join a meeting by code
  const handleJoinMeeting = () => {
    if (!meetingCode.trim()) {
      toast.error('Please enter a meeting code')
      return
    }

    // Clean up the meeting code - extract just the ID if it's a full URL
    let callId = meetingCode.trim()

    // Check if it's a full URL and extract the call ID
    if (callId.includes('/call/') || callId.includes('/video-calls/')) {
      const parts = callId.split('/')
      callId = parts[parts.length - 1]
    }

    // Open call in new window
    const callUrl = `/call/${workspaceId}/${callId}`
    const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    window.open(callUrl, `video-call-${callId}`, windowFeatures)

    // Clear the input
    setMeetingCode('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{intl.formatMessage({ id: 'modules.videoCallsApp.page.title' })}</h1>
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'modules.videoCallsApp.page.subtitle' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Brain className="h-3 w-3 mr-1" />
              AI Enhanced
            </Badge> */}
            <Button
              size="sm"
              className="btn-gradient-primary border-0"
              onClick={() => setShowScheduleMeetingModal(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.videoCallsApp.page.scheduleMeeting', defaultMessage: 'Schedule Meeting' })}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
          {[
            { key: 'contacts', labelId: 'modules.videoCallsApp.tabs.contacts', icon: Users, gradient: 'gradient-primary-active' },
            { key: 'history', labelId: 'modules.videoCallsApp.tabs.history', icon: History, gradient: 'gradient-primary-active' },
            { key: 'scheduled', labelId: 'modules.videoCallsApp.tabs.scheduled', icon: Calendar, gradient: 'gradient-primary-active' }
          ].map(({ key, labelId, icon: Icon, gradient }) => (
            <Button
              key={key}
              variant={activeTab === key ? undefined : "ghost"}
              size="sm"
              onClick={() => setActiveTab(key as 'contacts' | 'history' | 'scheduled')}
              className={activeTab === key ? `h-8 ${gradient} text-white border-0` : "h-8"}
            >
              <Icon className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: labelId })}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'contacts' && (
          <div className="flex flex-col items-center justify-center h-full p-6">
            {/* Meeting Hub - Centered Content */}
            <div className="max-w-md w-full space-y-8">
              {/* Quick Meeting Button */}
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full gradient-primary flex items-center justify-center shadow-lg">
                  <Video className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {intl.formatMessage({ id: 'modules.videoCallsApp.meetingHub.title', defaultMessage: 'Start or Join a Meeting' })}
                </h2>
                <p className="text-muted-foreground">
                  {intl.formatMessage({ id: 'modules.videoCallsApp.meetingHub.subtitle', defaultMessage: 'Create an instant meeting or join one with a code' })}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {/* Start Instant Meeting */}
                <Button
                  size="lg"
                  className="w-full h-14 text-lg btn-gradient-primary border-0 shadow-md"
                  onClick={() => handleStartInstantCall([], 'video', true)}
                >
                  <Video className="h-5 w-5 mr-3" />
                  {intl.formatMessage({ id: 'modules.videoCallsApp.meetingHub.quickMeeting', defaultMessage: 'Start an Instant Meeting' })}
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.videoCallsApp.meetingHub.or', defaultMessage: 'or' })}
                    </span>
                  </div>
                </div>

                {/* Join Meeting */}
                <div className="flex gap-2">
                  <Input
                    placeholder={intl.formatMessage({ id: 'modules.videoCallsApp.meetingHub.enterCode', defaultMessage: 'Enter meeting code' })}
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    className="h-12 text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && meetingCode.trim()) {
                        handleJoinMeeting()
                      }
                    }}
                  />
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-6"
                    disabled={!meetingCode.trim()}
                    onClick={handleJoinMeeting}
                  >
                    {intl.formatMessage({ id: 'modules.videoCallsApp.meetingHub.join', defaultMessage: 'Join' })}
                  </Button>
                </div>
              </div>

              {/* Schedule Meeting Link */}
              <div className="text-center pt-4">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setShowScheduleMeetingModal(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.videoCallsApp.meetingHub.scheduleLater', defaultMessage: 'Schedule a meeting for later' })}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6 space-y-4">
            {/* History Header with Actions */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{intl.formatMessage({ id: 'modules.videoCallsApp.history.title' })}</h2>
                <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.videoCallsApp.history.recentCalls' }, { count: endedCalls.length })}</p>
              </div>
              <Button
                size="sm"
                className="btn-gradient-primary border-0"
                onClick={() => setShowScheduleMeetingModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'modules.videoCallsApp.history.scheduleMeeting' })}
              </Button>
            </div>

            {endedCalls.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">{intl.formatMessage({ id: 'modules.videoCallsApp.history.noHistory' })}</h3>
                <p className="text-muted-foreground mb-4">
                  {intl.formatMessage({ id: 'modules.videoCallsApp.history.noHistoryMessage' })}
                </p>
              </div>
            ) : (
              endedCalls.map((call) => {
                // Calculate duration from actual times, fallback to scheduled times
                let duration = 0
                if (call.actual_end_time && call.actual_start_time) {
                  duration = new Date(call.actual_end_time).getTime() - new Date(call.actual_start_time).getTime()
                } else if (call.scheduled_end_time && call.scheduled_start_time) {
                  duration = new Date(call.scheduled_end_time).getTime() - new Date(call.scheduled_start_time).getTime()
                }

                // Get timestamp from actual start time, fallback to scheduled or created_at
                const timestamp = call.actual_start_time
                  ? new Date(call.actual_start_time).getTime()
                  : call.scheduled_start_time
                    ? new Date(call.scheduled_start_time).getTime()
                    : new Date(call.created_at).getTime()

                // Use participants length, fallback to invitees length
                const participantCount = call.participants?.length || call.invitees?.length || 0

                return (
              <Card key={call.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        call.call_type === 'video' ? 'bg-blue-500' : 'bg-green-500'
                      )}>
                        {call.call_type === 'video' ? (
                          <Video className="h-5 w-5 text-white" />
                        ) : (
                          <Phone className="h-5 w-5 text-white" />
                        )}
                      </div>

                      <div>
                        <div className="font-medium">{call.title}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(duration)}
                          </span>
                          <span>{formatTimestamp(timestamp)}</span>
                          {call.is_recording && (
                            <Badge variant="outline" className="text-xs">
                              <Brain className="h-3 w-3 mr-1" />
                              {intl.formatMessage({ id: 'modules.videoCallsApp.history.recorded' })}
                            </Badge>
                          )}
                          {call.is_group_call && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {intl.formatMessage({ id: 'modules.videoCallsApp.history.participants' }, { count: participantCount })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {call.participants && call.participants.length > 0 && (
                        <div className="flex -space-x-2">
                          {call.participants.slice(0, 3).map((participant) => (
                            <Avatar key={participant.id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                {(participant.display_name || participant.name || 'U')[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {call.participants.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs">+{call.participants.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-950"
                          onClick={() => setSelectedCallForSummary(call)}
                        >
                          <Brain className="h-4 w-4 mr-2" />
                          {intl.formatMessage({ id: 'modules.videoCallsApp.history.viewSummary', defaultMessage: 'View Summary' })}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const participantIds = call.participants?.map(p => p.user_id).filter(Boolean) || []
                            handleStartInstantCall(participantIds, call.call_type, call.is_group_call)
                          }}
                        >
                          <PhoneCall className="h-4 w-4 mr-2" />
                          {intl.formatMessage({ id: 'modules.videoCallsApp.history.callAgain' })}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowScheduleMeetingModal(true)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {intl.formatMessage({ id: 'modules.videoCallsApp.history.schedule' })}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="p-6">
            {scheduledCalls.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">{intl.formatMessage({ id: 'modules.videoCallsApp.scheduled.noScheduled' })}</h3>
                <p className="text-muted-foreground mb-4">
                  {intl.formatMessage({ id: 'modules.videoCallsApp.scheduled.noScheduledMessage' })}
                </p>
                <Button
                  className="btn-gradient-primary border-0"
                  onClick={() => setShowScheduleMeetingModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.videoCallsApp.scheduled.newMeeting' })}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledCalls.map((call) => {
                  const scheduledTime = call.scheduled_start_time ? new Date(call.scheduled_start_time).getTime() : 0
                  // Use participants length, fallback to invitees length
                  const participantCount = call.participants?.length || call.invitees?.length || 0

                  return (
                    <Card key={call.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              call.call_type === 'video' ? 'bg-blue-500' : 'bg-green-500'
                            )}>
                              {call.call_type === 'video' ? (
                                <Video className="h-5 w-5 text-white" />
                              ) : (
                                <Phone className="h-5 w-5 text-white" />
                              )}
                            </div>

                            <div>
                              <div className="font-medium">{call.title}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatTimestamp(scheduledTime)}
                                </span>
                                {call.is_group_call && (
                                  <Badge variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {participantCount}
                                  </Badge>
                                )}
                              </div>
                              {call.description && (
                                <div className="text-xs text-muted-foreground mt-1">{call.description}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="btn-gradient-primary border-0"
                              onClick={() => {
                                const callUrl = `/call/${workspaceId}/${call.id}`
                                const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
                                window.open(callUrl, `video-call-${call.id}`, windowFeatures)
                              }}
                            >
                              <Video className="h-4 w-4 mr-2" />
                              {intl.formatMessage({ id: 'modules.videoCallsApp.scheduled.join' })}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        open={showScheduleMeetingModal}
        onOpenChange={setShowScheduleMeetingModal}
      />

      {/* Meeting Summary Dialog */}
      <Dialog
        open={selectedCallForSummary !== null}
        onOpenChange={(open) => !open && setSelectedCallForSummary(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              {selectedCallForSummary?.title || 'Meeting Summary'}
            </DialogTitle>
          </DialogHeader>
          {selectedCallForSummary && (
            <MeetingSummaryView
              callId={selectedCallForSummary.id}
              callTitle={selectedCallForSummary.title}
              className="border-0 bg-transparent"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}