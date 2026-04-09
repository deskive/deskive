// Base types for the notes system
export type BlockType = 
  | 'paragraph'
  | 'heading_1'
  | 'heading_2' 
  | 'heading_3'
  | 'heading_4'
  | 'heading_5'
  | 'heading_6'
  | 'bulleted_list'
  | 'numbered_list'
  | 'toggle_list'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'code'
  | 'image'
  | 'video'
  | 'file'
  | 'table'
  | 'database'
  | 'embed'
  | 'bookmark'
  | 'todo'
  | 'html'

export type DatabaseViewType = 'table' | 'board' | 'list' | 'calendar' | 'gallery' | 'timeline'

export type PropertyType = 
  | 'title'
  | 'text' 
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'person'
  | 'file'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by'

export interface RichText {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  color?: string
  backgroundColor?: string
  link?: string
}

export interface IconData {
  type: 'emoji' | 'file' | 'external'
  value: string // emoji character, file URL, or external URL
}

export interface BlockContent {
  id: string
  type: BlockType
  content: RichText[] | { html: string }[] // Allow HTML content for 'html' blocks
  properties?: Record<string, any>
  children?: BlockContent[]
  createdAt: Date | string
  updatedAt: Date | string
}

export interface PropertyDefinition {
  id: string
  name: string
  type: PropertyType
  options?: {
    choices?: Array<{ id: string; name: string; color: string }>
    dateFormat?: string
    numberFormat?: string
    formula?: string
  }
}

export interface DatabaseProperty {
  id: string
  type: PropertyType
  value: any
}

export interface DatabaseRow {
  id: string
  properties: Record<string, DatabaseProperty>
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string
  lastEditedBy: string
}

export interface DatabaseView {
  id: string
  name: string
  type: DatabaseViewType
  filter?: any
  sort?: Array<{ property: string; direction: 'asc' | 'desc' }>
  groupBy?: string
  properties?: Record<string, { visible: boolean; width?: number }>
}

export interface DatabaseBlock {
  id: string
  title: RichText[]
  properties: Record<string, PropertyDefinition>
  rows: DatabaseRow[]
  views: DatabaseView[]
  defaultView: string
}

export interface Note {
  id: string
  workspaceId?: string // Workspace ID for API calls
  title: RichText[]
  icon?: IconData
  cover?: string
  content: BlockContent[]
  parentId?: string
  children: string[] // IDs of child notes
  properties?: Record<string, any>
  isDatabase?: boolean
  databaseConfig?: DatabaseBlock

  // Metadata
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string
  lastEditedBy: string

  // Backend fields (snake_case from API)
  author_id?: string
  created_by?: string
  last_edited_by?: string
  collaborative_data?: any // JSONB field from backend

  // Enriched fields from backend API
  author?: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
  collaborators?: Array<{
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }>

  // Attachments (linked items)
  attachments?: {
    file_attachment: Array<{
      id: string
      name: string
      type?: string
      size?: number
      url?: string
    }>
    note_attachment: Array<{
      id: string
      title: string
      icon?: string
      updated_at?: string
    }>
    event_attachment: Array<{
      id: string
      title: string
      start_time?: string
      end_time?: string
      location?: string
    }>
  }

  // State
  isDeleted: boolean
  deletedAt?: Date | string
  isArchived: boolean
  archivedAt?: Date | string
  isFavorite: boolean
  isTemplate?: boolean

  // Permissions
  permissions: {
    canRead: boolean
    canWrite: boolean
    canShare: boolean
    canDelete: boolean
  }

  // Sharing
  shareSettings?: {
    isPublic: boolean
    publicLink?: string
    allowComments: boolean
    allowDuplication: boolean
    expiresAt?: Date | string
    sharedWith: Array<{
      userId: string
      email: string
      role: 'viewer' | 'editor' | 'admin'
      sharedAt: Date | string
    }>
  }

  // Categories & Tags
  category?: string
  subcategory?: string
  tags: string[]

  // Theme color
  color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'blank'

  // Version control
  version: number
  lastSavedAt: Date | string
}

export interface NoteTemplate {
  id: string
  name: string
  description?: string
  icon?: IconData
  content: BlockContent[]
  properties?: Record<string, PropertyDefinition>
  category: 'task' | 'general' | 'brainstorming' | 'meeting' | 'project' | 'custom'
  subcategory?: string
  isPublic: boolean
  createdBy: string
  createdAt: Date | string
  tags: string[]
  color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'blank'
}

