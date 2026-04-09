import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { useQueryClient } from '@tanstack/react-query'
import { Send, Sparkles, Loader2, X, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { useToast } from '../../hooks/use-toast'
import { type Project, projectKeys } from '../../lib/api/projects-api'
import { calendarKeys } from '../../lib/api/calendar-api'
import { notesKeys } from '../../lib/api/notes-api'
import { fileKeys } from '../../lib/api/files-api'
import { aiAssistantApi, type AIAssistantResponse, type AgentType } from '../../lib/api/ai-api'
import { useProjectsStore } from '../../stores/useProjectsStore'
import { useNotesStore } from '../../stores/notesStore'
import type { Note } from '../../types/notes'
import type { ViewType } from '../layout/NavigationRail'

interface CommandSuggestion {
  textKey: string
  icon: string
  action: string
}

// Module-specific suggestions with i18n keys
const moduleSuggestionKeys: Record<string, CommandSuggestion[]> = {
  projects: [
    { textKey: 'ai.suggestions.projects.createProject', icon: '📋', action: 'create_project' },
    { textKey: 'ai.suggestions.projects.updateProject', icon: '✏️', action: 'update_project' },
    { textKey: 'ai.suggestions.projects.deleteProject', icon: '🗑️', action: 'delete_project' },
    { textKey: 'ai.suggestions.projects.createBoard', icon: '📊', action: 'create_project' },
  ],
  calendar: [
    { textKey: 'ai.suggestions.calendar.scheduleMeeting', icon: '📅', action: 'create_meeting' },
    { textKey: 'ai.suggestions.calendar.addStandup', icon: '🗓️', action: 'create_meeting' },
    { textKey: 'ai.suggestions.calendar.createReview', icon: '📆', action: 'create_meeting' },
    { textKey: 'ai.suggestions.calendar.scheduleOneOnOne', icon: '👥', action: 'create_meeting' },
  ],
  notes: [
    { textKey: 'ai.suggestions.notes.createNote', icon: '📝', action: 'create_note' },
    { textKey: 'ai.suggestions.notes.writeMeetingNotes', icon: '✍️', action: 'create_note' },
    { textKey: 'ai.suggestions.notes.createDocs', icon: '📄', action: 'create_note' },
    { textKey: 'ai.suggestions.notes.addBrainstorm', icon: '💡', action: 'create_note' },
  ],
  chat: [
    { textKey: 'ai.suggestions.chat.sendMessage', icon: '💬', action: 'send_message' },
    { textKey: 'ai.suggestions.chat.postUpdate', icon: '📢', action: 'send_message' },
    { textKey: 'ai.suggestions.chat.shareAnnouncement', icon: '🔔', action: 'send_message' },
  ],
  files: [
    { textKey: 'ai.suggestions.files.createFolder', icon: '📁', action: 'create_folder' },
    { textKey: 'ai.suggestions.files.organizeFiles', icon: '🗂️', action: 'move_file' },
    { textKey: 'ai.suggestions.files.searchFiles', icon: '🔍', action: 'search' },
    { textKey: 'ai.suggestions.files.starImportant', icon: '⭐', action: 'star_file' },
  ],
  dashboard: [
    { textKey: 'ai.suggestions.dashboard.createProject', icon: '📋', action: 'create_project' },
    { textKey: 'ai.suggestions.dashboard.scheduleMeeting', icon: '📅', action: 'create_meeting' },
    { textKey: 'ai.suggestions.dashboard.createNote', icon: '📝', action: 'create_note' },
    { textKey: 'ai.suggestions.dashboard.sendMessage', icon: '💬', action: 'send_message' },
  ],
}

// Module config keys for i18n
const moduleConfigKeys: Record<string, { titleKey: string; descriptionKey: string; placeholderKey: string }> = {
  projects: {
    titleKey: 'ai.modules.projects.title',
    descriptionKey: 'ai.modules.projects.description',
    placeholderKey: 'ai.modules.projects.placeholder',
  },
  calendar: {
    titleKey: 'ai.modules.calendar.title',
    descriptionKey: 'ai.modules.calendar.description',
    placeholderKey: 'ai.modules.calendar.placeholder',
  },
  notes: {
    titleKey: 'ai.modules.notes.title',
    descriptionKey: 'ai.modules.notes.description',
    placeholderKey: 'ai.modules.notes.placeholder',
  },
  chat: {
    titleKey: 'ai.modules.chat.title',
    descriptionKey: 'ai.modules.chat.description',
    placeholderKey: 'ai.modules.chat.placeholder',
  },
  files: {
    titleKey: 'ai.modules.files.title',
    descriptionKey: 'ai.modules.files.description',
    placeholderKey: 'ai.modules.files.placeholder',
  },
  dashboard: {
    titleKey: 'ai.modules.dashboard.title',
    descriptionKey: 'ai.modules.dashboard.description',
    placeholderKey: 'ai.modules.dashboard.placeholder',
  },
  video: {
    titleKey: 'ai.modules.video.title',
    descriptionKey: 'ai.modules.video.description',
    placeholderKey: 'ai.modules.video.placeholder',
  },
  search: {
    titleKey: 'ai.modules.search.title',
    descriptionKey: 'ai.modules.search.description',
    placeholderKey: 'ai.modules.search.placeholder',
  },
  settings: {
    titleKey: 'ai.modules.settings.title',
    descriptionKey: 'ai.modules.settings.description',
    placeholderKey: 'ai.modules.settings.placeholder',
  },
}

interface AskAIModalProps {
  isOpen: boolean
  onClose: () => void
  currentView: ViewType
  projects?: Project[]  // Pass existing projects for update/delete operations
  onProjectsChanged?: () => void | Promise<void>  // Callback to refresh projects list
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  success?: boolean
}

export function AskAIModal({ isOpen, onClose, currentView, projects = [], onProjectsChanged }: AskAIModalProps) {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Extract noteId from URL path (e.g., /workspaces/{id}/notes/{noteId})
  const getCurrentNoteId = (): string | undefined => {
    const pathMatch = location.pathname.match(/\/notes\/([^/]+)$/)
    return pathMatch ? pathMatch[1] : undefined
  }
  const { toast } = useToast()
  const intl = useIntl()
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get Zustand store actions for direct state updates (especially for delete)
  const removeProject = useProjectsStore((state) => state.removeProject)
  const addProject = useProjectsStore((state) => state.addProject)
  const updateProjectInStore = useProjectsStore((state) => state.updateProject)

  // Get Notes Zustand store actions for direct state updates
  const addNoteToStore = useNotesStore((state) => state.addNote)
  const updateNoteInStore = useNotesStore((state) => state.updateNote)
  const clearNoteSelection = useNotesStore((state) => state.clearSelection)
  const markNoteAsDeleted = useNotesStore((state) => state.markNoteAsDeleted)

  // Get query client for invalidating notes cache
  const queryClient = useQueryClient()

  // Helper function to convert API note to local format
  const convertApiNoteToLocal = (apiNote: any, wsId: string): Note => {
    return {
      id: apiNote.id,
      workspaceId: wsId,
      title: [{ text: apiNote.title }],
      icon: { type: 'emoji', value: apiNote.icon || '📄' },
      content: [{
        id: `block-${Date.now()}`,
        type: 'html' as const,
        content: [{
          html: apiNote.content || '<p></p>'
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      children: [],
      parentId: apiNote.parent_id || undefined,
      properties: {},
      createdAt: new Date(apiNote.createdAt || apiNote.created_at || new Date()),
      updatedAt: new Date(apiNote.updatedAt || apiNote.updated_at || new Date()),
      createdBy: apiNote.createdBy || apiNote.created_by || '',
      lastEditedBy: apiNote.lastEditedBy || apiNote.last_edited_by || apiNote.createdBy || apiNote.created_by || '',
      isDeleted: !!apiNote.deleted_at,
      isArchived: !!apiNote.archived_at,
      archivedAt: apiNote.archived_at || undefined,
      isFavorite: apiNote.is_favorite || apiNote.isFavorite || false,
      permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
      tags: apiNote.tags || [],
      version: 1,
      lastSavedAt: new Date(),
      author_id: apiNote.author_id,
      author: apiNote.author,
      collaborators: apiNote.collaborators,
      collaborative_data: apiNote.collaborative_data
    }
  }

  const configKeys = moduleConfigKeys[currentView] || moduleConfigKeys.dashboard
  const suggestionKeys = moduleSuggestionKeys[currentView] || moduleSuggestionKeys.dashboard

  // Get translated config
  const config = {
    title: intl.formatMessage({ id: configKeys.titleKey, defaultMessage: 'AI Assistant' }),
    description: intl.formatMessage({ id: configKeys.descriptionKey, defaultMessage: 'What would you like to do?' }),
    placeholder: intl.formatMessage({ id: configKeys.placeholderKey, defaultMessage: 'Type your command...' }),
  }

  // Get translated suggestions
  const suggestions = suggestionKeys.map(s => ({
    text: intl.formatMessage({ id: s.textKey, defaultMessage: s.textKey }),
    icon: s.icon,
    action: s.action,
  }))

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Process commands using the unified AI Router
   * The backend AI intelligently routes to the appropriate agent
   */
  const processWithUnifiedAI = async (input: string, thinkingId: string): Promise<{ success: boolean }> => {
    if (!workspaceId) return { success: false }

    try {
      console.log('[AIRouter] Sending command to backend:', input, 'view:', currentView, 'projectId:', projectId)

      const response = await aiAssistantApi.processCommand({
        prompt: input,
        workspaceId,
        currentView,
        projectId,
      })

      console.log('[AIRouter] Backend response:', response, 'agentUsed:', response.agentUsed)

      // Add assistant response to chat (remove thinking message first)
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        success: response.success
      }
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(assistantMessage))

      if (!response.success) {
        toast({
          title: response.action === 'unknown' || response.agentUsed === 'unknown'
            ? intl.formatMessage({ id: 'ai.toast.commandNotUnderstood', defaultMessage: 'Command Not Understood' })
            : intl.formatMessage({ id: 'ai.toast.commandFailed', defaultMessage: 'Command Failed' }),
          description: response.message,
          variant: 'destructive'
        })
        return { success: false }
      }

      // Invalidate relevant caches based on which agent was used
      await invalidateCachesForAgent(response.agentUsed, response.action, response.data)

      // Handle navigation and Zustand store updates based on agent and action
      await handlePostActionUpdates(response)

      return { success: true }
    } catch (error) {
      console.error('[AIRouter] Error:', error)

      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: intl.formatMessage({ id: 'ai.toast.commandFailedDesc', defaultMessage: 'Something went wrong. Please try again.' }),
        timestamp: new Date(),
        success: false
      }
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(errorMessage))

      toast({
        title: intl.formatMessage({ id: 'ai.toast.commandFailed', defaultMessage: 'Command Failed' }),
        description: intl.formatMessage({ id: 'ai.toast.commandFailedDesc', defaultMessage: 'Something went wrong. Please try again.' }),
        variant: 'destructive'
      })
      return { success: false }
    }
  }

  /**
   * Invalidate React Query caches based on which agent handled the request
   */
  const invalidateCachesForAgent = async (agentUsed: AgentType, action: string, data?: any) => {
    if (!workspaceId) return

    switch (agentUsed) {
      case 'projects':
        // Trigger project refresh
        await onProjectsChanged?.()
        // Also invalidate project lists
        await queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
        break

      case 'tasks':
        // Trigger project refresh
        await onProjectsChanged?.()
        // Invalidate task queries for the specific project if available
        if (data?.projectId) {
          await queryClient.invalidateQueries({ queryKey: projectKeys.tasks(data.projectId) })
          await queryClient.invalidateQueries({ queryKey: ['project-tasks', data.projectId] })
          await queryClient.invalidateQueries({ queryKey: projectKeys.analytics(data.projectId) })
        }
        // Also invalidate all project-related queries to ensure task counts update
        await queryClient.invalidateQueries({ queryKey: projectKeys.all })
        break

      case 'notes':
        await queryClient.invalidateQueries({ queryKey: notesKeys.list(workspaceId) })
        await queryClient.invalidateQueries({ queryKey: notesKeys.recent(workspaceId) })
        break

      case 'calendar':
        await queryClient.invalidateQueries({ queryKey: calendarKeys.events() })
        await queryClient.invalidateQueries({ queryKey: calendarKeys.upcoming() })
        break

      case 'files':
        await queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
        await queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) })
        if (['delete_file', 'batch_delete_files'].includes(action)) {
          await queryClient.invalidateQueries({ queryKey: fileKeys.trash(workspaceId) })
        }
        if (['star_file', 'unstar_file'].includes(action)) {
          await queryClient.invalidateQueries({ queryKey: fileKeys.starred(workspaceId) })
        }
        break
    }
  }

  /**
   * Handle post-action updates like navigation and Zustand store updates
   */
  const handlePostActionUpdates = async (response: AIAssistantResponse) => {
    if (!workspaceId || !response.success) return

    const { agentUsed, action, data } = response

    switch (agentUsed) {
      case 'projects':
        // Handle project deletion in Zustand store
        if (action === 'delete' || action === 'batch_delete') {
          if (data?.deletedIds && Array.isArray(data.deletedIds)) {
            data.deletedIds.forEach((id: string) => removeProject(id))
          } else if (data?.id) {
            removeProject(data.id)
          } else if (data?.projectId) {
            removeProject(data.projectId)
          }
        }
        break

      case 'notes':
        // Handle note creation - add to store
        if ((action === 'create' || action === 'duplicate') && data?.note) {
          const localNote = convertApiNoteToLocal(data.note, workspaceId)
          addNoteToStore(localNote)
          // Navigate to new note
          if (data.note.id) {
            navigate(`/workspaces/${workspaceId}/notes/${data.note.id}`)
          }
        }
        // Handle note deletion
        if (action === 'delete' && data?.deletedNoteId) {
          const currentNoteId = getCurrentNoteId()
          const deletedId = data.deletedNoteId
          markNoteAsDeleted(deletedId)
          updateNoteInStore(deletedId, { isDeleted: true })
          if (currentNoteId === deletedId) {
            clearNoteSelection()
            navigate(`/workspaces/${workspaceId}/notes`, { replace: true })
          }
        }
        break

      case 'calendar':
        // Navigate to calendar if event was created
        if (action === 'create' && data?.event?.id) {
          const eventDate = data.event.start_time
          navigate(`/workspaces/${workspaceId}/calendar?date=${eventDate}&eventId=${data.event.id}`)
        }
        break

      case 'files':
        // No special navigation needed for files - just cache invalidation
        break
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isProcessing) return

    const userInput = prompt.trim()
    setPrompt('')
    setIsProcessing(true)

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // Add temporary "thinking" message
    const thinkingId = 'thinking-' + Date.now()
    const thinkingMessage: ChatMessage = {
      id: thinkingId,
      role: 'assistant',
      content: '...',  // Will be rendered specially
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thinkingMessage])

    try {
      // Use unified AI Router - backend intelligently determines which agent to use
      console.log('[AskAI] Sending to unified AI Router...')
      await processWithUnifiedAI(userInput, thinkingId)
    } catch (error) {
      console.error('Command processing error:', error)

      // Add error message to chat (remove thinking message first)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: intl.formatMessage({ id: 'ai.toast.commandFailedDesc', defaultMessage: 'Something went wrong. Please try again.' }),
        timestamp: new Date(),
        success: false
      }
      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(errorMessage))

      toast({
        title: intl.formatMessage({ id: 'ai.toast.commandFailed', defaultMessage: 'Command Failed' }),
        description: intl.formatMessage({ id: 'ai.toast.commandFailedDesc', defaultMessage: 'Something went wrong. Please try again.' }),
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuggestionClick = (suggestion: { text: string; icon: string; action: string }) => {
    setPrompt(suggestion.text)
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const handleClose = () => {
    setMessages([])
    setPrompt('')
    onClose()
  }

  if (!isOpen) return null

  // Autopilot is now available globally on all views
  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{config.title}</h3>
              <p className="text-xs text-muted-foreground">
                {messages.length > 0 ? `${messages.length} messages` : config.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-8 w-8 p-0"
                title="Clear chat history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          // Show suggestions when no messages
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              {intl.formatMessage({ id: 'ai.assistant.quickCommands', defaultMessage: 'Quick Commands' })}
            </p>
            <div className="space-y-1.5">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-start gap-3 group border border-transparent hover:border-border"
                >
                  <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
                  <span className="text-muted-foreground group-hover:text-foreground leading-tight">
                    {suggestion.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Show chat messages
          <>
            {messages.map((message) => {
              // Check if this is a thinking message
              const isThinking = message.content === '...' && message.role === 'assistant'

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className={`w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isThinking ? 'animate-pulse' : ''}`}>
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2.5 text-sm shadow-sm ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : message.success === false
                        ? 'bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800 rounded-bl-none'
                        : 'bg-muted text-foreground border border-border rounded-bl-none'
                    }`}
                  >
                    {isThinking ? (
                      // Animated typing indicator
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium">AI is thinking</span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                        {message.role === 'assistant' && message.success && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="font-medium">Completed</span>
                          </div>
                        )}
                        {message.role === 'assistant' && message.success === false && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-red-200 dark:border-red-800 text-xs">
                            <XCircle className="w-3.5 h-3.5" />
                            <span className="font-medium">Failed</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form */}
      <div className="flex-shrink-0 p-4 border-t">
        {isProcessing && (
          <div className="mb-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="font-medium">Processing your command...</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={config.placeholder}
              rows={3}
              className="w-full px-3 py-2 pr-10 text-sm bg-muted/50 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-foreground placeholder-muted-foreground resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!prompt.trim() || isProcessing}
              className="absolute right-2 bottom-2 h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {intl.formatMessage({ id: 'ai.assistant.pressEnter', defaultMessage: 'Press Enter to send, Shift+Enter for new line' })}
          </p>
        </form>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          {intl.formatMessage({ id: 'ai.assistant.poweredBy', defaultMessage: 'AI Assistant powered by Deskive' })}
        </p>
      </div>
    </div>
  )
}
