import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { NavigationRail } from './NavigationRail'
import type { ViewType } from './NavigationRail'
import { LeftSidebar } from './LeftSidebar'
import { MainContent } from './MainContent'
import { RightSidebar } from './RightSidebar'
import { VideoCallManager } from '@/components/video-call'
import { useAuth } from '../../contexts/AuthContext'
import { FilesSidebarProvider } from '../../contexts/FilesSidebarContext'
import { RightSidebarProvider, useRightSidebar } from '../../contexts/RightSidebarContext'
import { useQueries } from '@tanstack/react-query'
import { useProjects, projectService, projectKeys } from '@/lib/api/projects-api'

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
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user } = useAuth()
  const { isMinimized, toggleMinimized } = useRightSidebar()
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [sidebarStates, setSidebarStates] = useState<SidebarStates>({
    left: true,
    right: true,
    navExpanded: false,
  })
  const [isNavHovered, setIsNavHovered] = useState(false)
  const [originalRightState, setOriginalRightState] = useState(true)

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
    }

    const view = viewMap[viewSegment] || 'dashboard'
    setCurrentView(view)
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

  // Fetch projects data for right sidebar (only when in projects view)
  const { data: projectsResponse } = useProjects(
    (workspaceId && currentView === 'projects') ? workspaceId : ''
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

  // Prepare projects data with calculated metrics for right sidebar
  const projectsData = useMemo(() => {
    if (currentView !== 'projects' || !workspaceId) return undefined

    // Flatten all tasks
    const allTasks = taskQueries
      .filter(query => query.data)
      .flatMap(query => query.data || [])

    // Calculate averageProgress for each project based on task completion
    const projectsWithMetrics = projects.map((project, index) => {
      const projectTasks = taskQueries[index]?.data || []

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
  }, [currentView, workspaceId, projects, taskQueries])

  return (
    <FilesSidebarProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
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
        <RightSidebar
          currentView={currentView}
          isCollapsed={!sidebarStates.right}
          isMinimized={isMinimized}
          onToggleMinimized={toggleMinimized}
          workspaceId={workspaceId}
          projectsData={projectsData}
        />

        {/* Video Call Manager - Global call handling */}
        {user && (
          <VideoCallManager
            userId={user.id || 'user-123'}
            userName={user.name || user.email || 'User'}
          />
        )}
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