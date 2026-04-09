// useAssistantStream.ts - Custom hook for SSE streaming with autopilot API
import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { autopilotApi, useGetOrCreateSession } from '@/lib/api/autopilot-api'
import { projectKeys } from '@/lib/api/projects-api'
import { calendarKeys } from '@/lib/api/calendar-api'
import { notesKeys } from '@/lib/api/notes-api'
import { fileKeys } from '@/lib/api/files-api'
import type { StreamCallbacks, ActionResult } from '../types/assistant.types'

/**
 * Navigation routes based on tool actions
 */
const toolRoutes: Record<string, string> = {
  create_task: '/projects',
  list_tasks: '/projects',
  update_task: '/projects',
  create_project: '/projects',
  create_calendar_event: '/calendar',
  list_calendar_events: '/calendar',
  send_channel_message: '/chat',
  send_direct_message: '/chat',
  list_channels: '/chat',
  create_note: '/notes',
  update_note: '/notes',
  search_notes: '/notes',
  create_video_meeting: '/video-calls',
  schedule_video_meeting: '/video-calls',
}

/**
 * Options for the assistant stream hook
 */
interface UseAssistantStreamOptions {
  /** Override the session ID (for using a specific session or forcing new) */
  sessionId?: string | null
}

/**
 * Custom hook for managing SSE streaming with the autopilot API.
 *
 * This hook wraps the autopilot streaming API and provides:
 * - Session management
 * - Cache invalidation after actions
 * - Navigation after successful actions
 * - Standardized callback handling
 *
 * @param callbacks - Object containing callback functions for stream events
 * @param options - Optional configuration including session override
 */
export function useAssistantStream(callbacks: StreamCallbacks, options?: UseAssistantStreamOptions) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Get or create session for conversation continuity (only if no override provided)
  const { data: sessionData } = useGetOrCreateSession(workspaceId || '')

  // Use override sessionId if provided, otherwise fall back to auto session
  const effectiveSessionId = options?.sessionId !== undefined ? options.sessionId : sessionData?.sessionId

  // Get auth token from localStorage
  const getAuthToken = () => localStorage.getItem('auth_token') || ''

  /**
   * Navigate to the appropriate route based on executed tool
   */
  const navigateToRoute = useCallback((tool: string) => {
    if (!workspaceId) return

    const routeSuffix = toolRoutes[tool]
    if (routeSuffix) {
      navigate(`/workspaces/${workspaceId}${routeSuffix}`)
    }
  }, [workspaceId, navigate])

  /**
   * Invalidate relevant caches based on executed actions
   */
  const invalidateCaches = useCallback(async (actions: ActionResult[]) => {
    if (!workspaceId) return

    const toolsUsed = new Set(actions.map(a => a.tool))

    // Invalidate based on which tools were used
    if (toolsUsed.has('create_task') || toolsUsed.has('update_task') || toolsUsed.has('create_project')) {
      await queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }

    if (toolsUsed.has('create_calendar_event') || toolsUsed.has('list_calendar_events')) {
      await queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
      await queryClient.invalidateQueries({ queryKey: calendarKeys.upcoming() })
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    }

    if (toolsUsed.has('create_note') || toolsUsed.has('update_note') || toolsUsed.has('search_notes')) {
      await queryClient.invalidateQueries({ queryKey: notesKeys.list(workspaceId) })
      await queryClient.invalidateQueries({ queryKey: notesKeys.recent(workspaceId) })
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
    }

    if (toolsUsed.has('send_channel_message') || toolsUsed.has('send_direct_message')) {
      await queryClient.invalidateQueries({ queryKey: ['chat'] })
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
    }

    // Generic file operations
    const fileTools = ['create_folder', 'upload_file', 'delete_file', 'move_file', 'star_file']
    if (fileTools.some(t => toolsUsed.has(t))) {
      await queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) })
    }
  }, [workspaceId, queryClient])

  /**
   * Execute a command with SSE streaming
   *
   * @param command - The natural language command from the user
   * @param messageId - The ID of the assistant message being populated
   * @param context - Optional additional context (currentView, etc.)
   */
  const executeStream = useCallback(async (
    command: string,
    messageId: string,
    context?: Record<string, unknown>
  ) => {
    const token = getAuthToken()

    if (!workspaceId || !token) {
      callbacks.onError(messageId, 'Unable to execute command. Please ensure you are logged in.')
      return
    }

    let completedActions: ActionResult[] = []

    try {
      await autopilotApi.executeCommandStream(
        {
          command,
          workspaceId,
          sessionId: effectiveSessionId || undefined,
          executeActions: true,
          context: context || { currentView: 'modal' }
        },
        {
          onStatus: (status: string, message: string) => {
            callbacks.onStatusUpdate(messageId, message)
          },

          onAction: (tool: string, success: boolean, message: string) => {
            const action: ActionResult = { tool, success, message }
            completedActions.push(action)
            callbacks.onActionComplete(messageId, action)
          },

          onText: (content: string) => {
            // Full text replacement - display immediately
            callbacks.onText(messageId, content)
          },

          onTextDelta: (content: string) => {
            // Incremental text - for typing animation
            callbacks.onTextDelta(messageId, content)
          },

          onComplete: async (result: any) => {
            // Invalidate caches for all actions
            await invalidateCaches(completedActions)

            // Call completion callback
            callbacks.onComplete(messageId, result)

            // Navigate after a delay if actions were successful
            const successfulActions = completedActions.filter(a => a.success)
            if (successfulActions.length > 0) {
              // Optional: Navigate to relevant view after delay
              // setTimeout(() => navigateToRoute(successfulActions[0].tool), 1500)
            }
          },

          onError: (error: string) => {
            callbacks.onError(messageId, error || 'Something went wrong. Please try again.')
          }
        },
        token
      )
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong'
      callbacks.onError(messageId, errorMessage)
    }
  }, [workspaceId, effectiveSessionId, callbacks, invalidateCaches])

  return {
    executeStream,
    navigateToRoute,
    workspaceId,
    sessionId: effectiveSessionId
  }
}
