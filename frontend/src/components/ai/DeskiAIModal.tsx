import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Send,
  Loader2,
  Wand2,
  User,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { useToast } from '../../hooks/use-toast'
import { autopilotApi, useGetOrCreateSession } from '../../lib/api/autopilot-api'

interface AutoPilotModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
  status?: string
  actions?: { tool: string; success: boolean; message: string }[]
}

export function AutoPilotModal({ isOpen, onClose }: AutoPilotModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  // Get auth token from localStorage
  const getAuthToken = () => localStorage.getItem('auth_token') || ''

  // Get or create session
  const { data: sessionData } = useGetOrCreateSession(workspaceId || '')

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    // Reset messages when modal opens
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm Auto Pilot, your workspace assistant. I can help you create tasks, schedule meetings, send messages, take notes, and more. What would you like to do?",
        timestamp: new Date()
      }])
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const navigateBasedOnAction = (tool: string) => {
    if (!workspaceId) return

    const routes: Record<string, string> = {
      create_task: `/workspaces/${workspaceId}/projects`,
      list_tasks: `/workspaces/${workspaceId}/projects`,
      update_task: `/workspaces/${workspaceId}/projects`,
      create_project: `/workspaces/${workspaceId}/projects`,
      create_calendar_event: `/workspaces/${workspaceId}/calendar`,
      list_calendar_events: `/workspaces/${workspaceId}/calendar`,
      send_channel_message: `/workspaces/${workspaceId}/chat`,
      send_direct_message: `/workspaces/${workspaceId}/chat`,
      list_channels: `/workspaces/${workspaceId}/chat`,
      create_note: `/workspaces/${workspaceId}/notes`,
      update_note: `/workspaces/${workspaceId}/notes`,
      search_notes: `/workspaces/${workspaceId}/notes`,
      create_video_meeting: `/workspaces/${workspaceId}/video-calls`,
      schedule_video_meeting: `/workspaces/${workspaceId}/video-calls`,
    }

    const route = routes[tool]
    if (route) navigate(route)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = getAuthToken()
    if (!prompt.trim() || isStreaming || !workspaceId || !token) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date()
    }

    const assistantMessageId = `assistant-${Date.now()}`
    const streamingMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      status: 'Processing your request...',
      actions: []
    }

    setMessages(prev => [...prev, userMessage, streamingMessage])
    setPrompt('')
    setIsStreaming(true)
    setStreamingMessageId(assistantMessageId)

    let completedActions: { tool: string; success: boolean; message: string }[] = []
    let streamedContent = ''

    try {
      await autopilotApi.executeCommandStream(
        {
          command: userMessage.content,
          workspaceId,
          sessionId: sessionData?.sessionId,
          executeActions: true,
          context: { currentView: 'modal' }
        },
        {
          onStatus: (status, message) => {
            setMessages(prev => prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, status: message, isLoading: true }
                : m
            ))
          },
          onAction: (tool, success, message) => {
            completedActions = [...completedActions, { tool, success, message }]
            setMessages(prev => prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, actions: completedActions }
                : m
            ))
          },
          onText: (content) => {
            streamedContent = content
            setMessages(prev => prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, content, isLoading: false, status: undefined }
                : m
            ))
          },
          onTextDelta: (content) => {
            streamedContent += content
            setMessages(prev => prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: streamedContent, isLoading: false, status: undefined }
                : m
            ))
          },
          onComplete: (result) => {
            // Invalidate caches
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            queryClient.invalidateQueries({ queryKey: ['calendar'] })
            queryClient.invalidateQueries({ queryKey: ['notes'] })
            queryClient.invalidateQueries({ queryKey: ['chat'] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })

            // Navigate after a short delay if actions were taken
            const successActions = result.actions?.filter(a => a.success).map(a => a.tool) || []
            if (successActions.length > 0) {
              setTimeout(() => {
                navigateBasedOnAction(successActions[0])
                onClose()
              }, 2000)
            }
          },
          onError: (error) => {
            setMessages(prev => prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: error || 'Sorry, something went wrong.', isLoading: false, status: undefined }
                : m
            ))
            toast({
              title: 'Something went wrong',
              description: error || 'Please try again.',
              variant: 'destructive'
            })
          }
        },
        token
      )
    } catch (error: any) {
      console.error('Auto Pilot streaming error:', error)
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: error.message || 'Sorry, something went wrong.', isLoading: false, status: undefined }
          : m
      ))
      toast({
        title: 'Something went wrong',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsStreaming(false)
      setStreamingMessageId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal - Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-2xl h-[600px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                      Auto Pilot
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Your workspace assistant
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      ) : (
                        <Wand2 className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block px-4 py-2.5 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-br-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                      }`}>
                        {message.isLoading ? (
                          <div className="space-y-2">
                            {/* Status indicator */}
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                              <span className="text-sm">{message.status || 'Thinking...'}</span>
                            </div>

                            {/* Action progress */}
                            {message.actions && message.actions.length > 0 && (
                              <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                                {message.actions.map((action, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs">
                                    {action.success ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                                    )}
                                    <span className={action.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                      {action.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Completed actions summary */}
                            {message.actions && message.actions.length > 0 && (
                              <div className="space-y-1 pb-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                                {message.actions.map((action, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs">
                                    {action.success ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                                    )}
                                    <span className={action.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                      {action.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        )}
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <form onSubmit={handleSubmit}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        disabled={isStreaming}
                        rows={1}
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none max-h-32"
                        style={{ minHeight: '44px' }}
                      />
                    </div>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!prompt.trim() || isStreaming}
                      className="h-11 w-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg disabled:opacity-50 flex-shrink-0"
                    >
                      {isStreaming ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Floating AI Button for fixed position
export function AutoPilotFloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 group"
    >
      {/* Button */}
      <div className="relative w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl">
        <Wand2 className="w-6 h-6 text-white" />
      </div>

      {/* Tooltip */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Auto Pilot
        <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-gray-900" />
      </div>
    </motion.button>
  )
}
