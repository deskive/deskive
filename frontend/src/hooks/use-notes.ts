import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetch'
import type { Note, CreateNoteData, UpdateNoteData } from '../types/notes'

// Query keys
const NOTES_QUERY_KEY = ['notes'] as const
const NOTE_QUERY_KEY = (id: string) => ['note', id] as const

// Get all notes
export function useNotes() {
  return useQuery({
    queryKey: NOTES_QUERY_KEY,
    queryFn: async () => {
      return await api.get<Note[]>('/notes')
    }
  })
}

// Get single note
export function useNote(id: string) {
  return useQuery({
    queryKey: NOTE_QUERY_KEY(id),
    queryFn: async () => {
      return await api.get<Note>(`/notes/${id}`)
    },
    enabled: !!id
  })
}

// Create note
export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateNoteData) => {
      return await api.post<Note>('/notes', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

// Update note
export function useUpdateNote(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateNoteData) => {
      return await api.patch<Note>(`/notes/${id}`, data)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(NOTE_QUERY_KEY(id), data)
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

// Delete note
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

// Archive note
export function useArchiveNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      return await api.patch<Note>(`/notes/${id}`, { isArchived })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

// Favorite note
export function useFavoriteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      return await api.patch<Note>(`/notes/${id}`, { isFavorite })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

// Duplicate note
export function useDuplicateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId?: string }) => {
      return await api.post<Note>(`/notes/${id}/duplicate`, { parentId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

// Restore note
export function useRestoreNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return await api.patch<Note>(`/notes/${id}`, { isDeleted: false })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

// Permanently delete note
export function usePermanentDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}/permanent`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

// Bulk operations
export function useBulkDeleteNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post('/notes/bulk-delete', { ids })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}

export function useBulkArchiveNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, isArchived }: { ids: string[]; isArchived: boolean }) => {
      await api.post('/notes/bulk-archive', { ids, isArchived })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY })
    }
  })
}