export interface NoteVersion {
  id: string
  noteId: string
  version: number
  title: RichText[]
  content: BlockContent[]
  createdAt: Date | string
  createdBy: string
  changeDescription?: string
}

export interface SearchResult {
  noteId: string
  blockId?: string
  title: string
  snippet: string
  score: number
  highlightedText?: string
}

export interface NotesFilter {
  query?: string
  parentId?: string
  isDeleted?: boolean
  isArchived?: boolean
  isFavorite?: boolean
  createdBy?: string
  createdAfter?: Date | string
  createdBefore?: Date | string
  updatedAfter?: Date | string
  updatedBefore?: Date | string
  hasIcon?: boolean
  hasChildren?: boolean
  tags?: string[]
  includeDeleted?: boolean // When true, includes deleted notes in results
}

export interface NotesSortOption {
  field: 'title' | 'createdAt' | 'updatedAt' | 'lastEditedBy'
  direction: 'asc' | 'desc'
}

// UI State types
export interface EditorState {
  selectedBlockId?: string
  isEditing: boolean
  selectionRange?: { start: number; end: number }
  draggedBlockId?: string
  insertPosition?: { afterBlockId: string } | { beforeBlockId: string }
}

export interface NotesUIState {
  sidebarCollapsed: boolean
  selectedNoteId?: string
  editor: EditorState
  searchQuery: string
  filters: NotesFilter
  sortBy: NotesSortOption
  viewMode: 'list' | 'grid' | 'tree'
  showDeleted: boolean
  showArchived: boolean
}

// API response types
export interface CreateNoteRequest {
  title?: string
  description?: string
  parentId?: string
  templateId?: string
  content?: BlockContent[]
  icon?: string | IconData
  properties?: Record<string, any>
  color?: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'blank'
  tags?: string[]
}

export interface UpdateNoteRequest {
  title?: RichText[]
  content?: BlockContent[]
  icon?: IconData
  cover?: string
  properties?: Record<string, any>
  parentId?: string
  isFavorite?: boolean
  isArchived?: boolean
}

export interface MoveNoteRequest {
  noteId: string
  newParentId?: string
  position?: number
}

export interface BulkOperationRequest {
  noteIds: string[]
  operation: 'delete' | 'archive' | 'restore' | 'move' | 'duplicate'
  targetParentId?: string
}

// Error types
export interface NotesError {
  code: string
  message: string
  details?: any
}

// Constants
export const MAX_TITLE_LENGTH = 255
export const MAX_BLOCK_CONTENT_LENGTH = 10000
export const MAX_CHILDREN_DEPTH = 3
export const AUTO_SAVE_INTERVAL = 10 * 60 * 1000 // 10 minutes
export const FINAL_SAVE_DELAY = 2 * 60 * 1000 // 2 minutes after last edit
export const TRASH_RETENTION_DAYS = 30

// Validation functions
export const isValidBlockType = (type: string): type is BlockType => {
  const validTypes: BlockType[] = [
    'paragraph', 'heading_1', 'heading_2', 'heading_3', 'heading_4', 'heading_5', 'heading_6',
    'bulleted_list', 'numbered_list', 'toggle_list', 'quote', 'callout', 'divider', 'code',
    'image', 'video', 'file', 'table', 'database', 'embed', 'bookmark', 'todo', 'html'
  ]
  return validTypes.includes(type as BlockType)
}

export const isValidPropertyType = (type: string): type is PropertyType => {
  const validTypes: PropertyType[] = [
    'title', 'text', 'number', 'select', 'multi_select', 'date', 'person', 'file',
    'checkbox', 'url', 'email', 'phone', 'formula', 'relation', 'rollup',
    'created_time', 'created_by', 'last_edited_time', 'last_edited_by'
  ]
  return validTypes.includes(type as PropertyType)
}

// API Data Types (for use with hooks)
export interface CreateNoteData {
  title: RichText[]
  icon?: IconData
  content?: BlockContent[]
  parentId?: string
  properties?: {
    category?: string
    subcategory?: string
    tags?: string[]
    importedFrom?: string
  }
  color?: string
}

export interface UpdateNoteData {
  title?: RichText[]
  icon?: IconData
  content?: BlockContent[]
  parentId?: string | null
  isFavorite?: boolean
  isArchived?: boolean
  isDeleted?: boolean
  properties?: {
    category?: string
    subcategory?: string
    tags?: string[]
  }
  color?: string
}