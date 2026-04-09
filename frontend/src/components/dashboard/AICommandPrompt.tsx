import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, CheckCircle, Bot } from 'lucide-react'
import { Button } from '../ui/button'
import { useToast } from '../../hooks/use-toast'
import { useExecuteCommand, useGetOrCreateSession } from '../../lib/api/autopilot-api'

interface CommandSuggestion {
  textKey: string
  defaultText: string
  icon: string
  category: 'project' | 'meeting' | 'note' | 'message' | 'task'
}

const suggestionConfigs: CommandSuggestion[] = [
  { textKey: 'ai.suggestions.dashboard.createProject', defaultText: 'Create a new project for Q1 planning', icon: '📋', category: 'project' },
  { textKey: 'ai.suggestions.dashboard.scheduleMeeting', defaultText: 'Schedule a team meeting tomorrow at 2pm', icon: '📅', category: 'meeting' },
  { textKey: 'ai.suggestions.dashboard.createNote', defaultText: 'Create a note about project requirements', icon: '📝', category: 'note' },
  { textKey: 'ai.suggestions.dashboard.sendMessage', defaultText: 'Send a message to the team channel', icon: '💬', category: 'message' },
  { textKey: 'ai.suggestions.dashboard.addTask', defaultText: 'Add a task to review design mockups', icon: '✅', category: 'task' },
]

interface AICommandPromptProps {
  compact?: boolean
}

export function AICommandPrompt({ compact = false }: AICommandPromptProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const intl = useIntl()
  const [prompt, setPrompt] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [lastResponse, setLastResponse] = useState<string | null>(null)

  // Get or create session for this workspace
  const { data: sessionData } = useGetOrCreateSession(workspaceId || '')

  // LangChain execute command mutation
  const executeCommand = useExecuteCommand()

  // Build suggestions with translations
  const suggestions = suggestionConfigs.map(config => ({
    text: intl.formatMessage({ id: config.textKey, defaultMessage: config.defaultText }),
    icon: config.icon,
    category: config.category
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || executeCommand.isPending || !workspaceId) return

    setShowSuggestions(false)
    setLastResponse(null)

    try {
      const result = await executeCommand.mutateAsync({
        command: prompt,
        workspaceId,
        sessionId: sessionData?.sessionId,
        executeActions: true,
        context: {
          currentView: 'dashboard',
        }
      })

      if (result.success) {
        setLastResponse(result.message)

        // Show success toast with AI response
        toast({
          title: intl.formatMessage({ id: 'ai.toast.commandExecuted', defaultMessage: 'Command Executed' }),
          description: result.message,
        })

        // Navigate based on actions taken
        const actionsTaken = result.actions?.filter(a => a.success) || []
        if (actionsTaken.length > 0) {
          const firstAction = actionsTaken[0]
          navigateBasedOnAction(firstAction.tool)
        }

        // Invalidate all relevant caches
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['calendar'] })
        queryClient.invalidateQueries({ queryKey: ['notes'] })
        queryClient.invalidateQueries({ queryKey: ['chat'] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })

        setPrompt('')
      } else {
        toast({
          title: intl.formatMessage({ id: 'ai.toast.commandFailed', defaultMessage: 'Command Failed' }),
          description: result.error || result.message,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('AutoPilot execution error:', error)
      toast({
        title: intl.formatMessage({ id: 'ai.toast.commandFailed', defaultMessage: 'Command Failed' }),
        description: error.message || intl.formatMessage({ id: 'ai.toast.commandFailedDesc', defaultMessage: 'Something went wrong. Please try again.' }),
        variant: 'destructive'
      })
    }
  }

  const navigateBasedOnAction = (tool: string) => {
    if (!workspaceId) return

    switch (tool) {
      case 'create_task':
      case 'list_tasks':
      case 'update_task':
      case 'create_project':
        navigate(`/workspaces/${workspaceId}/projects`)
        break
      case 'create_calendar_event':
      case 'list_calendar_events':
        navigate(`/workspaces/${workspaceId}/calendar`)
        break
      case 'send_channel_message':
      case 'send_direct_message':
      case 'list_channels':
        navigate(`/workspaces/${workspaceId}/chat`)
        break
      case 'create_note':
      case 'update_note':
      case 'search_notes':
        navigate(`/workspaces/${workspaceId}/notes`)
        break
      case 'create_video_meeting':
      case 'schedule_video_meeting':
        navigate(`/workspaces/${workspaceId}/video-calls`)
        break
    }
  }

  const handleSuggestionClick = (suggestion: { text: string; icon: string; category: string }) => {
    setPrompt(suggestion.text)
    setShowSuggestions(false)
  }

  // Compact version for header row
  if (compact) {
    return (
      <div className="relative w-full">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-shrink-0">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {intl.formatMessage({ id: 'ai.commandCenter.title', defaultMessage: 'AI Command Center' })}
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Powered by LangChain
                </p>
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  placeholder={intl.formatMessage({ id: 'ai.commandCenter.placeholder', defaultMessage: 'e.g., Create a new project for Q1 planning' })}
                  disabled={executeCommand.isPending}
                  className="w-full px-4 pr-12 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!prompt.trim() || executeCommand.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                >
                  {executeCommand.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* AI Response */}
            {lastResponse && (
              <div className="mt-3 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-800 dark:text-emerald-200">{lastResponse}</p>
              </div>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && !executeCommand.isPending && (
              <div className="absolute z-50 left-4 right-4 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  {intl.formatMessage({ id: 'ai.commandCenter.tryCommands', defaultMessage: 'Try these commands' })}
                </p>
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleSuggestionClick(suggestion)
                      }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center gap-2 group"
                    >
                      <span className="text-lg">{suggestion.icon}</span>
                      <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                        {suggestion.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    )
  }

  // Full version for content area
  return (
    <div className="relative max-w-2xl mx-auto">
      {/* AI Command Input */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
              {intl.formatMessage({ id: 'ai.commandCenter.title', defaultMessage: 'AI Command Center' })}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {intl.formatMessage({ id: 'ai.commandCenter.description', defaultMessage: "Tell me what you'd like to do" })}
              <span className="ml-1 text-emerald-600 dark:text-emerald-400">- Powered by LangChain</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200)
              }}
              placeholder={intl.formatMessage({ id: 'ai.commandCenter.placeholder', defaultMessage: 'e.g., Create a new project for Q1 planning' })}
              disabled={executeCommand.isPending}
              className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!prompt.trim() || executeCommand.isPending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {executeCommand.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {/* AI Response */}
          {lastResponse && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-800 dark:text-emerald-200">{lastResponse}</p>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && !executeCommand.isPending && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 shadow-lg">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                {intl.formatMessage({ id: 'ai.commandCenter.tryCommands', defaultMessage: 'Try these commands' })}
              </p>
              <div className="space-y-0.5">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSuggestionClick(suggestion)
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center gap-2 group"
                  >
                    <span className="text-base">{suggestion.icon}</span>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 text-xs">
                      {suggestion.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
