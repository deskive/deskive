import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ViewType } from './NavigationRail'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu'
import { 
  Menu, 
  Settings, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  User, 
  LogOut, 
  Building2, 
  Check, 
  ChevronDown,
  Moon,
  Sun
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useTheme } from '../../contexts/ThemeProvider'

interface MainContentProps {
  currentView: ViewType
  onToggleSidebar: (side: 'left' | 'right') => void
  isRightSidebarCollapsed: boolean
  children?: React.ReactNode
}

const viewConfigs = {
  dashboard: { title: 'Dashboard', icon: '🏠' },
  chat: { title: 'Messages', icon: '💬' },
  projects: { title: 'Projects', icon: '📋' },
  notes: { title: 'Notes', icon: '📝' },
  calendar: { title: 'Calendar', icon: '🗓️' },
  video: { title: 'Video Call', icon: '📹' },
  files: { title: 'Files', icon: '📁' },
  search: { title: 'Search', icon: '🔍' },
  settings: { title: 'Settings', icon: '⚙️' },
  integrations: { title: 'Integrations', icon: '🔗' },
  analytics: { title: 'Analytics', icon: '📊' },
  monitoring: { title: 'Monitoring', icon: '📡' },
}

export function MainContent({ 
  currentView, 
  onToggleSidebar, 
  isRightSidebarCollapsed, 
  children 
}: MainContentProps) {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const { user, logout } = useAuth()
  const { currentWorkspace, workspaces } = useWorkspace()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const config = viewConfigs[currentView] || { title: 'View', icon: '📄' }

  const handleSignOut = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleWorkspaceChange = (workspaceId: string) => {
    navigate(`/workspaces/${workspaceId}/dashboard`)
  }

  const handleCreateWorkspace = () => {
    navigate('/create-workspace')
  }

  return (
    <main className="flex-1 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-background/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleSidebar('left')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          {/* Workspace Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 text-foreground hover:bg-accent"
              >
                <Building2 className="h-4 w-4" />
                <span className="font-medium">
                  {currentWorkspace?.name || 'Select Workspace'}
                </span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                Workspaces
              </div>
              {workspaces.length === 0 ? (
                <DropdownMenuItem disabled>
                  No workspaces found
                </DropdownMenuItem>
              ) : (
                workspaces.map((workspace) => (
                  <DropdownMenuItem
                    key={workspace.id}
                    onClick={() => handleWorkspaceChange(workspace.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{workspace.name}</span>
                    </div>
                    {workspace.id === currentWorkspace?.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleCreateWorkspace}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <span className="font-medium text-foreground">{config.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name || user?.email}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/workspaces/${currentWorkspace?.id}/settings/profile`)}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/workspaces/${currentWorkspace?.id}/settings`)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            onClick={() => setIsAIModalOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Ask AI
          </Button>
          
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
        </div>
      </header>

      {/* Main View */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* TODO: Add AI Modal */}
      {/* <AskAIModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
      /> */}
    </main>
  )
}