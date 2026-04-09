// DeskiAssistantModal.tsx - Unified AI Assistant Modal with Streaming & Typing Effect
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Send,
  Loader2,
  Wand2,
  User,
  Sparkles,
  CheckCircle2,
  XCircle,
  Trash2,
  Copy,
  Check,
  History,
  Paperclip,
  Plus,
  MessageSquare,
  FileText,
  Image,
  File,
  ChevronLeft,
  Link2,
  Calendar,
  FolderKanban,
  StickyNote,
  ListTodo,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useTypingEffect } from './hooks/useTypingEffect'
import { useAssistantStream } from './hooks/useAssistantStream'
import { getSuggestionsForView, getConfigForView, isViewSupported } from './config/suggestions'
import { useListSessions, useSessionHistory, useDeleteSession, autopilotApi, type SessionListItem, type ConversationMessage } from '@/lib/api/autopilot-api'
import { api } from '@/lib/fetch'
import type { DeskiAssistantModalProps, ChatMessage, ActionResult } from './types/assistant.types'

// Animation variants - using 'as const' for strict Framer Motion typing
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
} as const

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 }
  }
}

const messageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 20 }
  }
}

/**
 * DeskiAssistantModal - Unified AI Assistant with Streaming & Typing Effect
 *
 * This component combines the best features of AutoPilotModal and AskAIModal:
 * - SSE streaming with real-time token-by-token display
 * - Typing animation effect for a premium feel
 * - Context-aware suggestions based on current view
 * - Action execution feedback with checkmarks
 * - Modern glassmorphism design
 */
// Attached file type
interface AttachedFile {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document' | 'other'
}

// Referenced item type
interface ReferencedItem {
  id: string
  type: 'note' | 'task' | 'event' | 'project' | 'file'
  title: string
  description?: string
}

// Reference type config
const referenceTypes = [
  { type: 'event', label: 'Calendar Event', icon: Calendar, color: 'text-blue-500' },
  { type: 'note', label: 'Note', icon: StickyNote, color: 'text-yellow-500' },
  { type: 'task', label: 'Task', icon: ListTodo, color: 'text-green-500' },
  { type: 'project', label: 'Project', icon: FolderKanban, color: 'text-purple-500' },
  { type: 'file', label: 'File', icon: File, color: 'text-gray-500' },
] as const

