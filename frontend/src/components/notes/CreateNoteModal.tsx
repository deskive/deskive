import { useState, useRef, useCallback, lazy, Suspense } from 'react'
import { useNotesStore } from '../../stores/notesStore'
// import { useCreateNote } from '../../hooks/use-notes' // Disabled for now
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Plus } from 'lucide-react'
import { useToast } from '../ui/use-toast'
import type { NoteTemplate } from '../../types/notes'

// Lazy load the Quill editor
const ReactQuill = lazy(() => import('react-quill-new'))
import 'react-quill-new/dist/quill.snow.css'

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  parentId?: string
}

export function CreateNoteModal({ isOpen, onClose, parentId }: CreateNoteModalProps) {
  // const createNoteMutation = useCreateNote() // Disabled for now
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📄')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [tags, setTags] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const quillRef = useRef<any>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    try {
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      // Mock create note - replace with API call later
      console.log('Creating note:', {
        title: [{ text: title.trim() }],
        icon: { type: 'emoji', value: selectedEmoji },
        parentId,
        content: description ? [{
          id: `block-${Date.now()}`,
          type: 'html' as const,
          content: [{
            text: '',
            html: description
          }],
          createdAt: new Date(),
          updatedAt: new Date()
        }] : [],
        properties: {
          category: category || undefined,
          subcategory: subcategory || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined
        }
      })
      
      toast({
        title: 'Note created',
        description: 'Your new note has been created successfully.',
      })
      
      handleClose()
    } catch (error) {
      console.error('Failed to create note:', error)
      toast({
        title: 'Failed to create note',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [title, description, selectedEmoji, category, subcategory, tags, parentId])

  const handleClose = useCallback(() => {
    setTitle('')
    setDescription('')
    setSelectedEmoji('📄')
    setCategory('')
    setSubcategory('')
    setTags('')
    setIsEmojiPickerOpen(false)
    onClose()
  }, [onClose])

  const handleEmojiSelect = useCallback((emoji: string) => {
    setSelectedEmoji(emoji)
    setIsEmojiPickerOpen(false)
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
            type="button"
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
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ]
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Note
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Icon */}
              <div>
                <Label>Icon</Label>
                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-20 h-20 text-2xl p-0"
                    >
                      {selectedEmoji}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <SimpleEmojiPicker />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="study">Study</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory */}
              <div>
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g. JavaScript, React, Node.js"
                />
              </div>

              {/* Keywords */}
              <div>
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Separate tags with commas"
                />
                <p className="text-xs text-muted-foreground mt-1">e.g. frontend, tutorial, important</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="flex items-center gap-1">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter note title..."
                  className="border-2 border-black"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <div className="border rounded-md h-80">
                  <Suspense fallback={
                    <div className="h-full p-3 text-sm text-muted-foreground flex items-center justify-center">
                      Loading editor...
                    </div>
                  }>
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={description}
                      onChange={setDescription}
                      placeholder="Write your note content here..."
                      modules={quillModules}
                      style={{ height: '280px' }}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Clear
            </Button>
            <Button type="submit" disabled={!title?.trim() || isLoading} className="px-8">
              {isLoading ? 'Creating...' : 'Create Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}