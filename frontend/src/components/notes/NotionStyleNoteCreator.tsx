import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
// import { useCreateNote } from '../../hooks/use-notes' // Disabled for now
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { useToast } from '../ui/use-toast'

// Lazy load the Quill editor
const ReactQuill = lazy(() => import('react-quill-new'))
import 'react-quill-new/dist/quill.snow.css'

interface NotionStyleNoteCreatorProps {
  parentId?: string
  onNoteCreated?: (noteId: string) => void
}

export function NotionStyleNoteCreator({ parentId, onNoteCreated }: NotionStyleNoteCreatorProps) {
  // const createNoteMutation = useCreateNote() // Disabled for now
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('📄')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [hasStartedEditing, setHasStartedEditing] = useState(false)
  
  const titleRef = useRef<HTMLInputElement>(null)
  const quillRef = useRef<any>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Auto-focus title when component mounts
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus()
    }
  }, [])

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!title.trim() && !content.trim()) return
    if (noteId || isCreating) return // Already created or creating

    try {
      setIsCreating(true)
      
      // Mock create note - replace with API call later
      const newNote = {
        id: `note-${Date.now()}`,
        title: [{ text: title }],
        icon: { type: 'emoji', value: selectedIcon },
        parentId,
        content: content ? [{
          id: `block-${Date.now()}`,
          type: 'html' as const,
          content: [{
            text: '',
            html: content
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }] : []
      }
      console.log('Creating note:', {
        title: [{ text: title.trim() || 'Untitled' }],
        icon: { type: 'emoji', value: selectedIcon },
        content: content ? [{
          id: `block-${Date.now()}`,
          type: 'html' as const,
          content: [{
            text: '',
            html: content
          }],
          createdAt: new Date(),
          updatedAt: new Date()
        }] : [],
        parentId
      })
      
      setNoteId(newNote.id)
      
      toast({
        title: 'Note created',
        description: 'Your note has been created and will auto-save as you type.',
      })
      
      if (onNoteCreated) {
        onNoteCreated(newNote.id)
      }
    } catch (error) {
      console.error('Failed to create note:', error)
      toast({
        title: 'Failed to create note',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }, [title, content, selectedIcon, parentId, noteId, isCreating, onNoteCreated])

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    if (!hasStartedEditing) {
      setHasStartedEditing(true)
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      autoSave()
    }, 2000)
  }, [hasStartedEditing, autoSave])

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle content change
  const handleContentChange = useCallback((value: string) => {
    setContent(value)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle emoji select
  const handleEmojiSelect = useCallback((emoji: string) => {
    setSelectedIcon(emoji)
    setIsEmojiPickerOpen(false)
    if (hasStartedEditing) {
      scheduleAutoSave()
    }
  }, [hasStartedEditing, scheduleAutoSave])

  // Handle title key down
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (quillRef.current) {
        quillRef.current.focus()
      }
    }
  }, [])

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

  // Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ]
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="max-w-4xl mx-auto w-full p-8">
        {/* Icon and Title Section */}
        <div className="flex items-start gap-4 mb-8">
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
          <div className="flex-1">
            <Input
              ref={titleRef}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
              className="text-4xl font-bold border-none shadow-none px-0 py-2 h-auto bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
              style={{ fontSize: '2.25rem', lineHeight: '2.5rem' }}
            />
            {isCreating && (
              <p className="text-sm text-muted-foreground mt-2">Creating note...</p>
            )}
            {noteId && !isCreating && (
              <p className="text-sm text-muted-foreground mt-2">Note created. Auto-saving as you type...</p>
            )}
          </div>
        </div>

        {/* Editor Section */}
        <div className="w-full">
          <Suspense fallback={
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading editor...
            </div>
          }>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={handleContentChange}
              placeholder="Start writing..."
              modules={quillModules}
              className="notion-editor"
            />
          </Suspense>
        </div>
      </div>

      {/* Custom styles for editor */}
      <style dangerouslySetInnerHTML={{ __html: `
        .notion-editor .ql-toolbar {
          border: none;
          border-bottom: 1px solid hsl(var(--border));
          padding: 8px 16px;
          border-radius: 8px 8px 0 0;
        }
        
        .notion-editor .ql-container {
          border: none;
          font-size: 16px;
          font-family: inherit;
          border-radius: 0 0 8px 8px;
        }
        
        .notion-editor .ql-editor {
          padding: 16px;
          min-height: 400px;
          line-height: 1.6;
        }
        
        .notion-editor .ql-editor::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
          opacity: 0.7;
          left: 16px;
        }
      ` }} />
    </div>
  )
}