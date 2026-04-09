// User types
export interface User {
  id: string
  email: string
  name: string
  fullName?: string
  username?: string
  avatar?: string
  avatarUrl?: string
  role?: string
  phone?: string
  timezone?: string
  language?: string
  metadata?: {
    bio?: string
    phone?: string
    location?: string
    website?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

// Auth types
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthResponse {
  user: User
  token?: string
  refreshToken?: string
  requiresVerification?: boolean
  message?: string
}

// Workspace types
export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  logo?: string
  owner_id: string
  settings?: Record<string, any>
  user_role?: 'owner' | 'admin' | 'member' | 'viewer'
  member_count?: number
  project_count?: number
  createdAt: string
  updatedAt: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}

// Re-export all types from sub-modules
export * from './files';
export * from './projects';
export * from './tasks';
export * from './calendar';

// Import and re-export workspace types (handles WorkspaceMember, Invitation, InvitationStatus)
export * from './workspace';

// For invitation types, only export what's not already in workspace
export {
  type SendInvitationData,
  type InvitationDetails,
  type ResendInvitationResponse,
  type RevokeInvitationResponse,
  type AcceptInvitationData as AcceptInvitationToken
} from './invitation';

// For teamMember types, export all (TeamRole extends MemberRole so no conflict)
export {
  type TeamRole,
  type TeamMemberAvailability,
  type TeamMemberPermissions,
  type TeamMember,
  type CreateTeamMemberData,
  type UpdateTeamMemberData,
  type TeamMemberAssignment,
  type TeamMemberStats,
  type TeamMembersResponse,
  type TeamMemberResponse,
  type TeamMemberFilters
} from './teamMember';