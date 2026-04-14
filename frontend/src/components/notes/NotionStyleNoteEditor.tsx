import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import type { Note, RichText } from '../../types/notes'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Loader2, Sparkles, Smile, Undo, Redo, Copy, MoreHorizontal, Trash2, Archive, Share2, X, FileText, Calendar, FolderOpen, Users, Upload } from 'lucide-react'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import { AIToolsMenu } from './AIToolsMenu'
import { notesApi } from '../../lib/api/notes-api'
import { aiApi } from '../../lib/api/ai-api'
import { useAuth } from '../../contexts/AuthContext'
import { useNoteCollaboration } from '../../hooks/useNoteCollaboration'
import { RemoteCursors, PresenceIndicator } from './RemoteCursors'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { ContentMentionMenu } from '../ui/content-mention-menu'

// Lazy load the Quill editor to improve initial load time
const ReactQuill = lazy(() => import('react-quill-new'))
// Import Quill styles
import 'react-quill-new/dist/quill.snow.css'

// Extend window type for undo/redo buttons
declare global {
  interface Window {
    _undoBtn?: HTMLButtonElement
    _redoBtn?: HTMLButtonElement
  }
}

interface NotionStyleNoteEditorProps {
  note: Note
  onClose?: () => void
  onUpdate?: (noteId: string, updates: Partial<Note>) => void
  onDelete?: () => void
  onArchive?: () => void
  onRestore?: () => void
  onPermanentDelete?: () => void
  onDuplicate?: () => void
  onShare?: (noteId: string) => void
  onImport?: () => void
  onAttachmentClick?: (attachment: { id: string; title: string; type: 'notes' | 'events' | 'files' }) => void
  onRefresh?: () => void
}

