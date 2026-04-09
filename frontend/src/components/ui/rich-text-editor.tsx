import { useState, useMemo, lazy, Suspense, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ContentMentionMenu } from './content-mention-menu'

// Lazy load the Quill editor
const ReactQuill = lazy(() => import('react-quill-new'))
import 'react-quill-new/dist/quill.snow.css'

export interface RichTextAttachment {
  id: string
  title: string
  type: 'notes' | 'events' | 'files' | 'drive'
  // Drive-specific fields
  driveFileUrl?: string
  driveThumbnailUrl?: string
  driveMimeType?: string
  driveFileSize?: number
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  enableMentions?: boolean
  attachments?: RichTextAttachment[]
  onAttachmentsChange?: (attachments: RichTextAttachment[]) => void
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter description...',
  className,
  minHeight = '120px',
  enableMentions = true,
  attachments = [],
  onAttachmentsChange
}: RichTextEditorProps) {
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | undefined>()
  const [mentionQuery, setMentionQuery] = useState('')
  const [internalAttachments, setInternalAttachments] = useState<RichTextAttachment[]>(attachments)
  const quillRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastSlashIndexRef = useRef<number>(-1)
  const dismissedSlashIndexRef = useRef<number>(-1) // Track dismissed slash to prevent re-showing

  // Sync internal attachments with prop
  useEffect(() => {
    setInternalAttachments(attachments)
  }, [attachments])

  // Quill modules configuration - simplified for task descriptions
  const quillModules = useMemo(() => ({
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['link'],
      ['clean']
    ]
  }), [])

  // Quill formats
  const quillFormats = useMemo(() => [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link'
  ], [])

  // Function to check for / mentions and show menu
  const checkForMentions = useCallback(() => {
    if (!enableMentions) return

    const quill = quillRef.current?.getEditor?.()
    if (!quill) return

    const selection = quill.getSelection()
    if (!selection) return

    const cursorIndex = selection.index
    const text = quill.getText(0, cursorIndex)

    // Find the last / symbol before cursor
    const lastSlashIndex = text.lastIndexOf('/')

    // Skip if this slash was already dismissed
    if (lastSlashIndex === dismissedSlashIndexRef.current) {
      return
    }

    // If we find a new slash (different position), reset the dismissed index
    if (lastSlashIndex !== -1 && lastSlashIndex !== dismissedSlashIndexRef.current) {
      // Only reset if this is truly a new slash being typed
      if (lastSlashIndex > dismissedSlashIndexRef.current) {
        dismissedSlashIndexRef.current = -1
      }
    }

    if (lastSlashIndex !== -1 && (cursorIndex - lastSlashIndex) <= 20) {
      const textAfterSlash = text.slice(lastSlashIndex + 1)

      // Allow spaces - don't close menu on space, only check for newlines
      if (!textAfterSlash.includes('\n')) {
        setMentionQuery(textAfterSlash)
        lastSlashIndexRef.current = lastSlashIndex

        // Calculate position for the mention menu (only if not already showing)
        if (!showMentionMenu && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect()

          // Get bounds of the / character from Quill
          const bounds = quill.getBounds(lastSlashIndex)

          // Calculate position relative to viewport
          const menuWidth = 350
          const menuHeight = 350
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          const margin = 10

          let posX = containerRect.left + bounds.left + 20
          let posY = containerRect.top + bounds.top + bounds.height + 5

          // Smart positioning - check if menu fits below
          if (posY + menuHeight > viewportHeight - margin) {
            // Position above if not enough space below
            posY = containerRect.top + bounds.top - menuHeight - 5
          }

          // Ensure horizontal positioning
          if (posX + menuWidth > viewportWidth - margin) {
            posX = viewportWidth - menuWidth - margin
          }

          posX = Math.max(margin, posX)
          posY = Math.max(margin, posY)

          setMentionPosition({ top: posY, left: posX })
        }

        setShowMentionMenu(true)
        return
      }
    }

    // Only close if there's no valid slash context
    if (lastSlashIndex === -1) {
      setShowMentionMenu(false)
    }
  }, [enableMentions, showMentionMenu])

  // Handle text change
  const handleTextChange = useCallback((content: string, _delta: any, source: string, _editor: any) => {
    onChange(content)

    if (!enableMentions || source !== 'user') return

    // Use requestAnimationFrame to ensure Quill state is updated
    // This fixes the issue where selection is null on first @ keypress
    requestAnimationFrame(() => {
      checkForMentions()
    })
  }, [enableMentions, onChange, checkForMentions])

  // Handle mention selection
  const handleMentionSelect = useCallback((item: any) => {
    const quill = quillRef.current?.getEditor?.()
    if (!quill || lastSlashIndexRef.current === -1) return

    const selection = quill.getSelection()
    if (!selection) return

    // Delete from / to current cursor position
    const deleteLength = selection.index - lastSlashIndexRef.current
    quill.deleteText(lastSlashIndexRef.current, deleteLength)

    // Insert the mention text (keep the linked item title without /)
    const mentionText = `${item.title} `
    quill.insertText(lastSlashIndexRef.current, mentionText)

    // Move cursor to end of inserted text
    quill.setSelection(lastSlashIndexRef.current + mentionText.length)

    // Add to attachments
    const newAttachment: RichTextAttachment = {
      id: item.id,
      title: item.title,
      type: item.type
    }

    const updatedAttachments = [...internalAttachments, newAttachment]
    setInternalAttachments(updatedAttachments)
    onAttachmentsChange?.(updatedAttachments)

    setShowMentionMenu(false)
    setMentionQuery('')
    lastSlashIndexRef.current = -1
  }, [internalAttachments, onAttachmentsChange])

  // Handle menu close (from X button or Escape) - marks current slash as dismissed
  const handleMenuClose = useCallback((open: boolean) => {
    if (!open && showMentionMenu) {
      // Mark this slash as dismissed so it won't reopen
      dismissedSlashIndexRef.current = lastSlashIndexRef.current
      setShowMentionMenu(false)
      setMentionQuery('')
    }
  }, [showMentionMenu])

  // Close menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMentionMenu) {
        handleMenuClose(false)
        e.preventDefault()
        e.stopPropagation()
      }
    }

    if (showMentionMenu) {
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [showMentionMenu, handleMenuClose])

  return (
    <div className={cn('rich-text-editor-wrapper space-y-3', className)} ref={containerRef}>
      <Suspense fallback={
        <div className="flex items-center justify-center border rounded-md bg-background" style={{ minHeight }}>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={handleTextChange}
          modules={quillModules}
          formats={quillFormats}
          placeholder={placeholder}
        />
      </Suspense>

      {/* Content Mention Menu */}
      {enableMentions && (
        <ContentMentionMenu
          open={showMentionMenu}
          onOpenChange={handleMenuClose}
          onSelect={handleMentionSelect}
          position={mentionPosition}
          searchQuery={mentionQuery}
        />
      )}

      <style>{`
        .rich-text-editor-wrapper .ql-container {
          min-height: ${minHeight};
          font-size: 14px;
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
        }

        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
        }

        .rich-text-editor-wrapper .ql-container {
          border-color: hsl(var(--border));
          background: hsl(var(--background));
        }

        .rich-text-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          color: hsl(var(--foreground));
        }

        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }

        .rich-text-editor-wrapper .ql-toolbar button {
          color: hsl(var(--foreground));
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover {
          color: hsl(var(--primary));
        }

        .rich-text-editor-wrapper .ql-toolbar button.ql-active {
          color: hsl(var(--primary));
        }

        .rich-text-editor-wrapper .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground));
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-stroke {
          stroke: hsl(var(--primary));
        }

        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
          stroke: hsl(var(--primary));
        }

        .rich-text-editor-wrapper .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground));
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-fill {
          fill: hsl(var(--primary));
        }

        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
          fill: hsl(var(--primary));
        }

        .rich-text-editor-wrapper .ql-toolbar .ql-picker {
          color: hsl(var(--foreground));
        }

        .rich-text-editor-wrapper .ql-toolbar .ql-picker-options {
          background: hsl(var(--popover));
          border-color: hsl(var(--border));
        }

        .rich-text-editor-wrapper .ql-toolbar .ql-picker-item:hover {
          color: hsl(var(--primary));
        }

        /* Dark mode support */
        .dark .rich-text-editor-wrapper .ql-toolbar {
          background: hsl(var(--muted));
        }

        .dark .rich-text-editor-wrapper .ql-editor {
          color: hsl(var(--foreground));
        }

        /* List styles */
        .rich-text-editor-wrapper .ql-editor ul,
        .rich-text-editor-wrapper .ql-editor ol {
          padding-left: 1.5em;
        }

        .rich-text-editor-wrapper .ql-editor li {
          margin-bottom: 0.25em;
        }
      `}</style>
    </div>
  )
}
