import React from 'react'
import { useLocation } from 'react-router-dom'
import { useIntl } from 'react-intl'
import type { ViewType } from './NavigationRail'
import { Button } from '../ui/button'
import {
  Menu,
  Settings,
  ChevronRight,
  ChevronLeft,
  Home,
  MessageSquare,
  ClipboardList,
  FileText,
  Calendar,
  Video,
  FolderOpen,
  Search,
  Link2,
  BarChart3,
  Radio,
  FileIcon,
  Mail,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MainContentProps {
  currentView: ViewType
  onToggleSidebar: (side: 'left' | 'right') => void
  isRightSidebarCollapsed: boolean
  children?: React.ReactNode
}

const viewConfigs: Record<string, { titleKey: string; icon: LucideIcon }> = {
  dashboard: { titleKey: 'navigation.dashboard', icon: Home },
  chat: { titleKey: 'navigation.messages', icon: MessageSquare },
  email: { titleKey: 'navigation.email', icon: Mail },
  projects: { titleKey: 'navigation.projects', icon: ClipboardList },
  notes: { titleKey: 'navigation.notes', icon: FileText },
  calendar: { titleKey: 'navigation.calendar', icon: Calendar },
  video: { titleKey: 'navigation.videoCall', icon: Video },
  files: { titleKey: 'navigation.files', icon: FolderOpen },
  search: { titleKey: 'navigation.search', icon: Search },
  settings: { titleKey: 'navigation.settings', icon: Settings },
  integrations: { titleKey: 'pageTitle.integrations', icon: Link2 },
  analytics: { titleKey: 'pageTitle.analytics', icon: BarChart3 },
  monitoring: { titleKey: 'pageTitle.monitoring', icon: Radio },
}

export function MainContent({
  currentView,
  onToggleSidebar,
  isRightSidebarCollapsed,
  children
}: MainContentProps) {
  const intl = useIntl()
  const location = useLocation()

  // Check if we're on the whiteboard page - should be full screen without header
  const isWhiteboardPage = location.pathname.includes('/whiteboard')

  // Check if we're on a budget page - should not show the header
  const isBudgetPage = location.pathname.includes('/budget')

  const config = viewConfigs[currentView] || { titleKey: 'pageTitle.view', icon: FileIcon }
  const title = intl.formatMessage({ id: config.titleKey, defaultMessage: 'View' })
  const IconComponent = config.icon

  // For whiteboard and budget, render full-screen content without header
  if (isWhiteboardPage || isBudgetPage) {
    return (
      <main className="flex-1 bg-background flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 bg-background flex flex-col overflow-hidden">
      {/* Sub-Header (Page Title) */}
      <header className="h-14 bg-background/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-4">
          {/* Hide left sidebar toggle for dashboard, email, apps, and more views - they have no/own sidebar content */}
          {currentView !== 'dashboard' && currentView !== 'email' && currentView !== 'apps' && currentView !== 'more' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSidebar('left')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-foreground text-lg">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sidebar Toggle - Hidden for dashboard, settings, search, email, apps, and more */}
          {currentView !== 'dashboard' && currentView !== 'settings' && currentView !== 'search' && currentView !== 'email' && currentView !== 'apps' && currentView !== 'more' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSidebar('right')}
              className="text-muted-foreground hover:text-foreground"
            >
              {isRightSidebarCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Main View */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </main>
  )
}