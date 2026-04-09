import { useState, useRef, useEffect } from 'react'
import { Textarea } from './textarea'
import { ContentMentionMenu } from './content-mention-menu'
import { X, FileText, Calendar, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Attachment {
  id: string
  title: string
  type: 'notes' | 'events' | 'files'
}

interface NotesMentionTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  onNoteSelect?: (note: any) => void
  attachments?: Attachment[]
  onAttachmentsChange?: (attachments: Attachment[]) => void
}

export function NotesMentionTextarea({
  value,
  onChange,
  placeholder,
  rows,
  onNoteSelect,
  attachments = [],
  onAttachmentsChange
}: NotesMentionTextareaProps) {
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | undefined>()
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [internalAttachments, setInternalAttachments] = useState<Attachment[]>(attachments)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevAttachmentsRef = useRef<Attachment[]>(attachments)
  const lastSlashIndexRef = useRef<number>(-1)
  const dismissedSlashIndexRef = useRef<number>(-1) // Track dismissed slash to prevent re-showing

  // Sync internal attachments with prop only if they actually changed
  useEffect(() => {
    // Deep comparison to avoid infinite loops
    const attachmentsChanged =
      attachments.length !== prevAttachmentsRef.current.length ||
      attachments.some((att, idx) => {
        const prevAtt = prevAttachmentsRef.current[idx]
        return !prevAtt || att.id !== prevAtt.id || att.title !== prevAtt.title || att.type !== prevAtt.type
      })

    if (attachmentsChanged) {
      setInternalAttachments(attachments)
      prevAttachmentsRef.current = attachments
    }
  }, [attachments])

  // Detect / symbol and show mention menu
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0

    onChange(newValue)
    setCursorPosition(cursorPos)

    // Check if / was just typed and cursor is right after it
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

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

    // Show menu only if:
    // 1. There's a / symbol
    // 2. The cursor is within 20 characters after the /
    // 3. No newline after / (spaces are allowed)
    if (lastSlashIndex !== -1 && (cursorPos - lastSlashIndex) <= 20) {
      const textAfterSlash = textBeforeCursor.slice(lastSlashIndex + 1)

      // Allow spaces - don't close menu on space, only check for newlines
      if (!textAfterSlash.includes('\n')) {
        setMentionQuery(textAfterSlash)
        lastSlashIndexRef.current = lastSlashIndex

        // Calculate position for the mention menu - floating next to / symbol with smart positioning (only if not already showing)
        if (!showMentionMenu && textareaRef.current) {
          const textarea = textareaRef.current
          const rect = textarea.getBoundingClientRect()
          const computedStyle = window.getComputedStyle(textarea)

          // Get line position and character position
          const textUpToSlash = textBeforeCursor.slice(0, lastSlashIndex)
          const lines = textUpToSlash.split('\n')
          const currentLine = lines.length - 1
          const currentLineText = lines[currentLine] || ''
          const lineHeight = parseInt(computedStyle.lineHeight) || 24
          const fontSize = parseInt(computedStyle.fontSize) || 14

          // Calculate position based on line number
          const paddingTop = parseInt(computedStyle.paddingTop) || 8
          const paddingLeft = parseInt(computedStyle.paddingLeft) || 12

          // Estimate horizontal position based on character count (rough but simple)
          const avgCharWidth = fontSize * 0.6 // Approximate character width
          const charOffset = currentLineText.length * avgCharWidth

          // Position near the @ symbol with offset to the right
          let posX = rect.left + paddingLeft + charOffset + 40 // +40px offset to the right
          let posY = rect.top + paddingTop + (currentLine * lineHeight) + lineHeight + 5

          // Menu dimensions - FIXED SIZE (smaller for better UX)
          const menuWidth = 350
          const menuHeight = 350 // Fixed height always
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          const margin = 10

          console.log('📍 Initial position:', { posX, posY, line: currentLine, textareaTop: rect.top, textareaBottom: rect.bottom, viewportHeight })

          // Calculate available space in all directions (from viewport edges)
          const spaceBelow = viewportHeight - posY
          const spaceAbove = posY - margin // Space from top of viewport to cursor
          const spaceRight = viewportWidth - posX
          const spaceLeft = posX

          console.log('📍 Available space:', {
            above: spaceAbove,
            below: spaceBelow,
            left: spaceLeft,
            right: spaceRight,
            shouldGoAbove: spaceBelow < menuHeight + margin,
            hasEnoughSpaceAbove: spaceAbove > menuHeight
          })

          let finalPosY = posY

          // SMART VERTICAL POSITIONING - Using FIXED HEIGHT
          console.log('🔍 Checking positioning: spaceBelow=', spaceBelow, 'menuHeight=', menuHeight, 'spaceAbove=', spaceAbove)

          if (spaceBelow < menuHeight + margin) {
            console.log('⚠️ Not enough space below! (need:', menuHeight + margin, 'have:', spaceBelow, ')')

            // Check if we should position above
            if (spaceAbove >= menuHeight + margin) {
              // Position ABOVE - menu's bottom edge at @ symbol line
              finalPosY = posY - menuHeight
              console.log('✅✅✅ POSITIONING ABOVE (bottom at cursor) at Y:', finalPosY)
            } else {
              // Not enough space above either, position at viewport top
              finalPosY = margin
              console.log('⚠️⚠️⚠️ Not enough space anywhere, positioning at top:', finalPosY)
            }
          } else {
            console.log('✅ Enough space below, positioning normally at Y:', finalPosY)
          }

          // SMART HORIZONTAL POSITIONING
          let finalPosX = posX
          if (spaceRight < menuWidth + margin) {
            console.log('⚠️ Not enough space on right')
            if (spaceLeft > menuWidth + margin) {
              finalPosX = posX - menuWidth
              console.log('✅ Positioning to LEFT')
            } else {
              finalPosX = viewportWidth - menuWidth - margin
              console.log('✅ Aligning to viewport RIGHT edge')
            }
          }

          // Ensure menu stays within viewport bounds
          finalPosX = Math.max(margin, Math.min(finalPosX, viewportWidth - menuWidth - margin))
          finalPosY = Math.max(margin, Math.min(finalPosY, viewportHeight - menuHeight - margin))

          console.log('📍 FINAL POSITION:', {
            x: finalPosX,
            y: finalPosY,
            fixedHeight: menuHeight,
            viewport: { width: viewportWidth, height: viewportHeight }
          })

          setMentionPosition({
            top: finalPosY,
            left: finalPosX
          })
        }

        setShowMentionMenu(true)

        // Blur the textarea to release focus for menu
        setTimeout(() => {
          if (textareaRef.current && showMentionMenu) {
            textareaRef.current.blur()
          }
        }, 100)
        return
      }
    }

    // Only close if there's no valid slash context
    if (lastSlashIndex === -1) {
      setShowMentionMenu(false)
    }
  }

  // Handle menu close (from X button or Escape) - marks current slash as dismissed
  const handleMenuClose = (open: boolean) => {
    if (!open && showMentionMenu) {
      // Mark this slash as dismissed so it won't reopen
      dismissedSlashIndexRef.current = lastSlashIndexRef.current
      setShowMentionMenu(false)
      setMentionQuery('')
    }
  }

  // Handle item selection from mention menu
  const handleMentionSelect = (item: any) => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const textBeforeCursor = value.slice(0, cursorPosition)
    const textAfterCursor = value.slice(cursorPosition)
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

    if (lastSlashIndex !== -1) {
      // Replace /query with the selected item
      const textBeforeSlash = textBeforeCursor.slice(0, lastSlashIndex)
      const mentionText = `${item.title}`
      const newValue = textBeforeSlash + mentionText + ' ' + textAfterCursor

      onChange(newValue)

      // Add to attachments
      const newAttachment: Attachment = {
        id: item.id,
        title: item.title,
        type: item.type
      }

      const updatedAttachments = [...internalAttachments, newAttachment]
      setInternalAttachments(updatedAttachments)

      if (onAttachmentsChange) {
        onAttachmentsChange(updatedAttachments)
      }

      // Set cursor position after the mention
      setTimeout(() => {
        const newCursorPos = textBeforeSlash.length + mentionText.length + 1
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }, 0)
    }

    setShowMentionMenu(false)
    setMentionQuery('')

    // Call the onNoteSelect callback if provided
    if (onNoteSelect) {
      onNoteSelect(item)
    }
  }

  // Handle removing an attachment
  const handleRemoveAttachment = (attachmentId: string) => {
    const updatedAttachments = internalAttachments.filter(att => att.id !== attachmentId)
    setInternalAttachments(updatedAttachments)

    if (onAttachmentsChange) {
      onAttachmentsChange(updatedAttachments)
    }
  }

  // Get icon for attachment type
  const getAttachmentIcon = (type: string) => {
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
  }

  // Close menu on Escape key
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
  }, [showMentionMenu])

  return (
    <div className="space-y-3">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        placeholder={placeholder}
        rows={rows}
      />

      {/* Attachments Display */}
      {internalAttachments.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Attachments</div>
          <div className="flex flex-wrap gap-2">
            {internalAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border text-sm",
                  "bg-background hover:bg-muted transition-colors group"
                )}
              >
                <div className="text-muted-foreground">
                  {getAttachmentIcon(attachment.type)}
                </div>
                <span className="font-medium">{attachment.title}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="ml-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ContentMentionMenu
        open={showMentionMenu}
        onOpenChange={handleMenuClose}
        onSelect={handleMentionSelect}
        position={mentionPosition}
        searchQuery={mentionQuery}
      />
    </div>
  )
}