export function DeskiAssistantModal({
  isOpen,
  onClose,
  currentView = 'dashboard',
  projects = [],
  onProjectsChanged
}: DeskiAssistantModalProps) {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat')
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  // Reference picker state
  const [referencedItems, setReferencedItems] = useState<ReferencedItem[]>([])
  const [showReferencePicker, setShowReferencePicker] = useState(false)
  const [selectedRefType, setSelectedRefType] = useState<ReferencedItem['type'] | null>(null)
  const [refSearchQuery, setRefSearchQuery] = useState('')
  const [refSearchResults, setRefSearchResults] = useState<any[]>([])
  const [isSearchingRefs, setIsSearchingRefs] = useState(false)

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const intl = useIntl()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Session hooks
  const { data: sessions = [], isLoading: isLoadingSessions, refetch: refetchSessions } = useListSessions(workspaceId || '')
  const deleteSessionMutation = useDeleteSession()

  // Get context-aware config and suggestions
  const config = getConfigForView(currentView)
  const suggestions = getSuggestionsForView(currentView)
  const aiSupported = isViewSupported(currentView)

  // Typing effect for streaming messages
  const {
    displayedContent,
    isTyping,
    appendToBuffer,
    setFullContent,
    reset: resetTyping
  } = useTypingEffect({ minDelay: 15, maxDelay: 35, chunkSize: 2 })

  // Stream callbacks
  const streamCallbacks = {
    onStatusUpdate: useCallback((messageId: string, status: string) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, status, isLoading: true } : m
      ))
    }, []),

    onActionComplete: useCallback((messageId: string, action: ActionResult) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, actions: [...(m.actions || []), action] }
          : m
      ))
    }, []),

    onTextDelta: useCallback((messageId: string, delta: string) => {
      // Append to typing buffer for animation
      appendToBuffer(delta)
    }, [appendToBuffer]),

    onText: useCallback((messageId: string, content: string) => {
      // Full text replacement - display immediately
      setFullContent(content)
    }, [setFullContent]),

    onComplete: useCallback((messageId: string, result: any) => {
      // Finalize the message
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? {
            ...m,
            content: result.message || displayedContent,
            isLoading: false,
            isStreaming: false,
            status: undefined,
            success: result.success !== false
          }
          : m
      ))

      setIsStreaming(false)
      setStreamingMessageId(null)
      resetTyping()

      // Capture the session ID from the result (for new conversations)
      if (result.sessionId && !currentSessionId) {
        setCurrentSessionId(result.sessionId)
      }

      // Trigger project refresh if needed
      if (onProjectsChanged) {
        onProjectsChanged()
      }

      // Navigation after successful actions
      const successfulActions = result.actions?.filter((a: ActionResult) => a.success) || []
      if (successfulActions.length > 0 && workspaceId) {
        const tool = successfulActions[0].tool
        const routes: Record<string, string> = {
          create_task: `/workspaces/${workspaceId}/projects`,
          create_project: `/workspaces/${workspaceId}/projects`,
          create_calendar_event: `/workspaces/${workspaceId}/calendar`,
          create_note: `/workspaces/${workspaceId}/notes`,
          send_channel_message: `/workspaces/${workspaceId}/chat`,
          send_direct_message: `/workspaces/${workspaceId}/chat`,
        }
        // Optional: Navigate and close after delay
        // const route = routes[tool]
        // if (route) {
        //   setTimeout(() => { navigate(route); onClose(); }, 2000)
        // }
      }
    }, [displayedContent, resetTyping, onProjectsChanged, workspaceId, currentSessionId]),

    onError: useCallback((messageId: string, error: string) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? {
            ...m,
            content: error || 'Sorry, something went wrong. Please try again.',
            isLoading: false,
            isStreaming: false,
            status: undefined,
            success: false
          }
          : m
      ))

      setIsStreaming(false)
      setStreamingMessageId(null)
      resetTyping()

      toast({
        title: intl.formatMessage({ id: 'ai.toast.error', defaultMessage: 'Error' }),
        description: error || 'Something went wrong',
        variant: 'destructive'
      })
    }, [resetTyping, toast, intl])
  }

  const { executeStream } = useAssistantStream(streamCallbacks, { sessionId: currentSessionId })

  // Update streaming message with typed content
  useEffect(() => {
    if (streamingMessageId && (isTyping || displayedContent)) {
      setMessages(prev => prev.map(m =>
        m.id === streamingMessageId
          ? { ...m, content: displayedContent, isLoading: displayedContent.length === 0 }
          : m
      ))
    }
  }, [displayedContent, isTyping, streamingMessageId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }

    // Set welcome message when modal opens with empty messages
    if (isOpen && messages.length === 0) {
      const welcomeMessage = config.welcomeKey
        ? intl.formatMessage({ id: config.welcomeKey, defaultMessage: config.welcomeDefault || '' })
        : config.welcomeDefault || "Hi! I'm Auto Pilot, your workspace assistant. What would you like to do?"

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }])
    }
  }, [isOpen, config, intl, messages.length])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Read file content as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  // Read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Process attached files and build context
  const processAttachedFiles = async (): Promise<{
    textContent: string
    images: { name: string; base64: string; mimeType: string }[]
  }> => {
    const textContent: string[] = []
    const images: { name: string; base64: string; mimeType: string }[] = []

    for (const attachedFile of attachedFiles) {
      const { file, type } = attachedFile

      if (type === 'image') {
        // Convert image to base64 for vision analysis
        const base64 = await readFileAsBase64(file)
        images.push({
          name: file.name,
          base64,
          mimeType: file.type
        })
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // Extract text from PDF using backend API
        try {
          const result = await autopilotApi.extractPdfText(file)
          textContent.push(`\n--- PDF: ${file.name} (${result.numPages} pages) ---\n${result.text}\n--- End of ${file.name} ---\n`)
        } catch (err) {
          console.error(`Failed to extract PDF ${file.name}:`, err)
          textContent.push(`\n--- PDF: ${file.name} ---\n[Error: Could not extract text from this PDF]\n--- End of ${file.name} ---\n`)
        }
      } else if (type === 'document' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        // Read text content
        try {
          const content = await readFileAsText(file)
          textContent.push(`\n--- File: ${file.name} ---\n${content}\n--- End of ${file.name} ---\n`)
        } catch (err) {
          console.error(`Failed to read file ${file.name}:`, err)
        }
      }
    }

    return {
      textContent: textContent.join('\n'),
      images
    }
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!prompt.trim() && attachedFiles.length === 0 && referencedItems.length === 0) || isStreaming || !workspaceId) return

    // Process attached files
    let fileContext = ''
    let imageAttachments: { name: string; base64: string; mimeType: string }[] = []

    if (attachedFiles.length > 0) {
      const { textContent, images } = await processAttachedFiles()
      fileContext = textContent
      imageAttachments = images
    }

    // Process referenced image files - fetch and convert to base64
    const imageRefs = referencedItems.filter(item =>
      item.type === 'file' && item.description && /^image\//i.test(item.description)
    )
    for (const imageRef of imageRefs) {
      try {
        // Fetch file details to get URL
        const fileDetails = await api.get<any>(`/workspaces/${workspaceId}/files/${imageRef.id}`)
        const fileUrl = fileDetails?.url || fileDetails?.data?.url
        if (fileUrl) {
          // Fetch the image and convert to base64
          const response = await fetch(fileUrl)
          const blob = await response.blob()
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const result = reader.result as string
              // Remove the data:image/xxx;base64, prefix
              const base64Data = result.split(',')[1] || result
              resolve(base64Data)
            }
            reader.readAsDataURL(blob)
          })
          imageAttachments.push({
            name: imageRef.title,
            base64,
            mimeType: imageRef.description || 'image/png'
          })
        }
      } catch (err) {
        console.error(`Failed to fetch referenced image ${imageRef.title}:`, err)
      }
    }

    // Build reference context (exclude image files that were converted to attachments)
    const nonImageRefs = referencedItems.filter(item =>
      !(item.type === 'file' && item.description && /^image\//i.test(item.description))
    )
    let referenceContext = ''
    if (nonImageRefs.length > 0) {
      const refDescriptions = nonImageRefs.map(item =>
        `- ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}: "${item.title}" (ID: ${item.id})`
      ).join('\n')
      referenceContext = `\n\n[Referenced Items - Use get_referenced_item tool to fetch details]\n${refDescriptions}`
    }

    // Build the full message with file content and references
    let fullMessage = prompt.trim()
    if (fileContext) {
      fullMessage = `${fullMessage}\n\n[Attached Documents]${fileContext}`
    }
    if (imageAttachments.length > 0) {
      fullMessage = `${fullMessage}\n\n[${imageAttachments.length} image(s) attached: ${imageAttachments.map(i => i.name).join(', ')}]`
    }
    if (referenceContext) {
      fullMessage = `${fullMessage}${referenceContext}`
    }

    // Display message (show just the user prompt, not the file/reference content)
    let displayContent = prompt.trim()
    if (attachedFiles.length > 0) {
      displayContent = `${displayContent}\n\n📎 ${attachedFiles.length} file(s) attached`
    }
    if (referencedItems.length > 0) {
      displayContent = `${displayContent}\n\n🔗 ${referencedItems.length} item(s) referenced`
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: displayContent,
      timestamp: new Date()
    }

    const assistantMessageId = `assistant-${Date.now()}`
    const streamingMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      isStreaming: true,
      status: intl.formatMessage({ id: 'ai.status.processing', defaultMessage: 'Processing your request...' }),
      actions: []
    }

    setMessages(prev => [...prev, userMessage, streamingMessage])
    setPrompt('')
    setAttachedFiles([]) // Clear attached files after sending
    setReferencedItems([]) // Clear referenced items after sending
    setIsStreaming(true)
    setStreamingMessageId(assistantMessageId)
    resetTyping()

    // Execute with streaming - include file context, images, and references
    await executeStream(fullMessage, assistantMessageId, {
      currentView,
      attachedImages: imageAttachments.length > 0 ? imageAttachments : undefined,
      referencedItems: referencedItems.length > 0 ? referencedItems : undefined
    })
  }

  // Handle keyboard in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: { textKey: string; defaultText: string }) => {
    const text = intl.formatMessage({ id: suggestion.textKey, defaultMessage: suggestion.defaultText })
    setPrompt(text)
    inputRef.current?.focus()
  }

  // Clear chat
  const handleClearChat = () => {
    setMessages([])
    resetTyping()
    setCurrentSessionId(null)
  }

  // Load session history
  const loadSessionHistory = async (sessionId: string) => {
    setIsLoadingHistory(true)
    try {
      const history = await autopilotApi.getHistory(sessionId)
      if (history && history.length > 0) {
        const loadedMessages: ChatMessage[] = history.map((msg: ConversationMessage, index: number) => ({
          id: `loaded-${sessionId}-${index}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          actions: msg.actions?.map(a => ({
            tool: a.tool,
            success: a.success,
            message: a.output?.message || a.tool
          }))
        }))
        setMessages(loadedMessages)
        setCurrentSessionId(sessionId)
        setActiveTab('chat')
      }
    } catch (error) {
      toast({
        title: 'Error loading history',
        description: 'Could not load conversation history',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Start new conversation
  const startNewConversation = () => {
    setMessages([])
    setCurrentSessionId(null)
    resetTyping()
    setActiveTab('chat')
  }

  // Delete session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteSessionMutation.mutateAsync(sessionId)
      refetchSessions()
      if (currentSessionId === sessionId) {
        setMessages([])
        setCurrentSessionId(null)
      }
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not delete conversation',
        variant: 'destructive'
      })
    }
  }

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newFiles: AttachedFile[] = files.map(file => {
      const type = file.type.startsWith('image/') ? 'image'
        : file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text') ? 'document'
        : 'other'

      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type,
        preview: type === 'image' ? URL.createObjectURL(file) : undefined
      }
    })
    setAttachedFiles(prev => [...prev, ...newFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  // Reference picker functions
  const searchReferences = useCallback(async (type: ReferencedItem['type'], query: string) => {
    if (!workspaceId) return
    setIsSearchingRefs(true)
    try {
      let results: any[] = []
      const searchParam = query ? `&search=${encodeURIComponent(query)}` : ''
      switch (type) {
        case 'event':
          const eventsRes = await api.get<any>(`/workspaces/${workspaceId}/calendar/events?limit=10${searchParam}`)
          const eventsData = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.data || eventsRes?.events || [])
          results = eventsData.map((e: any) => ({
            id: e.id,
            type: 'event' as const,
            title: e.title,
            description: e.description || (e.startTime ? new Date(e.startTime).toLocaleDateString() : '')
          }))
          break
        case 'note':
          const notesRes = await api.get<any>(`/workspaces/${workspaceId}/notes?limit=10${searchParam}`)
          const notesData = Array.isArray(notesRes) ? notesRes : (notesRes?.data || notesRes?.notes || [])
          results = notesData.map((n: any) => ({
            id: n.id,
            type: 'note' as const,
            title: n.title,
            description: n.content?.substring(0, 100) || ''
          }))
          break
        case 'task':
          const tasksRes = await api.get<any>(`/workspaces/${workspaceId}/projects/all-tasks?limit=10${searchParam}`)
          const tasksData = Array.isArray(tasksRes) ? tasksRes : (tasksRes?.data || tasksRes?.tasks || [])
          results = tasksData.map((t: any) => ({
            id: t.id,
            type: 'task' as const,
            title: t.title,
            description: t.status || ''
          }))
          break
        case 'project':
          const projectsRes = await api.get<any>(`/workspaces/${workspaceId}/projects?limit=10${searchParam}`)
          const projectsData = Array.isArray(projectsRes) ? projectsRes : (projectsRes?.data || projectsRes?.projects || [])
          results = projectsData.map((p: any) => ({
            id: p.id,
            type: 'project' as const,
            title: p.name,
            description: p.description || ''
          }))
          break
        case 'file':
          const filesRes = await api.get<any>(`/workspaces/${workspaceId}/files?limit=10${searchParam}`)
          const filesData = Array.isArray(filesRes) ? filesRes : (filesRes?.data || filesRes?.files || [])
          results = filesData.map((f: any) => ({
            id: f.id,
            type: 'file' as const,
            title: f.name,
            description: f.mimeType || ''
          }))
          break
      }
      setRefSearchResults(results)
    } catch (error) {
      console.error('Failed to search references:', error)
      setRefSearchResults([])
    } finally {
      setIsSearchingRefs(false)
    }
  }, [workspaceId])

  const addReference = (item: ReferencedItem) => {
    // Avoid duplicates
    if (!referencedItems.find(r => r.id === item.id && r.type === item.type)) {
      setReferencedItems(prev => [...prev, item])
    }
    setShowReferencePicker(false)
    setSelectedRefType(null)
    setRefSearchQuery('')
    setRefSearchResults([])
  }

  const removeReference = (itemId: string) => {
    setReferencedItems(prev => prev.filter(r => r.id !== itemId))
  }

  const getRefIcon = (type: ReferencedItem['type']) => {
    const config = referenceTypes.find(r => r.type === type)
    return config?.icon || File
  }

  const getRefColor = (type: ReferencedItem['type']) => {
    const config = referenceTypes.find(r => r.type === type)
    return config?.color || 'text-gray-500'
  }

  const getFileIcon = (type: 'image' | 'document' | 'other') => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      default: return <File className="w-4 h-4" />
    }
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Copy message
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive'
      })
    }
  }

  // Handle close
  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    // Don't clear messages on close - preserve conversation
    onClose()
  }

  // Render "Coming Soon" for unsupported views
  if (!aiSupported && isOpen) {
    return (
      <AnimatePresence>
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
          onClick={handleClose}
        />
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 text-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {intl.formatMessage({ id: 'ai.comingSoon.title', defaultMessage: 'AI Feature Coming Soon' })}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {intl.formatMessage({
                id: 'ai.comingSoon.description',
                defaultMessage: 'AI assistant for this module is currently under development. Stay tuned for updates!'
              })}
            </p>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleClose(e)
              }}
              variant="outline"
            >
              {intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-2xl h-[600px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  {activeTab === 'history' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveTab('chat')}
                      className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Wand2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                      {activeTab === 'history'
                        ? intl.formatMessage({ id: 'ai.assistant.history', defaultMessage: 'Chat History' })
                        : intl.formatMessage({ id: 'ai.assistant.title', defaultMessage: 'Auto Pilot' })}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activeTab === 'history'
                        ? `${sessions.length} ${intl.formatMessage({ id: 'ai.assistant.conversations', defaultMessage: 'conversations' })}`
                        : messages.length > 1
                          ? `${messages.length - 1} ${intl.formatMessage({ id: 'ai.assistant.messages', defaultMessage: 'messages' })}`
                          : intl.formatMessage({ id: config.descriptionKey, defaultMessage: 'Your AI assistant' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {activeTab === 'chat' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { refetchSessions(); setActiveTab('history'); }}
                        className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        title={intl.formatMessage({ id: 'ai.assistant.viewHistory', defaultMessage: 'View history' })}
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      {messages.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleClearChat}
                          className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                          title={intl.formatMessage({ id: 'ai.assistant.clearChat', defaultMessage: 'Clear chat' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {activeTab === 'history' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startNewConversation}
                      className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-xs">New</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClose(e)
                    }}
                    className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* History Tab */}
                {activeTab === 'history' ? (
                  <div className="space-y-2">
                    {isLoadingSessions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {intl.formatMessage({ id: 'ai.assistant.noHistory', defaultMessage: 'No conversations yet' })}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startNewConversation}
                          className="mt-4"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {intl.formatMessage({ id: 'ai.assistant.startNew', defaultMessage: 'Start a conversation' })}
                        </Button>
                      </div>
                    ) : (
                      sessions.map((session: SessionListItem) => (
                        <motion.div
                          key={session.sessionId}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            currentSessionId === session.sessionId ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' : ''
                          }`}
                          onClick={() => loadSessionHistory(session.sessionId)}
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {session.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {session.messageCount} messages • {formatRelativeTime(session.updatedAt)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteSession(session.sessionId, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                    {isLoadingHistory && (
                      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-10">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                          <span className="text-sm">Loading conversation...</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : messages.length === 1 && messages[0].id === 'welcome' ? (
                  // Show suggestions when only welcome message exists
                  <div className="space-y-4">
                    {/* Welcome message */}
                    <motion.div
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex gap-3"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="max-w-[85%]">
                        <div className="inline-block px-4 py-2.5 rounded-2xl rounded-bl-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                          <p className="text-sm whitespace-pre-wrap">{messages[0].content}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Suggestions */}
                    <div className="mt-6">
                      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                        {intl.formatMessage({ id: 'ai.assistant.quickCommands', defaultMessage: 'Quick Commands' })}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {suggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-left px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm flex items-start gap-3 group border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm"
                          >
                            <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
                            <span className="text-muted-foreground group-hover:text-foreground leading-tight">
                              {intl.formatMessage({ id: suggestion.textKey, defaultMessage: suggestion.defaultText })}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Show chat messages
                  messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                      className={`flex gap-3 group ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
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
                        <div className={`relative inline-block px-4 py-2.5 rounded-2xl ${message.role === 'user'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-br-md'
                            : message.success === false
                              ? 'bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800 rounded-bl-md'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                          }`}>
                          {/* Loading/Streaming state */}
                          {message.isLoading && !message.content ? (
                            <div className="space-y-2">
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

                              {/* Message content with typing cursor */}
                              <p className="text-sm whitespace-pre-wrap">
                                {message.content}
                                {message.isStreaming && isTyping && (
                                  <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                    className="inline-block w-0.5 h-4 bg-emerald-500 ml-0.5 align-middle"
                                  />
                                )}
                              </p>
                            </div>
                          )}

                          {/* Copy button for assistant messages */}
                          {message.role === 'assistant' && !message.isLoading && message.content && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyMessage(message.id, message.content)}
                              className="absolute -right-10 top-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Timestamp */}
                        <p className={`text-xs text-gray-400 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area - Only show in chat tab */}
              {activeTab === 'chat' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {/* Attached Files & Referenced Items Preview */}
                  {(attachedFiles.length > 0 || referencedItems.length > 0) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Attached Files */}
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="relative flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg group"
                        >
                          {file.type === 'image' && file.preview ? (
                            <img src={file.preview} alt={file.file.name} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            getFileIcon(file.type)
                          )}
                          <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[100px] truncate">
                            {file.file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachedFile(file.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {/* Referenced Items */}
                      {referencedItems.map((item) => {
                        const RefIcon = getRefIcon(item.type)
                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            className="relative flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg group"
                          >
                            <RefIcon className={`w-4 h-4 ${getRefColor(item.type)}`} />
                            <span className="text-xs text-emerald-700 dark:text-emerald-300 max-w-[120px] truncate">
                              {item.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeReference(item.id)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Reference Picker Modal */}
                  <AnimatePresence>
                    {showReferencePicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="mb-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg"
                      >
                        {!selectedRefType ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {intl.formatMessage({ id: 'ai.reference.selectType', defaultMessage: 'Select item type' })}
                              </span>
                              <button
                                onClick={() => setShowReferencePicker(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                <X className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {referenceTypes.map((refType) => (
                                <button
                                  key={refType.type}
                                  onClick={() => {
                                    setSelectedRefType(refType.type)
                                    searchReferences(refType.type, '')
                                  }}
                                  className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                  <refType.icon className={`w-5 h-5 ${refType.color}`} />
                                  <span className="text-xs text-gray-600 dark:text-gray-400">{refType.label.split(' ')[0]}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <button
                                onClick={() => {
                                  setSelectedRefType(null)
                                  setRefSearchQuery('')
                                  setRefSearchResults([])
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                <ChevronLeft className="w-4 h-4 text-gray-500" />
                              </button>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {referenceTypes.find(r => r.type === selectedRefType)?.label}
                              </span>
                              <button
                                onClick={() => {
                                  setShowReferencePicker(false)
                                  setSelectedRefType(null)
                                  setRefSearchQuery('')
                                  setRefSearchResults([])
                                }}
                                className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                <X className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                            <div className="relative mb-2">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                value={refSearchQuery}
                                onChange={(e) => {
                                  setRefSearchQuery(e.target.value)
                                  searchReferences(selectedRefType, e.target.value)
                                }}
                                placeholder={intl.formatMessage({ id: 'ai.reference.search', defaultMessage: 'Search...' })}
                                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {isSearchingRefs ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                </div>
                              ) : refSearchResults.length > 0 ? (
                                refSearchResults.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => addReference(item)}
                                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors"
                                  >
                                    {(() => {
                                      const Icon = getRefIcon(item.type)
                                      return <Icon className={`w-4 h-4 ${getRefColor(item.type)}`} />
                                    })()}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.title}</p>
                                      {item.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                                      )}
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 text-center py-4">
                                  {intl.formatMessage({ id: 'ai.reference.noResults', defaultMessage: 'No items found' })}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit}>
                    <div className="flex items-end gap-2">
                      {/* File Upload Button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt,.md"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isStreaming}
                        className="h-11 w-11 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
                        title={intl.formatMessage({ id: 'ai.assistant.attachFile', defaultMessage: 'Attach file' })}
                      >
                        <Paperclip className="w-5 h-5 text-gray-500" />
                      </Button>

                      {/* Reference Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowReferencePicker(!showReferencePicker)}
                        disabled={isStreaming}
                        className={`h-11 w-11 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 ${showReferencePicker ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''}`}
                        title={intl.formatMessage({ id: 'ai.assistant.addReference', defaultMessage: 'Add reference from workspace' })}
                      >
                        <Link2 className={`w-5 h-5 ${showReferencePicker ? 'text-emerald-600' : 'text-gray-500'}`} />
                      </Button>

                      <div className="flex-1 relative">
                        <textarea
                          ref={inputRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={intl.formatMessage({ id: config.placeholderKey, defaultMessage: 'Type a message...' })}
                          disabled={isStreaming}
                          rows={1}
                          className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none max-h-32 transition-shadow"
                          style={{ minHeight: '44px' }}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!prompt.trim() || isStreaming}
                        className="h-11 w-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:shadow-none flex-shrink-0 transition-all"
                      >
                        {isStreaming ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      {intl.formatMessage({
                        id: 'ai.assistant.pressEnter',
                        defaultMessage: 'Press Enter to send, Shift+Enter for new line'
                      })}
                    </p>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * DeskiAssistantFloatingButton - Floating action button to open the assistant
 */
export function DeskiAssistantFloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />

      {/* Button */}
      <div className="relative w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
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
