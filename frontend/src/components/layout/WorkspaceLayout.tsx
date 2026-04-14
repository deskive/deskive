import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { NavigationRail } from './NavigationRail'
import type { ViewType } from './NavigationRail'
import { LeftSidebar } from './LeftSidebar'
import { MainContent } from './MainContent'
import { RightSidebar } from './RightSidebar'
import { DeskiAssistantModal, DeskiAssistantFloatingButton } from '../ai/DeskiAssistantModal'
import { WorkspaceHeader } from './WorkspaceHeader'
import { VideoCallManager } from '@/components/video-call'
import { WebRTCCallWrapper } from '@/components/video-call/WebRTCCallWrapper'
import { IncomingCallModal } from '@/components/video-call/IncomingCallModal'
import { MemberProfilePanel } from '@/components/workspace/MemberProfilePanel'
import { useVideoCallSocket } from '@/hooks/useVideoCallSocket'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { FilesSidebarProvider } from '../../contexts/FilesSidebarContext'
import { RightSidebarProvider, useRightSidebar } from '../../contexts/RightSidebarContext'
import { useQueries } from '@tanstack/react-query'
import { useProjects, projectService, projectKeys, type Project } from '@/lib/api/projects-api'
import { useQueryClient } from '@tanstack/react-query'
import { useDashboard } from '@/lib/api/dashboard-api'
import { getRingtone } from '@/utils/ringtone'
import { useNavigate } from 'react-router-dom'

export interface SidebarStates {
  left: boolean
  right: boolean
  navExpanded: boolean
}

interface WorkspaceLayoutProps {
  children?: React.ReactNode
}

