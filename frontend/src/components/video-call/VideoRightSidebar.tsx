/**
 * VideoRightSidebar Component - Video analytics and meeting history
 * Migrated from workspace-suite-frontend with clean architecture
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Video,
  Clock,
  BarChart3,
  FileText,
  Sparkles,
  Users,
  Calendar,
  Download,
  Copy,
  X,
  CheckCircle,
  Brain,
  Save,
  LogIn
} from 'lucide-react'
import { toast } from 'sonner'
import { useVideoCallAnalytics, useVideoCalls } from '@/lib/api/video-call-api'
import { videoCallSocket } from '@/lib/socket/video-call-socket'
import type {
  VideoRightSidebarProps,
  UserAnalytics,
  Meeting,
  Summary,
  Note
} from '@/types/video'
import type { CallEndedData, IncomingCallData, CallDeclinedData } from '@/lib/socket/video-call-socket'

export const VideoRightSidebar: React.FC<VideoRightSidebarProps> = () => {
  const intl = useIntl()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  // Fetch real analytics data
  const { data: analyticsData, refetch: refetchAnalytics } = useVideoCallAnalytics(workspaceId || '')

  // Fetch all video calls data (scheduled, active, ended)
  const { data: videoCalls = [], refetch: refetchVideoCalls } = useVideoCalls(workspaceId || '', {
    limit: 20  // Increased limit to show more meetings including scheduled ones
  })

  // Setup WebSocket listeners for real-time updates
  useEffect(() => {
    if (!videoCallSocket.isConnected()) {
      videoCallSocket.connect()
    }

    // Listen for call ended events
    const handleCallEnded = (data: CallEndedData) => {
      console.log('[VideoRightSidebar] Call ended:', data)
      // Refetch both video calls and analytics
      refetchVideoCalls()
      refetchAnalytics()
      toast.info('A video call has ended')
    }

    // Listen for incoming call events
    const handleIncomingCall = (data: IncomingCallData) => {
      console.log('[VideoRightSidebar] Incoming call:', data)
      // Refetch video calls to show new call
      refetchVideoCalls()
    }

    // Listen for call declined events
    const handleCallDeclined = (data: CallDeclinedData) => {
      console.log('[VideoRightSidebar] Call declined:', data)
      // Refetch video calls to update status
      refetchVideoCalls()
      refetchAnalytics()
    }

    // Register event listeners
    videoCallSocket.on('call:ended', handleCallEnded)
    videoCallSocket.on('call:incoming', handleIncomingCall)
    videoCallSocket.on('call:declined', handleCallDeclined)

    // Cleanup on unmount
    return () => {
      videoCallSocket.off('call:ended', handleCallEnded)
      videoCallSocket.off('call:incoming', handleIncomingCall)
      videoCallSocket.off('call:declined', handleCallDeclined)
    }
  }, [refetchVideoCalls, refetchAnalytics])

  // Transform analytics data to component format
  const userAnalytics: UserAnalytics = useMemo(() => {
    if (!analyticsData) {
      return {
        totalMeetings: 0,
        totalDuration: 0,
        avgMeetingDuration: 0,
        meetingsThisWeek: 0,
        meetingsThisMonth: 0,
        totalParticipantsInteracted: 0,
        aiNotesGenerated: 0,
        summariesCreated: 0
      }
    }

    return {
      totalMeetings: analyticsData.total_meetings,
      totalDuration: analyticsData.total_time_seconds * 1000, // Convert to milliseconds
      avgMeetingDuration: analyticsData.avg_duration_seconds * 1000, // Convert to milliseconds
      meetingsThisWeek: analyticsData.this_week,
      meetingsThisMonth: analyticsData.total_meetings, // Assuming monthly = total for now
      totalParticipantsInteracted: 0, // Not provided by API yet
      aiNotesGenerated: 0, // Not provided by API yet
      summariesCreated: 0 // Not provided by API yet
    }
  }, [analyticsData])

  // Transform video calls to meetings format
  const recentMeetings: Meeting[] = useMemo(() => {
    return videoCalls
      .map(call => {
        // Use actual_start_time if available, otherwise use scheduled_start_time
        const startTime = call.actual_start_time
          ? new Date(call.actual_start_time).getTime()
          : call.scheduled_start_time
            ? new Date(call.scheduled_start_time).getTime()
            : Date.now()

        // Calculate duration for ended calls, estimate for others
        let duration = 0
        if (call.status === 'completed' && call.actual_start_time && call.actual_end_time) {
          duration = new Date(call.actual_end_time).getTime() - new Date(call.actual_start_time).getTime()
        } else if (call.scheduled_start_time && call.scheduled_end_time) {
          // For scheduled calls, calculate from scheduled times
          duration = new Date(call.scheduled_end_time).getTime() - new Date(call.scheduled_start_time).getTime()
        } else {
          // Default to 30 minutes for calls without duration info
          duration = 30 * 60 * 1000
        }

        // Map status to display status
        let displayStatus: 'completed' | 'missed' | 'declined' = 'completed'
        if (call.status === 'scheduled') {
          displayStatus = 'completed' // Will be shown differently in UI
        } else if (call.status === 'cancelled') {
          displayStatus = 'declined'
        }

        // Get participants from either participants array or invitees array
        // Keep full participant objects with name and avatar
        const participantObjects = call.participants?.map(p => ({
          name: p.display_name || p.name || 'Unknown',
          avatar: p.avatar || null,
          display_name: p.display_name || p.name
        })) || []

        // Use invitees count if participants is empty (fallback)
        const participantCount = participantObjects.length > 0
          ? participantObjects.length
          : (call.invitees?.length || 0)

        return {
          id: call.id,
          title: call.title,
          duration,
          timestamp: startTime,
          participants: participantObjects.length > 0 ? participantObjects : Array(call.invitees?.length || 0).fill('Participant'),
          hasNotes: !!call.metadata?.transcription,
          hasSummary: !!call.metadata?.summary,
          status: call.status as any || displayStatus
        }
      })
      // Sort by timestamp (most recent first)
      .sort((a, b) => b.timestamp - a.timestamp)
      // Take top 10
      .slice(0, 10)
  }, [videoCalls])

  // Transform video calls with transcriptions to notes
  const recentNotes: Note[] = useMemo(() => {
    return videoCalls
      .filter(call => call.metadata?.transcription)
      .slice(0, 5)
      .map(call => {
        const startTime = call.actual_start_time ? new Date(call.actual_start_time).getTime() : 0
        const endTime = call.actual_end_time ? new Date(call.actual_end_time).getTime() : 0
        const duration = endTime - startTime

        // Get participants from either participants array or invitees array
        const participantNames = call.participants?.map(p => p.display_name || p.name || 'Unknown') || []

        return {
          id: call.id,
          title: call.title,
          content: call.metadata?.transcription || '',
          timestamp: startTime,
          duration,
          participants: participantNames.length > 0 ? participantNames : Array(call.invitees?.length || 0).fill('Participant'),
          confidence: call.metadata?.transcription_confidence || 0.92
        }
      })
  }, [videoCalls])

  // Transform video calls with summaries to summaries
  const recentSummaries: Summary[] = useMemo(() => {
    return videoCalls
      .filter(call => call.metadata?.summary)
      .slice(0, 5)
      .map(call => {
        const startTime = call.actual_start_time ? new Date(call.actual_start_time).getTime() : 0
        const endTime = call.actual_end_time ? new Date(call.actual_end_time).getTime() : 0
        const duration = endTime - startTime

        // Extract key points from summary if available, otherwise create from summary
        const keyPoints = call.metadata?.key_points ||
          (call.metadata?.summary ? call.metadata.summary.split('\n').filter((line: string) => line.trim()).slice(0, 3) : [])

        // Get participants from either participants array or invitees array
        const participantNames = call.participants?.map(p => p.display_name || p.name || 'Unknown') || []

        return {
          id: call.id,
          title: call.title,
          summary: call.metadata?.summary || '',
          keyPoints,
          timestamp: startTime,
          duration,
          participants: participantNames.length > 0 ? participantNames : Array(call.invitees?.length || 0).fill('Participant')
        }
      })
  }, [videoCalls])

  // Utility functions
  const formatDuration = useCallback((ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }, [])

  const formatAnalyticsDuration = useCallback((ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }, [])

  const formatTimeAgo = useCallback((timestamp: number) => {
    if (!timestamp || timestamp <= 0) return '-'

    const diff = Date.now() - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    if (seconds > 0) return `${seconds}s ago`
    return 'Just now'
  }, [])

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-6">

        {/* Analytics Dashboard */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {intl.formatMessage({ id: 'modules.videoCallsApp.analytics.title' })}
          </h3>
          
          <div className="space-y-3 mb-4">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950 dark:to-indigo-950 dark:border-blue-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">{intl.formatMessage({ id: 'modules.videoCallsApp.analytics.totalMeetings' })}</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{userAnalytics.totalMeetings}</p>
                  </div>
                  <Video className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:border-green-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-900 dark:text-green-100">{intl.formatMessage({ id: 'modules.videoCallsApp.analytics.totalTime' })}</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatAnalyticsDuration(userAnalytics.totalDuration)}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 dark:from-purple-950 dark:to-violet-950 dark:border-purple-800">
                <CardContent className="p-2">
                  <div className="text-center">
                    <p className="text-xs font-medium text-purple-900 dark:text-purple-100">{intl.formatMessage({ id: 'modules.videoCallsApp.analytics.thisWeek' })}</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {userAnalytics.meetingsThisWeek}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 dark:from-orange-950 dark:to-amber-950 dark:border-orange-800">
                <CardContent className="p-2">
                  <div className="text-center">
                    <p className="text-xs font-medium text-orange-900 dark:text-orange-100">{intl.formatMessage({ id: 'modules.videoCallsApp.analytics.avgDuration' })}</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatAnalyticsDuration(userAnalytics.avgMeetingDuration)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Recent Meetings */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-green-500" />
            {intl.formatMessage({ id: 'modules.videoCallsApp.analytics.recentMeetings' })}
          </h3>
          
          <div className="space-y-3">
            {recentMeetings.map((meeting) => (
              <Card key={meeting.id} className="bg-muted/50 border-border hover:bg-muted/70 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{meeting.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(meeting.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(meeting.duration)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {meeting.participants.length} participants
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <Badge
                      variant={
                        meeting.status === 'ended' ? 'default' :
                        meeting.status === 'active' ? 'destructive' :
                        meeting.status === 'scheduled' ? 'secondary' :
                        'outline'
                      }
                      className={
                        meeting.status === 'ended' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        meeting.status === 'active' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        meeting.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        'bg-gray-500/20 text-gray-300 border-gray-500/30'
                      }
                    >
                      {meeting.status === 'ended' ? 'Completed' :
                       meeting.status === 'active' ? 'Active' :
                       meeting.status === 'scheduled' ? 'Scheduled' :
                       meeting.status === 'cancelled' ? 'Cancelled' :
                       meeting.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-green-500 hover:text-green-600"
                      onClick={() => setSelectedMeeting(meeting)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Summaries */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {intl.formatMessage({ id: 'modules.videoCallsApp.analytics.recentSummaries' })}
          </h3>
          
          <div className="space-y-3">
            {recentSummaries.map((summary) => (
              <Card key={summary.id} className="bg-muted/50 border-border hover:bg-muted/70 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{summary.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(summary.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{summary.summary}</p>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {summary.keyPoints.length} key points
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {summary.participants.length} participants
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDuration(summary.duration)} meeting</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-yellow-500 hover:text-yellow-600"
                      onClick={() => setSelectedSummary(summary)}
                    >
                      View Full
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Notes */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            {intl.formatMessage({ id: 'modules.videoCallsApp.analytics.recentNotes' })}
          </h3>
          
          <div className="space-y-3">
            {recentNotes.map((note) => (
              <Card key={note.id} className="bg-muted/50 border-border hover:bg-muted/70 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{note.title}</span>
                      <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {Math.round(note.confidence * 100)}% AI
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(note.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{note.content}</p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDuration(note.duration)} • {note.participants.length} participants</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-blue-500 hover:text-blue-600"
                      onClick={() => setSelectedNote(note)}
                    >
                      View Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        </div>
      </div>

      {/* Meeting Details Dialog */}
      <Dialog open={selectedMeeting !== null} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-500" />
              Meeting Details
            </DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedMeeting.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-medium">{formatDuration(selectedMeeting.duration)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <div className="font-medium">
                      {new Date(selectedMeeting.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <div className="font-medium">
                      {new Date(selectedMeeting.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedMeeting.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participants ({selectedMeeting.participants.length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedMeeting.participants.map((participant: any, index: number) => {
                    // Handle both string (legacy) and object (new API format) participants
                    const isObject = typeof participant === 'object' && participant !== null;
                    const participantName = isObject ? (participant.display_name || participant.name || 'Unknown') : participant;
                    const participantAvatar = isObject ? participant.avatar : null;
                    const initials = participantName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        {participantAvatar && participantAvatar !== 'null' ? (
                          <img
                            src={participantAvatar}
                            alt={participantName}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium';
                              fallback.textContent = initials;
                              (e.target as HTMLImageElement).parentElement?.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {initials}
                          </div>
                        )}
                        <span className="text-sm font-medium truncate">{participantName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                {/* Show Join button for scheduled/active meetings */}
                {(selectedMeeting.status === 'scheduled' || selectedMeeting.status === 'active') && (
                  <Button onClick={() => {
                    setSelectedMeeting(null)
                    // Open video call in new window
                    const callUrl = `/call/${workspaceId}/${selectedMeeting.id}`
                    const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
                    window.open(callUrl, `video-call-${selectedMeeting.id}`, windowFeatures)
                  }}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Join Meeting
                  </Button>
                )}

                {/* Show Download Recording only for ended meetings with recordings */}
                {selectedMeeting.status === 'ended' && selectedMeeting.hasNotes && (
                  <Button variant="outline" onClick={() => {
                    toast.success('Meeting recording downloaded')
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Recording
                  </Button>
                )}

                <Button variant="outline" onClick={() => {
                  const participantNames = selectedMeeting.participants.map(p =>
                    typeof p === 'string' ? p : p.name
                  ).join(', ')
                  const details = `Meeting: ${selectedMeeting.title}\nDate: ${new Date(selectedMeeting.timestamp).toLocaleString()}\nDuration: ${formatDuration(selectedMeeting.duration)}\nParticipants: ${participantNames}`
                  navigator.clipboard.writeText(details)
                  toast.success('Meeting details copied to clipboard')
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={selectedSummary !== null} onOpenChange={() => setSelectedSummary(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Meeting Summary
            </DialogTitle>
          </DialogHeader>
          {selectedSummary && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedSummary.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedSummary.timestamp).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(selectedSummary.duration)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedSummary.participants.length} participants
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-3">Meeting Summary</h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">{selectedSummary.summary}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-3">Key Points</h4>
                <div className="space-y-2">
                  {selectedSummary.keyPoints.map((point: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-yellow-500/20 text-yellow-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                        {index + 1}
                      </div>
                      <span className="text-sm">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  toast.success('Summary downloaded as PDF')
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button onClick={() => {
                  const summaryText = `Meeting: ${selectedSummary.title}\nDate: ${new Date(selectedSummary.timestamp).toLocaleDateString()}\nDuration: ${formatDuration(selectedSummary.duration)}\n\nSummary:\n${selectedSummary.summary}\n\nKey Points:\n${selectedSummary.keyPoints.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}\n\nParticipants: ${selectedSummary.participants.join(', ')}`
                  navigator.clipboard.writeText(summaryText)
                  toast.success('Summary copied to clipboard')
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Summary
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Note View Dialog */}
      <Dialog open={selectedNote !== null} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Meeting Note
            </DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{selectedNote.title}</h3>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    {Math.round(selectedNote.confidence * 100)}% AI Accuracy
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedNote.timestamp).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(selectedNote.duration)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedNote.participants.length} participants
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-500" />
                  AI-Generated Content
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedNote.content}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-3">Meeting Context</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">AI Confidence Score</span>
                    <div className="mt-1">
                      <Progress value={selectedNote.confidence * 100} className="h-2" />
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {Math.round(selectedNote.confidence * 100)}% accuracy
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Generated</span>
                    <div className="text-sm font-medium mt-1">
                      {formatTimeAgo(selectedNote.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    toast.success(`Note "${selectedNote.title}" saved to Notes app`)
                  }}>
                    <Save className="h-4 w-4 mr-2" />
                    Save to Notes
                  </Button>
                  <Button variant="outline" onClick={() => {
                    toast.success('Note exported as document')
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <Button onClick={() => {
                  const noteText = `Meeting Note: ${selectedNote.title}\nDate: ${new Date(selectedNote.timestamp).toLocaleDateString()}\nDuration: ${formatDuration(selectedNote.duration)}\nAI Confidence: ${Math.round(selectedNote.confidence * 100)}%\n\nContent:\n${selectedNote.content}\n\nParticipants: ${selectedNote.participants.join(', ')}`
                  navigator.clipboard.writeText(noteText)
                  toast.success('Note copied to clipboard')
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}