import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { workspaceService } from '@/lib/api/workspace-api'
import { Loader2 } from 'lucide-react'
import type { Workspace } from '@/types'

interface WorkspaceRedirectProps {
  callbackUrl?: string | null
}

export function WorkspaceRedirect({ callbackUrl }: WorkspaceRedirectProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [workspacesLoading, setWorkspacesLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const handleRedirect = async () => {
      console.log('[WorkspaceRedirect] Auth loading:', authLoading)
      console.log('[WorkspaceRedirect] Authenticated:', isAuthenticated)
      console.log('[WorkspaceRedirect] User:', user ? 'exists' : 'null')
      console.log('[WorkspaceRedirect] User ID:', user?.id)
      console.log('[WorkspaceRedirect] Callback URL:', callbackUrl)
      
      // Wait for auth to load
      if (authLoading || redirecting) {
        return
      }

      // If not authenticated, redirect to sign-in
      if (!isAuthenticated || !user) {
        console.log('[WorkspaceRedirect] No user, redirecting to sign-in')
        setRedirecting(true)
        navigate('/auth/login')
        return
      }

      // Load workspaces
      setWorkspacesLoading(true)
      try {
        const workspaces = await workspaceService.getWorkspaces()
        
        console.log('[WorkspaceRedirect] Workspaces count:', workspaces.length)
        console.log('[WorkspaceRedirect] First workspace:', workspaces[0])

        // If there's a callback URL, redirect there
        if (callbackUrl && callbackUrl !== '/' && callbackUrl !== '/') {
          console.log('[WorkspaceRedirect] Redirecting to callback URL:', callbackUrl)
          setRedirecting(true)
          navigate(callbackUrl)
          return
        }

        // If user has workspaces, redirect to the last used one or the first one
        if (workspaces.length > 0) {
          // Check localStorage for last used workspace
          const lastWorkspaceId = localStorage.getItem('lastWorkspaceId')
          const targetWorkspace = workspaces.find((ws: Workspace) => ws.id === lastWorkspaceId) || workspaces[0]
          
          console.log('[WorkspaceRedirect] Redirecting to workspace dashboard:', targetWorkspace.id)
          setRedirecting(true)
          
          // Store the workspace ID for quick access
          localStorage.setItem('lastWorkspaceId', targetWorkspace.id)
          
          navigate(`/workspaces/${targetWorkspace.id}/dashboard`)
        } else {
          // If no workspaces, redirect to create workspace page
          console.log('[WorkspaceRedirect] No workspaces found, redirecting to create-workspace')
          setRedirecting(true)
          navigate('/create-workspace')
        }
      } catch (error) {
        console.error('[WorkspaceRedirect] Error loading workspaces:', error)
        // On error, redirect to create workspace page
        setRedirecting(true)
        navigate('/create-workspace')
      } finally {
        setWorkspacesLoading(false)
      }
    }

    handleRedirect()
  }, [user, authLoading, isAuthenticated, navigate, callbackUrl, redirecting])

  // Show loading while determining where to redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
        <p className="text-gray-400">
          {authLoading ? 'Checking authentication...' :
           workspacesLoading ? 'Loading your workspaces...' :
           'Redirecting...'}
        </p>
      </div>
    </div>
  )
}