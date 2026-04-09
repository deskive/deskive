import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { useNotesStore } from '../../stores/notesStore'
import type { Note } from '../../types/notes'
import { cn } from '../../lib/utils'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { notesApi, notesKeys } from '../../lib/api/notes-api'
import { useToast } from '../ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  FileText,
  Star,
  Archive,
  Trash2,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Copy,
  Share,
  Undo2,
  GitMerge,
  Loader2,
  Upload
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Checkbox } from '../ui/checkbox'

interface NotesLeftSidebarProps {
  onCreateNote?: (parentId?: string) => void
  onImport?: () => void
}

// NotesTree component matching original design
interface NotesTreeProps {
  notes: Note[]
  allNotes?: Note[]
  level?: number
  parentId?: string
  onCreateNote?: (parentId?: string) => void
  onDeleteNote?: (noteId: string) => void
  onRestoreNote?: (noteId: string) => void
  onPermanentDelete?: (noteId: string) => void
  onDuplicateNote?: (noteId: string, parentId?: string) => void
  onShareNote?: (noteId: string) => void
  onToggleFavorite?: (noteId: string, isFavorite: boolean) => void
  onArchiveNote?: (noteId: string) => void
  onUnarchiveNote?: (noteId: string) => void
  selectedNotes: string[]
  onNoteSelectionChange: (noteId: string, isSelected: boolean) => void
  showAllNotes?: boolean
  filterFavorites?: boolean
  filterArchived?: boolean
  filterDeleted?: boolean
}

