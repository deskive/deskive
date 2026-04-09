import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { useNotesStore } from '../../stores/notesStore'
import { NotionStyleNoteEditor } from './NotionStyleNoteEditor'
import { NotionStyleNoteCreator } from './NotionStyleNoteCreator'
import { FileImportModal } from './FileImportModal'
import { BulkActionsToolbar } from './BulkActionsToolbar'
import { MergeNotesDialog } from './MergeNotesDialog'
import { NotesShareModal } from './NotesShareModal'
import { FilePreviewDialog } from '../files/FileOperationDialogs'
import { EventPreviewDialog } from '../calendar/EventPreviewDialog'
import { Button } from '../ui/button'
import type { Note } from '../../types/notes'
import type { FileItem } from '../../types'
import type { CalendarEventAPI } from '../../types/calendar'
import {
  Plus,
  FileText,
  Upload
} from 'lucide-react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { notesApi, notesKeys } from '../../lib/api/notes-api'
import { fileApi } from '../../lib/api/files-api'
import { calendarApi } from '../../lib/api/calendar-api'
import { useToast } from '../ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'

interface NotesViewProps {
  sidebarCreateRequest?: { parentId?: string } | null
  onSidebarCreateHandled?: () => void
}

export function NotesView({ sidebarCreateRequest, onSidebarCreateHandled }: NotesViewProps = {}) {
  const intl = useIntl()
  const { currentWorkspace } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { noteId } = useParams()
  const queryClient = useQueryClient()

  // UI State from Zustand store
  const {
    notes,
    ui,
    filter,
    sortBy,
    selectedNotes,
    searchQuery,
    setNotes,
    updateNote,
    addNote,
    deleteNote: removeNote,
    duplicateNote: localDuplicateNote, // Renamed to avoid using local duplicate function
    selectNote,
    clearSelection,
    setFilter,
    setSortBy,
    setViewMode,
    toggleNoteSelection,
    clearSelectedNotes,
    setSearchQuery,
    setConnectionStatus,
    createNoteRequest,
    clearCreateNoteRequest,
    shareNoteRequest,
    clearShareNoteRequest,
    recentlyDeletedNoteIds
  } = useNotesStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const [isFetchingNote, setIsFetchingNote] = useState(false)

  // Ref to prevent infinite loop between URL and store sync
  const isSyncingRef = useRef(false)

  const [showInlineCreator, setShowInlineCreator] = useState(false)
  const [creatorParentId, setCreatorParentId] = useState<string | undefined>(undefined)
  const [isFileImportOpen, setIsFileImportOpen] = useState(false)
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false)
  const [isFilePreviewLoading, setIsFilePreviewLoading] = useState(false)
  const [previewEvent, setPreviewEvent] = useState<CalendarEventAPI | null>(null)
  const [isEventPreviewOpen, setIsEventPreviewOpen] = useState(false)
  const [isEventPreviewLoading, setIsEventPreviewLoading] = useState(false)

  // Utility functions for notes data
  const getNoteById = (noteId: string) => notes.find((note: Note) => note.id === noteId)
  const selectedNote = ui.selectedNoteId ? getNoteById(ui.selectedNoteId) : null

  const handleBulkAction = async (action: 'delete' | 'archive' | 'unarchive' | 'merge' | 'favorite' | 'unfavorite' | 'restore') => {
    if (selectedNotes.length === 0 || !currentWorkspace) return

    try {
      switch (action) {
        case 'delete':
          // Check if these are deleted notes (permanent delete) or regular notes (move to trash)
          const selectedNotesData = selectedNotes.map(id => getNoteById(id)).filter(Boolean) as Note[]
          const areDeletedNotes = selectedNotesData.every(note => note.isDeleted)
          
          if (areDeletedNotes) {
            // Check if currently selected note is being permanently deleted
            const shouldRedirect = ui.selectedNoteId && selectedNotes.includes(ui.selectedNoteId)
            
            // Permanent delete - call individual permanent delete API for each note
            await Promise.all(
              selectedNotes.map(noteId => 
                notesApi.permanentDeleteNote(currentWorkspace.id, noteId)
              )
            )
            // Remove from store
            selectedNotes.forEach(noteId => {
              removeNote(noteId)
            })
            
            // Redirect to notes list if currently selected note was permanently deleted
            if (shouldRedirect) {
              clearSelection()
              navigate(`/workspaces/${currentWorkspace.id}/notes`, { replace: true })
            }
          } else {
            // Move to trash - call bulk delete API
            await notesApi.bulkDeleteNotes(currentWorkspace.id, selectedNotes)
            // Update store to mark as deleted
            selectedNotes.forEach(noteId => {
              updateNote(noteId, { isDeleted: true })
            })
          }
          clearSelectedNotes()
          toast({
            title: 'Success',
            description: areDeletedNotes 
              ? `${selectedNotes.length} notes permanently deleted`
              : `${selectedNotes.length} notes moved to trash`,
          })
          break
          
        case 'archive':
          try {
            // Call bulk archive API
            await notesApi.bulkArchiveNotes(currentWorkspace.id, selectedNotes)
            
            // Update local state with archived status and timestamp
            const archivedAt = new Date().toISOString()
            selectedNotes.forEach(noteId => {
              updateNote(noteId, { 
                isArchived: true,
                archivedAt
              })
            })
            
            // Clear selection
            clearSelectedNotes()
            
            // Invalidate queries to refresh the list
            await queryClient.invalidateQueries({ 
              queryKey: notesKeys.list(currentWorkspace.id) 
            })
            
            toast({
              title: 'Success',
              description: `${selectedNotes.length} notes archived`,
            })
          } catch (error) {
            console.error('Failed to archive notes:', error)
            toast({
              title: 'Error',
              description: 'Failed to archive notes. Please try again.',
              variant: 'destructive',
            })
          }
          break
          
        case 'unarchive':
          try {
            // Call bulk unarchive API
            await notesApi.bulkUnarchiveNotes(currentWorkspace.id, selectedNotes)
            
            // Update local state - remove archived status and timestamp
            selectedNotes.forEach(noteId => {
              updateNote(noteId, { 
                isArchived: false,
                archivedAt: undefined
              })
            })
            
            // Clear selection
            clearSelectedNotes()
            
            // Invalidate queries to refresh the list
            await queryClient.invalidateQueries({ 
              queryKey: notesKeys.list(currentWorkspace.id) 
            })
            
            // Trigger custom event to refresh sidebar
            window.dispatchEvent(new CustomEvent('notesRefresh'))
            
            toast({
              title: 'Success',
              description: `${selectedNotes.length} notes unarchived`,
            })
          } catch (error) {
            console.error('Failed to unarchive notes:', error)
            toast({
              title: 'Error',
              description: 'Failed to unarchive notes. Please try again.',
              variant: 'destructive',
            })
          }
          break
          
        case 'favorite':
          selectedNotes.forEach(noteId => {
            updateNote(noteId, { isFavorite: true })
          })
          clearSelectedNotes()
          toast({
            title: 'Success',
            description: `${selectedNotes.length} notes added to favorites`,
          })
          break
          
        case 'unfavorite':
          selectedNotes.forEach(noteId => {
            updateNote(noteId, { isFavorite: false })
          })
          clearSelectedNotes()
          toast({
            title: 'Success',
            description: `${selectedNotes.length} notes removed from favorites`,
          })
          break
          
        case 'restore':
          // Call bulk restore API
          await notesApi.bulkRestoreNotes(currentWorkspace.id, selectedNotes)
          selectedNotes.forEach(noteId => {
            updateNote(noteId, { isDeleted: false })
          })
          clearSelectedNotes()
          toast({
            title: 'Success',
            description: `${selectedNotes.length} notes restored`,
          })
          break
          
        case 'merge':
          if (selectedNotes.length >= 2) {
            setIsMergeDialogOpen(true)
          }
          break
      }
    } catch (error) {
      console.error(`Failed to ${action} notes:`, error)
      toast({
        title: 'Error',
        description: `Failed to ${action} notes. Please try again.`,
        variant: 'destructive',
      })
    }
  }

  const handleMergeNotes = async (mergeTitle: string, options: {
    includeHeaders: boolean
    includeDividers: boolean
    sortByDate: boolean
  }) => {
    if (!currentWorkspace) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      })
      return
    }

    try {
      // Get selected notes
      const notesToMerge = selectedNotes.map(id => notes.find(n => n.id === id)).filter(Boolean) as Note[]

      if (notesToMerge.length < 2) {
        toast({
          title: 'Error',
          description: 'Need at least 2 notes to merge',
          variant: 'destructive',
        })
        return
      }

      // Close modal
      setIsMergeDialogOpen(false)

      // Create the merged note title
      const finalTitle = mergeTitle.trim() ||
        (notesToMerge.length > 3
          ? `Merged Note (${notesToMerge.length} notes)`
          : notesToMerge.map(n => n.title?.map(rt => rt.text).join('') || 'Untitled').join(' + ')
        )

      // Call the merge API
      const mergeResponse = await notesApi.mergeNotes(currentWorkspace.id, {
        note_ids: selectedNotes,
        title: finalTitle,
        include_headers: options.includeHeaders,
        add_dividers: options.includeDividers,
        sort_by_date: options.sortByDate,
      })

      // Convert API response to local Note format
      const mergedNote: Note = {
        id: mergeResponse.id,
        workspaceId: currentWorkspace.id,
        title: [{ text: mergeResponse.title }],
        icon: { type: 'emoji', value: '📑' },
        content: [{
          id: `block-${Date.now()}`,
          type: 'html' as const,
          content: [{
            html: mergeResponse.content || '<p></p>'
          }],
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        children: [],
        properties: {},
        createdAt: new Date(mergeResponse.created_at),
        updatedAt: new Date(mergeResponse.created_at),
        createdBy: 'user-1',
        lastEditedBy: 'user-1',
        isDeleted: false,
        isArchived: false,
        isFavorite: false,
        permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
        tags: [],
        version: 1,
        lastSavedAt: new Date()
      }

      // Add the merged note to store
      addNote(mergedNote)

      // Clear selection
      clearSelectedNotes()

      // Select the new merged note
      selectNote(mergedNote.id)

      toast({
        title: 'Success',
        description: `Successfully merged ${selectedNotes.length} notes`,
      })

      // URL navigation will happen automatically via useEffect
    } catch (error) {
      console.error('Failed to merge notes:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to merge notes. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateNote = async (title?: string, parentId?: string) => {
    if (!currentWorkspace) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsLoading(true)

      // Call the API to create a new note
      const newNote = await notesApi.createNote(currentWorkspace.id, {
        title: title || 'Untitled Note',
        content: '<p></p>',
        tags: [],
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
        createdAt: new Date(newNote.created_at || newNote.createdAt),
        updatedAt: new Date(newNote.updated_at || newNote.updatedAt),
        createdBy: newNote.created_by || newNote.createdBy,
        lastEditedBy: newNote.last_edited_by || newNote.lastEditedBy || newNote.created_by || newNote.createdBy,
        isDeleted: !!newNote.deleted_at,
        isArchived: !!newNote.archived_at,
        isFavorite: newNote.is_favorite || newNote.isStarred,
        permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
        tags: newNote.tags || [],
        version: 1,
        lastSavedAt: new Date(),
        // Preserve backend fields
        author_id: newNote.author_id,
        created_by: newNote.created_by,
        last_edited_by: newNote.last_edited_by,
        collaborative_data: newNote.collaborative_data,
        // Enriched user data
        author: newNote.author,
        collaborators: newNote.collaborators
      }

      // Add to store and select it
      addNote(localNote)
      selectNote(newNote.id)
      // URL navigation will happen automatically via useEffect

      toast({
        title: 'Success',
        description: 'Note created successfully',
      })
    } catch (error) {
      console.error('Failed to create note:', error)
      toast({
        title: 'Error',
        description: 'Failed to create note. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNoteCreated = (noteId: string, noteData: Partial<Note>) => {
    const newNote: Note = {
      id: noteId,
      title: noteData.title || [{ text: 'Untitled Note' }],
      icon: noteData.icon || { type: 'emoji', value: '📄' },
      content: noteData.content || [],
      children: [],
      parentId: noteData.parentId,
      properties: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      lastEditedBy: 'user-1',
      isDeleted: false,
      isArchived: false,
      isFavorite: false,
      permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
      tags: noteData.tags || [],
      version: 1,
      lastSavedAt: new Date()
    }

    addNote(newNote)
    selectNote(noteId)
    // URL navigation will happen automatically via useEffect

    setShowInlineCreator(false)
    setCreatorParentId(undefined)
  }

  const handlePermanentDelete = async () => {
    try {
      const noteToDelete = getNoteById(ui.selectedNoteId!)
      if (noteToDelete && noteToDelete.isDeleted) {
        removeNote(ui.selectedNoteId!)
        clearSelection()
        // URL navigation will happen automatically via useEffect
      }
    } catch (error) {
      console.error('Failed to permanently delete note:', error)
    }
  }

  const handleRestore = async () => {
    try {
      if (ui.selectedNoteId) {
        updateNote(ui.selectedNoteId, { isDeleted: false })
      }
    } catch (error) {
      console.error('Failed to restore note:', error)
    }
  }

  const handleDuplicate = async () => {
    console.log('🔄 handleDuplicate function called!')
    console.log('Current workspace:', currentWorkspace)
    console.log('Selected note ID:', ui.selectedNoteId)
    console.log('Notes array length:', notes.length)

    if (!currentWorkspace) {
      console.log('❌ No workspace selected')
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      })
      return
    }

    if (!ui.selectedNoteId) {
      console.log('❌ No note selected')
      toast({
        title: 'Error',
        description: 'No note selected',
        variant: 'destructive',
      })
      return
    }

    try {
      // Get the current note to get its title
      const currentNote = notes.find(n => n.id === ui.selectedNoteId)
      console.log('Current note found:', !!currentNote)
      const currentTitle = currentNote?.title?.map(t => t.text).join('') || 'Untitled'
      console.log('Current title:', currentTitle)
      
      const requestData = {
        title: `${currentTitle} Copy`,
        includeSubNotes: true,
        parentId: currentNote?.parentId || undefined
      }
      
      console.log('🚀 About to call notesApi.duplicateNote...')
      console.log('Workspace ID:', currentWorkspace.id)
      console.log('Note ID:', ui.selectedNoteId) 
      console.log('Request data:', requestData)
      
      // Call the API with the required schema
      const duplicatedNote = await notesApi.duplicateNote(
        currentWorkspace.id, 
        ui.selectedNoteId,
        {
          title: `${currentTitle} Copy`,
          includeSubNotes: true,
          parentId: currentNote?.parentId
        }
      )
      console.log('✅ API call successful:', duplicatedNote)
      
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
        parentId: currentNote?.parentId,
        properties: {},
        createdAt: new Date(duplicatedNote.created_at || duplicatedNote.createdAt),
        updatedAt: new Date(duplicatedNote.updated_at || duplicatedNote.updatedAt),
        createdBy: duplicatedNote.created_by || duplicatedNote.createdBy,
        lastEditedBy: duplicatedNote.last_edited_by || duplicatedNote.lastEditedBy || duplicatedNote.created_by || duplicatedNote.createdBy,
        isDeleted: !!duplicatedNote.deleted_at,
        isArchived: !!duplicatedNote.archived_at,
        archivedAt: duplicatedNote.archived_at || undefined,
        isFavorite: duplicatedNote.is_favorite || duplicatedNote.isStarred,
        permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
        tags: duplicatedNote.tags || [],
        version: 1,
        lastSavedAt: new Date(),
        // Preserve backend fields
        author_id: duplicatedNote.author_id,
        created_by: duplicatedNote.created_by,
        last_edited_by: duplicatedNote.last_edited_by,
        collaborative_data: duplicatedNote.collaborative_data,
        // Enriched user data
        author: duplicatedNote.author,
        collaborators: duplicatedNote.collaborators
      }

      // Add to store
      addNote(localNote)
      
      // Invalidate notes queries to refresh the list
      await queryClient.invalidateQueries({ 
        queryKey: notesKeys.list(currentWorkspace.id) 
      })

      toast({
        title: 'Success',
        description: 'Note duplicated successfully',
      })
      
      // Redirect to notes list
      navigate(`/workspaces/${currentWorkspace.id}/notes`)
    } catch (error) {
      console.error('Failed to duplicate note:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteNote = async (noteId?: string) => {
    try {
      const idToDelete = noteId || ui.selectedNoteId
      if (idToDelete) {
        updateNote(idToDelete, { isDeleted: true })
        if (idToDelete === ui.selectedNoteId) {
          clearSelection()
          // URL navigation will happen automatically via useEffect
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleArchiveNote = async (noteId?: string) => {
    if (!currentWorkspace) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      })
      return
    }

    try {
      const idToArchive = noteId || ui.selectedNoteId
      if (idToArchive) {
        // Call archive API
        await notesApi.archiveNote(currentWorkspace.id, idToArchive)
        
        // Update local state with archived status and timestamp
        updateNote(idToArchive, { 
          isArchived: true,
          archivedAt: new Date().toISOString()
        })
        
        // Invalidate queries to refresh the list
        await queryClient.invalidateQueries({ 
          queryKey: notesKeys.list(currentWorkspace.id) 
        })
        
        toast({
          title: 'Success',
          description: 'Note archived successfully',
        })
        
        // If archiving the currently selected note, clear selection
        if (idToArchive === ui.selectedNoteId) {
          clearSelection()
          // Navigate back to notes list
          navigate(`/workspaces/${currentWorkspace.id}/notes`)
        }
      }
    } catch (error) {
      console.error('Failed to archive note:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      updateNote(noteId, updates)
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  const handleRestoreNote = async (noteId: string) => {
    try {
      updateNote(noteId, { isDeleted: false })
    } catch (error) {
      console.error('Failed to restore note:', error)
    }
  }

  const handleDuplicateNote = async (noteId: string, parentId?: string) => {
    if (!currentWorkspace) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      })
      return
    }

    try {
      // Get the note to duplicate
      const noteToDuplicate = notes.find(n => n.id === noteId)
      const noteTitle = noteToDuplicate?.title?.map(t => t.text).join('') || 'Untitled'
      
      console.log('🔄 Duplicating note from sidebar:', noteId)
      
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
        createdAt: new Date(duplicatedNote.created_at || duplicatedNote.createdAt),
        updatedAt: new Date(duplicatedNote.updated_at || duplicatedNote.updatedAt),
        createdBy: duplicatedNote.created_by || duplicatedNote.createdBy,
        lastEditedBy: duplicatedNote.last_edited_by || duplicatedNote.lastEditedBy || duplicatedNote.created_by || duplicatedNote.createdBy,
        isDeleted: !!duplicatedNote.deleted_at,
        isArchived: !!duplicatedNote.archived_at,
        archivedAt: duplicatedNote.archived_at || undefined,
        isFavorite: duplicatedNote.is_favorite || duplicatedNote.isStarred,
        permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
        tags: duplicatedNote.tags || [],
        version: 1,
        lastSavedAt: new Date(),
        // Preserve backend fields
        author_id: duplicatedNote.author_id,
        created_by: duplicatedNote.created_by,
        last_edited_by: duplicatedNote.last_edited_by,
        collaborative_data: duplicatedNote.collaborative_data,
        // Enriched user data
        author: duplicatedNote.author,
        collaborators: duplicatedNote.collaborators
      }

      // Add to store
      addNote(localNote)
      
      // Invalidate notes queries to refresh the list
      await queryClient.invalidateQueries({ 
        queryKey: notesKeys.list(currentWorkspace.id) 
      })
      
      toast({
        title: 'Success',
        description: 'Note duplicated successfully',
      })
      
      // Redirect to notes list
      navigate(`/workspaces/${currentWorkspace.id}/notes`)
    } catch (error) {
      console.error('Failed to duplicate note:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleFavorite = async (noteId: string, isFavorite: boolean) => {
    try {
      updateNote(noteId, { isFavorite })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const [shareNoteId, setShareNoteId] = useState<string | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  const handleShare = (noteId: string) => {
    setShareNoteId(noteId)
    setIsShareModalOpen(true)
  }

  // Handle sidebar create request
  useEffect(() => {
    if (sidebarCreateRequest) {
      handleCreateNote('', sidebarCreateRequest.parentId)
      onSidebarCreateHandled?.()
    }
  }, [sidebarCreateRequest, onSidebarCreateHandled])
  
  // Handle create note requests from store
  useEffect(() => {
    if (createNoteRequest) {
      handleCreateNote('', createNoteRequest.parentId)
      clearCreateNoteRequest()
    }
  }, [createNoteRequest, clearCreateNoteRequest])

  // Handle share note requests from store
  useEffect(() => {
    if (shareNoteRequest) {
      handleShare(shareNoteRequest.noteId)
      clearShareNoteRequest()
    }
  }, [shareNoteRequest, clearShareNoteRequest])

  // Handle bulk actions from sidebar
  useEffect(() => {
    const handleBulkActionEvent = (event: CustomEvent) => {
      const { action, selectedNotes: noteIds } = event.detail
      
      // Convert note IDs to the format expected by handleBulkAction
      clearSelectedNotes()
      noteIds.forEach((id: string) => toggleNoteSelection(id))
      
      // Trigger the action
      setTimeout(() => {
        handleBulkAction(action)
      }, 100)
    }
    
    window.addEventListener('bulkActionFromSidebar', handleBulkActionEvent as any)

    return () => {
      window.removeEventListener('bulkActionFromSidebar', handleBulkActionEvent as any)
    }
  }, [handleBulkAction, clearSelectedNotes, toggleNoteSelection])

  // Listen for import file event from sidebar
  useEffect(() => {
    const handleImportEvent = () => {
      setIsFileImportOpen(true)
    }

    window.addEventListener('notesImportFile', handleImportEvent)

    return () => {
      window.removeEventListener('notesImportFile', handleImportEvent)
    }
  }, [])

  // Fetch note from API when noteId is in URL
  useEffect(() => {
    console.log('Fetch note effect running', { noteId, hasWorkspace: !!currentWorkspace })

    if (!noteId || !currentWorkspace) {
      console.log('Missing noteId or workspace, skipping fetch')
      return
    }

    // Check if note was recently deleted (prevents fetch loop after AI deletion)
    if (recentlyDeletedNoteIds.has(noteId)) {
      console.log('Note was recently deleted, skipping fetch and redirecting:', noteId)
      navigate(`/workspaces/${currentWorkspace.id}/notes`, { replace: true })
      return
    }

    // Check if note already exists in store
    const existingNote = getNoteById(noteId)
    // Check if note needs full data (attachments, author, etc.)
    const needsFullData = existingNote && !(existingNote as any).attachments
    console.log('Existing note check:', { noteId, exists: !!existingNote, needsFullData, hasAttachments: !!(existingNote as any)?.attachments })

    // Fetch if note doesn't exist in store OR if it needs full data (attachments)
    if (!existingNote || needsFullData) {
      console.log('Note not in store or needs full data, fetching from API...')

      // Set fetching state SYNCHRONOUSLY before async operations
      // This prevents redirect effects from firing
      setIsFetchingNote(true)

      const fetchNote = async () => {
        try {
          console.log('Fetching note from API:', noteId, 'workspace:', currentWorkspace.id)
          // Fetch from workspace-scoped endpoint
          const fetchedNote = await notesApi.getNoteByWorkspace(currentWorkspace.id, noteId)

          console.log('API response received:', fetchedNote)
          console.log('🔍 Backend fields from API:', {
            author_id: fetchedNote.author_id,
            created_by: fetchedNote.created_by,
            collaborative_data: fetchedNote.collaborative_data
          })

          // Convert API response to local Note format
          const localNote: Note = {
            id: fetchedNote.id,
            workspaceId: currentWorkspace.id,
            title: [{ text: fetchedNote.title }],
            icon: { type: 'emoji', value: '📄' },
            content: [{
              id: `block-${Date.now()}`,
              type: 'html' as const,
              content: [{
                html: fetchedNote.content || '<p></p>'
              }],
              createdAt: new Date(),
              updatedAt: new Date()
            }],
            children: [],
            properties: {},
            createdAt: new Date(fetchedNote.created_at || fetchedNote.createdAt),
            updatedAt: new Date(fetchedNote.updated_at || fetchedNote.updatedAt),
            createdBy: fetchedNote.created_by || fetchedNote.createdBy,
            lastEditedBy: fetchedNote.last_edited_by || fetchedNote.lastEditedBy || fetchedNote.created_by || fetchedNote.createdBy,
            isDeleted: !!fetchedNote.deleted_at,
            isArchived: !!fetchedNote.archived_at,
            isFavorite: fetchedNote.is_favorite || fetchedNote.isStarred,
            permissions: { canRead: true, canWrite: true, canShare: true, canDelete: true },
            tags: fetchedNote.tags || [],
            version: 1,
            lastSavedAt: new Date(),
            // Preserve backend fields for collaboration
            author_id: fetchedNote.author_id,
            created_by: fetchedNote.created_by,
            last_edited_by: fetchedNote.last_edited_by,
            collaborative_data: fetchedNote.collaborative_data,
            // Enriched user data from backend
            author: fetchedNote.author,
            collaborators: fetchedNote.collaborators,
            // Attachments (linked notes, files, events)
            attachments: (fetchedNote as any).attachments
          }

          // Check if note already exists in store
          const existingNote = notes.find(n => n.id === localNote.id)
          if (existingNote) {
            console.log('⚠️ Note already exists in store, updating instead')
            console.log('⚠️ Existing note:', existingNote)
            // Update existing note to ensure backend fields are added
            updateNote(localNote.id, localNote)
          } else {
            console.log('📦 Adding NEW note to store with backend fields:', {
              id: localNote.id,
              author_id: localNote.author_id,
              created_by: localNote.created_by,
              collaborative_data: localNote.collaborative_data
            })
            addNote(localNote)
          }

          selectNote(localNote.id)
          console.log('Note fetched, added/updated to store, and selected:', localNote.id)
        } catch (error) {
          console.error('Failed to fetch note:', error)
          console.error('Error details:', {
            noteId,
            workspaceId: currentWorkspace.id,
            error: error instanceof Error ? error.message : error
          })

          toast({
            title: 'Error loading note',
            description: error instanceof Error ? error.message : 'Failed to load note. Please try again.',
            variant: 'destructive',
          })

          // Redirect to notes list if fetch fails
          if (currentWorkspace) {
            console.log('Redirecting back to notes list due to error')
            navigate(`/workspaces/${currentWorkspace.id}/notes`, { replace: true })
          }
        } finally {
          setIsFetchingNote(false)
        }
      }

      fetchNote()
    } else {
      console.log('Note already exists in store, no need to fetch')
    }
  }, [noteId, currentWorkspace?.id, recentlyDeletedNoteIds])

  // Sync URL param to selected note
  useEffect(() => {
    if (isSyncingRef.current) {
      // Already syncing, prevent loop
      isSyncingRef.current = false
      return
    }

    if (noteId && noteId !== ui.selectedNoteId) {
      // URL has a noteId but it's not selected
      const note = getNoteById(noteId)
      if (note) {
        console.log('Selecting note from URL:', noteId)
        isSyncingRef.current = true
        selectNote(noteId)
      }
      // Don't redirect here - the fetch effect will handle it if the note truly doesn't exist
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, ui.selectedNoteId])

  // Sync selected note to URL (when note is selected programmatically)
  useEffect(() => {
    if (isSyncingRef.current) {
      // Already syncing, prevent loop
      isSyncingRef.current = false
      return
    }

    if (ui.selectedNoteId && ui.selectedNoteId !== noteId && currentWorkspace) {
      // User selected a different note programmatically, update URL
      console.log('Syncing selected note to URL:', ui.selectedNoteId)
      isSyncingRef.current = true
      navigate(`/workspaces/${currentWorkspace.id}/notes/${ui.selectedNoteId}`)
    } else if (!ui.selectedNoteId && !noteId && currentWorkspace) {
      // Note was deselected and there's no noteId in URL, stay on list page
      console.log('No note selected and no noteId in URL, staying on list page')
    }
    // Don't redirect away from a URL that has a noteId - let the fetch effect handle invalid notes
  }, [ui.selectedNoteId, noteId, currentWorkspace?.id])

  // Don't auto-select notes - let the user choose what to view

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
    if (searchQuery) {
      const titleText = note.title?.map(rt => rt.text).join('').toLowerCase() || ''
      return titleText.includes(searchQuery.toLowerCase())
    }
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Bulk Actions Toolbar */}
      {selectedNotes.length > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedNotes.length}
          selectedNotes={selectedNotes.map(id => getNoteById(id)).filter(Boolean) as Note[]}
          onAction={handleBulkAction}
          onClear={clearSelectedNotes}
          isTrashView={selectedNotes.map(id => getNoteById(id)).filter((note): note is Note => Boolean(note)).every((note) => note.isDeleted)}
        />
      )}

      {isLoading || isFetchingNote || (noteId && !selectedNote) ? (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">{isFetchingNote || noteId ? 'Loading note...' : 'Loading notes...'}</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">Error loading notes</p>
        </div>
      ) : selectedNote ? (
        <NotionStyleNoteEditor
          note={selectedNote}
          onClose={() => {
            clearSelection()
            // URL navigation will happen automatically via useEffect
          }}
          onDelete={() => handleDeleteNote()}
          onArchive={() => handleArchiveNote()}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onDuplicate={handleDuplicate}
          onShare={handleShare}
          onUpdate={handleUpdateNote}
          onAttachmentClick={async (attachment) => {
            if (!currentWorkspace?.id) return

            switch (attachment.type) {
              case 'notes':
                // Navigate to the linked note
                navigate(`/workspaces/${currentWorkspace.id}/notes/${attachment.id}`)
                break
              case 'events':
                // Open event preview modal immediately with loading state
                setIsEventPreviewOpen(true)
                setIsEventPreviewLoading(true)
                setPreviewEvent(null)
                try {
                  const event = await calendarApi.getEvent(currentWorkspace.id, attachment.id)
                  setPreviewEvent(event)
                } catch (error) {
                  console.error('Failed to fetch event for preview:', error)
                  setIsEventPreviewOpen(false)
                  toast({
                    title: 'Error',
                    description: 'Failed to load event preview',
                    variant: 'destructive'
                  })
                } finally {
                  setIsEventPreviewLoading(false)
                }
                break
              case 'files':
                // Open preview modal immediately with loading state
                setIsFilePreviewOpen(true)
                setIsFilePreviewLoading(true)
                setPreviewFile(null)
                try {
                  const file = await fileApi.getFile(currentWorkspace.id, attachment.id)
                  setPreviewFile(file)
                } catch (error) {
                  console.error('Failed to fetch file for preview:', error)
                  setIsFilePreviewOpen(false)
                  toast({
                    title: 'Error',
                    description: 'Failed to load file preview',
                    variant: 'destructive'
                  })
                } finally {
                  setIsFilePreviewLoading(false)
                }
                break
            }
          }}
          onRefresh={async () => {
            // Refresh the note content from API when collaboration partner makes changes
            if (!currentWorkspace?.id || !selectedNote?.id) return
            try {
              console.log('[NotesView] Refreshing note content from API...')
              const refreshedNote = await notesApi.getNoteByWorkspace(currentWorkspace.id, selectedNote.id)
              if (refreshedNote) {
                // Update the note in the store
                updateNote(selectedNote.id, {
                  title: refreshedNote.title ? [{ text: refreshedNote.title }] : selectedNote.title,
                  content: refreshedNote.content ? [{
                    id: `block-${Date.now()}`,
                    type: 'html' as const,
                    content: [{ html: refreshedNote.content }],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }] : selectedNote.content,
                  updatedAt: refreshedNote.updatedAt || new Date().toISOString()
                })
                console.log('[NotesView] Note content refreshed successfully')
              }
            } catch (error) {
              console.error('[NotesView] Failed to refresh note:', error)
            }
          }}
        />
      ) : showInlineCreator ? (
        <NotionStyleNoteCreator
          parentId={creatorParentId}
          onNoteCreated={(noteId: string) => {
            handleNoteCreated(noteId, { parentId: creatorParentId })
            setShowInlineCreator(false)
            setCreatorParentId(undefined)
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <FileText className="h-16 w-16 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {intl.formatMessage({ id: 'modules.notes.emptyState.title', defaultMessage: 'Get started with Notes' })}
          </h3>
          <p className="text-center mb-6 max-w-md">
            {intl.formatMessage({ id: 'modules.notes.emptyState.description', defaultMessage: 'Create your first note to capture ideas, take meeting notes, or write documentation.' })}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => handleCreateNote()}
              className="btn-gradient-primary border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.notes.buttons.newNote', defaultMessage: 'New Note' })}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsFileImportOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.notes.buttons.import', defaultMessage: 'Import' })}
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <FileImportModal
        isOpen={isFileImportOpen}
        onClose={() => setIsFileImportOpen(false)}
        workspaceId={currentWorkspace?.id || ''}
        onNoteCreated={async (noteId) => {
          // Dispatch refresh event to update sidebar
          window.dispatchEvent(new CustomEvent('notesRefresh'))

          // Select and navigate to the new note
          if (currentWorkspace) {
            selectNote(noteId)
            navigate(`/workspaces/${currentWorkspace.id}/notes/${noteId}`)
          }
        }}
      />

      {/* Merge Notes Dialog */}
      <MergeNotesDialog
        isOpen={isMergeDialogOpen}
        onClose={() => setIsMergeDialogOpen(false)}
        notes={selectedNotes.map(id => getNoteById(id)).filter(Boolean) as Note[]}
        onMerge={handleMergeNotes}
      />

      {/* Share Note Modal */}
      {shareNoteId && (
        <NotesShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setShareNoteId(null);
          }}
          noteId={shareNoteId}
          noteTitle={
            (() => {
              const note = getNoteById(shareNoteId);
              if (!note) return 'Note';
              // Convert RichText[] to plain string
              if (Array.isArray(note.title)) {
                return note.title.map(rt => rt.text).join('') || 'Untitled';
              }
              return 'Note';
            })()
          }
        />
      )}

      {/* File Preview Modal */}
      <FilePreviewDialog
        isOpen={isFilePreviewOpen}
        onClose={() => {
          setIsFilePreviewOpen(false)
          setPreviewFile(null)
        }}
        file={previewFile}
        isLoading={isFilePreviewLoading}
      />

      {/* Event Preview Modal */}
      <EventPreviewDialog
        isOpen={isEventPreviewOpen}
        onClose={() => {
          setIsEventPreviewOpen(false)
          setPreviewEvent(null)
        }}
        event={previewEvent}
        isLoading={isEventPreviewLoading}
      />
    </div>
  )
}