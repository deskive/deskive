import { create } from 'zustand'
import type { NotesFilter, NotesUIState, Note } from '../types/notes'

// Notes store - handles UI state and data
interface NotesStore {
  // Notes Data
  notes: Note[]
  
  // UI State
  ui: Partial<NotesUIState> & {
    selectedNoteId?: string;
    viewMode: 'list' | 'grid' | 'tree';
    isLoading: boolean;
    error: any;
  }
  filter: NotesFilter
  sortBy: string
  selectedNotes: string[]
  
  // Data Actions
  setNotes: (notes: Note[]) => void
  updateNote: (noteId: string, updates: Partial<Note>) => void
  addNote: (note: Note) => void
  deleteNote: (noteId: string) => void
  duplicateNote: (noteId: string, parentId?: string) => void
  
  // UI Actions
  setFilter: (filter: NotesFilter) => void
  setSortBy: (sortBy: string) => void
  setViewMode: (viewMode: 'list' | 'grid' | 'tree') => void
  selectNote: (noteId?: string) => void
  clearSelection: () => void
  toggleNoteSelection: (noteId: string) => void
  clearSelectedNotes: () => void
  
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // Real-time sync status
  isConnected: boolean
  setConnectionStatus: (connected: boolean) => void
  
  // Create note trigger
  createNoteRequest: { parentId?: string; timestamp: number } | null
  triggerCreateNote: (parentId?: string) => void
  clearCreateNoteRequest: () => void

  // Share note trigger
  shareNoteRequest: { noteId: string; timestamp: number } | null
  triggerShareNote: (noteId: string) => void
  clearShareNoteRequest: () => void

  // Track recently deleted notes to prevent fetch loops
  recentlyDeletedNoteIds: Set<string>
  markNoteAsDeleted: (noteId: string) => void
  isNoteRecentlyDeleted: (noteId: string) => boolean
}