function NotesTree({
  notes,
  allNotes,
  level = 0,
  parentId,
  onCreateNote,
  onDeleteNote,
  onRestoreNote,
  onPermanentDelete,
  onDuplicateNote,
  onShareNote,
  onToggleFavorite,
  onArchiveNote,
  onUnarchiveNote,
  selectedNotes,
  onNoteSelectionChange,
  showAllNotes = false,
  filterFavorites,
  filterArchived,
  filterDeleted
}: NotesTreeProps) {
    const intl = useIntl()
  const { selectNote } = useNotesStore()
  const { currentWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))

  // Use allNotes if provided, otherwise use notes
  const notesSource = allNotes || notes

  // Utility functions for notes data
  const getNoteById = (noteId: string) => notesSource.find(note => note.id === noteId)
  const getChildren = (noteId: string) => notesSource.filter(note => note.parentId === noteId)

  const filteredNotes = notes.filter(note => {
    // Filter by parent relationship
    let matchesParent = false
    if (parentId) {
      matchesParent = note.parentId === parentId
    } else {
      matchesParent = !note.parentId // Root notes only
    }

    if (!matchesParent) return false

    // Apply additional filters if specified
    if (filterFavorites !== undefined && note.isFavorite !== filterFavorites) {
      return false
    }

    if (filterArchived !== undefined && note.isArchived !== filterArchived) {
      return false
    }

    if (filterDeleted !== undefined && note.isDeleted !== filterDeleted) {
      return false
    }

    return true
  })

  const toggleExpanded = (noteId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        newSet.add(noteId)
      }
      return newSet
    })
  }

  const handleAction = async (action: string, noteId: string) => {
    const note = getNoteById(noteId)
    if (!note) return

    try {
      switch (action) {
        case 'favorite':
          onToggleFavorite?.(noteId, !note.isFavorite)
          break
        case 'delete':
          // Soft delete
          onDeleteNote?.(noteId)
          break
        case 'restore':
          onRestoreNote?.(noteId)
          break
        case 'permanent-delete':
          // Permanent delete
          onPermanentDelete?.(noteId)
          break
        case 'duplicate':
          onDuplicateNote?.(noteId, note.parentId)
          break
        case 'share':
          onShareNote?.(noteId)
          break
        case 'archive':
          onArchiveNote?.(noteId)
          break
        case 'unarchive':
          onUnarchiveNote?.(noteId)
          break
      }
    } catch (error) {
      console.error(`Failed to ${action} note:`, error)
    }
  }

  return (
    <div className={cn("space-y-0.5", level > 0 && "ml-3 border-l border-border/30 pl-2")}>
      {filteredNotes.map((note) => {
        const children = getChildren(note.id)
        const hasChildren = children.length > 0
        const isExpanded = expandedNodes.has(note.id)
        const isSelected = selectedNotes.includes(note.id)

        return (
          <div key={note.id} className="space-y-0.5">
            <div
              className={cn(
                "group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-all duration-200",
                "hover:shadow-sm",
                note.isDeleted ? "opacity-60 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30" :
                  isSelected ?
                    "bg-primary/10 border border-primary/20 shadow-sm" :
                    "hover:bg-muted/60",
                level === 0 ? "mx-0.5" : ""
              )}
              onClick={() => {
                if (!currentWorkspace) return
                selectNote(note.id)
                // Navigate to the note
                navigate(`/workspaces/${currentWorkspace.id}/notes/${note.id}`)
              }}
            >
              {/* Hierarchy Indicator */}
              {level > 0 && !showAllNotes && (
                <div className="w-0.5 h-4 bg-border/50 rounded-full flex-shrink-0" />
              )}

              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onNoteSelectionChange(note.id, !!checked)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex-shrink-0 h-4 w-4",
                  selectedNotes.length > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  "transition-opacity duration-200"
                )}
              />

              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-4 w-4 p-0 flex-shrink-0 rounded-sm",
                  hasChildren ? "opacity-70 hover:opacity-100 hover:bg-muted" : "opacity-0",
                  "transition-all duration-200"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasChildren) {
                    toggleExpanded(note.id)
                  }
                }}
                disabled={!hasChildren}
              >
                {hasChildren && (
                  isExpanded ?
                    <ChevronDown className="h-3 w-3" /> :
                    <ChevronRight className="h-3 w-3" />
                )}
              </Button>

              {/* Note Icon */}
              <span className="text-sm mr-2 flex-shrink-0">
                {note.icon?.value || '📝'}
              </span>

              {/* Note Title */}
              <span className={cn(
                "flex-1 text-sm truncate",
                note.isDeleted ? "line-through text-muted-foreground" : ""
              )}>
                {note.title?.map(rt => rt.text).join('') || intl.formatMessage({ id: 'modules.notes.leftSidebar.untitled' })}
              </span>

              {/* Favorite Star */}
              {note.isFavorite && (
                <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
              )}

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    handleAction('favorite', note.id)
                  }}>
                    <Star className="h-4 w-4 mr-2" />
                    {note.isFavorite ? intl.formatMessage({ id: 'modules.notes.leftSidebar.removeFavorites' }) : intl.formatMessage({ id: 'modules.notes.leftSidebar.addFavorites' })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    onCreateNote?.(note.id)
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {intl.formatMessage({ id: 'modules.notes.leftSidebar.addSubNote' })}
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    handleAction('duplicate', note.id)
                  }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem> */}
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    handleAction('share', note.id)
                  }}>
                    <Share className="h-4 w-4 mr-2" />
                    {intl.formatMessage({ id: 'modules.notes.leftSidebar.share' })}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {note.isDeleted ? (
                    <>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleAction('restore', note.id)
                      }}>
                        <Undo2 className="h-4 w-4 mr-2" />
                        {intl.formatMessage({ id: 'modules.notes.leftSidebar.restore' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleAction('permanent-delete', note.id)
                      }} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {intl.formatMessage({ id: 'modules.notes.leftSidebar.deletePermanently' })}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      {note.isArchived ? (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleAction('unarchive', note.id)
                        }}>
                          <Archive className="h-4 w-4 mr-2" />
                          {intl.formatMessage({ id: 'modules.notes.leftSidebar.unarchive' })}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleAction('archive', note.id)
                        }}>
                          <Archive className="h-4 w-4 mr-2" />
                          {intl.formatMessage({ id: 'modules.notes.leftSidebar.archive' })}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        handleAction('delete', note.id)
                      }} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {intl.formatMessage({ id: 'modules.notes.leftSidebar.delete' })}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Render children if expanded */}
            {hasChildren && isExpanded && (
              <NotesTree
                notes={notesSource}
                allNotes={allNotes}
                level={level + 1}
                parentId={note.id}
                onCreateNote={onCreateNote}
                onDeleteNote={onDeleteNote}
                onRestoreNote={onRestoreNote}
                onPermanentDelete={onPermanentDelete}
                onDuplicateNote={onDuplicateNote}
                onShareNote={onShareNote}
                onToggleFavorite={onToggleFavorite}
                onArchiveNote={onArchiveNote}
                onUnarchiveNote={onUnarchiveNote}
                selectedNotes={selectedNotes}
                onNoteSelectionChange={onNoteSelectionChange}
                showAllNotes={false}
                filterFavorites={filterFavorites}
                filterArchived={filterArchived}
                filterDeleted={filterDeleted}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function NotesLeftSidebar({
  onCreateNote,
  onImport
}: NotesLeftSidebarProps) {
    const intl = useIntl()
  const { currentWorkspace } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    notes: storeNotes,
    ui,
    searchQuery,
    setSearchQuery,
    selectNote,
    triggerCreateNote,
    triggerShareNote,
    selectedNotes,
    toggleNoteSelection,
    clearSelectedNotes,
    updateNote,
    // duplicateNote removed - using API call instead
    setNotes,
    addNote,
    clearSelection
  } = useNotesStore()
  const [searchResults, setSearchResults] = useState<Note[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)

  // State for expanded/collapsed sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all-notes']))

  // Helper function to convert API notes to local format
  const convertApiNotesToLocal = (apiNotes: any[], workspaceId: string): Note[] => {
    // First pass: convert all notes
    const notesMap = new Map<string, Note>()

    apiNotes.forEach(apiNote => {
      const localNote: Note = {
        id: apiNote.id,
        workspaceId: workspaceId,
        title: [{ text: apiNote.title }],
        icon: { type: 'emoji', value: '📄' },
        content: [{
          id: `block-${Date.now()}`,
          type: 'html' as const,
          content: [{
            html: apiNote.content || '<p></p>'
          }],
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        children: [],
        parentId: apiNote.parent_id || undefined,
        properties: {},
        // Handle both camelCase and snake_case from API
        createdAt: new Date(apiNote.createdAt || apiNote.created_at),
        updatedAt: new Date(apiNote.updatedAt || apiNote.updated_at),
        createdBy: apiNote.createdBy || apiNote.created_by,
        lastEditedBy: apiNote.lastEditedBy || apiNote.last_edited_by || apiNote.createdBy || apiNote.created_by,
        isDeleted: !!apiNote.deleted_at,
        isArchived: !!apiNote.archived_at,  // Note is archived if archived_at is not null
        archivedAt: apiNote.archived_at || undefined,
        isFavorite: apiNote.is_favorite || apiNote.isFavorite || false,
        permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
        tags: apiNote.tags || [],
        version: 1,
        lastSavedAt: new Date(),
        // Preserve enriched fields from backend API
        author_id: apiNote.author_id,
        author: apiNote.author,
        collaborators: apiNote.collaborators,
        collaborative_data: apiNote.collaborative_data
      }
      notesMap.set(apiNote.id, localNote)
    })

    // Second pass: build children relationships
    const notes = Array.from(notesMap.values())
    notes.forEach(note => {
      if (note.parentId) {
        const parent = notesMap.get(note.parentId)
        if (parent) {
          parent.children = parent.children || []
          if (!parent.children.includes(note.id)) {
            parent.children.push(note.id)
          }
        }
      }
    })

    return notes
  }

  // Helper function to refetch notes
  const refetchNotes = async () => {
    if (!currentWorkspace) return

    try {
      // Fetch both regular notes and deleted notes
      const [regularNotes, deletedNotes] = await Promise.all([
        notesApi.getNotes(currentWorkspace.id, undefined, false),
        notesApi.getNotes(currentWorkspace.id, undefined, true)
      ])

      // Combine and convert to local format
      const allApiNotes = [...regularNotes, ...deletedNotes]
      const localNotes = convertApiNotesToLocal(allApiNotes, currentWorkspace.id)
      setNotes(localNotes)
    } catch (error) {
      console.error('Failed to refetch notes:', error)
      throw error
    }
  }

  // Fetch notes from API when workspace changes (only once per workspace)
  useEffect(() => {
    const fetchNotes = async () => {
      if (!currentWorkspace) return

      // Don't fetch if we've already loaded notes for this workspace
      if (loadedWorkspaceId === currentWorkspace.id) return

      setIsLoadingNotes(true)
      try {
        // Fetch both regular notes and deleted notes
        const [regularNotes, deletedNotes] = await Promise.all([
          notesApi.getNotes(currentWorkspace.id, undefined, false),
          notesApi.getNotes(currentWorkspace.id, undefined, true)
        ])

        // Combine and convert to local format
        const allApiNotes = [...regularNotes, ...deletedNotes]
        const localNotes = convertApiNotesToLocal(allApiNotes, currentWorkspace.id)
        setNotes(localNotes)

        // Mark this workspace as loaded
        setLoadedWorkspaceId(currentWorkspace.id)
      } catch (error) {
        console.error('Failed to fetch notes:', error)
      } finally {
        setIsLoadingNotes(false)
      }
    }

    fetchNotes()
  }, [currentWorkspace?.id])

  // Listen for notes refresh events (triggered after import)
  useEffect(() => {
    const handleNotesRefresh = async () => {
      console.log('📥 Notes refresh event received, refetching notes...')
      await refetchNotes()
    }

    window.addEventListener('notesRefresh', handleNotesRefresh)
    return () => {
      window.removeEventListener('notesRefresh', handleNotesRefresh)
    }
  }, [currentWorkspace?.id])

  // Use store notes as the source of truth
  const notesData = storeNotes

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query) {
      setIsSearching(true)
      // Mock search - filter notes by title
      setTimeout(() => {
        const results = notesData.filter(note =>
          note.title?.map(rt => rt.text).join('').toLowerCase().includes(query.toLowerCase())
        )
        setSearchResults(results)
        setIsSearching(false)
      }, 300)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const handleCreateNote = async (parentId?: string) => {
    if (!currentWorkspace) return

    try {
      // Call the API to create a new note with parent_id
      const newNote = await notesApi.createNote(currentWorkspace.id, {
        title: 'Untitled Note',
        content: '<p></p>',
        tags: [],
        parent_id: parentId,
      })

      // Convert API response to local Note format
      const localNote: Note = {
        id: newNote.id,
        workspaceId: currentWorkspace.id,
        title: [{ text: newNote.title }],
        icon: { type: 'emoji', value: '📄' },
        content: [{
          id: `block-${Date.now()}`,
          type: 'html' as const,
          content: [{
            html: newNote.content || '<p></p>'
          }],
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        children: [],
        parentId: parentId,
        properties: {},
        // Handle both camelCase and snake_case from API
        createdAt: new Date(newNote.createdAt || newNote.created_at || new Date()),
        updatedAt: new Date(newNote.updatedAt || newNote.updated_at || new Date()),
        createdBy: newNote.createdBy || newNote.created_by || '',
        lastEditedBy: newNote.lastEditedBy || newNote.last_edited_by || newNote.createdBy || newNote.created_by || '',
        isDeleted: false,
        isArchived: !!(newNote as any).archived_at,  // Check archived_at field
        archivedAt: (newNote as any).archived_at || undefined,
        isFavorite: (newNote as any).is_favorite || false,
        permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
        tags: newNote.tags || [],
        version: 1,
        lastSavedAt: new Date(),
        // Preserve enriched fields from backend API
        author_id: newNote.author_id,
        author: newNote.author,
        collaborators: newNote.collaborators,
        collaborative_data: newNote.collaborative_data
      }

      // Add to store and select it
      addNote(localNote)
      selectNote(newNote.id)

      // Refetch notes to ensure sync with backend
      await refetchNotes()

      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.success' }),
        description: parentId ? intl.formatMessage({ id: 'modules.notes.leftSidebar.subNoteCreated' }) : intl.formatMessage({ id: 'modules.notes.leftSidebar.noteCreated' }),
      })
    } catch (error) {
      console.error('Failed to create note:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.failedCreate' }),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!currentWorkspace) return

    try {
      // Helper function to check if deletedNoteId is an ancestor of targetNoteId
      const isAncestor = (deletedNoteId: string, targetNoteId: string): boolean => {
        let currentNote = storeNotes.find(n => n.id === targetNoteId)

        while (currentNote?.parentId) {
          if (currentNote.parentId === deletedNoteId) {
            return true
          }
          currentNote = storeNotes.find(n => n.id === currentNote!.parentId)
        }

        return false
      }

      // Check if we need to redirect
      const shouldRedirect = ui.selectedNoteId && (
        ui.selectedNoteId === noteId || // Deleting the currently selected note
        isAncestor(noteId, ui.selectedNoteId) // Deleting an ancestor of the selected note
      )

      // Clear selection and navigate to notes list if needed
      if (shouldRedirect) {
        clearSelection()
        navigate(`/workspaces/${currentWorkspace.id}/notes`, { replace: true })
      }

      // Call DELETE API with workspaceId
      await notesApi.deleteNote(currentWorkspace.id, noteId)

      // Refetch notes to ensure sync with backend
      await refetchNotes()

      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.success' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.noteDeleted' }),
      })
    } catch (error) {
      console.error('Failed to delete note:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.failedDelete' }),
        variant: 'destructive',
      })
    }
  }
  
  const handleRestoreNote = async (noteId: string) => {
    if (!currentWorkspace) return

    try {
      // Call restore API with workspaceId
      await notesApi.restoreNote(currentWorkspace.id, noteId)

      // Refetch notes to ensure sync with backend
      await refetchNotes()

      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.success' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.noteRestored' }),
      })
    } catch (error) {
      console.error('Failed to restore note:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.failedRestore' }),
        variant: 'destructive',
      })
    }
  }

  const handlePermanentDelete = async (noteId: string) => {
    if (!currentWorkspace) return

    try {
      // Helper function to check if deletedNoteId is an ancestor of targetNoteId
      const isAncestor = (deletedNoteId: string, targetNoteId: string): boolean => {
        let currentNote = storeNotes.find(n => n.id === targetNoteId)

        while (currentNote?.parentId) {
          if (currentNote.parentId === deletedNoteId) {
            return true
          }
          currentNote = storeNotes.find(n => n.id === currentNote!.parentId)
        }

        return false
      }

      // Check if we need to redirect
      const shouldRedirect = ui.selectedNoteId && (
        ui.selectedNoteId === noteId || // Deleting the currently selected note
        isAncestor(noteId, ui.selectedNoteId) // Deleting an ancestor of the selected note
      )

      // Clear selection and navigate to notes list if needed
      if (shouldRedirect) {
        clearSelection()
        navigate(`/workspaces/${currentWorkspace.id}/notes`, { replace: true })
      }

      // Call permanent delete API with workspaceId
      await notesApi.permanentDeleteNote(currentWorkspace.id, noteId)

      // Refetch notes to ensure sync with backend
      await refetchNotes()

      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.success' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.notePermanentlyDeleted' }),
      })
    } catch (error) {
      console.error('Failed to permanently delete note:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.failedPermanentDelete' }),
        variant: 'destructive',
      })
    }
  }
  
  const handleDuplicateNote = async (noteId: string, parentId?: string) => {
    if (!currentWorkspace) {
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: 'No workspace selected',
        variant: 'destructive',
      })
      return
    }

    try {
      // Get the note to duplicate (using storeNotes which is the actual notes array)
      const noteToDuplicate = storeNotes.find(n => n.id === noteId)
      const noteTitle = noteToDuplicate?.title?.map(t => t.text).join('') || intl.formatMessage({ id: 'modules.notes.leftSidebar.untitled' })
      
      console.log('🔄 Duplicating note from sidebar:', noteId)
      console.log('Request data:', {
        title: `${noteTitle} Copy`,
        includeSubNotes: true,
        parentId: parentId
      })
      
      // Call the API with the required schema
      const duplicatedNote = await notesApi.duplicateNote(
        currentWorkspace.id,
        noteId,
        {
          title: `${noteTitle} Copy`,
          includeSubNotes: true,
          parentId: parentId
        }
      )
      
      console.log('✅ Duplicate API successful:', duplicatedNote)
      
      // Convert API response to local Note format
      const localNote: Note = {
        id: duplicatedNote.id,
        workspaceId: currentWorkspace.id,
        title: [{ text: duplicatedNote.title }],
        icon: { type: 'emoji', value: '📄' },
        content: [{
          id: `block-${Date.now()}`,
          type: 'html' as const,
          content: [{
            html: duplicatedNote.content || '<p></p>'
          }],
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        children: [],
        parentId: parentId,
        properties: {},
        // Handle both camelCase and snake_case from API
        createdAt: new Date(duplicatedNote.createdAt || duplicatedNote.created_at || new Date()),
        updatedAt: new Date(duplicatedNote.updatedAt || duplicatedNote.updated_at || new Date()),
        createdBy: duplicatedNote.createdBy || duplicatedNote.created_by || '',
        lastEditedBy: duplicatedNote.lastEditedBy || duplicatedNote.last_edited_by || duplicatedNote.createdBy || duplicatedNote.created_by || '',
        isDeleted: false,
        isArchived: !!(duplicatedNote as any).archived_at,  // Check archived_at field
        archivedAt: (duplicatedNote as any).archived_at || undefined,
        isFavorite: duplicatedNote.isStarred || duplicatedNote.is_favorite || false,
        permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
        tags: duplicatedNote.tags || [],
        version: 1,
        lastSavedAt: new Date(),
        // Preserve enriched fields from backend API
        author_id: duplicatedNote.author_id,
        author: duplicatedNote.author,
        collaborators: duplicatedNote.collaborators,
        collaborative_data: duplicatedNote.collaborative_data
      }

      // Add to store
      addNote(localNote)
      
      // Refetch notes to ensure sync with backend and update the sidebar
      await refetchNotes()
      
      // Also invalidate React Query cache for any components using it
      await queryClient.invalidateQueries({ 
        queryKey: notesKeys.list(currentWorkspace.id) 
      })
      
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.success' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.noteDuplicated' }),
      })
      
      // Redirect to notes list
      navigate(`/workspaces/${currentWorkspace.id}/notes`)
    } catch (error) {
      console.error('❌ Failed to duplicate note:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.failedDuplicate' }),
        variant: 'destructive',
      })
    }
  }
  
  const handleToggleFavorite = async (noteId: string, isFavorite: boolean) => {
    if (!currentWorkspace) return

    try {
      // Call PATCH API with workspaceId (backend uses is_favorite field)
      await notesApi.updateNote(currentWorkspace.id, noteId, {
        is_favorite: isFavorite
      } as any)

      // Refetch notes to ensure sync with backend
      await refetchNotes()

      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.success' }),
        description: isFavorite ? intl.formatMessage({ id: 'modules.notes.leftSidebar.addedToFavorites' }) : intl.formatMessage({ id: 'modules.notes.leftSidebar.removedFromFavorites' }),
      })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.failedToggleFavorite' }),
        variant: 'destructive',
      })
    }
  }
  
  const handleArchiveNote = async (noteId: string) => {
    if (!currentWorkspace) return

    try {
      // Call archive API with workspaceId
      await notesApi.archiveNote(currentWorkspace.id, noteId)

      // Update local state with archived status and timestamp
      updateNote(noteId, { 
        isArchived: true,
        archivedAt: new Date().toISOString()
      })
      
      // Refetch notes to ensure sync with backend
      await refetchNotes()

      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.success' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.noteArchived' }),
      })
    } catch (error) {
      console.error('Failed to archive note:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.failedArchive' }),
        variant: 'destructive',
      })
    }
  }

  const handleUnarchiveNote = async (noteId: string) => {
    if (!currentWorkspace) return

    try {
      // Call unarchive API with workspaceId
      await notesApi.unarchiveNote(currentWorkspace.id, noteId)

      // Update local state - remove archived status and timestamp
      updateNote(noteId, {
        isArchived: false,
        archivedAt: undefined
      })

      // Refetch notes to ensure sync with backend
      await refetchNotes()

      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.success' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.noteUnarchived' }),
      })
    } catch (error) {
      console.error('Failed to unarchive note:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.leftSidebar.error' }),
        description: intl.formatMessage({ id: 'modules.notes.leftSidebar.failedUnarchive' }),
        variant: 'destructive',
      })
    }
  }

  const handleShareNote = (noteId: string) => {
    // Use the store's triggerShareNote to open the share modal
    triggerShareNote(noteId)
  }

  // Get filtered note lists
  const nonDeletedNotes = notesData.filter(note => !note.isDeleted)
  const favoriteNotes = notesData.filter(note => note.isFavorite && !note.isDeleted && !note.isArchived)
  const allNotesExcludingFavorites = notesData.filter(note => !note.isDeleted && !note.isArchived && !note.isFavorite)
  const recentNotes = notesData
    .filter(note => !note.isDeleted && !note.isArchived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5) // Show only 5 most recent notes
  const archivedNotes = notesData.filter(note => note.isArchived && !note.isDeleted)
  const deletedNotes = notesData.filter(note => note.isDeleted)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search Section */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input
            placeholder={intl.formatMessage({ id: "modules.notes.leftSidebar.searchPlaceholder" })}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 text-sm h-8 bg-muted/30 border-muted focus:bg-background transition-colors"
          />
        </div>
        
        {/* Bulk Actions Section */}
        {selectedNotes.length > 0 && (
          <div className="mt-3 p-2 bg-muted/30 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {selectedNotes.length} {intl.formatMessage({ id: "modules.notes.leftSidebar.selected" })}
              </span>
              <button
                onClick={() => clearSelectedNotes()}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {intl.formatMessage({ id: 'modules.notes.leftSidebar.clear' })}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  // Trigger merge in parent component
                  const event = new CustomEvent('bulkActionFromSidebar', {
                    detail: { action: 'merge', selectedNotes }
                  })
                  window.dispatchEvent(event)
                }}
                disabled={selectedNotes.length < 2}
              >
                <GitMerge className="h-3 w-3 mr-1" />
                {intl.formatMessage({ id: 'modules.notes.leftSidebar.merge' })}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  const event = new CustomEvent('bulkActionFromSidebar', {
                    detail: { action: 'favorite', selectedNotes }
                  })
                  window.dispatchEvent(event)
                }}
              >
                <Star className="h-3 w-3 mr-1" />
                {intl.formatMessage({ id: 'modules.notes.leftSidebar.favorite' })}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  const event = new CustomEvent('bulkActionFromSidebar', {
                    detail: { action: 'archive', selectedNotes }
                  })
                  window.dispatchEvent(event)
                }}
              >
                <Archive className="h-3 w-3 mr-1" />
                {intl.formatMessage({ id: 'modules.notes.leftSidebar.archive' })}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-600"
                onClick={() => {
                  const event = new CustomEvent('bulkActionFromSidebar', {
                    detail: { action: 'delete', selectedNotes }
                  })
                  window.dispatchEvent(event)
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {intl.formatMessage({ id: 'modules.notes.leftSidebar.delete' })}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-2 pb-2 space-y-3">
        {isLoadingNotes ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.notes.leftSidebar.loadingNotes' })}</p>
          </div>
        ) : searchQuery ? (
          <div className="p-2 rounded-lg bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-blue-800 dark:text-blue-200 tracking-wide flex items-center gap-2">
                <Search className="h-3 w-3" />
                {intl.formatMessage({ id: 'modules.notes.leftSidebar.searchResults' })}
              </h3>
              {!isSearching && (
                <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  {searchResults.length}
                </Badge>
              )}
              {isSearching && (
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">{intl.formatMessage({ id: 'modules.notes.leftSidebar.searching' })}</span>
                </div>
              )}
            </div>

            {isSearching ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 animate-pulse">
                    <div className="h-4 w-4 bg-blue-200/50 dark:bg-blue-800/30 rounded" />
                    <div className="flex-1 h-4 bg-blue-200/50 dark:bg-blue-800/30 rounded" style={{ width: `${70 + i * 10}%` }} />
                  </div>
                ))}
              </div>
            ) : (
              <NotesTree
                notes={searchResults}
                allNotes={searchResults}
                onCreateNote={handleCreateNote}
                onDeleteNote={handleDeleteNote}
                onRestoreNote={handleRestoreNote}
                onPermanentDelete={handlePermanentDelete}
                onDuplicateNote={handleDuplicateNote}
                onShareNote={handleShareNote}
                onToggleFavorite={handleToggleFavorite}
                onArchiveNote={handleArchiveNote}
                onUnarchiveNote={handleUnarchiveNote}
                selectedNotes={selectedNotes}
                onNoteSelectionChange={toggleNoteSelection}
              />
            )}
          </div>
        ) : (
          <>
            {/* Favorites */}
            {favoriteNotes.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-amber-50/80 to-yellow-50/80 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200/40 dark:border-amber-800/40 shadow-sm hover:shadow-md transition-all duration-200">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20 rounded-xl transition-colors duration-200"
                  onClick={() => toggleSection('favorites')}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6">
                      {expandedSections.has('favorites') ? (
                        <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-600 dark:text-amber-400 fill-current" />
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 tracking-wide">{intl.formatMessage({ id: 'modules.notes.leftSidebar.favorites' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-8 h-6 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-200">{favoriteNotes.length}</span>
                  </div>
                </div>
                {expandedSections.has('favorites') && (
                  <div className="px-3 pb-3">
                    <NotesTree
                      notes={nonDeletedNotes}
                      allNotes={nonDeletedNotes}
                      onCreateNote={handleCreateNote}
                      onDeleteNote={handleDeleteNote}
                      onRestoreNote={handleRestoreNote}
                      onPermanentDelete={handlePermanentDelete}
                      onDuplicateNote={handleDuplicateNote}
                      onShareNote={handleShareNote}
                      onToggleFavorite={handleToggleFavorite}
                      onArchiveNote={handleArchiveNote}
                      onUnarchiveNote={handleUnarchiveNote}
                      selectedNotes={selectedNotes}
                      onNoteSelectionChange={toggleNoteSelection}
                      filterFavorites={true}
                      filterArchived={false}
                      filterDeleted={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* All Notes */}
            <div className="rounded-xl bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/40 dark:border-green-800/40 shadow-sm hover:shadow-md transition-all duration-200">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-green-50/50 dark:hover:bg-green-950/20 rounded-xl transition-colors duration-200"
                onClick={() => toggleSection('all-notes')}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    {expandedSections.has('all-notes') ? (
                      <ChevronDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-semibold text-green-800 dark:text-green-200 tracking-wide">{intl.formatMessage({ id: 'modules.notes.leftSidebar.allNotes' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">

                  <div className="flex items-center justify-center w-8 h-6 bg-green-100 dark:bg-green-900/50 rounded-full">
                    <span className="text-xs font-bold text-green-800 dark:text-green-200">
                      {nonDeletedNotes.filter(n => !n.isArchived).length}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted"
                    title="Import file"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Dispatch event to open import modal (handled by NotesView)
                      window.dispatchEvent(new CustomEvent('notesImportFile'))
                    }}
                  >
                    <Upload className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted"
                    title="New note"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCreateNote()
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>

                </div>
              </div>
              {expandedSections.has('all-notes') && (
                <div className="px-3 pb-3">
                  <NotesTree
                    notes={nonDeletedNotes}
                    allNotes={nonDeletedNotes}
                    onCreateNote={handleCreateNote}
                    onDeleteNote={handleDeleteNote}
                    onRestoreNote={handleRestoreNote}
                    onPermanentDelete={handlePermanentDelete}
                    onDuplicateNote={handleDuplicateNote}
                    onShareNote={handleShareNote}
                    onToggleFavorite={handleToggleFavorite}
                    onArchiveNote={handleArchiveNote}
                    onUnarchiveNote={handleUnarchiveNote}
                    selectedNotes={selectedNotes}
                    onNoteSelectionChange={toggleNoteSelection}
                    filterArchived={false}
                    filterDeleted={false}
                  />
                </div>
              )}
            </div>

            {/* Recent Notes */}
            {recentNotes.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200/40 dark:border-blue-800/40 shadow-sm hover:shadow-md transition-all duration-200">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-xl transition-colors duration-200"
                  onClick={() => toggleSection('recent')}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6">
                      {expandedSections.has('recent') ? (
                        <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-200 tracking-wide">{intl.formatMessage({ id: 'modules.notes.leftSidebar.recent' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-8 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-200">{recentNotes.length}</span>
                  </div>
                </div>
                {expandedSections.has('recent') && (
                  <div className="px-3 pb-3">
                    <NotesTree
                      notes={recentNotes}
                      allNotes={notesData}
                      parentId={undefined}
                      onCreateNote={handleCreateNote}
                      onDeleteNote={handleDeleteNote}
                      onRestoreNote={handleRestoreNote}
                      onPermanentDelete={handlePermanentDelete}
                      onDuplicateNote={handleDuplicateNote}
                      onShareNote={handleShareNote}
                      onToggleFavorite={handleToggleFavorite}
                      onArchiveNote={handleArchiveNote}
                      onUnarchiveNote={handleUnarchiveNote}
                      selectedNotes={selectedNotes}
                      onNoteSelectionChange={toggleNoteSelection}
                      filterDeleted={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Archived */}
            {archivedNotes.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/40 dark:border-blue-800/40 shadow-sm hover:shadow-md transition-all duration-200">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 rounded-xl transition-colors duration-200"
                  onClick={() => toggleSection('archived')}
                >
                  <div className="flex items-center gap-3">
                    <div className="transition-transform duration-200">
                      {expandedSections.has('archived') ? (
                        <ChevronDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-semibold text-purple-800 dark:text-purple-200 tracking-wide">{intl.formatMessage({ id: 'modules.notes.leftSidebar.archived' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-8 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                    <span className="text-xs font-bold text-purple-800 dark:text-purple-200">{archivedNotes.length}</span>
                  </div>
                </div>
                {expandedSections.has('archived') && (
                  <div className="px-3 pb-3">
                    <NotesTree
                      notes={archivedNotes}
                      allNotes={notesData}
                      parentId={undefined}
                      onCreateNote={handleCreateNote}
                      onDeleteNote={handleDeleteNote}
                      onRestoreNote={handleRestoreNote}
                      onPermanentDelete={handlePermanentDelete}
                      onDuplicateNote={handleDuplicateNote}
                      onShareNote={handleShareNote}
                      onToggleFavorite={handleToggleFavorite}
                      onArchiveNote={handleArchiveNote}
                      onUnarchiveNote={handleUnarchiveNote}
                      selectedNotes={selectedNotes}
                      onNoteSelectionChange={toggleNoteSelection}
                      filterArchived={true}
                      filterDeleted={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Trash */}
            {deletedNotes.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-red-50/80 to-rose-50/80 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200/40 dark:border-red-800/40 shadow-sm hover:shadow-md transition-all duration-200">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl transition-colors duration-200"
                  onClick={() => toggleSection('trash')}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6">
                      {expandedSections.has('trash') ? (
                        <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-semibold text-red-800 dark:text-red-200 tracking-wide">{intl.formatMessage({ id: 'modules.notes.leftSidebar.trash' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-8 h-6 bg-red-100 dark:bg-red-900/50 rounded-full">
                    <span className="text-xs font-bold text-red-800 dark:text-red-200">{deletedNotes.length}</span>
                  </div>
                </div>
                {expandedSections.has('trash') && (
                  <div className="px-3 pb-3">
                    <NotesTree
                      notes={notesData}
                      allNotes={notesData}
                      onCreateNote={handleCreateNote}
                      onDeleteNote={handleDeleteNote}
                      onRestoreNote={handleRestoreNote}
                      onPermanentDelete={handlePermanentDelete}
                      onDuplicateNote={handleDuplicateNote}
                      onShareNote={handleShareNote}
                      onToggleFavorite={handleToggleFavorite}
                      onArchiveNote={handleArchiveNote}
                      onUnarchiveNote={handleUnarchiveNote}
                      selectedNotes={selectedNotes}
                      onNoteSelectionChange={toggleNoteSelection}
                      filterDeleted={true}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}