function WorkspaceLayoutInner({ children }: WorkspaceLayoutProps) {
 

  const location = useLocation()
  const navigate = useNavigate()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user } = useAuth()
  const { isMinimized, toggleMinimized, chatData } = useRightSidebar()
  const { incomingCall, clearIncomingCall, declineCall, broadcastCallAccepted, broadcastCallDeclined } = useVideoCallSocket()
  const { isOpen: isMemberProfileOpen, selectedMember, closeMemberProfile } = useMemberProfile()
  const queryClient = useQueryClient()
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [sidebarStates, setSidebarStates] = useState<SidebarStates>({
    left: true,
    right: true,
    navExpanded: false,
  })
  const [isNavHovered, setIsNavHovered] = useState(false)
  const [originalRightState, setOriginalRightState] = useState(true)
  const [isTabActive, setIsTabActive] = useState(true)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  // Ref to track the incoming call popup window
  const incomingCallWindowRef = useRef<Window | null>(null)

  // Ref to track the current incoming call ID (for notification cleanup)
  const currentIncomingCallIdRef = useRef<string | null>(null)

  // Use refs to track state without causing re-renders in interval
  const sidebarStatesRef = useRef(sidebarStates)
  const originalRightStateRef = useRef(originalRightState)

  // Track if tab is active/visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isActive = !document.hidden
      setIsTabActive(isActive)
      console.log('👁️ [WorkspaceLayout] Tab visibility changed:', isActive ? 'Active' : 'Inactive')
    }

    const handleFocus = () => {
      setIsTabActive(true)
      console.log('👁️ [WorkspaceLayout] Window focused')
    }

    const handleBlur = () => {
      setIsTabActive(false)
      console.log('👁️ [WorkspaceLayout] Window blurred')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Request notification permission on mount (with user interaction)
  useEffect(() => {
   
    if ('Notification' in window) {

      // On macOS, we need to request permission from a user gesture
      // We'll request it on first user interaction
      if (Notification.permission === 'default') {

        // Add a one-time click listener to request permission
        const requestPermissionOnClick = () => {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              // no-op
            } else if (permission === 'denied') {
              // no-op
            }
          }).catch(_err => {
            // no-op
          })

          // Remove listener after first request
          document.removeEventListener('click', requestPermissionOnClick)
        }

        document.addEventListener('click', requestPermissionOnClick, { once: true })
      } else if (Notification.permission === 'granted') {
        console.log('✅ [WorkspaceLayout] Notification permission already granted')
      } else {
        console.log('❌ [WorkspaceLayout] Notification permission denied')
      }
    } else {
      console.log('❌ [WorkspaceLayout] Notification API not supported in this browser')
    }
  }, [])

  // Update refs when state changes
  useEffect(() => {
    sidebarStatesRef.current = sidebarStates
    originalRightStateRef.current = originalRightState
  }, [sidebarStates, originalRightState])

  // Extract current view from URL
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean)

    // Find the view segment (it comes after /workspaces/:workspaceId/)
    const workspaceIndex = pathSegments.indexOf('workspaces')
    const viewSegment = workspaceIndex >= 0 && pathSegments[workspaceIndex + 2]
      ? pathSegments[workspaceIndex + 2]
      : 'dashboard'

    // Map URL segments to ViewType
    const viewMap: Record<string, ViewType> = {
      'dashboard': 'dashboard',
      'chat': 'chat',
      'email': 'email',
      'projects': 'projects',
      'notes': 'notes',
      'calendar': 'calendar',
      'video-calls': 'video',
      'files': 'files',
      'search': 'search',
      'settings': 'settings',
      'integrations': 'integrations',
      'analytics': 'analytics',
      'monitoring': 'monitoring',
      'notifications': 'dashboard',
      'apps': 'apps',
      'more': 'more',
    }

    const view = viewMap[viewSegment] || 'dashboard'
    setCurrentView(view)

    // Hide right sidebar for settings, dashboard, search, apps, and more views to provide more space
    // Hide left sidebar for dashboard, apps, more, and email views (full-width content or own sidebar)
    // Always show left sidebar for settings (user needs to see the settings menu)
    if (view === 'settings' || view === 'dashboard' || view === 'search' || view === 'apps' || view === 'more' || view === 'email') {
      setSidebarStates(prev => ({
        ...prev,
        right: view === 'email' ? true : false, // Keep right sidebar for email
        left: view === 'settings' ? true : (view === 'dashboard' || view === 'apps' || view === 'more' || view === 'email') ? false : prev.left // Always show left sidebar for settings
      }))
      setOriginalRightState(view === 'email' ? true : false)
    } else {
      // Restore sidebars for other views
      setSidebarStates(prev => ({
        ...prev,
        right: true,
        left: true
      }))
      setOriginalRightState(true)
    }
  }, [location])

  const toggleSidebar = (side: 'left' | 'right') => {
    setSidebarStates(prev => {
      const newState = !prev[side]
      // If toggling right sidebar, update the original state so hover behavior respects it
      if (side === 'right' && !isNavHovered) {
        setOriginalRightState(newState)
      }
      return {
        ...prev,
        [side]: newState
      }
    })
  }

  const toggleNavExpanded = () => {
    setSidebarStates(prev => ({
      ...prev,
      navExpanded: !prev.navExpanded
    }))
  }

  const toggleAIModal = () => {
    setIsAIModalOpen(prev => !prev)
  }

  // Handle navigation rail hover
  const handleNavHover = (isHovered: boolean) => {
    setIsNavHovered(isHovered)

    if (isHovered) {
      // Store the original right sidebar state and hide it
      setOriginalRightState(sidebarStates.right)
      setSidebarStates(prev => ({
        ...prev,
        right: false
      }))
    } else {
      // Restore the original right sidebar state with a slight delay for smoother UX
      setTimeout(() => {
        setSidebarStates(prev => ({
          ...prev,
          right: originalRightState
        }))
      }, 100)
    }
  }

  // Monitor LiveKit chat state and collapse right sidebar when chat opens (video view only)
  useEffect(() => {
    if (currentView !== 'video') return

    const checkLiveKitChatState = () => {
      const chatContainer = document.querySelector('.lk-chat') as HTMLElement
      if (chatContainer) {
        const isChatOpen = !chatContainer.classList.contains('lk-chat-hidden')

        // Use refs to get current state without adding to dependencies
        const currentSidebarStates = sidebarStatesRef.current
        const currentOriginalRightState = originalRightStateRef.current

        // If chat is open and right sidebar is visible, collapse it
        if (isChatOpen && currentSidebarStates.right) {
          console.log('🔄 LiveKit chat opened, collapsing right sidebar')
          setSidebarStates(prev => ({
            ...prev,
            right: false
          }))
        }
        // If chat is closed and right sidebar was originally visible, restore it
        else if (!isChatOpen && !currentSidebarStates.right && currentOriginalRightState) {
          console.log('🔄 LiveKit chat closed, restoring right sidebar')
          setSidebarStates(prev => ({
            ...prev,
            right: true
          }))
        }
      }
    }

    // Check periodically for LiveKit chat state changes
    const interval = setInterval(checkLiveKitChatState, 500)
    return () => clearInterval(interval)
  }, [currentView]) // Only depend on currentView, not sidebarStates or originalRightState

  // Check if user is currently in an active call page
  const isInActiveCall = location.pathname.includes('/video-calls/') &&
                         !location.pathname.endsWith('/video-calls')

  // Close browser notification when incoming call is cleared (e.g., call ended/cancelled)
  useEffect(() => {
    const previousCallId = currentIncomingCallIdRef.current

    // If there was a previous call but now incoming call is null, close the notification
    if (previousCallId && !incomingCall) {
      console.log('🔕 [WorkspaceLayout] Closing browser notification for call:', previousCallId)

      // Close any popup window
      if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
        incomingCallWindowRef.current.close()
        incomingCallWindowRef.current = null
      }

      // Close browser notification by creating a dummy notification with the same tag and closing it
      // This works because notifications with the same tag replace each other
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          // Create a silent notification with same tag, then immediately close it
          const notification = new Notification('', {
            tag: previousCallId,
            silent: true,
          })
          notification.close()
          console.log('✅ [WorkspaceLayout] Browser notification closed')
        } catch (err) {
          console.error('❌ [WorkspaceLayout] Failed to close notification:', err)
        }
      }

      currentIncomingCallIdRef.current = null
    }

    // Update ref with current call ID
    if (incomingCall) {
      currentIncomingCallIdRef.current = incomingCall.callId
    }
  }, [incomingCall])

  // Hybrid incoming call handling: Modal when tab active, Notification+Popup when inactive
  useEffect(() => {
    if (incomingCall && !isInActiveCall) {
      console.log('📞 [WorkspaceLayout] Incoming call detected, tab active:', isTabActive)

      // If tab is INACTIVE, use notification + popup window approach
      if (!isTabActive) {
        // Close any existing incoming call window first
        if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
          incomingCallWindowRef.current.close()
        }

        // Build query parameters for the popup window
        const params = new URLSearchParams({
          callId: incomingCall.callId,
          workspaceId: workspaceId || '',
          callerName: incomingCall.from.name,
          callerAvatar: incomingCall.from.avatar || '',
          callType: incomingCall.callType,
          isGroupCall: String(incomingCall.isGroupCall),
        })

        const notificationUrl = `/incoming-call?${params.toString()}`
        const windowFeatures = 'width=400,height=600,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,alwaysRaised=yes'

        // Function to open the popup window
        const openCallWindow = () => {
          const callWindow = window.open(notificationUrl, `incoming-call-${incomingCall.callId}`, windowFeatures)
          incomingCallWindowRef.current = callWindow

          if (callWindow) {
            callWindow.focus()
            callWindow.focus() // Double focus to ensure it comes to front
            console.log('📞 [WorkspaceLayout] Incoming call popup window opened:', incomingCall.callId)
          } else {
            console.warn('⚠️ [WorkspaceLayout] Popup blocked by browser')
          }
          return callWindow
        }

        // Show browser notification (works even when tab is inactive)
        console.log('📢 [WorkspaceLayout] Attempting to show browser notification...')
        console.log('📢 [WorkspaceLayout] Notification API:', 'Notification' in window)
        console.log('📢 [WorkspaceLayout] Permission:', 'Notification' in window ? Notification.permission : 'N/A')

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            console.log('📢 [WorkspaceLayout] Creating notification for call:', incomingCall.callId)

            const notificationOptions = {
              body: incomingCall.isGroupCall ? 'Group call' : 'Direct call',
              icon: incomingCall.from.avatar || 'https://cdn.deskive.com/deskive/logo.png',
              tag: incomingCall.callId,
              requireInteraction: true, // Notification stays until user interacts
              badge: 'https://cdn.deskive.com/deskive/logo.png',
              // macOS-specific: Add vibration pattern for mobile
              vibrate: [200, 100, 200],
              // Add timestamp for macOS
              timestamp: Date.now(),
            }

            console.log('📢 [WorkspaceLayout] Notification options:', notificationOptions)

            const notification = new Notification(
              `Incoming ${incomingCall.callType} call from ${incomingCall.from.name}`,
              notificationOptions
            )

            console.log('✅ [WorkspaceLayout] Notification created successfully')

            // When user clicks the notification, open/focus the popup window
            notification.onclick = () => {
              console.log('👆 [WorkspaceLayout] Notification clicked')
              notification.close()

              // If popup exists and is open, focus it
              if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
                incomingCallWindowRef.current.focus()
              } else {
                // Otherwise, open a new popup
                openCallWindow()
              }

              // Focus the main window too
              window.focus()
            }

            notification.onerror = (error) => {
              console.error('❌ [WorkspaceLayout] Notification error:', error)
            }

            notification.onshow = () => {
              console.log('✅ [WorkspaceLayout] Notification shown successfully')
            }

            console.log('📢 [WorkspaceLayout] Browser notification displayed (tab inactive)')
          } catch (err) {
            console.error('❌ [WorkspaceLayout] Failed to create notification:', err)
          }
        } else if ('Notification' in window && Notification.permission === 'default') {
          console.log('⚠️ [WorkspaceLayout] Notification permission is default - requesting now')
          // Request permission if not granted
          Notification.requestPermission().then(permission => {
            console.log('📢 [WorkspaceLayout] Notification permission after request:', permission)
            if (permission === 'granted') {
              console.log('💡 [WorkspaceLayout] Permission granted! Notification will work on next call')
            }
          })
        } else if ('Notification' in window && Notification.permission === 'denied') {
          console.log('❌ [WorkspaceLayout] Notification permission DENIED by user')
          console.log('💡 [WorkspaceLayout] User needs to enable notifications in browser settings')
        } else {
          console.log('❌ [WorkspaceLayout] Notification API not available')
        }
      }
      // If tab is ACTIVE, the modal will be shown (handled below in JSX)
      else {
        console.log('✅ [WorkspaceLayout] Tab is active - showing IncomingCallModal')
      }
    }
  }, [incomingCall, workspaceId, isInActiveCall, isTabActive])

  // Listen for messages from the incoming call popup window (when tab was inactive)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check: only accept messages from same origin
      if (event.origin !== window.location.origin) return

      const { type, callId, settings } = event.data

      if (type === 'CALL_ACCEPTED' && callId === incomingCall?.callId && incomingCall) {
        console.log('✅ [WorkspaceLayout] Call accepted via popup window')

        // Broadcast to other tabs that this call was accepted
        broadcastCallAccepted(callId)

        // Store media settings if provided
        if (settings) {
          sessionStorage.setItem('callMediaSettings', JSON.stringify(settings))
          console.log('📹 [WorkspaceLayout] Media settings stored:', settings)
        }

        // Clear incoming call state
        clearIncomingCall()

        // Close the incoming call popup window
        if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
          incomingCallWindowRef.current.close()
        }
      } else if (type === 'CALL_DECLINED' && callId === incomingCall?.callId && incomingCall) {
        console.log('❌ [WorkspaceLayout] Call declined via popup window')

        // Broadcast to other tabs that this call was declined
        broadcastCallDeclined(callId)

        // Send decline notification to caller via WebSocket
        declineCall(callId, incomingCall.from.id)

        // Clear incoming call state
        clearIncomingCall()

        // Close the incoming call popup window
        if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
          incomingCallWindowRef.current.close()
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [incomingCall, clearIncomingCall, declineCall, broadcastCallAccepted, broadcastCallDeclined])

  // Handle accepting call from modal (when tab is active)
  const handleAcceptCallFromModal = (settings?: { micEnabled: boolean; cameraEnabled: boolean }) => {
    if (incomingCall) {
      console.log('✅ [WorkspaceLayout] Call accepted via modal')

      // Broadcast to other tabs that this call was accepted
      broadcastCallAccepted(incomingCall.callId)

      // Stop ringtone
      try {
        const ringtone = getRingtone()
        ringtone.stop()
        console.log('🔇 [WorkspaceLayout] Ringtone stopped on call accept')
      } catch (err) {
        console.error('❌ [WorkspaceLayout] Failed to stop ringtone:', err)
      }

      // Store media settings in sessionStorage to be used by LiveKitVideoCall
      if (settings) {
        sessionStorage.setItem('callMediaSettings', JSON.stringify(settings))
        console.log('📹 [WorkspaceLayout] Media settings stored:', settings)
      }

      // Open call in new window
      const callUrl = `/call/${workspaceId}/${incomingCall.callId}`
      const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
      window.open(callUrl, `video-call-${incomingCall.callId}`, windowFeatures)

      // Clear incoming call state
      clearIncomingCall()
    }
  }

  // Handle declining call from modal (when tab is active)
  const handleDeclineCallFromModal = () => {
    if (!incomingCall) return

    console.log('❌ [WorkspaceLayout] Call declined via modal')

    // Broadcast to other tabs that this call was declined
    broadcastCallDeclined(incomingCall.callId)

    // Send decline notification to caller via WebSocket
    declineCall(incomingCall.callId, incomingCall.from.id)

    // Stop ringtone
    try {
      const ringtone = getRingtone()
      ringtone.stop()
      console.log('🔇 [WorkspaceLayout] Ringtone stopped on call decline from modal')
    } catch (err) {
      console.error('❌ [WorkspaceLayout] Failed to stop ringtone:', err)
    }

    // Clear incoming call state
    clearIncomingCall()
    toast.info('Call declined')
  }

  // Fetch projects data for right sidebar (only when in projects view)
  const { data: projectsResponse } = useProjects(
    (workspaceId && currentView === 'projects') ? workspaceId : ''
  )

  // Fetch dashboard data for right sidebar (only when in dashboard view)
  const { data: dashboardResponse } = useDashboard(
    (workspaceId && currentView === 'dashboard') ? workspaceId : '',
    currentView === 'dashboard' ? {} : undefined
  )

  const projects = Array.isArray(projectsResponse)
    ? projectsResponse
    : (projectsResponse?.data || [])

  // Fetch tasks for all projects in parallel
  const taskQueries = useQueries({
    queries: projects.map(project => ({
      queryKey: projectKeys.tasks(project.id),
      queryFn: () => projectService.getTasks(workspaceId!, project.id),
      enabled: !!workspaceId && !!project.id && currentView === 'projects',
      staleTime: 60 * 1000,
    }))
  })

  // Extract stable data from taskQueries to prevent infinite re-renders
  // taskQueries array reference changes on every render, but we only care about the actual data
  // We use JSON.stringify to create a stable dependency that only changes when actual data changes
  const taskQueriesDataString = JSON.stringify(taskQueries.map(q => q.data))
  const taskQueriesData = useMemo(() => {
    return taskQueries.map(query => query.data)
  }, [taskQueriesDataString]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prepare projects data with calculated metrics for right sidebar
  const projectsData = useMemo(() => {
    if (currentView !== 'projects' || !workspaceId) return undefined

    // Flatten all tasks
    const allTasks = taskQueriesData
      .filter(data => data)
      .flatMap(data => data || [])

    // Calculate averageProgress for each project based on task completion
    const projectsWithMetrics = projects.map((project, index) => {
      const projectTasks = taskQueriesData[index] || []

      // Get the last stage (completed stage)
      const lastStageId = project.kanban_stages && project.kanban_stages.length > 0
        ? project.kanban_stages.sort((a: any, b: any) => b.order - a.order)[0]?.id
        : 'done'

      const totalTasks = projectTasks.length

      let averageProgress = 0
      if (totalTasks > 0) {
        // Get kanban stages sorted by order
        const stages = project.kanban_stages && project.kanban_stages.length > 0
          ? project.kanban_stages.sort((a: any, b: any) => a.order - b.order)
          : [
              { id: 'todo', order: 1 },
              { id: 'in_progress', order: 2 },
              { id: 'done', order: 3 }
            ]

        const totalStages = stages.length

        // Calculate progress for each task and sum them up
        const totalProgress = projectTasks.reduce((sum, task) => {
          const currentStage = stages.findIndex((stage: any) => stage.id === task.status)
          if (currentStage === -1) return sum // Task in unknown stage

          // Progress is based on which stage the task is in
          const taskProgress = ((currentStage + 1) / totalStages) * 100
          return sum + taskProgress
        }, 0)

        // Average progress across all tasks
        averageProgress = Math.round(totalProgress / totalTasks)
      }

      return { ...project, averageProgress }
    })

    return {
      projects: projectsWithMetrics,
      allTasks
    }
  }, [currentView, workspaceId, projects, taskQueriesData])

  return (
    <FilesSidebarProvider>
      {/* Prevent search engines from indexing internal workspace pages */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        {/* Workspace Header */}
        <WorkspaceHeader />

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Navigation Rail */}
          <NavigationRail
            isExpanded={sidebarStates.navExpanded}
            onToggleExpanded={toggleNavExpanded}
            onHover={handleNavHover}
          />

          {/* Left Sidebar */}
          <LeftSidebar
            currentView={currentView}
            isCollapsed={!sidebarStates.left}
            key="left-sidebar" // Add key to prevent remounting
          />

          {/* Main Content */}
          <MainContent
            currentView={currentView}
            onToggleSidebar={toggleSidebar}
            isRightSidebarCollapsed={!sidebarStates.right}
          >
            {children}
          </MainContent>

          {/* Right Sidebar */}
          {!isAIModalOpen && (
            <RightSidebar
              currentView={currentView}
              isCollapsed={!sidebarStates.right}
              isMinimized={isMinimized}
              onToggleMinimized={toggleMinimized}
              workspaceId={workspaceId}
              projectsData={projectsData}
              chatData={chatData}
              dashboardData={dashboardResponse}
            />
          )}
        </div>

        {/* Deski Assistant Modal - Unified AI Assistant */}
        <DeskiAssistantModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          currentView={currentView}
        />

        {/* Deski Assistant Floating Button */}
        {!isAIModalOpen && (
          <DeskiAssistantFloatingButton onClick={() => setIsAIModalOpen(true)} />
        )}

        {/* Video Call Manager - Global call handling */}
        {user && (
          <>
            <VideoCallManager
              userId={user.id || 'user-123'}
              userName={user.name || user.email || 'User'}
            />
            {/* WebRTC Call Overlay */}
            <WebRTCCallWrapper />
          </>
        )}

        {/*
          HYBRID INCOMING CALL SYSTEM:
          - When tab is ACTIVE: Show IncomingCallModal (better UX, integrated)
          - When tab is INACTIVE: Show browser notification + popup window
          See useEffect at lines 234-313 for the logic
        */}
        {!isInActiveCall && (
          <IncomingCallModal
            isOpen={!!incomingCall}
            onAccept={handleAcceptCallFromModal}
            onDecline={handleDeclineCallFromModal}
            callInvitation={incomingCall ? {
              id: incomingCall.callId,
              callerId: incomingCall.from.id,
              callerName: incomingCall.from.name,
              callerAvatar: incomingCall.from.avatar,
              callType: incomingCall.callType,
              timestamp: new Date(incomingCall.timestamp).getTime(),
              isGroupCall: incomingCall.isGroupCall,
              participants: [],
            } : null}
          />
        )}

        {/* Member Profile Panel - Global slide-in panel */}
        <MemberProfilePanel
          member={selectedMember}
          isOpen={isMemberProfileOpen}
          onClose={closeMemberProfile}
          onSendMessage={(memberId) => {
            // Navigate to chat with the member
            closeMemberProfile()
            navigate(`/workspaces/${workspaceId}/chat?userId=${memberId}`)
          }}
          onStartCall={(memberId, type) => {
            // Navigate to video call and initiate call
            closeMemberProfile()
            navigate(`/workspaces/${workspaceId}/video-calls?callUser=${memberId}&type=${type}`)
          }}
        />
      </div>
    </FilesSidebarProvider>
  )
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <RightSidebarProvider>
      <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
    </RightSidebarProvider>
  )
}