export const useNotesStore = create<NotesStore>()((set) => ({
      // Initial data
      notes: [],
      
      // Initial UI state
      ui: {
        selectedNoteId: undefined,
        viewMode: 'list' as const,
        isLoading: false,
        error: null,
      },
      filter: {
        isDeleted: false, // Default to showing non-deleted notes
      },
      sortBy: 'updatedAt',
      selectedNotes: [],
      searchQuery: '',
      isConnected: false,
      createNoteRequest: null,
      shareNoteRequest: null,

      // Data Actions
      setNotes: (notes) => {
        // Deduplicate notes by ID to prevent React key warnings
        const uniqueNotes = notes.reduce((acc, note) => {
          const existingIndex = acc.findIndex(n => n.id === note.id)
          if (existingIndex !== -1) {
            // Replace with newer version
            acc[existingIndex] = note
          } else {
            acc.push(note)
          }
          return acc
        }, [] as Note[])
        return set({ notes: uniqueNotes })
      },

      updateNote: (noteId, updates) =>
        set((state) => {
          console.log('🔄 [Store] Updating note:', noteId, 'with updates:', updates)
          return {
            notes: state.notes.map(note => {
              if (note.id === noteId) {
                const updated = { ...note, ...updates, updatedAt: new Date() }
                console.log('🔄 [Store] Updated note:', {
                  id: updated.id,
                  author_id: (updated as any).author_id,
                  collaborative_data: (updated as any).collaborative_data
                })
                return updated
              }
              return note
            })
          }
        }),
      
      addNote: (note) =>
        set((state) => {
          console.log('🏪 [Store] Adding note with all fields:', note)
          console.log('🏪 [Store] Backend fields check:', {
            author_id: (note as any).author_id,
            collaborative_data: (note as any).collaborative_data
          })

          // Check if note already exists to prevent duplicates
          const existingIndex = state.notes.findIndex(n => n.id === note.id)
          if (existingIndex !== -1) {
            console.log('🏪 [Store] Note already exists, updating instead of adding:', note.id)
            // Update existing note instead of adding duplicate
            const noteWithAllFields = JSON.parse(JSON.stringify(note)) as Note
            const updatedNotes = [...state.notes]
            updatedNotes[existingIndex] = noteWithAllFields
            return { notes: updatedNotes }
          }

          // Cast to any to bypass TypeScript filtering, then back to Note
          const noteWithAllFields = JSON.parse(JSON.stringify(note)) as Note
          console.log('🏪 [Store] Note after JSON parse:', {
            id: noteWithAllFields.id,
            author_id: (noteWithAllFields as any).author_id,
            collaborative_data: (noteWithAllFields as any).collaborative_data
          })
          return {
            notes: [...state.notes, noteWithAllFields] as Note[]
          }
        }),

      deleteNote: (noteId) =>
        set((state) => ({
          notes: state.notes.filter(note => note.id !== noteId)
        })),

      duplicateNote: (noteId, parentId) =>
        set((state) => {
            const noteToDuplicate = state.notes.find(n => n.id === noteId)
            if (!noteToDuplicate) return state
            
            const duplicatedNote: Note = {
              ...noteToDuplicate,
              id: `note-duplicate-${Date.now()}`,
              title: [{ text: `${noteToDuplicate.title?.[0]?.text || 'Untitled'} (Copy)` }],
              parentId: parentId || noteToDuplicate.parentId,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastSavedAt: new Date()
            }
            
            return {
              notes: [...state.notes, duplicatedNote],
              ui: { ...state.ui, selectedNoteId: duplicatedNote.id }
            }
          }),

      // UI Actions
      setFilter: (filter) => set({ filter }),

      setSortBy: (sortBy) => set({ sortBy }),

      setViewMode: (viewMode) =>
        set((state) => ({
          ui: { ...state.ui, viewMode },
        })),

      selectNote: (noteId) =>
        set((state) => ({
          ui: { ...state.ui, selectedNoteId: noteId },
          selectedNotes: [], // Clear bulk selection when selecting single note
        })),

      clearSelection: () =>
        set((state) => ({
          ui: { ...state.ui, selectedNoteId: undefined },
        })),

      toggleNoteSelection: (noteId) =>
        set((state) => {
            const isSelected = state.selectedNotes.includes(noteId)
            
            if (isSelected) {
              // If note is already selected, just deselect it
              return {
                selectedNotes: state.selectedNotes.filter(id => id !== noteId),
              }
            }
            
            // Check if we're trying to add a note
            const noteToAdd = state.notes.find(note => note.id === noteId)
            if (!noteToAdd) {
              return state // Note not found, don't change selection
            }
            
            // If no notes are currently selected, allow selection
            if (state.selectedNotes.length === 0) {
              return {
                selectedNotes: [noteId],
              }
            }
            
            // Check if existing selected notes have the same deleted status
            const existingNote = state.notes.find(note => note.id === state.selectedNotes[0])
            if (existingNote && existingNote.isDeleted !== noteToAdd.isDeleted) {
              // Mixed selection not allowed - clear existing and select only the new note
              return {
                selectedNotes: [noteId],
              }
            }
            
            // Same type of notes, allow adding to selection
            return {
              selectedNotes: [...state.selectedNotes, noteId],
            }
          }),

      clearSelectedNotes: () => set({ selectedNotes: [] }),

      // Search
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      // Connection status
      setConnectionStatus: (isConnected) => set({ isConnected }),

      // Create note trigger
      triggerCreateNote: (parentId) =>
        set({ createNoteRequest: { parentId, timestamp: Date.now() } }),

      clearCreateNoteRequest: () =>
        set({ createNoteRequest: null }),

      // Share note trigger
      triggerShareNote: (noteId) =>
        set({ shareNoteRequest: { noteId, timestamp: Date.now() } }),

      clearShareNoteRequest: () =>
        set({ shareNoteRequest: null }),

      // Track recently deleted notes to prevent fetch loops
      recentlyDeletedNoteIds: new Set<string>(),

      markNoteAsDeleted: (noteId: string) =>
        set((state) => {
          const newSet = new Set(state.recentlyDeletedNoteIds)
          newSet.add(noteId)
          return { recentlyDeletedNoteIds: newSet }
        }),

      isNoteRecentlyDeleted: (noteId: string): boolean => false, // Will be overridden below
    })
)