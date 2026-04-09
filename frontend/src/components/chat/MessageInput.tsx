import { useState, useRef, useEffect, lazy, Suspense, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import {
  Send,
  Smile,
  Paperclip,
  Mic,
  Video,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link2,
  X,
  Calendar,
  Sparkles,
  FileText,
  FolderOpen,
  Slash,
  Loader2,
  HardDrive,
  ImagePlay,
  BarChart2,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ContentMentionMenu } from '@/components/ui/content-mention-menu'
import { Badge } from '@/components/ui/badge'
import { GifPicker } from '@/components/chat/GifPicker'
import type { IGif } from '@giphy/js-types'

// Lazy load the Quill editor
const ReactQuill = lazy(() => import('react-quill-new'))
import 'react-quill-new/dist/quill.snow.css'
import Quill from 'quill'

// ============================================================================
// CUSTOM MENTION BLOT
// ============================================================================

// Get the Embed class from Quill
const Embed = Quill.import('blots/embed') as any

// Custom Mention Blot - renders mentions as atomic elements
class MentionBlot extends Embed {
  static blotName = 'mention'
  static tagName = 'span'
  static className = 'mention-blot'

  static create(data: { id?: string; value: string }) {
    const node = super.create() as HTMLElement
    node.setAttribute('data-mention', data.value)
    if (data.id) {
      node.setAttribute('data-id', data.id)
    }
    node.textContent = `@${data.value}`
    node.contentEditable = 'false'
    return node
  }

  static value(node: HTMLElement) {
    return {
      id: node.getAttribute('data-id') || '',
      value: node.getAttribute('data-mention') || ''
    }
  }

  // Make the blot behave as an atomic element
  length() {
    return 1
  }
}

// Register the custom blot with Quill
Quill.register(MentionBlot, true)

// ============================================================================
// TYPES
// ============================================================================

/** Poll types for attached content */
export interface PollOption {
  id: string
  text: string
  voteCount: number
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  isOpen: boolean
  showResultsBeforeVoting: boolean
  createdBy: string
  totalVotes: number
}

/** Content item attached via slash command or Drive picker */
export interface AttachedContent {
  id: string
  title?: string
  name?: string
  type: 'notes' | 'events' | 'files' | 'drive' | 'poll' | 'youtube'
  subtitle?: string
  url?: string
  thumbnail?: string
  metadata?: any
  // Drive-specific fields
  driveFileUrl?: string
  driveThumbnailUrl?: string
  driveMimeType?: string
  driveFileSize?: number
  // Poll-specific fields
  poll?: Poll
}

export interface MessageInputProps {
  /** Current message value */
  value: string
  /** Called when the message value changes */
  onChange: (value: string) => void
  /** Called when user sends the message */
  onSend: (content: string, files: File[], attachedContent?: AttachedContent[]) => void
  /** Optional callback for @mention trigger detection */
  onMentionTrigger?: (query: string, position: number) => void
  /** Optional callback when # channel trigger detected */
  onChannelTrigger?: (query: string, position: number) => void
  /** Optional callback when / slash command trigger detected */
  onSlashCommandTrigger?: (query: string, position: number) => void
  /** Placeholder text */
  placeholder?: string
  /** Disable input */
  disabled?: boolean
  /** Show AI mode toggle */
  showAIMode?: boolean
  /** AI mode active state */
  isAIMode?: boolean
  /** Toggle AI mode */
  onAIModeToggle?: () => void
  /** AI processing state */
  isProcessingAI?: boolean
  /** Show schedule message option */
  showScheduleOption?: boolean
  /** Called when schedule message is clicked */
  onScheduleMessage?: () => void
  /** Called when show AI history is clicked */
  onShowAIHistory?: () => void
  /** Show emoji picker */
  showEmojiPicker?: boolean
  /** Show GIF picker */
  showGifPicker?: boolean
  /** Show file upload */
  showFileUpload?: boolean
  /** Show voice/video recording */
  showRecording?: boolean
  /** Show formatting toolbar */
  showFormattingToolbar?: boolean
  /** Maximum file size in MB */
  maxFileSizeMB?: number
  /** Accepted file types */
  acceptedFileTypes?: string
  /** Custom class name */
  className?: string
  /** Sending state */
  isSending?: boolean
  /** Enable slash command menu for content mentions */
  enableSlashCommands?: boolean
  /** Show Google Drive picker option */
  showDrivePicker?: boolean
  /** Called when Drive picker is opened */
  onOpenDrivePicker?: () => void
  /** Show YouTube picker option */
  showYoutubePicker?: boolean
  /** Called when YouTube picker is opened */
  onOpenYoutubePicker?: () => void
  /** Show poll creator option */
  showPollButton?: boolean
  /** Called when poll button is clicked */
  onOpenPollCreator?: () => void
}

/** Methods exposed via ref */
export interface MessageInputRef {
  /** Insert a mention at the current cursor position, replacing the trigger text */
  insertMention: (username: string, triggerLength: number) => void
  /** Focus the editor */
  focus: () => void
  /** Get the Quill editor instance */
  getEditor: () => any
  /** Add attached content (for Drive files, etc.) */
  addAttachedContent: (items: AttachedContent[]) => void
}

// ============================================================================
// MESSAGE INPUT COMPONENT
// ============================================================================

export const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(({
  value,
  onChange,
  onSend,
  onMentionTrigger,
  onChannelTrigger,
  onSlashCommandTrigger,
  placeholder = 'Type a message...',
  disabled = false,
  showAIMode = true,
  isAIMode = false,
  onAIModeToggle,
  isProcessingAI = false,
  showScheduleOption = true,
  onScheduleMessage,
  onShowAIHistory,
  showEmojiPicker = true,
  showGifPicker = true,
  showFileUpload = true,
  showRecording = true,
  showFormattingToolbar = true,
  maxFileSizeMB = 50,
  acceptedFileTypes = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt',
  className,
  isSending = false,
  enableSlashCommands = true,
  showDrivePicker = true,
  onOpenDrivePicker,
  showYoutubePicker = true,
  onOpenYoutubePicker,
  showPollButton = true,
  onOpenPollCreator,
}, ref) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showEmojiDropdown, setShowEmojiDropdown] = useState(false)
  const [showGifDropdown, setShowGifDropdown] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [recordingTime, setRecordingTime] = useState(0)

  // Slash command / content mention state
  const [showContentMenu, setShowContentMenu] = useState(false)
  const [contentMenuPosition, setContentMenuPosition] = useState<{ top: number; left: number } | undefined>()
  const [slashCommandQuery, setSlashCommandQuery] = useState('')
  const [attachedContent, setAttachedContent] = useState<AttachedContent[]>([])

  // Link modal state
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [savedSelection, setSavedSelection] = useState<{ index: number; length: number } | null>(null)

  // ============================================================================
  // REFS
  // ============================================================================

  const quillRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSlashIndexRef = useRef<number>(-1)
  const dismissedSlashIndexRef = useRef<number>(-1)
  const lastMentionTriggerIndexRef = useRef<number>(-1)

  // ============================================================================
  // IMPERATIVE HANDLE (expose methods via ref)
  // ============================================================================

  useImperativeHandle(ref, () => ({
    insertMention: (username: string, triggerLength: number) => {
      const quill = quillRef.current?.getEditor?.()
      if (!quill) return

      const selection = quill.getSelection()
      if (!selection) return

      // Calculate the position of the @ trigger
      const cursorIndex = selection.index
      const startIndex = cursorIndex - triggerLength - 1 // -1 for the @ symbol

      if (startIndex >= 0) {
        // Delete the @query text
        quill.deleteText(startIndex, triggerLength + 1) // +1 for the @ symbol

        // Insert the mention as plain text with @ symbol
        const mentionText = `@${username}`
        quill.insertText(startIndex, mentionText, { bold: true, color: '#3b82f6' })

        // Insert a space after the mention
        quill.insertText(startIndex + mentionText.length, ' ')

        // Move cursor after the space
        quill.setSelection(startIndex + mentionText.length + 1)
      }

      quill.focus()
    },
    focus: () => {
      const quill = quillRef.current?.getEditor?.()
      if (quill) {
        quill.focus()
      }
    },
    getEditor: () => quillRef.current?.getEditor?.(),
    addAttachedContent: (items: AttachedContent[]) => {
      setAttachedContent(prev => {
        // Filter out duplicates
        const newItems = items.filter(item =>
          !prev.some(existing => existing.id === item.id && existing.type === item.type)
        )
        return [...prev, ...newItems]
      })
    }
  }), [])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      setRecordingTime(0)
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording])

  // Close menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showContentMenu) {
        handleMenuClose(false)
        e.preventDefault()
        e.stopPropagation()
      }
    }

    if (showContentMenu) {
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [showContentMenu])

  // Keep focus in editor when content menu is open
  useEffect(() => {
    if (!showContentMenu) return

    const refocusEditor = () => {
      const quill = quillRef.current?.getEditor()
      if (quill) {
        // Small delay to let any click events complete
        setTimeout(() => {
          quill.focus()
          // Restore cursor position after the slash
          if (lastSlashIndexRef.current >= 0) {
            const cursorPos = lastSlashIndexRef.current + 1 + slashCommandQuery.length
            quill.setSelection(cursorPos, 0)
          }
        }, 10)
      }
    }

    // Refocus on any mouseup (after click completes)
    document.addEventListener('mouseup', refocusEditor, true)
    return () => document.removeEventListener('mouseup', refocusEditor, true)
  }, [showContentMenu, slashCommandQuery])

  // ============================================================================
  // QUILL CONFIGURATION
  // ============================================================================

  // Ref to hold the latest handleSendMessage function
  const handleSendMessageRef = useRef<() => void>(() => {})

  // Handle Enter key to send message, Shift+Enter for new line
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleSendMessageRef.current()
    }
  }, [])

  // Quill modules configuration - no toolbar (we use custom buttons)
  const quillModules = useMemo(() => ({
    toolbar: false, // Disable default toolbar - we use custom buttons
    keyboard: {
      bindings: {
        // Disable default Enter behavior - we handle it ourselves
        enter: {
          key: 13,
          handler: () => {
            // Return true to let our keydown handler process it
            return true
          }
        }
      }
    }
  }), [])

  // Quill formats
  const quillFormats = useMemo(() => [
    'bold', 'italic', 'underline', 'strike',
    'list',
    'blockquote', 'code-block',
    'link',
    'mention',
    'image' // For GIF support
  ], [])

  // ============================================================================
  // QUILL FORMATTING FUNCTIONS
  // ============================================================================

  const applyFormat = useCallback((format: string, value?: any) => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill) return

    // Focus the editor first to restore selection
    quill.focus()

    // Get selection after focusing (this ensures we have a valid selection)
    const selection = quill.getSelection(true) // true forces getting the selection

    if (selection) {
      const currentFormat = quill.getFormat(selection)
      if (format === 'list') {
        quill.format('list', currentFormat.list === value ? false : value)
      } else {
        // Toggle the format
        const isActive = currentFormat[format]
        quill.format(format, !isActive)
      }
    } else {
      // If no selection, apply format at cursor position
      const currentFormat = quill.getFormat()
      if (format === 'list') {
        quill.format('list', currentFormat.list === value ? false : value)
      } else {
        quill.format(format, !currentFormat[format])
      }
    }
  }, [])

  const insertLink = useCallback(() => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill) return

    const selection = quill.getSelection()
    if (selection) {
      const currentFormat = quill.getFormat(selection)
      if (currentFormat.link) {
        // If already a link, remove it
        quill.format('link', false)
        quill.focus()
      } else {
        // Save the current selection and get selected text
        setSavedSelection({ index: selection.index, length: selection.length })

        // Get selected text to pre-fill the display text field
        const selectedText = selection.length > 0
          ? quill.getText(selection.index, selection.length)
          : ''

        setLinkText(selectedText)
        setLinkUrl('')
        setShowLinkModal(true)
      }
    } else {
      // No selection, just open modal
      setSavedSelection(null)
      setLinkText('')
      setLinkUrl('')
      setShowLinkModal(true)
    }
  }, [])

  const handleInsertLink = useCallback(() => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill || !linkUrl.trim()) return

    // Ensure URL has protocol
    let finalUrl = linkUrl.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }

    const displayText = linkText.trim() || finalUrl

    if (savedSelection && savedSelection.length > 0) {
      // Replace selected text with link
      quill.deleteText(savedSelection.index, savedSelection.length)
      quill.insertText(savedSelection.index, displayText, 'link', finalUrl)
      quill.setSelection(savedSelection.index + displayText.length, 0)
    } else if (savedSelection) {
      // Insert link at cursor position
      quill.insertText(savedSelection.index, displayText, 'link', finalUrl)
      quill.setSelection(savedSelection.index + displayText.length, 0)
    } else {
      // Insert at end if no selection was saved
      const length = quill.getLength()
      quill.insertText(length - 1, displayText, 'link', finalUrl)
    }

    // Close modal and reset state
    setShowLinkModal(false)
    setLinkUrl('')
    setLinkText('')
    setSavedSelection(null)
    quill.focus()
  }, [linkUrl, linkText, savedSelection])

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFileUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = acceptedFileTypes
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      const validFiles = files.filter((file) => {
        const sizeMB = file.size / 1024 / 1024
        if (sizeMB > maxFileSizeMB) {
          console.warn(`File ${file.name} exceeds ${maxFileSizeMB}MB limit`)
          return false
        }
        return true
      })
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }
    input.click()
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // ============================================================================
  // RECORDING HANDLING
  // ============================================================================

  const handleStartRecording = async (type: 'audio' | 'video') => {
    try {
      const constraints = type === 'audio' ? { audio: true } : { video: true, audio: true }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      const options: MediaRecorderOptions = {
        mimeType: type === 'audio'
          ? 'audio/webm;codecs=opus'
          : navigator.userAgent.includes('Chrome')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      }

      const recorder = new MediaRecorder(stream, options)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data])
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, {
          type: type === 'audio' ? 'audio/webm' : 'video/webm',
        })
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: blob.type,
        })
        setSelectedFiles((prev) => [...prev, file])
        setRecordedChunks([])

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingType(type)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setIsRecording(false)
      setRecordingType(null)
      setMediaRecorder(null)
    }
  }

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // ============================================================================
  // EMOJI HANDLING
  // ============================================================================

  const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🔥', '👏', '💯', '🚀', '✨', '💡', '🎯', '🌟']

  const insertEmoji = useCallback((emoji: string) => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill) return

    const selection = quill.getSelection()
    const index = selection ? selection.index : quill.getLength() - 1

    quill.insertText(index, emoji)
    quill.setSelection(index + emoji.length)

    setShowEmojiDropdown(false)
    quill.focus()
  }, [])

  // ============================================================================
  // GIF HANDLING
  // ============================================================================

  const handleGifSelect = useCallback((gif: IGif) => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill) return

    const selection = quill.getSelection()
    const index = selection ? selection.index : quill.getLength() - 1

    // Use fixed_height for consistent sizing, fallback to original
    const gifUrl = gif.images.fixed_height?.url || gif.images.original?.url
    if (!gifUrl) return

    // Insert the GIF as an HTML image
    const gifHtml = `<img src="${gifUrl}" alt="GIF" class="chat-gif" loading="lazy" />`
    quill.clipboard.dangerouslyPasteHTML(index, gifHtml)

    // Move cursor after the inserted content
    setTimeout(() => {
      const length = quill.getLength()
      quill.setSelection(length, 0)
    }, 10)

    setShowGifDropdown(false)
    quill.focus()
  }, [])

  // ============================================================================
  // MENTION & CHANNEL & SLASH COMMAND DETECTION
  // ============================================================================

  // Function to check for triggers (@mentions, #channels, /commands)
  const checkForTriggers = useCallback(() => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill) return

    const selection = quill.getSelection()
    if (!selection) return

    const cursorIndex = selection.index
    const text = quill.getText(0, cursorIndex)

    // Find the start of the current word (looking for trigger characters)
    let wordStart = cursorIndex - 1
    while (wordStart >= 0 && !/\s/.test(text[wordStart])) {
      wordStart--
    }
    wordStart++

    const currentWord = text.substring(wordStart, cursorIndex)

    // Check for @ mention
    if (currentWord.startsWith('@') && onMentionTrigger) {
      const query = currentWord.substring(1)
      onMentionTrigger(query, cursorIndex)
    }

    // Check for # channel
    if (currentWord.startsWith('#') && onChannelTrigger) {
      const query = currentWord.substring(1)
      onChannelTrigger(query, cursorIndex)
    }

    // Check for / slash command (content mention)
    if (enableSlashCommands && currentWord.startsWith('/')) {
      const lastSlashIndex = wordStart

      // Skip if this exact slash position was already dismissed and menu is not open
      // But allow reopening if user is at a different position or menu is already open
      if (lastSlashIndex === dismissedSlashIndexRef.current && !showContentMenu) {
        // Check if the content has changed (user deleted and re-typed)
        // by comparing if we're truly at the same slash or a new one
        const quill = quillRef.current?.getEditor()
        if (quill) {
          const text = quill.getText()
          // If the character at dismissed position is still '/', skip
          // Otherwise, reset dismissed index (user deleted and re-typed)
          if (text[dismissedSlashIndexRef.current] === '/') {
            return
          } else {
            dismissedSlashIndexRef.current = -1
          }
        }
      }

      // Reset dismissed index if at a new/different slash position
      if (lastSlashIndex !== dismissedSlashIndexRef.current) {
        dismissedSlashIndexRef.current = -1
      }

      const textAfterSlash = currentWord.substring(1)

      // Allow the menu to show
      if (!textAfterSlash.includes('\n')) {
        setSlashCommandQuery(textAfterSlash)
        lastSlashIndexRef.current = lastSlashIndex

        // Calculate position for the mention menu
        if (!showContentMenu && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect()
          const bounds = quill.getBounds(lastSlashIndex)

          const menuWidth = 350
          const menuHeight = 350
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          const margin = 10

          let posX = containerRect.left + bounds.left + 20
          let posY = containerRect.top + bounds.top - menuHeight - 5

          // Smart positioning
          if (posY < margin) {
            posY = containerRect.top + bounds.top + bounds.height + 5
          }

          if (posX + menuWidth > viewportWidth - margin) {
            posX = viewportWidth - menuWidth - margin
          }

          posX = Math.max(margin, posX)
          posY = Math.max(margin, posY)

          setContentMenuPosition({ top: posY, left: posX })
        }

        setShowContentMenu(true)

        if (onSlashCommandTrigger) {
          onSlashCommandTrigger(textAfterSlash, cursorIndex)
        }
        return
      }
    } else if (showContentMenu && !currentWord.startsWith('/')) {
      // Close slash command menu if we're no longer in a slash command
      setShowContentMenu(false)
      setSlashCommandQuery('')
      dismissedSlashIndexRef.current = -1 // Reset so user can type / again
    } else if (!showContentMenu && !currentWord.startsWith('/')) {
      // Reset dismissed index when not on a slash and menu is closed
      // This allows user to type / again after moving away
      dismissedSlashIndexRef.current = -1
    }
  }, [enableSlashCommands, showContentMenu, onSlashCommandTrigger, onMentionTrigger, onChannelTrigger])

  // Handle Quill text change
  const handleQuillChange = useCallback((content: string, _delta: any, source: string) => {
    // Extract plain text for the value (the HTML is stored)
    onChange(content)

    if (source !== 'user') return

    // Check for triggers after a brief delay
    requestAnimationFrame(() => {
      checkForTriggers()
    })
  }, [onChange, checkForTriggers])

  // Handle menu close
  const handleMenuClose = useCallback((open: boolean) => {
    if (!open && showContentMenu) {
      dismissedSlashIndexRef.current = lastSlashIndexRef.current
      setShowContentMenu(false)
      setSlashCommandQuery('')
    }
  }, [showContentMenu])

  // Handle content selection from menu
  const handleContentSelect = useCallback((item: { id: string; title: string; type: 'notes' | 'events' | 'files'; subtitle?: string }) => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill || lastSlashIndexRef.current === -1) return

    const selection = quill.getSelection()
    if (!selection) return

    // Delete from / to current cursor position
    const deleteLength = selection.index - lastSlashIndexRef.current
    quill.deleteText(lastSlashIndexRef.current, deleteLength)

    // Insert the mention text
    const mentionText = `${item.title} `
    quill.insertText(lastSlashIndexRef.current, mentionText)

    // Move cursor to end of inserted text
    quill.setSelection(lastSlashIndexRef.current + mentionText.length)

    // Add the content item to attached content
    setAttachedContent(prev => {
      // Don't add duplicates
      if (prev.some(c => c.id === item.id && c.type === item.type)) {
        return prev
      }
      return [...prev, {
        id: item.id,
        title: item.title,
        type: item.type,
        subtitle: item.subtitle
      }]
    })

    // Close menu and reset state
    setShowContentMenu(false)
    setSlashCommandQuery('')
    lastSlashIndexRef.current = -1

    // Focus back on editor
    quill.focus()
  }, [])

  // Remove attached content
  const handleRemoveAttachedContent = (id: string) => {
    setAttachedContent(prev => prev.filter(item => item.id !== id))
  }

  // Get icon for content type
  const getContentIcon = (type: 'notes' | 'events' | 'files' | 'drive' | 'poll' | 'youtube') => {
    switch (type) {
      case 'notes':
        return <FileText className="h-3.5 w-3.5" />
      case 'events':
        return <Calendar className="h-3.5 w-3.5" />
      case 'files':
        return <FolderOpen className="h-3.5 w-3.5" />
      case 'drive':
        return <HardDrive className="h-3.5 w-3.5" />
      case 'poll':
        return <BarChart2 className="h-3.5 w-3.5" />
      case 'youtube':
        return <Video className="h-3.5 w-3.5" />
    }
  }

  // Get color for content type
  const getContentColor = (type: 'notes' | 'events' | 'files' | 'drive' | 'poll' | 'youtube') => {
    switch (type) {
      case 'notes':
        return 'text-blue-500 bg-blue-500/10 border-blue-200 dark:border-blue-800'
      case 'events':
        return 'text-orange-500 bg-orange-500/10 border-orange-200 dark:border-orange-800'
      case 'files':
        return 'text-purple-500 bg-purple-500/10 border-purple-200 dark:border-purple-800'
      case 'drive':
        return 'text-green-500 bg-green-500/10 border-green-200 dark:border-green-800'
      case 'poll':
        return 'text-indigo-500 bg-indigo-500/10 border-indigo-200 dark:border-indigo-800'
      case 'youtube':
        return 'text-red-500 bg-red-500/10 border-red-200 dark:border-red-800'
    }
  }

  // ============================================================================
  // HELPER: Process mentions in HTML for storage/sending
  // ============================================================================

  const processMentionsInHtml = useCallback((html: string): string => {
    // Convert mention blots to mention-highlight format for storage and rendering
    // The mention blot HTML can be:
    // - <span class="mention-blot" data-mention="username">@username</span>
    // - <span class="mention-blot" data-mention="username">﻿<span>@username</span>﻿</span> (nested)
    let processed = html.replace(
      /<span[^>]*class="mention-blot"[^>]*data-mention="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi,
      (_match, username) => {
        return `<span class="mention-highlight" data-mention="${username}">@${username}</span>`
      }
    )

    // Also handle any remaining @[username] patterns (legacy format)
    processed = processed.replace(
      /@\[([^\]]+)\]/g,
      (_match, name) => {
        return `<span class="mention-highlight" data-mention="${name}">@${name}</span>`
      }
    )

    return processed
  }, [])

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  const handleSendMessage = useCallback(() => {
    const quill = quillRef.current?.getEditor?.()
    const htmlContent = value
    const textContent = quill?.getText()?.trim() || ''

    // Check if there's actual content: text, mentions (in HTML), images, files, or attached content
    const hasMention = htmlContent.includes('mention-blot') || htmlContent.includes('data-mention')
    const hasImage = htmlContent.includes('<img') || htmlContent.includes('class="chat-gif"')
    const hasContent = textContent || hasMention || hasImage || selectedFiles.length > 0 || attachedContent.length > 0

    if (!hasContent || disabled || isSending) {
      return
    }

    // Process mentions (convert blots to highlight spans) before sending
    const processedHtml = processMentionsInHtml(htmlContent)

    onSend(processedHtml, selectedFiles, attachedContent.length > 0 ? attachedContent : undefined)

    // Clear state
    onChange('')
    if (quill) {
      quill.setText('')
    }
    setSelectedFiles([])
    setAttachedContent([])
  }, [value, selectedFiles, attachedContent, disabled, isSending, onSend, onChange, processMentionsInHtml])

  // Keep the ref updated with the latest handleSendMessage
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage
  }, [handleSendMessage])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={cn('chat-message-input border-t border-border bg-background', className)} ref={containerRef}>
      {/* Custom Formatting Toolbar - positioned above editor */}
      {showFormattingToolbar && (
        <div id="chat-toolbar" className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30 flex-wrap">
          {/* Text formatting */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat('bold')
              }}
              className="h-7 w-7 p-0"
              title="Bold (Ctrl+B)"
              disabled={disabled}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat('italic')
              }}
              className="h-7 w-7 p-0"
              title="Italic (Ctrl+I)"
              disabled={disabled}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat('underline')
              }}
              className="h-7 w-7 p-0"
              title="Underline (Ctrl+U)"
              disabled={disabled}
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat('strike')
              }}
              className="h-7 w-7 p-0"
              title="Strikethrough"
              disabled={disabled}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Lists and blocks */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat('list', 'bullet')
              }}
              className="h-7 w-7 p-0"
              title="Bullet List"
              disabled={disabled}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat('list', 'ordered')
              }}
              className="h-7 w-7 p-0"
              title="Ordered List"
              disabled={disabled}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat('blockquote')
              }}
              className="h-7 w-7 p-0"
              title="Blockquote"
              disabled={disabled}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat('code-block')
              }}
              className="h-7 w-7 p-0"
              title="Code Block"
              disabled={disabled}
            >
              <Code2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault()
                insertLink()
              }}
              className="h-7 w-7 p-0"
              title="Add Link"
              disabled={disabled}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-4 bg-border mx-1" />

          {/* File upload */}
          {showFileUpload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFileUpload}
              className="h-7 w-7 p-0"
              title="Upload File"
              disabled={disabled}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}

          {/* Google Drive picker */}
          {showDrivePicker && onOpenDrivePicker && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenDrivePicker}
              className="h-7 w-7 p-0"
              title="Attach from Google Drive"
              disabled={disabled}
            >
              <HardDrive className="h-4 w-4" />
            </Button>
          )}

          {/* YouTube video picker */}
          {showYoutubePicker && onOpenYoutubePicker && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenYoutubePicker}
              className="h-7 w-7 p-0"
              title="Share YouTube Video"
              disabled={disabled}
            >
              <Video className="h-4 w-4 text-red-600" />
            </Button>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && (
            <DropdownMenu open={showEmojiDropdown} onOpenChange={setShowEmojiDropdown}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Add Emoji" disabled={disabled}>
                  <Smile className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2" side="top">
                <div className="grid grid-cols-5 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="p-2 hover:bg-muted rounded text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* GIF picker */}
          {showGifPicker && (
            <DropdownMenu open={showGifDropdown} onOpenChange={setShowGifDropdown}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Add GIF" disabled={disabled}>
                  <ImagePlay className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-0" side="top" align="start">
                <GifPicker onSelect={handleGifSelect} width={320} />
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Poll creator button */}
          {showPollButton && onOpenPollCreator && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenPollCreator}
              className="h-7 w-7 p-0"
              title="Create Poll"
              disabled={disabled}
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
          )}

          {/* Schedule message button */}
          {showScheduleOption && onScheduleMessage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onScheduleMessage}
              className="h-7 w-7 p-0"
              title="Schedule Message"
              disabled={disabled}
            >
              <Clock className="h-4 w-4" />
            </Button>
          )}

          {/* Recording buttons - commented out for now */}
          {/* {showRecording && !isRecording && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartRecording('audio')}
                className="h-7 w-7 p-0"
                title="Record Audio"
                disabled={disabled}
              >
                <Mic className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartRecording('video')}
                className="h-7 w-7 p-0"
                title="Record Video"
                disabled={disabled}
              >
                <Video className="h-4 w-4" />
              </Button>
            </>
          )} */}

          {/* Stop recording button - commented out for now */}
          {/* {showRecording && isRecording && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopRecording}
              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              title="Stop Recording"
            >
              <div className="w-2 h-2 bg-red-500 rounded-sm mr-1" />
              Stop
            </Button>
          )} */}

          {/* Recording indicator - commented out for now */}
          {/* {isRecording && (
            <div className="flex items-center gap-2 ml-2 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono">{formatRecordingTime(recordingTime)}</span>
              <span className="text-xs">Recording {recordingType}...</span>
            </div>
          )} */}
        </div>
      )}

      {/* File Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Selected files ({selectedFiles.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-2 pr-8">
                  {file.type.startsWith('image/') ? (
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950 rounded flex items-center justify-center">
                      🖼️
                    </div>
                  ) : file.type.startsWith('audio/') ? (
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-950 rounded flex items-center justify-center">
                      🎵
                    </div>
                  ) : file.type.startsWith('video/') ? (
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-950 rounded flex items-center justify-center">
                      🎬
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center">
                      📄
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="font-medium truncate max-w-32">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="absolute -top-1 -right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-sm"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attached Content Preview (from slash commands) */}
      {attachedContent.length > 0 && (
        <div className="mb-3 p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Slash className="h-3 w-3" />
            Attached content ({attachedContent.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {attachedContent.map((item) => {
              const colorClasses = getContentColor(item.type)
              return (
                <div key={`${item.type}-${item.id}`} className="relative group">
                  <div className={cn(
                    'flex items-center gap-2 rounded-lg p-2 pr-8 border',
                    colorClasses
                  )}>
                    <div className="flex-shrink-0">
                      {getContentIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 capitalize">
                          {item.type === 'notes' ? 'Note' :
                           item.type === 'events' ? 'Event' :
                           item.type === 'drive' ? 'Drive' :
                           item.type === 'youtube' ? 'YouTube' :
                           item.type === 'poll' ? 'Poll' : 'File'}
                        </Badge>
                        <span className="text-sm font-medium truncate max-w-32">{item.title || item.name}</span>
                      </div>
                      {item.subtitle && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-40">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttachedContent(item.id)}
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Content Mention Menu (triggered by /) */}
      <ContentMentionMenu
        open={showContentMenu}
        onOpenChange={handleMenuClose}
        onSelect={handleContentSelect}
        position={contentMenuPosition}
        searchQuery={slashCommandQuery}
      />

      {/* Rich Text Editor Input */}
      <div className="flex gap-3 items-end p-4">
        <div className="flex-1 relative quill-chat-editor" onKeyDown={handleKeyDown}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-[60px] border rounded-md bg-background">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          }>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={value}
              onChange={handleQuillChange}
              modules={quillModules}
              formats={quillFormats}
              placeholder={placeholder}
              readOnly={disabled || isSending}
            />
          </Suspense>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={disabled || isSending || (isAIMode && isProcessingAI)}
          className="h-10 px-4 shrink-0 btn-gradient-primary"
        >
          {isAIMode ? (
            isProcessingAI ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Ask AI
              </>
            )
          ) : isSending ? (
            <>
              <div className="animate-spin h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </div>

      {/* Chat Editor Styles */}
      <style>{`
        /* Hide default Quill toolbar - we use our custom one */
        .quill-chat-editor .ql-toolbar {
          display: none !important;
        }

        /* Chat editor container */
        .quill-chat-editor .ql-container {
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          background: hsl(var(--background));
          font-size: 14px;
        }

        /* Editor area */
        .quill-chat-editor .ql-editor {
          min-height: 40px;
          max-height: 150px;
          padding: 10px 14px;
          color: hsl(var(--foreground));
          overflow-y: auto;
        }

        /* Placeholder */
        .quill-chat-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
          left: 14px;
          right: 14px;
        }

        /* Code blocks */
        .quill-chat-editor .ql-editor pre.ql-syntax {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          overflow-x: auto;
        }

        /* Inline code */
        .quill-chat-editor .ql-editor code {
          background: hsl(var(--muted));
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }

        /* Blockquote */
        .quill-chat-editor .ql-editor blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 12px;
          margin: 8px 0;
          color: hsl(var(--muted-foreground));
        }

        /* Lists */
        .quill-chat-editor .ql-editor ul,
        .quill-chat-editor .ql-editor ol {
          padding-left: 1.5em;
          margin: 4px 0;
        }

        /* Links */
        .quill-chat-editor .ql-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }

        /* Mention highlights */
        .quill-chat-editor .ql-editor .mention-highlight {
          background-color: hsl(217 91% 60% / 0.15);
          color: hsl(217 91% 50%);
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 500;
        }

        .dark .quill-chat-editor .ql-editor .mention-highlight {
          background-color: hsl(217 91% 60% / 0.25);
          color: hsl(217 91% 70%);
        }

        /* Mention blot styling (atomic mention elements) */
        .quill-chat-editor .ql-editor .mention-blot {
          background-color: hsl(217 91% 60% / 0.15);
          color: hsl(217 91% 50%);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
          user-select: all;
          cursor: default;
          display: inline-block;
          vertical-align: baseline;
        }

        .dark .quill-chat-editor .ql-editor .mention-blot {
          background-color: hsl(217 91% 60% / 0.25);
          color: hsl(217 91% 70%);
        }

        /* Make mention blot selection more visible */
        .quill-chat-editor .ql-editor .mention-blot::selection {
          background-color: hsl(217 91% 60% / 0.4);
        }

        /* Focus state */
        .quill-chat-editor .ql-container:focus-within {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
        }

        /* Dark mode adjustments */
        .dark .quill-chat-editor .ql-editor pre.ql-syntax {
          background: hsl(var(--muted));
        }

        /* Custom toolbar button hover state */
        .chat-message-input #chat-toolbar button:hover {
          background: hsl(var(--accent));
        }

        /* Inline GIF styles in input area - keep small */
        .quill-chat-editor .ql-editor .chat-gif,
        .quill-chat-editor .ql-editor img {
          max-width: 120px;
          max-height: 80px;
          border-radius: 6px;
          margin: 2px 0;
          display: inline-block;
          vertical-align: middle;
          object-fit: contain;
        }
      `}</style>

      {/* Link Insert Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Insert Link
            </DialogTitle>
            <DialogDescription>
              Add a URL and optional display text for your link.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkUrl.trim()) {
                    e.preventDefault()
                    handleInsertLink()
                  }
                }}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="link-text">Display Text (optional)</Label>
              <Input
                id="link-text"
                placeholder="Click here"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkUrl.trim()) {
                    e.preventDefault()
                    handleInsertLink()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                If left empty, the URL will be shown as the link text.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkModal(false)
                setLinkUrl('')
                setLinkText('')
                setSavedSelection(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInsertLink}
              disabled={!linkUrl.trim()}
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})

// Set display name for React DevTools
MessageInput.displayName = 'MessageInput'

export default MessageInput
