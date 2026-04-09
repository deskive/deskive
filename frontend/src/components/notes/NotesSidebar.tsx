import { useState, useEffect } from 'react'
import { useNotesStore } from '../../stores/notesStore'
import type { Note } from '../../types/notes'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import { Checkbox } from '../ui/checkbox'
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Star,
  Archive,
  Trash2,
  Copy,
  Share,
  Plus,
  Search,
  Undo2,
  FileText,
  TreePine,
  List,
  Grid3X3
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface NotesSidebarProps {
  notes: Note[]
  selectedNoteId?: string
  onSelectNote: (noteId: string) => void
  onCreateNote: (title?: string, parentId?: string) => void
  onToggleNoteSelection: (noteId: string) => void
  selectedNotes: string[]
  viewMode: 'list' | 'grid' | 'tree'
  onViewModeChange: (mode: 'list' | 'grid' | 'tree') => void
}

interface NotesTreeProps {
  notes: Note[]
  allNotes?: Note[]
  level?: number
  parentId?: string
  onCreateNote?: (parentId?: string) => void
  onDeleteNote?: (noteId: string) => void
  onRestoreNote?: (noteId: string) => void
  onDuplicateNote?: (noteId: string, parentId?: string) => void
  onToggleFavorite?: (noteId: string, isFavorite: boolean) => void
  onShare?: (noteId: string) => void
  selectedNotes: string[]
  onNoteSelectionChange: (noteId: string, isSelected: boolean) => void
  showAllNotes?: boolean
  selectedNoteId?: string
  onSelectNote: (noteId: string) => void
}

