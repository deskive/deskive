import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Search } from 'lucide-react'
import { useNotesStore } from '../../stores/notesStore'

export type ViewType = 
  | 'dashboard' 
  | 'chat' 
  | 'projects' 
  | 'notes' 
  | 'calendar' 
  | 'video' 
  | 'files' 
  | 'search' 
  | 'settings' 
  | 'integrations'
  | 'analytics'
  | 'monitoring'

interface NavigationItem {
  view: ViewType
  icon: string
  label: string
  title: string
  path: string
}

const navigationItems: NavigationItem[] = [
  { view: 'dashboard', icon: '🏠', label: 'Dashboard', title: 'Dashboard', path: 'dashboard' },
  { view: 'chat', icon: '💬', label: 'Messages', title: 'Messages', path: 'chat' },
  { view: 'projects', icon: '📋', label: 'Projects', title: 'Projects', path: 'projects' },
  { view: 'notes', icon: '📝', label: 'Notes', title: 'Notes', path: 'notes' },
  { view: 'calendar', icon: '🗓️', label: 'Calendar', title: 'Calendar', path: 'calendar' },
  { view: 'video', icon: '📹', label: 'Video Call', title: 'Video Call', path: 'video-calls' },
  { view: 'files', icon: '📁', label: 'Files', title: 'Files', path: 'files' },
  { view: 'integrations', icon: '🔗', label: 'Integrations', title: 'Integrations', path: 'integrations' },
  { view: 'analytics', icon: '📊', label: 'Analytics', title: 'Analytics', path: 'analytics' },
  { view: 'monitoring', icon: '📡', label: 'Monitoring', title: 'System Monitoring', path: 'monitoring' },
]

const bottomItems: NavigationItem[] = [
  { view: 'settings', icon: '⚙️', label: 'Settings', title: 'Settings', path: 'settings' },
]

interface NavigationRailProps {
  isExpanded: boolean
  onToggleExpanded: () => void
  onHover?: (isHovered: boolean) => void
}

export function NavigationRail({
  isExpanded,
  onToggleExpanded,
  onHover,
}: NavigationRailProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const { clearSelection } = useNotesStore()

  // Extract workspace ID from current URL if available
  const getWorkspaceIdFromUrl = () => {
    const pathMatch = location.pathname.match(/\/workspaces\/([^\/]+)/)
    return pathMatch ? pathMatch[1] : null
  }

  const workspaceId = currentWorkspace?.id || getWorkspaceIdFromUrl()

  // Helper function to construct workspace-based URLs
  const getWorkspaceUrl = (path: string) => {
    if (!workspaceId) {
      // If no workspace ID, redirect to root which will handle workspace selection
      return '/'
    }
    return `/workspaces/${workspaceId}/${path}`
  }

  // Helper function to check if navigation item is active
  const isItemActive = (path: string) => {
    const pathname = location.pathname
    if (!workspaceId) {
      return pathname.endsWith(`/${path}`)
    }
    return pathname.includes(`/workspaces/${workspaceId}/${path}`)
  }

  // Handle notes click - always navigate to base notes page
  const handleNotesClick = (e: React.MouseEvent) => {
    e.preventDefault()
    clearSelection()
    if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/notes`)
    }
  }

  return (
    <nav
      className={cn(
        "flex flex-col items-center bg-card border-r border-border transition-all duration-300 z-50",
        isExpanded ? "w-60 items-start px-4" : "w-16"
      )}
      onMouseEnter={() => {
        if (!isExpanded) onToggleExpanded()
        onHover?.(true)
      }}
      onMouseLeave={() => {
        if (isExpanded) onToggleExpanded()
        onHover?.(false)
      }}
    >
      <div className="flex flex-col gap-2 pt-4 pb-4">
        {navigationItems.map((item) => {
          const isActive = isItemActive(item.path)
          const href = getWorkspaceUrl(item.path)
          return (
            <Link
              key={item.view}
              to={href}
              title={item.title}
              onClick={item.view === 'notes' ? handleNotesClick : undefined}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-all duration-200 relative",
                "bg-muted/50 hover:bg-accent hover:text-accent-foreground hover:scale-110",
                isExpanded ? "w-full justify-start px-3" : "w-10 h-10 justify-center",
                isActive && "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:from-indigo-600 hover:to-purple-600"
              )}
            >
              <span className="text-lg min-w-[18px]">{item.icon}</span>
              {isExpanded && (
                <span className={cn(
                  "text-sm font-medium opacity-100 transition-opacity duration-300",
                  isActive ? "text-primary-foreground" : "text-card-foreground"
                )}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}

        {/* Search button */}
        <Link
          to={getWorkspaceUrl('search')}
          title="Search"
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl transition-all duration-200 relative",
            "bg-muted/50 hover:bg-accent hover:text-accent-foreground hover:scale-110",
            isExpanded ? "w-full justify-start px-3" : "w-10 h-10 justify-center",
            isItemActive('search') && "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:from-indigo-600 hover:to-purple-600"
          )}
        >
          <Search className="h-4 w-4" />
          {isExpanded && (
            <span className={cn(
              "text-sm font-medium opacity-100 transition-opacity duration-300",
              isItemActive('search') ? "text-primary-foreground" : "text-card-foreground"
            )}>
              Search
            </span>
          )}
        </Link>
      </div>

      <div className="mt-auto pb-4">
        {bottomItems.map((item) => {
          const isActive = isItemActive(item.path)
          const href = getWorkspaceUrl(item.path)
          return (
            <Link
              key={item.view}
              to={href}
              title={item.title}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-all duration-200",
                "bg-muted/50 hover:bg-muted hover:scale-110",
                isExpanded ? "w-full justify-start px-3" : "w-10 h-10 justify-center",
                isActive && "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:from-indigo-600 hover:to-purple-600"
              )}
            >
              <span className="text-lg min-w-[18px]">{item.icon}</span>
              {isExpanded && (
                <span className={cn(
                  "text-sm font-medium opacity-100 transition-opacity duration-300",
                  isActive ? "text-primary-foreground" : "text-card-foreground"
                )}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}