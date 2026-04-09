import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Calendar, FolderOpen, Search, Loader2, X } from 'lucide-react'
import { notesApi } from '@/lib/api/notes-api'
import { calendarApi } from '@/lib/api/calendar-api'
import { fileApi } from '@/lib/api/files-api'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type ContentType = 'notes' | 'events' | 'files'

interface ContentItem {
  id: string
  title: string
  type: ContentType
  subtitle?: string
  icon: React.ReactNode
}

interface ContentMentionMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (item: ContentItem) => void
  position?: { top: number; left: number }
  searchQuery?: string
}

export function ContentMentionMenu({
  open,
  onOpenChange,
  onSelect,
  position,
  searchQuery = ''
}: ContentMentionMenuProps) {
  const [selectedType, setSelectedType] = useState<ContentType>('notes')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ContentItem[]>([])
  const { currentWorkspace } = useWorkspace()
  const menuRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Use the searchQuery prop directly for search
  // This syncs with what user types after / in the editor
  const search = searchQuery

  // Fetch items based on selected type and search query
  useEffect(() => {
    if (!open) return

    // Show mock data immediately if no workspace (for demo/testing)
    if (!currentWorkspace?.id) {
      const mockData: Record<ContentType, ContentItem[]> = {
        notes: [
          { id: 'mock-1', title: 'Meeting Notes', type: 'notes', subtitle: 'Last week team meeting summary...', icon: <FileText className="h-4 w-4" /> },
          { id: 'mock-2', title: 'Project Ideas', type: 'notes', subtitle: 'Brainstorming session results...', icon: <FileText className="h-4 w-4" /> },
          { id: 'mock-3', title: 'TODO List', type: 'notes', subtitle: 'Tasks for this week...', icon: <FileText className="h-4 w-4" /> },
        ],
        events: [
          { id: 'mock-1', title: 'Team Standup', type: 'events', subtitle: 'Tomorrow at 9:00 AM', icon: <Calendar className="h-4 w-4" /> },
          { id: 'mock-2', title: 'Sprint Planning', type: 'events', subtitle: 'Friday at 2:00 PM', icon: <Calendar className="h-4 w-4" /> },
          { id: 'mock-3', title: 'Client Review', type: 'events', subtitle: 'Next Monday at 3:00 PM', icon: <Calendar className="h-4 w-4" /> },
        ],
        files: [
          { id: 'mock-1', title: 'Design Mockups.pdf', type: 'files', subtitle: 'application/pdf', icon: <FolderOpen className="h-4 w-4" /> },
          { id: 'mock-2', title: 'Requirements.docx', type: 'files', subtitle: 'application/docx', icon: <FolderOpen className="h-4 w-4" /> },
          { id: 'mock-3', title: 'Budget.xlsx', type: 'files', subtitle: 'application/xlsx', icon: <FolderOpen className="h-4 w-4" /> },
        ]
      }
      setItems(mockData[selectedType])
      setLoading(false)
      return
    }

    const fetchItems = async () => {
      setLoading(true)
      try {
        let fetchedItems: ContentItem[] = []

        if (selectedType === 'notes') {
          if (search.trim()) {
            try {
              const notes = await notesApi.searchNotes(currentWorkspace.id, search)
              fetchedItems = notes.slice(0, 5).map(note => ({
                id: note.id,
                title: note.title || 'Untitled',
                type: 'notes' as ContentType,
                subtitle: note.plainTextContent?.slice(0, 60) || '',
                icon: <FileText className="h-4 w-4" />
              }))
            } catch (error) {
              console.warn('Notes search not available:', error)
              // Fallback: try getting all notes
              try {
                const notes = await notesApi.getNotes(currentWorkspace.id)
                fetchedItems = notes
                  .filter(note => note.title?.toLowerCase().includes(search.toLowerCase()))
                  .slice(0, 5)
                  .map(note => ({
                    id: note.id,
                    title: note.title || 'Untitled',
                    type: 'notes' as ContentType,
                    subtitle: note.plainTextContent?.slice(0, 60) || '',
                    icon: <FileText className="h-4 w-4" />
                  }))
              } catch (fallbackError) {
                console.error('Failed to fetch notes:', fallbackError)
              }
            }
          } else {
            try {
              const notes = await notesApi.getRecentNotes(currentWorkspace.id, 5)
              fetchedItems = notes.map(note => ({
                id: note.id,
                title: note.title || 'Untitled',
                type: 'notes' as ContentType,
                subtitle: note.plainTextContent?.slice(0, 60) || '',
                icon: <FileText className="h-4 w-4" />
              }))
            } catch (error) {
              console.warn('Recent notes not available:', error)
              // Fallback: get all notes and take first 5
              try {
                const notes = await notesApi.getNotes(currentWorkspace.id)
                fetchedItems = notes.slice(0, 5).map(note => ({
                  id: note.id,
                  title: note.title || 'Untitled',
                  type: 'notes' as ContentType,
                  subtitle: note.plainTextContent?.slice(0, 60) || '',
                  icon: <FileText className="h-4 w-4" />
                }))
              } catch (fallbackError) {
                console.error('Failed to fetch notes:', fallbackError)
              }
            }
          }
        } else if (selectedType === 'events') {
          if (search.trim()) {
            try {
              const events = await calendarApi.searchEvents(currentWorkspace.id, search)
              fetchedItems = events.slice(0, 5).map(event => ({
                id: event.id,
                title: event.title,
                type: 'events' as ContentType,
                subtitle: `${format(new Date(event.startTime || event.start_time || new Date()), 'MMM d, yyyy h:mm a')}`,
                icon: <Calendar className="h-4 w-4" />
              }))
            } catch (error) {
              console.warn('Events search not available:', error)
            }
          } else {
            try {
              const events = await calendarApi.getUpcomingEvents(currentWorkspace.id, 7)
              fetchedItems = events.slice(0, 5).map(event => ({
                id: event.id,
                title: event.title,
                type: 'events' as ContentType,
                subtitle: `${format(new Date(event.startTime || event.start_time || new Date()), 'MMM d, yyyy h:mm a')}`,
                icon: <Calendar className="h-4 w-4" />
              }))
            } catch (error) {
              console.warn('Upcoming events not available:', error)
            }
          }
        } else if (selectedType === 'files') {
          if (search.trim()) {
            try {
              const result = await fileApi.searchFiles(currentWorkspace.id, search, { limit: 5 })
              fetchedItems = result.data.map(file => ({
                id: file.id,
                title: file.name,
                type: 'files' as ContentType,
                subtitle: file.mime_type || '',
                icon: <FolderOpen className="h-4 w-4" />
              }))
            } catch (error) {
              console.warn('Files search not available:', error)
            }
          } else {
            try {
              const files = await fileApi.getRecentFiles(currentWorkspace.id, 5)
              fetchedItems = files.map(file => ({
                id: file.id,
                title: file.name,
                type: 'files' as ContentType,
                subtitle: file.mime_type || '',
                icon: <FolderOpen className="h-4 w-4" />
              }))
            } catch (error) {
              console.warn('Recent files not available:', error)
              // Fallback: get all files and take first 5
              try {
                const result = await fileApi.getFilesOnly(currentWorkspace.id, { limit: 5 })
                fetchedItems = result.data.map(file => ({
                  id: file.id,
                  title: file.name,
                  type: 'files' as ContentType,
                  subtitle: file.mime_type || '',
                  icon: <FolderOpen className="h-4 w-4" />
                }))
              } catch (fallbackError) {
                console.error('Failed to fetch files:', fallbackError)
              }
            }
          }
        }

        setItems(fetchedItems)
      } catch (error) {
        console.error('Error fetching items:', error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [selectedType, search, open, currentWorkspace])

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const lowerSearch = search.toLowerCase()
    return items.filter(item =>
      item.title.toLowerCase().includes(lowerSearch) ||
      item.subtitle?.toLowerCase().includes(lowerSearch)
    )
  }, [items, search])

  if (!open) return null

  const menuContent = (
    <div
      ref={menuRef}
      role="dialog"
      aria-modal="false"
      className="fixed w-[350px] h-[350px] animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        zIndex: 9999999,
        pointerEvents: 'auto',
        ...(position ? {
          top: `${position.top}px`,
          left: `${position.left}px`
        } : {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        })
      }}
      data-radix-focus-guard="true"
      onMouseDown={(e) => {
        // Prevent focus from leaving the input field
        e.preventDefault()
      }}
    >
        <div
          className="rounded-lg border shadow-lg bg-background/95 backdrop-blur-sm h-full flex flex-col"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Category tabs */}
          <div className="flex items-center justify-between border-b px-2 py-2 gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSelectedType('notes')
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer',
                  selectedType === 'notes'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <FileText className="h-4 w-4" />
                Notes
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSelectedType('events')
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer',
                  selectedType === 'events'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <Calendar className="h-4 w-4" />
                Events
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSelectedType('files')
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer',
                  selectedType === 'files'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <FolderOpen className="h-4 w-4" />
                Files
              </button>
            </div>

            {/* Close button */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpenChange(false)
              }}
              className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search display - shows what user types after / in the editor */}
          <div className="flex items-center border-b px-3 py-2 flex-shrink-0">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <div className="flex h-8 w-full items-center rounded-md bg-transparent py-3 text-sm">
              <span className="text-foreground">{search}</span>
              <span
                className="inline-block w-px h-[1.1em] bg-foreground"
                style={{ animation: 'cursor-blink 1s step-end infinite' }}
              />
              {!search && (
                <span className="text-muted-foreground ml-1">Type to search {selectedType}...</span>
              )}
            </div>
            <style>{`
              @keyframes cursor-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
              }
            `}</style>
          </div>

          {/* Items list - Fixed scrollable area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-scroll min-h-0"
            style={{
              overscrollBehavior: 'contain',
              pointerEvents: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
            onWheel={(e) => {
              // Manually handle scroll to ensure it works even if parent blocks it
              e.stopPropagation()
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop += e.deltaY
              }
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search.trim() ? `No ${selectedType} found.` : `No recent ${selectedType}.`}
              </div>
            ) : (
              <div className="py-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {search.trim() ? `Search results` : `Recent ${selectedType}`}
                </div>
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      // Allow click to work but keep focus in input
                      e.preventDefault()
                      onSelect(item)
                      onOpenChange(false)
                    }}
                    className="w-full flex items-start gap-3 px-3 py-3 hover:bg-muted transition-colors cursor-pointer text-left"
                  >
                    <div className="mt-0.5">{item.icon}</div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  )

  // Render in a portal at document root to avoid positioning issues
  return createPortal(menuContent, document.body)
}
