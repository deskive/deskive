/**
 * Workspace Redirect Component
 * Redirects authenticated users to their workspace or create workspace page
 */

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { workspaceApi } from '../lib/api/workspace-api'
import HomePage from '../pages/HomePage'

export const WorkspaceRedirect = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  useEffect(() => {
    const checkWorkspaces = async () => {
      if (authLoading) {
        return
      }

      if (!isAuthenticated) {
        setIsLoading(false)
        return
      }

      try {
        const workspaces = await workspaceApi.getWorkspaces()

        if (workspaces.length > 0) {
          // Get the last used workspace or the first one
          const lastWorkspaceId = localStorage.getItem('lastWorkspaceId')
          const workspace = workspaces.find((w) => w.id === lastWorkspaceId) || workspaces[0]
          setRedirectPath(`/workspaces/${workspace.id}/dashboard`)
        } else {
          // No workspaces, redirect to create one
          setRedirectPath('/create-workspace')
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error)
        setRedirectPath('/create-workspace')
      } finally {
        setIsLoading(false)
      }
    }

    checkWorkspaces()
  }, [isAuthenticated, authLoading])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  // If not authenticated, show the HomePage
  if (!isAuthenticated) {
    return <HomePage />
  }

  // If we have a redirect path, navigate there
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />
  }

  // Default fallback
  return <Navigate to="/create-workspace" replace />
}

export default WorkspaceRedirect