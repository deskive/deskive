import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { workspaceApi } from '../../lib/api/workspace-api'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const hasProcessed = useRef(false)

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent duplicate calls (React Strict Mode causes double render)
      if (hasProcessed.current) {
        return
      }
      hasProcessed.current = true

      // Following deskive pattern: backend redirects here with tokens in URL params
      const deskiveToken = searchParams.get('access_token')
      const userId = searchParams.get('user_id')
      const email = searchParams.get('email')
      const error = searchParams.get('error')

      if (error) {
        console.error('OAuth error:', error)
        navigate('/auth/login?error=' + encodeURIComponent(error))
        return
      }

      if (!deskiveToken) {
        console.error('No access token received from OAuth callback')
        navigate('/auth/login?error=' + encodeURIComponent('Authentication failed'))
        return
      }

      console.log('✅ deskive token received, exchanging for Deskive token...')

      try {
        // Exchange deskive token for Deskive token
        const response = await axios.post(`${API_URL}/api/v1/auth/oauth/exchange`, {
          deskiveToken,
          userId,
          email
        })

        const { token } = response.data

        if (!token) {
          throw new Error('No Deskive token received')
        }

        console.log('✅ Deskive token received, storing...')
        localStorage.setItem('auth_token', token)

        // Dispatch custom event to notify AuthContext
        window.dispatchEvent(new CustomEvent('auth-token-stored'))

        // Check for pending invitation token first
        const pendingInvitationToken = localStorage.getItem('pending_invitation_token')
        if (pendingInvitationToken) {
          console.log('✅ Pending invitation found, redirecting to accept invitation page')
          navigate(`/invite/${pendingInvitationToken}`)
          return
        }

        // Fetch workspaces and navigate
        const workspaces = await workspaceApi.getWorkspaces()
        if (workspaces.length > 0) {
          const lastWorkspaceId = localStorage.getItem('lastWorkspaceId')
          const currentWorkspaceId = localStorage.getItem('currentWorkspaceId')

          // Find workspace from stored IDs, fallback to first workspace
          let workspace = workspaces.find(w => w.id === lastWorkspaceId)

          if (!workspace) {
            workspace = workspaces.find(w => w.id === currentWorkspaceId)
          }

          if (!workspace) {
            workspace = workspaces[0]
            // Clean up stale workspace IDs
            if (lastWorkspaceId) {
              console.log('🧹 Cleaning up stale lastWorkspaceId:', lastWorkspaceId)
              localStorage.removeItem('lastWorkspaceId')
            }
            if (currentWorkspaceId) {
              console.log('🧹 Cleaning up stale currentWorkspaceId:', currentWorkspaceId)
              localStorage.removeItem('currentWorkspaceId')
            }
          }

          console.log('✅ Navigating to workspace:', workspace.id)

          // Update localStorage with valid workspace ID
          localStorage.setItem('lastWorkspaceId', workspace.id)
          localStorage.setItem('currentWorkspaceId', workspace.id)

          navigate(`/workspaces/${workspace.id}/dashboard`)
        } else {
          console.log('⚠️ No workspaces found, redirecting to create-workspace')
          navigate('/create-workspace')
        }
      } catch (error) {
        console.error('❌ Token exchange failed:', error)
        navigate('/auth/login?error=' + encodeURIComponent('Authentication failed'))
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Completing sign in...
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Please wait while we finish setting up your account
        </p>
      </div>
    </div>
  )
}