function NotesTree({ 
  notes, 
  allNotes, 
  level = 0, 
  parentId, 
  onCreateNote, 
  onDeleteNote, 
  onRestoreNote, 
  onDuplicateNote, 
  onToggleFavorite,
  onShare,
  selectedNotes, 
  onNoteSelectionChange, 
  showAllNotes = false,
  selectedNoteId,
  onSelectNote
}: NotesTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))

  const notesSource = allNotes || notes
  
  const getNoteById = (noteId: string) => notesSource.find(note => note.id === noteId)
  const getChildren = (noteId: string) => notesSource.filter(note => note.parentId === noteId)
  
  const isMaxNestingReached = (noteId: string): boolean => {
    let currentNote = getNoteById(noteId)
    let depth = 0
    
    while (currentNote?.parentId) {
      depth++
      currentNote = getNoteById(currentNote.parentId)
    }
    
    return depth >= 2
  }

  const filteredNotes = notes.filter(note => {
    if (showAllNotes) {
      return true
    }
    if (parentId) {
      return note.parentId === parentId
    }
    return !note.parentId
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

  const handleNoteAction = async (noteId: string, action: string) => {
    const note = notes.find((n: Note) => n.id === noteId)
    if (!note) return

    switch (action) {
      case 'favorite':
        onToggleFavorite?.(noteId, !note.isFavorite)
        break
      case 'archive':
        console.log('Archive note:', noteId)
        break
      case 'delete':
        onDeleteNote?.(noteId)
        break
      case 'restore':
        onRestoreNote?.(noteId)
        break
      case 'duplicate':
        onDuplicateNote?.(noteId, note.parentId)
        break
      case 'share':
        onShare?.(noteId)
        break
    }
  }

  const renderNoteItem = (note: Note) => {
    const children = getChildren(note.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(note.id)
    const titleText = note.title?.map(rt => rt.text).join('') || 'Untitled'
    const canHaveChildren = !isMaxNestingReached(note.id)
    const isSelected = selectedNotes.includes(note.id)

    return (
      <div key={note.id}>
        <div
          className={cn(
            "group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent/50 cursor-pointer transition-colors",
            selectedNoteId === note.id && "bg-accent",
            note.isDeleted && "opacity-50"
          )}
          style={{ marginLeft: `${level * 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(note.id)
              }}
              className="p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? 
                <ChevronDown className="h-3 w-3" /> : 
                <ChevronRight className="h-3 w-3" />
              }
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onNoteSelectionChange(note.id, !isSelected)}
            className="h-3 w-3"
            onClick={(e) => e.stopPropagation()}
          />

          <div
            className="flex-1 flex items-center gap-2 min-w-0"
            onClick={() => onSelectNote(note.id)}
          >
            {note.icon && (
              <span className="text-base flex-shrink-0">
                {note.icon.value}
              </span>
            )}
            <span className="text-sm truncate">
              {titleText}
            </span>
            {note.isFavorite && (
              <Star className="h-3 w-3 fill-current text-yellow-500 flex-shrink-0" />
            )}
            {note.isArchived && (
              <Archive className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canHaveChildren && !note.isDeleted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateNote?.(note.id)
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!note.isDeleted && (
                  <>
                    <DropdownMenuItem onClick={() => handleNoteAction(note.id, 'favorite')}>
                      <Star className="h-4 w-4 mr-2" />
                      {note.isFavorite ? 'Unfavorite' : 'Favorite'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNoteAction(note.id, 'duplicate')}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNoteAction(note.id, 'share')}>
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNoteAction(note.id, 'archive')}>
                      <Archive className="h-4 w-4 mr-2" />
                      {note.isArchived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                  </>
                )}
                {note.isDeleted ? (
                  <>
                    <DropdownMenuItem onClick={() => handleNoteAction(note.id, 'restore')}>
                      <Undo2 className="h-4 w-4 mr-2" />
                      Restore
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleNoteAction(note.id, 'delete')}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem 
                    onClick={() => handleNoteAction(note.id, 'delete')}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Move to Trash
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <NotesTree
            notes={children}
            allNotes={notesSource}
            level={level + 1}
            parentId={note.id}
            onCreateNote={onCreateNote}
            onDeleteNote={onDeleteNote}
            onRestoreNote={onRestoreNote}
            onDuplicateNote={onDuplicateNote}
            onToggleFavorite={onToggleFavorite}
            onShare={onShare}
            selectedNotes={selectedNotes}
            onNoteSelectionChange={onNoteSelectionChange}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {filteredNotes.map(renderNoteItem)}
    </div>
  )
}

export function NotesSidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onToggleNoteSelection,
  selectedNotes,
  viewMode,
  onViewModeChange
}: NotesSidebarProps) {
  const { filter, setFilter } = useNotesStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Filter notes based on search
  const filteredNotes = notes.filter(note => {
    if (searchQuery) {
      const titleText = note.title?.map(rt => rt.text).join('').toLowerCase() || ''
      return titleText.includes(searchQuery.toLowerCase())
    }
    return true
  })

  // Separate notes by status
  const activeNotes = filteredNotes.filter(note => !note.isDeleted && !note.isArchived)
  const archivedNotes = filteredNotes.filter(note => note.isArchived && !note.isDeleted)
  const deletedNotes = filteredNotes.filter(note => note.isDeleted)

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Notes</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="h-8 w-8 p-0"
            >
              <Search className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {viewMode === 'tree' && <TreePine className="h-4 w-4" />}
                  {viewMode === 'list' && <List className="h-4 w-4" />}
                  {viewMode === 'grid' && <Grid3X3 className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewModeChange('tree')}>
                  <TreePine className="h-4 w-4 mr-2" />
                  Tree View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewModeChange('list')}>
                  <List className="h-4 w-4 mr-2" />
                  List View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewModeChange('grid')}>
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grid View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {showSearch && (
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
          />
        )}

        <Button
          onClick={() => onCreateNote()}
          className="w-full btn-gradient-primary border-0"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Active Notes */}
        {activeNotes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              Notes
            </h3>
            <NotesTree
              notes={activeNotes}
              onCreateNote={(parentId) => onCreateNote('', parentId)}
              selectedNotes={selectedNotes}
              onNoteSelectionChange={(noteId, isSelected) => {
                onToggleNoteSelection(noteId)
              }}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
            />
          </div>
        )}

        {/* Archived Notes */}
        {filter.isArchived && archivedNotes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              Archived
            </h3>
            <NotesTree
              notes={archivedNotes}
              selectedNotes={selectedNotes}
              onNoteSelectionChange={(noteId, isSelected) => {
                onToggleNoteSelection(noteId)
              }}
              showAllNotes
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
            />
          </div>
        )}

        {/* Deleted Notes */}
        {filter.isDeleted && deletedNotes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              Trash
            </h3>
            <NotesTree
              notes={deletedNotes}
              selectedNotes={selectedNotes}
              onNoteSelectionChange={(noteId, isSelected) => {
                onToggleNoteSelection(noteId)
              }}
              showAllNotes
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
            />
          </div>
        )}

        {/* Empty State */}
        {activeNotes.length === 0 && !filter.isArchived && !filter.isDeleted && (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Create your first note to get started</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t">
        <div className="flex items-center gap-1">
          <Button
            variant={filter.isArchived ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter({ ...filter, isArchived: !filter.isArchived })}
            className="flex-1 justify-start"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived
          </Button>
          <Button
            variant={filter.isDeleted ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter({ ...filter, isDeleted: !filter.isDeleted })}
            className="flex-1 justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Trash
          </Button>
        </div>
      </div>
    </div>
  )
}