export function NotionStyleNoteEditor({
  note,
  onClose,
  onUpdate,
  onDelete,
  onArchive,
  onRestore,
  onPermanentDelete,
  onDuplicate,
  onShare,
  onImport,
  onAttachmentClick,
  onRefresh
}: NotionStyleNoteEditorProps) {
  // const updateNoteMutation = useUpdateNote(note.id) // Disabled for now
  const { toast } = useToast()
  const { user } = useAuth()

  // Editor container ref for RemoteCursors
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // Check if note is shared (has collaborators or shared with others)
  const isNoteShared = useMemo(() => {
    const hasCollaborators = (note.collaborators?.length ?? 0) > 0
    const hasSharedWith = (note.shareSettings?.sharedWith?.length ?? 0) > 0

    // Also check collaborative_data.shared_with (the actual backend field)
    let hasCollaborativeDataSharedWith = false
    if (note.collaborative_data) {
      try {
        const collaborativeData = typeof note.collaborative_data === 'string'
          ? JSON.parse(note.collaborative_data)
          : note.collaborative_data
        hasCollaborativeDataSharedWith = (collaborativeData?.shared_with?.length ?? 0) > 0
      } catch (e) {
        console.warn('[Collaboration] Failed to parse collaborative_data:', e)
      }
    }

    const result = hasCollaborators || hasSharedWith || hasCollaborativeDataSharedWith
    console.log('[Collaboration] isNoteShared check:', {
      hasCollaborators,
      hasSharedWith,
      hasCollaborativeDataSharedWith,
      result,
      collaborators: note.collaborators,
      shareSettings: note.shareSettings,
      collaborative_data: note.collaborative_data
    })
    return result
  }, [note.collaborators, note.shareSettings?.sharedWith, note.collaborative_data])

  // Real-time collaboration hook - only enabled when note is shared
  const {
    isConnected: isCollaborationConnected,
    isLoading: isCollaborationLoading,
    users: collaborationUsers,
    cursors,
    bindQuill: bindQuillToYjs,
    unbindQuill: unbindQuillFromYjs,
    notifyContentChanged,
    disconnect: disconnectCollaboration,
  } = useNoteCollaboration({
    noteId: note.id,
    workspaceId: note.workspaceId || '',
    enabled: !!note.workspaceId && isNoteShared,
    onUsersChange: (users) => {
      console.log('[Collaboration] Users changed:', users.length)
    },
    onUserJoined: (joinedUser) => {
      toast({
        title: 'User joined',
        description: `${joinedUser.name} started editing`,
      })
    },
    onUserLeft: (userId) => {
      console.log('[Collaboration] User left:', userId)
    },
    onError: (error) => {
      console.error('[Collaboration] Error:', error)
      // Only show error toast if collaboration is enabled
      if (isNoteShared) {
        toast({
          title: 'Collaboration error',
          description: error.message,
          variant: 'destructive',
        })
      }
    },
    onContentChanged: async (data) => {
      // Content changed notification from non-Yjs client (e.g., Flutter)
      console.log('[Collaboration] Content changed by:', data.userName)
      toast({
        title: 'Content updated',
        description: `${data.userName} made changes`,
      })

      // Fetch the latest content directly from API and update Quill
      // This is needed because Flutter uses direct API sync, not Yjs
      try {
        if (note.workspaceId) {
          const { notesApi } = await import('../../lib/api/notes-api')
          const refreshedNote = await notesApi.getNoteByWorkspace(note.workspaceId, note.id)
          if (refreshedNote?.content) {
            console.log('[Collaboration] Fetched updated content from API')

            // Update local state
            setContent(refreshedNote.content)
            contentValueRef.current = refreshedNote.content

            // Update Quill editor directly (bypass Yjs for Flutter interop)
            try {
              const quill = quillRef.current?.getEditor()
              if (quill) {
                const currentSelection = quill.getSelection()
                quill.root.innerHTML = refreshedNote.content
                // Try to restore cursor position
                if (currentSelection) {
                  try {
                    const length = quill.getLength()
                    const newIndex = Math.min(currentSelection.index, length > 0 ? length - 1 : 0)
                    quill.setSelection(newIndex, 0)
                  } catch (e) {
                    // Ignore if selection can't be restored
                  }
                }
                console.log('[Collaboration] Updated Quill editor with API content')
              }
            } catch (e) {
              console.warn('[Collaboration] Could not update Quill:', e)
            }

            // Mark as saved since we just synced with API
            setHasUnsavedChanges(false)
          }
        }
      } catch (error) {
        console.error('[Collaboration] Failed to fetch updated content:', error)
      }

      // Also trigger parent refresh if provided
      if (onRefresh) {
        onRefresh()
      }
    },
  })

  const [title, setTitle] = useState(() => 
    note.title?.map((rt: RichText) => rt.text).join('') || ''
  )
  
  // Extract HTML content from note blocks for initial display
  const extractHtmlFromBlocks = useCallback((content: any): string => {
    // Handle string content (plain text or HTML from API)
    if (typeof content === 'string') {
      // If it's already HTML (contains common HTML tags), return as-is
      if (content.includes('<p>') || content.includes('<div>') || content.includes('<br>') || content.includes('<h')) {
        return content
      }
      // Convert plain text to HTML paragraphs (preserving line breaks)
      if (content.trim()) {
        return content
          .split('\n')
          .map(line => `<p>${line || '<br>'}</p>`)
          .join('')
      }
      return ''
    }

    // Handle null/undefined
    if (!content) return ''

    // Handle array of blocks format
    if (!Array.isArray(content)) return ''

    // Find the first HTML block and extract its HTML content
    const htmlBlock = content.find(block => block.type === 'html' && block.content?.[0]?.html)
    if (htmlBlock) {
      return htmlBlock.content[0].html
    }

    // Fallback: convert text blocks to HTML
    return content.map(block => {
      if (block.content && Array.isArray(block.content)) {
        return block.content.map((c: any) => c.text || '').join('')
      }
      return ''
    }).join('<br>')
  }, [])
  
  const [content, setContent] = useState(() => {
    const htmlContent = extractHtmlFromBlocks(note.content)
    return htmlContent || ''
  })

  const [selectedIcon, setSelectedIcon] = useState(note.icon?.value || '📄')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [editorKey, setEditorKey] = useState(0) // Force remount when note changes
  
  const titleRef = useRef<HTMLInputElement>(null)
  const quillRef = useRef<any>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const currentNoteIdRef = useRef<string>(note.id)
  const isInitialLoadRef = useRef<boolean>(true)
  const [selectedText, setSelectedText] = useState<string>('')
  const [translateLoading, setTranslateLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [textGenerationLoading, setTextGenerationLoading] = useState(false)
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null)
  const [generatedText, setGeneratedText] = useState<string | null>(null)
  const [generatedTextAction, setGeneratedTextAction] = useState<'improve' | 'grammar' | 'longer' | 'shorter' | null>(null)
  const [lastSavedContent, setLastSavedContent] = useState<string>('')

  // Mention system state
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | undefined>()
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0)
  const [attachments, setAttachments] = useState<Array<{ id: string; title: string; type: 'notes' | 'events' | 'files' }>>([])
  const mentionAtIndex = useRef<number>(-1)
  const mentionDismissed = useRef<boolean>(false) // Track if user manually dismissed the menu
  const fileInputRef = useRef<HTMLInputElement>(null) // For file import

  // Refs to always get the latest values during auto-save
  const titleValueRef = useRef<string>(title)
  const contentValueRef = useRef<string>(content)
  const selectedIconRef = useRef<string>(selectedIcon)
  const attachmentsRef = useRef<Array<{ id: string; title: string; type: 'notes' | 'events' | 'files' }>>(attachments)
  const autoSaveRef = useRef<any>(null)
  
  // Undo/redo state management
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  const isUndoRedoRef = useRef<boolean>(false)

  // Memoized values for optimization
  const canUndo = useMemo(() => historyIndex > 0, [historyIndex])
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length])

  // Add to history function
  const addToHistory = useCallback((newContent: string) => {
    if (isUndoRedoRef.current) return
    if (!newContent || newContent.trim() === '') return
    
    const currentHistory = historyRef.current
    const currentIndex = historyIndexRef.current
    
    if (currentHistory[currentIndex] === newContent) return
    
    const newHistory = currentHistory.slice(0, currentIndex + 1)
    newHistory.push(newContent)
    
    if (newHistory.length > 10) {
      newHistory.shift()
    }
    
    historyRef.current = newHistory
    historyIndexRef.current = newHistory.length - 1
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [])

  // Undo function
  // NOTE: When collaboration is active, Yjs manages content and has its own undo.
  // Using custom undo/redo with innerHTML breaks Yjs binding, so we skip it in collab mode.
  const undo = useCallback(() => {
    if (!canUndo || !quillRef.current) return

    // Skip custom undo when collaboration is active - Yjs has its own undo mechanism
    if (isNoteShared && isCollaborationConnected) {
      console.log('[Editor] Skipping custom undo - collaboration active')
      return
    }

    isUndoRedoRef.current = true
    const newIndex = historyIndex - 1
    const previousContent = history[newIndex]

    try {
      const quill = quillRef.current?.getEditor()
      if (quill) {
        quill.root.innerHTML = previousContent
        setContent(previousContent)
        setHistoryIndex(newIndex)
        historyIndexRef.current = newIndex
      }
    } catch (e) {
      console.debug('[Editor] Quill not ready for undo')
    }

    setTimeout(() => {
      isUndoRedoRef.current = false
    }, 100)
  }, [canUndo, history, historyIndex, isNoteShared, isCollaborationConnected])

  // Redo function
  // NOTE: When collaboration is active, Yjs manages content and has its own undo.
  // Using custom undo/redo with innerHTML breaks Yjs binding, so we skip it in collab mode.
  const redo = useCallback(() => {
    if (!canRedo || !quillRef.current) return

    // Skip custom redo when collaboration is active - Yjs has its own undo mechanism
    if (isNoteShared && isCollaborationConnected) {
      console.log('[Editor] Skipping custom redo - collaboration active')
      return
    }

    isUndoRedoRef.current = true
    const newIndex = historyIndex + 1
    const nextContent = history[newIndex]

    try {
      const quill = quillRef.current?.getEditor()
      if (quill) {
        quill.root.innerHTML = nextContent
        setContent(nextContent)
        setHistoryIndex(newIndex)
        historyIndexRef.current = newIndex
      }
    } catch (e) {
      console.debug('[Editor] Quill not ready for redo')
    }

    setTimeout(() => {
      isUndoRedoRef.current = false
    }, 100)
  }, [canRedo, history, historyIndex, isNoteShared, isCollaborationConnected])

  // Helper function to load attachments from note
  const loadAttachmentsFromNote = useCallback((noteData: any) => {
    const noteAttachments: Array<{ id: string; title: string; type: 'notes' | 'events' | 'files' }> = []

    console.log('[Editor] Loading attachments from note:', {
      noteId: noteData.id,
      hasAttachments: !!(noteData as any).attachments,
      attachments: (noteData as any).attachments
    })

    if ((noteData as any).attachments) {
      const att = (noteData as any).attachments
      // Add notes - handle both enriched objects and plain IDs for backwards compatibility
      if (att.note_attachment && Array.isArray(att.note_attachment)) {
        att.note_attachment.forEach((item: any) => {
          if (typeof item === 'object' && item.id) {
            // Enriched format from backend
            noteAttachments.push({
              id: item.id,
              title: item.title || 'Untitled Note',
              type: 'notes'
            })
          } else if (typeof item === 'string') {
            // Legacy format (just IDs)
            noteAttachments.push({ id: item, title: `Note ${item.slice(0, 8)}`, type: 'notes' })
          }
        })
      }
      // Add files - handle both enriched objects and plain IDs
      if (att.file_attachment && Array.isArray(att.file_attachment)) {
        att.file_attachment.forEach((item: any) => {
          if (typeof item === 'object' && item.id) {
            // Enriched format from backend
            noteAttachments.push({
              id: item.id,
              title: item.name || 'Unknown file',
              type: 'files'
            })
          } else if (typeof item === 'string') {
            // Legacy format (just IDs)
            noteAttachments.push({ id: item, title: `File ${item.slice(0, 8)}`, type: 'files' })
          }
        })
      }
      // Add events - handle both enriched objects and plain IDs
      if (att.event_attachment && Array.isArray(att.event_attachment)) {
        att.event_attachment.forEach((item: any) => {
          if (typeof item === 'object' && item.id) {
            // Enriched format from backend
            noteAttachments.push({
              id: item.id,
              title: item.title || 'Untitled Event',
              type: 'events'
            })
          } else if (typeof item === 'string') {
            // Legacy format (just IDs)
            noteAttachments.push({ id: item, title: `Event ${item.slice(0, 8)}`, type: 'events' })
          }
        })
      }
    }

    console.log('[Editor] Loaded attachments:', noteAttachments)
    return noteAttachments
  }, [])

  // Initialize and reset state when note changes
  useEffect(() => {
    console.log('[Editor] Note change effect triggered', {
      noteId: note.id,
      currentNoteIdRef: currentNoteIdRef.current,
      noteUpdatedAt: note.updatedAt,
      noteTitle: note.title?.[0]?.text,
      noteAttachments: (note as any).attachments
    })

    const isNewNote = currentNoteIdRef.current !== note.id

    if (isNewNote) {
      // Full reset for a different note
      console.log('[Editor] Switching to new note:', note.id, 'from:', currentNoteIdRef.current)

      // CRITICAL: Disconnect collaboration FIRST before any state changes
      // This ensures the old Yjs document is destroyed and doesn't bleed into the new note
      if (disconnectCollaboration) {
        console.log('[Editor] Disconnecting collaboration before switching notes')
        disconnectCollaboration()
      }

      // Also unbind Quill from Yjs to prevent any sync
      if (unbindQuillFromYjs) {
        unbindQuillFromYjs()
      }

      currentNoteIdRef.current = note.id
      isInitialLoadRef.current = true

      // Extract content from the new note FIRST
      const initialContent = extractHtmlFromBlocks(note.content) || ''
      const newTitle = note.title?.map((rt: RichText) => rt.text).join('') || ''
      const newIcon = note.icon?.value || '📄'

      console.log('[Editor] New note content:', {
        noteId: note.id,
        contentLength: initialContent.length,
        contentPreview: initialContent.substring(0, 100)
      })

      // Update refs IMMEDIATELY (synchronous) before state updates
      titleValueRef.current = newTitle
      contentValueRef.current = initialContent
      selectedIconRef.current = newIcon

      // Now set state - this will trigger re-render with correct values
      setTitle(newTitle)
      setSelectedIcon(newIcon)
      setContent(initialContent)
      setHasUnsavedChanges(false)
      setShowSaved(false)
      setIsEditorReady(false)

      // Increment editor key to force complete remount of ReactQuill
      // This ensures the editor gets the NEW content, not stale content
      setEditorKey(prev => prev + 1)

      // Reset history
      setHistory([])
      setHistoryIndex(-1)
      historyRef.current = []
      historyIndexRef.current = -1

      // Load attachments from note if they exist
      const loadedAttachments = loadAttachmentsFromNote(note)
      setAttachments(loadedAttachments)

      // Clear any pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = undefined
      }

      // Initialize history
      const historyContent = initialContent || '<p></p>'
      setHistory([historyContent])
      setHistoryIndex(0)
      historyRef.current = [historyContent]
      historyIndexRef.current = 0

      // Set editor ready after content is loaded
      setTimeout(() => {
        setIsEditorReady(true)
      }, 500)

      // Mark initial load as complete after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 1000)
    } else {
      // Same note - check if content/title was updated externally (e.g., by AI agent)
      const newTitle = note.title?.map((rt: RichText) => rt.text).join('') || ''
      const newContent = extractHtmlFromBlocks(note.content) || ''
      const newIcon = note.icon?.value || '📄'

      // Get current values from state/refs
      const currentTitle = titleValueRef.current
      const currentContent = contentValueRef.current
      const currentIcon = selectedIconRef.current

      console.log('[Editor] Checking for external changes', {
        newTitle,
        currentTitle,
        newContentLength: newContent.length,
        currentContentLength: currentContent?.length,
        newIcon,
        currentIcon
      })

      // Check if content changed from external source
      const titleChanged = newTitle !== currentTitle
      const contentChanged = newContent !== currentContent
      const iconChanged = newIcon !== currentIcon

      if (titleChanged || contentChanged || iconChanged) {
        console.log('[Editor] External update detected, refreshing editor state', {
          titleChanged,
          contentChanged,
          iconChanged,
          newTitle,
          currentTitle
        })

        if (titleChanged) {
          setTitle(newTitle)
          titleValueRef.current = newTitle
        }

        if (contentChanged) {
          setContent(newContent)
          contentValueRef.current = newContent

          // IMPORTANT: When collaboration is active, Yjs manages all content sync.
          // Do NOT directly manipulate Quill's innerHTML as it breaks the Yjs binding.
          // Only update Quill directly for non-collaborative editing.
          if (!isNoteShared || !isCollaborationConnected) {
            // Update Quill editor directly if it exists (non-collaborative mode only)
            try {
              const quill = quillRef.current?.getEditor()
              if (quill) {
                const currentSelection = quill.getSelection()
                quill.root.innerHTML = newContent
                // Try to restore cursor position
                if (currentSelection) {
                  try {
                    quill.setSelection(currentSelection)
                  } catch (e) {
                    // Ignore if selection can't be restored
                  }
                }
              }
            } catch (e) {
              // Quill not initialized yet, ignore
              console.debug('[Editor] Quill not ready for external update')
            }
            // Add to history for undo capability
            addToHistory(newContent)
          }
        }

        if (iconChanged) {
          setSelectedIcon(newIcon)
          selectedIconRef.current = newIcon
        }

        // Mark as saved since this is an external update
        setHasUnsavedChanges(false)
      }
    }
  }, [note.id, note.title, note.icon, note.content, note.updatedAt, extractHtmlFromBlocks, addToHistory, isNoteShared, isCollaborationConnected, disconnectCollaboration, unbindQuillFromYjs])

  // Auto-save functionality
  const autoSave = useCallback(async (forceSave = false) => {
    console.log('🔍 autoSave() called with conditions:', {
      forceSave,
      currentNoteId: currentNoteIdRef.current,
      noteId: note.id,
      hasWorkspaceId: !!note.workspaceId
    })

    // Note: We don't check hasUnsavedChanges here because scheduleAutoSave already ensures
    // this function is only called when there are changes to save
    if (currentNoteIdRef.current !== note.id) {
      console.log('❌ Skipping save - note ID mismatch')
      return
    }
    if (!note.workspaceId) {
      console.error('❌ Skipping save - no workspaceId found for note')
      return
    }

    try {
      // Get the latest values from refs
      // Wrap getEditor() in try-catch to handle "Accessing non-instantiated editor" errors
      let latestContent = contentValueRef.current
      try {
        const quill = quillRef.current?.getEditor()
        if (quill && quill.root) {
          latestContent = quill.root.innerHTML
        }
      } catch (editorError) {
        console.warn('Could not get editor content, using ref value:', editorError)
      }

      const latestTitle = titleValueRef.current
      const latestIcon = selectedIconRef.current

      console.log('Auto-saving note with title:', latestTitle)

      // Get latest attachments from ref
      const latestAttachments = attachmentsRef.current

      // Prepare attachments in API format
      const apiAttachments = {
        note_attachment: latestAttachments.filter(att => att.type === 'notes').map(att => att.id),
        file_attachment: latestAttachments.filter(att => att.type === 'files').map(att => att.id),
        event_attachment: latestAttachments.filter(att => att.type === 'events').map(att => att.id)
      }

      console.log('📎 Saving attachments:', apiAttachments)
      console.log('📎 Total attachments:', {
        notes: apiAttachments.note_attachment?.length || 0,
        files: apiAttachments.file_attachment?.length || 0,
        events: apiAttachments.event_attachment?.length || 0
      })

      const updatePayload = {
        title: latestTitle,
        content: latestContent,
        attachments: apiAttachments,
      }

      console.log('💾 Full update payload:', JSON.stringify(updatePayload, null, 2))

      // Call the PATCH API to update the note
      await notesApi.updateNote(note.workspaceId, note.id, updatePayload)

      const blockContent = [{
        id: `block-${Date.now()}`,
        type: 'html' as const,
        content: [{
          text: '',
          html: latestContent
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      }]

      setHasUnsavedChanges(false)
      setShowSaved(true)
      setLastSavedContent(latestContent) // Track what was actually saved

      setTimeout(() => {
        setShowSaved(false)
      }, 2000)

      // Call parent update handler if provided to sync local state
      if (onUpdate) {
        onUpdate(note.id, {
          title: [{ text: latestTitle }],
          icon: { type: 'emoji', value: latestIcon },
          content: blockContent
        })
      }

      // Notify other clients (including Flutter) that content has been saved
      // This allows them to fetch the latest content from the API
      if (isNoteShared && isCollaborationConnected) {
        notifyContentChanged()
        console.log('[Collaboration] Notified Flutter clients of content change')
      }
    } catch (error) {
      console.error('Failed to auto-save note:', error)
      toast({
        title: 'Failed to save',
        description: 'Your changes could not be saved. Please try again.',
        variant: 'destructive',
      })
    }
  }, [note.id, note.workspaceId, onUpdate, toast, isNoteShared, isCollaborationConnected, notifyContentChanged])

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    // Don't schedule auto-save during initial load
    if (isInitialLoadRef.current) {
      console.log('⏭️ Skipping auto-save: initial load')
      return
    }

    console.log('⏰ Scheduling auto-save in 1 second...')
    setHasUnsavedChanges(true)
    setShowSaved(false)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 1000) // Reduced from 2000ms to 1000ms for faster response
  }, [autoSave])

  // Force save for attachments (bypasses hasUnsavedChanges check)
  const forceSaveAttachments = useCallback(() => {
    console.log('🔥 Force saving attachments...')
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave(true) // Pass true to force save
    }, 500)
  }, [autoSave])

  // Update refs when state changes
  useEffect(() => {
    titleValueRef.current = title
  }, [title])

  useEffect(() => {
    contentValueRef.current = content
  }, [content])

  useEffect(() => {
    selectedIconRef.current = selectedIcon
  }, [selectedIcon])

  useEffect(() => {
    attachmentsRef.current = attachments
    console.log('📎 Attachments ref updated:', attachments)
  }, [attachments])

  // Load attachments when note.attachments changes (e.g., after note is fetched/updated in store)
  useEffect(() => {
    const noteAttachments = (note as any).attachments
    console.log('[Editor] Note attachments effect triggered:', {
      noteId: note.id,
      noteAttachments,
      currentAttachmentsCount: attachments.length
    })

    // Always reload attachments when note.attachments changes
    // This handles the case where note is fetched after initial render
    if (noteAttachments) {
      const hasAnyAttachment =
        (noteAttachments.note_attachment?.length > 0) ||
        (noteAttachments.file_attachment?.length > 0) ||
        (noteAttachments.event_attachment?.length > 0)

      if (hasAnyAttachment) {
        const loadedAttachments = loadAttachmentsFromNote(note)
        // Only update if attachments actually changed to avoid unnecessary re-renders
        const currentIds = attachments.map(a => a.id).sort().join(',')
        const newIds = loadedAttachments.map(a => a.id).sort().join(',')
        if (currentIds !== newIds) {
          console.log('[Editor] Loading attachments from note.attachments update')
          setAttachments(loadedAttachments)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(note as any).attachments, note.id, loadAttachmentsFromNote])

  useEffect(() => {
    autoSaveRef.current = autoSave
  }, [autoSave])

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle content change (now handled by comprehensive change detection)
  const handleContentChange = useCallback((value: string) => {
    // Update local content state (needed for things like character count display)
    setContent(value)

    // Always schedule auto-save - frontend handles all saves
    // Note: Backend Yjs save was disabled because yText.toString() returns plain text, not HTML
    // Frontend has access to proper HTML content via Quill, so it should always handle saves
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle emoji select
  const handleEmojiSelect = useCallback((emoji: string) => {
    setSelectedIcon(emoji)
    setIsEmojiPickerOpen(false)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle title key down
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (quillRef.current) {
        quillRef.current.focus()
      }
    }
  }, [])

  // Get plain text content
  const getPlainTextContent = useCallback(() => {
    try {
      const quill = quillRef.current?.getEditor()
      if (quill) {
        return quill.getText()
      }
    } catch (error) {
      console.warn('Editor not yet initialized:', error)
    }
    return ''
  }, [])

  // AI text operations
  const translateText = useCallback(async (language: string) => {
    const quill = quillRef.current?.getEditor()
    if (!quill) {
      toast({
        title: 'Editor not ready',
        description: 'Please wait for the editor to load.',
        variant: 'destructive',
      })
      return
    }

    // Get selection at the moment of translation
    const selection = quill.getSelection()
    const hasSelection = selection && selection.length > 0
    const textToTranslate = hasSelection
      ? quill.getText(selection.index, selection.length)
      : getPlainTextContent()

    if (!textToTranslate || !textToTranslate.trim()) {
      toast({
        title: 'No content',
        description: 'There is no text to translate.',
        variant: 'destructive',
      })
      return
    }

    setTranslateLoading(true)
    try {
      const response = await aiApi.translate({
        text: textToTranslate.trim(),
        target_language: language,
        source_language: 'en', // Default to English, can be made dynamic
        style: 'casual',
        preserve_formatting: false,
        include_confidence: false,
      })

      // Always replace content - either selected text or full content
      let translatedHtml: string

      if (hasSelection) {
        // Replace only the selected text
        quill.deleteText(selection.index, selection.length)
        quill.insertText(selection.index, response.translated_text)
        translatedHtml = quill.root.innerHTML
      } else {
        // Replace full content - use Quill API to work with Yjs collaboration
        const length = quill.getLength()
        quill.deleteText(0, length)
        quill.insertText(0, response.translated_text)
        translatedHtml = quill.root.innerHTML
      }

      setContent(translatedHtml)
      if (!isNoteShared || !isCollaborationConnected) {
        addToHistory(translatedHtml)
      }

      // Save the translation immediately
      try {
        await notesApi.updateNote(note.workspaceId!, note.id, {
          title: title,
          content: translatedHtml,
        })

        // Update local state
        if (onUpdate) {
          const blockContent = [{
            id: `block-${Date.now()}`,
            type: 'html' as const,
            content: [{
              text: '',
              html: translatedHtml
            }],
            createdAt: new Date(),
            updatedAt: new Date()
          }]

          onUpdate(note.id, {
            title: [{ text: title }],
            icon: { type: 'emoji', value: selectedIcon },
            content: blockContent
          })
        }

        setHasUnsavedChanges(false)
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 2000)

        toast({
          title: 'Content Translated',
          description: hasSelection
            ? `Selected text has been translated to ${language.toUpperCase()} and saved.`
            : `Note content has been translated to ${language.toUpperCase()} and saved.`,
        })
      } catch (error) {
        console.error('Failed to save note after translation:', error)
        toast({
          title: 'Translation saved locally',
          description: 'Content was translated but could not be saved to server. Please save manually.',
          variant: 'destructive',
        })
      }

      console.log('Translation completed:', {
        target_language: response.target_language,
        source_language: response.source_language,
        request_id: response.request_id,
      })
    } catch (error) {
      console.error('Translation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to translate text'
      toast({
        title: 'Translation Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setTranslateLoading(false)
    }
  }, [getPlainTextContent, note.workspaceId, note.id, title, selectedIcon, onUpdate, addToHistory, toast])

  const summarizeText = useCallback(async () => {
    const text = getPlainTextContent()
    if (!text || !text.trim()) {
      toast({
        title: 'No content',
        description: 'There is no text to summarize.',
        variant: 'destructive',
      })
      return
    }

    setSummaryLoading(true)
    setGeneratedSummary(null)
    try {
      const response = await aiApi.summarize({
        content: text.trim(),
        summary_type: 'abstractive'
      })

      // Store the generated summary to display in the UI
      setGeneratedSummary(response.summary)

      console.log('Summary generated:', {
        original_length: response.original_length,
        summary_length: response.summary_length,
        request_id: response.request_id,
      })
    } catch (error) {
      console.error('Summarization failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate summary'
      toast({
        title: 'Summarization Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSummaryLoading(false)
    }
  }, [getPlainTextContent, toast])

  // Function to replace note content with summary
  const replaceWithSummary = useCallback(async () => {
    if (!generatedSummary) return

    const quill = quillRef.current?.getEditor()
    if (quill) {
      // Use Quill API instead of innerHTML to work with Yjs collaboration
      const length = quill.getLength()
      quill.deleteText(0, length)
      quill.insertText(0, generatedSummary)
      const summaryHtml = quill.root.innerHTML
      setContent(summaryHtml)
      if (!isNoteShared || !isCollaborationConnected) {
        addToHistory(summaryHtml)
      }
      
      // Immediately save the changes via API
      try {
        await notesApi.updateNote(note.workspaceId!, note.id, {
          title: title,
          content: summaryHtml,
        })

        // Update local state to reflect the changes
        if (onUpdate) {
          const blockContent = [{
            id: `block-${Date.now()}`,
            type: 'html' as const,
            content: [{
              text: '',
              html: summaryHtml
            }],
            createdAt: new Date(),
            updatedAt: new Date()
          }]

          onUpdate(note.id, {
            title: [{ text: title }],
            icon: { type: 'emoji', value: selectedIcon },
            content: blockContent
          })
        }

        setHasUnsavedChanges(false)
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 2000)

        toast({
          title: 'Content Replaced',
          description: 'Note content has been replaced with the summary and saved.',
        })
      } catch (error) {
        console.error('Failed to save note after summary replacement:', error)
        toast({
          title: 'Failed to save',
          description: 'Content was replaced but could not be saved. Please try again.',
          variant: 'destructive',
        })
      }
      
      setGeneratedSummary(null)
    }
  }, [generatedSummary, addToHistory, note.workspaceId, note.id, title, selectedIcon, onUpdate, toast, isNoteShared, isCollaborationConnected])

  // Function to dismiss the generated summary
  const dismissSummary = useCallback(() => {
    setGeneratedSummary(null)
  }, [])

  // AI Text Generation Functions
  const generateText = useCallback(async (action: 'improve' | 'grammar' | 'longer' | 'shorter') => {
    const text = getPlainTextContent()
    if (!text || !text.trim()) {
      toast({
        title: 'No content',
        description: 'There is no text to improve.',
        variant: 'destructive',
      })
      return
    }

    const actionMessages = {
      improve: 'improve the writing quality, clarity, and flow',
      grammar: 'fix grammar and spelling errors', 
      longer: 'make the content longer and more detailed',
      shorter: 'make the content shorter and more concise'
    }

    setTextGenerationLoading(true)
    setGeneratedText(null)
    setGeneratedTextAction(null)
    try {
      const prompt = `${text.trim()}\n\nPlease ${actionMessages[action]} of the above text.`
      
      const response = await aiApi.generateText({
        prompt,
        text_type: 'general',
        tone: 'professional',
        target_audience: 'general_public',
        language: 'en',
        temperature: 0.7,
        max_tokens: 2000,
      })

      // Store the generated text to display in the preview card
      setGeneratedText(response.content)
      setGeneratedTextAction(action)

      console.log(`AI ${action} completed:`, {
        original_length: text.length,
        generated_length: response.content.length,
        request_id: response.request_id,
      })
    } catch (error) {
      console.error(`AI ${action} failed:`, error)
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} text`
      toast({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setTextGenerationLoading(false)
    }
  }, [getPlainTextContent, note.workspaceId, note.id, title, selectedIcon, onUpdate, addToHistory, toast])

  const improveWriting = useCallback(() => generateText('improve'), [generateText])
  const fixGrammar = useCallback(() => generateText('grammar'), [generateText])
  const makeLonger = useCallback(() => generateText('longer'), [generateText])
  const makeShorter = useCallback(() => generateText('shorter'), [generateText])

  // Function to replace note content with generated text
  const replaceWithGeneratedText = useCallback(async () => {
    if (!generatedText || !generatedTextAction) return

    const quill = quillRef.current?.getEditor()
    if (quill) {
      // Use Quill API instead of innerHTML to work with Yjs collaboration
      const length = quill.getLength()
      quill.deleteText(0, length)
      quill.insertText(0, generatedText)
      const generatedHtml = quill.root.innerHTML
      setContent(generatedHtml)
      if (!isNoteShared || !isCollaborationConnected) {
        addToHistory(generatedHtml)
      }
      
      // Save the generated content immediately
      try {
        await notesApi.updateNote(note.workspaceId!, note.id, {
          title: title,
          content: generatedHtml,
        })

        // Update local state
        if (onUpdate) {
          const blockContent = [{
            id: `block-${Date.now()}`,
            type: 'html' as const,
            content: [{
              text: '',
              html: generatedHtml
            }],
            createdAt: new Date(),
            updatedAt: new Date()
          }]

          onUpdate(note.id, {
            title: [{ text: title }],
            icon: { type: 'emoji', value: selectedIcon },
            content: blockContent
          })
        }

        setHasUnsavedChanges(false)
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 2000)

        const actionLabels = {
          improve: 'improved',
          grammar: 'corrected',
          longer: 'expanded',
          shorter: 'condensed'
        }

        toast({
          title: 'Content Replaced',
          description: `Note content has been ${actionLabels[generatedTextAction]} and saved.`,
        })
      } catch (error) {
        console.error(`Failed to save note after ${generatedTextAction}:`, error)
        toast({
          title: 'Content replaced locally',
          description: 'Content was replaced but could not be saved to server. Please save manually.',
          variant: 'destructive',
        })
      }
      
      setGeneratedText(null)
      setGeneratedTextAction(null)
    }
  }, [generatedText, generatedTextAction, addToHistory, note.workspaceId, note.id, title, selectedIcon, onUpdate, toast, isNoteShared, isCollaborationConnected])

  // Function to dismiss the generated text
  const dismissGeneratedText = useCallback(() => {
    setGeneratedText(null)
    setGeneratedTextAction(null)
  }, [])

  // Mention detection and handling
  const detectMention = useCallback((quill: any) => {
    const selection = quill.getSelection()
    if (!selection) {
      console.log('⚠️ No selection found')
      return
    }

    const cursorPos = selection.index
    const text = quill.getText(0, cursorPos)
    const lastSlashIndex = text.lastIndexOf('/')

    // Don't show menu if this specific slash was dismissed
    if (mentionDismissed.current && lastSlashIndex === mentionAtIndex.current) {
      console.log('🚫 This slash was dismissed, not showing')
      return false
    }

    // If we find a new slash (different position), reset the dismissed flag
    if (lastSlashIndex !== -1 && lastSlashIndex !== mentionAtIndex.current) {
      if (lastSlashIndex > mentionAtIndex.current) {
        mentionDismissed.current = false
      }
    }

    console.log('🔍 Detect mention:', {
      cursorPos,
      text: text.slice(Math.max(0, cursorPos - 20)),
      lastSlashIndex,
      distance: cursorPos - lastSlashIndex
    })

    // Show menu only if:
    // 1. There's a / symbol
    // 2. The cursor is within 20 characters after the /
    // 3. No newline after / (spaces are allowed)
    if (lastSlashIndex !== -1 && (cursorPos - lastSlashIndex) <= 20) {
      const textAfterSlash = text.slice(lastSlashIndex + 1)

      console.log('✅ / found, textAfterSlash:', textAfterSlash)

      // Allow spaces - don't close menu on space, only check for newlines
      if (!textAfterSlash.includes('\n')) {
        console.log('🎯 Showing mention menu!')
        setMentionQuery(textAfterSlash)
        mentionAtIndex.current = lastSlashIndex

        // Calculate position for the mention menu (only if not already showing)
        if (!showMentionMenu) {
          const bounds = quill.getBounds(cursorPos)
          const editorRect = quill.container.getBoundingClientRect()

          const menuWidth = 350
          const menuHeight = 350
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          const margin = 10

          const posX = editorRect.left + bounds.left + 40
          const posY = editorRect.top + bounds.top + bounds.height + 5

          // Calculate available space
          const spaceBelow = viewportHeight - posY
          const spaceAbove = posY - margin
          const spaceRight = viewportWidth - posX

          let finalPosY = posY

          // Smart vertical positioning
          if (spaceBelow < menuHeight + margin) {
            if (spaceAbove >= menuHeight + margin) {
              finalPosY = posY - bounds.height - menuHeight
            } else {
              finalPosY = margin
            }
          }

          // Smart horizontal positioning
          let finalPosX = posX
          if (spaceRight < menuWidth + margin) {
            finalPosX = Math.max(margin, viewportWidth - menuWidth - margin)
          }

          // Ensure menu stays within viewport bounds
          finalPosX = Math.max(margin, Math.min(finalPosX, viewportWidth - menuWidth - margin))
          finalPosY = Math.max(margin, Math.min(finalPosY, viewportHeight - menuHeight - margin))

          setMentionPosition({
            top: finalPosY,
            left: finalPosX
          })
        }

        setShowMentionMenu(true)
        return true
      }
    }

    // Only close if there's no valid slash context
    if (lastSlashIndex === -1) {
      setShowMentionMenu(false)
    }
    return false
  }, [showMentionMenu])

  // Handle mention selection
  const handleMentionSelect = useCallback((item: any) => {
    console.log('🎯 Mention selected:', item)

    const quill = quillRef.current?.getEditor()
    if (!quill) {
      console.error('❌ No quill editor found')
      return
    }

    if (mentionAtIndex.current === -1) {
      console.error('❌ No / index found')
      return
    }

    console.log('📍 Current / index:', mentionAtIndex.current)

    // Get current cursor position or use saved position
    let cursorPos = mentionAtIndex.current + 1
    const selection = quill.getSelection()
    if (selection) {
      cursorPos = selection.index
      console.log('📍 Current cursor position:', cursorPos)
    }

    const deleteLength = cursorPos - mentionAtIndex.current
    console.log('🗑️ Deleting', deleteLength, 'characters from position', mentionAtIndex.current)

    // Delete the /query text
    quill.deleteText(mentionAtIndex.current, deleteLength)

    // Insert the mention text (without the /)
    const mentionText = `${item.title} `
    console.log('✍️ Inserting:', mentionText)
    quill.insertText(mentionAtIndex.current, mentionText)

    // Set cursor after the mention
    const newCursorPos = mentionAtIndex.current + mentionText.length
    quill.setSelection(newCursorPos)
    console.log('📍 New cursor position:', newCursorPos)

    // Add to attachments
    const newAttachment = {
      id: item.id,
      title: item.title,
      type: item.type
    }

    console.log('📎 Adding attachment:', newAttachment)

    // Update both state and ref immediately
    setAttachments(prev => {
      const updated = [...prev, newAttachment]
      console.log('📎 Updated attachments:', updated)
      // Update ref immediately to ensure autoSave gets the latest value
      attachmentsRef.current = updated
      return updated
    })

    // Reset mention state
    setShowMentionMenu(false)
    setMentionQuery('')
    mentionAtIndex.current = -1

    // Focus back on editor
    setTimeout(() => {
      quill.focus()
    }, 100)

    toast({
      title: 'Attachment added',
      description: `${item.title} has been attached to this note.`,
    })

    // Force save after attachment is added
    forceSaveAttachments()
  }, [toast, forceSaveAttachments])

  // Handle mention menu close
  const handleMentionMenuClose = useCallback((open: boolean) => {
    setShowMentionMenu(open)

    // If menu is being closed (not opened), set the dismissed flag
    if (!open) {
      console.log('🚫 Menu manually closed, setting dismissed flag')
      mentionDismissed.current = true
    }
  }, [])

  // Remove attachment
  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    console.log('🗑️ Removing attachment:', attachmentId)
    setAttachments(prev => {
      const updated = prev.filter(att => att.id !== attachmentId)
      console.log('📎 Updated attachments after removal:', updated)
      // Update ref immediately
      attachmentsRef.current = updated
      return updated
    })

    toast({
      title: 'Attachment removed',
      description: 'The attachment has been removed from this note.',
    })

    // Force save after attachment removal
    forceSaveAttachments()
  }, [toast, forceSaveAttachments])

  // Handle file import into current note
  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileName = file.name.toLowerCase()
      let htmlContent = ''

      // Handle plain text files (.txt)
      if (fileName.endsWith('.txt') || file.type === 'text/plain') {
        const text = await file.text()
        const paragraphs = text.split('\n\n').filter(p => p.trim())
        if (paragraphs.length === 0) {
          htmlContent = `<p>${text.replace(/\n/g, '<br>')}</p>`
        } else {
          htmlContent = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
        }
      }
      // Handle Markdown files (.md)
      else if (fileName.endsWith('.md') || file.type === 'text/markdown') {
        const text = await file.text()
        htmlContent = text
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code>$1</code>')
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
          .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
          .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
          .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
          .split('\n')
          .map(line => {
            const trimmed = line.trim()
            if (!trimmed) return ''
            if (trimmed.startsWith('<')) return trimmed
            return `<p>${trimmed}</p>`
          })
          .join('\n')
        htmlContent = htmlContent.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
      }
      // Handle Word documents (.docx) - try dynamic import
      else if (fileName.endsWith('.docx')) {
        try {
          const mammoth = await import('mammoth')
          const arrayBuffer = await file.arrayBuffer()
          const result = await mammoth.default.convertToHtml({ arrayBuffer })
          htmlContent = result.value || '<p></p>'
        } catch {
          // Fallback if mammoth not available
          toast({
            title: 'Word import not available',
            description: 'Please install mammoth package for Word document support.',
            variant: 'destructive',
          })
          return
        }
      }
      // Other text files
      else {
        const text = await file.text()
        htmlContent = `<p>${text.replace(/\n/g, '<br>')}</p>`
      }

      // Insert content into editor
      if (quillRef.current) {
        const quill = quillRef.current.getEditor()
        const selection = quill.getSelection()
        const insertIndex = selection ? selection.index : quill.getLength()

        // Insert the HTML content
        quill.clipboard.dangerouslyPasteHTML(insertIndex, htmlContent)

        toast({
          title: 'File imported',
          description: `Content from "${file.name}" has been added to the note.`,
        })
      }
    } catch (error) {
      console.error('Failed to import file:', error)
      toast({
        title: 'Import failed',
        description: 'Failed to read the file content.',
        variant: 'destructive',
      })
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [toast])

  // Get icon for attachment type
  const getAttachmentIcon = useCallback((type: string) => {
    switch (type) {
      case 'notes':
        return <FileText className="h-4 w-4" />
      case 'events':
        return <Calendar className="h-4 w-4" />
      case 'files':
        return <FolderOpen className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }, [])

  // Quill formats - explicitly list all formats to preserve imported content
  const quillFormats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'image',
    'align',
    'color', 'background',
    'blockquote', 'code-block',
    'script', // for sub/superscript
    'direction', // for RTL text
  ], [])

  // Quill modules configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
    keyboard: {
      bindings: {
        undo: {
          key: 'Z',
          ctrlKey: true,
          handler: () => { undo(); return false }
        },
        undo2: {
          key: 'Z',
          metaKey: true,
          handler: () => { undo(); return false }
        },
        redo: {
          key: 'Y',
          ctrlKey: true,
          handler: () => { redo(); return false }
        },
        redo2: {
          key: 'Y',
          metaKey: true,
          handler: () => { redo(); return false }
        }
      }
    }
  }), [undo, redo])

  // Editor ready handler
  const handleEditorReady = useCallback(() => {
    setIsEditorReady(true)
  }, [])

  // Set editor ready and clear initial load flag when component mounts
  useEffect(() => {
    isInitialLoadRef.current = true

    const timer = setTimeout(() => {
      setIsEditorReady(true)
      // Clear initial load flag after editor is ready
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 500)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Selection change handler
  useEffect(() => {
    if (!isEditorReady || !quillRef.current) return

    try {
      const quill = quillRef.current.getEditor()
      if (!quill) return

      const handleSelectionChange = (range: any, oldRange: any, source: string) => {
        if (range) {
          // Handle text selection for AI features
          if (range.length > 0) {
            const text = quill.getText(range.index, range.length)
            setSelectedText(text)
          } else {
            setSelectedText('')
          }

          // Don't check for @ mention on selection change (cursor movement/focus)
          // Only check on actual text typing (handled in text-change event)
        }
      }

      quill.on('selection-change', handleSelectionChange)

      return () => {
        quill.off('selection-change', handleSelectionChange)
      }
    } catch (error) {
      console.error('Error setting up selection handler:', error)
    }
  }, [isEditorReady, detectMention, note.id])

  // Single, reliable content change detection with proper debouncing
  useEffect(() => {
    console.log('🚀 EFFECT RUNNING - Setting up content detection', {
      isEditorReady,
      hasQuillRef: !!quillRef.current,
      noteId: note.id
    })
    
    if (!isEditorReady || !quillRef.current) {
      console.log('❌ Editor not ready yet - skipping setup')
      return
    }
    
    let saveTimeout: NodeJS.Timeout
    let listenerAttached = false
    
    try {
      const quill = quillRef.current.getEditor()
      if (!quill) {
        console.log('❌ No quill editor found')
        return
      }
      
      // Remove any existing listeners first
      quill.off('text-change')
      console.log('🧹 Removed any existing text-change listeners')
      
      console.log('✅ Quill editor found - attaching NEW text-change listener')
      
      const handleTextChange = (delta: any, oldDelta: any, source: string) => {
        // Only respond to actual user changes
        if (source !== 'user') {
          console.log('📝 Ignoring non-user change:', source)
          return
        }

        console.log('📝 USER CHANGE DETECTED - Debouncing save')

        // Check if user typed @ character - reset dismissed flag
        if (delta.ops) {
          for (const op of delta.ops) {
            if (op.insert && typeof op.insert === 'string' && op.insert.includes('@')) {
              console.log('🎯 User typed @ - resetting dismissed flag')
              mentionDismissed.current = false
              break
            }
          }
        }

        // Clear any existing timeout (this is the debouncing)
        if (saveTimeout) {
          clearTimeout(saveTimeout)
          console.log('⏰ Cleared existing timeout')
        }

        // Update content immediately in state
        const currentContent = quill.root.innerHTML
        setContent(currentContent)

        // Detect @ mention - call after a small delay to ensure cursor is positioned
        console.log('🔎 About to call detectMention')
        setTimeout(() => {
          detectMention(quill)
        }, 50)
        
        // Set new timeout - only fires after user stops for 2 seconds
        saveTimeout = setTimeout(async () => {
          console.log('🚨 TIMEOUT FIRED - Making API call now!')
          
          // Set state BEFORE calling autoSave so the condition check passes
          setHasUnsavedChanges(true)
          setShowSaved(false)
          
          // Small delay to ensure state is set
          setTimeout(async () => {
            try {
              console.log('📡 Calling autoSave()...')
              if (autoSaveRef.current) {
                await autoSaveRef.current()
                console.log('✅ autoSave() completed successfully')
              } else {
                console.error('❌ autoSaveRef.current is null')
              }
            } catch (error) {
              console.error('❌ autoSave() failed:', error)
            }
          }, 10)
        }, 2000)
        
        console.log('⏰ New 2-second timeout set')
      }
      
      // Attach the listener
      quill.on('text-change', handleTextChange)
      listenerAttached = true
      console.log('✅ text-change listener attached successfully')
      
      return () => {
        console.log('🧹 CLEANUP RUNNING - noteId:', note.id)
        if (saveTimeout) {
          clearTimeout(saveTimeout)
          console.log('🧹 Cleared saveTimeout')
        }
        if (listenerAttached && quill) {
          quill.off('text-change', handleTextChange)
          console.log('🧹 Removed text-change listener')
        }
      }
    } catch (error) {
      console.error('❌ Error setting up content detection:', error)
    }
  }, [isEditorReady, note.id, detectMention]) // Added detectMention for @ mentions

  // Update undo/redo button states
  useEffect(() => {
    if (typeof window !== 'undefined' && window._undoBtn && window._redoBtn) {
      window._undoBtn.disabled = !canUndo
      window._redoBtn.disabled = !canRedo
    }
  }, [canUndo, canRedo])

  // Add undo/redo buttons when editor is ready
  useEffect(() => {
    if (isEditorReady && quillRef.current) {
      setTimeout(() => {
        try {
          const quill = quillRef.current?.getEditor()
          if (!quill || !quill.container) return

          const toolbar = quill.container.previousSibling
          if (toolbar && toolbar.classList.contains('ql-toolbar')) {
            // Check if buttons already exist
            if (toolbar.querySelector('.undo-redo-container')) {
              return
            }
            
            // Create undo/redo container
            const undoRedoContainer = document.createElement('span')
            undoRedoContainer.className = 'ql-formats undo-redo-container'
            
            // Create undo button
            const undoBtn = document.createElement('button')
            undoBtn.className = 'ql-undo'
            undoBtn.type = 'button'
            undoBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>'
            undoBtn.title = 'Undo (Ctrl+Z)'
            undoBtn.onclick = undo
            undoBtn.disabled = !canUndo
            
            // Create redo button
            const redoBtn = document.createElement('button')
            redoBtn.className = 'ql-redo'
            redoBtn.type = 'button'
            redoBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>'
            redoBtn.title = 'Redo (Ctrl+Y)'
            redoBtn.onclick = redo
            redoBtn.disabled = !canRedo
            
            // Add buttons to container
            undoRedoContainer.appendChild(undoBtn)
            undoRedoContainer.appendChild(redoBtn)
            
            // Insert at the beginning of toolbar
            toolbar.insertBefore(undoRedoContainer, toolbar.firstChild)
            
            // Store references for updating disabled state
            window._undoBtn = undoBtn
            window._redoBtn = redoBtn
            
            console.log('Undo/redo buttons added via effect')
          }
        } catch (error) {
          console.error('Error adding undo/redo buttons:', error)
        }
      }, 500)
    }
  }, [isEditorReady, undo, redo, canUndo, canRedo])

  // When collaboration connects, ensure binding happens
  // No longer need to reset isEditorReady since key doesn't depend on isCollaborationConnected
  useEffect(() => {
    if (isNoteShared && isCollaborationConnected && isEditorReady && quillRef.current) {
      // Trigger binding if conditions are met
      console.log('[Collaboration] Collaboration connected, triggering binding check')

      // Getter function to get fresh Quill instance
      const getQuillInstance = () => {
        try {
          return quillRef.current?.getEditor()
        } catch {
          return null
        }
      }

      try {
        const quill = getQuillInstance()
        if (quill) {
          bindQuillToYjs(quill, getQuillInstance)
        }
      } catch (error) {
        console.warn('[Collaboration] Could not get quill instance:', error)
      }
    }
  }, [isCollaborationConnected, isNoteShared, isEditorReady, bindQuillToYjs])

  // Bind Quill to Yjs for real-time collaboration
  useEffect(() => {
    console.log('[Collaboration] Binding effect check:', {
      isEditorReady,
      hasQuillRef: !!quillRef.current,
      isCollaborationConnected,
      isNoteShared
    })

    if (!isEditorReady || !quillRef.current || !isCollaborationConnected || !isNoteShared) {
      console.log('[Collaboration] Binding effect: conditions not met, skipping')
      return
    }

    // Getter function to get fresh Quill instance (for rebinding if needed)
    const getQuillInstance = () => {
      try {
        return quillRef.current?.getEditor()
      } catch {
        return null
      }
    }

    // Small delay to ensure editor is fully initialized after remount
    const timeoutId = setTimeout(() => {
      try {
        const quill = getQuillInstance()
        if (quill) {
          console.log('[Collaboration] Binding Quill to Yjs - quill instance found')
          bindQuillToYjs(quill, getQuillInstance)
        } else {
          console.warn('[Collaboration] Binding Quill to Yjs - no quill instance available')
        }
      } catch (error) {
        console.error('[Collaboration] Error binding Quill to Yjs:', error)
      }
    }, 100)

    // Only clear the timeout on cleanup, don't unbind
    // The binding will persist and handle reconnections gracefully
    // Unbinding happens only on component unmount (in the cleanup effect below)
    return () => {
      clearTimeout(timeoutId)
    }
  }, [isEditorReady, isCollaborationConnected, isNoteShared, bindQuillToYjs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      // Unbind Quill from Yjs before disconnecting
      unbindQuillFromYjs()
      disconnectCollaboration()
    }
  }, [disconnectCollaboration, unbindQuillFromYjs])

  // Simple emoji picker component
  const SimpleEmojiPicker = () => {
    const emojis = ['📄', '📝', '📋', '📌', '📎', '💡', '⭐', '🎯', '🚀', '🔥', '💎', '🌟']
    
    return (
      <div className="grid grid-cols-4 gap-2 p-2">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiSelect(emoji)}
            className="text-2xl hover:bg-accent rounded p-1 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto p-8 pb-4">
          {/* Icon and Title Section */}
          <div className="flex items-start gap-4">
            {/* Icon Picker */}
            <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-12 h-12 p-0 hover:bg-muted/50 rounded-md"
                >
                  <span className="text-2xl">{selectedIcon}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <SimpleEmojiPicker />
              </PopoverContent>
            </Popover>

            {/* Title Input */}
            <div className="flex-1 flex items-center gap-3">
              <Input
                ref={titleRef}
                value={title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled"
                className="text-4xl font-bold border-none shadow-none px-0 py-2 h-auto bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
                style={{ fontSize: '2.25rem', lineHeight: '2.5rem' }}
              />
              
              {/* Saving/Saved indicator */}
              {(hasUnsavedChanges || showSaved) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {hasUnsavedChanges ? (
                    <>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>Saved</span>
                    </>
                  )}
                </div>
              )}

              {/* Collaboration Status & Presence Indicator - Only shown when note is shared */}
              {isNoteShared && (
                <>
                  {isCollaborationLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : isCollaborationConnected && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Live</span>
                      </div>
                      <PresenceIndicator
                        users={collaborationUsers}
                        currentUserId={user?.id}
                        maxDisplay={4}
                      />
                    </div>
                  )}
                </>
              )}
              
              {/* Action Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('🔄 Duplicate menu item clicked!')
                      console.log('onDuplicate function exists?', !!onDuplicate)
                      if (onDuplicate) {
                        console.log('Calling onDuplicate()...')
                        onDuplicate()
                      } else {
                        console.log('❌ onDuplicate is undefined!')
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {onShare && (
                    <DropdownMenuItem onClick={() => onShare(note.id)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {onArchive && (
                    <DropdownMenuItem onClick={onArchive}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                  {onRestore && note.isDeleted && (
                    <DropdownMenuItem onClick={onRestore}>
                      Restore
                    </DropdownMenuItem>
                  )}
                  {onPermanentDelete && note.isDeleted && (
                    <DropdownMenuItem 
                      onClick={onPermanentDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Permanently Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-4xl mx-auto relative">
          {/* Simple AI Toolbar */}
          <div className="sticky top-0 z-[5] bg-background border-b px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <AIToolsMenu
                  selectedText={selectedText}
                  getPlainTextContent={getPlainTextContent}
                  translateLoading={translateLoading}
                  summaryLoading={summaryLoading}
                  textGenerationLoading={textGenerationLoading}
                  onTranslate={translateText}
                  onSummarize={summarizeText}
                  onImproveWriting={improveWriting}
                  onFixGrammar={fixGrammar}
                  onMakeLonger={makeLonger}
                  onMakeShorter={makeShorter}
                />

                {selectedText && (
                  <div className="text-sm text-muted-foreground">
                    {selectedText.length} chars selected
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{getPlainTextContent().length} characters</span>
              </div>
            </div>
          </div>

          {/* Editor Section */}
          <div className="w-full p-8">
            <Suspense fallback={
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading editor...
              </div>
            }>
              <div ref={editorContainerRef} className="notion-editor-wrapper relative">
                {/* Loading Overlay */}
                {(summaryLoading || textGenerationLoading) && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center gap-4 bg-card p-8 rounded-lg shadow-lg border">
                      {/* Animated AI Loading Indicator */}
                      <div className="relative w-24 h-24">
                        {/* Outer rotating ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 border-r-cyan-500 animate-spin" style={{ animationDuration: '2s' }} />

                        {/* Middle pulsing ring */}
                        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-yellow-500 border-l-teal-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />

                        {/* Inner gradient circle */}
                        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-500 via-cyan-400 to-yellow-400 animate-pulse opacity-80" />

                        {/* Center icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-white animate-pulse drop-shadow-lg" style={{ animationDuration: '1s' }} />
                        </div>

                        {/* Floating particles */}
                        <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDuration: '1.2s', animationDelay: '0s' }} />
                        <div className="absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDuration: '1.4s', animationDelay: '0.2s' }} />
                        <div className="absolute -bottom-1 left-1/2 w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDuration: '1.3s', animationDelay: '0.4s' }} />
                        <div className="absolute top-1/2 -left-1 w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDuration: '1.5s', animationDelay: '0.6s' }} />
                      </div>

                      {/* Loading text with gradient */}
                      <p className="text-base font-medium bg-gradient-to-r from-emerald-600 via-cyan-600 to-yellow-600 bg-clip-text text-transparent animate-pulse">
                        {summaryLoading ? 'Generating Summary...' : 'Processing Text...'}
                      </p>

                      {/* Animated dots */}
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {summaryLoading ? 'AI is analyzing your content' : 'AI is improving your content'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Remote Cursors Overlay - Only shown when note is shared and connected */}
                {isNoteShared && isCollaborationConnected && (
                  <RemoteCursors
                    cursors={cursors}
                    users={collaborationUsers}
                    editorRef={editorContainerRef}
                    getQuillInstance={() => {
                      try {
                        return quillRef.current?.getEditor()
                      } catch {
                        return null
                      }
                    }}
                    currentUserId={user?.id}
                  />
                )}

                {/* Use defaultValue to avoid cursor issues with Yjs binding.
                    Key includes editorKey to force remount when switching notes, ensuring correct content is loaded */}
                <ReactQuill
                  key={`editor-${editorKey}-${note.id}`}
                  ref={quillRef}
                  theme="snow"
                  defaultValue={content}
                  onChange={handleContentChange}
                  placeholder="Start writing..."
                  modules={quillModules}
                  formats={quillFormats}
                  className="notion-editor"
                />
              </div>
            </Suspense>

            {/* Generated Summary Card */}
            {generatedSummary && !summaryLoading && (
              <div className="mt-6 border rounded-lg bg-card shadow-sm">
                <div className="border-b bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm">AI Generated Summary</h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="prose prose-sm max-w-none mb-4 text-foreground">
                    <p className="whitespace-pre-wrap">{generatedSummary}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t">
                    <Button
                      onClick={replaceWithSummary}
                      size="sm"
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Replace Content with Summary
                    </Button>
                    <Button
                      onClick={dismissSummary}
                      variant="outline"
                      size="sm"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Text Card */}
            {generatedText && !textGenerationLoading && generatedTextAction && (
              <div className="mt-6 border rounded-lg bg-card shadow-sm">
                <div className="border-b bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm">
                      AI {generatedTextAction === 'improve' ? 'Improved Writing' :
                          generatedTextAction === 'grammar' ? 'Grammar Correction' :
                          generatedTextAction === 'longer' ? 'Expanded Content' :
                          'Condensed Content'}
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="prose prose-sm max-w-none mb-4 text-foreground">
                    <p className="whitespace-pre-wrap">{generatedText}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t">
                    <Button
                      onClick={replaceWithGeneratedText}
                      size="sm"
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Replace Content with {generatedTextAction === 'improve' ? 'Improved Text' :
                                             generatedTextAction === 'grammar' ? 'Corrected Text' :
                                             generatedTextAction === 'longer' ? 'Expanded Text' :
                                             'Condensed Text'}
                    </Button>
                    <Button
                      onClick={dismissGeneratedText}
                      variant="outline"
                      size="sm"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Attachments Display */}
            {attachments.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Linked Items ({attachments.length})</div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md border text-sm",
                        "bg-background hover:bg-muted transition-colors group",
                        onAttachmentClick && "cursor-pointer"
                      )}
                      onClick={() => onAttachmentClick?.(attachment)}
                      role={onAttachmentClick ? "button" : undefined}
                      tabIndex={onAttachmentClick ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (onAttachmentClick && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          onAttachmentClick(attachment)
                        }
                      }}
                    >
                      <div className={cn(
                        "text-muted-foreground",
                        attachment.type === 'notes' && "text-blue-500",
                        attachment.type === 'events' && "text-green-500",
                        attachment.type === 'files' && "text-orange-500"
                      )}>
                        {getAttachmentIcon(attachment.type)}
                      </div>
                      <span className="font-medium truncate max-w-[200px]" title={attachment.title}>
                        {attachment.title}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveAttachment(attachment.id)
                        }}
                        className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove link"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".txt,.md,.docx"
        className="hidden"
      />

      {/* Content Mention Menu */}
      <ContentMentionMenu
        open={showMentionMenu}
        onOpenChange={handleMentionMenuClose}
        onSelect={handleMentionSelect}
        position={mentionPosition}
        searchQuery={mentionQuery}
      />

      {/* Custom styles for editor */}
      <style dangerouslySetInnerHTML={{ __html: `
        .notion-editor-wrapper .ql-toolbar {
          border: none;
          border-bottom: 1px solid hsl(var(--border));
          padding: 8px 16px;
          display: flex;
          flex-wrap: nowrap;
          overflow: visible !important;
          align-items: center;
          position: relative;
          z-index: 20;
        }

        .notion-editor-wrapper {
          position: relative;
        }

        .notion-editor-wrapper .ql-snow.ql-toolbar {
          overflow: visible !important;
        }

        .notion-editor-wrapper .ql-toolbar .ql-formats {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          margin: 0 8px 0 0;
        }

        .notion-editor-wrapper .ql-toolbar .ql-picker {
          position: relative;
          z-index: 30;
        }

        .notion-editor-wrapper .ql-toolbar .ql-picker.ql-expanded .ql-picker-options {
          position: absolute !important;
          z-index: 9999 !important;
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          max-height: 300px;
          overflow-y: auto;
          min-width: 150px;
          margin-top: 4px;
        }

        .notion-editor-wrapper .ql-toolbar .ql-picker-label {
          border: 1px solid hsl(var(--border));
          border-radius: 4px;
          padding: 4px 8px;
        }

        .notion-editor-wrapper .ql-toolbar .ql-picker-item {
          color: hsl(var(--foreground));
        }

        .notion-editor-wrapper .ql-toolbar .ql-picker-item:hover {
          background-color: hsl(var(--muted));
        }
        
        .notion-editor-wrapper .ql-container {
          border: none;
          font-size: 16px;
          font-family: inherit;
          position: relative;
        }

        .ql-picker-options {
          position: absolute !important;
        }
        
        .notion-editor-wrapper .ql-editor {
          padding: 16px 0;
          min-height: 400px;
          line-height: 1.6;
        }
        
        .notion-editor-wrapper .ql-editor::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
          opacity: 0.7;
        }

        .notion-editor-wrapper .ql-toolbar button {
          border-radius: 4px;
          margin: 0 2px;
        }

        .notion-editor-wrapper .ql-toolbar button:hover {
          background-color: hsl(var(--muted));
        }

        .notion-editor-wrapper .ql-toolbar button.ql-active {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        
        .notion-editor-wrapper .ql-toolbar .ql-undo,
        .notion-editor-wrapper .ql-toolbar .ql-redo {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px;
          margin: 0 1px;
        }
        
        .notion-editor-wrapper .ql-toolbar .ql-undo:disabled,
        .notion-editor-wrapper .ql-toolbar .ql-redo:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .notion-editor-wrapper .ql-toolbar .ql-undo svg,
        .notion-editor-wrapper .ql-toolbar .ql-redo svg {
          width: 18px;
          height: 18px;
        }
        
        .notion-editor-wrapper .ql-toolbar .undo-redo-container {
          margin-right: 12px !important;
          padding-right: 12px !important;
          border-right: 1px solid hsl(var(--border));
        }
      ` }} />
    </div>
  )
}